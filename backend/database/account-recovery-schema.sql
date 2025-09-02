-- FloWorx Account Recovery System Database Schema
-- Run this in your Supabase SQL Editor to add comprehensive account recovery functionality

-- =====================================================
-- 1. ENHANCED USERS TABLE UPDATES
-- =====================================================
-- Add recovery-related fields to existing users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_password_reset TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_successful_login TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS recovery_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS backup_codes TEXT[], -- Array of encrypted backup codes
ADD COLUMN IF NOT EXISTS security_questions JSONB; -- Encrypted security questions/answers

-- =====================================================
-- 2. PASSWORD RESET TOKENS TABLE (Enhanced)
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
    user_agent TEXT,
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- =====================================================
-- 3. ACCOUNT RECOVERY TOKENS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS account_recovery_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    recovery_type VARCHAR(50) NOT NULL CHECK (recovery_type IN ('email_change', 'account_recovery', 'emergency_access', 'account_lockout')),
    recovery_data JSONB, -- Store recovery-specific data
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    verification_attempts INTEGER DEFAULT 0,
    max_verification_attempts INTEGER DEFAULT 5
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_recovery_tokens_user_id ON account_recovery_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_account_recovery_tokens_token ON account_recovery_tokens(token);
CREATE INDEX IF NOT EXISTS idx_account_recovery_tokens_type ON account_recovery_tokens(recovery_type);
CREATE INDEX IF NOT EXISTS idx_account_recovery_tokens_expires_at ON account_recovery_tokens(expires_at);

-- =====================================================
-- 4. CREDENTIAL BACKUPS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS credential_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL,
    backup_data JSONB NOT NULL, -- Encrypted backup data
    backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('oauth_refresh', 'api_keys', 'backup_codes', 'security_questions')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credential_backups_user_id ON credential_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_credential_backups_service ON credential_backups(service_name);
CREATE INDEX IF NOT EXISTS idx_credential_backups_type ON credential_backups(backup_type);

-- =====================================================
-- 5. SECURITY AUDIT LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255),
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100)
);

-- Create indexes for performance and querying
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_action ON security_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_success ON security_audit_log(success);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_risk_score ON security_audit_log(risk_score);

-- =====================================================
-- 6. ACCOUNT LOCKOUT HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS account_lockout_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lockout_reason VARCHAR(100) NOT NULL,
    locked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    unlocked_at TIMESTAMP WITH TIME ZONE,
    lockout_duration_minutes INTEGER,
    failed_attempts_count INTEGER,
    ip_address INET,
    user_agent TEXT,
    auto_unlocked BOOLEAN DEFAULT false,
    unlocked_by UUID REFERENCES users(id) ON DELETE SET NULL -- Admin who unlocked
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_account_lockout_history_user_id ON account_lockout_history(user_id);
CREATE INDEX IF NOT EXISTS idx_account_lockout_history_locked_at ON account_lockout_history(locked_at);

-- =====================================================
-- 7. RECOVERY SESSION TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS recovery_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    recovery_type VARCHAR(50) NOT NULL,
    current_step VARCHAR(50),
    session_data JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recovery_sessions_user_id ON recovery_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_sessions_token ON recovery_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_recovery_sessions_expires_at ON recovery_sessions(expires_at);

-- =====================================================
-- 8. FUNCTIONS FOR TOKEN MANAGEMENT
-- =====================================================

-- Function to create password reset token with rate limiting
CREATE OR REPLACE FUNCTION create_password_reset_token(
    p_user_id UUID,
    p_token VARCHAR(255),
    p_expires_at TIMESTAMP WITH TIME ZONE,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, message TEXT, token_id UUID) AS $$
DECLARE
    v_recent_count INTEGER;
    v_token_id UUID;
