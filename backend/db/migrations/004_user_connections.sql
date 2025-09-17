-- Migration: Add user_connections table for OAuth providers
-- Description: Stores encrypted OAuth tokens for Google and Microsoft integrations

CREATE TABLE IF NOT EXISTS user_connections (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'microsoft')),
  sub TEXT,
  access_token_enc TEXT,
  refresh_token_enc TEXT,
  scope TEXT[],
  expiry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, provider)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_connections_user_id ON user_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_connections_provider ON user_connections(provider);
CREATE INDEX IF NOT EXISTS idx_user_connections_expiry ON user_connections(expiry_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_connections_updated_at
  BEFORE UPDATE ON user_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_user_connections_updated_at();

-- Add comments for documentation
COMMENT ON TABLE user_connections IS 'Stores encrypted OAuth tokens for external service integrations';
COMMENT ON COLUMN user_connections.access_token_enc IS 'AES-256-GCM encrypted OAuth access token';
COMMENT ON COLUMN user_connections.refresh_token_enc IS 'AES-256-GCM encrypted OAuth refresh token';
COMMENT ON COLUMN user_connections.sub IS 'Provider-specific user identifier (email or user ID)';
COMMENT ON COLUMN user_connections.scope IS 'Array of OAuth scopes granted';
COMMENT ON COLUMN user_connections.expiry_at IS 'Access token expiration timestamp';
