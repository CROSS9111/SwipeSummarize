# CLAUDE.md

## What is this?

SwipeSummarize - 「後で読む」記事をAI要約でサクサク消化するTinder風UIのWebアプリ。

## Tech Stack

- Next.js 16.1 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Supabase (PostgreSQL)
- Jina Reader API (コンテンツ抽出) + Google Gemini API (要約生成)

## Commands

```bash
npm run dev      # 開発サーバー起動
npm run build    # ビルド
npm run lint     # ESLint
npx tsc --noEmit # 型チェック
```

## Key Directories

- `app/` - App Router (pages, API routes)
- `components/` - UIコンポーネント (`ui/`はshadcn/ui)
- `lib/` - Supabase/Jina/Geminiクライアント、ユーティリティ
- `hooks/` - カスタムフック
- `types/` - 型定義

## References

詳細な仕様は [README.md](README.md) を参照:
- API設計 (セクション4)
- DBスキーマ (セクション5)
- UI/UXとコンポーネント (セクション6)
- 外部API連携 (セクション7)
