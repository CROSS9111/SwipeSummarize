# LLM管理API仕様

## 概要

SwipeSummarizeアプリケーションのLLM高度機能を管理するためのREST API仕様書です。フォールバック設定、A/Bテスト、バックアップ/リストア、アラート管理の全てのエンドポイントを説明します。

## 認証

全ての管理API は今後の実装でBearer Token認証が必要となります。現在は開発段階のため認証は無効化されています。

```http
Authorization: Bearer <token>
```

## エラーレスポンス形式

全てのAPIエラーは統一された形式でレスポンスします：

```json
{
  "error": "エラーメッセージ",
  "code": "ERROR_CODE",
  "timestamp": "2024-12-29T10:00:00Z",
  "path": "/api/admin/..."
}
```

### HTTPステータスコード
- `200` - 成功
- `201` - リソース作成成功
- `400` - リクエストエラー
- `401` - 認証エラー
- `403` - 権限エラー
- `404` - リソースが見つからない
- `500` - サーバーエラー

---

## 1. フォールバック管理API

### 1.1 フォールバック設定取得

```http
GET /api/admin/llm-fallback?environment={environment}
```

#### パラメータ
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| environment | string | false | 環境名 (`local`, `staging`, `production`) デフォルト: `local` |

#### レスポンス
```json
{
  "config": {
    "id": "uuid",
    "environment": "production",
    "primary_provider": "google",
    "primary_model": "gemini-1.5-flash",
    "fallback_providers": [
      {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "priority": 1
      }
    ],
    "max_retries": 3,
    "retry_delay": 1000,
    "circuit_breaker_threshold": 5,
    "circuit_breaker_reset_time": 60000,
    "is_active": true,
    "created_at": "2024-12-29T10:00:00Z",
    "updated_at": "2024-12-29T10:00:00Z"
  },
  "hasConfig": true
}
```

### 1.2 フォールバック設定作成・更新

```http
POST /api/admin/llm-fallback
```

#### リクエストボディ
```json
{
  "environment": "production",
  "primaryProvider": "google",
  "primaryModel": "gemini-1.5-flash",
  "fallbackProviders": [
    {
      "provider": "openai",
      "model": "gpt-4o-mini",
      "priority": 1
    },
    {
      "provider": "anthropic",
      "model": "claude-3-haiku",
      "priority": 2
    }
  ],
  "maxRetries": 3,
  "retryDelay": 1000,
  "circuitBreakerThreshold": 5,
  "circuitBreakerResetTime": 60000,
  "isActive": true
}
```

#### バリデーション
- `primaryProvider`, `primaryModel` は必須
- `maxRetries` は1以上10以下
- `circuitBreakerThreshold` は1以上20以下
- `fallbackProviders` は配列で、各要素に `provider`, `model`, `priority` が必要

### 1.3 フォールバックログ取得

```http
PATCH /api/admin/llm-fallback?environment={environment}&limit={limit}
```

#### パラメータ
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| environment | string | false | 環境名 |
| limit | integer | false | 取得件数 (デフォルト: 100, 最大: 1000) |

#### レスポンス
```json
{
  "logs": [
    {
      "id": "uuid",
      "primary_provider": "google",
      "primary_model": "gemini-1.5-flash",
      "used_provider": "openai",
      "used_model": "gpt-4o-mini",
      "attempted_providers": ["google:gemini-1.5-flash", "openai:gpt-4o-mini"],
      "success": true,
      "error_message": null,
      "environment": "production",
      "created_at": "2024-12-29T10:00:00Z"
    }
  ],
  "stats": {
    "totalAttempts": 1250,
    "successRate": 98.5,
    "fallbackUsageRate": 15.2,
    "avgAttemptsPerRequest": 1.18,
    "topFailureReasons": [
      {"reason": "Rate limit exceeded", "count": 12},
      {"reason": "Service unavailable", "count": 8}
    ],
    "providerReliability": {
      "google:gemini-1.5-flash": 95.5,
      "openai:gpt-4o-mini": 98.2
    }
  }
}
```

---

## 2. A/Bテスト管理API

### 2.1 A/Bテスト一覧取得

```http
GET /api/admin/ab-tests?environment={environment}&include_inactive={boolean}
```

#### パラメータ
| パラメータ | 型 | 必須 | 説明 |
|----------|---|------|------|
| environment | string | false | 環境名 |
| include_inactive | boolean | false | 非アクティブテストも含む (デフォルト: false) |

