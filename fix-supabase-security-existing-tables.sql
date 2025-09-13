-- =====================================================
-- SUPABASE SECURITY FIXES - EXISTING TABLES ONLY
-- Addresses Security Advisor warnings for existing tables
-- =====================================================

-- Enable RLS on existing tables that don't have it
-- (Only enable if tables exist)
DO $$
BEGIN
    -- Enable RLS on users table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on credentials table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credentials') THEN
        ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on password_reset_tokens table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'password_reset_tokens') THEN
        ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on business_types table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_types') THEN
        ALTER TABLE public.business_types ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- =====================================================
-- RLS POLICIES FOR EXISTING TABLES
-- =====================================================

-- Users table policies (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
        DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
        DROP POLICY IF EXISTS "Service role can manage users" ON public.users;
        
        -- Create new policies
        CREATE POLICY "Users can view own profile" ON public.users
            FOR SELECT USING (auth.uid() = id);
            
        CREATE POLICY "Users can update own profile" ON public.users
            FOR UPDATE USING (auth.uid() = id);
            
        CREATE POLICY "Service role can manage users" ON public.users
            FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;
END $$;

-- Credentials table policies (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credentials') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own credentials" ON public.credentials;
        DROP POLICY IF EXISTS "Users can manage own credentials" ON public.credentials;
        
        -- Create new policies
        CREATE POLICY "Users can view own credentials" ON public.credentials
            FOR SELECT USING (auth.uid() = user_id);
            
        CREATE POLICY "Users can manage own credentials" ON public.credentials
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Password reset tokens policies (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'password_reset_tokens') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Service role can manage password resets" ON public.password_reset_tokens;
        
        -- Create new policies (service role only)
        CREATE POLICY "Service role can manage password resets" ON public.password_reset_tokens
            FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;
END $$;

-- Business types policies (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_types') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Anyone can view business types" ON public.business_types;
        DROP POLICY IF EXISTS "Service role can manage business types" ON public.business_types;
        
        -- Create new policies (public read, admin write)
        CREATE POLICY "Anyone can view business types" ON public.business_types
            FOR SELECT USING (true);
            
        CREATE POLICY "Service role can manage business types" ON public.business_types
            FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    END IF;
END $$;

-- =====================================================
-- FUNCTION SECURITY FIXES
-- =====================================================

-- Fix search path for cleanup function
CREATE OR REPLACE FUNCTION public.cleanup_expired_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only delete if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'password_reset_tokens') THEN
        DELETE FROM public.password_reset_tokens 
        WHERE expires_at < NOW();
    END IF;
END;
$$;

-- Secure function to get user credentials (if table exists)
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
    
    -- Only query if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credentials') THEN
        RETURN QUERY
        SELECT c.service_name, 
               (c.expiry_date IS NULL OR c.expiry_date > NOW()) as is_valid,
               c.expiry_date as expires_at
        FROM public.credentials c
        WHERE c.user_id = p_user_id;
    END IF;
END;
$$;

-- Secure function to get business types (if table exists)
CREATE OR REPLACE FUNCTION public.get_active_business_types()
RETURNS TABLE(id UUID, name TEXT, description TEXT, config JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only query if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'business_types') THEN
        RETURN QUERY
        SELECT bt.id, bt.name, bt.description, bt.config
        FROM public.business_types bt
        WHERE bt.is_active = true
        ORDER BY bt.name;
    END IF;
END;
$$;

-- Generic validation function
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

-- Updated at trigger function
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

-- =====================================================
-- GRANT APPROPRIATE PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_active_business_types() TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_business_config(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_credentials(UUID) TO authenticated;

-- Grant service role permissions
GRANT EXECUTE ON FUNCTION public.cleanup_expired_tokens() TO service_role;

-- =====================================================
-- SECURITY VALIDATION
-- =====================================================

-- List all tables and their RLS status
DO $$
DECLARE
    table_record RECORD;
    rls_enabled BOOLEAN;
BEGIN
    RAISE NOTICE 'SECURITY VALIDATION REPORT:';
    RAISE NOTICE '==========================';
    
    FOR table_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        SELECT c.relrowsecurity INTO rls_enabled
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = table_record.schemaname
        AND c.relname = table_record.tablename;
        
        IF rls_enabled THEN
            RAISE NOTICE '✅ Table %.%: RLS ENABLED', table_record.schemaname, table_record.tablename;
        ELSE
            RAISE NOTICE '❌ Table %.%: RLS DISABLED', table_record.schemaname, table_record.tablename;
        END IF;
    END LOOP;
    
    RAISE NOTICE '==========================';
    RAISE NOTICE 'Security fixes applied successfully!';
END;
$$;
