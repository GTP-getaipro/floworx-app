-- FloWorx Account Recovery System - SAFE MIGRATION SCRIPT
-- This script safely migrates existing tables and creates new ones without conflicts
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. PRE-MIGRATION CHECKS
-- =====================================================

-- Check if tables already exist and their structure
DO $$
DECLARE
    table_exists BOOLEAN;
BEGIN
    -- Check for existing password_reset_tokens table
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'password_reset_tokens'
    ) INTO table_exists;
    
    IF table_exists THEN
        RAISE NOTICE 'password_reset_tokens table already exists - will be updated safely';
    ELSE
        RAISE NOTICE 'password_reset_tokens table will be created';
    END IF;
END $$;

-- =====================================================
-- 2. SAFE USERS TABLE UPDATES
-- =====================================================

-- Add recovery-related fields to existing users table (safe with IF NOT EXISTS)
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
-- 3. SAFE TABLE CREATION/UPDATES
-- =====================================================

-- Password Reset Tokens Table (Enhanced)
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

-- Safely add new columns to existing password_reset_tokens if they don't exist
DO $$
BEGIN
    -- Add attempt_count if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'password_reset_tokens' 
        AND column_name = 'attempt_count'
    ) THEN
        ALTER TABLE password_reset_tokens ADD COLUMN attempt_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add max_attempts if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'password_reset_tokens' 
        AND column_name = 'max_attempts'
    ) THEN
        ALTER TABLE password_reset_tokens ADD COLUMN max_attempts INTEGER DEFAULT 3;
    END IF;
END $$;

-- Account Recovery Tokens Table
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

-- Update existing account_recovery_tokens if needed
DO $$
BEGIN
    -- Add account_lockout to recovery_type check constraint if not present
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_recovery_tokens') THEN
        -- Drop old constraint if exists
        ALTER TABLE account_recovery_tokens DROP CONSTRAINT IF EXISTS account_recovery_tokens_recovery_type_check;
        -- Add new constraint
        ALTER TABLE account_recovery_tokens ADD CONSTRAINT account_recovery_tokens_recovery_type_check 
            CHECK (recovery_type IN ('email_change', 'account_recovery', 'emergency_access', 'account_lockout'));
    END IF;
END $$;

-- Credential Backups Table
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

-- Security Audit Log Table (Handle existing table safely)
DO $$
BEGIN
    -- Check if security_audit_log exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_audit_log') THEN
        -- Create new table
        CREATE TABLE security_audit_log (
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
    ELSE
        -- Update existing table safely
        -- Add risk_score column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'security_audit_log' 
            AND column_name = 'risk_score'
        ) THEN
            ALTER TABLE security_audit_log ADD COLUMN risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100);
        END IF;
        
        -- Add session_id column if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'security_audit_log' 
            AND column_name = 'session_id'
        ) THEN
            ALTER TABLE security_audit_log ADD COLUMN session_id VARCHAR(255);
        END IF;
        
        -- Update resource_id to UUID if it's currently VARCHAR
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'security_audit_log' 
            AND column_name = 'resource_id' 
            AND data_type = 'character varying'
        ) THEN
            -- This is a potentially breaking change, so we'll add a comment
            -- ALTER TABLE security_audit_log ALTER COLUMN resource_id TYPE UUID USING resource_id::UUID;
            RAISE NOTICE 'WARNING: security_audit_log.resource_id is VARCHAR but should be UUID. Manual intervention may be required.';
        END IF;
    END IF;
END $$;

-- Account Lockout History Table
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

-- Recovery Sessions Table
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
-- 4. CREATE INDEXES SAFELY
-- =====================================================

-- Password reset tokens indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Account recovery tokens indexes
CREATE INDEX IF NOT EXISTS idx_account_recovery_tokens_user_id ON account_recovery_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_account_recovery_tokens_token ON account_recovery_tokens(token);
CREATE INDEX IF NOT EXISTS idx_account_recovery_tokens_type ON account_recovery_tokens(recovery_type);
CREATE INDEX IF NOT EXISTS idx_account_recovery_tokens_expires_at ON account_recovery_tokens(expires_at);

-- Credential backups indexes
CREATE INDEX IF NOT EXISTS idx_credential_backups_user_id ON credential_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_credential_backups_service ON credential_backups(service_name);
CREATE INDEX IF NOT EXISTS idx_credential_backups_type ON credential_backups(backup_type);

-- Security audit log indexes
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_action ON security_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_success ON security_audit_log(success);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_risk_score ON security_audit_log(risk_score);

-- Account lockout history indexes
CREATE INDEX IF NOT EXISTS idx_account_lockout_history_user_id ON account_lockout_history(user_id);
CREATE INDEX IF NOT EXISTS idx_account_lockout_history_locked_at ON account_lockout_history(locked_at);

-- Recovery sessions indexes
CREATE INDEX IF NOT EXISTS idx_recovery_sessions_user_id ON recovery_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_recovery_sessions_token ON recovery_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_recovery_sessions_expires_at ON recovery_sessions(expires_at);

-- =====================================================
-- 5. MIGRATION COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ FloWorx Account Recovery System - SAFE MIGRATION COMPLETED!';
    RAISE NOTICE 'All tables and columns have been created or updated safely.';
    RAISE NOTICE 'Next step: Run the RLS policies and functions script.';
END $$;
