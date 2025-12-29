import { NextRequest, NextResponse } from "next/server";
import { LLMBackupManager } from "@/lib/llm/backup";

const backupManager = new LLMBackupManager();

// バックアップのリストア
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: backupId } = await params;
    const body = await request.json();
    const {
      overwriteExisting = false,
      validateBeforeRestore = true,
      dryRun = false
    } = body;

    if (!backupId) {
      return NextResponse.json(
        { error: 'バックアップIDが必要です' },
        { status: 400 }
      );
    }

    // バックアップデータを取得
    const backupData = await backupManager.getBackup(backupId);
    if (!backupData) {
      return NextResponse.json(
        { error: 'バックアップが見つかりません' },
        { status: 404 }
      );
    }

    // リストア実行
    const result = await backupManager.restoreBackup(backupData, {
      overwriteExisting,
      validateBeforeRestore,
      dryRun
    });

    return NextResponse.json({
      ...result,
      message: dryRun ?
        'ドライランが完了しました（実際のリストアは実行されませんでした）' :
        'リストアが完了しました'
    });
  } catch (error) {
    console.error('Restore error:', error);
    return NextResponse.json(
      { error: `リストアに失敗しました: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}