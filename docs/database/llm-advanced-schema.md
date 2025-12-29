# LLM高度機能データベーススキーマ

## 概要

Phase 3で実装されたLLM高度機能（フォールバック、A/Bテスト、バックアップ/リストア、アラート）をサポートするための追加データベーステーブル設計です。

## テーブル構成

### 1. llm_fallback_configs - フォールバック設定

プロバイダー自動切り替え機能の設定を管理するテーブル。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 一意識別子 |
| environment | VARCHAR(20) | NOT NULL | 環境名 (local, staging, production) |
| primary_provider | VARCHAR(50) | NOT NULL | プライマリプロバイダー名 |
| primary_model | VARCHAR(100) | NOT NULL | プライマリモデル名 |
| fallback_providers | JSONB | NOT NULL, DEFAULT '[]' | フォールバックプロバイダー配列 |
| max_retries | INTEGER | NOT NULL, DEFAULT 3 | 最大リトライ回数 |
| retry_delay | INTEGER | NOT NULL, DEFAULT 1000 | リトライ間隔(ms) |
| circuit_breaker_threshold | INTEGER | NOT NULL, DEFAULT 5 | サーキットブレーカー閾値 |
| circuit_breaker_reset_time | INTEGER | NOT NULL, DEFAULT 60000 | サーキットブレーカーリセット時間(ms) |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | アクティブフラグ |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 更新日時 |

#### fallback_providers JSONBスキーマ
```json
[
  {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "priority": 1,
    "config": {
      "temperature": 0.7,
      "max_tokens": 1000
    }
  }
]
```

#### インデックス
```sql
CREATE UNIQUE INDEX idx_fallback_config_environment_active
ON llm_fallback_configs(environment)
WHERE is_active = true;

CREATE INDEX idx_fallback_config_provider
ON llm_fallback_configs(primary_provider, primary_model);
```

### 2. llm_fallback_logs - フォールバック実行ログ

フォールバック機能の実行履歴を記録するテーブル。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 一意識別子 |
| primary_provider | VARCHAR(50) | NOT NULL | プライマリプロバイダー名 |
| primary_model | VARCHAR(100) | NOT NULL | プライマリモデル名 |
| used_provider | VARCHAR(50) | NULL | 実際に使用されたプロバイダー |
| used_model | VARCHAR(100) | NULL | 実際に使用されたモデル |
| attempted_providers | JSONB | NOT NULL, DEFAULT '[]' | 試行されたプロバイダー一覧 |
| success | BOOLEAN | NOT NULL | 最終的な成功/失敗 |
| error_message | TEXT | NULL | エラーメッセージ |
| environment | VARCHAR(20) | NOT NULL | 環境名 |
| processing_time_ms | INTEGER | NULL | 処理時間(ms) |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 作成日時 |

#### インデックス
```sql
CREATE INDEX idx_fallback_logs_created_at
ON llm_fallback_logs(created_at DESC);

CREATE INDEX idx_fallback_logs_environment
ON llm_fallback_logs(environment, created_at DESC);

CREATE INDEX idx_fallback_logs_success
ON llm_fallback_logs(success, created_at DESC);
```

### 3. ab_tests - A/Bテスト設定

A/Bテストの設定情報を管理するテーブル。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 一意識別子 |
| name | VARCHAR(200) | NOT NULL | テスト名 |
| description | TEXT | NULL | テストの説明 |
| environment | VARCHAR(20) | NOT NULL | 環境名 |
| variants | JSONB | NOT NULL | バリアント設定配列 |
| traffic_split | JSONB | NOT NULL | トラフィック分割設定 |
| start_date | TIMESTAMP WITH TIME ZONE | NOT NULL | 開始日時 |
| end_date | TIMESTAMP WITH TIME ZONE | NULL | 終了日時 |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | アクティブフラグ |
| metrics | JSONB | NOT NULL | 測定指標設定 |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 更新日時 |

