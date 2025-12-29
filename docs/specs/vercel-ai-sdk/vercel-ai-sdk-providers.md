# Vercel AI SDK 対応プロバイダー詳細仕様

## 概要

Vercel AI SDKは、TypeScript向けの統一AIツールキットで、40+のプロバイダーと数百のモデルを統一的なAPIで利用できます。本ドキュメントは、SwipeSummarizeプロジェクトでの実装に必要な詳細仕様をまとめています。

## 公式プロバイダー一覧

### 1. OpenAI (`@ai-sdk/openai`)

```typescript
import { openai } from '@ai-sdk/openai';

// 最新モデル
const model = openai('gpt-5'); // GPT-5系
const model = openai('o3'); // 推論モデル
const model = openai('gpt-4o'); // GPT-4o系
```

**対応モデル:**
- GPT-5系: `gpt-5`, `gpt-5-mini`, `gpt-5-nano`
- 推論モデル: `o3`, `o3-mini`, `o4-mini`, `o1`, `o1-mini`
- GPT-4o系: `gpt-4o`, `gpt-4o-mini`
- GPT-4系: `gpt-4-turbo`

---

### 2. Azure OpenAI (`@ai-sdk/azure`)

```typescript
import { createAzure } from '@ai-sdk/azure';

const azure = createAzure({
  baseURL: 'https://YOUR_RESOURCE.openai.azure.com',
  apiKey: process.env.AZURE_API_KEY,
  apiVersion: '2024-10-01-preview',
});

const model = azure('YOUR_DEPLOYMENT_NAME');
```

**特徴:**
- エンタープライズグレードのセキュリティ
- VNETサポート
- カスタムデプロイメント名使用

---

### 3. Anthropic (`@ai-sdk/anthropic`)

```typescript
import { anthropic } from '@ai-sdk/anthropic';

const model = anthropic('claude-opus-4-5');
const model = anthropic('claude-sonnet-4-0');
```

**最新モデル:**
- Opus 4系: `claude-opus-4-5`, `claude-opus-4-1`, `claude-opus-4-0`
- Sonnet系: `claude-sonnet-4-0`, `claude-3-7-sonnet-latest`
- Haiku系: `claude-3-5-haiku-latest`

---

### 4. Google Generative AI (`@ai-sdk/google`)

```typescript
import { google } from '@ai-sdk/google';

const model = google('gemini-3-pro-preview');
const model = google('gemini-2.5-flash');
```

**対応モデル:**
- Gemini 3系: `gemini-3-pro-preview`, `gemini-3-flash`
- Gemini 2.5系: `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`
- Gemini 1.5系: `gemini-1.5-pro`, `gemini-1.5-flash`

---

### 5. Google Vertex AI (`@ai-sdk/google-vertex`)

```typescript
import { vertex } from '@ai-sdk/google-vertex';

const model = vertex('gemini-2.5-pro', {
  projectId: 'YOUR_PROJECT_ID',
  location: 'us-central1',
});
```

**エンタープライズ機能:**
- プライベートエンドポイント
- VPCサポート
- 医療向けモデル（MedLM）

---

### 6. Amazon Bedrock (`@ai-sdk/amazon-bedrock`)

```typescript
import { bedrock } from '@ai-sdk/amazon-bedrock';

const model = bedrock('anthropic.claude-sonnet-4-20250115-v1:0', {
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
```

**利用可能モデル:**

| プロバイダー | モデルID例 |
|-------------|-----------|
| Anthropic | `anthropic.claude-sonnet-4-20250115-v1:0` |
| Meta Llama | `meta.llama3-70b-instruct-v1:0` |
| Amazon Nova | `amazon.nova-pro-v1:0`, `amazon.nova-lite-v1:0` |

---

### 7. xAI Grok (`@ai-sdk/xai`)

```typescript
import { xai } from '@ai-sdk/xai';

const model = xai('grok-4');
const model = xai('grok-3-fast');
```

**特徴:**
- Twitter/X統合
- リアルタイム情報アクセス
- 高速推論（grok-3-fast）

---


## 統一API使用例

### 基本的な使用方法

```typescript
import { generateText, streamText } from 'ai';

// テキスト生成
async function generateSummary(provider: any, content: string) {
  const { text, usage } = await generateText({
    model: provider,
    prompt: `要約してください: ${content}`,
    maxTokens: 1000,
    temperature: 0.7,
  });

  console.log('生成されたテキスト:', text);
  console.log('使用トークン:', usage);
  return text;
}

// ストリーミング
async function streamSummary(provider: any, content: string) {
  const { textStream } = await streamText({
    model: provider,
    prompt: `要約してください: ${content}`,
  });

  for await (const chunk of textStream) {
    process.stdout.write(chunk);
  }
}
```

### プロバイダー切り替え

```typescript
// 環境変数でプロバイダーを切り替え
function getModel(provider: string, modelName: string) {
  switch (provider) {
    case 'openai':
      return openai(modelName);
    case 'anthropic':
      return anthropic(modelName);
    case 'google':
      return google(modelName);
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// 使用例
const model = getModel(process.env.LLM_PROVIDER, process.env.LLM_MODEL);
const { text } = await generateText({ model, prompt: 'Hello!' });
```

## コミュニティプロバイダー

| プロバイダー | パッケージ | 用途 |
|-------------|-----------|------|
| Ollama | `ollama-ai-provider` | ローカルLLM実行 |
| OpenRouter | `@openrouter/ai-sdk-provider` | 複数プロバイダールーティング |
| Cloudflare | `@cloudflare/ai-sdk-provider` | エッジ実行 |
| Together AI | `@together-ai/provider` | オープンモデル |
| Perplexity | `@perplexity-ai/sdk` | 検索特化 |

## パフォーマンス比較

| プロバイダー | レイテンシ | コスト | 特徴 |
|-------------|-----------|--------|------|
| OpenAI | 速い | 中〜高 | 高品質・安定 |
| Anthropic | 普通 | 中〜高 | 長文処理に強い |
| Google | 速い | 低〜中 | コスト効率良好 |
| Azure OpenAI | 普通 | 中〜高 | エンタープライズ向け |
| Bedrock | 普通 | 中 | AWSエコシステム統合 |
| Ollama | 環境依存 | 無料 | プライバシー重視 |

## セキュリティ考慮事項

1. **APIキー管理**
   - 環境変数で管理
   - Supabase Vaultで暗号化保存
   - ローカル開発時は`.env.local`使用

2. **データプライバシー**
   - Ollama: データがローカルに留まる
   - Azure/Vertex: エンタープライズ規約
   - その他: プロバイダーのプライバシーポリシー確認

3. **レート制限**
   - 各プロバイダーのレート制限を考慮
   - フォールバック戦略の実装
   - 使用量モニタリング

## 実装推奨事項

1. **プロバイダー優先順位**
   - プライマリ: Azure OpenAI（必須要件）
   - セカンダリ: OpenAI / Anthropic
   - フォールバック: Google
   - ローカル: Ollama

2. **モデル選択基準**
   - 要約タスク: 高速・安価なモデル（Gemini Flash）
   - 高品質要求: GPT-4o、Claude Sonnet
   - コスト優先: Gemini Flash

3. **エラーハンドリング**
   - プロバイダー固有エラーの処理
   - 自動リトライとフォールバック
   - 使用量とコストの追跡