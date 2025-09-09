#!/usr/bin/env node

/**
 * Database Schema Validation Tool
 * Validates the Supabase database schema against application requirements
 */

class DatabaseSchemaValidator {
  constructor() {
    this.requiredTables = {
      // Core Authentication & User Management
      users: {
        required: true,
        purpose: 'Core user accounts and authentication',
        columns: [
          'id',
          'email',
          'first_name',
          'last_name',
          'company_name',
          'password_hash',
          'created_at',
          'updated_at',
        ],
      },

      // OAuth & External Connections
      oauth_tokens: {
        required: true,
        purpose: 'Store encrypted OAuth tokens for external services',
        columns: [
          'id',
          'user_id',
          'provider',
          'access_token',
          'refresh_token',
          'expires_at',
          'created_at',
        ],
      },

      // Email Processing & Categorization
      emails: {
        required: true,
        purpose: 'Store processed emails and their metadata',
        columns: [
          'id',
          'user_id',
          'gmail_message_id',
          'thread_id',
          'sender_email',
          'sender_name',
          'subject',
          'body_text',
          'body_html',
          'received_at',
          'created_at',
        ],
      },

      email_categories: {
        required: true,
        purpose: 'Define email categories for classification',
        columns: ['id', 'user_id', 'name', 'description', 'created_at'],
      },

      gmail_label_mappings: {
        required: true,
        purpose: 'Map Gmail labels to business categories',
        columns: [
          'id',
          'user_id',
          'gmail_label_id',
          'gmail_label_name',
          'flowers_category',
          'is_active',
          'created_at',
        ],
      },

      // Workflow & Automation
      workflow_templates: {
        required: true,
        purpose: 'Store n8n workflow templates',
        columns: ['id', 'name', 'description', 'template_json', 'is_active', 'created_at'],
      },

      workflow_deployments: {
        required: true,
        purpose: 'Track deployed workflows per user',
        columns: [
          'id',
          'user_id',
          'workflow_template_id',
          'workflow_name',
          'workflow_status',
          'deployment_config',
          'deployed_at',
          'created_at',
        ],
      },

      // Business Configuration
      business_types: {
        required: true,
        purpose: 'Available business types for onboarding',
        columns: ['id', 'name', 'description', 'created_at'],
      },

      business_configurations: {
        required: true,
        purpose: 'User-specific business configurations',
        columns: ['id', 'user_id', 'business_type', 'configuration', 'created_at'],
      },

      // Team & Notifications
      team_notifications: {
        required: true,
        purpose: 'Team notification settings and history',
        columns: [
          'id',
          'user_id',
          'team_member_name',
          'team_member_email',
          'category_id',
          'notification_enabled',
          'created_at',
        ],
      },

      notifications: {
        required: true,
        purpose: 'System notifications and alerts',
        columns: ['id', 'user_id', 'type', 'title', 'message', 'is_read', 'data', 'created_at'],
      },

      // Analytics & Performance
      performance_metrics: {
        required: true,
        purpose: 'Track system performance and user analytics',
        columns: ['id', 'user_id', 'metric_type', 'metric_value', 'metric_data', 'created_at'],
      },

      email_processing: {
        required: true,
        purpose: 'Track email processing status and results',
        columns: [
          'id',
          'email_id',
          'processing_type',
          'status',
          'result',
          'error_message',
          'processed_at',
          'created_at',
        ],
      },

      // Security & Recovery
      password_reset_tokens: {
        required: true,
        purpose: 'Secure password reset functionality',
        columns: [
          'id',
          'user_id',
          'token',
          'expires_at',
          'used',
          'created_at',
          'used_at',
          'ip_address',
          'user_agent',
        ],
      },

      security_audit_log: {
        required: true,
        purpose: 'Security events and audit trail',
        columns: ['id', 'user_id', 'action', 'ip_address', 'user_agent', 'success', 'created_at'],
      },

      // Account Management
      account_recovery_tokens: {
        required: true,
        purpose: 'Account recovery and backup access',
        columns: ['id', 'user_id', 'recovery_data', 'expires_at', 'created_at'],
      },

      recovery_sessions: {
        required: true,
        purpose: 'Track recovery session attempts',
        columns: [
          'id',
          'user_id',
          'session_token',
          'recovery_type',
          'expires_at',
          'completed',
          'created_at',
        ],
      },

      // Optional/Future Tables
      credentials: {
        required: false,
        purpose: 'Additional service credentials (optional)',
        columns: ['id', 'user_id', 'service_name', 'created_at', 'expiry_date'],
      },

      oauth_connections: {
        required: false,
        purpose: 'OAuth connection status tracking (optional)',
        columns: ['id', 'user_id', 'provider', 'connected_at', 'status', 'last_sync'],
      },
    };

    this.observedTables = [
      'oauth_tokens',
      'access_token',
      'refresh_token',
      'expires_at',
      'scope',
      'is_active',
      'onboarding_progress',
      'user_id',
      'current_step',
      'step_data',
      'completed_steps',
      'performance_metrics',
      'metric_type',
      'metric_value',
      'metric_data',
      'emails',
      'gmail_message_id',
      'thread_id',
      'sender_email',
      'sender_name',
      'subject',
      'body_text',
      'body_html',
      'received_at',
      'category',
      'priority',
      'labels',
      'email_processing',
      'email_id',
      'processing_type',
      'status',
      'result',
      'error_message',
      'processed_at',
      'team_notifications',
      'team_member_name',
      'team_member_email',
      'category_id',
      'notification_enabled',
      'business_configurations',
      'business_name',
      'business_type',
      'industry',
      'configuration',
      'email_categories',
      'name',
      'description',
      'gmail_label_mappings',
      'gmail_label_id',
      'gmail_label_name',
      'flowers_category',
      'notifications',
      'type',
      'title',
      'message',
      'is_read',
      'data',
      'account_recovery_tokens',
      'recovery_data',
      'expires_at',
      'security_audit_log',
      'action',
      'ip_address',
      'user_agent',
      'success',
      'account_lockout_history',
      'user_id',
      'lockout_reason',
      'locked_at',
      'unlocked_at',
      'recovery_sessions',
      'session_token',
      'recovery_type',
      'completed',
      'users',
      'password_hash',
      'first_name',
      'last_name',
      'company_name',
      'email_verified',
      'workflow_templates',
      'template_json',
      'is_active',
      'business_types',
      'description',
      'user_onboarding_status',
      'step_completed',
      'step_data',
      'completed_at',
      'workflow_deployments',
      'workflow_template_id',
      'workflow_name',
      'workflow_status',
      'deployment_config',
      'deployed_at',
      'password_reset_tokens',
      'token',
      'used',
      'used_at',
      'ip_address',
      'user_agent',
      'credentials',
      'service_name',
      'expiry_date',
      'business_categories',
      'category_name',
    ];
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m',
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  validateSchema() {
    this.log('🔍 VALIDATING SUPABASE DATABASE SCHEMA', 'info');
    this.log('=' * 60, 'info');

    const results = {
      present: [],
      missing: [],
      optional: [],
      recommendations: [],
    };

    // Check each required table
    Object.entries(this.requiredTables).forEach(([tableName, config]) => {
      const isPresent = this.observedTables.includes(tableName);

      if (isPresent) {
        if (config.required) {
          results.present.push({ name: tableName, purpose: config.purpose });
          this.log(`✅ ${tableName} - ${config.purpose}`, 'success');
        } else {
          results.optional.push({ name: tableName, purpose: config.purpose });
          this.log(`📋 ${tableName} - ${config.purpose} (Optional)`, 'info');
        }
      } else {
        if (config.required) {
          results.missing.push({
            name: tableName,
            purpose: config.purpose,
            columns: config.columns,
          });
          this.log(`❌ ${tableName} - ${config.purpose} (MISSING)`, 'error');
        } else {
          this.log(`⚪ ${tableName} - ${config.purpose} (Optional - Not Present)`, 'warning');
        }
      }
    });

    this.generateValidationReport(results);
    return results;
  }

  generateValidationReport(results) {
    this.log('\n📊 DATABASE SCHEMA VALIDATION REPORT', 'info');
    this.log('=' * 60, 'info');

    this.log(`✅ Present Tables: ${results.present.length}`, 'success');
    this.log(
      `❌ Missing Tables: ${results.missing.length}`,
      results.missing.length > 0 ? 'error' : 'success'
    );
    this.log(`📋 Optional Tables: ${results.optional.length}`, 'info');

    if (results.missing.length > 0) {
      this.log('\n🚨 MISSING REQUIRED TABLES:', 'error');
      results.missing.forEach((table, index) => {
        this.log(`${index + 1}. ${table.name}`, 'error');
        this.log(`   Purpose: ${table.purpose}`, 'error');
        this.log(`   Required Columns: ${table.columns.join(', ')}`, 'error');
      });
    }

    // Generate SQL for missing tables
    if (results.missing.length > 0) {
      this.generateMissingTableSQL(results.missing);
    }

    // Overall assessment
    const totalRequired = Object.values(this.requiredTables).filter(t => t.required).length;
    const presentRequired = results.present.length;
    const completionRate = Math.round((presentRequired / totalRequired) * 100);

    this.log(
      `\n📈 SCHEMA COMPLETION RATE: ${completionRate}%`,
      completionRate >= 80 ? 'success' : 'warning'
    );

    if (completionRate >= 90) {
      this.log('🎉 EXCELLENT: Database schema is nearly complete!', 'success');
    } else if (completionRate >= 70) {
      this.log('✅ GOOD: Most required tables are present', 'success');
    } else {
      this.log('⚠️  NEEDS ATTENTION: Several required tables are missing', 'warning');
    }
  }

  generateMissingTableSQL(missingTables) {
    this.log('\n📝 SQL TO CREATE MISSING TABLES:', 'info');
    this.log('Copy and paste this SQL into your Supabase SQL Editor:', 'info');
    this.log('-' * 60, 'info');

    const sqlStatements = [];

    missingTables.forEach(table => {
      let sql = `-- Create ${table.name} table\nCRETE TABLE ${table.name} (\n`;

      // Add common columns based on table purpose
      if (table.columns.includes('id')) {
        sql += `  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,\n`;
      }
      if (table.columns.includes('user_id')) {
        sql += `  user_id UUID REFERENCES users(id) ON DELETE CASCADE,\n`;
      }

      // Add other columns as TEXT for now (can be refined later)
      table.columns.forEach(col => {
        if (!['id', 'user_id', 'created_at', 'updated_at'].includes(col)) {
          sql += `  ${col} TEXT,\n`;
        }
      });

      if (table.columns.includes('created_at')) {
        sql += `  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),\n`;
      }
      if (table.columns.includes('updated_at')) {
        sql += `  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()\n`;
      }

      sql = sql.replace(/,\n$/, '\n'); // Remove trailing comma
      sql += `);\n\n`;

      // Add RLS
      sql += `-- Enable RLS for ${table.name}\n`;
      sql += `ALTER TABLE ${table.name} ENABLE ROW LEVEL SECURITY;\n\n`;

      // Add basic RLS policy
      sql += `-- Basic RLS policy for ${table.name}\n`;
      sql += `CREATE POLICY "${table.name}_user_policy" ON ${table.name}\n`;
      sql += `  FOR ALL USING (auth.uid()::text = user_id::text);\n\n`;

      sqlStatements.push(sql);
    });

    const fullSQL = sqlStatements.join('');
    require('fs').writeFileSync('./create-missing-tables.sql', fullSQL);
    this.log('📄 SQL saved to: ./create-missing-tables.sql', 'info');
  }
}

// Run the validation
if (require.main === module) {
  const validator = new DatabaseSchemaValidator();
  validator.validateSchema();
}

module.exports = DatabaseSchemaValidator;