#### variants JSONBスキーマ
```json
[
  {
    "id": "variant_a",
    "name": "Gemini Flash",
    "config": {
      "provider": "google",
      "model": "gemini-1.5-flash",
      "temperature": 0.7,
      "max_tokens": 1000
    },
    "weight": 50
  }
]
```

#### metrics JSONBスキーマ
```json
{
  "primaryMetric": "cost",
  "trackMetrics": ["cost", "speed", "success_rate", "quality"],
  "sampleSize": 1000,
  "confidenceLevel": 95
}
```

#### インデックス
```sql
CREATE INDEX idx_ab_tests_environment_active
ON ab_tests(environment, is_active);

CREATE INDEX idx_ab_tests_date_range
ON ab_tests(start_date, end_date)
WHERE is_active = true;
```

### 4. ab_test_results - A/Bテスト結果

A/Bテストの実行結果を記録するテーブル。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 一意識別子 |
| test_id | UUID | NOT NULL, REFERENCES ab_tests(id) ON DELETE CASCADE | テストID |
| variant_id | VARCHAR(100) | NOT NULL | バリアントID |
| content_hash | VARCHAR(64) | NOT NULL | コンテンツハッシュ(プライバシー保護) |
| title_hash | VARCHAR(64) | NULL | タイトルハッシュ |
| summary_length | INTEGER | NULL | 要約文字数 |
| input_tokens | INTEGER | NULL | 入力トークン数 |
| output_tokens | INTEGER | NULL | 出力トークン数 |
| total_tokens | INTEGER | NULL | 総トークン数 |
| estimated_cost | DECIMAL(10, 6) | NULL | 推定コスト(USD) |
| processing_time | INTEGER | NULL | 処理時間(ms) |
| provider | VARCHAR(50) | NULL | 使用プロバイダー |
| model | VARCHAR(100) | NULL | 使用モデル |
| user_segment | VARCHAR(100) | NULL | ユーザーセグメント |
| session_id | VARCHAR(100) | NULL | セッションID |
| success | BOOLEAN | NOT NULL | 成功/失敗 |
| error_message | TEXT | NULL | エラーメッセージ |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 作成日時 |

#### インデックス
```sql
CREATE INDEX idx_ab_test_results_test_id
ON ab_test_results(test_id, created_at DESC);

CREATE INDEX idx_ab_test_results_variant
ON ab_test_results(test_id, variant_id, success);

CREATE INDEX idx_ab_test_results_session
ON ab_test_results(session_id)
WHERE session_id IS NOT NULL;
```

### 5. llm_backups - バックアップ管理

LLM設定のバックアップ情報を管理するテーブル。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 一意識別子 |
| version | VARCHAR(20) | NOT NULL | バックアップバージョン |
| environment | VARCHAR(20) | NOT NULL | 環境名 |
| backup_data | JSONB | NOT NULL | バックアップデータ |
| creator | VARCHAR(200) | NOT NULL | 作成者 |
| description | TEXT | NULL | 説明 |
| data_size | INTEGER | NOT NULL | データサイズ(bytes) |
| hash | VARCHAR(64) | NOT NULL | データ整合性ハッシュ(SHA-256) |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'completed' | ステータス |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 作成日時 |

#### backup_data JSONBスキーマ
```json
{
  "llmSettings": [...],
  "fallbackConfigs": [...],
  "abTests": [...],
  "usageStats": [...]
}
```

#### インデックス
```sql
CREATE INDEX idx_llm_backups_environment
ON llm_backups(environment, created_at DESC);

CREATE INDEX idx_llm_backups_creator
ON llm_backups(creator, created_at DESC);
```

### 6. llm_restore_logs - リストア実行ログ

バックアップリストアの実行履歴を記録するテーブル。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 一意識別子 |
| backup_version | VARCHAR(20) | NOT NULL | バックアップバージョン |
| backup_timestamp | TIMESTAMP WITH TIME ZONE | NOT NULL | バックアップ作成時刻 |
| environment | VARCHAR(20) | NOT NULL | 環境名 |
| restore_report | JSONB | NOT NULL | リストア結果レポート |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'completed' | ステータス |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 実行日時 |