#### レスポンス
```json
{
  "tests": [
    {
      "id": "uuid",
      "name": "コスト最適化テスト",
      "description": "Gemini vs GPT-4o Mini 比較",
      "environment": "production",
      "variants": [
        {
          "id": "variant_a",
          "name": "Gemini Flash",
          "config": {"provider": "google", "model": "gemini-1.5-flash"},
          "weight": 50
        }
      ],
      "traffic_split": {"variant_a": 50, "variant_b": 50},
      "start_date": "2024-12-29T00:00:00Z",
      "end_date": "2025-01-28T23:59:59Z",
      "is_active": true,
      "metrics": {
        "primaryMetric": "cost",
        "trackMetrics": ["cost", "speed", "success_rate"],
        "sampleSize": 1000,
        "confidenceLevel": 95
      },
      "created_at": "2024-12-29T10:00:00Z",
      "updated_at": "2024-12-29T10:00:00Z"
    }
  ]
}
```

### 2.2 A/Bテスト作成

```http
POST /api/admin/ab-tests
```

#### リクエストボディ
```json
{
  "name": "新しいA/Bテスト",
  "description": "テストの説明",
  "environment": "production",
  "variants": [
    {
      "id": "variant_a",
      "name": "バリアントA",
      "config": {
        "provider": "google",
        "model": "gemini-1.5-flash",
        "temperature": 0.7,
        "maxTokens": 1000
      },
      "weight": 50
    },
    {
      "id": "variant_b",
      "name": "バリアントB",
      "config": {
        "provider": "openai",
        "model": "gpt-4o-mini",
        "temperature": 0.7,
        "maxTokens": 1000
      },
      "weight": 50
    }
  ],
  "trafficSplit": {
    "variant_a": 50,
    "variant_b": 50
  },
  "startDate": "2024-12-29T00:00:00Z",
  "endDate": "2025-01-28T23:59:59Z",
  "isActive": true,
  "metrics": {
    "primaryMetric": "cost",
    "trackMetrics": ["cost", "speed", "success_rate", "quality"],
    "sampleSize": 1000,
    "confidenceLevel": 95
  }
}
```

#### バリデーション
- `name` は必須、1-100文字
- `variants` は2-10個、重みの合計は100%
- `startDate` は未来の日時
- `confidenceLevel` は90, 95, 99のいずれか

### 2.3 A/Bテスト更新

```http
PUT /api/admin/ab-tests
```

### 2.4 A/Bテスト削除

```http
DELETE /api/admin/ab-tests?id={test_id}
```

### 2.5 A/Bテスト分析

```http
GET /api/admin/ab-tests/{test_id}/analysis
```

#### レスポンス
```json
{
  "testId": "uuid",
  "variantStats": {
    "variant_a": {
      "variantId": "variant_a",
      "sampleSize": 523,
      "avgCost": 0.00245,
      "avgProcessingTime": 1250,
      "avgTokens": 850,
      "successRate": 98.5
    },
    "variant_b": {
      "variantId": "variant_b",
      "sampleSize": 477,
      "avgCost": 0.00380,
      "avgProcessingTime": 980,
      "avgTokens": 720,
      "successRate": 99.1
    }
  },
  "significance": {
    "isSignificant": true,
    "pValue": 0.023,
    "confidenceLevel": 97.7
  },
  "recommendation": "バリアント variant_a が最も優秀です。約35.3%のコスト削減が期待できます。",
  "sampleSize": 1000,
  "dataCollectedAt": "2024-12-29T10:00:00Z"
}
```

---

## 3. バックアップ管理API

### 3.1 バックアップ作成

```http
POST /api/admin/backup
```

#### リクエストボディ
```json
{
  "environment": "production",
  "options": {
    "includeUsageData": true,
    "includeAbTests": true,
    "includeFallbackConfigs": true,
    "dateRange": {
      "start": "2024-12-22T00:00:00Z",
      "end": "2024-12-29T23:59:59Z"
    },
    "maxUsageRecords": 10000
  },
  "creator": "admin@example.com",
  "description": "定期メンテナンス前のバックアップ"
}
```

#### レスポンス
```json
{
  "backup": {
    "version": "1.0.0",
    "timestamp": "2024-12-29T10:00:00Z",
    "environment": "production",
    "metadata": {
      "creator": "admin@example.com",
      "description": "定期メンテナンス前のバックアップ",
      "dataSize": 2048576,
      "hash": "a1b2c3d4e5f6..."
    }
  },
  "id": "backup-uuid"
}
```

### 3.2 バックアップ一覧取得

```http
GET /api/admin/backup?environment={environment}&limit={limit}
```

#### レスポンス
```json
{
  "backups": [
    {
      "id": "uuid",
      "environment": "production",
      "createdAt": "2024-12-29T10:00:00Z",
      "creator": "admin@example.com",
      "description": "定期メンテナンス前のバックアップ",
      "dataSize": 2048576,
      "status": "completed"
    }
  ]
}
```

### 3.3 バックアップリストア

```http
POST /api/admin/backup/{backup_id}/restore
```

#### リクエストボディ
```json
{
  "options": {
    "overwriteExisting": true,
    "validateBeforeRestore": true,
    "dryRun": false
  }
}
```

