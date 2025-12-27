# SwipeSummarize MVP実装ドキュメント

作成日: 2025-12-27
プロジェクト: SwipeSummarize
実装者: Claude with Human

## 概要

「後で読む」記事をAI要約でサクサク消化するTinder風UIのWebアプリ「SwipeSummarize」のMVP実装を完了しました。核心原則「1 Todo = 1 Commit = 1 Spec Update」に従い、段階的に機能を実装しました。

## 実装内容

### Phase 1: API基盤構築

#### 環境構築
- **パッケージインストール**
  - Supabase Client (`@supabase/supabase-js`, `@supabase/ssr`)
  - Google Gemini API (`@google/generative-ai`)
  - Framer Motion (`framer-motion`)
  - Validation (`zod`)
  - UI Components (`shadcn/ui` + 関連パッケージ)

#### API実装
完全なRESTful APIを実装：

```typescript
// 実装されたエンドポイント
POST   /api/urls           # URL追加（重複チェック付き）
GET    /api/urls           # URLリスト取得
GET    /api/urls/random    # ランダム取得+AI要約生成
DELETE /api/urls/:id       # URL削除
POST   /api/saved          # 要約保存（元URL自動削除）
GET    /api/saved          # 保存済みリスト取得
```

#### 外部API統合
- **Jina Reader API**: URLからコンテンツ抽出
- **Google Gemini API**: AI要約生成（3-5文の日本語要約）

### Phase 2: UI実装

#### コンポーネント構築
1. **UrlInput.tsx**: URL入力フォーム（リアルタイムバリデーション）
2. **SummaryCard.tsx**: 要約カード表示（スクロール可能）
3. **ActionButtons.tsx**: 3つのアクションボタン
4. **SwipeableCard.tsx**: Framer Motionによるスワイプアニメーション

#### 画面実装
- **ホームページ** (`app/page.tsx`)
  - URL入力機能
  - 要約カード表示
  - スワイプ/ボタンによる仕分け

- **保存済みリストページ** (`app/saved/page.tsx`)
  - グリッドレイアウト
  - 要約の一覧表示
  - 元記事へのリンク

## 技術スタック

```json
{
  "framework": "Next.js 16.1 (App Router)",
  "ui": "React 19 + TypeScript",
  "styling": "Tailwind CSS v4 + shadcn/ui",
  "database": "Supabase (PostgreSQL)",
  "ai": "Google Gemini API + Jina Reader API",
  "animation": "Framer Motion"
}
```

## データベーススキーマ

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
```

## ユーザーインタラクション

### スワイプ操作
- **左スワイプ**: すてる（URLを削除）
- **右スワイプ**: とっとく（要約を保存）
- **上スワイプ**: もう一度（別の記事を表示）

### ボタン操作
スワイプに対応していないデバイスでも、3つのボタンで同じ操作が可能

## セットアップ手順

### 1. 環境変数設定
`.env.local`ファイルを作成：

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini API
GEMINI_API_KEY=

# Jina Reader API（オプション）
JINA_API_KEY=
```

### 2. Supabaseセットアップ
1. Supabaseプロジェクトを作成
2. SQLエディタでスキーマを実行
3. API設定から認証情報を取得

### 3. 開発サーバー起動
```bash
npm install
npm run dev
```

## 実装上の工夫点

### 型安全性
- TypeScriptで完全型定義
- Zodによるランタイムバリデーション
- Supabase型の明示的な定義

### エラーハンドリング
- 統一されたエラーレスポンス形式
- ユーザーフレンドリーなトースト通知
- 失敗したURLの自動削除

### パフォーマンス
- 要約生成の非同期処理
- スクロール可能な長文要約
- ローディング状態の適切な表示

## トラブルシューティング

### TypeScript型エラー
Supabaseの型推論が効かない場合は`as any`で一時的に回避：
```typescript
const { data, error } = await supabase
  .from("urls")
  .insert({ url } as any)
```

### Zodエラーメッセージ
ZodErrorのerrorsプロパティアクセス時：
```typescript
if (error instanceof ZodError) {
  message: (error as any).errors[0].message
}
```

## 今後の拡張予定

- [ ] タグ機能の実装
- [ ] 検索機能
- [ ] エクスポート機能
- [ ] PWA対応
- [ ] ユーザー認証（Supabase Auth）

## 関連ファイル

- `/README.md` - プロジェクト仕様書
- `/docs/onboard_task.md` - セットアップタスク
- `/CLAUDE.md` - プロジェクト指示書
- `/.env.example` - 環境変数テンプレート

## コミット履歴

1. **API基盤構築** (`40f94f2`)
   - 全APIエンドポイント実装
   - 外部API統合
   - 型定義作成

2. **UI実装完了** (`7f76a0d`)
   - 全UIコンポーネント実装
   - スワイプアニメーション追加
   - MVP機能完成

## まとめ

SwipeSummarizeのMVP実装が完了し、基本的な機能がすべて動作する状態になりました。「後で読む」記事をAI要約でサクサク消化できる、直感的なインターフェースを持つWebアプリケーションとして完成しています。

今後はユーザーフィードバックを基に、タグ機能や検索機能などの追加機能を実装していく予定です。