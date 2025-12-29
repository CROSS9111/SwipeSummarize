# LLM API 仕様書

## 概要

Vercel AI SDK を使用した LLM プロバイダー統合の API 仕様。複数の LLM プロバイダーを統一的なインターフェースで利用可能。

## エンドポイント一覧

| メソッド | パス               | 説明                                 | 認証 |
| -------- | ------------------ | ------------------------------------ | ---- |
| GET      | /api/llm/providers | 利用可能なプロバイダー一覧取得       | 不要 |
| GET      | /api/llm/settings  | 現在の LLM 設定取得                  | 不要 |
| POST     | /api/llm/settings  | LLM 設定の更新                       | 不要 |
| GET      | /api/llm/models    | プロバイダー別モデル一覧取得         | 不要 |
| GET      | /api/llm/usage     | 使用履歴・コスト取得                 | 不要 |
| POST     | /api/llm/test      | 設定のテスト                         | 不要 |
| POST     | /api/summarize     | 要約生成（既存エンドポイントを置換） | 不要 |

## API 詳細

### GET /api/llm/providers

利用可能な LLM プロバイダーの一覧を取得します。

#### レスポンス

```typescript
{
  providers: Array<{
    id: string;                // プロバイダーID
    name: string;               // 表示名
    models: string[];           // 利用可能なモデル
    configFields: string[];     // 必要な設定項目
    status: "configured" | "not_configured";
    category: "enterprise" | "standard" | "local";
  }>
}
```

#### レスポンス例

```json
{
  "providers": [
    {
      "id": "azure-openai",
      "name": "Azure OpenAI",
      "models": ["gpt-5", "gpt-5-mini", "o3", "gpt-4o", "gpt-4"],
      "configFields": ["endpoint", "apiKey", "deploymentName", "apiVersion"],
      "status": "configured",
      "category": "enterprise"
    },
    {
      "id": "openai",
      "name": "OpenAI",
      "models": ["gpt-5", "o3", "gpt-4o", "gpt-4-turbo"],
      "configFields": ["apiKey"],
      "status": "not_configured",
      "category": "standard"
    }
  ]
}
```

---

### POST /api/llm/settings

LLM プロバイダーの設定を更新します。

#### リクエスト

```typescript
{
  provider: string;           // プロバイダーID
  model: string;              // モデル名
  environment: "local" | "staging" | "production";
  config: {
    // プロバイダー固有の設定
    endpoint?: string;        // Azure/Ollama用
    apiKey?: string;          // APIキー（暗号化して保存）
    deploymentName?: string;  // Azure用
    apiVersion?: string;      // Azure用
    region?: string;          // AWS用
    accessKeyId?: string;     // AWS用
    secretAccessKey?: string; // AWS用
    projectId?: string;       // Vertex AI用
    location?: string;        // Vertex AI用
  };
  maxTokens?: number;         // 最大トークン数（1-8000）
  temperature?: number;       // 生成の多様性（0.0-1.0）
}
```

#### レスポンス

