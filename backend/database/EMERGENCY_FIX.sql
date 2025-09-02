-- EMERGENCY FIX for FloWorx Account Recovery System
-- Run this IMMEDIATELY to fix the "relation does not exist" errors
-- This creates only the essential tables and columns needed

-- =====================================================
-- 1. CREATE MISSING TABLES IMMEDIATELY
-- =====================================================

-- Create account_lockout_history table (the one causing the error)
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
    unlocked_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create other essential tables
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

CREATE TABLE IF NOT EXISTS account_recovery_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    recovery_type VARCHAR(50) NOT NULL CHECK (recovery_type IN ('email_change', 'account_recovery', 'emergency_access', 'account_lockout')),
    recovery_data JSONB,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    verification_attempts INTEGER DEFAULT 0,
    max_verification_attempts INTEGER DEFAULT 5
);

CREATE TABLE IF NOT EXISTS credential_backups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_name VARCHAR(100) NOT NULL,
    backup_data JSONB NOT NULL,
    backup_type VARCHAR(50) NOT NULL CHECK (backup_type IN ('oauth_refresh', 'api_keys', 'backup_codes', 'security_questions')),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

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

-- =====================================================
-- 2. ADD MISSING COLUMNS TO USERS TABLE
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
ADD COLUMN IF NOT EXISTS backup_codes TEXT[],
ADD COLUMN IF NOT EXISTS security_questions JSONB;

-- =====================================================
-- 3. CREATE ESSENTIAL INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_account_recovery_tokens_user_id ON account_recovery_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_account_recovery_tokens_token ON account_recovery_tokens(token);
CREATE INDEX IF NOT EXISTS idx_credential_backups_user_id ON credential_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_account_lockout_history_user_id ON account_lockout_history(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_sessions_user_id ON recovery_sessions(user_id);

-- =====================================================
-- 4. SIMPLE RLS POLICIES (NO AUTH DEPENDENCY)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_recovery_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_lockout_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_sessions ENABLE ROW LEVEL SECURITY;

-- Create simple policies that allow service role full access
CREATE POLICY "Allow service role full access" ON password_reset_tokens
    FOR ALL USING (current_setting('role') IN ('service_role', 'postgres'));

CREATE POLICY "Allow service role full access" ON account_recovery_tokens
    FOR ALL USING (current_setting('role') IN ('service_role', 'postgres'));

CREATE POLICY "Allow service role full access" ON credential_backups
    FOR ALL USING (current_setting('role') IN ('service_role', 'postgres'));

CREATE POLICY "Allow service role full access" ON security_audit_log
    FOR ALL USING (current_setting('role') IN ('service_role', 'postgres'));

CREATE POLICY "Allow service role full access" ON account_lockout_history
    FOR ALL USING (current_setting('role') IN ('service_role', 'postgres'));

CREATE POLICY "Allow service role full access" ON recovery_sessions
    FOR ALL USING (current_setting('role') IN ('service_role', 'postgres'));

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================
-- 6. SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ EMERGENCY FIX COMPLETED SUCCESSFULLY!';
    RAISE NOTICE 'All required tables have been created.';
    RAISE NOTICE 'RLS policies are active with service role access.';
    RAISE NOTICE 'Your account recovery system should now work without errors.';
END $$;
