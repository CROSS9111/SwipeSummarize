# セットアップ時の既知の問題

## 実行日: 2025-12-27

## 1. Gemini API クォータ制限

### 問題
`GET /api/urls/random` 実行時にGemini APIからエラーが発生:
```
[429 Too Many Requests] You exceeded your current quota
```

### 原因
- Google Gemini APIの無料プランでは1日1500リクエストまで
- 1分あたり15リクエストの制限あり
- 現在のAPIキーがクォータ制限に到達

### 対処法
1. **時間をおいて再試行** - レート制限は時間経過でリセットされます
2. **APIキーを新規作成** - [Google AI Studio](https://aistudio.google.com/)で新しいAPIキーを取得
3. **有料プランへアップグレード** - 本番環境では有料プランの検討を推奨

## 2. Jina Reader API 認証エラー

### 問題
Jina APIから401エラーが発生

### 原因
- JINA_API_KEYに無効な値（"test"）が設定されていた
- Jina APIは認証なしでも動作するが、レート制限が厳しい（20req/min）

### 解決済み
`.env.local`でJINA_API_KEYをコメントアウトすることで、認証なしモードで動作するよう修正

## 3. ESLint エラー

### 問題
`@typescript-eslint/no-explicit-any`エラーが5箇所で発生

### 影響
- 開発には影響なし
- 型安全性の観点から将来的に修正推奨

### 対象ファイル
- app/api/saved/route.ts
- app/api/urls/random/route.ts
- app/api/urls/route.ts

## 4. Next.js 16 の破壊的変更

### 問題
Dynamic Route Handlerのparams型がPromiseに変更された

### 解決済み
`app/api/urls/[id]/route.ts`で以下の修正を実施:
```typescript
// Before
{ params }: { params: { id: string } }

// After
{ params }: { params: Promise<{ id: string }> }
const { id } = await params;
```

## 動作確認状況

### ✅ 正常動作
- 開発サーバー起動
- データベーステーブル作成
- URL追加API (`POST /api/urls`)
- URLリスト取得API (`GET /api/urls`)

### ⚠️ 制限付き動作
- ランダム要約取得API (`GET /api/urls/random`) - APIクォータ制限により一時的に利用不可

## 推奨事項

1. **開発時**
   - Gemini APIのクォータが回復するまで待つ（通常24時間でリセット）
   - テスト用の別のAPIキーを用意

2. **本番環境移行時**
   - Gemini API有料プランの検討
   - Jina API有料プランの検討（高レート制限）
   - ESLintエラーの修正
   - エラーハンドリングの強化