# LLMテストチャット API仕様書

**機能ID**: F-005-TEST-CHAT
**最終更新**: 2024-12-30
**実装ステータス**: 完了

---

## 概要

開発者向けのLLMプロバイダーテスト機能。各プロバイダーのモデルに対して固定プロンプトでテストリクエストを送信し、レスポンスと処理時間を確認できる開発ツール。

**重要**: この機能は開発環境（NODE_ENV=development）でのみ利用可能です。

---

## エンドポイント一覧

| Method | Path | 説明 | 認証 | 環境制限 |
|--------|------|------|------|---------|
| POST | `/api/admin/llm-test` | LLMテスト実行 | なし | 開発環境のみ |

---

## API詳細仕様

### POST `/api/admin/llm-test`

**概要**: LLMプロバイダーに対してテストリクエストを送信

#### リクエスト仕様

**Headers**:
```
Content-Type: application/json
```

**Body Parameters**:

| パラメータ | 型 | 必須 | 制約ルール | 備考 |
|-----------|-----|------|-----------|------|
| provider | string | ✅ | PROVIDERS配列のid値 | プロバイダーID |
| model | string | ✅ | 選択プロバイダーのmodels配列の値 | モデル名 |
| apiKey | string | ※ | 1文字以上 | プロバイダー依存 |
| endpoint | string | - | URL形式 | Azure OpenAI等 |
| deploymentName | string | ※ | 1文字以上 | Azure OpenAI必須 |
| apiVersion | string | ※ | YYYY-MM-DD形式 | Azure OpenAI必須 |
| region | string | ※ | AWS リージョン名 | AWS Bedrock必須 |
| accessKeyId | string | ※ | AKIA形式 | AWS Bedrock必須 |
| secretAccessKey | string | ※ | 1文字以上 | AWS Bedrock必須 |
| projectId | string | ※ | 1文字以上 | Vertex AI必須 |
| location | string | ※ | GCPロケーション名 | Vertex AI必須 |
| maxTokens | number | - | 100-4000 | デフォルト: 1000 |
| temperature | number | - | 0.0-2.0 | デフォルト: 0.7 |

**プロバイダー別必須フィールド**:

| プロバイダー | 必須フィールド |
|-------------|---------------|
| openai | apiKey |
| anthropic | apiKey |
| google | apiKey |
| azure-openai | apiKey, endpoint, deploymentName, apiVersion |
| aws-bedrock | region, accessKeyId, secretAccessKey |
| vertex-ai | projectId, location |
| ollama | なし |

#### レスポンス仕様

**成功時 (200 OK)**:
```json
{
  "success": true,
  "response": "Hello! I'm Claude, an AI assistant created by Anthropic...",
  "processingTime": 1543,
  "provider": "anthropic",
  "model": "claude-3-5-haiku-latest",
  "usage": {
    "inputTokens": 23,
    "outputTokens": 52,
    "totalTokens": 75,
    "estimatedCost": 0.000095
  }
}
```

**エラー時 (400/404/500)**:
```json
{
  "success": false,
  "error": "APIキーが無効です",
  "processingTime": 245,
  "provider": "openai",
  "model": "gpt-4o",
  "details": "401: Invalid authentication credentials"
}
```

#### エラーコード

| HTTPステータス | エラー内容 | 原因 |
|---------------|-----------|------|
| 400 | パラメータ不足 | 必須フィールドが未入力 |
| 400 | 不正なプロバイダー | サポートされていないプロバイダー |
| 404 | 機能制限 | 本番環境でのアクセス |
| 500 | サーバーエラー | 内部処理エラー |

---

## セキュリティ仕様

### アクセス制御
- **環境制限**: NODE_ENV=developmentのみ
- **本番環境**: 404 Not Foundを返却
- **認証**: 不要（開発環境限定のため）

### データ保護
- APIキー等の認証情報はメモリ上でのみ使用
- データベースへの保存なし
- llm_usageテーブルへの記録なし
- セッション終了時に認証情報は破棄

---

## 使用例

### OpenAI GPT-4oテスト
```javascript
const response = await fetch('/api/admin/llm-test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'openai',
    model: 'gpt-4o',
    apiKey: 'sk-proj-xxxxx',
    maxTokens: 1000,
    temperature: 0.7
  })
});

const data = await response.json();
if (data.success) {
  console.log('Response:', data.response);
  console.log('Cost: $', data.usage.estimatedCost.toFixed(6));
}
```

### Azure OpenAIテスト
```javascript
const response = await fetch('/api/admin/llm-test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'azure-openai',
    model: 'gpt-4',
    apiKey: 'xxxxx',
    endpoint: 'https://myresource.openai.azure.com/',
    deploymentName: 'gpt-4-deployment',
    apiVersion: '2024-02-01',
    maxTokens: 1500,
    temperature: 0.5
  })
});
```

---

## テストシナリオ

### 正常系
1. **基本的なテスト実行**: 有効なAPIキーでリクエスト
2. **パラメータ変更**: maxTokens・temperatureの調整

### 異常系
1. **認証エラー**: 無効なAPIキーで実行（401期待）
2. **パラメータ不足**: 必須フィールド省略（400期待）
3. **環境制限**: 本番環境でアクセス（404期待）

---

## 実装履歴

**実装**: Spec `docs/specs/test-chat/` (2024-12-30)

**関連ファイル**:
- `/app/api/admin/llm-test/route.ts` - APIエンドポイント実装
- `/components/admin/llm-test/` - UIコンポーネント
- `/app/admin/dev/test-chat/page.tsx` - テストページ

**関連ドキュメント**:
- [機能要件](../functional_requirements.md) - F-005-TEST-CHAT
- [LLM管理API](llm-admin-apis.md)
- [プロバイダー設定](../operations/llm-monitoring.md)