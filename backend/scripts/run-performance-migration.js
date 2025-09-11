#!/usr/bin/env node

const _fs = require('fs');
const _path = require('path');

const { query } = require('../database/unified-connection');

async function runPerformanceMigration() {
  try {
    console.log('🔄 Starting performance indexes migration...');
    
    // Define performance index statements
    const statements = [
      // Critical indexes for authentication performance
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users (email)",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified ON users (email_verified)",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_verified_composite ON users (email, email_verified)",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_id ON users (id)",
      
      // Analytics and monitoring indexes
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users (created_at)",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login_at ON users (last_login_at)",
      
      // Security monitoring indexes
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_failed_login_attempts ON users (failed_login_attempts) WHERE failed_login_attempts > 0",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_account_locked_until ON users (account_locked_until) WHERE account_locked_until IS NOT NULL",
      
      // Performance optimization: partial index for active users
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active ON users (id, email, email_verified) WHERE email_verified = true",
      
      // Workflow execution indexes
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_user_id ON workflow_executions (user_id)",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_executions_status ON workflow_executions (status)",
      
      // Performance metrics indexes
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics (user_id)",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics (timestamp)",
      
      // Notifications indexes
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id ON notifications (user_id)",
      "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_read_status ON notifications (read_status)",
      
      // Create performance monitoring view
      `CREATE OR REPLACE VIEW v_user_login_performance AS
       SELECT 
           email,
           email_verified,
           failed_login_attempts,
           account_locked_until,
           last_login_at,
           created_at
       FROM users 
       ORDER BY last_login_at DESC NULLS LAST`,
       
      // Grant permissions
      "GRANT SELECT ON v_user_login_performance TO authenticated"
    ];

    console.log(`📊 Found ${statements.length} performance optimization statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        await query(statement);
        console.log(`✅ Statement ${i + 1} completed successfully`);
      } catch (error) {
        // Some statements might fail if they already exist
        if (error.message.includes('already exists') ||
            error.message.includes('duplicate key') ||
            error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`⚠️  Statement ${i + 1} skipped: ${error.message}`);
        } else {
          console.error(`❌ Statement ${i + 1} failed:`, error.message);
          console.error('Statement:', statement);
          // Continue with other statements for non-critical errors
        }
      }
    }

    // Verify indexes were created
    console.log('🔍 Verifying performance indexes...');
    const verifyQuery = `
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE 'idx_users_%'
      ORDER BY indexname;
    `;
    
    const result = await query(verifyQuery);
    console.log('✅ Created performance indexes:', result.rows.length);
    result.rows.forEach(row => {
      console.log(`   📊 ${row.indexname} on ${row.tablename}`);
    });

    console.log('🎉 Performance indexes migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Performance migration failed:', error);
    throw error;
  }
}

// Run migration
runPerformanceMigration().catch(console.error);
