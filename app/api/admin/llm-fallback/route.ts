import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// フォールバック設定の取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const environment = searchParams.get('environment') || 'local';

    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('llm_fallback_configs')
      .select('*')
      .eq('environment', environment)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Fallback config fetch error:', error);
      return NextResponse.json(
        { error: 'フォールバック設定の取得に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      config: data || null,
      hasConfig: !!data
    });
  } catch (error) {
    console.error('Fallback config API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// フォールバック設定の作成・更新
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      environment = 'local',
      primaryProvider,
      primaryModel,
      fallbackProviders = [],
      maxRetries = 3,
      retryDelay = 1000,
      circuitBreakerThreshold = 5,
      circuitBreakerResetTime = 60000,
      isActive = true
    } = body;

    if (!primaryProvider || !primaryModel) {
      return NextResponse.json(
        { error: 'プライマリプロバイダーとモデルは必須です' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 既存の設定を無効化
    if (isActive) {
      await (supabase as any)
        .from('llm_fallback_configs')
        .update({ is_active: false })
        .eq('environment', environment);
    }

    // 新しい設定を挿入
    const { data, error } = await (supabase as any)
      .from('llm_fallback_configs')
      .insert({
        environment,
        primary_provider: primaryProvider,
        primary_model: primaryModel,
        fallback_providers: fallbackProviders,
        max_retries: maxRetries,
        retry_delay: retryDelay,
        circuit_breaker_threshold: circuitBreakerThreshold,
        circuit_breaker_reset_time: circuitBreakerResetTime,
        is_active: isActive,
      })
      .select()
      .single();

    if (error) {
      console.error('Fallback config create error:', error);
      return NextResponse.json(
        { error: 'フォールバック設定の作成に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({ config: data }, { status: 201 });
  } catch (error) {
    console.error('Fallback config API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// フォールバックログの取得
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const environment = searchParams.get('environment') || 'local';
    const limit = parseInt(searchParams.get('limit') || '100');

    const supabase = await createClient();
    const { data, error } = await (supabase as any)
      .from('llm_fallback_logs')
      .select('*')
      .eq('environment', environment)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Fallback logs fetch error:', error);
      return NextResponse.json(
        { error: 'フォールバックログの取得に失敗しました' },
        { status: 500 }
      );
    }

    // 統計情報を計算
    const stats = calculateFallbackStats(data || []);

    return NextResponse.json({
      logs: data || [],
      stats
    });
  } catch (error) {
    console.error('Fallback logs API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

function calculateFallbackStats(logs: any[]) {
  if (!logs.length) {
    return {
      totalAttempts: 0,
      successRate: 0,
      fallbackUsageRate: 0,
      avgAttemptsPerRequest: 0,
      topFailureReasons: [],
      providerReliability: {}
    };
  }

  const totalAttempts = logs.length;
  const successCount = logs.filter(log => log.success).length;
  const successRate = (successCount / totalAttempts) * 100;

  const fallbackUsed = logs.filter(log =>
    log.used_provider !== log.primary_provider ||
    log.used_model !== log.primary_model
  ).length;
  const fallbackUsageRate = (fallbackUsed / totalAttempts) * 100;

  const avgAttemptsPerRequest = logs.reduce((sum, log) =>
    sum + (log.attempted_providers?.length || 1), 0
  ) / totalAttempts;

  // エラー理由の集計
  const errorReasons: Record<string, number> = {};
  logs.filter(log => !log.success && log.error_message).forEach(log => {
    const reason = log.error_message;
    errorReasons[reason] = (errorReasons[reason] || 0) + 1;
  });

  const topFailureReasons = Object.entries(errorReasons)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([reason, count]) => ({ reason, count }));

  // プロバイダー別信頼性
  const providerStats: Record<string, { attempts: number; successes: number }> = {};
  logs.forEach(log => {
    const key = `${log.primary_provider}:${log.primary_model}`;
    if (!providerStats[key]) {
      providerStats[key] = { attempts: 0, successes: 0 };
    }
    providerStats[key].attempts++;
    if (log.success && log.used_provider === log.primary_provider) {
      providerStats[key].successes++;
    }
  });

  const providerReliability: Record<string, number> = {};
  Object.entries(providerStats).forEach(([key, stats]) => {
    providerReliability[key] = (stats.successes / stats.attempts) * 100;
  });

  return {
    totalAttempts,
    successRate: Math.round(successRate * 100) / 100,
    fallbackUsageRate: Math.round(fallbackUsageRate * 100) / 100,
    avgAttemptsPerRequest: Math.round(avgAttemptsPerRequest * 100) / 100,
    topFailureReasons,
    providerReliability
  };
}