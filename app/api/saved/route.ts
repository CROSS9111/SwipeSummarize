import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z, ZodError } from "zod";

const saveSchema = z.object({
  url_id: z.string().uuid(),
  title: z.string().min(1, "タイトルが必要です"),
  summary: z.string().min(1, "要約が必要です"),
  original_url: z.string().url("有効なURLが必要です"),
  tags: z.array(z.string()).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = saveSchema.parse(body);

    const supabase = await createClient();

    // 要約を保存
    const { data: savedData, error: saveError } = await supabase
      .from("saved")
      .insert({
        title: validatedData.title,
        summary: validatedData.summary,
        original_url: validatedData.original_url,
        tags: validatedData.tags,
      } as any)
      .select()
      .single();

    if (saveError) throw saveError;

    // 元のURLを削除
    const { error: deleteError } = await supabase
      .from("urls")
      .delete()
      .eq("id", validatedData.url_id);

    if (deleteError) {
      console.warn("URL削除エラー（要約は保存済み）:", deleteError);
    }

    return NextResponse.json(savedData);
  } catch (error) {
    console.error("要約保存エラー:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: (error as any).errors[0].message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "要約の保存に失敗しました" } },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("saved")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("保存済みリスト取得エラー:", error);
    return NextResponse.json(
      { error: { code: "FETCH_ERROR", message: "保存済みリストの取得に失敗しました" } },
      { status: 500 }
    );
  }
}