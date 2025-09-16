#!/usr/bin/env node

/**
 * Password Reset Issue Fixer
 * 
 * Automatically identifies and fixes common password reset issues:
 * - Missing database tables/columns
 * - Incorrect API routing
 * - Email configuration problems
 * - Token generation issues
 * - Frontend/backend URL mismatches
 * 
 * Usage: node fix-password-reset-issues.js [--apply-fixes]
 */

const fs = require('fs').promises;
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const config = {
  applyFixes: process.argv.includes('--apply-fixes'),
  verbose: process.argv.includes('--verbose'),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
};

class PasswordResetFixer {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.supabase = null;
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      fix: '\x1b[35m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  addIssue(description, severity = 'medium', fix = null) {
    this.issues.push({ description, severity, fix });
    this.log(`❌ ISSUE: ${description}`, 'error');
  }

  addFix(description, action) {
    this.fixes.push({ description, action });
    this.log(`🔧 FIX: ${description}`, 'fix');
  }

  async initializeSupabase() {
    try {
      if (!config.supabaseUrl || !config.supabaseServiceKey) {
        this.addIssue('Missing Supabase credentials in environment variables', 'high');
        return false;
      }

      this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
      return true;
    } catch (error) {
      this.addIssue(`Failed to initialize Supabase: ${error.message}`, 'high');
      return false;
    }
  }

  async checkDatabaseSchema() {
    this.log('\n🗄️  Checking Database Schema...', 'info');

    try {
      // Check password_reset_tokens table
      const { data, error } = await this.supabase
        .from('password_reset_tokens')
        .select('*')
        .limit(1);

      if (error) {
        this.addIssue('password_reset_tokens table missing or inaccessible', 'high', 
          'createPasswordResetTable');
        return false;
      }

      // Check required columns
      const requiredColumns = ['id', 'user_id', 'token', 'expires_at', 'used', 'created_at'];
      const { data: tableInfo } = await this.supabase.rpc('get_table_columns', {
        table_name: 'password_reset_tokens'
      }).catch(() => ({ data: null }));

      if (tableInfo) {
        const existingColumns = tableInfo.map(col => col.column_name);
        const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
        
        if (missingColumns.length > 0) {
          this.addIssue(`Missing columns in password_reset_tokens: ${missingColumns.join(', ')}`, 
            'high', 'addMissingColumns');
        }
      }

      this.log('✅ Database schema check completed', 'success');
      return true;
    } catch (error) {
      this.addIssue(`Database schema check failed: ${error.message}`, 'high');
      return false;
    }
  }

  async checkAPIRoutes() {
    this.log('\n🛣️  Checking API Routes...', 'info');

    const routeFiles = [
      'backend/routes/auth.js',
      'backend/routes/passwordReset.js',
      'api/auth/password-reset.js',
      'api/index.js'
    ];

    const requiredEndpoints = [
      'forgot-password',
      'reset-password',
      'verify-reset-token'
    ];

    for (const routeFile of routeFiles) {
      try {
        const content = await fs.readFile(routeFile, 'utf8');
        
        // Check for password reset endpoints
        const hasEndpoints = requiredEndpoints.map(endpoint => ({
          endpoint,
          found: content.includes(endpoint) || content.includes(endpoint.replace('-', '_'))
        }));

        const missingEndpoints = hasEndpoints.filter(e => !e.found);
        if (missingEndpoints.length > 0) {
          this.addIssue(`Missing endpoints in ${routeFile}: ${missingEndpoints.map(e => e.endpoint).join(', ')}`, 
            'medium', 'addMissingEndpoints');
        }

        // Check for proper error handling
        if (!content.includes('try') || !content.includes('catch')) {
          this.addIssue(`Missing error handling in ${routeFile}`, 'medium', 'addErrorHandling');
        }

      } catch (error) {
        if (error.code !== 'ENOENT') {
          this.addIssue(`Failed to read route file ${routeFile}: ${error.message}`, 'low');
        }
      }
    }

    this.log('✅ API routes check completed', 'success');
  }

  async checkEmailConfiguration() {
    this.log('\n📧 Checking Email Configuration...', 'info');

    const requiredEnvVars = [
      'SMTP_HOST',
      'SMTP_PORT',
      'SMTP_USER',
      'SMTP_PASS',
      'FROM_EMAIL'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      this.addIssue(`Missing email environment variables: ${missingVars.join(', ')}`, 
        'high', 'configureEmailSettings');
    }

    // Check email template
    try {
      await fs.access('backend/templates/password-reset-email.html');
      this.log('✅ Email template found', 'success');
    } catch (error) {
      this.addIssue('Password reset email template missing', 'medium', 'createEmailTemplate');
    }

    this.log('✅ Email configuration check completed', 'success');
  }

  async checkFrontendIntegration() {
    this.log('\n🌐 Checking Frontend Integration...', 'info');

    const frontendFiles = [
      'frontend/src/components/ForgotPassword.js',
      'frontend/src/components/ResetPassword.js'
    ];

    for (const file of frontendFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        
        // Check API URL configuration
        if (!content.includes('REACT_APP_API_URL')) {
          this.addIssue(`Missing API URL configuration in ${file}`, 'medium', 'fixAPIURLConfig');
        }

        // Check for proper error handling
        if (!content.includes('catch') || !content.includes('error')) {
          this.addIssue(`Missing error handling in ${file}`, 'low', 'addFrontendErrorHandling');
        }

      } catch (error) {
        if (error.code !== 'ENOENT') {
          this.addIssue(`Failed to read frontend file ${file}: ${error.message}`, 'low');
        }
      }
    }

    this.log('✅ Frontend integration check completed', 'success');
  }

  async applyFix(fixName) {
    this.log(`\n🔧 Applying fix: ${fixName}`, 'fix');

    switch (fixName) {
      case 'createPasswordResetTable':
        return await this.createPasswordResetTable();
      
      case 'configureEmailSettings':
        return await this.configureEmailSettings();
      
      case 'createEmailTemplate':
        return await this.createEmailTemplate();
      
      case 'fixAPIURLConfig':
        return await this.fixAPIURLConfig();
      
      default:
        this.log(`⚠️  Unknown fix: ${fixName}`, 'warning');
        return false;
    }
  }

  async createPasswordResetTable() {
    try {
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

      const { error } = await this.supabase.rpc('exec_sql', { sql: createTableSQL });
      if (error) throw error;

      this.log('✅ Created password_reset_tokens table', 'success');
      return true;
    } catch (error) {
      this.log(`❌ Failed to create table: ${error.message}`, 'error');
      return false;
    }
  }

  async configureEmailSettings() {
    const envTemplate = `
# Email Configuration for Password Reset
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=noreply@floworx-iq.com
FROM_NAME=Floworx Team
`;

    try {
      await fs.writeFile('.env.email-template', envTemplate);
      this.log('✅ Created email configuration template (.env.email-template)', 'success');
      this.log('📝 Please update the values and add them to your environment', 'info');
      return true;
    } catch (error) {
      this.log(`❌ Failed to create email template: ${error.message}`, 'error');
      return false;
    }
  }

  async createEmailTemplate() {
    const emailTemplate = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Reset Your Password - FloworxInvite</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c3e50;">Reset Your Password</h2>
        
        <p>We received a request to reset the password for your FloworxInvite account.</p>
        
        <p>If you requested this password reset, click the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{{reset_url}}" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        
        <p>If the button doesn't work, copy and paste this link:</p>
        <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 3px;">{{reset_url}}</p>
        
        <p><strong>Security Notice:</strong> This link will expire in {{expiry_hours}} hour(s). If you didn't request this reset, please ignore this email.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">© {{current_year}} FloworxInvite. All rights reserved.</p>
    </div>
</body>
</html>`;

    try {
      await fs.mkdir('backend/templates', { recursive: true });
      await fs.writeFile('backend/templates/password-reset-email.html', emailTemplate);
      this.log('✅ Created password reset email template', 'success');
      return true;
    } catch (error) {
      this.log(`❌ Failed to create email template: ${error.message}`, 'error');
      return false;
    }
  }

  async fixAPIURLConfig() {
    // This would require more complex file parsing and modification
    this.log('📝 Manual fix required: Update REACT_APP_API_URL in frontend environment', 'info');
    this.log('   Add to .env: REACT_APP_API_URL=http://localhost:5001/api', 'info');
    return true;
  }

  async runDiagnostics() {
    this.log('🚀 Starting Password Reset Issue Detection...', 'info');

    const supabaseInit = await this.initializeSupabase();
    
    if (supabaseInit) {
      await this.checkDatabaseSchema();
    }
    
    await this.checkAPIRoutes();
    await this.checkEmailConfiguration();
    await this.checkFrontendIntegration();

    return this.issues.length === 0;
  }

  async applyAllFixes() {
    if (!config.applyFixes) {
      this.log('\n💡 To apply fixes automatically, run with --apply-fixes flag', 'info');
      return;
    }

    this.log('\n🔧 Applying Fixes...', 'fix');

    const fixableIssues = this.issues.filter(issue => issue.fix);
    
    for (const issue of fixableIssues) {
      const success = await this.applyFix(issue.fix);
      if (success) {
        this.addFix(issue.description, issue.fix);
      }
    }
  }

  generateReport() {
    this.log('\n📊 PASSWORD RESET DIAGNOSTIC REPORT', 'info');
    this.log('='.repeat(50), 'info');

    if (this.issues.length === 0) {
      this.log('\n✅ No issues found! Password reset functionality appears healthy.', 'success');
      return;
    }

    // Group issues by severity
    const highSeverity = this.issues.filter(i => i.severity === 'high');
    const mediumSeverity = this.issues.filter(i => i.severity === 'medium');
    const lowSeverity = this.issues.filter(i => i.severity === 'low');

    if (highSeverity.length > 0) {
      this.log('\n🚨 HIGH PRIORITY ISSUES:', 'error');
      highSeverity.forEach((issue, index) => {
        this.log(`  ${index + 1}. ${issue.description}`, 'error');
      });
    }

    if (mediumSeverity.length > 0) {
      this.log('\n⚠️  MEDIUM PRIORITY ISSUES:', 'warning');
      mediumSeverity.forEach((issue, index) => {
        this.log(`  ${index + 1}. ${issue.description}`, 'warning');
      });
    }

    if (lowSeverity.length > 0) {
      this.log('\n📝 LOW PRIORITY ISSUES:', 'info');
      lowSeverity.forEach((issue, index) => {
        this.log(`  ${index + 1}. ${issue.description}`, 'info');
      });
    }

    if (this.fixes.length > 0) {
      this.log('\n✅ FIXES APPLIED:', 'success');
      this.fixes.forEach((fix, index) => {
        this.log(`  ${index + 1}. ${fix.description}`, 'success');
      });
    }

    this.log(`\n📈 Summary: ${this.issues.length} issues found, ${this.fixes.length} fixes applied`, 'info');
  }
}

// Main execution
async function main() {
  const fixer = new PasswordResetFixer();
  
  try {
    await fixer.runDiagnostics();
    await fixer.applyAllFixes();
    fixer.generateReport();
    
    process.exit(fixer.issues.length === 0 ? 0 : 1);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PasswordResetFixer;
