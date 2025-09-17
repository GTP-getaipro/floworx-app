#!/usr/bin/env node

/**
 * FloWorx Password Reset Debug & Fix Script
 * 
 * This script systematically debugs and fixes password reset functionality:
 * 1. Tests database connectivity and schema
 * 2. Validates email service configuration
 * 3. Tests password reset request flow
 * 4. Tests token validation and password reset
 * 5. Identifies and fixes common issues
 * 
 * Usage: node debug-password-reset.js [--fix] [--test-email=user@example.com]
 */

const axios = require('axios');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuration
const config = {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  frontendUrl: process.env.FRONTEND_URL || 'https://app.floworx-iq.com',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  testEmail: process.argv.find(arg => arg.startsWith('--test-email='))?.split('=')[1] || 'test@floworx-iq.com',
  shouldFix: process.argv.includes('--fix'),
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v')
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class PasswordResetDebugger {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.testResults = [];
    this.supabase = null;
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  error(message) {
    this.log(`❌ ERROR: ${message}`, 'red');
    this.issues.push(message);
  }

  success(message) {
    this.log(`✅ SUCCESS: ${message}`, 'green');
  }

  warning(message) {
    this.log(`⚠️  WARNING: ${message}`, 'yellow');
  }

  info(message) {
    this.log(`ℹ️  INFO: ${message}`, 'blue');
  }

  async initializeSupabase() {
    try {
      if (!config.supabaseUrl || !config.supabaseServiceKey) {
        this.error('Missing Supabase credentials');
        return false;
      }

      this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
      this.success('Supabase client initialized');
      return true;
    } catch (error) {
      this.error(`Failed to initialize Supabase: ${error.message}`);
      return false;
    }
  }

  async testDatabaseSchema() {
    this.log('\n🗄️  Testing Database Schema...', 'cyan');

    try {
      // Test password_reset_tokens table
      const { data, error } = await this.supabase
        .from('password_reset_tokens')
        .select('*')
        .limit(1);

      if (error) {
        this.error(`password_reset_tokens table issue: ${error.message}`);
        if (config.shouldFix) {
          await this.createPasswordResetTable();
        }
        return false;
      }

      this.success('password_reset_tokens table exists and accessible');

      // Test users table
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('id, email, first_name')
        .limit(1);

      if (userError) {
        this.error(`users table issue: ${userError.message}`);
        return false;
      }

      this.success('users table exists and accessible');
      return true;
    } catch (error) {
      this.error(`Database schema test failed: ${error.message}`);
      return false;
    }
  }

  async createPasswordResetTable() {
    this.log('🔧 Creating password_reset_tokens table...', 'yellow');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP WITH TIME ZONE,
        ip_address INET,
        user_agent TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
    `;

    try {
      const { error } = await this.supabase.rpc('exec_sql', { sql: createTableSQL });
      if (error) {
        this.error(`Failed to create table: ${error.message}`);
        return false;
      }
      this.success('password_reset_tokens table created successfully');
      this.fixes.push('Created password_reset_tokens table');
      return true;
    } catch (error) {
      this.error(`Table creation failed: ${error.message}`);
      return false;
    }
  }

  async testEmailConfiguration() {
    this.log('\n📧 Testing Email Configuration...', 'cyan');

    const emailConfig = {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASS,
      from: process.env.FROM_EMAIL
    };

    // Check if all required email config is present
    const missingConfig = [];
    if (!emailConfig.host) missingConfig.push('SMTP_HOST');
    if (!emailConfig.user) missingConfig.push('SMTP_USER');
    if (!emailConfig.password) missingConfig.push('SMTP_PASS');
    if (!emailConfig.from) missingConfig.push('FROM_EMAIL');

    if (missingConfig.length > 0) {
      this.error(`Missing email configuration: ${missingConfig.join(', ')}`);
      return false;
    }

    try {
      // Test SMTP connection
      const transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: parseInt(emailConfig.port),
        secure: emailConfig.port == 465,
        auth: {
          user: emailConfig.user,
          pass: emailConfig.password
        }
      });

      await transporter.verify();
      this.success('SMTP connection successful');
      return true;
    } catch (error) {
      this.error(`SMTP connection failed: ${error.message}`);
      return false;
    }
  }

  async testPasswordResetRequest() {
    this.log('\n🔄 Testing Password Reset Request...', 'cyan');

    try {
      // First, ensure test user exists
      await this.ensureTestUser();

      // Test multiple endpoints to find working one
      const endpoints = [
        '/auth/forgot-password',
        '/password-reset/request',
        '/api/auth/forgot-password'
      ];

      let workingEndpoint = null;
      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          const response = await axios.post(`${config.apiUrl}${endpoint}`, {
            email: config.testEmail
          });

          if (response.data.success) {
            workingEndpoint = endpoint;
            this.success(`Password reset request successful via ${endpoint}`);
            this.testResults.push({
              test: 'password_reset_request',
              status: 'success',
              endpoint: endpoint,
              data: response.data
            });
            return true;
          }
        } catch (error) {
          lastError = error;
          if (config.verbose) {
            this.warning(`Endpoint ${endpoint} failed: ${error.response?.data?.message || error.message}`);
          }
        }
      }

      this.error(`All password reset endpoints failed. Last error: ${lastError?.response?.data?.message || lastError?.message}`);
      return false;
    } catch (error) {
      this.error(`Password reset request test failed: ${error.message}`);
      return false;
    }
  }

  async ensureTestUser() {
    try {
      // Check if test user exists
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', config.testEmail)
        .single();

      if (!existingUser) {
        // Create test user
        const { data: newUser, error } = await this.supabase
          .from('users')
          .insert({
            email: config.testEmail,
            first_name: 'Test',
            last_name: 'User',
            password_hash: '$2b$12$dummy.hash.for.testing',
            email_verified: true,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) {
          this.error(`Failed to create test user: ${error.message}`);
          return false;
        }

        this.success(`Created test user: ${config.testEmail}`);
        this.fixes.push(`Created test user: ${config.testEmail}`);
      } else {
        this.info(`Test user exists: ${config.testEmail}`);
      }
      return true;
    } catch (error) {
      this.error(`Test user setup failed: ${error.message}`);
      return false;
    }
  }

  async testTokenValidation() {
    this.log('\n🔍 Testing Token Validation...', 'cyan');

    try {
      // Create a test token directly in database
      const testToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Get test user
      const { data: user } = await this.supabase
        .from('users')
        .select('id')
        .eq('email', config.testEmail)
        .single();

      if (!user) {
        this.error('Test user not found for token validation');
        return false;
      }

      // Insert test token
      const { error: insertError } = await this.supabase
        .from('password_reset_tokens')
        .insert({
          user_id: user.id,
          token: testToken,
          expires_at: expiresAt.toISOString()
        });

      if (insertError) {
        this.error(`Failed to create test token: ${insertError.message}`);
        return false;
      }

      // Test multiple validation endpoints
      const validationEndpoints = [
        '/password-reset/validate',
        '/auth/verify-reset-token',
        '/api/password-reset/validate'
      ];

      let validationWorked = false;
      for (const endpoint of validationEndpoints) {
        try {
          const response = await axios.post(`${config.apiUrl}${endpoint}`, {
            token: testToken
          });

          if (response.data.valid) {
            this.success(`Token validation successful via ${endpoint}`);
            validationWorked = true;
            break;
          }
        } catch (error) {
          if (config.verbose) {
            this.warning(`Validation endpoint ${endpoint} failed: ${error.response?.data?.message || error.message}`);
          }
        }
      }

      // Clean up test token
      await this.supabase
        .from('password_reset_tokens')
        .delete()
        .eq('token', testToken);

      return validationWorked;
    } catch (error) {
      this.error(`Token validation test failed: ${error.response?.data?.message || error.message}`);
      return false;
    }
  }

  async testPasswordResetComplete() {
    this.log('\n🔐 Testing Complete Password Reset Flow...', 'cyan');

    try {
      // Create a test token directly in database
      const testToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Get test user
      const { data: user } = await this.supabase
        .from('users')
        .select('id')
        .eq('email', config.testEmail)
        .single();

      if (!user) {
        this.error('Test user not found for password reset');
        return false;
      }

      // Insert test token
      const { error: insertError } = await this.supabase
        .from('password_reset_tokens')
        .insert({
          user_id: user.id,
          token: testToken,
          expires_at: expiresAt.toISOString()
        });

      if (insertError) {
        this.error(`Failed to create test token: ${insertError.message}`);
        return false;
      }

      // Test password reset endpoints
      const resetEndpoints = [
        '/password-reset/reset',
        '/auth/reset-password',
        '/api/password-reset/reset'
      ];

      const newPassword = 'TestPassword123!';
      let resetWorked = false;

      for (const endpoint of resetEndpoints) {
        try {
          const response = await axios.post(`${config.apiUrl}${endpoint}`, {
            token: testToken,
            password: newPassword,
            newPassword: newPassword,
            confirmPassword: newPassword
          });

          if (response.data.success) {
            this.success(`Password reset successful via ${endpoint}`);
            resetWorked = true;
            break;
          }
        } catch (error) {
          if (config.verbose) {
            this.warning(`Reset endpoint ${endpoint} failed: ${error.response?.data?.message || error.message}`);
          }
        }
      }

      // Clean up test token
      await this.supabase
        .from('password_reset_tokens')
        .delete()
        .eq('token', testToken);

      return resetWorked;
    } catch (error) {
      this.error(`Password reset flow test failed: ${error.message}`);
      return false;
    }
  }

  async runDiagnostics() {
    this.log('🚀 Starting Password Reset Diagnostics...', 'magenta');
    this.log(`Test Email: ${config.testEmail}`, 'blue');
    this.log(`API URL: ${config.apiUrl}`, 'blue');
    this.log(`Frontend URL: ${config.frontendUrl}`, 'blue');

    const results = {
      supabaseInit: await this.initializeSupabase(),
      databaseSchema: false,
      emailConfig: false,
      passwordResetRequest: false,
      tokenValidation: false,
      passwordResetComplete: false
    };

    if (results.supabaseInit) {
      results.databaseSchema = await this.testDatabaseSchema();
      results.emailConfig = await this.testEmailConfiguration();

      if (results.databaseSchema) {
        results.passwordResetRequest = await this.testPasswordResetRequest();
        results.tokenValidation = await this.testTokenValidation();
        results.passwordResetComplete = await this.testPasswordResetComplete();
      }
    }

    return results;
  }

  generateReport(results) {
    this.log('\n📊 DIAGNOSTIC REPORT', 'magenta');
    this.log('='.repeat(50), 'magenta');

    // Test Results
    this.log('\n🧪 Test Results:', 'cyan');
    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      const color = passed ? 'green' : 'red';
      this.log(`  ${test}: ${status}`, color);
    });

    // Issues Found
    if (this.issues.length > 0) {
      this.log('\n🚨 Issues Found:', 'red');
      this.issues.forEach((issue, index) => {
        this.log(`  ${index + 1}. ${issue}`, 'red');
      });
    }

    // Fixes Applied
    if (this.fixes.length > 0) {
      this.log('\n🔧 Fixes Applied:', 'green');
      this.fixes.forEach((fix, index) => {
        this.log(`  ${index + 1}. ${fix}`, 'green');
      });
    }

    // Recommendations
    this.log('\n💡 Recommendations:', 'yellow');
    if (!results.supabaseInit) {
      this.log('  • Check Supabase credentials in environment variables', 'yellow');
    }
    if (!results.databaseSchema) {
      this.log('  • Run database migration to create password_reset_tokens table', 'yellow');
    }
    if (!results.emailConfig) {
      this.log('  • Configure SMTP settings for email delivery', 'yellow');
    }
    if (!results.passwordResetRequest) {
      this.log('  • Check API endpoint routing and error handling', 'yellow');
    }
    if (!results.tokenValidation) {
      this.log('  • Verify token generation and validation logic', 'yellow');
    }

    const overallStatus = Object.values(results).every(Boolean);
    this.log(`\n🎯 Overall Status: ${overallStatus ? '✅ HEALTHY' : '❌ NEEDS ATTENTION'}`, 
             overallStatus ? 'green' : 'red');
  }
}

// Main execution
async function main() {
  const diagnostic = new PasswordResetDebugger();

  try {
    const results = await diagnostic.runDiagnostics();
    diagnostic.generateReport(results);

    process.exit(Object.values(results).every(Boolean) ? 0 : 1);
  } catch (error) {
    console.error('❌ Fatal error during diagnostics:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PasswordResetDebugger;
