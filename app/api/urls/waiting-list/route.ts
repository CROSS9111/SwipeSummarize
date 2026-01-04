import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractDomain } from "@/lib/url-validator";

/**
 * GET /api/urls/waiting-list - 待機リスト取得（ステータス付き）
 * Feature: F-007-ASYNC-PROCESS
 *
 * - 全URLを取得（ステータス情報付き）
 * - ドメイン名を抽出して返却
 * - ページネーション対応
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.min(Math.max(Number(searchParams.get("page")) || 1, 1), 100);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 50);
    const offset = (page - 1) * limit;

    // ステータスフィルター（オプション）
    const statusFilter = searchParams.get("status");

    const supabase = await createClient();

    // クエリ構築
    let query = supabase
      .from("urls")
      .select("id, url, status, error_message, created_at", { count: "exact" })
      .order("created_at", { ascending: false });

    // ステータスフィルター適用
    if (statusFilter && ["pending", "processing", "completed", "error"].includes(statusFilter)) {
      query = query.eq("status", statusFilter);
    }

    const { data: allUrls, error: fetchError, count: totalCount } = await query
      .range(offset, offset + limit - 1);

    if (fetchError) {
      console.error("Waiting list fetch error:", fetchError);
      throw fetchError;
    }

    const count = totalCount || 0;
    const items = (allUrls || []).map((item: any) => ({
      id: item.id,
      url: item.url,
      domain: extractDomain(item.url),
      status: item.status || "pending",
      error_message: item.error_message,
      created_at: item.created_at,
    }));

    const hasMore = offset + limit < count;

    // ステータス別件数を取得
    const { data: statusCounts } = await supabase
      .from("urls")
      .select("status")
      .then(async (result) => {
        if (result.error) return { data: null };

        const counts = {
          pending: 0,
          processing: 0,
          completed: 0,
          error: 0,
        };

        (result.data || []).forEach((item: any) => {
          const status = item.status || "pending";
          if (status in counts) {
            counts[status as keyof typeof counts]++;
          }
        });

        return { data: counts };
      });

    return NextResponse.json({
      items,
      pagination: {
        page,
        limit,
        total: count,
        hasMore,
      },
      statusCounts: statusCounts || {
        pending: 0,
        processing: 0,
        completed: 0,
        error: 0,
      },
    });
  } catch (error: unknown) {
    console.error("Waiting list fetch error:", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "リストの取得に失敗しました",
          details: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