#### レスポンス
```json
{
  "success": true,
  "report": {
    "llmSettings": {
      "restored": 5,
      "skipped": 1,
      "errors": []
    },
    "fallbackConfigs": {
      "restored": 2,
      "skipped": 0,
      "errors": []
    },
    "abTests": {
      "restored": 3,
      "skipped": 1,
      "errors": ["テストID重複エラー"]
    },
    "usageStats": {
      "restored": 1000,
      "skipped": 0,
      "errors": []
    }
  }
}
```

---

## 4. アラート管理API

### 4.1 アラートルール作成

```http
POST /api/admin/alerts
```

#### リクエストボディ
```json
{
  "name": "高コスト閾値アラート",
  "description": "1時間のコストが$10を超えた場合",
  "environment": "production",
  "type": "cost_threshold",
  "conditions": [
    {
      "metric": "total_cost",
      "operator": "gt",
      "value": 10.0,
      "timeWindow": 60,
      "aggregation": "sum"
    }
  ],
  "actions": [
    {
      "type": "slack",
      "config": {
        "webhookUrl": "https://hooks.slack.com/services/...",
        "channel": "#alerts"
      }
    },
    {
      "type": "email",
      "config": {
        "to": ["admin@example.com"],
        "subject": "LLMコスト閾値超過"
      }
    }
  ],
  "isActive": true,
  "frequency": "immediate"
}
```

#### アラート種類
- `cost_threshold` - コスト閾値
- `error_rate` - エラー率
- `response_time` - 応答時間
- `success_rate` - 成功率
- `token_usage` - トークン使用量
- `provider_failure` - プロバイダー障害
- `circuit_breaker` - サーキットブレーカー
- `quota_exceeded` - クォータ超過

#### 演算子
- `gt` - より大きい
- `gte` - 以上
- `lt` - より小さい
- `lte` - 以下
- `eq` - 等しい
- `neq` - 等しくない

### 4.2 アラートルール一覧取得

```http
GET /api/admin/alerts?environment={environment}
```

### 4.3 アラート手動チェック

```http
POST /api/admin/alerts/check
```

#### レスポンス
```json
{
  "triggeredAlerts": [
    {
      "id": "uuid",
      "ruleId": "rule-uuid",
      "ruleName": "高コスト閾値アラート",
      "severity": "high",
      "message": "コスト閾値を超過しました: ¥12.45 (production環境)",
      "details": {
        "metrics": {"total_cost": 12.45},
        "environment": "production"
      },
      "triggeredAt": "2024-12-29T10:00:00Z",
      "status": "active"
    }
  ],
  "checkedRules": 5,
  "executionTime": "0.234s"
}
```

### 4.4 アラートイベント取得

```http
GET /api/admin/alerts/events?environment={environment}&limit={limit}
```

---

## 5. 統合API使用例

### シナリオ: 本番環境への新プロバイダー導入

#### 1. 現在の設定バックアップ
```bash
curl -X POST /api/admin/backup \
  -H "Content-Type: application/json" \
  -d '{
    "environment": "production",
    "options": {"includeUsageData": false},
    "creator": "admin@example.com",
    "description": "新プロバイダー導入前バックアップ"
  }'
```

#### 2. A/Bテスト設定
```bash
curl -X POST /api/admin/ab-tests \
  -H "Content-Type: application/json" \
  -d '{
    "name": "新プロバイダー検証",
    "variants": [...],
    "environment": "production"
  }'
```

#### 3. フォールバック設定更新
```bash
curl -X POST /api/admin/llm-fallback \
  -H "Content-Type: application/json" \
  -d '{
    "primaryProvider": "new-provider",
    "fallbackProviders": [{"provider": "google", "model": "gemini-1.5-flash"}]
  }'
```

#### 4. アラート設定
```bash
curl -X POST /api/admin/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "name": "新プロバイダー障害監視",
    "type": "provider_failure",
    "environment": "production"
  }'
```

## 6. レート制限

全ての管理APIには以下のレート制限が適用されます：

- **一般API**: 100リクエスト/分
- **バックアップ作成**: 5リクエスト/時間
- **リストア実行**: 2リクエスト/時間
- **アラート手動チェック**: 10リクエスト/分

制限を超えた場合は`429 Too Many Requests`が返されます。

## 7. 監査ログ

全ての管理操作は監査ログに記録されます：

```json
{
  "timestamp": "2024-12-29T10:00:00Z",
  "user": "admin@example.com",
  "action": "CREATE_AB_TEST",
  "resource": "ab-test:uuid",
  "environment": "production",
  "details": {"test_name": "新しいテスト"},
  "ip_address": "192.168.1.1"
}
```

---

この API 仕様書は実装されたLLM高度機能の完全な技術リファレンスです。各エンドポイントの実装詳細は対応するソースコードを参照してください。