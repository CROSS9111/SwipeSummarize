# Vercel AI SDK 統合機能 設計書

## 1. 概要

### 1.1 機能 ID

- **機能 ID**: F-001-VERCEL-AI-SDK

### 1.2 機能概要

Vercel AI SDK を使用して 20+の LLM プロバイダーに対応し、統一的なインターフェースで要約生成を行える機能。特に Azure OpenAI（必須）、AWS Bedrock、Google Vertex AI/AI Studio、Anthropic 等の主要プロバイダーをサポート。Next.js に最適化された実装で、ストリーミングレスポンスにも対応。

### 1.3 ユーザーストーリー

- ユーザーとして、複数の LLM プロバイダーから選択して記事要約を生成したい
- ユーザーとして、LLM の使用コストを追跡・確認したい
- ユーザーとして、API レート制限に応じて自動的に別のプロバイダーに切り替えたい
- ユーザーとして、環境に応じた設定を管理したい

### 1.4 前提条件

- Node.js 18 以上
- Supabase プロジェクト設定済み
- 各 LLM プロバイダーのアカウント（必要に応じて）

## 2. API 設計

### 2.1 エンドポイント一覧

| メソッド | パス               | 説明                                 | 認証 |
| -------- | ------------------ | ------------------------------------ | ---- |
| GET      | /api/llm/providers | 利用可能なプロバイダー一覧取得       | 不要 |
| GET      | /api/llm/settings  | 現在の LLM 設定取得                  | 不要 |
| POST     | /api/llm/settings  | LLM 設定の更新                       | 不要 |
| GET      | /api/llm/models    | プロバイダー別モデル一覧取得         | 不要 |
| GET      | /api/llm/usage     | 使用履歴・コスト取得                 | 不要 |
| POST     | /api/llm/test      | 設定のテスト                         | 不要 |
| POST     | /api/summarize     | 要約生成（既存エンドポイントを置換） | 不要 |

### 2.2 API 詳細仕様

#### GET /api/llm/providers

```typescript
// Response
{
  providers: [
    {
      id: "azure-openai",
      name: "Azure OpenAI",
      models: [
        "gpt-5",
        "gpt-5-mini",
        "o3",
        "o3-mini",
        "o1",
        "o1-mini",
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4",
        "gpt-4-turbo",
      ],
      configFields: ["endpoint", "apiKey", "deploymentName", "apiVersion"],
      status: "configured" | "not_configured",
      category: "enterprise",
    },
    {
      id: "bedrock",
      name: "AWS Bedrock",
      models: [
        // Anthropic
        "anthropic.claude-sonnet-4-20250115-v1:0",
        "anthropic.claude-3-haiku-20240307-v1:0",
        // Meta Llama
        "meta.llama3-8b-instruct-v1:0",
        "meta.llama3-70b-instruct-v1:0",
        "meta-llama/Llama-4-Scout-17B-16E-Instruct",
        // Amazon Nova
        "amazon.nova-pro-v1:0",
        "amazon.nova-lite-v1:0",
      ],
      configFields: ["region", "accessKeyId", "secretAccessKey"],
      status: "configured" | "not_configured",
      category: "enterprise",
    },
    {
      id: "openai",
      name: "OpenAI",
      models: [
        "gpt-5",
        "gpt-5-mini",
        "o3",
        "o3-mini",
        "o1",
        "o1-mini",
        "gpt-4o",
        "gpt-4o-mini",
        "gpt-4-turbo",
      ],
      configFields: ["apiKey"],
      status: "configured" | "not_configured",
      category: "standard",
    },
    {
      id: "anthropic",
      name: "Anthropic",
      models: [
        "claude-opus-4-5",
        "claude-opus-4-1",
        "claude-sonnet-4-0",
        "claude-3-7-sonnet-latest",
        "claude-3-5-haiku-latest",
      ],
      configFields: ["apiKey"],
      status: "configured" | "not_configured",
      category: "standard",
    },
    {
      id: "google",
      name: "Google Generative AI",
      models: [
        "gemini-3-pro-preview",
        "gemini-3-flash",
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.0-flash-exp",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
      ],
      configFields: ["apiKey"],
      status: "configured" | "not_configured",
      category: "standard",
    },
    {
      id: "vertex_ai",
      name: "Google Vertex AI",
      models: [
        "gemini-2.5-pro",
        "gemini-2.5-flash",
        "gemini-2.0-flash-exp",
        "gemini-1.5-pro",
        "gemini-1.5-flash",
      ],
      configFields: ["projectId", "location", "credentials"],
      status: "configured" | "not_configured",
      category: "enterprise",
    },
    {
      id: "xai",
      name: "xAI Grok",
      models: [
        "grok-4",
        "grok-3",
        "grok-3-fast",
        "grok-2-1212",
        "grok-2-vision-1212",
      ],
      configFields: ["apiKey"],
      status: "configured" | "not_configured",
      category: "standard",
    },
    {
      id: "ollama",
      name: "Ollama (Local)",
      models: ["llama3", "phi3", "gemma2"],
      configFields: ["baseUrl"],
      status: "configured" | "not_configured",
      category: "local",
    },
  ];
}
```

