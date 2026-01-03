# Next.js + Vercel での非同期要約処理の実装方法とベストプラクティス

## 背景: サーバーレス環境での長時間処理の課題

Next.js アプリ上で Azure OpenAI（GPT-5）を使った要約処理を行う場合、その API 呼び出しに **約 10 秒程度** かかることがあります。
通常のサーバーレス関数（Vercel Functions）は実行時間に制限があり、無料プランでは約 10 秒、Pro プランでも 60 秒程度が上限です。

2025 年現在は **Fluid Compute** により、無料プランでも最大約 60 秒まで拡張可能になっていますが、それでもユーザー体験の観点から **リクエスト送信後に 10 秒以上待たせる設計は望ましくありません**。

Vercel のサーバーレス関数は短時間処理に最適化されているため、
要約のような比較的時間のかかる処理は **メインのリクエスト処理から切り離し、非同期で実行する設計** が推奨されます。

本記事では、**Next.js 15.1 以降 + Vercel のみ** で完結する
非同期要約処理の設計・実装方法を、コード例と注意点を交えて解説します。

---

## 非同期処理の全体フロー

外部キューやデータベースを極力使わず、Vercel の仕組みだけで完結させる場合の基本フローは以下です。

1. **ユーザーからの入力送信**
   フロントエンドから `/api/submitSummary` に要約対象テキストを POST

2. **ジョブ受付 & 即時応答**
   API でユニークなジョブ ID を発行し、`202 Accepted` を即時返却

3. **バックグラウンドでの要約処理**
   `after()` API を利用し、レスポンス返却後に要約処理を実行

4. **要約結果の保存**
   ジョブ ID と要約結果を一時的に保存（メモリ / ファイル / 必要最小限の永続ストレージ）

5. **クライアント側でポーリング**
   `/api/getSummary?jobId=...` を定期的に呼び出して結果を取得

6. **結果の取得と表示**
   処理完了後、要約結果を画面に反映

---

## バックグラウンド処理の開始方法

### Next.js 15.1 以降: after() API を利用した非同期処理

Next.js 15.1 から、公式に **`after()` API** が提供されています。
これを使うことで、**クライアントへのレスポンス返却後もサーバー側処理を継続**できます。

内部的には Vercel の `waitUntil` を利用しており、
バックグラウンドタスクを安全に実行できる仕組みです。

### 実装例: 要約ジョブ受付 API

```ts
// app/api/submitSummary/route.ts
import { NextResponse, after } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { performSummarization } from "@/lib/summarizer";

export async function POST(request: Request) {
  const { text } = await request.json();
  const jobId = uuidv4();

  globalThis.summaryResults ||= {};
  globalThis.summaryResults[jobId] = { status: "pending" };

  after(async () => {
    try {
      const summary = await performSummarization(text);
      globalThis.summaryResults[jobId] = { status: "done", summary };
    } catch (err) {
      console.error(err);
      globalThis.summaryResults[jobId] = {
        status: "error",
        error: String(err),
      };
    }
  });

  return NextResponse.json({ jobId }, { status: 202 });
}
```

### 補足

- `after()` の利用には **Next.js 15.1 以上** が必須
- **Fluid Compute** を有効にすると実行時間上限をさらに延長可能
- ユーザー体験を損なわずに長時間処理を実行できる

---

## 要約結果の保存とクライアントからの取得

### 結果を一時的に保存する方法

#### 1. グローバル変数（メモリ）に保存

```ts
globalThis.summaryResults[jobId] = {
  status: "done",
  summary,
};
```

- **メリット**: 実装が簡単、外部リソース不要
- **デメリット**: サーバーレス特性上、インスタンス切替で消失する可能性あり

#### 2. 一時ファイル（/tmp）に保存

- `/tmp/{jobId}.json` などに保存
- 同一インスタンス内でのみ有効
- 長期保存には不向き

#### 3. 最小限の永続ストレージ（推奨）

信頼性を重視する場合は以下を検討：

- **Vercel KV（Upstash Redis）**
- **Vercel Postgres**

ジョブ ID → 結果 の Key-Value 形式で十分なため、
コスト・実装負荷ともに最小限で済みます。

---

## ポーリング用 API の実装

```ts
// app/api/getSummary/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  const result = globalThis.summaryResults?.[jobId];

  if (!result) {
    return NextResponse.json({ status: "pending" }, { status: 202 });
  }

  if (result.status === "done") {
    return NextResponse.json(result, { status: 200 });
  }

  if (result.status === "error") {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json({ status: "pending" }, { status: 202 });
}
```

- ポーリング間隔例: 1〜2 秒
- 最大試行回数を設けると安全

---

## 制約・注意点

- **実行時間制限**
  `after()` を使っても関数自体の最大実行時間制限は存在する

- **スケール時の注意**
  メモリ保存は同一インスタンス前提。
  同時実行が増える場合は永続ストレージ必須

- **エラーハンドリング**
  API タイムアウトやネットワークエラーを考慮し、
  `status: error` を返せる設計にする

---

## まとめ: Vercel のみで実現する非同期要約処理

- **即時レスポンス + after() によるバックグラウンド実行**
- **ジョブ ID による非同期トラッキング**
- **ポーリングによる結果取得で UX 向上**
- **規模に応じて保存戦略を切り替え**

Next.js 15.1 以降では、`after()` API により
**外部キューなしでも実用的な非同期処理設計が可能** になりました。

---

## 引用（重複整理済み）

### Vercel / Next.js（公式）

- Is possible configure the timeout limit? · vercel vercel · Discussion #4502 · GitHub
  [https://github.com/vercel/vercel/discussions/4502](https://github.com/vercel/vercel/discussions/4502)

- What can I do about Vercel Functions timing out? | Vercel Knowledge Base
  [https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out)

- Functions: after | Next.js
  [https://nextjs.org/docs/app/api-reference/functions/after](https://nextjs.org/docs/app/api-reference/functions/after)

### Medium

- The after() API in Next.js 15.1: A Game-Changer for Background Tasks
  [https://medium.com/@alamdar.hussain0007/the-after-api-in-next-js-15-1-a-game-changer-for-background-tasks-1a1ffd79684e](https://medium.com/@alamdar.hussain0007/the-after-api-in-next-js-15-1-a-game-changer-for-background-tasks-1a1ffd79684e)

### Reddit

- How do background jobs work in Next.js? : r/nextjs
  [https://www.reddit.com/r/nextjs/comments/10o2v2r/how_do_background_jobs_work_in_nextjs/](https://www.reddit.com/r/nextjs/comments/10o2v2r/how_do_background_jobs_work_in_nextjs/)

### 個人ブログ

- How to Run background jobs on Vercel without a queue
  [https://zackproser.com/blog/how-to-run-background-jobs-on-vercel-without-a-queue](https://zackproser.com/blog/how-to-run-background-jobs-on-vercel-without-a-queue)
