# SwipeSummarize セットアップタスク

## 概要

SwipeSummarizeは「後で読む」記事をAI要約でサクサク消化するTinder風UIのWebアプリです。

## 必要な環境設定

### 1. Supabaseプロジェクト作成

1. [Supabase](https://supabase.com)でアカウント作成
2. 新規プロジェクト作成
3. 以下のSQLをSQL Editorで実行：

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

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_urls_updated_at
  BEFORE UPDATE ON urls
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_updated_at
  BEFORE UPDATE ON saved
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- インデックス
CREATE INDEX idx_urls_created_at ON urls(created_at DESC);
CREATE INDEX idx_saved_created_at ON saved(created_at DESC);
CREATE INDEX idx_saved_tags ON saved USING GIN(tags);
```

4. Project Settings > API から以下を取得：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Google Gemini API設定

1. [Google AI Studio](https://aistudio.google.com/)でAPIキー取得
2. `GEMINI_API_KEY`として設定

### 3. 環境変数設定

`.env.local`ファイルを作成：

```bash
cp .env.example .env.local
```

以下の値を設定：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini API
GEMINI_API_KEY=

# Jina Reader API（オプション - 高レート制限用）
JINA_API_KEY=
```

### 4. 開発サーバー起動

```bash
npm run dev
```

## 実装済み機能（Phase 1 基盤）

### ✅ 基盤構築
- [x] パッケージ依存関係（Supabase, Gemini API, Framer Motion）
- [x] shadcn/ui初期化と必要コンポーネント
- [x] 型定義（types/index.ts）
- [x] Supabaseクライアント設定
- [x] 外部APIクライアント（Jina, Gemini）

### ✅ API Routes
- [x] `POST /api/urls` - URL追加
- [x] `GET /api/urls` - URLリスト取得
- [x] `GET /api/urls/random` - ランダム取得+要約
- [x] `DELETE /api/urls/[id]` - URL削除
- [x] `POST /api/saved` - 要約保存
- [x] `GET /api/saved` - 保存済みリスト取得

## 次回実装タスク（Phase 1 UI）

### 🔲 UIコンポーネント
- [ ] ベースレイアウト更新（app/layout.tsx）
- [ ] URL入力コンポーネント（components/UrlInput.tsx）
- [ ] 要約カードコンポーネント（components/SummaryCard.tsx）
- [ ] アクションボタン（components/ActionButtons.tsx）
- [ ] ホームページ統合（app/page.tsx）
- [ ] 保存済みリストページ（app/saved/page.tsx）

### 🔲 体験向上（Phase 2）
- [ ] Framer Motionスワイプアニメーション
- [ ] タグ機能
- [ ] エラーハンドリング強化
- [ ] レスポンシブデザイン

## 技術スタック

- **Framework**: Next.js 16.1 (App Router)
- **UI**: shadcn/ui + Tailwind CSS v4
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini API + Jina Reader API
- **Animation**: Framer Motion

## アーキテクチャ原則

**「1 Todo = 1 Commit = 1 Spec Update」**

各機能は独立したコミットとして実装し、README.mdの進捗チェックボックスを更新します。