BEGIN
    -- Check for recent token requests (rate limiting)
    SELECT COUNT(*) INTO v_recent_count
    FROM password_reset_tokens
    WHERE user_id = p_user_id 
    AND created_at > CURRENT_TIMESTAMP - INTERVAL '15 minutes'
    AND NOT used;

    IF v_recent_count >= 3 THEN
        RETURN QUERY SELECT false, 'Too many recent password reset requests. Please wait 15 minutes.', NULL::UUID;
        RETURN;
    END IF;

    -- Invalidate existing unused tokens for this user
    UPDATE password_reset_tokens 
    SET used = true, used_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id AND NOT used;

    -- Create new token
    INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address, user_agent)
    VALUES (p_user_id, p_token, p_expires_at, p_ip_address, p_user_agent)
    RETURNING id INTO v_token_id;

    RETURN QUERY SELECT true, 'Password reset token created successfully.', v_token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate password reset token
CREATE OR REPLACE FUNCTION validate_password_reset_token(
    p_token VARCHAR(255),
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS TABLE(valid BOOLEAN, user_id UUID, message TEXT, attempts_remaining INTEGER) AS $$
DECLARE
    v_token_record RECORD;
    v_attempts_remaining INTEGER;
BEGIN
    -- Get token record
    SELECT * INTO v_token_record
    FROM password_reset_tokens
    WHERE token = p_token;

    -- Check if token exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Invalid token.', 0;
        RETURN;
    END IF;

    -- Check if token is already used
    IF v_token_record.used THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Token has already been used.', 0;
        RETURN;
    END IF;

    -- Check if token is expired
    IF v_token_record.expires_at < CURRENT_TIMESTAMP THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Token has expired.', 0;
        RETURN;
    END IF;

    -- Check attempt count
    IF v_token_record.attempt_count >= v_token_record.max_attempts THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Too many verification attempts.', 0;
        RETURN;
    END IF;

    -- Increment attempt count
    UPDATE password_reset_tokens 
    SET attempt_count = attempt_count + 1
    WHERE id = v_token_record.id;

    v_attempts_remaining := v_token_record.max_attempts - v_token_record.attempt_count - 1;

    RETURN QUERY SELECT true, v_token_record.user_id, 'Token is valid.', v_attempts_remaining;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. CLEANUP FUNCTIONS
-- =====================================================

-- Function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens() RETURNS INTEGER AS $$
DECLARE
    v_deleted_count INTEGER := 0;
BEGIN
    -- Clean up expired password reset tokens
    DELETE FROM password_reset_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '24 hours';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- Clean up expired account recovery tokens
    DELETE FROM account_recovery_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '24 hours';

    -- Clean up expired recovery sessions
    DELETE FROM recovery_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '24 hours';

    -- Clean up old audit logs (keep 90 days)
    DELETE FROM security_audit_log 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';

    RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_recovery_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_lockout_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for password_reset_tokens
CREATE POLICY "Users can view their own password reset tokens" ON password_reset_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for account_recovery_tokens  
CREATE POLICY "Users can view their own recovery tokens" ON account_recovery_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for credential_backups
CREATE POLICY "Users can view their own credential backups" ON credential_backups
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for security_audit_log
CREATE POLICY "Users can view their own audit logs" ON security_audit_log
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for account_lockout_history
CREATE POLICY "Users can view their own lockout history" ON account_lockout_history
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policies for recovery_sessions
CREATE POLICY "Users can view their own recovery sessions" ON recovery_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 11. SCHEDULED CLEANUP JOB
-- =====================================================

-- Create a scheduled job to clean up expired tokens (if pg_cron is available)
-- SELECT cron.schedule('cleanup-expired-tokens', '0 2 * * *', 'SELECT cleanup_expired_tokens();');

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE 'FloWorx Account Recovery System database schema has been successfully created!';
    RAISE NOTICE 'Tables created: password_reset_tokens, account_recovery_tokens, credential_backups, security_audit_log, account_lockout_history, recovery_sessions';
    RAISE NOTICE 'Functions created: create_password_reset_token, validate_password_reset_token, cleanup_expired_tokens';
    RAISE NOTICE 'RLS policies have been enabled for all recovery tables';
    RAISE NOTICE 'Remember to run cleanup_expired_tokens() periodically to maintain database performance';
END $$;
