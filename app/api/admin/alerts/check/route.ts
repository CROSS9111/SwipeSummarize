import { NextRequest, NextResponse } from "next/server";
import { AlertManager } from "@/lib/llm/alerts";

// アラート監視の手動実行
export async function POST(request: NextRequest) {
  try {
    const alertManager = new AlertManager();
    const triggeredAlerts = await alertManager.checkAlerts();

    return NextResponse.json({
      triggeredAlerts,
      count: triggeredAlerts.length,
      message: `アラート監視を実行しました。${triggeredAlerts.length}件のアラートが発生しました。`
    });
  } catch (error) {
    console.error('Alert check error:', error);
    return NextResponse.json(
      { error: 'アラート監視の実行に失敗しました' },
      { status: 500 }
    );
  }
}