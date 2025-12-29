import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// LLM設定の取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const environment = searchParams.get('environment') || 'local';

    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('llm_settings')
      .select('*')
      .eq('environment', environment)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('LLM settings fetch error:', error);
      return NextResponse.json(
        { error: 'LLM設定の取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings: data || [] });
  } catch (error) {
    console.error('LLM settings API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// LLM設定の作成・更新
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      provider,
      model,
      environment = 'local',
      config = {},
      maxTokens,
      temperature,
      isActive = true
    } = body;

    if (!provider || !model) {
      return NextResponse.json(
        { error: 'プロバイダーとモデルは必須です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 既存の設定を非アクティブ化（同一環境の場合）
    if (isActive) {
      await (supabase as any)
        .from('llm_settings')
        .update({ is_active: false })
        .eq('environment', environment);
    }

    // 新しい設定を挿入
    const { data, error } = await (supabase as any)
      .from('llm_settings')
      .insert({
        provider,
        model,
        environment,
        config,
        max_tokens: maxTokens,
        temperature,
        is_active: isActive,
      })
      .select()
      .single();

    if (error) {
      console.error('LLM settings create error:', error);
      return NextResponse.json(
        { error: 'LLM設定の作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ setting: data }, { status: 201 });
  } catch (error) {
    console.error('LLM settings API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// LLM設定の更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      provider,
      model,
      config = {},
      maxTokens,
      temperature,
      isActive
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: '設定IDは必須です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // アクティブ化の場合、同一環境の他設定を非アクティブ化
    if (isActive) {
      const { data: currentSetting } = await (supabase as any)
        .from('llm_settings')
        .select('environment')
        .eq('id', id)
        .single();

      if (currentSetting) {
        await (supabase as any)
          .from('llm_settings')
          .update({ is_active: false })
          .eq('environment', currentSetting.environment)
          .neq('id', id);
      }
    }

    const { data, error } = await (supabase as any)
      .from('llm_settings')
      .update({
        provider,
        model,
        config,
        max_tokens: maxTokens,
        temperature,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('LLM settings update error:', error);
      return NextResponse.json(
        { error: 'LLM設定の更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ setting: data });
  } catch (error) {
    console.error('LLM settings API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// LLM設定の削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '設定IDは必須です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { error } = await (supabase as any)
      .from('llm_settings')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('LLM settings delete error:', error);
      return NextResponse.json(
        { error: 'LLM設定の削除に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'LLM設定が削除されました' });
  } catch (error) {
    console.error('LLM settings API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}