#### POST /api/llm/settings

```typescript
// Request
{
  provider: "azure-openai",
  model: "gpt-4",
  environment: "local" | "staging" | "production",
  config: {
    endpoint: "https://YOUR_RESOURCE.openai.azure.com/",
    apiKey: "sk-...", // 暗号化してDBに保存
    deploymentName: "gpt-4-deployment",
    apiVersion: "2024-02-15-preview"
  },
  maxTokens: 1000,
  temperature: 0.7
}

// Response
{
  success: true,
  message: "LLM設定を更新しました",
  settingId: "uuid-xxx"
}
```

#### GET /api/llm/usage

```typescript
// Query Parameters
?start_date=2024-01-01&end_date=2024-01-31&provider=azure-openai

// Response
{
  summary: {
    totalRequests: 1543,
    totalTokens: 234567,
    estimatedCost: 12.34, // USD
    period: "2024-01-01 to 2024-01-31"
  },
  daily: [
    {
      date: "2024-01-01",
      requests: 45,
      inputTokens: 12000,
      outputTokens: 3000,
      estimatedCost: 0.45
    }
  ],
  byProvider: {
    "azure-openai": {
      requests: 1200,
      tokens: 200000,
      cost: 10.00
    },
    "gemini": {
      requests: 343,
      tokens: 34567,
      cost: 2.34
    }
  }
}
```

## 3. データモデル・バリデーション

### 3.1 リクエストパラメータ詳細

#### LLM 設定更新

| 項目名      | 型      | 必須 | 制約ルール                                     | 備考             |
| ----------- | ------- | ---- | ---------------------------------------------- | ---------------- |
| provider    | string  | ✅   | Enum: azure-openai, bedrock, gemini, anthropic | プロバイダー ID  |
| model       | string  | ✅   | プロバイダー別の有効モデル                     | モデル名         |
| environment | string  | ✅   | Enum: local, staging, production               | 環境             |
| config      | object  | ✅   | プロバイダー別の必須フィールド                 | 設定オブジェクト |
| maxTokens   | integer | -    | 1-8000                                         | 最大トークン数   |
| temperature | float   | -    | 0.0-1.0                                        | 生成の多様性     |

#### Azure OpenAI 設定

| 項目名         | 型     | 必須 | 制約ルール                  | 備考                 |
| -------------- | ------ | ---- | --------------------------- | -------------------- |
| endpoint       | string | ✅   | URL 形式, https で開始      | Azure エンドポイント |
| apiKey         | string | ✅   | 32 文字以上                 | API キー             |
| deploymentName | string | ✅   | 1-64 文字, 英数字とハイフン | デプロイメント名     |
| apiVersion     | string | ✅   | 日付形式 YYYY-MM-DD-preview | API バージョン       |

## 4. ロジック・権限設計

### 4.1 認証・認可

- **認証**: 不要（シングルユーザーアプリのため）
- **認可**: 全ユーザーが設定変更可能

### 4.2 環境別設定取得ロジック

