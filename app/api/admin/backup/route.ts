import { NextRequest, NextResponse } from "next/server";
import { LLMBackupManager } from "@/lib/llm/backup";

const backupManager = new LLMBackupManager();

// バックアップ一覧の取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const environment = searchParams.get('environment');

    const backups = await backupManager.listBackups(environment || undefined);

    return NextResponse.json({ backups });
  } catch (error) {
    console.error('Backup list error:', error);
    return NextResponse.json(
      { error: 'バックアップ一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// バックアップの作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      environment,
      creator,
      description,
      options = {}
    } = body;

    if (!environment || !creator) {
      return NextResponse.json(
        { error: '環境とクリエーターは必須です' },
        { status: 400 }
      );
    }

    const backup = await backupManager.createBackup(
      environment,
      options,
      creator,
      description
    );

    return NextResponse.json({
      backup,
      message: 'バックアップが正常に作成されました'
    }, { status: 201 });
  } catch (error) {
    console.error('Backup creation error:', error);
    return NextResponse.json(
      { error: `バックアップの作成に失敗しました: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 }
    );
  }
}

// バックアップの削除
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const backupId = searchParams.get('id');

    if (!backupId) {
      return NextResponse.json(
        { error: 'バックアップIDが必要です' },
        { status: 400 }
      );
    }

    await backupManager.deleteBackup(backupId);

    return NextResponse.json({
      message: 'バックアップが削除されました'
    });
  } catch (error) {
    console.error('Backup deletion error:', error);
    return NextResponse.json(
      { error: 'バックアップの削除に失敗しました' },
      { status: 500 }
    );
  }
}