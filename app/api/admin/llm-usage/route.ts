import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// LLM使用量統計の取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const environment = searchParams.get('environment') || 'local';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const provider = searchParams.get('provider');
    const model = searchParams.get('model');

    const supabase = await createClient();

    // ベースクエリの構築
    let query = (supabase as any)
      .from('llm_usage')
      .select('*')
      .eq('environment', environment);

    // フィルター条件の適用
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    if (provider) {
      query = query.eq('provider', provider);
    }
    if (model) {
      query = query.eq('model', model);
    }

    // 結果の取得（最新順）
    query = query.order('created_at', { ascending: false }).limit(1000);

    const { data, error } = await query;

    if (error) {
      console.error('LLM usage fetch error:', error);
      return NextResponse.json(
        { error: 'LLM使用量データの取得に失敗しました' },
        { status: 500 }
      );
    }

    // 統計情報の計算
    const stats = calculateUsageStats(data || []);

    return NextResponse.json({
      usage: data || [],
      stats,
      total: data?.length || 0
    });
  } catch (error) {
    console.error('LLM usage API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    );
  }
}

// 使用量統計の計算
function calculateUsageStats(usageData: any[]) {
  if (!usageData.length) {
    return {
      totalRequests: 0,
      successRate: 0,
      totalTokens: 0,
      totalCost: 0,
      avgResponseTime: 0,
      byProvider: {},
      byModel: {},
      byStatus: {}
    };
  }

  const totalRequests = usageData.length;
  const successCount = usageData.filter(u => u.status === 'success').length;
  const successRate = (successCount / totalRequests) * 100;

  const totalTokens = usageData.reduce((sum, u) => sum + (u.input_tokens + u.output_tokens), 0);
  const totalCost = usageData.reduce((sum, u) => sum + (u.estimated_cost || 0), 0);

  const validResponseTimes = usageData.filter(u => u.response_time_ms != null).map(u => u.response_time_ms);
  const avgResponseTime = validResponseTimes.length > 0
    ? validResponseTimes.reduce((sum, time) => sum + time, 0) / validResponseTimes.length
    : 0;

  // プロバイダー別統計
  const byProvider = usageData.reduce((acc, usage) => {
    const provider = usage.provider;
    if (!acc[provider]) {
      acc[provider] = { count: 0, cost: 0, tokens: 0 };
    }
    acc[provider].count++;
    acc[provider].cost += usage.estimated_cost || 0;
    acc[provider].tokens += usage.input_tokens + usage.output_tokens;
    return acc;
  }, {});

  // モデル別統計
  const byModel = usageData.reduce((acc, usage) => {
    const model = usage.model;
    if (!acc[model]) {
      acc[model] = { count: 0, cost: 0, tokens: 0 };
    }
    acc[model].count++;
    acc[model].cost += usage.estimated_cost || 0;
    acc[model].tokens += usage.input_tokens + usage.output_tokens;
    return acc;
  }, {});

  // ステータス別統計
  const byStatus = usageData.reduce((acc, usage) => {
    const status = usage.status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return {
    totalRequests,
    successRate: Math.round(successRate * 100) / 100,
    totalTokens,
    totalCost: Math.round(totalCost * 10000) / 10000,
    avgResponseTime: Math.round(avgResponseTime),
    byProvider,
    byModel,
    byStatus
  };
}