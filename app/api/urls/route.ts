import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z, ZodError } from "zod";
import { validateUrl } from "@/lib/url-validator";
import { startAsyncSummarization } from "@/lib/async-summarize";

const urlSchema = z.object({
  url: z.string().url("有効なURLを入力してください"),
});

/**
 * POST /api/urls - URL登録（非同期要約開始）
 * Feature: F-007-ASYNC-PROCESS
 *
 * 1. URLバリデーション（Zod + SSRF対策）
 * 2. DBに保存（status: 'pending'）
 * 3. after() で非同期要約処理を開始
 * 4. 202 Accepted を即時返却
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = urlSchema.parse(body);

    // SSRF対策: URL検証
    const validation = validateUrl(url);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: { code: "INVALID_URL", message: validation.error } },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // URLを保存（status: 'pending'）
    const { data, error } = await supabase
      .from("urls")
      .insert({
        url,
        status: "pending",
        retry_count: 0,
        version: 1,
      } as any)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: { code: "URL_ALREADY_EXISTS", message: "このURLは既に追加済みです" } },
          { status: 400 }
        );
      }
      throw error;
    }

    // 型アサーション
    const urlRecord = data as { id: string; url: string; status: string; created_at: string };

    // 非同期で要約処理を開始
    startAsyncSummarization(urlRecord.id, url);

    // 202 Accepted を返却（処理受付完了）
    return NextResponse.json(
      {
        id: urlRecord.id,
        url: urlRecord.url,
        status: urlRecord.status,
        created_at: urlRecord.created_at,
        message: "URLを登録しました。バックグラウンドで要約を生成中です。",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("URL追加エラー:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: (error as any).errors[0].message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "URLの追加に失敗しました" } },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("urls")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("URLリスト取得エラー:", error);
    return NextResponse.json(
      { error: { code: "FETCH_ERROR", message: "URLリストの取得に失敗しました" } },
      { status: 500 }
    );
  }
}