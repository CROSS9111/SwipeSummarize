import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/urls/random - 要約済みURLからランダム取得
 * Feature: F-007-ASYNC-PROCESS
 *
 * - status='completed' のURLのみ対象
 * - DBに保存された要約・タグを返却（API呼び出し不要）
 * - パフォーマンス最適化: 全件取得せずサンプリング
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // 要約完了済みURLの件数を取得
    const { count, error: countError } = await supabase
      .from("urls")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    if (countError) throw countError;

    if (!count || count === 0) {
      // 処理中・待機中のURLがあるか確認
      const { count: pendingCount } = await supabase
        .from("urls")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "processing"]);

      if (pendingCount && pendingCount > 0) {
        return NextResponse.json(
          {
            error: {
              code: "NO_COMPLETED_URLS",
              message: `現在 ${pendingCount} 件のURLを要約処理中です。しばらくお待ちください。`,
            },
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          error: {
            code: "NO_URLS",
            message: "URLリストが空です。新しいURLを追加してください。",
          },
        },
        { status: 404 }
      );
    }

    // ランダムなオフセットを計算
    const randomOffset = Math.floor(Math.random() * count);

    // 要約完了済みからランダムに1件取得
    const { data: urls, error: fetchError } = await supabase
      .from("urls")
      .select("id, url, title, summary, tags, created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .range(randomOffset, randomOffset);

    if (fetchError) throw fetchError;

    if (!urls || urls.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "NO_URLS",
            message: "要約済みのURLがありません。",
          },
        },
        { status: 404 }
      );
    }

    const randomUrl = urls[0] as any;

    // DBに保存された要約・タグを返却
    return NextResponse.json({
      id: randomUrl.id,
      url: randomUrl.url,
      title: randomUrl.title || "タイトルなし",
      summary: randomUrl.summary,
      tags: randomUrl.tags || [],
      created_at: randomUrl.created_at,
    });
  } catch (error) {
    console.error("ランダム取得エラー:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "記事の取得に失敗しました" } },
      { status: 500 }
    );
  }
}
