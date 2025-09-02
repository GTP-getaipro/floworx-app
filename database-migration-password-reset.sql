-- Floworx Password Reset & Credential Recovery Migration
-- Run this in your Supabase SQL Editor to add password reset functionality

-- =====================================================
-- 1. PASSWORD RESET TOKENS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for password_reset_tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens (token);
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON password_reset_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens (expires_at);

-- =====================================================
-- 2. ACCOUNT RECOVERY TOKENS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS account_recovery_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    recovery_type VARCHAR(50) NOT NULL CHECK (recovery_type IN ('email_change', 'account_recovery', 'emergency_access')),
    recovery_data JSONB, -- Store recovery-specific data
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for account_recovery_tokens
CREATE INDEX IF NOT EXISTS idx_account_recovery_token ON account_recovery_tokens (token);
CREATE INDEX IF NOT EXISTS idx_account_recovery_user_id ON account_recovery_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_account_recovery_type ON account_recovery_tokens (recovery_type);
CREATE INDEX IF NOT EXISTS idx_account_recovery_expires ON account_recovery_tokens (expires_at);

-- =====================================================
-- 3. CREDENTIAL BACKUP TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS credential_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_name VARCHAR(50) NOT NULL,
    backup_data JSONB NOT NULL, -- Encrypted backup of critical credential metadata
    backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('oauth_refresh', 'api_key_backup', 'service_config')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    restored_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for credential_backups
CREATE INDEX IF NOT EXISTS idx_credential_backup_user_id ON credential_backups (user_id);
CREATE INDEX IF NOT EXISTS idx_credential_backup_service ON credential_backups (service_name);
CREATE INDEX IF NOT EXISTS idx_credential_backup_type ON credential_backups (backup_type);

-- =====================================================
-- 4. SECURITY AUDIT LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for security_audit_log
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_log (user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON security_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_security_audit_created_at ON security_audit_log (created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_success ON security_audit_log (success);

-- =====================================================
-- 5. ADD RECOVERY FIELDS TO USERS TABLE
-- =====================================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_password_reset TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recovery_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS backup_codes TEXT[]; -- Array of encrypted backup codes

-- =====================================================
-- 6. FUNCTIONS FOR TOKEN CLEANUP
-- =====================================================

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Clean up expired password reset tokens
    DELETE FROM password_reset_tokens
    WHERE expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Clean up expired account recovery tokens
    DELETE FROM account_recovery_tokens
    WHERE expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;

    -- Clean up old credential backups (older than 90 days)
    DELETE FROM credential_backups
    WHERE expires_at < CURRENT_TIMESTAMP
    OR (expires_at IS NULL AND created_at < CURRENT_TIMESTAMP - INTERVAL '90 days');

    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;

    -- Clean up old audit logs (older than 1 year)
    DELETE FROM security_audit_log
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year';

    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. SECURITY FUNCTIONS
-- =====================================================

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    p_user_id UUID,
    p_action VARCHAR(100),
    p_resource_type VARCHAR(50) DEFAULT NULL,
    p_resource_id VARCHAR(255) DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO security_audit_log (
        user_id, action, resource_type, resource_id, 
        ip_address, user_agent, success, details
    ) VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id,
        p_ip_address, p_user_agent, p_success, p_details
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE password_reset_tokens IS 'Stores secure password reset tokens with expiration and usage tracking';
COMMENT ON TABLE account_recovery_tokens IS 'Stores tokens for various account recovery scenarios';
COMMENT ON TABLE credential_backups IS 'Stores encrypted backups of critical credential metadata for recovery';
COMMENT ON TABLE security_audit_log IS 'Comprehensive security audit log for monitoring and compliance';

COMMENT ON COLUMN password_reset_tokens.token IS 'Cryptographically secure random token for password reset';
COMMENT ON COLUMN account_recovery_tokens.recovery_data IS 'JSON data specific to recovery type (encrypted sensitive data)';
COMMENT ON COLUMN credential_backups.backup_data IS 'Encrypted backup of credential metadata (NOT the actual tokens)';
COMMENT ON COLUMN users.backup_codes IS 'Array of encrypted one-time backup codes for account recovery';

-- =====================================================
-- 9. VERIFY MIGRATION
-- =====================================================
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('password_reset_tokens', 'account_recovery_tokens', 'credential_backups', 'security_audit_log')
ORDER BY table_name, ordinal_position;
