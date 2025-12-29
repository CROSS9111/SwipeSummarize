import { NextRequest, NextResponse } from "next/server";
import { ABTestManager } from "@/lib/llm/ab-test";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: testId } = await params;

    if (!testId) {
      return NextResponse.json(
        { error: 'テストIDが必要です' },
        { status: 400 }
      );
    }

    const abTestManager = new ABTestManager();
    const analysis = await abTestManager.analyzeTest(testId);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('A/B test analysis error:', error);
    return NextResponse.json(
      { error: 'A/Bテスト分析に失敗しました' },
      { status: 500 }
    );
  }
}