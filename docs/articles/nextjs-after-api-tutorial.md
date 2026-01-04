# Next.js 15.1 の after() API で非同期処理を実装してみた

〜URL 登録 → バックグラウンド要約の実践例〜

---

## はじめに

「URL を登録したら、要約が完了するまで 10 秒以上待たされる...」

こんな経験はありませんか？

私も記事要約アプリを開発していて、まさにこの問題に直面しました。外部 API（コンテンツ取得 + LLM 要約）を同期的に呼び出すと、ユーザーは画面の前でじっと待つことになります。

Next.js 15.1 で追加された **`after()` API** を使えば、この問題をスマートに解決できます。

この記事では、実際に URL 登録 → バックグラウンド要約を実装した経験をもとに、after() API の使い方を解説します。

**この記事で得られること**

- after() API の基本的な使い方
- ステータス管理とリトライの実装パターン
- 実際につまずいたポイントと解決策

---

## after() とは？

`after()` は Next.js 15.1 から追加された公式 API です。

**3 行で説明すると：**

- HTTP レスポンスを返した**後**に処理を実行できる
- 内部的には `waitUntil` プリミティブを利用
- ユーザーを待たせずにバックグラウンド処理が可能

従来、サーバーレス関数で長時間処理を行うと、タイムアウトのリスクがありました。after() を使えば、レスポンスを即座に返しつつ、重い処理をバックグラウンドで継続できます。

