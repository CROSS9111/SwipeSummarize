-- Migration: Add async processing columns to urls table
-- Date: 2026-01-03
-- Feature: F-007-ASYNC-PROCESS - 非同期要約処理

-- Add new columns for async processing
ALTER TABLE urls
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS summary TEXT,
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Create index for status filtering (used in random selection)
CREATE INDEX IF NOT EXISTS idx_urls_status ON urls(status);

-- Create index for efficient random selection of completed URLs
CREATE INDEX IF NOT EXISTS idx_urls_status_created ON urls(status, created_at DESC);

-- Add status constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_urls_status'
    ) THEN
        ALTER TABLE urls
        ADD CONSTRAINT chk_urls_status
        CHECK (status IN ('pending', 'processing', 'completed', 'error'));
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN urls.title IS 'Article title extracted by Jina Reader API';
COMMENT ON COLUMN urls.summary IS 'AI-generated summary of the article';
COMMENT ON COLUMN urls.tags IS 'AI-generated tags for categorization';
COMMENT ON COLUMN urls.status IS 'Processing status: pending, processing, completed, error';
COMMENT ON COLUMN urls.error_message IS 'Error message when status is error';
COMMENT ON COLUMN urls.retry_count IS 'Number of retry attempts for summarization';
COMMENT ON COLUMN urls.version IS 'Optimistic locking version for concurrent access control';
