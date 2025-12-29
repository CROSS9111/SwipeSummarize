import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ABTestManager } from "@/lib/llm/ab-test";

// A/Bテストの一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const environment = searchParams.get('environment') || 'local';
    const includeInactive = searchParams.get('include_inactive') === 'true';

    const supabase = await createClient();

    let query = (supabase as any)
      .from('ab_tests')
      .select('*')
      .eq('environment', environment);

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('A/B tests fetch error:', error);
      return NextResponse.json(
        { error: 'A/Bテストの取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ tests: data || [] });
  } catch (error) {
    console.error('A/B tests API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// A/Bテストの作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      environment = 'local',
      variants = [],
      trafficSplit = {},
      startDate,
      endDate,
      isActive = true,
      metrics = {
        primaryMetric: 'cost',
        trackMetrics: ['cost', 'speed', 'success_rate'],
        sampleSize: 1000,
        confidenceLevel: 95,
      }
    } = body;

    // バリデーション
    if (!name || !variants.length) {
      return NextResponse.json(
        { error: '名前とバリアントは必須です' },
        { status: 400 }
      );
    }

    // 重みの合計が100%になるかチェック
    const totalWeight = variants.reduce((sum: number, v: any) => sum + (v.weight || 0), 0);
    if (Math.abs(totalWeight - 100) > 0.1) {
      return NextResponse.json(
        { error: 'バリアントの重みの合計は100%である必要があります' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('ab_tests')
      .insert({
        name,
        description,
        environment,
        variants,
        traffic_split: trafficSplit,
        start_date: startDate,
        end_date: endDate,
        is_active: isActive,
        metrics,
      })
      .select()
      .single();

    if (error) {
      console.error('A/B test create error:', error);
      return NextResponse.json(
        { error: 'A/Bテストの作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ test: data }, { status: 201 });
  } catch (error) {
    console.error('A/B test API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// A/Bテストの更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      description,
      variants,
      trafficSplit,
      startDate,
      endDate,
      isActive,
      metrics
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'テストIDは必須です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('ab_tests')
      .update({
        name,
        description,
        variants,
        traffic_split: trafficSplit,
        start_date: startDate,
        end_date: endDate,
        is_active: isActive,
        metrics,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('A/B test update error:', error);
      return NextResponse.json(
        { error: 'A/Bテストの更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ test: data });
  } catch (error) {
    console.error('A/B test API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// A/Bテストの削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'テストIDは必須です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 関連するテスト結果も削除
    await (supabase as any)
      .from('ab_test_results')
      .delete()
      .eq('test_id', id);

    const { error } = await (supabase as any)
      .from('ab_tests')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('A/B test delete error:', error);
      return NextResponse.json(
        { error: 'A/Bテストの削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'A/Bテストが削除されました' });
  } catch (error) {
    console.error('A/B test API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}