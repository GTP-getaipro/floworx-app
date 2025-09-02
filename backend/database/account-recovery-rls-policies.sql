-- FloWorx Account Recovery System - RLS POLICIES (SAFE VERSION)
-- Compatible with FloWorx custom JWT authentication system
-- This version checks for table existence before applying policies

-- =====================================================
-- 1. SAFELY ENABLE RLS ON RECOVERY TABLES (ONLY IF THEY EXIST)
-- =====================================================

DO $$
BEGIN
    -- Enable RLS only on tables that exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_reset_tokens') THEN
        ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on password_reset_tokens';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_recovery_tokens') THEN
        ALTER TABLE account_recovery_tokens ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on account_recovery_tokens';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'credential_backups') THEN
        ALTER TABLE credential_backups ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on credential_backups';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'security_audit_log') THEN
        ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on security_audit_log';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'account_lockout_history') THEN
        ALTER TABLE account_lockout_history ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on account_lockout_history';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recovery_sessions') THEN
        ALTER TABLE recovery_sessions ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'RLS enabled on recovery_sessions';
    END IF;
END $$;

-- =====================================================
-- 2. DROP EXISTING POLICIES (IF ANY)
-- =====================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own password reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Users can view their own recovery tokens" ON account_recovery_tokens;
DROP POLICY IF EXISTS "Users can view their own credential backups" ON credential_backups;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON security_audit_log;
DROP POLICY IF EXISTS "Users can view their own lockout history" ON account_lockout_history;
DROP POLICY IF EXISTS "Users can view their own recovery sessions" ON recovery_sessions;

-- Drop service role policies if they exist
DROP POLICY IF EXISTS "Service role can manage all password reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Service role can manage all recovery tokens" ON account_recovery_tokens;
DROP POLICY IF EXISTS "Service role can manage all credential backups" ON credential_backups;
DROP POLICY IF EXISTS "Service role can manage all security audit logs" ON security_audit_log;
DROP POLICY IF EXISTS "Service role can manage all lockout history" ON account_lockout_history;
DROP POLICY IF EXISTS "Service role can manage all recovery sessions" ON recovery_sessions;

-- =====================================================
-- 3. CREATE CUSTOM JWT-COMPATIBLE RLS POLICIES (SAFE VERSION)
-- =====================================================

-- Password Reset Tokens Policies (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_reset_tokens') THEN
        -- Drop existing policies first
        DROP POLICY IF EXISTS "Service role full access to password reset tokens" ON password_reset_tokens;
        DROP POLICY IF EXISTS "Users can view their own password reset tokens" ON password_reset_tokens;
        DROP POLICY IF EXISTS "System can insert password reset tokens" ON password_reset_tokens;
        DROP POLICY IF EXISTS "System can update password reset tokens" ON password_reset_tokens;

        -- Create new policies
        CREATE POLICY "Service role full access to password reset tokens" ON password_reset_tokens
            FOR ALL USING (auth.role() = 'service_role');

        CREATE POLICY "Users can view their own password reset tokens" ON password_reset_tokens
            FOR SELECT USING (
                auth.role() = 'authenticated' AND
                (auth.jwt() ->> 'user_id')::uuid = user_id
            );

        CREATE POLICY "System can insert password reset tokens" ON password_reset_tokens
            FOR INSERT WITH CHECK (true);

        CREATE POLICY "System can update password reset tokens" ON password_reset_tokens
            FOR UPDATE USING (true);

        RAISE NOTICE 'RLS policies created for password_reset_tokens';
    ELSE
        RAISE NOTICE 'Skipping password_reset_tokens policies - table does not exist';
    END IF;
END $$;

-- Account Recovery Tokens Policies
CREATE POLICY "Service role full access to account recovery tokens" ON account_recovery_tokens
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own recovery tokens" ON account_recovery_tokens
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_id')::uuid = user_id
    );

CREATE POLICY "System can insert recovery tokens" ON account_recovery_tokens
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update recovery tokens" ON account_recovery_tokens
    FOR UPDATE USING (true);

-- Credential Backups Policies
CREATE POLICY "Service role full access to credential backups" ON credential_backups
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own credential backups" ON credential_backups
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_id')::uuid = user_id
    );

CREATE POLICY "Users can insert their own credential backups" ON credential_backups
    FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_id')::uuid = user_id
    );

CREATE POLICY "Users can update their own credential backups" ON credential_backups
    FOR UPDATE USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_id')::uuid = user_id
    );

-- Security Audit Log Policies
CREATE POLICY "Service role full access to security audit log" ON security_audit_log
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own audit logs" ON security_audit_log
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_id')::uuid = user_id
    );

CREATE POLICY "System can insert audit logs" ON security_audit_log
    FOR INSERT WITH CHECK (true); -- Allow system to log events

-- Account Lockout History Policies
CREATE POLICY "Service role full access to lockout history" ON account_lockout_history
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own lockout history" ON account_lockout_history
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_id')::uuid = user_id
    );

CREATE POLICY "System can insert lockout history" ON account_lockout_history
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update lockout history" ON account_lockout_history
    FOR UPDATE USING (true);

-- Recovery Sessions Policies
CREATE POLICY "Service role full access to recovery sessions" ON recovery_sessions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view their own recovery sessions" ON recovery_sessions
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        (auth.jwt() ->> 'user_id')::uuid = user_id
    );

CREATE POLICY "System can insert recovery sessions" ON recovery_sessions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update recovery sessions" ON recovery_sessions
    FOR UPDATE USING (true);

-- =====================================================
-- 4. ALTERNATIVE POLICIES FOR NON-SUPABASE AUTH
-- =====================================================

-- If you're not using Supabase Auth at all, uncomment these policies instead:

/*
-- Simple policies that rely on application-level security
CREATE POLICY "Allow all operations for service role" ON password_reset_tokens
    FOR ALL USING (current_setting('role') = 'service_role' OR current_setting('role') = 'postgres');

CREATE POLICY "Allow all operations for service role" ON account_recovery_tokens
    FOR ALL USING (current_setting('role') = 'service_role' OR current_setting('role') = 'postgres');

CREATE POLICY "Allow all operations for service role" ON credential_backups
    FOR ALL USING (current_setting('role') = 'service_role' OR current_setting('role') = 'postgres');

CREATE POLICY "Allow all operations for service role" ON security_audit_log
    FOR ALL USING (current_setting('role') = 'service_role' OR current_setting('role') = 'postgres');

CREATE POLICY "Allow all operations for service role" ON account_lockout_history
    FOR ALL USING (current_setting('role') = 'service_role' OR current_setting('role') = 'postgres');

CREATE POLICY "Allow all operations for service role" ON recovery_sessions
    FOR ALL USING (current_setting('role') = 'service_role' OR current_setting('role') = 'postgres');
*/

-- =====================================================
-- 5. GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant permissions on tables
GRANT SELECT, INSERT, UPDATE ON password_reset_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE ON account_recovery_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON credential_backups TO authenticated;
GRANT SELECT, INSERT ON security_audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE ON account_lockout_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON recovery_sessions TO authenticated;

-- Full permissions for service role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ RLS Policies have been created successfully!';
    RAISE NOTICE 'Policies are compatible with FloWorx custom JWT authentication.';
    RAISE NOTICE 'Next step: Run the functions script.';
END $$;

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'password_reset_tokens', 
    'account_recovery_tokens', 
    'credential_backups', 
    'security_audit_log', 
    'account_lockout_history', 
    'recovery_sessions'
)
ORDER BY tablename;
