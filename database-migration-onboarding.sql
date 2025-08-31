-- Floworx Onboarding Migration Script
-- Run this in your Supabase SQL Editor to add onboarding tables

-- First, add new columns to existing users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS business_type VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'trial';

-- Business Categories table: Store client-defined email categories
CREATE TABLE IF NOT EXISTS business_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Category Label Mappings table: Map business categories to Gmail labels
CREATE TABLE IF NOT EXISTS category_label_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES business_categories(id) ON DELETE CASCADE,
    gmail_label_id VARCHAR(255) NOT NULL,
    gmail_label_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one mapping per category per user
    UNIQUE(user_id, category_id)
);

-- Team Notifications table: Store team member configurations
CREATE TABLE IF NOT EXISTS team_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_member_name VARCHAR(255) NOT NULL,
    team_member_email VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES business_categories(id) ON DELETE CASCADE,
    notification_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Onboarding Status table: Track onboarding progress
CREATE TABLE IF NOT EXISTS user_onboarding_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    step_completed VARCHAR(50) NOT NULL,
    step_data JSONB,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one record per step per user
    UNIQUE(user_id, step_completed)
);

-- Workflow Deployments table: Track deployed n8n workflows
CREATE TABLE IF NOT EXISTS workflow_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    n8n_workflow_id VARCHAR(255),
    workflow_name VARCHAR(255) NOT NULL,
    workflow_status VARCHAR(50) DEFAULT 'pending',
    deployment_config JSONB,
    deployed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email Verification Tokens table: Store email verification tokens
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one active token per user
    UNIQUE(user_id)
);

-- Onboarding Sessions table: Track active onboarding sessions
CREATE TABLE IF NOT EXISTS onboarding_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    current_step VARCHAR(50) NOT NULL,
    progress JSONB DEFAULT '{}',
    start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active',
    archived_at TIMESTAMP WITH TIME ZONE,

    -- Ensure one active session per user
    UNIQUE(user_id)
);

-- Onboarding Checkpoints table: Store completed steps for recovery
CREATE TABLE IF NOT EXISTS onboarding_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    step VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    transaction_id VARCHAR(255),
    status VARCHAR(20) DEFAULT 'completed'
);

-- Onboarding Failures table: Track failed steps for analysis and recovery
CREATE TABLE IF NOT EXISTS onboarding_failures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    step VARCHAR(50) NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    transaction_id VARCHAR(255),
    recovery_attempts INTEGER DEFAULT 0,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Analytics Events table: Track all user interactions and events
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    session_id VARCHAR(255),
    user_agent TEXT,
    ip_address INET,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Analytics Summary table: Aggregated analytics for performance
CREATE TABLE IF NOT EXISTS analytics_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date_bucket DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    metric_value NUMERIC NOT NULL,
    dimensions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique metrics per day
    UNIQUE(date_bucket, metric_type, dimensions)
);

-- User Analytics table: Per-user analytics summary
CREATE TABLE IF NOT EXISTS user_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    onboarding_started_at TIMESTAMP WITH TIME ZONE,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    total_time_spent INTEGER, -- in seconds
    steps_completed INTEGER DEFAULT 0,
    steps_failed INTEGER DEFAULT 0,
    conversion_events INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one record per user
    UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_categories_user_id ON business_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_category_label_mappings_user_id ON category_label_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_category_label_mappings_category_id ON category_label_mappings(category_id);
CREATE INDEX IF NOT EXISTS idx_team_notifications_user_id ON team_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_team_notifications_category_id ON team_notifications(category_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_status_user_id ON user_onboarding_status(user_id);
CREATE INDEX IF NOT EXISTS idx_workflow_deployments_user_id ON workflow_deployments(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user_id ON onboarding_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_session_id ON onboarding_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status ON onboarding_sessions(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_checkpoints_user_id ON onboarding_checkpoints(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_checkpoints_step ON onboarding_checkpoints(step);
CREATE INDEX IF NOT EXISTS idx_onboarding_failures_user_id ON onboarding_failures(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_failures_step ON onboarding_failures(step);
CREATE INDEX IF NOT EXISTS idx_onboarding_failures_timestamp ON onboarding_failures(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_composite ON analytics_events(event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_date_bucket ON analytics_summary(date_bucket);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_metric_type ON analytics_summary(metric_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_onboarding_completed ON user_analytics(onboarding_completed_at);

-- Create or replace the update trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for new tables
DO $$
BEGIN
    -- Check if trigger exists before creating
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_business_categories_updated_at') THEN
        CREATE TRIGGER update_business_categories_updated_at 
            BEFORE UPDATE ON business_categories 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_category_label_mappings_updated_at') THEN
        CREATE TRIGGER update_category_label_mappings_updated_at 
            BEFORE UPDATE ON category_label_mappings 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_team_notifications_updated_at') THEN
        CREATE TRIGGER update_team_notifications_updated_at 
            BEFORE UPDATE ON team_notifications 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_workflow_deployments_updated_at') THEN
        CREATE TRIGGER update_workflow_deployments_updated_at 
            BEFORE UPDATE ON workflow_deployments 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Verify the migration
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'business_categories', 'category_label_mappings', 'team_notifications', 'user_onboarding_status', 'workflow_deployments')
ORDER BY table_name, ordinal_position;