```json
{
  "success": true,
  "message": "LLM設定を更新しました",
  "settingId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### エラーレスポンス

```json
{
  "success": false,
  "error": "API_KEY_INVALID",
  "message": "APIキーが無効です"
}
```

---

### GET /api/llm/settings

現在アクティブな LLM 設定を取得します。

#### クエリパラメータ

| パラメータ  | 型     | 必須 | 説明                              |
| ----------- | ------ | ---- | --------------------------------- |
| environment | string | いいえ | 環境指定（デフォルト: 現在の環境） |

#### レスポンス

```json
{
  "provider": "azure-openai",
  "model": "gpt-4",
  "environment": "production",
  "maxTokens": 1000,
  "temperature": 0.7,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

### GET /api/llm/models

指定プロバイダーで利用可能なモデル一覧を取得します。

#### クエリパラメータ

| パラメータ | 型     | 必須   | 説明            |
| ---------- | ------ | ------ | --------------- |
| provider   | string | はい   | プロバイダー ID |

#### レスポンス

```json
{
  "provider": "openai",
  "models": [
    {
      "id": "gpt-5",
      "name": "GPT-5",
      "description": "最新の大規模言語モデル",
      "contextLength": 128000,
      "pricing": {
        "input": 0.015,
        "output": 0.045
      }
    }
  ]
}
```

---

### GET /api/llm/usage

LLM の使用履歴とコスト情報を取得します。

#### クエリパラメータ

| パラメータ | 型     | 必須   | 説明                  |
| ---------- | ------ | ------ | --------------------- |
| start_date | string | いいえ | 開始日（YYYY-MM-DD）  |
| end_date   | string | いいえ | 終了日（YYYY-MM-DD）  |
| provider   | string | いいえ | プロバイダー ID       |

#### レスポンス

```json
{
  "summary": {
    "totalRequests": 1543,
    "totalTokens": 234567,
    "estimatedCost": 12.34,
    "period": "2024-01-01 to 2024-01-31"
  },
  "daily": [
    {
      "date": "2024-01-01",
      "requests": 45,
      "inputTokens": 12000,
      "outputTokens": 3000,
      "estimatedCost": 0.45
    }
  ],
  "byProvider": {
    "azure-openai": {
      "requests": 1200,
      "tokens": 200000,
      "cost": 10.00
    }
  }
}
```

---

### POST /api/llm/test

LLM 設定の接続テストを実行します。

#### リクエスト

```json
{
  "provider": "azure-openai",
  "config": {
    "endpoint": "https://resource.openai.azure.com",
    "apiKey": "sk-...",
    "deploymentName": "gpt-4",
    "apiVersion": "2024-02-15-preview"
  }
}
```

#### レスポンス

```json
{
  "success": true,
  "message": "接続テストに成功しました",
  "responseTime": 523,
  "model": "gpt-4"
}
```

---

### POST /api/summarize

記事の要約を生成します（メインエンドポイント）。

#### リクエスト

```json
{
  "url": "https://example.com/article",
  "content": "記事の本文（Jina Reader API経由で取得済みの場合）",
  "provider": "auto",  // 省略時は環境設定のデフォルトを使用
  "options": {
    "maxTokens": 500,
    "temperature": 0.7
  }
}
```

#### レスポンス

```json
{
  "summary": "この記事は、人工知能の最新動向について説明しています。特に大規模言語モデルの進化と、それが社会に与える影響について詳しく解説されています。",
  "metadata": {
    "provider": "azure-openai",
    "model": "gpt-4",
    "tokensUsed": {
      "input": 2500,
      "output": 150,
      "total": 2650
    },
    "estimatedCost": 0.08,
    "processingTime": 1234
  }
}
```

---

## エラーコード

| コード              | HTTP ステータス | 説明                           |
| ------------------- | --------------- | ------------------------------ |
| API_KEY_INVALID     | 401             | API キーが無効                 |
| RATE_LIMITED        | 429             | レート制限に到達               |
| QUOTA_EXCEEDED      | 402             | 利用クォータを超過             |
| MODEL_NOT_AVAILABLE | 404             | 指定モデルが利用不可           |
| TIMEOUT             | 504             | リクエストタイムアウト         |
| CONFIG_MISSING      | 400             | 必要な設定が不足               |
| PROVIDER_ERROR      | 500             | プロバイダー側のエラー         |

---

## レート制限

- デフォルト: 100 リクエスト/分
- 各プロバイダーの制限に準拠
- 自動フォールバック機能あり

---

## セキュリティ

### API キー管理
- 環境変数または暗号化して DB 保存
- Supabase Vault 使用推奨
- クライアントサイドには露出しない

### データ保護
- HTTPS 通信必須
- API キーの暗号化（AES-256）
- アクセスログの記録

---

## 実装例

### TypeScript クライアント

```typescript
// LLM設定を更新
async function updateLLMSettings() {
  const response = await fetch('/api/llm/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: 'azure-openai',
      model: 'gpt-4',
      environment: 'production',
      config: {
        endpoint: process.env.AZURE_ENDPOINT,
        apiKey: process.env.AZURE_API_KEY,
        deploymentName: 'gpt-4-prod',
        apiVersion: '2024-02-15-preview'
      }
    })
  });

  return response.json();
}

// 要約を生成
async function generateSummary(url: string) {
  const response = await fetch('/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });

  const data = await response.json();
  console.log('要約:', data.summary);
  console.log('コスト:', data.metadata.estimatedCost);
}
```