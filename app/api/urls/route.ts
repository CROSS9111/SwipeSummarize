import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const urlSchema = z.object({
  url: z.string().url("有効なURLを入力してください"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = urlSchema.parse(body);

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("urls")
      .insert({ url })
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

    return NextResponse.json(data);
  } catch (error) {
    console.error("URL追加エラー:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: error.errors[0].message } },
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