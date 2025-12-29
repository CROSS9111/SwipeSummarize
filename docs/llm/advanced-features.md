# LLM高度機能ガイド

## 概要

SwipeSummarizeアプリケーションのPhase 3で実装されたLLM高度機能について説明します。これらの機能により、複数のLLMプロバイダー間での自動フォールバック、A/Bテスト、設定のバックアップ/リストア、包括的なアラート通知システムが提供されます。

## 実装された機能

### 1. プロバイダー自動切り替え機能（Fallback System）

#### 概要
メインのLLMプロバイダーが利用できない場合に、自動的に代替プロバイダーに切り替える機能です。サーキットブレーカーパターンと指数バックオフを実装し、高い可用性を確保します。

#### 主な特徴
- **自動フォールバック**: プライマリプロバイダー失敗時に自動的に代替プロバイダーに切り替え
- **サーキットブレーカー**: 連続失敗時にプロバイダーを一時的に無効化
- **指数バックオフ**: リトライ時の待機時間を段階的に増加
- **健全性監視**: 各プロバイダーの稼働状況をリアルタイム追跡

#### 設定例
```typescript
const fallbackConfig: FallbackConfig = {
  primary: {
    provider: "google",
    model: "gemini-1.5-flash",
    environment: "production"
  },
  fallbacks: [
    {
      provider: "openai",
      model: "gpt-4o-mini",
      environment: "production"
    },
    {
      provider: "anthropic",
      model: "claude-3-haiku",
      environment: "production"
    }
  ],
  maxRetries: 3,
  retryDelay: 1000,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTime: 60000
};
```

### 2. A/Bテスト機能

#### 概要
複数のLLMプロバイダー・モデルの性能を比較し、データに基づいた意思決定を支援するA/Bテスト機能です。

#### 主な特徴
- **多変量テスト**: 複数のプロバイダー・モデルを同時比較
- **統計的分析**: p値と信頼区間を用いた統計的有意性判定
- **セッション一貫性**: 同一セッション内での一貫したバリアント割り当て
- **メトリクス追跡**: コスト、速度、成功率、品質の包括的測定

#### 設定例
```typescript
const abTestConfig: ABTestConfig = {
  name: "コスト最適化テスト",
  description: "Gemini Flash vs GPT-4o Mini コスト比較",
  environment: "production",
  variants: [
    {
      id: "gemini-flash",
      name: "Gemini 1.5 Flash",
      config: { provider: "google", model: "gemini-1.5-flash" },
      weight: 50
    },
    {
      id: "gpt-4o-mini",
      name: "GPT-4o Mini",
      config: { provider: "openai", model: "gpt-4o-mini" },
      weight: 50
    }
  ],
  trafficSplit: { "gemini-flash": 50, "gpt-4o-mini": 50 },
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30日
  isActive: true,
  metrics: {
    primaryMetric: "cost",
    trackMetrics: ["cost", "speed", "success_rate"],
    sampleSize: 1000,
    confidenceLevel: 95
  }
};
```

### 3. バックアップ/リストア機能

#### 概要
LLM設定、フォールバック設定、A/Bテスト設定の完全なバックアップとリストアを提供する機能です。

#### 主な特徴
- **包括的バックアップ**: すべてのLLM関連設定をワンクリックでバックアップ
- **段階的リストア**: ドライラン、部分リストア、完全リストアのオプション
- **データ整合性チェック**: SHA-256ハッシュによるデータ整合性検証
- **履歴管理**: バックアップ・リストア履歴の完全な監査証跡

#### 使用例
```typescript
// バックアップ作成
const backup = await backupManager.createBackup(
  "production",
  {
    includeUsageData: true,
    includeAbTests: true,
    includeFallbackConfigs: true,
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date()
    }
  },
  "admin@example.com",
  "定期メンテナンス前のバックアップ"
);

// リストア実行
const result = await backupManager.restoreBackup(backup, {
  overwriteExisting: true,
  validateBeforeRestore: true,
  dryRun: false
});
```

### 4. アラート通知機能

#### 概要
LLMシステムの異常を自動検知し、複数のチャネル（Email、Slack、Discord、Webhook）に通知する包括的なアラートシステムです。

#### 主な特徴
- **多様な監視メトリクス**: コスト、エラー率、応答時間、成功率、トークン使用量
- **重要度レベル**: Critical、High、Medium、Lowの4段階
- **通知頻度制御**: immediate、5分毎、15分毎、1時間毎、1日毎
- **マルチチャネル通知**: メール、Slack、Discord、カスタムWebhook