```typescript
async function getLLMConfig(environment: string) {
  // 1. 環境変数を確認（ローカル開発時優先）
  if (process.env.NODE_ENV === "development" && process.env.LLM_PROVIDER) {
    return getConfigFromEnv();
  }

  // 2. Supabaseから環境別設定を取得
  const { data } = await supabase
    .from("llm_settings")
    .select("*")
    .eq("environment", environment)
    .eq("is_active", true)
    .single();

  if (data) {
    // 3. 暗号化されたAPIキーを復号
    data.config.apiKey = await decrypt(data.config.apiKey);
    return data;
  }

  // 4. デフォルト設定にフォールバック
  return getDefaultConfig();
}
```

### 4.3 コスト計算ロジック

```typescript
const PRICING = {
  openai: {
    "gpt-5": { input: 0.015, output: 0.045 }, // 推定価格
    "gpt-5-mini": { input: 0.007, output: 0.021 },
    o3: { input: 0.1, output: 0.3 }, // 推論モデル（高価格）
    "o3-mini": { input: 0.02, output: 0.06 },
    o1: { input: 0.015, output: 0.06 },
    "o1-mini": { input: 0.003, output: 0.012 },
    "gpt-4o": { input: 0.005, output: 0.015 },
    "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
    "gpt-4-turbo": { input: 0.01, output: 0.03 },
  },
  "azure-openai": {
    // Azure価格は通常OpenAIと同等
    "gpt-5": { input: 0.015, output: 0.045 },
    o3: { input: 0.1, output: 0.3 },
    "gpt-4o": { input: 0.005, output: 0.015 },
    "gpt-4": { input: 0.03, output: 0.06 },
  },
  anthropic: {
    "claude-opus-4-5": { input: 0.015, output: 0.075 },
    "claude-opus-4-1": { input: 0.015, output: 0.075 },
    "claude-sonnet-4-0": { input: 0.003, output: 0.015 },
    "claude-3-7-sonnet-latest": { input: 0.003, output: 0.015 },
    "claude-3-5-haiku-latest": { input: 0.00025, output: 0.00125 },
  },
  bedrock: {
    // Anthropic on Bedrock
    "anthropic.claude-sonnet-4-20250115-v1:0": { input: 0.003, output: 0.015 },
    "anthropic.claude-3-haiku-20240307-v1:0": {
      input: 0.00025,
      output: 0.00125,
    },
    // Meta Llama
    "meta.llama3-70b-instruct-v1:0": { input: 0.00265, output: 0.0035 },
    "meta.llama3-8b-instruct-v1:0": { input: 0.0003, output: 0.0006 },
    // Amazon Nova
    "amazon.nova-pro-v1:0": { input: 0.0008, output: 0.0032 },
    "amazon.nova-lite-v1:0": { input: 0.00012, output: 0.00015 },
  },
  google: {
    "gemini-3-pro-preview": { input: 0.002, output: 0.006 }, // 推定
    "gemini-3-flash": { input: 0.0001, output: 0.0004 },
    "gemini-2.5-pro": { input: 0.00125, output: 0.00375 },
    "gemini-2.5-flash": { input: 0.000075, output: 0.0003 },
    "gemini-1.5-pro": { input: 0.00125, output: 0.00375 },
    "gemini-1.5-flash": { input: 0.000075, output: 0.0003 },
  },
  vertex_ai: {
    // Google Cloud価格（若干高め）
    "gemini-2.5-pro": { input: 0.00125, output: 0.00375 },
    "gemini-2.5-flash": { input: 0.000075, output: 0.0003 },
    "gemini-1.5-pro": { input: 0.00125, output: 0.00375 },
  },
  xai: {
    "grok-4": { input: 0.01, output: 0.03 }, // 推定
    "grok-3": { input: 0.005, output: 0.015 },
    "grok-3-fast": { input: 0.001, output: 0.003 },
  },
  ollama: {
    // ローカル実行のため課金なし
    "*": { input: 0.0, output: 0.0 },
  },
};

function calculateCost(
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
) {
  const pricing = PRICING[provider]?.[model];
  if (!pricing) return 0;

  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  return inputCost + outputCost;
}
```

## 5. データベース設計

### 5.1 テーブル定義

#### llm_settings テーブル

```sql
CREATE TABLE llm_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  environment VARCHAR(20) NOT NULL CHECK (environment IN ('local', 'staging', 'production')),
  config JSONB NOT NULL, -- 暗号化されたAPIキー等を含む
  max_tokens INTEGER DEFAULT 1000,
  temperature FLOAT DEFAULT 0.7,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(environment, is_active) -- 環境ごとに1つのアクティブ設定
);
```

