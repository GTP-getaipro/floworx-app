-- Performance Optimization Indexes for Authentication
-- This migration adds critical indexes to improve query performance

-- Add index on users.email for fast login lookups
-- This is the most critical index for authentication performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users (email) 
WHERE deleted_at IS NULL;

-- Add index on users.email_verified for filtering verified users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified 
ON users (email_verified) 
WHERE deleted_at IS NULL;

-- Add composite index for email + email_verified (most common auth query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified_composite 
ON users (email, email_verified) 
WHERE deleted_at IS NULL;

-- Add index on users.id for JWT token validation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_id 
ON users (id) 
WHERE deleted_at IS NULL;

-- Add index on users.created_at for user analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
ON users (created_at) 
WHERE deleted_at IS NULL;

-- Add index on users.last_login_at for activity tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login_at 
ON users (last_login_at) 
WHERE deleted_at IS NULL;

-- Add index on users.failed_login_attempts for security monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_failed_login_attempts 
ON users (failed_login_attempts) 
WHERE deleted_at IS NULL AND failed_login_attempts > 0;

-- Add index on users.account_locked_until for lockout management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_account_locked_until 
ON users (account_locked_until) 
WHERE deleted_at IS NULL AND account_locked_until IS NOT NULL;

-- Performance optimization: Add partial index for active users only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active 
ON users (id, email, email_verified) 
WHERE deleted_at IS NULL AND email_verified = true;

-- Add index for workflow_executions table (used by scheduler)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_user_id 
ON workflow_executions (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_status 
ON workflow_executions (status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_created_at 
ON workflow_executions (created_at);

-- Add index for performance_metrics table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_timestamp 
ON performance_metrics (timestamp);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_metric_name 
ON performance_metrics (metric_name);

-- Add index for notifications table
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id 
ON notifications (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_read_status 
ON notifications (read_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at 
ON notifications (created_at);

-- Analyze tables to update statistics for query planner
ANALYZE users;
ANALYZE workflow_executions;
ANALYZE performance_metrics;
ANALYZE notifications;

-- Performance monitoring: Create a view for slow query analysis
CREATE OR REPLACE VIEW v_user_login_performance AS
SELECT 
    email,
    email_verified,
    failed_login_attempts,
    account_locked_until,
    last_login_at,
    created_at
FROM users 
WHERE deleted_at IS NULL
ORDER BY last_login_at DESC NULLS LAST;

-- Grant appropriate permissions
GRANT SELECT ON v_user_login_performance TO authenticated;

-- Add comments for documentation
COMMENT ON INDEX idx_users_email IS 'Critical index for login performance - email lookups';
COMMENT ON INDEX idx_users_email_verified_composite IS 'Composite index for authenticated user queries';
COMMENT ON INDEX idx_users_active IS 'Partial index for active verified users only';
COMMENT ON VIEW v_user_login_performance IS 'Performance monitoring view for user login analytics';

-- Performance validation query (for testing)
-- This query should use the new indexes efficiently
/*
EXPLAIN (ANALYZE, BUFFERS) 
SELECT id, email, password_hash, email_verified, first_name 
FROM users 
WHERE email = 'test@example.com' AND deleted_at IS NULL;
*/
