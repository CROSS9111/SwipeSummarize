import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AlertManager } from "@/lib/llm/alerts";

const alertManager = new AlertManager();

// アラートルールの一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const environment = searchParams.get('environment');
    const includeEvents = searchParams.get('include_events') === 'true';

    const supabase = await createClient();
    let query = (supabase as any)
      .from('alert_rules')
      .select('*')
      .order('created_at', { ascending: false });

    if (environment) {
      query = query.eq('environment', environment);
    }

    const { data: rules, error } = await query;
    if (error) throw error;

    let events: any[] = [];
    if (includeEvents) {
      events = await alertManager.getAlertEvents(environment || undefined);
    }

    return NextResponse.json({
      rules: rules || [],
      events: includeEvents ? events : undefined
    });
  } catch (error) {
    console.error('Alert rules fetch error:', error);
    return NextResponse.json(
      { error: 'アラートルールの取得に失敗しました' },
      { status: 500 }
    );
  }
}

// アラートルールの作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      environment,
      type,
      conditions = [],
      actions = [],
      isActive = true,
      frequency = 'immediate'
    } = body;

    // バリデーション
    if (!name || !environment || !type || !conditions.length || !actions.length) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています' },
        { status: 400 }
      );
    }

    // 条件の妥当性チェック
    for (const condition of conditions) {
      if (!condition.metric || !condition.operator || condition.value === undefined || !condition.timeWindow) {
        return NextResponse.json(
          { error: '条件の設定が不正です' },
          { status: 400 }
        );
      }
    }

    // アクションの妥当性チェック
    for (const action of actions) {
      if (!action.type || !action.config) {
        return NextResponse.json(
          { error: 'アクションの設定が不正です' },
          { status: 400 }
        );
      }
    }

    const ruleId = await alertManager.createRule({
      name,
      description,
      environment,
      type,
      conditions,
      actions,
      isActive,
      frequency
    });

    return NextResponse.json({
      id: ruleId,
      message: 'アラートルールが作成されました'
    }, { status: 201 });
  } catch (error) {
    console.error('Alert rule creation error:', error);
    return NextResponse.json(
      { error: 'アラートルールの作成に失敗しました' },
      { status: 500 }
    );
  }
}

// アラートルールの更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      description,
      type,
      conditions,
      actions,
      isActive,
      frequency
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ルールIDが必要です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('alert_rules')
      .update({
        name,
        description,
        type,
        conditions,
        actions,
        is_active: isActive,
        frequency,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      rule: data,
      message: 'アラートルールが更新されました'
    });
  } catch (error) {
    console.error('Alert rule update error:', error);
    return NextResponse.json(
      { error: 'アラートルールの更新に失敗しました' },
      { status: 500 }
    );
  }
}

// アラートルールの削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'ルールIDが必要です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 関連するアラートイベントも削除
    await (supabase as any)
      .from('alert_events')
      .delete()
      .eq('rule_id', id);

    const { error } = await (supabase as any)
      .from('alert_rules')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({
      message: 'アラートルールが削除されました'
    });
  } catch (error) {
    console.error('Alert rule deletion error:', error);
    return NextResponse.json(
      { error: 'アラートルールの削除に失敗しました' },
      { status: 500 }
    );
  }
}