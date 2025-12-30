import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // UUIDバリデーション
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "無効なIDフォーマットです",
          },
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 削除実行
    const { data, error } = await supabase
      .from("saved")
      .delete()
      .eq("id", id)
      .select();

    if (error) {
      console.error("削除エラー:", error);
      return NextResponse.json(
        {
          error: {
            code: "DATABASE_ERROR",
            message: "削除に失敗しました",
          },
        },
        { status: 500 }
      );
    }

    // 削除対象が見つからない場合
    if (!data || data.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "指定された記事が見つかりません",
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      deletedId: id,
    });
  } catch (error) {
    console.error("削除処理エラー:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "削除処理中にエラーが発生しました",
        },
      },
      { status: 500 }
    );
  }
}