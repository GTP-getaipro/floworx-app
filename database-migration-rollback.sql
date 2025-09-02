-- Floworx Password Reset Migration ROLLBACK Script
-- Run this ONLY if you need to undo the password reset migration

-- =====================================================
-- 1. DROP FUNCTIONS
-- =====================================================
DROP FUNCTION IF EXISTS cleanup_expired_tokens();
DROP FUNCTION IF EXISTS log_security_event(UUID, VARCHAR(100), VARCHAR(50), VARCHAR(255), INET, TEXT, BOOLEAN, JSONB);

-- =====================================================
-- 2. DROP TABLES (in reverse dependency order)
-- =====================================================
DROP TABLE IF EXISTS security_audit_log;
DROP TABLE IF EXISTS credential_backups;
DROP TABLE IF EXISTS account_recovery_tokens;
DROP TABLE IF EXISTS password_reset_tokens;

-- =====================================================
-- 3. REMOVE COLUMNS FROM USERS TABLE
-- =====================================================
ALTER TABLE users 
DROP COLUMN IF EXISTS last_password_reset,
DROP COLUMN IF EXISTS failed_login_attempts,
DROP COLUMN IF EXISTS account_locked_until,
DROP COLUMN IF EXISTS recovery_email,
DROP COLUMN IF EXISTS two_factor_enabled,
DROP COLUMN IF EXISTS backup_codes;

-- =====================================================
-- 4. VERIFY ROLLBACK
-- =====================================================
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
    table_name IN ('password_reset_tokens', 'account_recovery_tokens', 'credential_backups', 'security_audit_log')
    OR (table_name = 'users' AND column_name IN ('last_password_reset', 'failed_login_attempts', 'account_locked_until', 'recovery_email', 'two_factor_enabled', 'backup_codes'))
)
ORDER BY table_name, ordinal_position;

-- This query should return NO ROWS if rollback was successful
