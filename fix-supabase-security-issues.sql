-- =====================================================
-- SUPABASE SECURITY FIXES
-- Addresses all Security Advisor warnings
-- =====================================================

-- Enable RLS on all tables that don't have it
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_notifications ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR USER DATA PROTECTION
-- =====================================================

-- Users table policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can manage users" ON public.users;
CREATE POLICY "Service role can manage users" ON public.users
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Credentials table policies
DROP POLICY IF EXISTS "Users can view own credentials" ON public.credentials;
CREATE POLICY "Users can view own credentials" ON public.credentials
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own credentials" ON public.credentials;
CREATE POLICY "Users can manage own credentials" ON public.credentials
    FOR ALL USING (auth.uid() = user_id);

-- Business configurations policies
DROP POLICY IF EXISTS "Users can view own business config" ON public.business_configurations;
CREATE POLICY "Users can view own business config" ON public.business_configurations
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own business config" ON public.business_configurations;
CREATE POLICY "Users can manage own business config" ON public.business_configurations
    FOR ALL USING (auth.uid() = user_id);

-- Workflow templates policies (public read, admin write)
DROP POLICY IF EXISTS "Anyone can view workflow templates" ON public.workflow_templates;
CREATE POLICY "Anyone can view workflow templates" ON public.workflow_templates
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage templates" ON public.workflow_templates;
CREATE POLICY "Service role can manage templates" ON public.workflow_templates
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- User workflows policies
DROP POLICY IF EXISTS "Users can view own workflows" ON public.user_workflows;
CREATE POLICY "Users can view own workflows" ON public.user_workflows
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own workflows" ON public.user_workflows;
CREATE POLICY "Users can manage own workflows" ON public.user_workflows
    FOR ALL USING (auth.uid() = user_id);

-- Audit logs policies (read-only for users, full access for service)
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage audit logs" ON public.audit_logs;
CREATE POLICY "Service role can manage audit logs" ON public.audit_logs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Onboarding sessions policies
DROP POLICY IF EXISTS "Users can view own onboarding" ON public.onboarding_sessions;
CREATE POLICY "Users can view own onboarding" ON public.onboarding_sessions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own onboarding" ON public.onboarding_sessions;
CREATE POLICY "Users can manage own onboarding" ON public.onboarding_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Team notifications policies
DROP POLICY IF EXISTS "Users can view own notifications" ON public.team_notifications;
CREATE POLICY "Users can view own notifications" ON public.team_notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own notifications" ON public.team_notifications;
CREATE POLICY "Users can manage own notifications" ON public.team_notifications
    FOR ALL USING (auth.uid() = user_id);

-- Password reset tokens policies (service role only)
DROP POLICY IF EXISTS "Service role can manage password resets" ON public.password_reset_tokens;
CREATE POLICY "Service role can manage password resets" ON public.password_reset_tokens
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Business types policies (public read)
DROP POLICY IF EXISTS "Anyone can view business types" ON public.business_types;
CREATE POLICY "Anyone can view business types" ON public.business_types
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role can manage business types" ON public.business_types;
CREATE POLICY "Service role can manage business types" ON public.business_types
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- FUNCTION SECURITY FIXES
-- =====================================================

-- Fix search path for security functions
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.password_reset_tokens 
    WHERE expires_at < NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.log_security_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, details, created_at)
    VALUES (p_user_id, p_event_type, p_details, NOW());
END;
$$;

CREATE OR REPLACE FUNCTION public.get_active_business_types()
RETURNS TABLE(id UUID, name TEXT, description TEXT, config JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT bt.id, bt.name, bt.description, bt.config
    FROM public.business_types bt
    WHERE bt.is_active = true
    ORDER BY bt.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_workflow_templates(p_business_type_id UUID)
RETURNS TABLE(id UUID, name TEXT, description TEXT, config JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT wt.id, wt.name, wt.description, wt.config
    FROM public.workflow_templates wt
    WHERE wt.business_type_id = p_business_type_id
      AND wt.is_active = true
    ORDER BY wt.name;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_business_config(p_config JSONB)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Basic validation - ensure required fields exist
    IF p_config ? 'business_type' AND p_config ? 'settings' THEN
        RETURN true;
    END IF;
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_credentials(p_user_id UUID)
RETURNS TABLE(service_name TEXT, is_valid BOOLEAN, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow users to see their own credentials
    IF auth.uid() != p_user_id AND auth.jwt() ->> 'role' != 'service_role' THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    RETURN QUERY
    SELECT c.service_name, 
           (c.expiry_date IS NULL OR c.expiry_date > NOW()) as is_valid,
           c.expiry_date as expires_at
    FROM public.credentials c
    WHERE c.user_id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_business_config(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    config_result JSONB;
BEGIN
    -- Only allow users to see their own config
    IF auth.uid() != p_user_id AND auth.jwt() ->> 'role' != 'service_role' THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    SELECT bc.config INTO config_result
    FROM public.business_configurations bc
    WHERE bc.user_id = p_user_id;
    
    RETURN COALESCE(config_result, '{}'::jsonb);
END;
$$;

-- =====================================================
-- SECURE VIEW REPLACEMENTS
-- =====================================================

-- Replace security definer views with secure functions
DROP VIEW IF EXISTS public.v_user_login_performance;

CREATE OR REPLACE FUNCTION public.get_user_login_stats(p_user_id UUID)
RETURNS TABLE(
    total_logins BIGINT,
    last_login TIMESTAMPTZ,
    avg_session_duration INTERVAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow users to see their own stats
    IF auth.uid() != p_user_id AND auth.jwt() ->> 'role' != 'service_role' THEN
        RAISE EXCEPTION 'Access denied';
    END IF;
    
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_logins,
        MAX(al.created_at) as last_login,
        AVG(EXTRACT(EPOCH FROM (al.created_at - LAG(al.created_at) OVER (ORDER BY al.created_at)))::INTERVAL) as avg_session_duration
    FROM public.audit_logs al
    WHERE al.user_id = p_user_id 
      AND al.action = 'login';
END;
$$;

-- =====================================================
-- GRANT APPROPRIATE PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_active_business_types() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workflow_templates(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_business_config(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_credentials(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_business_config(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_login_stats(UUID) TO authenticated;

-- Grant service role permissions
GRANT EXECUTE ON FUNCTION public.cleanup_expired_tokens() TO service_role;
GRANT EXECUTE ON FUNCTION public.log_security_event(UUID, TEXT, JSONB) TO service_role;

-- =====================================================
-- SECURITY VALIDATION
-- =====================================================

-- Verify all tables have RLS enabled
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = table_record.schemaname
            AND c.relname = table_record.tablename
            AND c.relrowsecurity = true
        ) THEN
            RAISE NOTICE 'Table %.% does not have RLS enabled', table_record.schemaname, table_record.tablename;
        END IF;
    END LOOP;
END;
$$;
