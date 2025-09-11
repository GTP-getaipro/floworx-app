-- Floworx SaaS Database Schema
-- PostgreSQL Database Schema for secure user management and OAuth credentials

-- Enable UUID extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table: Store client account information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    company_name VARCHAR(255),
    business_type VARCHAR(100),
    phone VARCHAR(20),
    email_verified BOOLEAN DEFAULT false,
    onboarding_completed BOOLEAN DEFAULT false,
    trial_started_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_status VARCHAR(50) DEFAULT 'trial',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Credentials table: Securely store OAuth tokens for connected services
CREATE TABLE credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_name VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL, -- Encrypted access token
    refresh_token TEXT, -- Encrypted refresh token (optional for some services)
    expiry_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure one credential per service per user
    UNIQUE(user_id, service_name)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_credentials_user_id ON credentials(user_id);
CREATE INDEX idx_credentials_service ON credentials(service_name);
CREATE INDEX idx_credentials_expiry ON credentials(expiry_date);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credentials_updated_at 
    BEFORE UPDATE ON credentials 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Business Categories table: Store client-defined email categories
CREATE TABLE business_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Category Label Mappings table: Map business categories to Gmail labels
CREATE TABLE category_label_mappings (
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
CREATE TABLE team_notifications (
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
CREATE TABLE user_onboarding_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    step_completed VARCHAR(50) NOT NULL,
    step_data JSONB,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one record per step per user
    UNIQUE(user_id, step_completed)
);

-- Workflow Deployments table: Track deployed n8n workflows
CREATE TABLE workflow_deployments (
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

-- Additional indexes for performance
CREATE INDEX idx_business_categories_user_id ON business_categories(user_id);
CREATE INDEX idx_category_label_mappings_user_id ON category_label_mappings(user_id);
CREATE INDEX idx_category_label_mappings_category_id ON category_label_mappings(category_id);
CREATE INDEX idx_team_notifications_user_id ON team_notifications(user_id);
CREATE INDEX idx_team_notifications_category_id ON team_notifications(category_id);
CREATE INDEX idx_user_onboarding_status_user_id ON user_onboarding_status(user_id);
CREATE INDEX idx_workflow_deployments_user_id ON workflow_deployments(user_id);

-- Performance optimization indexes
CREATE INDEX idx_users_email_verified ON users(email_verified) WHERE email_verified = true;
CREATE INDEX idx_users_onboarding_completed ON users(onboarding_completed) WHERE onboarding_completed = false;
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
CREATE INDEX idx_users_trial_ends_at ON users(trial_ends_at) WHERE trial_ends_at IS NOT NULL;
CREATE INDEX idx_credentials_user_service ON credentials(user_id, service_name);
CREATE INDEX idx_workflow_deployments_status ON workflow_deployments(workflow_status);
CREATE INDEX idx_workflow_deployments_deployed_at ON workflow_deployments(deployed_at) WHERE deployed_at IS NOT NULL;
CREATE INDEX idx_user_onboarding_status_step ON user_onboarding_status(step_completed);

-- Composite indexes for common query patterns
CREATE INDEX idx_users_email_verified_active ON users(email, email_verified) WHERE email_verified = true;
CREATE INDEX idx_team_notifications_user_category_enabled ON team_notifications(user_id, category_id, notification_enabled);
CREATE INDEX idx_category_label_mappings_user_category ON category_label_mappings(user_id, category_id);

-- Triggers for new tables
CREATE TRIGGER update_business_categories_updated_at
    BEFORE UPDATE ON business_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_category_label_mappings_updated_at
    BEFORE UPDATE ON category_label_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_notifications_updated_at
    BEFORE UPDATE ON team_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_deployments_updated_at
    BEFORE UPDATE ON workflow_deployments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'Stores user account information for the SaaS application';
COMMENT ON TABLE credentials IS 'Stores encrypted OAuth tokens for connected services';
COMMENT ON COLUMN credentials.access_token IS 'Encrypted OAuth access token - NEVER store in plain text';
COMMENT ON COLUMN credentials.refresh_token IS 'Encrypted OAuth refresh token - NEVER store in plain text';
COMMENT ON TABLE business_categories IS 'Client-defined email categories for automation';
COMMENT ON TABLE category_label_mappings IS 'Maps business categories to Gmail labels';
COMMENT ON TABLE team_notifications IS 'Team member notification configurations';
COMMENT ON TABLE user_onboarding_status IS 'Tracks user onboarding progress';
COMMENT ON TABLE workflow_deployments IS 'Tracks deployed n8n automation workflows';

-- Business Types Table
CREATE TABLE IF NOT EXISTS business_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    default_categories JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default business types
INSERT INTO business_types (name, slug, description, default_categories, is_active) VALUES
('Hot Tub & Spa Services', 'hot-tub-spa', 'Professional hot tub and spa maintenance, repair, and installation services',
 '["Service Requests", "Maintenance", "Repairs", "Installation", "Parts Orders", "Customer Support"]'::jsonb, true),
('Pool Services', 'pool-services', 'Swimming pool maintenance, cleaning, and repair services',
 '["Pool Cleaning", "Chemical Balancing", "Equipment Repair", "Pool Opening/Closing", "Customer Inquiries"]'::jsonb, true),
('HVAC Services', 'hvac-services', 'Heating, ventilation, and air conditioning services',
 '["Service Calls", "Maintenance", "Installation", "Emergency Repairs", "Customer Support"]'::jsonb, true),
('General Contractor', 'general-contractor', 'General construction and contracting services',
 '["Project Inquiries", "Estimates", "Scheduling", "Material Orders", "Customer Communication"]'::jsonb, true),
('Other Service Business', 'other-service', 'Other professional service businesses',
 '["Customer Inquiries", "Service Requests", "Scheduling", "Follow-up", "Support"]'::jsonb, true)
ON CONFLICT (slug) DO NOTHING;

-- Add business_type_id to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_type_id INTEGER REFERENCES business_types(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_business_type_id ON users(business_type_id);
CREATE INDEX IF NOT EXISTS idx_business_types_slug ON business_types(slug);
CREATE INDEX IF NOT EXISTS idx_business_types_is_active ON business_types(is_active);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON oauth_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_id ON onboarding_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_business_configs_user_id ON business_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event_type ON user_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON user_analytics(created_at);