#### llm_usage テーブル

```sql
CREATE TABLE llm_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  environment VARCHAR(20) NOT NULL,
  request_id UUID NOT NULL,
  input_tokens INTEGER NOT NULL,
  output_tokens INTEGER NOT NULL,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  estimated_cost DECIMAL(10, 6), -- USD
  prompt_text TEXT,
  response_text TEXT,
  error_message TEXT,
  status VARCHAR(20) DEFAULT 'success', -- success, error, rate_limited
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_llm_usage_created_at ON llm_usage(created_at DESC);
CREATE INDEX idx_llm_usage_provider ON llm_usage(provider, created_at DESC);
CREATE INDEX idx_llm_usage_environment ON llm_usage(environment, created_at DESC);
```

#### saved テーブルの変更

```sql
ALTER TABLE saved
ADD COLUMN llm_provider VARCHAR(50),
ADD COLUMN llm_model VARCHAR(100),
ADD COLUMN llm_tokens_used INTEGER,
ADD COLUMN llm_cost DECIMAL(10, 6);
```

### 5.2 暗号化関数

```sql
-- 暗号化・復号化用の拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- APIキー暗号化関数
CREATE OR REPLACE FUNCTION encrypt_api_key(api_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(
    encrypt(
      api_key::bytea,
      (SELECT value FROM app_secrets WHERE key = 'encryption_key')::bytea,
      'aes'
    ),
    'base64'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- APIキー復号化関数
CREATE OR REPLACE FUNCTION decrypt_api_key(encrypted_key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN convert_from(
    decrypt(
      decode(encrypted_key, 'base64'),
      (SELECT value FROM app_secrets WHERE key = 'encryption_key')::bytea,
      'aes'
    ),
    'UTF8'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 6. フロントエンド設計

### 6.1 画面構成

#### 設定画面 (/settings/llm)

```tsx
// コンポーネント構造
<LLMSettingsPage>
  <ProviderSelector /> // プロバイダー選択
  <ModelSelector /> // モデル選択
  <ConfigForm /> // プロバイダー別設定フォーム
  <TestConnection /> // 接続テスト
  <UsageStats /> // 使用統計・コスト表示
</LLMSettingsPage>
```

### 6.2 UI コンポーネント

#### ProviderSelector

```tsx
interface ProviderSelectorProps {
  providers: LLMProvider[];
  selected: string;
  onSelect: (providerId: string) => void;
}

// プロバイダーカード表示
// 設定済み/未設定のステータス表示
// 推奨マーク表示（コスト効率が良いもの）
```

#### ConfigForm

```tsx
// プロバイダーごとの動的フォーム生成
// Azure OpenAI: endpoint, apiKey, deploymentName, apiVersion
// AWS Bedrock: region, accessKeyId, secretAccessKey
// Gemini: apiKey
// バリデーション付き入力フィールド
```

#### UsageStats

```tsx
// 月間使用量グラフ（Chart.js/Recharts）
// コスト内訳円グラフ
// プロバイダー別使用率
// 日次トレンドライン
```

### 6.3 状態管理

```typescript
// Zustand Store
interface LLMStore {
  currentProvider: string;
  currentModel: string;
  providers: LLMProvider[];
  settings: LLMSettings | null;
  usage: UsageData | null;

