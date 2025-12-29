-- ======================================================================
-- LLM Integration Database Schema
-- Description: Vercel AI SDK を使用した複数 LLM プロバイダー対応のためのスキーマ
-- Created: 2024-12-28
-- ======================================================================

-- ======================================================================
-- 1. 拡張機能の有効化
-- ======================================================================

-- UUID生成用
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 暗号化用
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ======================================================================
-- 2. LLM設定テーブル
-- ======================================================================

-- LLMプロバイダーの設定を管理
CREATE TABLE IF NOT EXISTS llm_settings (
    -- 主キー
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- プロバイダー情報
    provider VARCHAR(50) NOT NULL,  -- azure-openai, openai, anthropic, google, etc.
    model VARCHAR(100) NOT NULL,     -- gpt-4, claude-3, gemini-pro, etc.

    -- 環境設定
    environment VARCHAR(20) NOT NULL CHECK (environment IN ('local', 'staging', 'production')),

    -- 設定内容（暗号化されたAPIキー等を含む）
    config JSONB NOT NULL,
    /* config の構造例:
    {
        "apiKey": "encrypted_key",
        "endpoint": "https://...",      -- Azure/Ollama用
        "deploymentName": "...",         -- Azure用
        "apiVersion": "2024-02-15",      -- Azure用
        "region": "us-east-1",           -- AWS用
        "projectId": "...",              -- Vertex AI用
        "location": "us-central1"        -- Vertex AI用
    }
    */

    -- パラメータ設定
    max_tokens INTEGER DEFAULT 1000 CHECK (max_tokens > 0 AND max_tokens <= 8000),
    temperature FLOAT DEFAULT 0.7 CHECK (temperature >= 0.0 AND temperature <= 1.0),

    -- ステータス
    is_active BOOLEAN DEFAULT true,

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 制約: 環境ごとに1つのアクティブ設定のみ許可
    CONSTRAINT unique_active_per_environment UNIQUE(environment, is_active)
);

-- インデックス
CREATE INDEX idx_llm_settings_provider ON llm_settings(provider);
CREATE INDEX idx_llm_settings_environment ON llm_settings(environment);
CREATE INDEX idx_llm_settings_active ON llm_settings(is_active) WHERE is_active = true;

-- コメント
COMMENT ON TABLE llm_settings IS 'LLMプロバイダーの設定管理テーブル';
COMMENT ON COLUMN llm_settings.provider IS 'プロバイダーID (azure-openai, openai, anthropic, google等)';
COMMENT ON COLUMN llm_settings.model IS 'モデル名 (gpt-4, claude-3, gemini-pro等)';
COMMENT ON COLUMN llm_settings.config IS '暗号化されたAPIキーを含む設定情報';

-- ======================================================================
-- 3. LLM使用履歴テーブル
-- ======================================================================

-- LLMの使用履歴とコスト追跡
CREATE TABLE IF NOT EXISTS llm_usage (
    -- 主キー
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- プロバイダー情報
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    environment VARCHAR(20) NOT NULL,

    -- リクエスト情報
    request_id UUID NOT NULL,        -- 要約リクエストのID

    -- トークン使用量
    input_tokens INTEGER NOT NULL CHECK (input_tokens >= 0),
    output_tokens INTEGER NOT NULL CHECK (output_tokens >= 0),
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

    -- コスト情報
    estimated_cost DECIMAL(10, 6),   -- USD単位での推定コスト

    -- リクエスト/レスポンス内容（デバッグ用、オプション）
    prompt_text TEXT,
    response_text TEXT,

    -- エラー情報
    error_message TEXT,
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'error', 'rate_limited', 'timeout')),

    -- パフォーマンス
    response_time_ms INTEGER,         -- レスポンスタイム（ミリ秒）

    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_llm_usage_created_at ON llm_usage(created_at DESC);
CREATE INDEX idx_llm_usage_provider ON llm_usage(provider, created_at DESC);
CREATE INDEX idx_llm_usage_environment ON llm_usage(environment, created_at DESC);
CREATE INDEX idx_llm_usage_request_id ON llm_usage(request_id);
CREATE INDEX idx_llm_usage_status ON llm_usage(status);

-- 月別サマリー用の複合インデックス
CREATE INDEX idx_llm_usage_monthly ON llm_usage(
    DATE_TRUNC('month', created_at),
    provider,
    model
);

-- コメント
COMMENT ON TABLE llm_usage IS 'LLM使用履歴とコスト追跡テーブル';
COMMENT ON COLUMN llm_usage.estimated_cost IS 'USD単位での推定コスト（実際の請求と異なる可能性あり）';
COMMENT ON COLUMN llm_usage.total_tokens IS '入力トークン + 出力トークンの合計（自動計算）';

-- ======================================================================
-- 4. 既存テーブルの変更
-- ======================================================================

-- savedテーブルにLLM関連カラムを追加
ALTER TABLE saved
ADD COLUMN IF NOT EXISTS llm_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS llm_model VARCHAR(100),
ADD COLUMN IF NOT EXISTS llm_tokens_used INTEGER,
ADD COLUMN IF NOT EXISTS llm_cost DECIMAL(10, 6);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_saved_llm_provider ON saved(llm_provider) WHERE llm_provider IS NOT NULL;

