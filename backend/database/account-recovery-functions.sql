-- FloWorx Account Recovery System - SECURE FUNCTIONS
-- Optimized and secure database functions for account recovery
-- Run this AFTER the migration and RLS policies

-- =====================================================
-- 1. DROP EXISTING FUNCTIONS (SAFE)
-- =====================================================

DROP FUNCTION IF EXISTS create_password_reset_token(UUID, VARCHAR(255), TIMESTAMP WITH TIME ZONE, INET, TEXT);
DROP FUNCTION IF EXISTS validate_password_reset_token(VARCHAR(255), INET, TEXT);
DROP FUNCTION IF EXISTS cleanup_expired_tokens();
DROP FUNCTION IF EXISTS log_security_event(UUID, VARCHAR(100), VARCHAR(50), VARCHAR(255), INET, TEXT, BOOLEAN, JSONB);

-- =====================================================
-- 2. ENHANCED PASSWORD RESET TOKEN FUNCTIONS
-- =====================================================

-- Function to create password reset token with enhanced rate limiting
CREATE OR REPLACE FUNCTION create_password_reset_token(
    p_user_id UUID,
    p_token VARCHAR(255),
    p_expires_at TIMESTAMP WITH TIME ZONE,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS TABLE(success BOOLEAN, message TEXT, token_id UUID, rate_limited BOOLEAN) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_recent_count INTEGER;
    v_token_id UUID;
    v_user_exists BOOLEAN;
BEGIN
    -- Verify user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO v_user_exists;
    IF NOT v_user_exists THEN
        RETURN QUERY SELECT false, 'User not found', NULL::UUID, false;
        RETURN;
    END IF;

    -- Enhanced rate limiting: Check for recent token requests
    SELECT COUNT(*) INTO v_recent_count
    FROM password_reset_tokens
    WHERE user_id = p_user_id 
    AND created_at > CURRENT_TIMESTAMP - INTERVAL '15 minutes'
    AND NOT used;

    -- Rate limit: max 3 requests per 15 minutes
    IF v_recent_count >= 3 THEN
        RETURN QUERY SELECT false, 'Too many recent password reset requests. Please wait 15 minutes.', NULL::UUID, true;
        RETURN;
    END IF;

    -- Invalidate existing unused tokens for this user (security best practice)
    UPDATE password_reset_tokens 
    SET used = true, used_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id AND NOT used;

    -- Create new token
    INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address, user_agent)
    VALUES (p_user_id, p_token, p_expires_at, p_ip_address, p_user_agent)
    RETURNING id INTO v_token_id;

    RETURN QUERY SELECT true, 'Password reset token created successfully.', v_token_id, false;
END;
$$ LANGUAGE plpgsql;

