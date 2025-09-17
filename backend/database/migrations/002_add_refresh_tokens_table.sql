-- Migration: Add refresh_tokens table for JWT refresh token rotation
-- This table stores hashed refresh tokens for secure session management

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA256 hash of refresh token (32 bytes = 64 hex chars)
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE NULL -- NULL = not used, timestamp = used/revoked
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);

-- Comments for documentation
COMMENT ON TABLE refresh_tokens IS 'Stores hashed refresh tokens for JWT session management';
COMMENT ON COLUMN refresh_tokens.token_hash IS 'SHA256 hash of refresh token - NEVER store raw tokens';
COMMENT ON COLUMN refresh_tokens.used_at IS 'NULL = active token, timestamp = used/revoked token';

-- Cleanup old/expired tokens periodically (can be run as a cron job)
-- DELETE FROM refresh_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL;
