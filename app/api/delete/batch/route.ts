import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const batchDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "削除対象のIDが必要です"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // バリデーション
    const validatedData = batchDeleteSchema.parse(body);
    const { ids } = validatedData;

    const supabase = await createClient();

    // 一括削除実行
    const { data, error } = await supabase
      .from("saved")
      .delete()
      .in("id", ids)
      .select();

    if (error) {
      console.error("一括削除エラー:", error);
      return NextResponse.json(
        {
          error: {
            code: "DATABASE_ERROR",
            message: "一括削除に失敗しました",
          },
        },
        { status: 500 }
      );
    }

    const deletedCount = data?.length || 0;
    const deletedIds = data?.map((item: any) => item.id) || [];

    return NextResponse.json({
      deletedCount,
      deletedIds,
    });
  } catch (error) {
    console.error("一括削除処理エラー:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: error.issues[0].message,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "一括削除処理中にエラーが発生しました",
        },
      },
      { status: 500 }
    );
  }
}