  // Actions
  setProvider: (provider: string) => void;
  setModel: (model: string) => void;
  loadSettings: () => Promise<void>;
  saveSettings: (settings: LLMSettings) => Promise<void>;
  testConnection: () => Promise<boolean>;
  loadUsageStats: (period: DateRange) => Promise<void>;
}
```

## 7. エラーハンドリング

### 7.1 エラーシナリオ

| エラーコード        | シナリオ       | 対処                             |
| ------------------- | -------------- | -------------------------------- |
| LLM_API_KEY_INVALID | API キーが無効 | 設定画面へ誘導                   |
| LLM_RATE_LIMITED    | レート制限到達 | 別プロバイダーへフォールバック   |
| LLM_QUOTA_EXCEEDED  | クォータ超過   | 別プロバイダーへフォールバック   |
| LLM_TIMEOUT         | タイムアウト   | リトライ（最大 3 回）            |
| LLM_CONFIG_MISSING  | 設定未完了     | デフォルト設定使用 or 設定画面へ |

### 7.2 フォールバック戦略

```typescript
async function callLLMWithFallback(prompt: string, primaryProvider: string) {
  const providers = ["azure-openai", "gemini", "bedrock"];
  let lastError = null;

  // プライマリープロバイダーを最初に試行
  const orderedProviders = [
    primaryProvider,
    ...providers.filter((p) => p !== primaryProvider),
  ];

  for (const provider of orderedProviders) {
    try {
      const result = await callLLM(provider, prompt);

      // 使用履歴を記録
      await recordUsage(provider, result);

      return result;
    } catch (error) {
      lastError = error;

      // レート制限の場合は次のプロバイダーへ
      if (error.code === "RATE_LIMITED") {
        continue;
      }

      // その他のエラーはリトライ
      if (error.code !== "API_KEY_INVALID") {
        await wait(1000);
        continue;
      }
    }
  }

  throw lastError;
}
```

## 8. Vercel AI SDK 統合実装

### 8.1 ライブラリインストール

```bash
# Vercel AI SDK Core - 統一API
npm install ai

# 主要プロバイダーパッケージ（必須）
npm install @ai-sdk/openai       # OpenAI
npm install @ai-sdk/azure        # Azure OpenAI
npm install @ai-sdk/anthropic    # Anthropic (Claude)
npm install @ai-sdk/amazon-bedrock  # AWS Bedrock
npm install @ai-sdk/google       # Google Generative AI
npm install @ai-sdk/google-vertex  # Google Vertex AI

# 追加プロバイダーパッケージ（オプション）
npm install @ai-sdk/xai          # xAI Grok
npm install @ai-sdk/deepinfra    # DeepInfra
npm install @ai-sdk/cerebras     # Cerebras
npm install @ai-sdk/fireworks    # Fireworks
npm install @ai-sdk/baseten      # Baseten
npm install @ai-sdk/cohere       # Cohere
npm install @ai-sdk/togetherai   # Together AI
npm install @ai-sdk/perplexity   # Perplexity

