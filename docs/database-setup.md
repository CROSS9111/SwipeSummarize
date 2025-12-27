# データベースセットアップ

## 概要
SwipeSummarizeアプリケーションで使用するSupabaseデータベースのテーブル構成とセットアップ手順。

## プロジェクト情報
- **プロジェクト名**: SwipeSummarize
- **プロジェクトID**: upfhebwtwqeaxlkguwbe
- **リージョン**: ap-northeast-1 (東京)
- **ステータス**: ACTIVE_HEALTHY

## テーブル構成

### 1. urls テーブル（ウェイティングリスト）
記事URLを一時的に保存するテーブル。ユーザーが「後で読む」として登録したURLを管理。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 一意識別子 |
| url | TEXT | NOT NULL, UNIQUE | 記事のURL |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 更新日時 |

### 2. saved テーブル（保存済み要約）
ユーザーが「とっとく」を選択した記事の要約を永続的に保存するテーブル。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 一意識別子 |
| title | TEXT | NOT NULL | 記事タイトル |
| summary | TEXT | NOT NULL | AI生成の要約 |
| original_url | TEXT | NOT NULL | 元記事のURL |
| tags | JSONB | DEFAULT '[]'::jsonb | タグ配列 |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 更新日時 |

## SQLスクリプト

以下のSQLをSupabaseのSQL Editorで実行してテーブルを作成します。

```sql
-- urls テーブル（ウェイティングリスト）
CREATE TABLE urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- saved テーブル（保存済み要約）
CREATE TABLE saved (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  original_url TEXT NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- updated_at 自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- urlsテーブルのupdated_atトリガー
CREATE TRIGGER update_urls_updated_at
  BEFORE UPDATE ON urls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- savedテーブルのupdated_atトリガー
CREATE TRIGGER update_saved_updated_at
  BEFORE UPDATE ON saved
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- パフォーマンス向上のためのインデックス
CREATE INDEX idx_urls_created_at ON urls(created_at DESC);
CREATE INDEX idx_saved_created_at ON saved(created_at DESC);
CREATE INDEX idx_saved_tags ON saved USING GIN(tags);
```

## セットアップ実行タスク

1. ✅ データベーステーブル作成タスクをドキュメントに記載
2. ⏳ Supabaseでurlsテーブルを作成
3. ⏳ Supabaseでsavedテーブルを作成
4. ⏳ updated_at自動更新トリガーを設定
5. ⏳ インデックスを作成
6. ⏳ 作成されたテーブル構造を確認

## 実行日
- 作成日: 2025-12-27
- **実行完了**: 2025-12-27 ✅

## 作成結果
✅ すべてのテーブルとインデックスが正常に作成されました：

### urlsテーブル
- ✅ テーブル作成完了
- ✅ 4カラム: id, url, created_at, updated_at
- ✅ updated_atトリガー設定済み
- ✅ created_atインデックス作成済み

### savedテーブル
- ✅ テーブル作成完了
- ✅ 7カラム: id, title, summary, original_url, tags, created_at, updated_at
- ✅ updated_atトリガー設定済み
- ✅ created_atインデックス作成済み
- ✅ tagsインデックス(GIN)作成済み

## 注意事項
- テーブル作成前に既存のテーブルがないことを確認済み
- Row Level Security (RLS) は将来のユーザー認証実装時に追加予定
- 現在はシングルユーザー利用を想定