詳細は [Next.js 公式ドキュメント](https://nextjs.org/docs/app/api-reference/functions/after) を参照してください。

---

## 前提条件

- **Next.js 15.1 以上**（after() API が利用可能）
- **Supabase**（または任意の PostgreSQL）
- **Node.js 18 以上**

```bash
# Next.jsバージョン確認
npx next --version
# 15.1.0 以上であることを確認
```

---

## 実装手順

### Step 1: 基本的な after() の使い方

まずはシンプルな例から見てみましょう。

```typescript
// app/api/example/route.ts
import { NextResponse, after } from "next/server";

export async function POST(request: Request) {
  const { url } = await request.json();

  // 1. 即座にレスポンスを返す
  // 2. after() 内の処理はレスポンス後に実行される
  after(async () => {
    console.log("バックグラウンドで処理中...");
    // 重い処理をここで実行
    await heavyProcessing(url);
  });

  // 202 Accepted: 「受け付けたが、処理は完了していない」
  return NextResponse.json({ message: "処理を開始しました" }, { status: 202 });
}
```

**ポイント：**

- `after()` に渡した関数は、レスポンス返却後に実行される
- HTTP ステータス `202 Accepted` は「リクエストは受け付けたが、処理は未完了」を意味する
- after() 内でエラーが発生しても、レスポンスには影響しない

---

### Step 2: ステータス管理の実装

バックグラウンド処理の進捗を追跡するため、DB にステータス列を追加します。

```sql
-- マイグレーション例
ALTER TABLE urls
ADD COLUMN status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN error_message TEXT,
ADD COLUMN retry_count INTEGER DEFAULT 0;

-- ステータス制約
ALTER TABLE urls
ADD CONSTRAINT chk_urls_status
CHECK (status IN ('pending', 'processing', 'completed', 'error'));

-- インデックス（ステータスでの絞り込み用）
CREATE INDEX idx_urls_status ON urls(status);
```

**ステータス遷移**

```
URLを登録
　└ pending（待機中）
　　　└ processing（処理中）
　　　　　├ completed（完了）
　　　　　└ error（エラー）
　　　　　　　└ pending（リトライ時）
```

---

### Step 3: 非同期処理ユーティリティの作成

after() 内で実行する処理をユーティリティとして切り出します。

```typescript
// lib/async-summarize.ts
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchArticleContent } from "@/lib/jina";
import { summarizeContentWithTags } from "@/lib/gemini";

const MAX_RETRY = 3;
const RETRY_DELAYS = [1000, 2000, 3000]; // 段階的バックオフ

/**
 * 非同期要約処理を開始
 */
export function startAsyncSummarization(urlId: string, url: string): void {
  after(async () => {
    await processSummarization(urlId, url);
  });
}

/**
 * 要約処理のメイン関数（リトライロジック含む）
 */
async function processSummarization(urlId: string, url: string): Promise<void> {
  const supabase = await createClient();

  // ステータスをprocessingに更新（Optimistic Locking）
  const { data: urlData, error: lockError } = await supabase
    .from("urls")
    .update({ status: "processing" })
    .eq("id", urlId)
    .eq("status", "pending") // pendingの場合のみ更新
    .select()
    .single();

  if (lockError || !urlData) {
    console.error(`URL ${urlId} のロック取得に失敗`);
    return; // 他のプロセスが処理中か、既に完了
  }

  let lastError: Error | null = null;
  let retryCount = 0;

  while (retryCount < MAX_RETRY) {
    try {
      // 記事コンテンツ取得
      const article = await fetchArticleContent(url);

      // 要約・タグ生成
      const { summary, tags } = await summarizeContentWithTags(
        article.title,
        article.content
      );

      // 成功: DB更新
      await supabase
        .from("urls")
        .update({
          title: article.title,
          summary,
          tags,
          status: "completed",
        })
        .eq("id", urlId);

      console.log(`URL ${urlId} の要約処理が完了`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      retryCount++;
      console.error(`要約処理失敗 (${retryCount}/${MAX_RETRY})`);

      if (retryCount < MAX_RETRY) {
        // リトライ前に待機
        await sleep(RETRY_DELAYS[retryCount - 1]);
      }
    }
  }

  // 全リトライ失敗: エラーステータスに更新
  await supabase
    .from("urls")
    .update({
      status: "error",
      error_message: lastError?.message || "要約処理に失敗しました",
      retry_count: retryCount,
    })
    .eq("id", urlId);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

**ポイント：**

- **Optimistic Locking**: `.eq("status", "pending")` で、他のプロセスとの競合を防止
- **段階的バックオフ**: リトライ間隔を 1 秒 → 2 秒 → 3 秒 と増やす
- **エラー記録**: 失敗時はエラーメッセージを DB に保存

---

### Step 4: API エンドポイントの実装

URL 登録 API で非同期処理を開始します。

```typescript
// app/api/urls/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { startAsyncSummarization } from "@/lib/async-summarize";

const urlSchema = z.object({
  url: z.string().url("有効なURLを入力してください"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = urlSchema.parse(body);

    const supabase = await createClient();

    // URLを保存（status: 'pending'）
    const { data, error } = await supabase
      .from("urls")
      .insert({
        url,
        status: "pending",
        retry_count: 0,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "このURLは既に追加済みです" },
          { status: 400 }
        );
      }
      throw error;
    }

    // 非同期で要約処理を開始
    startAsyncSummarization(data.id, url);

    // 202 Accepted を返却（処理受付完了）
    return NextResponse.json(
      {
        id: data.id,
        url: data.url,
        status: data.status,
        message: "URLを登録しました。バックグラウンドで要約を生成中です。",
      },
      { status: 202 }
    );
  } catch (error) {
    console.error("URL追加エラー:", error);
    return NextResponse.json(
      { error: "URLの追加に失敗しました" },
      { status: 500 }
    );
  }
}
```

---

### Step 5: エラー時のリトライ機能

エラーになった URL を手動でリトライできる API を追加します。

```typescript
// app/api/urls/[id]/retry/route.ts
import { NextRequest, NextResponse } from "next/server";
import { retryAsyncSummarization } from "@/lib/async-summarize";

