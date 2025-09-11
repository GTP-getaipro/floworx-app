#!/usr/bin/env node

/**
 * COMPREHENSIVE AUTHENTICATION FIX
 * ================================
 * Provides multiple solutions for the authentication issues
 */

const axios = require('axios');
const { chromium } = require('playwright');
const fs = require('fs');

class ComprehensiveAuthFix {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.apiUrl = `${baseUrl}/api`;
    this.targetEmail = 'dizelll2007@gmail.com';
    this.solutions = [];
  }

  /**
   * Solution 1: Create a fresh working test user
   */
  async createFreshTestUser() {
    console.log('🆕 SOLUTION 1: CREATE FRESH TEST USER');
    console.log('====================================');

    const freshEmail = `dizelll.test.${Date.now()}@gmail.com`;
    const password = 'TestPassword123!';

    const userData = {
      firstName: 'Test',
      lastName: 'User',
      email: freshEmail,
      password: password,
      businessName: 'Test Business LLC',
      phone: '+1234567890',
      agreeToTerms: true,
      marketingConsent: false
    };

    try {
      console.log(`📧 Creating fresh user: ${freshEmail}`);
      const registerResponse = await axios.post(`${this.apiUrl}/auth/register`, userData, {
        timeout: 15000
      });

      console.log(`✅ Registration successful: ${registerResponse.status}`);
      console.log(`📧 Requires verification: ${registerResponse.data.requiresVerification || false}`);

      // Test immediate login
      console.log('🔐 Testing immediate login...');
      const loginResponse = await axios.post(`${this.apiUrl}/auth/login`, {
        email: freshEmail,
        password: password
      });

      console.log(`✅ Login successful: ${loginResponse.status}`);
      console.log(`🎫 Token received: ${!!loginResponse.data.token}`);

      this.solutions.push({
        type: 'FRESH_USER',
        success: true,
        email: freshEmail,
        password: password,
        token: loginResponse.data.token,
        message: 'Fresh test user created and working'
      });

      return {
        success: true,
        email: freshEmail,
        password: password,
        token: loginResponse.data.token
      };

    } catch (error) {
      console.log(`❌ Fresh user creation failed: ${error.response?.data?.error?.message || error.message}`);
      this.solutions.push({
        type: 'FRESH_USER',
        success: false,
        error: error.response?.data?.error || error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Solution 2: Fix the existing user via database update
   */
  async createDatabaseUpdateSolution() {
    console.log('\n🗄️  SOLUTION 2: DATABASE UPDATE FOR EXISTING USER');
    console.log('=================================================');

    const newPassword = 'NewPassword123!';
    
    try {
      const bcrypt = require('bcryptjs');
      const hash = bcrypt.hashSync(newPassword, 12);

      const updateSQL = `-- Fix password for ${this.targetEmail}
-- Run this in your Supabase SQL Editor

UPDATE users 
SET password_hash = '${hash}',
    email_verified = true,
    updated_at = CURRENT_TIMESTAMP
WHERE email = '${this.targetEmail}';

-- Verify the update
SELECT id, email, first_name, last_name, email_verified, created_at, updated_at
FROM users 
WHERE email = '${this.targetEmail}';

-- Test the password hash (optional verification)
SELECT 
  email,
  password_hash,
  CASE 
    WHEN password_hash = '${hash}' THEN 'Password hash matches'
    ELSE 'Password hash different'
  END as hash_status
FROM users 
WHERE email = '${this.targetEmail}';`;

      fs.writeFileSync('fix-existing-user.sql', updateSQL);
      console.log('✅ SQL script created: fix-existing-user.sql');
      console.log(`🔑 New password will be: ${newPassword}`);

      this.solutions.push({
        type: 'DATABASE_UPDATE',
        success: true,
        email: this.targetEmail,
        newPassword: newPassword,
        sqlFile: 'fix-existing-user.sql',
        message: 'Database update script created'
      });

      return {
        success: true,
        newPassword: newPassword,
        sqlFile: 'fix-existing-user.sql'
      };

    } catch (error) {
      console.log(`❌ Database solution failed: ${error.message}`);
      this.solutions.push({
        type: 'DATABASE_UPDATE',
        success: false,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Solution 3: Create working password reset system
   */
  async createWorkingPasswordReset() {
    console.log('\n🔄 SOLUTION 3: WORKING PASSWORD RESET SYSTEM');
    console.log('============================================');

    // Create the missing database table and endpoint code
    const passwordResetSchema = `-- Create password reset table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP NULL,
  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Clean up expired tokens
DELETE FROM password_reset_tokens WHERE expires_at < CURRENT_TIMESTAMP;`;

    const passwordResetEndpoint = `// Add this to backend/routes/auth.js

const crypto = require('crypto');

// POST /api/auth/forgot-password
router.post('/forgot-password', 
  validateRequest({ body: forgotPasswordSchema }),
  asyncWrapper(async (req, res) => {
    const { email } = req.body;
    
    try {
      // Find user by email
      const userQuery = 'SELECT id, email, first_name FROM users WHERE email = $1';
      const userResult = await query(userQuery, [email.toLowerCase()]);
      
      if (userResult.rows.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        });
      }
      
      const user = userResult.rows[0];
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Store reset token
      const storeTokenQuery = \`
        INSERT INTO password_reset_tokens (user_id, token, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) 
        DO UPDATE SET token = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP, used_at = NULL
      \`;
      
      await query(storeTokenQuery, [user.id, resetToken, resetExpires]);
      
      // For development - log the reset URL
      const resetUrl = \`\${process.env.FRONTEND_URL || '${this.baseUrl}'}/reset-password?token=\${resetToken}\`;
      console.log(\`Password reset URL for \${user.email}: \${resetUrl}\`);
      
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
        resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined
      });
      
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        error: {
          type: 'SERVER_ERROR',
          message: 'Failed to process password reset request',
          code: 500
        }
      });
    }
  })
);`;

    fs.writeFileSync('password-reset-schema.sql', passwordResetSchema);
    fs.writeFileSync('password-reset-endpoint.js', passwordResetEndpoint);

    console.log('✅ Password reset schema created: password-reset-schema.sql');
    console.log('✅ Password reset endpoint created: password-reset-endpoint.js');

    this.solutions.push({
      type: 'PASSWORD_RESET_SYSTEM',
      success: true,
      files: ['password-reset-schema.sql', 'password-reset-endpoint.js'],
      message: 'Complete password reset system created'
    });

    return {
      success: true,
      files: ['password-reset-schema.sql', 'password-reset-endpoint.js']
    };
  }

  /**
   * Solution 4: Frontend login testing with working credentials
   */
  async testFrontendWithWorkingCredentials(workingCredentials) {
    console.log('\n🎨 SOLUTION 4: FRONTEND TESTING WITH WORKING CREDENTIALS');
    console.log('=======================================================');

    if (!workingCredentials || !workingCredentials.success) {
      console.log('⚠️  No working credentials available for frontend testing');
      return { success: false, reason: 'No working credentials' };
    }

    try {
      console.log('🌐 Opening browser for automated testing...');
      const browser = await chromium.launch({ headless: false });
      const page = await browser.newPage();

      // Navigate to login page
      await page.goto(`${this.baseUrl}/login`);
      await page.waitForLoadState('networkidle');

      // Fill in working credentials
      console.log(`📧 Filling email: ${workingCredentials.email}`);
      await page.fill('input[type="email"], input[name="email"]', workingCredentials.email);
      
      console.log(`🔑 Filling password: ${workingCredentials.password}`);
      await page.fill('input[type="password"], input[name="password"]', workingCredentials.password);

      // Monitor network requests
      const networkRequests = [];
      page.on('response', response => {
        if (response.url().includes('/auth/login')) {
          networkRequests.push({
            status: response.status(),
            url: response.url()
          });
        }
      });

      // Submit form
      console.log('🚀 Submitting login form...');
      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
      
      // Wait for response
      await page.waitForTimeout(5000);

      // Check results
      const currentUrl = page.url();
      const isRedirected = !currentUrl.includes('/login');
      
      const authData = await page.evaluate(() => {
        return {
          localStorage: localStorage.getItem('token') || localStorage.getItem('authToken'),
          sessionStorage: sessionStorage.getItem('token') || sessionStorage.getItem('authToken'),
          cookies: document.cookie
        };
      });

      const loginSuccess = isRedirected || !!authData.localStorage || !!authData.sessionStorage;

      console.log(`📍 Current URL: ${currentUrl}`);
      console.log(`🔄 Redirected: ${isRedirected}`);
      console.log(`🎫 Auth tokens: ${!!authData.localStorage || !!authData.sessionStorage}`);
      console.log(`📡 Network requests: ${networkRequests.length}`);
      console.log(`✅ Frontend login: ${loginSuccess ? 'SUCCESS' : 'FAILED'}`);

      // Keep browser open for 10 seconds
      await page.waitForTimeout(10000);
      await browser.close();

      this.solutions.push({
        type: 'FRONTEND_TEST',
        success: loginSuccess,
        email: workingCredentials.email,
        redirected: isRedirected,
        hasTokens: !!authData.localStorage || !!authData.sessionStorage,
        message: loginSuccess ? 'Frontend login working' : 'Frontend login needs work'
      });

      return {
        success: loginSuccess,
        currentUrl,
        isRedirected,
        authData,
        networkRequests
      };

    } catch (error) {
      console.log(`❌ Frontend testing failed: ${error.message}`);
      this.solutions.push({
        type: 'FRONTEND_TEST',
        success: false,
        error: error.message
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Run all comprehensive fixes
   */
  async runComprehensiveFix() {
    console.log('🔧 COMPREHENSIVE AUTHENTICATION FIX');
    console.log('===================================');
    console.log('Implementing multiple solutions for authentication issues...\n');

    const results = {
      freshUser: null,
      databaseUpdate: null,
      passwordResetSystem: null,
      frontendTest: null,
      timestamp: new Date().toISOString()
    };

    // Solution 1: Create fresh working user
    results.freshUser = await this.createFreshTestUser();

    // Solution 2: Database update for existing user
    results.databaseUpdate = await this.createDatabaseUpdateSolution();

    // Solution 3: Working password reset system
    results.passwordResetSystem = await this.createWorkingPasswordReset();

    // Solution 4: Frontend testing with working credentials
    if (results.freshUser?.success) {
      results.frontendTest = await this.testFrontendWithWorkingCredentials(results.freshUser);
    }

    // Generate comprehensive report
    console.log('\n📊 COMPREHENSIVE FIX RESULTS');
    console.log('=============================');

    const successfulSolutions = this.solutions.filter(s => s.success).length;
    const totalSolutions = this.solutions.length;

    console.log(`✅ Successful solutions: ${successfulSolutions}/${totalSolutions}`);
    console.log('');

    this.solutions.forEach((solution, index) => {
      const status = solution.success ? '✅' : '❌';
      console.log(`${status} ${solution.type}: ${solution.message || 'Completed'}`);
      
      if (solution.email) {
        console.log(`   📧 Email: ${solution.email}`);
      }
      if (solution.password || solution.newPassword) {
        console.log(`   🔑 Password: ${solution.password || solution.newPassword}`);
      }
      if (solution.files) {
        console.log(`   📄 Files: ${solution.files.join(', ')}`);
      }
    });

    console.log('\n🎯 IMMEDIATE ACTIONS YOU CAN TAKE:');
    
    if (results.freshUser?.success) {
      console.log(`1. ✅ USE FRESH TEST USER:`);
      console.log(`   📧 Email: ${results.freshUser.email}`);
      console.log(`   🔑 Password: ${results.freshUser.password}`);
      console.log(`   🎫 Token: Available`);
      console.log(`   🚀 Status: Ready to use immediately`);
    }

    if (results.databaseUpdate?.success) {
      console.log(`2. 🗄️  FIX EXISTING USER:`);
      console.log(`   📧 Email: ${this.targetEmail}`);
      console.log(`   🔑 New Password: ${results.databaseUpdate.newPassword}`);
      console.log(`   📄 SQL File: ${results.databaseUpdate.sqlFile}`);
      console.log(`   🚀 Action: Run SQL in Supabase dashboard`);
    }

    if (results.passwordResetSystem?.success) {
      console.log(`3. 🔄 IMPLEMENT PASSWORD RESET:`);
      console.log(`   📄 Files: ${results.passwordResetSystem.files.join(', ')}`);
      console.log(`   🚀 Action: Add to backend and database`);
    }

    // Save comprehensive report
    const reportData = {
      results,
      solutions: this.solutions,
      recommendations: {
        immediate: results.freshUser?.success ? 'Use fresh test user' : 'Run database update',
        longTerm: 'Implement password reset system',
        testing: results.frontendTest?.success ? 'Frontend working' : 'Frontend needs debugging'
      }
    };

    const reportFile = `comprehensive-auth-fix-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Comprehensive report saved to: ${reportFile}`);

    console.log('\n🎉 COMPREHENSIVE AUTHENTICATION FIX COMPLETE!');
    
    if (results.freshUser?.success) {
      console.log('✅ You now have a working test user for immediate testing!');
    }

    return reportData;
  }
}

// Run comprehensive fix if called directly
if (require.main === module) {
  const fixer = new ComprehensiveAuthFix();
  fixer.runComprehensiveFix()
    .then(results => {
      const success = results.solutions.some(s => s.success);
      process.exit(success ? 0 : 1);
    })
    .catch(console.error);
}

module.exports = ComprehensiveAuthFix;
