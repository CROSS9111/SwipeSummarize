/**
 * 非同期要約処理ユーティリティ
 * Feature: F-007-ASYNC-PROCESS
 *
 * Next.js after() API を使用してバックグラウンドで要約・タグ生成を行う
 */

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchArticleContent } from "@/lib/jina";
import { summarizeContentWithTags } from "@/lib/gemini";

const MAX_RETRY = 3;
const RETRY_DELAYS = [1000, 2000, 3000]; // 指数バックオフ簡易版

export type UrlStatus = 'pending' | 'processing' | 'completed' | 'error';

export interface SummarizationResult {
  success: boolean;
  title?: string;
  summary?: string;
  tags?: string[];
  error?: string;
}

/**
 * 非同期要約処理を開始
 * after() API を使用してレスポンス返却後にバックグラウンド処理を実行
 */
export function startAsyncSummarization(urlId: string, url: string): void {
  after(async () => {
    await processSummarization(urlId, url);
  });
}

/**
 * 要約処理のメイン関数（リトライロジック含む）
 * Optimistic Lockingで並行処理を制御
 */
async function processSummarization(urlId: string, url: string): Promise<void> {
  const supabase = await createClient();

  // ステータスをprocessingに更新（Optimistic Locking）
  const { data: urlData, error: lockError } = await (supabase
    .from("urls") as any)
    .update({
      status: "processing",
    })
    .eq("id", urlId)
    .eq("status", "pending") // pendingの場合のみ更新
    .select()
    .single();

  if (lockError || !urlData) {
    console.error(`URL ${urlId} のロック取得に失敗:`, lockError);
    return; // 他のプロセスが処理中か、既に完了
  }

  let lastError: Error | null = null;
  let retryCount = 0;

  while (retryCount < MAX_RETRY) {
    try {
      // 記事コンテンツ取得
      const article = await fetchArticleContent(url);

      // 要約・タグ生成
      const { summary, tags } = await summarizeContentWithTags(
        article.title,
        article.content
      );

      // 成功: DB更新
      const { error: updateError } = await (supabase
        .from("urls") as any)
        .update({
          title: article.title,
          summary,
          tags,
          status: "completed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", urlId);

      if (updateError) {
        console.error(`URL ${urlId} の更新に失敗:`, updateError);
      } else {
        console.log(`URL ${urlId} の要約処理が完了しました`);
      }

      return; // 成功
    } catch (error) {
      lastError = error as Error;
      retryCount++;
      console.error(
        `要約処理失敗 (${retryCount}/${MAX_RETRY}) URL: ${urlId}:`,
        error
      );

      if (retryCount < MAX_RETRY) {
        // リトライ前に待機
        await sleep(RETRY_DELAYS[retryCount - 1] || 1000);
      }
    }
  }

  // 全リトライ失敗: エラーステータスに更新
  const { error: errorUpdateError } = await (supabase
    .from("urls") as any)
    .update({
      status: "error",
      error_message: truncateErrorMessage(lastError?.message || "要約処理に失敗しました"),
      retry_count: retryCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", urlId);

  if (errorUpdateError) {
    console.error(`URL ${urlId} のエラー更新に失敗:`, errorUpdateError);
  }

  console.error(`URL ${urlId} の要約処理が ${MAX_RETRY} 回失敗しました`);
}

/**
 * リトライ処理を開始（手動リトライ用）
 * エラーステータスのURLをpendingに戻して再処理
 */
export async function retryAsyncSummarization(
  urlId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // エラーステータスのURLのみリトライ可能
  const { data, error: fetchError } = await supabase
    .from("urls")
    .select("id, url, status")
    .eq("id", urlId)
    .single();

  if (fetchError || !data) {
    return { success: false, error: "URLが見つかりません" };
  }

  const urlRecord = data as { id: string; url: string; status: string };

  if (urlRecord.status !== "error") {
    return { success: false, error: "エラーステータスのURLのみリトライ可能です" };
  }

  // ステータスをpendingに戻す（retry_countはリセットしない）
  const { error: updateError } = await (supabase
    .from("urls") as any)
    .update({
      status: "pending",
      error_message: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", urlId);

  if (updateError) {
    return { success: false, error: "ステータス更新に失敗しました" };
  }

  // 非同期処理を再開
  startAsyncSummarization(urlId, urlRecord.url);

  return { success: true };
}

/**
 * 指定ミリ秒待機
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * エラーメッセージを適切な長さに切り詰める
 */
function truncateErrorMessage(message: string, maxLength: number = 500): string {
  if (message.length <= maxLength) {
    return message;
  }
  return message.substring(0, maxLength - 3) + "...";
}