-- コメント追加
COMMENT ON COLUMN saved.llm_provider IS '要約生成に使用したLLMプロバイダー';
COMMENT ON COLUMN saved.llm_model IS '要約生成に使用したモデル';
COMMENT ON COLUMN saved.llm_tokens_used IS '要約生成で使用したトークン数';
COMMENT ON COLUMN saved.llm_cost IS '要約生成の推定コスト（USD）';

-- ======================================================================
-- 5. 暗号化関数
-- ======================================================================

-- シークレット管理テーブル（存在しない場合のみ作成）
CREATE TABLE IF NOT EXISTS app_secrets (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'APIキーの暗号化に失敗しました: %', SQLERRM;
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
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'APIキーの復号化に失敗しました: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ======================================================================
-- 6. ビューの作成
-- ======================================================================

-- プロバイダー別の使用統計ビュー
CREATE OR REPLACE VIEW llm_usage_stats AS
SELECT
    provider,
    model,
    DATE_TRUNC('day', created_at) AS date,
    COUNT(*) AS request_count,
    SUM(input_tokens) AS total_input_tokens,
    SUM(output_tokens) AS total_output_tokens,
    SUM(total_tokens) AS total_tokens,
    SUM(estimated_cost) AS total_cost,
    AVG(response_time_ms) AS avg_response_time,
    COUNT(*) FILTER (WHERE status = 'error') AS error_count,
    COUNT(*) FILTER (WHERE status = 'rate_limited') AS rate_limited_count
FROM llm_usage
GROUP BY provider, model, DATE_TRUNC('day', created_at);

-- アクティブな設定の簡易ビュー
CREATE OR REPLACE VIEW active_llm_settings AS
SELECT
    environment,
    provider,
    model,
    max_tokens,
    temperature,
    created_at,
    updated_at
FROM llm_settings
WHERE is_active = true;

-- ======================================================================
-- 7. トリガー関数
-- ======================================================================

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- llm_settingsテーブルにトリガーを適用
DROP TRIGGER IF EXISTS update_llm_settings_updated_at ON llm_settings;
CREATE TRIGGER update_llm_settings_updated_at
    BEFORE UPDATE ON llm_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- アクティブ設定の一意性を保証するトリガー
CREATE OR REPLACE FUNCTION ensure_single_active_setting()
RETURNS TRIGGER AS $$
BEGIN
    -- 新しい設定がアクティブな場合、同じ環境の既存のアクティブ設定を非アクティブにする
    IF NEW.is_active = true THEN
        UPDATE llm_settings
        SET is_active = false
        WHERE environment = NEW.environment
          AND is_active = true
          AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ensure_single_active_llm_setting ON llm_settings;
CREATE TRIGGER ensure_single_active_llm_setting
    BEFORE INSERT OR UPDATE OF is_active ON llm_settings
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_active_setting();

-- ======================================================================
-- 8. Row Level Security (RLS) ポリシー
-- ======================================================================

-- RLSを有効化（Supabaseを使用する場合）
ALTER TABLE llm_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE llm_usage ENABLE ROW LEVEL SECURITY;

-- 全ユーザーがread可能（シングルユーザーアプリのため）
CREATE POLICY "llm_settings_read_all" ON llm_settings
    FOR SELECT
    USING (true);

CREATE POLICY "llm_settings_write_all" ON llm_settings
    FOR ALL
    USING (true);

CREATE POLICY "llm_usage_read_all" ON llm_usage
    FOR SELECT
    USING (true);

CREATE POLICY "llm_usage_write_all" ON llm_usage
    FOR ALL
    USING (true);

-- ======================================================================
-- 9. サンプルデータ（開発環境用）
-- ======================================================================

-- 注: 本番環境では実行しないこと
/*
-- 暗号化キーのサンプル（実際の環境では適切なキーを設定）
INSERT INTO app_secrets (key, value)
VALUES ('encryption_key', 'your-32-byte-encryption-key-here')
ON CONFLICT (key) DO NOTHING;

-- サンプル設定
INSERT INTO llm_settings (provider, model, environment, config, is_active)
VALUES
    ('google', 'gemini-1.5-flash', 'local',
     '{"apiKey": "' || encrypt_api_key('your-api-key') || '"}', true),
    ('openai', 'gpt-4o-mini', 'local',
     '{"apiKey": "' || encrypt_api_key('your-api-key') || '"}', false);
*/

-- ======================================================================
-- 10. 権限設定
-- ======================================================================

-- Supabase anon/authenticated ユーザーへの権限付与
GRANT SELECT, INSERT, UPDATE ON llm_settings TO anon, authenticated;
GRANT SELECT, INSERT ON llm_usage TO anon, authenticated;
GRANT SELECT ON llm_usage_stats TO anon, authenticated;
GRANT SELECT ON active_llm_settings TO anon, authenticated;
GRANT EXECUTE ON FUNCTION encrypt_api_key TO authenticated;
GRANT EXECUTE ON FUNCTION decrypt_api_key TO authenticated;