#### アラートルール例
```typescript
const alertRule: AlertRule = {
  name: "高コスト閾値アラート",
  description: "1時間のコストが$10を超えた場合にアラート",
  environment: "production",
  type: "cost_threshold",
  conditions: [
    {
      metric: "total_cost",
      operator: "gt",
      value: 10.0,
      timeWindow: 60, // 60分
      aggregation: "sum"
    }
  ],
  actions: [
    {
      type: "slack",
      config: {
        webhookUrl: "https://hooks.slack.com/services/...",
        channel: "#alerts"
      }
    },
    {
      type: "email",
      config: {
        to: ["admin@example.com"],
        subject: "LLMコスト閾値超過アラート"
      }
    }
  ],
  isActive: true,
  frequency: "immediate"
};
```

## アーキテクチャ

### コンポーネント構成
```
lib/llm/
├── fallback.ts       # フォールバック機能
├── ab-test.ts        # A/Bテスト機能
├── backup.ts         # バックアップ/リストア機能
├── alerts.ts         # アラート通知機能
├── client.ts         # 統合LLMクライアント
├── providers.ts      # プロバイダー定義
└── types.ts          # 型定義

app/api/admin/
├── llm-fallback/     # フォールバック管理API
├── ab-tests/         # A/Bテスト管理API
├── backup/           # バックアップ管理API
└── alerts/           # アラート管理API
```

### データフロー
1. **要約リクエスト** → **フォールバックマネージャー**
2. **A/Bテスト判定** → **バリアント選択**
3. **LLM実行** → **使用量記録** → **アラート監視**
4. **定期バックアップ** → **アラートチェック**

## セキュリティ

### 暗号化
- APIキーは`pgcrypto`による暗号化保存
- バックアップデータのSHA-256ハッシュ検証
- 環境変数による暗号化キー管理

### アクセス制御
- Row Level Security (RLS)による細かいアクセス制御
- 管理API用の認証ミドルウェア
- 環境別設定の完全分離

## パフォーマンス最適化

### キャッシング
- アクティブなA/Bテスト設定のメモリキャッシュ
- プロバイダー健全性状態のローカルキャッシュ
- データベースクエリの最適化済みインデックス

### 非同期処理
- アラート送信の非同期実行
- バックアップ作成の段階的処理
- 統計計算のバックグラウンド実行

## 運用ガイド

### 監視項目
1. **プロバイダー健全性**: 各プロバイダーの成功率・レスポンス時間
2. **コスト監視**: 日次・月次のコスト推移
3. **A/Bテスト**: 統計的有意性の達成状況
4. **アラート**: アラート発火頻度と対応状況

### メンテナンス
1. **週次**: フォールバック設定の見直し
2. **月次**: A/Bテストの分析と設定更新
3. **四半期**: 包括的なバックアップとリストア検証
4. **年次**: 暗号化キーのローテーション

## トラブルシューティング

### よくある問題

#### フォールバック機能
**問題**: プライマリプロバイダーが復旧してもフォールバックが続く
**解決**:
```bash
# プロバイダーを手動リセット
curl -X POST /api/admin/llm-fallback/reset \
  -d '{"provider":"google","model":"gemini-1.5-flash"}'
```

#### A/Bテスト
**問題**: サンプルサイズが不足で統計的有意性が得られない
**解決**:
- テスト期間を延長
- トラフィック分割比率を調整
- サンプルサイズ目標を下げる

#### アラート
**問題**: アラートが過剰に発火する
**解決**:
- アラート閾値の見直し
- 頻度設定の調整
- 時間窓の拡大

### ログ確認
```bash
# フォールバックログ
curl "/api/admin/llm-fallback?action=logs"

# A/Bテスト結果
curl "/api/admin/ab-tests/{test-id}/analysis"

# アラートイベント
curl "/api/admin/alerts/events"
```

## 今後の拡張計画

### Phase 4 候補機能
1. **予測モデリング**: 使用量とコストの予測
2. **自動スケーリング**: 負荷に応じたプロバイダー選択
3. **品質評価**: 要約品質の自動評価システム
4. **コスト最適化**: リアルタイムコスト最適化エンジン

### 統合計画
1. **外部監視システム**: Datadog、New Relicとの統合
2. **CI/CD**: 設定変更の自動テストとデプロイ
3. **ダッシュボード**: Grafana、カスタムダッシュボードの構築

---

このドキュメントは実装された高度機能の包括的なガイドです。各機能の詳細な技術仕様は、対応するAPIドキュメントとデータベースドキュメントを参照してください。