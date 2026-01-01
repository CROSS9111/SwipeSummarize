import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import DOMPurify from 'isomorphic-dompurify';

// バリデーションスキーマ（設計書Section 3準拠）
const TagValidationSchema = z.string()
  .min(1, 'タグが空です')
  .max(50, 'タグが長すぎます（50文字以内）')
  .regex(
    /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\s\-_]+$/,
    '無効な文字が含まれています'
  );

const TagSchema = z.object({
  tag: TagValidationSchema,
  count: z.number().int().positive()
});

const TagsResponseSchema = z.object({
  tags: z.array(TagSchema)
});

interface TagWithCount {
  tag: string;
  count: number;
}

// セキュアなタグ集計ロジック（設計書Section 4準拠）
function aggregateTags(items: any[]): TagWithCount[] {
  const tagCounts = new Map<string, number>();

  // メモリ効率化：大量データ対応
  for (const item of items) {
    if (!item.tags || !Array.isArray(item.tags)) continue;

    for (const rawTag of item.tags) {
      // サニタイゼーションとバリデーション
      const sanitizedTag = DOMPurify.sanitize(rawTag.trim());

      // Zodバリデーション
      const validationResult = TagValidationSchema.safeParse(sanitizedTag);
      if (!validationResult.success) continue;

      const tag = validationResult.data;
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  return Array.from(tagCounts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag, 'ja', {
      numeric: true,
      sensitivity: 'base'
    }));
}

export async function GET() {
  try {
    const supabase = await createClient();

    // 既存のsavedテーブルから全保存済み記事を取得
    const { data: savedItems, error } = await supabase
      .from('saved')
      .select('tags')
      .not('tags', 'is', null);

    if (error) throw error;

    // タグ集計
    const tagCounts = aggregateTags(savedItems || []);

    // レスポンスバリデーション
    const response = { tags: tagCounts };
    const validatedResponse = TagsResponseSchema.parse(response);

    return NextResponse.json(validatedResponse, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Content-Security-Policy': "default-src 'self'",
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error) {
    console.error("タグ取得エラー:", error);

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'タグ取得に失敗しました' } },
      { status: 500 }
    );
  }
}