#### restore_report JSONBスキーマ
```json
{
  "llmSettings": {
    "restored": 5,
    "skipped": 1,
    "errors": []
  },
  "fallbackConfigs": {
    "restored": 2,
    "skipped": 0,
    "errors": []
  }
}
```

### 7. alert_rules - アラートルール

アラート監視ルールを管理するテーブル。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 一意識別子 |
| name | VARCHAR(200) | NOT NULL | ルール名 |
| description | TEXT | NULL | 説明 |
| environment | VARCHAR(20) | NOT NULL | 環境名 |
| type | VARCHAR(50) | NOT NULL | アラート種類 |
| conditions | JSONB | NOT NULL | 条件設定 |
| actions | JSONB | NOT NULL | アクション設定 |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | アクティブフラグ |
| frequency | VARCHAR(20) | NOT NULL, DEFAULT 'immediate' | チェック頻度 |
| last_triggered | TIMESTAMP WITH TIME ZONE | NULL | 最終発火時刻 |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT NOW() | 更新日時 |

#### conditions JSONBスキーマ
```json
[
  {
    "metric": "total_cost",
    "operator": "gt",
    "value": 10.0,
    "timeWindow": 60,
    "aggregation": "sum"
  }
]
```

#### actions JSONBスキーマ
```json
[
  {
    "type": "slack",
    "config": {
      "webhookUrl": "https://hooks.slack.com/services/...",
      "channel": "#alerts"
    }
  }
]
```

#### インデックス
```sql
CREATE INDEX idx_alert_rules_environment_active
ON alert_rules(environment, is_active);

CREATE INDEX idx_alert_rules_type
ON alert_rules(type, environment);

CREATE INDEX idx_alert_rules_last_triggered
ON alert_rules(last_triggered)
WHERE last_triggered IS NOT NULL;
```

### 8. alert_events - アラートイベント

発火したアラートの履歴を記録するテーブル。

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | 一意識別子 |
| rule_id | UUID | NOT NULL, REFERENCES alert_rules(id) ON DELETE CASCADE | ルールID |
| rule_name | VARCHAR(200) | NOT NULL | ルール名(スナップショット) |
| severity | VARCHAR(20) | NOT NULL | 重要度 |
| message | TEXT | NOT NULL | アラートメッセージ |
| details | JSONB | NOT NULL | 詳細情報 |
| environment | VARCHAR(20) | NOT NULL | 環境名 |
| triggered_at | TIMESTAMP WITH TIME ZONE | NOT NULL | 発火時刻 |
| resolved_at | TIMESTAMP WITH TIME ZONE | NULL | 解決時刻 |
| status | VARCHAR(20) | NOT NULL, DEFAULT 'active' | ステータス |

#### details JSONBスキーマ
```json
{
  "metrics": {
    "total_cost": 12.45,
    "error_rate": 15.5
  },
  "conditions": [...],
  "environment": "production"
}
```

#### インデックス
```sql
CREATE INDEX idx_alert_events_rule_id
ON alert_events(rule_id, triggered_at DESC);

CREATE INDEX idx_alert_events_severity
ON alert_events(severity, triggered_at DESC);

CREATE INDEX idx_alert_events_environment
ON alert_events(environment, triggered_at DESC);

CREATE INDEX idx_alert_events_status
ON alert_events(status)
WHERE status = 'active';
```

## SQL作成スクリプト

### 完全なテーブル作成スクリプト

