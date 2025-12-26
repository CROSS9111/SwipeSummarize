import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: { code: "MISSING_ID", message: "IDが必要です" } },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.from("urls").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("URL削除エラー:", error);
    return NextResponse.json(
      { error: { code: "DELETE_ERROR", message: "URLの削除に失敗しました" } },
      { status: 500 }
    );
  }
}