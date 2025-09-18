-- Migration: Add client_config table for versioned per-client configuration
-- This table stores dynamic configuration data for n8n workflow templates

CREATE TABLE IF NOT EXISTS client_config (
    client_id TEXT PRIMARY KEY,                    -- Client identifier (can be UUID or string)
    version BIGINT NOT NULL,                       -- Server-assigned version (epoch ms or monotonic int)
    config_json JSONB NOT NULL,                    -- Full normalized configuration as JSON
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()  -- Last update timestamp
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_config_version ON client_config (version);
CREATE INDEX IF NOT EXISTS idx_client_config_updated_at ON client_config (updated_at);

-- Create GIN index for JSONB queries (allows efficient JSON field searches)
CREATE INDEX IF NOT EXISTS idx_client_config_json ON client_config USING GIN (config_json);

-- Comments for documentation
COMMENT ON TABLE client_config IS 'Stores versioned configuration data for client-specific n8n workflow templates';
COMMENT ON COLUMN client_config.client_id IS 'Unique client identifier - can be UUID or string format';
COMMENT ON COLUMN client_config.version IS 'Server-assigned version number (epoch milliseconds) - bumped on each update';
COMMENT ON COLUMN client_config.config_json IS 'Complete normalized client configuration as JSONB';

-- Example cleanup query for old versions (if needed in future)
-- DELETE FROM client_config WHERE updated_at < NOW() - INTERVAL '90 days';
