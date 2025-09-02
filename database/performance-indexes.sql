-- FloWorx Performance Optimization Indexes
-- Run this script to add critical database indexes for improved query performance

-- =====================================================
-- USER TABLE INDEXES
-- =====================================================

-- Primary email lookup (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users(email);

-- Email verification status lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified 
ON users(email_verified) WHERE email_verified = false;

-- Onboarding status lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_onboarding_completed 
ON users(onboarding_completed) WHERE onboarding_completed = false;

-- Trial status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_trial_status 
ON users(subscription_status, trial_ends_at) 
WHERE subscription_status = 'trial';

-- =====================================================
-- CREDENTIALS TABLE INDEXES
-- =====================================================

-- User credentials lookup (most common query)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credentials_user_service 
ON credentials(user_id, service_name);

-- Service-specific lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credentials_service 
ON credentials(service_name);

-- Updated credentials tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credentials_updated 
ON credentials(updated_at DESC);

-- =====================================================
-- WORKFLOW DEPLOYMENTS INDEXES
-- =====================================================

-- User workflow lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_deployments_user 
ON workflow_deployments(user_id);

-- Active workflow status
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_deployments_status 
ON workflow_deployments(status) WHERE status = 'active';

-- N8N workflow ID lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_deployments_n8n_id 
ON workflow_deployments(n8n_workflow_id);

-- Business config relationship
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_deployments_business_config 
ON workflow_deployments(business_config_id);

-- =====================================================
-- BUSINESS CONFIGS INDEXES
-- =====================================================

-- User business config lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_configs_user 
ON business_configs(user_id);

-- Business type filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_configs_type 
ON business_configs(business_type);

-- Active configurations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_business_configs_active 
ON business_configs(is_active) WHERE is_active = true;

-- =====================================================
-- ONBOARDING PROGRESS INDEXES
-- =====================================================

-- User onboarding lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_onboarding_progress_user 
ON onboarding_progress(user_id);

-- Step completion tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_onboarding_progress_step 
ON onboarding_progress(step_completed);

-- Completion timestamp for analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_onboarding_progress_completed 
ON onboarding_progress(completed_at DESC) WHERE completed_at IS NOT NULL;

-- =====================================================
-- USER ANALYTICS INDEXES
-- =====================================================

-- User analytics lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_analytics_user_event 
ON user_analytics(user_id, event_type);

-- Event type analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_analytics_event_time 
ON user_analytics(event_type, created_at DESC);

-- Recent events for dashboard
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_analytics_recent 
ON user_analytics(created_at DESC);

-- Session tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_analytics_session 
ON user_analytics(session_id) WHERE session_id IS NOT NULL;

-- =====================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- =====================================================

-- User onboarding status with email verification
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_onboarding_email_status 
ON users(onboarding_completed, email_verified, created_at DESC);

-- Active workflows by user and type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_workflows_user_type 
ON workflow_deployments(user_id, workflow_name, status) 
WHERE status = 'active';

-- User credentials with update tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credentials_user_updated 
ON credentials(user_id, updated_at DESC);

-- =====================================================
-- PARTIAL INDEXES FOR EFFICIENCY
-- =====================================================

-- Only index unverified emails (smaller index)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_unverified_email 
ON users(email, created_at) WHERE email_verified = false;

-- Only index incomplete onboarding
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_incomplete_onboarding 
ON users(id, created_at) WHERE onboarding_completed = false;

-- Only index active trials
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_trials 
ON users(id, trial_ends_at) 
WHERE subscription_status = 'trial' AND trial_ends_at > NOW();

-- =====================================================
-- PERFORMANCE MONITORING QUERIES
-- =====================================================

-- Check index usage
-- SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- ORDER BY idx_tup_read DESC;

-- Check table sizes
-- SELECT schemaname, tablename, 
--        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries
-- SELECT query, mean_time, calls, total_time
-- FROM pg_stat_statements 
-- WHERE mean_time > 1000 
-- ORDER BY mean_time DESC;

-- =====================================================
-- INDEX MAINTENANCE
-- =====================================================

-- Reindex all tables (run during maintenance window)
-- REINDEX DATABASE floworx_db;

-- Update table statistics
-- ANALYZE users, credentials, workflow_deployments, business_configs, onboarding_progress, user_analytics;

-- Check for unused indexes
-- SELECT schemaname, tablename, indexname, idx_scan
-- FROM pg_stat_user_indexes 
-- WHERE idx_scan = 0 
-- ORDER BY schemaname, tablename, indexname;