# ローカル実行/オープンソース
npm install ollama-ai-provider   # Ollama（ローカル）
```

### 8.2 統一インターフェース（Vercel AI SDK 実装）

```typescript
// lib/llm/client.ts
import { generateText, streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { bedrock } from "@ai-sdk/amazon-bedrock";
import { google } from "@ai-sdk/google";
import { vertex } from "@ai-sdk/google-vertex";
import { createAzure } from "@ai-sdk/azure";
import { createOllama } from "ollama-ai-provider";

export interface LLMConfig {
  provider: string;
  model: string;
  environment: "local" | "staging" | "production";
  apiKey?: string;
  endpoint?: string;
  maxTokens?: number;
  temperature?: number;
  // Azure特有
  deploymentName?: string;
  apiVersion?: string;
  // AWS特有
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  // Vertex AI特有
  projectId?: string;
  location?: string;
}

export class LLMClient {
  private model: any;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.model = this.initializeModel(config);
  }

  private initializeModel(config: LLMConfig) {
    switch (config.provider) {
      case "azure-openai":
      case "azure":
        const azure = createAzure({
          baseURL: config.endpoint,
          apiKey: config.apiKey,
          apiVersion: config.apiVersion,
        });
        return azure(config.deploymentName || config.model);

      case "openai":
        return openai(config.model, {
          apiKey: config.apiKey,
        });

      case "bedrock":
      case "amazon-bedrock":
        return bedrock(config.model, {
          region: config.region,
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        });

      case "anthropic":
        return anthropic(config.model, {
          apiKey: config.apiKey,
        });

      case "google":
        return google(config.model, {
          apiKey: config.apiKey,
        });

      case "vertex_ai":
      case "google-vertex":
        return vertex(config.model, {
          projectId: config.projectId,
          location: config.location,
        });

      case "xai":
        // xAI Grok用の設定（@ai-sdk/xaiを使用）
        const { xai } = await import("@ai-sdk/xai");
        return xai(config.model, {
          apiKey: config.apiKey,
        });

      case "ollama":
        const ollama = createOllama({
          baseUrl: config.endpoint || "http://localhost:11434",
        });
        return ollama(config.model);

      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  async summarize(content: string): Promise<SummaryResult> {
    const prompt = this.buildPrompt(content);

    try {
      const { text, usage } = await generateText({
        model: this.model,
        prompt: prompt,
        maxTokens: this.config.maxTokens || 1000,
        temperature: this.config.temperature || 0.7,
      });

      // 使用量をデータベースに記録
      await this.recordUsage(usage);

      return {
        summary: text,
        usage: {
          inputTokens: usage.promptTokens,
          outputTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
        },
        provider: this.config.provider,
        model: this.config.model,
      };
    } catch (error) {
      console.error(`LLM Error (${this.config.provider}):`, error);
      throw error;
    }
  }

  async summarizeStream(content: string) {
    const prompt = this.buildPrompt(content);

    const { textStream, usage } = await streamText({
      model: this.model,
      prompt: prompt,
      maxTokens: this.config.maxTokens || 1000,
      temperature: this.config.temperature || 0.7,
    });

    return { textStream, usage };
  }

  private buildPrompt(content: string): string {
    return `以下の記事を日本語で3〜5文に要約してください。
重要なポイントを箇条書きではなく、自然な文章でまとめてください。

本文:
${content.slice(0, 10000)}`;
  }

  private async recordUsage(usage: any) {
    // Supabaseに使用履歴を記録
    const cost = this.calculateCost(usage.promptTokens, usage.completionTokens);

    await supabase.from("llm_usage").insert({
      provider: this.config.provider,
      model: this.config.model,
      environment: this.config.environment,
      input_tokens: usage.promptTokens,
      output_tokens: usage.completionTokens,
      estimated_cost: cost,
      status: "success",
    });
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    // PRICINGオブジェクトから料金を計算
    const pricing = PRICING[this.config.provider]?.[this.config.model];
    if (!pricing) return 0;

    return (
      (inputTokens / 1000) * pricing.input +
      (outputTokens / 1000) * pricing.output
    );
  }
}
```

### 8.3 API Route 実装例

```typescript
// app/api/summarize/route.ts
import { LLMClient } from "@/lib/llm/client";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { content, url } = await request.json();

  // 現在の環境を取得
  const environment =
    process.env.NODE_ENV === "production"
      ? "production"
      : process.env.NODE_ENV === "staging"
      ? "staging"
      : "local";

  // 設定を取得
  const config = await getLLMConfig(environment);

  // LLMクライアントを初期化
  const llm = new LLMClient(config);

  try {
    // 要約を生成
    const result = await llm.summarize(content);

    // savedテーブルに保存時はプロバイダー情報も記録
    const supabase = await createClient();
    await supabase.from("saved").insert({
      title: "Article Title",
      summary: result.summary,
      original_url: url,
      llm_provider: result.provider,
      llm_model: result.model,
      llm_tokens_used: result.usage.totalTokens,
      llm_cost: result.usage.estimatedCost,
    });

    return Response.json(result);
  } catch (error) {
    // フォールバック処理
    return handleLLMError(error, content);
  }
}

async function getLLMConfig(environment: string) {
  // ローカル開発時は環境変数を優先
  if (environment === "local" && process.env.LLM_PROVIDER) {
    return {
      provider: process.env.LLM_PROVIDER,
      model: process.env.LLM_MODEL,
      apiKey: process.env.LLM_API_KEY,
      environment: "local",
      // Azure特有
      endpoint: process.env.AZURE_ENDPOINT,
      deploymentName: process.env.AZURE_DEPLOYMENT,
      apiVersion: process.env.AZURE_API_VERSION,
      // AWS特有
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  // Supabaseから設定を取得
  const supabase = await createClient();
  const { data } = await supabase
    .from("llm_settings")
    .select("*")
    .eq("environment", environment)
    .eq("is_active", true)
    .single();

  return data;
}
```

## 9. テストケース

### 9.1 ユースケース & テストシナリオ

| ID    | シナリオ概要                         | アクター | 前提条件                 | 操作手順 / 入力データ                                                                                                 | 期待される挙動 / レスポンス                              | 検証すべき副作用                        |
| ----- | ------------------------------------ | -------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------- |
| UC-01 | [正常系] Azure OpenAI 設定・要約生成 | User     | 有効な API キー          | 1. /settings/llm へアクセス<br>2. Azure OpenAI を選択<br>3. 設定入力・保存<br>4. テスト実行<br>5. 記事 URL で要約生成 | ・設定保存成功<br>・テスト成功<br>・要約生成成功         | llm_settings に保存<br>llm_usage に記録 |
| UC-02 | [正常系] プロバイダー切り替え        | User     | 複数プロバイダー設定済み | 1. Gemini で要約生成<br>2. Azure OpenAI に切り替え<br>3. 同じ URL で要約生成                                          | ・切り替え成功<br>・異なるプロバイダーで要約生成         | llm_settings の is_active 更新          |
| UC-03 | [異常系] 無効な API キー             | User     | -                        | 1. 無効な API キー入力<br>2. テスト実行                                                                               | ・エラーメッセージ表示<br>・"API キーが無効です"         | エラーログ記録                          |
| UC-04 | [異常系] レート制限                  | User     | レート制限到達           | 1. 大量リクエスト送信<br>2. レート制限エラー発生                                                                      | ・自動的に別プロバイダーへ切替<br>・要約生成継続         | llm_usage に status='rate_limited'記録  |
| UC-05 | [境界値] 最大トークン数              | User     | -                        | 1. 10000 文字の長文記事<br>2. maxTokens=100 で要約                                                                    | ・100 トークン以内の要約生成<br>・切り詰め警告表示       | トークン数正確に記録                    |
| UC-06 | [正常系] コスト追跡確認              | User     | 使用履歴あり             | 1. /settings/llm の統計タブ<br>2. 月間レポート表示                                                                    | ・グラフ表示<br>・コスト計算正確<br>・プロバイダー別内訳 | なし                                    |
| UC-07 | [正常系] 環境別設定                  | Admin    | -                        | 1. NODE_ENV=production<br>2. 本番用設定取得                                                                           | ・本番環境の設定を使用<br>・ローカル設定は無視           | なし                                    |
| UC-08 | [異常系] Bedrock 認証エラー          | User     | AWS 認証情報不正         | 1. 無効な AWS 認証情報<br>2. Bedrock 使用試行                                                                         | ・認証エラー表示<br>・他プロバイダーへフォールバック     | エラーログ記録                          |

## 10. 実装優先順位

### Phase 1: 基本実装（MVP）

1. データベーステーブル作成
2. Vercel AI SDK 基本統合（Gemini 置換）
3. Azure OpenAI 対応
4. 環境別設定機能

### Phase 2: UI 実装

1. 設定画面作成
2. プロバイダー切り替え UI
3. 接続テスト機能

### Phase 3: 高度な機能

1. AWS Bedrock 対応
2. コスト追跡・統計表示
3. 自動フォールバック機能
4. 詳細なエラーハンドリング

## 11. 実装メモ

### 注意事項

- API キーは必ず暗号化して DB に保存
- ローカル開発時は.env.local を優先
- レート制限対策として複数プロバイダー設定を推奨
- コスト計算は推定値（実際の請求と異なる可能性あり）

### 環境変数例（.env.local）

```env
# ローカル開発用
NODE_ENV=development
LLM_PROVIDER=azure-openai
AZURE_OPENAI_ENDPOINT=https://YOUR_RESOURCE.openai.azure.com/
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_DEPLOYMENT=gpt-4-deployment
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# 暗号化キー（Supabase Vault使用推奨）
ENCRYPTION_KEY=your-32-byte-encryption-key
```

### 移行計画

1. 既存の gemini.ts を llm/client.ts に置換
2. /api/urls/random の summarize 処理を更新
3. 既存の GEMINI_API_KEY 環境変数は残す（後方互換性）
4. 段階的に Vercel AI SDK へ移行

## 12. 昇格チェックリスト

- [ ] 機能要件を`docs/functional_requirements.md`へ追加
- [ ] API 仕様を`docs/api/llm_apis.md`として作成
- [ ] DB 設計を`docs/database/schema/llm_tables.sql`へ
- [ ] テストケースを`docs/testing/llm/`へ
- [ ] セキュリティ考慮事項を`docs/security/`へ追記
