# セットアップ時の既知の問題

## 実行日: 2025-12-27

## 1. Gemini API クォータ制限

### 問題

`GET /api/urls/random` 実行時に Gemini API からエラーが発生:

```
[429 Too Many Requests] You exceeded your current quota
```

### 原因

- Google Gemini API の無料プランでは 1 日 1500 リクエストまで
- 1 分あたり 15 リクエストの制限あり
- 現在の API キーがクォータ制限に到達

### 対処法

1. **時間をおいて再試行** - レート制限は時間経過でリセットされます
2. **API キーを新規作成** - [Google AI Studio](https://aistudio.google.com/)で新しい API キーを取得
3. **有料プランへアップグレード** - 本番環境では有料プランの検討を推奨

## 2. Jina Reader API 認証エラー

### 問題

Jina API から 401 エラーが発生

### 原因

- JINA_API_KEY に無効な値（"test"）が設定されていた
- Jina API は認証なしでも動作するが、レート制限が厳しい（20req/min）

### 解決済み

`.env.local`で JINA_API_KEY をコメントアウトすることで、認証なしモードで動作するよう修正

## 3. Jina Reader API 応答パースエラー

### 実行日: 2025-12-30

### 問題

`GET /api/urls/random` 実行時、URL の中身の情報が取得できず、要約が正しく生成されない、または「タイトルなし」と表示される。

### 原因

- Jina Reader API (`https://r.jina.ai/`) を `Accept: application/json` で呼び出した場合、データ構造が `data` オブジェクトにラップされていることが判明。
- 以前の実装では、`response.json()` の結果をそのまま `title` や `content` として扱っていたため、値が取得できていなかった。

### 解決済み

`lib/jina.ts` を修正し、`data` プロパティを介してタイトルとコンテンツにアクセスするように変更。

```typescript
// 修正後
const json = await response.json();
const data = json.data || {};
return {
  title: data.title || "タイトルなし",
  content: data.content || "",
  // ...
};
```

## 4. ESLint エラー

### 問題

`@typescript-eslint/no-explicit-any`エラーが 5 箇所で発生

### 影響

- 開発には影響なし
- 型安全性の観点から将来的に修正推奨

### 対象ファイル

- app/api/saved/route.ts
- app/api/urls/random/route.ts
- app/api/urls/route.ts

## 4. Next.js 16 の破壊的変更

### 問題

Dynamic Route Handler の params 型が Promise に変更された

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
- URL 追加 API (`POST /api/urls`)
- URL リスト取得 API (`GET /api/urls`)

### ⚠️ 制限付き動作

- ランダム要約取得 API (`GET /api/urls/random`) - API クォータ制限により一時的に利用不可

## 推奨事項

1. **開発時**

   - Gemini API のクォータが回復するまで待つ（通常 24 時間でリセット）
   - テスト用の別の API キーを用意

2. **本番環境移行時**
   - Gemini API 有料プランの検討
   - Jina API 有料プランの検討（高レート制限）
   - ESLint エラーの修正
   - エラーハンドリングの強化
