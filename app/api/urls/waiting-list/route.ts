import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  console.log("GET /api/urls/waiting-list called");

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.min(Math.max(Number(searchParams.get("page")) || 1, 1), 100);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 50);
    const offset = (page - 1) * limit;

    console.log("Fetching waiting list - page:", page, "limit:", limit);

    const supabase = await createClient();
    console.log("Supabase client created");

    // Get all URLs (all are "waiting" since summaries are generated on-demand)
    const { data: allUrls, error: fetchError, count: totalCount } = await supabase
      .from("urls")
      .select("id, url, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (fetchError) {
      console.error("Fetch error:", fetchError);
      throw fetchError;
    }

    const count = totalCount || 0;
    const data = allUrls || [];

    console.log("Total URLs:", count, "Fetched:", data.length);

    console.log("Data fetched:", data?.length || 0, "items");

    const hasMore = offset + limit < (count || 0);

    return NextResponse.json({
      items: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        hasMore,
      },
    });
  } catch (error: any) {
    console.error("Waiting list fetch error:", error);
    console.error("Error stack:", error?.stack);

    let errorMessage = "Unknown error";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    } else {
      errorMessage = String(error);
    }

    console.error("Error details:", errorMessage);

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