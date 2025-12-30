import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const allDeleteSchema = z.object({
  confirm: z.literal(true, {
    errorMap: () => ({ message: "全削除には confirm: true が必要です" }),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // バリデーション
    const validatedData = allDeleteSchema.parse(body);

    if (!validatedData.confirm) {
      return NextResponse.json(
        {
          error: {
            code: "CONFIRMATION_REQUIRED",
            message: "全削除には confirm: true が必要です",
          },
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 全件取得してカウント
    const { data: countData, error: countError } = await supabase
      .from("saved")
      .select("id");

    if (countError) {
      console.error("件数取得エラー:", countError);
      return NextResponse.json(
        {
          error: {
            code: "DATABASE_ERROR",
            message: "削除件数の取得に失敗しました",
          },
        },
        { status: 500 }
      );
    }

    const totalCount = countData?.length || 0;

    // 全削除実行
    const { error } = await supabase
      .from("saved")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // 全件削除のための条件

    if (error) {
      console.error("全削除エラー:", error);
      return NextResponse.json(
        {
          error: {
            code: "DATABASE_ERROR",
            message: "全削除に失敗しました",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      deletedCount: totalCount,
    });
  } catch (error) {
    console.error("全削除処理エラー:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "CONFIRMATION_REQUIRED",
            message: error.errors[0].message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "全削除処理中にエラーが発生しました",
        },
      },
      { status: 500 }
    );
  }
}