// Note: Next.js 15では params が Promise になりました
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const result = await retryAsyncSummarization(id);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(
    {
      id,
      status: "pending",
      message: "要約処理を再開しました",
    },
    { status: 202 }
  );
}
```

リトライ用の関数も追加します。

```typescript
// lib/async-summarize.ts に追記
export async function retryAsyncSummarization(
  urlId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // エラーステータスのURLのみリトライ可能
  const { data, error: fetchError } = await supabase
    .from("urls")
    .select("id, url, status")
    .eq("id", urlId)
    .single();

  if (fetchError || !data) {
    return { success: false, error: "URLが見つかりません" };
  }

  if (data.status !== "error") {
    return {
      success: false,
      error: "エラーステータスのURLのみリトライ可能です",
    };
  }

  // ステータスをpendingに戻す
  await supabase
    .from("urls")
    .update({
      status: "pending",
      error_message: null,
    })
    .eq("id", urlId);

  // 非同期処理を再開
  startAsyncSummarization(urlId, data.url);

  return { success: true };
}
```

---

## 動作確認

### URL の登録

```bash
curl -X POST http://localhost:3000/api/urls \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/article"}'
```

**レスポンス例**

```json
{
  "id": "uuid-xxx-xxx",
  "url": "https://example.com/article",
  "status": "pending",
  "message": "URLを登録しました。バックグラウンドで要約を生成中です。"
}
```

### ステータスの確認

```bash
curl http://localhost:3000/api/urls/waiting-list
```

**レスポンス例**

```json
{
  "statusCounts": {
    "pending": 5,
    "processing": 1,
    "completed": 10,
    "error": 2
  },
  "items": [...]
}
```

---

## トラブルシューティング

### 処理が stuck する（processing のまま止まる）

**症状**: ステータスが `processing` のまま完了しない

**原因と解決策**:

私が実際に遭遇したケースでは、**DB カラムの追加漏れ**が原因でした。

after() 内でタグを保存しようとしたが、`tags` カラムが存在せずエラーに。しかし、after() 内のエラーはレスポンスに影響しないため、サイレントに失敗していました。

```sql
-- 解決策: 不足しているカラムを追加
ALTER TABLE urls ADD COLUMN tags JSONB DEFAULT '[]';
```

**確認方法**:

- DB のカラム定義を確認
- Supabase のログを確認（after() 内の console.error は残る）

### ローカル環境で after()が動かない

**症状**: 本番では動くが、ローカルでは動作しない

**確認ポイント**:

- Next.js 15.1 以上か確認
- `next dev` で起動しているか確認
- `npm run dev` 後、別ターミナルでリクエストしているか確認

---

## 注意点

### ローカルと本番の挙動差

after() は Vercel の `waitUntil` を内部で使用しています。ローカル環境では挙動が異なる場合があるため、本番デプロイ後にも動作確認することをお勧めします。

### waitUntil について

`waitUntil(promise)` は、サーバーレス関数の寿命を延長するためのプリミティブです。

通常、サーバーレス関数はレスポンスを返すと即座に終了します。しかし `waitUntil` に Promise を渡すと、その Promise が解決するまで関数の実行を継続できます。

**環境ごとの動作：**

- **Vercel**: `@vercel/functions` パッケージがネイティブに提供
- **ローカル開発（next dev）**: Next.js が内部的に waitUntil 相当の実装を提供
- **セルフホスト（Docker/Node.js）**: 自分で waitUntil 実装を提供する必要あり

つまり、ローカル環境で `after()` が動作するのは、Next.js の開発サーバーが waitUntil の代替実装を内蔵しているためです。本番環境では、Vercel にデプロイすれば自動的に動作し、セルフホストの場合は追加設定が必要になります。

### Fluid Compute の有効化

Vercel の無料プランでも、Fluid Compute を有効にすると実行時間の上限が 60 秒まで延長されます。長時間かかる処理がある場合は、有効化を検討してください。

### 外部 API のタイムアウト

after() 内で外部 API を呼び出す場合、タイムアウト設定を明示的に行うことをお勧めします。API がハングすると、リソースを長時間占有してしまいます。

---

## まとめ

**実装の所要時間目安**: 約 2 時間（DB 設計含む）

**重要ポイント**:

- `after()` を使えば、レスポンス返却後にバックグラウンド処理を実行できる
- ステータス管理（pending → processing → completed/error）で進捗を追跡
- Optimistic Locking とリトライロジックで堅牢な実装に

after() API のおかげで、外部キューやワーカーを使わずに、Next.js + Vercel だけで非同期処理を実現できました。

同じところでつまずいた方の参考になれば幸いです。

---

## 参考リンク

- **Next.js 公式**: [Functions: after | Next.js](https://nextjs.org/docs/app/api-reference/functions/after)
- **Vercel**: [Fluid Compute](https://vercel.com/docs/functions/fluid-compute)
- **解説記事**: [The after() API in Next.js 15.1: A Game-Changer for Background Tasks](https://medium.com/@alamdar.hussain0007/the-after-api-in-next-js-15-1-a-game-changer-for-background-tasks-1a1ffd79684e)