```sql
-- ======================================================================
-- LLM Advanced Features Database Schema
-- Phase 3 implementation tables
-- ======================================================================

-- 1. フォールバック設定テーブル
CREATE TABLE IF NOT EXISTS llm_fallback_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('local', 'staging', 'production')),
    primary_provider VARCHAR(50) NOT NULL,
    primary_model VARCHAR(100) NOT NULL,
    fallback_providers JSONB NOT NULL DEFAULT '[]'::jsonb,
    max_retries INTEGER NOT NULL DEFAULT 3 CHECK (max_retries >= 1 AND max_retries <= 10),
    retry_delay INTEGER NOT NULL DEFAULT 1000 CHECK (retry_delay >= 0),
    circuit_breaker_threshold INTEGER NOT NULL DEFAULT 5 CHECK (circuit_breaker_threshold >= 1),
    circuit_breaker_reset_time INTEGER NOT NULL DEFAULT 60000 CHECK (circuit_breaker_reset_time >= 1000),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. フォールバック実行ログテーブル
CREATE TABLE IF NOT EXISTS llm_fallback_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_provider VARCHAR(50) NOT NULL,
    primary_model VARCHAR(100) NOT NULL,
    used_provider VARCHAR(50),
    used_model VARCHAR(100),
    attempted_providers JSONB NOT NULL DEFAULT '[]'::jsonb,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    environment VARCHAR(20) NOT NULL,
    processing_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. A/Bテストテーブル
CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('local', 'staging', 'production')),
    variants JSONB NOT NULL,
    traffic_split JSONB NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metrics JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. A/Bテスト結果テーブル
CREATE TABLE IF NOT EXISTS ab_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id VARCHAR(100) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    title_hash VARCHAR(64),
    summary_length INTEGER,
    input_tokens INTEGER,
    output_tokens INTEGER,
    total_tokens INTEGER,
    estimated_cost DECIMAL(10, 6),
    processing_time INTEGER,
    provider VARCHAR(50),
    model VARCHAR(100),
    user_segment VARCHAR(100),
    session_id VARCHAR(100),
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. バックアップテーブル
CREATE TABLE IF NOT EXISTS llm_backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version VARCHAR(20) NOT NULL,
    environment VARCHAR(20) NOT NULL,
    backup_data JSONB NOT NULL,
    creator VARCHAR(200) NOT NULL,
    description TEXT,
    data_size INTEGER NOT NULL CHECK (data_size >= 0),
    hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. リストアログテーブル
CREATE TABLE IF NOT EXISTS llm_restore_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_version VARCHAR(20) NOT NULL,
    backup_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    environment VARCHAR(20) NOT NULL,
    restore_report JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. アラートルールテーブル
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('local', 'staging', 'production')),
    type VARCHAR(50) NOT NULL CHECK (type IN ('cost_threshold', 'error_rate', 'response_time', 'success_rate', 'token_usage', 'provider_failure', 'circuit_breaker', 'quota_exceeded')),
    conditions JSONB NOT NULL,
    actions JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    frequency VARCHAR(20) NOT NULL DEFAULT 'immediate' CHECK (frequency IN ('immediate', 'every_5min', 'every_15min', 'hourly', 'daily')),
    last_triggered TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. アラートイベントテーブル
CREATE TABLE IF NOT EXISTS alert_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
    rule_name VARCHAR(200) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    message TEXT NOT NULL,
    details JSONB NOT NULL,
    environment VARCHAR(20) NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'acknowledged'))
);

-- インデックス作成
-- フォールバック設定
CREATE UNIQUE INDEX IF NOT EXISTS idx_fallback_config_environment_active
ON llm_fallback_configs(environment) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_fallback_config_provider
ON llm_fallback_configs(primary_provider, primary_model);

-- フォールバックログ
CREATE INDEX IF NOT EXISTS idx_fallback_logs_created_at
ON llm_fallback_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fallback_logs_environment
ON llm_fallback_logs(environment, created_at DESC);

-- A/Bテスト
CREATE INDEX IF NOT EXISTS idx_ab_tests_environment_active
ON ab_tests(environment, is_active);

CREATE INDEX IF NOT EXISTS idx_ab_tests_date_range
ON ab_tests(start_date, end_date) WHERE is_active = true;

-- A/Bテスト結果
CREATE INDEX IF NOT EXISTS idx_ab_test_results_test_id
ON ab_test_results(test_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ab_test_results_variant
ON ab_test_results(test_id, variant_id, success);

-- バックアップ
CREATE INDEX IF NOT EXISTS idx_llm_backups_environment
ON llm_backups(environment, created_at DESC);

-- アラートルール
CREATE INDEX IF NOT EXISTS idx_alert_rules_environment_active
ON alert_rules(environment, is_active);

CREATE INDEX IF NOT EXISTS idx_alert_rules_type
ON alert_rules(type, environment);

-- アラートイベント
CREATE INDEX IF NOT EXISTS idx_alert_events_rule_id
ON alert_events(rule_id, triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_events_severity
ON alert_events(severity, triggered_at DESC);

CREATE INDEX IF NOT EXISTS idx_alert_events_environment
ON alert_events(environment, triggered_at DESC);

-- トリガー関数（updated_atの自動更新）
CREATE OR REPLACE FUNCTION update_updated_at_advanced()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
CREATE TRIGGER update_llm_fallback_configs_updated_at
    BEFORE UPDATE ON llm_fallback_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_advanced();

CREATE TRIGGER update_ab_tests_updated_at
    BEFORE UPDATE ON ab_tests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_advanced();

CREATE TRIGGER update_alert_rules_updated_at
    BEFORE UPDATE ON alert_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_advanced();

-- RLS (Row Level Security) 設定
ALTER TABLE llm_fallback_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_fallback_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_restore_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;

-- 基本的なRLSポリシー（全ユーザーアクセス可能 - シングルユーザーアプリのため）
CREATE POLICY "advanced_tables_read_all" ON llm_fallback_configs FOR SELECT USING (true);
CREATE POLICY "advanced_tables_write_all" ON llm_fallback_configs FOR ALL USING (true);

-- 他のテーブルにも同様のポリシーを適用...
-- (簡潔のため省略、実際には各テーブルに必要)

-- コメント追加
COMMENT ON TABLE llm_fallback_configs IS 'LLMプロバイダー自動切り替え設定';
COMMENT ON TABLE llm_fallback_logs IS 'フォールバック実行履歴';
COMMENT ON TABLE ab_tests IS 'A/Bテスト設定';
COMMENT ON TABLE ab_test_results IS 'A/Bテスト実行結果';
COMMENT ON TABLE llm_backups IS 'LLM設定バックアップ';
COMMENT ON TABLE llm_restore_logs IS 'バックアップリストア履歴';
COMMENT ON TABLE alert_rules IS 'アラート監視ルール';
COMMENT ON TABLE alert_events IS 'アラートイベント履歴';
```

