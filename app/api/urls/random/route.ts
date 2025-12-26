import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchArticleContent } from "@/lib/jina";
import { summarizeContent } from "@/lib/gemini";

export async function GET() {
  try {
    const supabase = await createClient();

    // ランダムに1件取得
    const { data: urls, error: fetchError } = await supabase
      .from("urls")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) throw fetchError;

    if (!urls || urls.length === 0) {
      return NextResponse.json(
        { error: { code: "NO_URLS", message: "URLリストが空です。新しいURLを追加してください。" } },
        { status: 404 }
      );
    }

    // ランダムに選択
    const randomUrl = urls[Math.floor(Math.random() * urls.length)] as any;

    try {
      // 記事コンテンツを取得
      const article = await fetchArticleContent(randomUrl.url);

      // AI要約を生成
      const summary = await summarizeContent(article.title, article.content);

      const result = {
        id: randomUrl.id,
        url: randomUrl.url,
        title: article.title,
        summary,
        original_length: article.content.length,
        created_at: randomUrl.created_at,
      };

      return NextResponse.json(result);
    } catch (apiError) {
      console.error("記事取得・要約エラー:", apiError);

      // エラーが発生した場合、問題のあるURLを削除
      await supabase.from("urls").delete().eq("id", randomUrl.id);

      return NextResponse.json(
        {
          error: {
            code: "PROCESSING_FAILED",
            message: "記事の取得または要約に失敗しました。そのURLを削除しました。"
          }
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("ランダム取得エラー:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "記事の取得に失敗しました" } },
      { status: 500 }
    );
  }
}