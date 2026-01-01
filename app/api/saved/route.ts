import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z, ZodError } from "zod";
import DOMPurify from 'isomorphic-dompurify';

// タグバリデーションスキーマ（設計書Section 3準拠）
const TagValidationSchema = z.string()
  .min(1, 'タグが空です')
  .max(50, 'タグが長すぎます（50文字以内）')
  .regex(
    /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s\-_]+$/,
    '無効な文字が含まれています'
  );

const saveSchema = z.object({
  url_id: z.string().uuid(),
  title: z.string().min(1, "タイトルが必要です"),
  summary: z.string().min(1, "要約が必要です"),
  original_url: z.string().url("有効なURLが必要です"),
  tags: z.array(TagValidationSchema).optional().default([]),
});

// タグフィルタ用スキーマ
const TagFilterQuerySchema = z.object({
  tags: z
    .string()
    .optional()
    .transform((val) => val ? val.split(',').filter(Boolean) : [])
    .pipe(
      z.array(TagValidationSchema)
        .max(10, 'タグは最大10個まで')
    )
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
        { error: { code: "VALIDATION_ERROR", message: error.issues[0].message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "要約の保存に失敗しました" } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // タグフィルタのバリデーション
    const queryValidation = TagFilterQuerySchema.safeParse({
      tags: searchParams.get('tags')
    });

    if (!queryValidation.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "不正なタグパラメータです",
            details: queryValidation.error.issues
          }
        },
        { status: 400 }
      );
    }

    const { tags: filterTags } = queryValidation.data;
    const supabase = await createClient();

    let query = supabase
      .from("saved")
      .select("*")
      .order("created_at", { ascending: false });

    // タグフィルタリング（OR検索）
    if (filterTags.length > 0) {
      // サニタイゼーション済みタグでフィルタリング
      const sanitizedTags = filterTags.map(tag => DOMPurify.sanitize(tag.trim()));
      query = query.overlaps('tags', sanitizedTags);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("保存済みリスト取得エラー:", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: error.issues[0].message } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: { code: "FETCH_ERROR", message: "保存済みリストの取得に失敗しました" } },
      { status: 500 }
    );
  }
}