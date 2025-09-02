-- Migration: Add missing tables and columns for test compatibility
-- This migration aligns the database schema with test expectations

-- Add role column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'role') THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
    END IF;
END $$;

-- Create workflow_executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    execution_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    configuration JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create performance_metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    metric_data JSONB DEFAULT '{}',
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gmail_label_mappings table
CREATE TABLE IF NOT EXISTS gmail_label_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gmail_label_id VARCHAR(255) NOT NULL,
    gmail_label_name VARCHAR(255) NOT NULL,
    floworx_category VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, gmail_label_id)
);

-- Create business_profiles table
CREATE TABLE IF NOT EXISTS business_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    industry VARCHAR(100),
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create emails table
CREATE TABLE IF NOT EXISTS emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gmail_message_id VARCHAR(255) NOT NULL,
    thread_id VARCHAR(255),
    subject VARCHAR(500),
    sender_email VARCHAR(255),
    sender_name VARCHAR(255),
    recipient_emails TEXT[],
    body_text TEXT,
    body_html TEXT,
    received_at TIMESTAMP WITH TIME ZONE,
    labels TEXT[],
    category VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'normal',
    is_processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, gmail_message_id)
);

-- Create email_processing table
CREATE TABLE IF NOT EXISTS email_processing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    processing_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    result JSONB DEFAULT '{}',
    error_message TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create oauth_tokens table
CREATE TABLE IF NOT EXISTS oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create email_categories table
CREATE TABLE IF NOT EXISTS email_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',
    rules JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Enable Row Level Security (RLS) on all new tables
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_label_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_processing ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for multi-tenant security
-- Users can only access their own data

-- Workflow executions policies
CREATE POLICY "Users can view own workflow executions" ON workflow_executions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workflow executions" ON workflow_executions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workflow executions" ON workflow_executions
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workflow executions" ON workflow_executions
    FOR DELETE USING (auth.uid() = user_id);

-- Workflows policies
CREATE POLICY "Users can view own workflows" ON workflows
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workflows" ON workflows
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workflows" ON workflows
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workflows" ON workflows
    FOR DELETE USING (auth.uid() = user_id);

-- Performance metrics policies
CREATE POLICY "Users can view own performance metrics" ON performance_metrics
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own performance metrics" ON performance_metrics
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON notifications
    FOR DELETE USING (auth.uid() = user_id);

-- Gmail label mappings policies
CREATE POLICY "Users can view own gmail mappings" ON gmail_label_mappings
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own gmail mappings" ON gmail_label_mappings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own gmail mappings" ON gmail_label_mappings
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own gmail mappings" ON gmail_label_mappings
    FOR DELETE USING (auth.uid() = user_id);

-- Business profiles policies
CREATE POLICY "Users can view own business profiles" ON business_profiles
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own business profiles" ON business_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own business profiles" ON business_profiles
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own business profiles" ON business_profiles
    FOR DELETE USING (auth.uid() = user_id);

-- Emails policies
CREATE POLICY "Users can view own emails" ON emails
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own emails" ON emails
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own emails" ON emails
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own emails" ON emails
    FOR DELETE USING (auth.uid() = user_id);

-- Email processing policies
CREATE POLICY "Users can view own email processing" ON email_processing
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own email processing" ON email_processing
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- OAuth tokens policies
CREATE POLICY "Users can view own oauth tokens" ON oauth_tokens
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own oauth tokens" ON oauth_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own oauth tokens" ON oauth_tokens
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own oauth tokens" ON oauth_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- User sessions policies
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON user_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON user_sessions
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON user_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Email categories policies
CREATE POLICY "Users can view own email categories" ON email_categories
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own email categories" ON email_categories
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own email categories" ON email_categories
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own email categories" ON email_categories
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_id ON workflow_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_user_id ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_label_mappings_user_id ON gmail_label_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_email_processing_user_id ON email_processing(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_email_categories_user_id ON email_categories(user_id);
