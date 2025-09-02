-- Floworx Password Reset System - Row Level Security Policies
-- Run this AFTER the main password reset migration completes successfully

-- =====================================================
-- ENABLE RLS ON NEW SECURITY TABLES
-- =====================================================

-- Enable RLS on all new security tables
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_recovery_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE credential_backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR PASSWORD RESET TOKENS
-- =====================================================

-- Users can only access their own password reset tokens
CREATE POLICY "Users can only access their own password reset tokens" 
ON password_reset_tokens 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Allow service role to manage all tokens (for cleanup functions)
CREATE POLICY "Service role can manage all password reset tokens" 
ON password_reset_tokens 
FOR ALL 
USING (auth.role() = 'service_role');

-- =====================================================
-- RLS POLICIES FOR ACCOUNT RECOVERY TOKENS
-- =====================================================

-- Users can only access their own account recovery tokens
CREATE POLICY "Users can only access their own account recovery tokens" 
ON account_recovery_tokens 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Allow service role to manage all tokens
CREATE POLICY "Service role can manage all account recovery tokens" 
ON account_recovery_tokens 
FOR ALL 
USING (auth.role() = 'service_role');

-- =====================================================
-- RLS POLICIES FOR CREDENTIAL BACKUPS
-- =====================================================

-- Users can only access their own credential backups
CREATE POLICY "Users can only access their own credential backups" 
ON credential_backups 
FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- Allow service role to manage all backups
CREATE POLICY "Service role can manage all credential backups" 
ON credential_backups 
FOR ALL 
USING (auth.role() = 'service_role');

-- =====================================================
-- RLS POLICIES FOR SECURITY AUDIT LOG
-- =====================================================

-- Users can read their own audit logs (read-only for users)
CREATE POLICY "Users can read their own security audit logs" 
ON security_audit_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow service role to manage all audit logs
CREATE POLICY "Service role can manage all security audit logs" 
ON security_audit_log 
FOR ALL 
USING (auth.role() = 'service_role');

-- Allow authenticated users to insert their own audit logs
CREATE POLICY "Users can insert their own security audit logs" 
ON security_audit_log 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- ADDITIONAL SECURITY FUNCTIONS
-- =====================================================

-- Function to safely get user's password reset tokens (respects RLS)
CREATE OR REPLACE FUNCTION get_user_password_reset_tokens(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    token VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    used BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) 
SECURITY DEFINER
AS $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Use provided user_id or current authenticated user
    target_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Ensure user can only access their own tokens
    IF target_user_id != auth.uid() AND auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Access denied: Cannot access other users password reset tokens';
    END IF;
    
    RETURN QUERY
    SELECT 
        prt.id,
        prt.token,
        prt.expires_at,
        prt.used,
        prt.created_at
    FROM password_reset_tokens prt
    WHERE prt.user_id = target_user_id
    AND prt.expires_at > CURRENT_TIMESTAMP
    AND prt.used = false
    ORDER BY prt.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to safely create password reset token
CREATE OR REPLACE FUNCTION create_password_reset_token(
    p_user_id UUID,
    p_token VARCHAR(255),
    p_expires_at TIMESTAMP WITH TIME ZONE,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
AS $$
DECLARE
    token_id UUID;
BEGIN
    -- Ensure user can only create tokens for themselves (unless service role)
    IF p_user_id != auth.uid() AND auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Access denied: Cannot create password reset tokens for other users';
    END IF;
    
    -- Invalidate any existing unused tokens for this user
    UPDATE password_reset_tokens 
    SET used = true, used_at = CURRENT_TIMESTAMP
    WHERE user_id = p_user_id AND used = false;
    
    -- Create new token
    INSERT INTO password_reset_tokens (
        user_id, token, expires_at, ip_address, user_agent
    ) VALUES (
        p_user_id, p_token, p_expires_at, p_ip_address, p_user_agent
    ) RETURNING id INTO token_id;
    
    -- Log the security event
    PERFORM log_security_event(
        p_user_id,
        'password_reset_token_created',
        'password_reset_token',
        token_id::VARCHAR,
        p_ip_address,
        p_user_agent,
        true,
        jsonb_build_object('expires_at', p_expires_at)
    );
    
    RETURN token_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate and use password reset token
CREATE OR REPLACE FUNCTION use_password_reset_token(
    p_token VARCHAR(255),
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
    valid BOOLEAN,
    user_id UUID,
    message TEXT
)
SECURITY DEFINER
AS $$
DECLARE
    token_record RECORD;
    result_user_id UUID;
    result_valid BOOLEAN := false;
    result_message TEXT;
BEGIN
    -- Find the token
    SELECT * INTO token_record
    FROM password_reset_tokens
    WHERE token = p_token;
    
    IF NOT FOUND THEN
        result_message := 'Invalid token';
    ELSIF token_record.used THEN
        result_message := 'Token has already been used';
    ELSIF token_record.expires_at < CURRENT_TIMESTAMP THEN
        result_message := 'Token has expired';
    ELSE
        -- Token is valid, mark as used
        UPDATE password_reset_tokens
        SET used = true, used_at = CURRENT_TIMESTAMP,
            ip_address = p_ip_address, user_agent = p_user_agent
        WHERE id = token_record.id;
        
        result_valid := true;
        result_user_id := token_record.user_id;
        result_message := 'Token is valid';
        
        -- Log successful token usage
        PERFORM log_security_event(
            token_record.user_id,
            'password_reset_token_used',
            'password_reset_token',
            token_record.id::VARCHAR,
            p_ip_address,
            p_user_agent,
            true,
            jsonb_build_object('token_created_at', token_record.created_at)
        );
    END IF;
    
    -- Log failed attempts
    IF NOT result_valid THEN
        PERFORM log_security_event(
            token_record.user_id,
            'password_reset_token_invalid',
            'password_reset_token',
            COALESCE(token_record.id::VARCHAR, 'unknown'),
            p_ip_address,
            p_user_agent,
            false,
            jsonb_build_object('reason', result_message, 'token_provided', p_token)
        );
    END IF;
    
    RETURN QUERY SELECT result_valid, result_user_id, result_message;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VERIFY RLS POLICIES
-- =====================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('password_reset_tokens', 'account_recovery_tokens', 'credential_backups', 'security_audit_log')
ORDER BY tablename, policyname;
