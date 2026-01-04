import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { startAsyncSummarization } from "@/lib/async-summarize";

/**
 * POST /api/urls/batch-process - 待機中・エラーURLの一括再処理
 * Feature: F-007-ASYNC-PROCESS
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // pending または error 状態のURLを取得
    const { data: rawUrls, error: fetchError } = await supabase
      .from("urls")
      .select("id, url, status")
      .or("status.eq.pending,status.eq.error");

    if (fetchError) {
      throw fetchError;
    }

    const urls = rawUrls as
      | { id: string; url: string; status: string }[]
      | null;

    if (!urls || urls.length === 0) {
      return NextResponse.json({
        message: "処理対象のURLはありません",
        processedCount: 0,
      });
    }

    let processedCount = 0;

    for (const urlRecord of urls) {
      // error の場合は pending に戻す（必要に応じて）
      // async-summarize.ts 内の processSummarization は status='pending' を期待しているため
      if (urlRecord.status === "error") {
        await (supabase.from("urls") as any)
          .update({
            status: "pending",
            error_message: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", urlRecord.id);
      }

      // 非同期処理を開始
      startAsyncSummarization(urlRecord.id, urlRecord.url);
      processedCount++;
    }

    return NextResponse.json({
      message: `${processedCount} 件のURLの要約処理を再開しました`,
      processedCount,
    });
  } catch (error) {
    console.error("Batch process error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "一括処理の開始に失敗しました",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/urls/batch-process - 処理対象の件数確認
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from("urls")
      .select("*", { count: "exact", head: true })
      .or("status.eq.pending,status.eq.error");

    if (error) throw error;

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error("Batch count error:", error);
    return NextResponse.json(
      { error: { code: "FETCH_ERROR", message: "件数の取得に失敗しました" } },
      { status: 500 }
    );
  }
}