-- Function to validate password reset token with enhanced security
CREATE OR REPLACE FUNCTION validate_password_reset_token(
    p_token VARCHAR(255),
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS TABLE(
    valid BOOLEAN, 
    user_id UUID, 
    message TEXT, 
    attempts_remaining INTEGER,
    user_email VARCHAR(255)
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token_record RECORD;
    v_attempts_remaining INTEGER;
    v_user_email VARCHAR(255);
BEGIN
    -- Get token record with user info
    SELECT 
        prt.*,
        u.email
    INTO v_token_record
    FROM password_reset_tokens prt
    JOIN users u ON prt.user_id = u.id
    WHERE prt.token = p_token;

    -- Check if token exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Invalid token.', 0, NULL::VARCHAR(255);
        RETURN;
    END IF;

    -- Check if token is already used
    IF v_token_record.used THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Token has already been used.', 0, NULL::VARCHAR(255);
        RETURN;
    END IF;

    -- Check if token is expired
    IF v_token_record.expires_at < CURRENT_TIMESTAMP THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Token has expired.', 0, NULL::VARCHAR(255);
        RETURN;
    END IF;

    -- Check attempt count
    IF v_token_record.attempt_count >= v_token_record.max_attempts THEN
        RETURN QUERY SELECT false, NULL::UUID, 'Too many verification attempts.', 0, NULL::VARCHAR(255);
        RETURN;
    END IF;

    -- Increment attempt count
    UPDATE password_reset_tokens 
    SET attempt_count = attempt_count + 1
    WHERE id = v_token_record.id;

    v_attempts_remaining := v_token_record.max_attempts - v_token_record.attempt_count - 1;

    RETURN QUERY SELECT 
        true, 
        v_token_record.user_id, 
        'Token is valid.', 
        v_attempts_remaining,
        v_token_record.email;
END;
$$ LANGUAGE plpgsql;

-- Function to mark password reset token as used
CREATE OR REPLACE FUNCTION mark_password_reset_token_used(
    p_token VARCHAR(255),
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    UPDATE password_reset_tokens 
    SET 
        used = true, 
        used_at = CURRENT_TIMESTAMP
    WHERE token = p_token 
    AND NOT used 
    AND expires_at > CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN v_updated_count > 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. ACCOUNT LOCKOUT FUNCTIONS
-- =====================================================

-- Function to handle failed login attempts with progressive lockout
CREATE OR REPLACE FUNCTION handle_failed_login(
    p_user_id UUID,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS TABLE(
    account_locked BOOLEAN,
    lockout_until TIMESTAMP WITH TIME ZONE,
    failed_attempts INTEGER,
    lockout_duration_minutes INTEGER
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_attempts INTEGER;
    v_lockout_until TIMESTAMP WITH TIME ZONE;
    v_lockout_duration INTEGER;
    v_progressive_multiplier INTEGER := 2;
    v_base_lockout_minutes INTEGER := 15;
BEGIN
    -- Get current failed attempts
    SELECT 
        COALESCE(failed_login_attempts, 0),
        account_locked_until
    INTO v_current_attempts, v_lockout_until
    FROM users 
    WHERE id = p_user_id;

    -- Reset attempts if lockout has expired
    IF v_lockout_until IS NOT NULL AND v_lockout_until <= CURRENT_TIMESTAMP THEN
        v_current_attempts := 0;
        v_lockout_until := NULL;
    END IF;

    -- Increment failed attempts
    v_current_attempts := v_current_attempts + 1;

    -- Calculate progressive lockout duration
    IF v_current_attempts >= 5 THEN
        v_lockout_duration := v_base_lockout_minutes * POWER(v_progressive_multiplier, (v_current_attempts - 5));
        -- Cap at 24 hours
        v_lockout_duration := LEAST(v_lockout_duration, 1440);
        v_lockout_until := CURRENT_TIMESTAMP + (v_lockout_duration || ' minutes')::INTERVAL;
    END IF;

    -- Update user record
    UPDATE users 
    SET 
        failed_login_attempts = v_current_attempts,
        account_locked_until = v_lockout_until,
        last_failed_login = CURRENT_TIMESTAMP
    WHERE id = p_user_id;

    -- Log lockout event if account is locked
    IF v_lockout_until IS NOT NULL THEN
        INSERT INTO account_lockout_history (
            user_id, lockout_reason, locked_at, lockout_duration_minutes, 
            failed_attempts_count, ip_address, user_agent
        ) VALUES (
            p_user_id, 'excessive_failed_logins', CURRENT_TIMESTAMP, 
            v_lockout_duration, v_current_attempts, p_ip_address, p_user_agent
        );
    END IF;

    RETURN QUERY SELECT 
        (v_lockout_until IS NOT NULL),
        v_lockout_until,
        v_current_attempts,
        COALESCE(v_lockout_duration, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to reset failed login attempts (on successful login)
CREATE OR REPLACE FUNCTION reset_failed_login_attempts(
    p_user_id UUID
) RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE users 
    SET 
        failed_login_attempts = 0,
        account_locked_until = NULL,
        last_successful_login = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. SECURITY AUDIT LOGGING FUNCTION
-- =====================================================

-- Enhanced security event logging function
CREATE OR REPLACE FUNCTION log_security_event(
    p_user_id UUID,
    p_action VARCHAR(100),
    p_resource_type VARCHAR(50) DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_success BOOLEAN DEFAULT true,
    p_details JSONB DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL,
    p_risk_score INTEGER DEFAULT 0
) RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_log_id UUID;
BEGIN
    -- Validate risk score
    p_risk_score := GREATEST(0, LEAST(100, COALESCE(p_risk_score, 0)));
    
    INSERT INTO security_audit_log (
        user_id, action, resource_type, resource_id, 
        ip_address, user_agent, success, details, 
        session_id, risk_score
    ) VALUES (
        p_user_id, p_action, p_resource_type, p_resource_id,
        p_ip_address, p_user_agent, p_success, p_details,
        p_session_id, p_risk_score
    ) RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. CLEANUP FUNCTIONS
-- =====================================================

-- Enhanced cleanup function with detailed reporting
CREATE OR REPLACE FUNCTION cleanup_expired_tokens() 
RETURNS TABLE(
    table_name TEXT,
    deleted_count INTEGER,
    cleanup_timestamp TIMESTAMP WITH TIME ZONE
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted_count INTEGER;
    v_cleanup_time TIMESTAMP WITH TIME ZONE := CURRENT_TIMESTAMP;
BEGIN
    -- Clean up expired password reset tokens
    DELETE FROM password_reset_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '24 hours';
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'password_reset_tokens'::TEXT, v_deleted_count, v_cleanup_time;

    -- Clean up expired account recovery tokens
    DELETE FROM account_recovery_tokens 
    WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '24 hours';
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'account_recovery_tokens'::TEXT, v_deleted_count, v_cleanup_time;

    -- Clean up expired recovery sessions
    DELETE FROM recovery_sessions 
    WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '24 hours';
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'recovery_sessions'::TEXT, v_deleted_count, v_cleanup_time;

    -- Clean up old audit logs (keep 90 days)
    DELETE FROM security_audit_log 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'security_audit_log'::TEXT, v_deleted_count, v_cleanup_time;

    -- Clean up old lockout history (keep 1 year)
    DELETE FROM account_lockout_history 
    WHERE locked_at < CURRENT_TIMESTAMP - INTERVAL '1 year';
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'account_lockout_history'::TEXT, v_deleted_count, v_cleanup_time;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. GRANT EXECUTE PERMISSIONS
-- =====================================================

-- Grant execute permissions to appropriate roles
GRANT EXECUTE ON FUNCTION create_password_reset_token(UUID, VARCHAR(255), TIMESTAMP WITH TIME ZONE, INET, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION validate_password_reset_token(VARCHAR(255), INET, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION mark_password_reset_token_used(VARCHAR(255), INET, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION handle_failed_login(UUID, INET, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION reset_failed_login_attempts(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION log_security_event(UUID, VARCHAR(100), VARCHAR(50), UUID, INET, TEXT, BOOLEAN, JSONB, VARCHAR(255), INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_expired_tokens() TO service_role;

-- =====================================================
-- 7. COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Account Recovery Functions have been created successfully!';
    RAISE NOTICE 'Functions are optimized for security and performance.';
    RAISE NOTICE 'All functions use SECURITY DEFINER for proper privilege escalation.';
    RAISE NOTICE 'Setup is now complete - you can deploy the account recovery system!';
END $$;
