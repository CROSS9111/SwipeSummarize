import { NextRequest, NextResponse } from "next/server";
import { retryAsyncSummarization } from "@/lib/async-summarize";

/**
 * POST /api/urls/[id]/retry - エラーURLの要約リトライ
 * Feature: F-007-ASYNC-PROCESS
 *
 * - エラーステータスのURLのみリトライ可能
 * - ステータスをpendingに戻して再処理開始
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: { code: "MISSING_ID", message: "URLのIDが指定されていません" } },
        { status: 400 }
      );
    }

    const result = await retryAsyncSummarization(id);

    if (!result.success) {
      return NextResponse.json(
        { error: { code: "RETRY_FAILED", message: result.error } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        id,
        status: "pending",
        message: "要約処理を再開しました",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("リトライエラー:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "リトライ処理に失敗しました" } },
      { status: 500 }
    );
  }
}
