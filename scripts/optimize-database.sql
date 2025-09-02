-- FloWorx Database Optimization Script
-- Adds missing indexes, constraints, and performance improvements

-- =====================================================
-- CRITICAL INDEXES (Add immediately)
-- =====================================================

-- Users table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users (email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified 
ON users (email_verified) WHERE email_verified = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
ON users (created_at);

-- OAuth tokens indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_oauth_tokens_user_id 
ON oauth_tokens (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_oauth_tokens_provider 
ON oauth_tokens (provider);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_oauth_tokens_expires_at 
ON oauth_tokens (expires_at) WHERE expires_at IS NOT NULL;

-- Onboarding progress indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_onboarding_progress_user_id 
ON onboarding_progress (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_onboarding_progress_step 
ON onboarding_progress (current_step);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_onboarding_progress_completed 
ON onboarding_progress (completed_at) WHERE completed_at IS NOT NULL;

-- Business configurations indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_config_user_id 
ON business_configurations (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_config_type 
ON business_configurations (business_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_config_active 
ON business_configurations (is_active) WHERE is_active = true;

-- Workflows indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_user_id 
ON workflows (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_status 
ON workflows (status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_created_at 
ON workflows (created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_user_status 
ON workflows (user_id, status);

-- Workflow executions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_workflow_id 
ON workflow_executions (workflow_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_status 
ON workflow_executions (status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_started_at 
ON workflow_executions (started_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_user_id 
ON workflow_executions (user_id);

-- Analytics events indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_user_id 
ON analytics_events (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_event_type 
ON analytics_events (event_type);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_created_at 
ON analytics_events (created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_user_type_date 
ON analytics_events (user_id, event_type, created_at);

-- =====================================================
-- COMPOSITE INDEXES (Performance optimization)
-- =====================================================

-- User authentication lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_password_verified 
ON users (email, password_hash, email_verified);

-- Workflow management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_user_status_updated 
ON workflows (user_id, status, updated_at);

-- Analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_user_date_type 
ON analytics_events (user_id, DATE(created_at), event_type);

-- OAuth token validation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_oauth_tokens_user_provider_active 
ON oauth_tokens (user_id, provider) WHERE expires_at > NOW();

-- =====================================================
-- PARTIAL INDEXES (Space efficient)
-- =====================================================

-- Active workflows only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflows_active 
ON workflows (user_id, updated_at) WHERE status = 'active';

-- Failed workflow executions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_failed 
ON workflow_executions (workflow_id, started_at) WHERE status = 'error';

-- Recent analytics events (last 30 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_recent 
ON analytics_events (user_id, event_type) 
WHERE created_at > (NOW() - INTERVAL '30 days');

-- Unverified users (for cleanup)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_unverified_old 
ON users (created_at) 
WHERE email_verified = false AND created_at < (NOW() - INTERVAL '7 days');

-- =====================================================
-- CONSTRAINTS AND DATA INTEGRITY
-- =====================================================

-- Add missing foreign key constraints
ALTER TABLE oauth_tokens 
ADD CONSTRAINT fk_oauth_tokens_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE onboarding_progress 
ADD CONSTRAINT fk_onboarding_progress_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE business_configurations 
ADD CONSTRAINT fk_business_config_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE workflows 
ADD CONSTRAINT fk_workflows_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE workflow_executions 
ADD CONSTRAINT fk_workflow_executions_workflow_id 
FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE;

ALTER TABLE workflow_executions 
ADD CONSTRAINT fk_workflow_executions_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE analytics_events 
ADD CONSTRAINT fk_analytics_events_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add check constraints
ALTER TABLE users 
ADD CONSTRAINT chk_users_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE oauth_tokens 
ADD CONSTRAINT chk_oauth_tokens_provider 
CHECK (provider IN ('google', 'microsoft', 'github'));

ALTER TABLE workflows 
ADD CONSTRAINT chk_workflows_status 
CHECK (status IN ('draft', 'active', 'inactive', 'error', 'archived'));

ALTER TABLE workflow_executions 
ADD CONSTRAINT chk_workflow_executions_status 
CHECK (status IN ('pending', 'running', 'success', 'error', 'cancelled', 'timeout'));

-- =====================================================
-- PERFORMANCE OPTIMIZATIONS
-- =====================================================

-- Update table statistics
ANALYZE users;
ANALYZE oauth_tokens;
ANALYZE onboarding_progress;
ANALYZE business_configurations;
ANALYZE workflows;
ANALYZE workflow_executions;
ANALYZE analytics_events;

-- Set appropriate fill factors for frequently updated tables
ALTER TABLE users SET (fillfactor = 90);
ALTER TABLE oauth_tokens SET (fillfactor = 85);
ALTER TABLE workflow_executions SET (fillfactor = 85);
ALTER TABLE analytics_events SET (fillfactor = 95);

-- =====================================================
-- MAINTENANCE PROCEDURES
-- =====================================================

-- Create function to clean up old unverified users
CREATE OR REPLACE FUNCTION cleanup_unverified_users()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM users 
    WHERE email_verified = false 
    AND created_at < (NOW() - INTERVAL '7 days');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up expired OAuth tokens
CREATE OR REPLACE FUNCTION cleanup_expired_oauth_tokens()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM oauth_tokens 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to archive old workflow executions
CREATE OR REPLACE FUNCTION archive_old_workflow_executions()
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Move executions older than 90 days to archive table
    INSERT INTO workflow_executions_archive 
    SELECT * FROM workflow_executions 
    WHERE started_at < (NOW() - INTERVAL '90 days');
    
    DELETE FROM workflow_executions 
    WHERE started_at < (NOW() - INTERVAL '90 days');
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MONITORING VIEWS
-- =====================================================

-- View for monitoring database performance
CREATE OR REPLACE VIEW v_database_performance AS
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    n_distinct,
    correlation,
    most_common_vals,
    most_common_freqs
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY tablename, attname;

-- View for monitoring index usage
CREATE OR REPLACE VIEW v_index_usage AS
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan,
    CASE 
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW_USAGE'
        ELSE 'ACTIVE'
    END as usage_status
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- View for monitoring table sizes
CREATE OR REPLACE VIEW v_table_sizes AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Database optimization completed successfully!';
    RAISE NOTICE 'Added indexes, constraints, and maintenance functions.';
    RAISE NOTICE 'Run ANALYZE on all tables to update statistics.';
    RAISE NOTICE 'Monitor performance using the created views.';
END $$;