## データ保持ポリシー

### 自動削除設定
```sql
-- 古いログデータの自動削除（例：90日以上古いデータ）
-- Supabaseでクロンジョブまたは関数で実行

-- フォールバックログ: 90日後削除
DELETE FROM llm_fallback_logs
WHERE created_at < NOW() - INTERVAL '90 days';

-- A/Bテスト結果: 完了したテストの結果を180日後削除
DELETE FROM ab_test_results
WHERE created_at < NOW() - INTERVAL '180 days'
  AND test_id IN (
    SELECT id FROM ab_tests
    WHERE is_active = false
    AND end_date < NOW() - INTERVAL '180 days'
  );

-- アラートイベント: 解決済みアラートを30日後削除
DELETE FROM alert_events
WHERE status = 'resolved'
AND resolved_at < NOW() - INTERVAL '30 days';
```

## パフォーマンス最適化

### パーティショニング（大規模運用時）
```sql
-- 月別パーティション（ログテーブル用）
CREATE TABLE llm_fallback_logs_y2024m12 PARTITION OF llm_fallback_logs
FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');

-- インデックス最適化
ANALYZE llm_fallback_configs;
ANALYZE ab_test_results;
ANALYZE alert_events;
```

このスキーマ設計により、LLM高度機能の完全な運用管理が可能になります。各テーブルの関係性とデータフローを理解し、適切な監視とメンテナンスを実施してください。