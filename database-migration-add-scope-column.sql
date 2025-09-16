-- Floworx Database Migration: Add Scope Column to Credentials Table
-- This migration adds the missing 'scope' column to the credentials table
-- Run this in your Supabase SQL Editor

-- =====================================================
-- 1. ADD SCOPE COLUMN TO CREDENTIALS TABLE
-- =====================================================

-- Add scope column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'credentials' 
        AND column_name = 'scope'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.credentials 
        ADD COLUMN scope TEXT;
        
        RAISE NOTICE 'Added scope column to credentials table';
    ELSE
        RAISE NOTICE 'Scope column already exists in credentials table';
    END IF;
END $$;

-- =====================================================
-- 2. UPDATE EXISTING RECORDS WITH DEFAULT SCOPE
-- =====================================================

-- Update existing Google OAuth records with default Gmail scopes
UPDATE public.credentials 
SET scope = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify'
WHERE service_name = 'google' 
AND (scope IS NULL OR scope = '');

-- =====================================================
-- 3. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN public.credentials.scope IS 'OAuth scopes granted for this service connection (space-separated list)';

-- =====================================================
-- 4. VERIFY THE MIGRATION
-- =====================================================

-- Check if the column was added successfully
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'credentials' 
        AND column_name = 'scope'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE NOTICE '✅ Migration successful: scope column exists in credentials table';
    ELSE
        RAISE EXCEPTION '❌ Migration failed: scope column not found in credentials table';
    END IF;
END $$;

-- Display current credentials table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'credentials' 
AND table_schema = 'public'
ORDER BY ordinal_position;
