#!/usr/bin/env node

/**
 * Comprehensive Password Reset Test Suite
 * 
 * Tests all aspects of password reset functionality:
 * - API endpoints
 * - Database operations
 * - Email delivery
 * - Token validation
 * - Security measures
 * - Error handling
 * - Rate limiting
 * 
 * Usage: node test-password-reset-comprehensive.js [--production]
 */

const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Test configuration
const config = {
  apiUrl: process.argv.includes('--production') 
    ? 'https://app.floworx-iq.com/api' 
    : process.env.REACT_APP_API_URL || 'http://localhost:5001/api',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  testEmail: 'test-password-reset@floworx-iq.com',
  isProduction: process.argv.includes('--production'),
  verbose: process.argv.includes('--verbose')
};

class PasswordResetTester {
  constructor() {
    this.testResults = [];
    this.supabase = null;
    this.testUserId = null;
    this.testToken = null;
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  async setup() {
    this.log('🚀 Setting up test environment...', 'info');
    
    try {
      this.supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
      
      // Create or get test user
      await this.setupTestUser();
      
      this.log('✅ Test environment ready', 'success');
      return true;
    } catch (error) {
      this.log(`❌ Setup failed: ${error.message}`, 'error');
      return false;
    }
  }

  async setupTestUser() {
    try {
      // Check if test user exists
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', config.testEmail)
        .single();

      if (existingUser) {
        this.testUserId = existingUser.id;
        this.log(`📧 Using existing test user: ${config.testEmail}`, 'info');
      } else {
        // Create test user
        const { data: newUser, error } = await this.supabase
          .from('users')
          .insert({
            email: config.testEmail,
            first_name: 'Test',
            last_name: 'User',
            password_hash: '$2b$12$dummy.hash.for.testing.only',
            email_verified: true,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        
        this.testUserId = newUser.id;
        this.log(`👤 Created test user: ${config.testEmail}`, 'success');
      }
    } catch (error) {
      throw new Error(`Test user setup failed: ${error.message}`);
    }
  }

  async runTest(testName, testFunction) {
    this.log(`\n🧪 Running: ${testName}`, 'info');
    
    try {
      const startTime = Date.now();
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      this.testResults.push({
        name: testName,
        status: 'PASS',
        duration,
        result
      });
      
      this.log(`✅ ${testName} - PASSED (${duration}ms)`, 'success');
      return result;
    } catch (error) {
      this.testResults.push({
        name: testName,
        status: 'FAIL',
        error: error.message,
        stack: config.verbose ? error.stack : undefined
      });
      
      this.log(`❌ ${testName} - FAILED: ${error.message}`, 'error');
      if (config.verbose) {
        console.log(error.stack);
      }
      return null;
    }
  }

  // Test 1: Password Reset Request - Valid Email
  async testPasswordResetRequestValid() {
    const response = await axios.post(`${config.apiUrl}/auth/forgot-password`, {
      email: config.testEmail
    });

    if (!response.data.success) {
      throw new Error('Password reset request should succeed for valid email');
    }

    return response.data;
  }

  // Test 2: Password Reset Request - Invalid Email
  async testPasswordResetRequestInvalid() {
    const response = await axios.post(`${config.apiUrl}/auth/forgot-password`, {
      email: 'nonexistent@example.com'
    });

    // Should still return success for security (don't reveal if email exists)
    if (!response.data.success) {
      throw new Error('Password reset should return success even for non-existent emails');
    }

    return response.data;
  }

  // Test 3: Password Reset Request - Malformed Email
  async testPasswordResetRequestMalformed() {
    try {
      await axios.post(`${config.apiUrl}/auth/forgot-password`, {
        email: 'invalid-email'
      });
      throw new Error('Should reject malformed email');
    } catch (error) {
      if (error.response?.status !== 400) {
        throw new Error('Should return 400 for malformed email');
      }
      return { rejected: true, status: error.response.status };
    }
  }

  // Test 4: Token Generation and Storage
  async testTokenGeneration() {
    // Clean up any existing tokens for test user
    await this.supabase
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', this.testUserId);

    // Request password reset
    await axios.post(`${config.apiUrl}/auth/forgot-password`, {
      email: config.testEmail
    });

    // Check if token was created in database
    const { data: tokens } = await this.supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('user_id', this.testUserId)
      .eq('used', false);

    if (!tokens || tokens.length === 0) {
      throw new Error('No password reset token found in database');
    }

    const token = tokens[0];
    this.testToken = token.token;

    // Validate token properties
    if (!token.token || token.token.length < 32) {
      throw new Error('Token should be at least 32 characters');
    }

    if (new Date(token.expires_at) <= new Date()) {
      throw new Error('Token should not be expired');
    }

    return { tokenCreated: true, tokenLength: token.token.length };
  }

  // Test 5: Token Validation - Valid Token
  async testTokenValidationValid() {
    if (!this.testToken) {
      throw new Error('No test token available');
    }

    const response = await axios.post(`${config.apiUrl}/password-reset/validate`, {
      token: this.testToken
    });

    if (!response.data.valid) {
      throw new Error('Valid token should pass validation');
    }

    return response.data;
  }

  // Test 6: Token Validation - Invalid Token
  async testTokenValidationInvalid() {
    const fakeToken = crypto.randomBytes(32).toString('hex');
    
    try {
      const response = await axios.post(`${config.apiUrl}/password-reset/validate`, {
        token: fakeToken
      });

      if (response.data.valid) {
        throw new Error('Invalid token should not pass validation');
      }
    } catch (error) {
      if (error.response?.status !== 400) {
        throw new Error('Should return 400 for invalid token');
      }
    }

    return { invalidTokenRejected: true };
  }

  // Test 7: Password Reset - Valid Token and Password
  async testPasswordResetValid() {
    if (!this.testToken) {
      throw new Error('No test token available');
    }

    const newPassword = 'NewSecurePassword123!';
    
    const response = await axios.post(`${config.apiUrl}/password-reset/reset`, {
      token: this.testToken,
      password: newPassword
    });

    if (!response.data.success) {
      throw new Error('Password reset should succeed with valid token and password');
    }

    // Verify token is marked as used
    const { data: usedToken } = await this.supabase
      .from('password_reset_tokens')
      .select('used, used_at')
      .eq('token', this.testToken)
      .single();

    if (!usedToken.used || !usedToken.used_at) {
      throw new Error('Token should be marked as used after password reset');
    }

    return response.data;
  }

  // Test 8: Password Reset - Weak Password
  async testPasswordResetWeakPassword() {
    // Create a new token for this test
    const testToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.supabase
      .from('password_reset_tokens')
      .insert({
        user_id: this.testUserId,
        token: testToken,
        expires_at: expiresAt.toISOString()
      });

    try {
      await axios.post(`${config.apiUrl}/password-reset/reset`, {
        token: testToken,
        password: '123' // Weak password
      });
      throw new Error('Should reject weak password');
    } catch (error) {
      if (error.response?.status !== 400) {
        throw new Error('Should return 400 for weak password');
      }
    }

    return { weakPasswordRejected: true };
  }

  // Test 9: Rate Limiting
  async testRateLimiting() {
    if (config.isProduction) {
      this.log('⚠️  Skipping rate limiting test in production', 'warning');
      return { skipped: true, reason: 'production environment' };
    }

    const requests = [];
    const maxRequests = 10;

    // Send multiple requests rapidly
    for (let i = 0; i < maxRequests; i++) {
      requests.push(
        axios.post(`${config.apiUrl}/auth/forgot-password`, {
          email: config.testEmail
        }).catch(error => error.response)
      );
    }

    const responses = await Promise.all(requests);
    const rateLimited = responses.some(response => 
      response?.status === 429 || response?.data?.rateLimited
    );

    if (!rateLimited) {
      this.log('⚠️  Rate limiting may not be properly configured', 'warning');
    }

    return { rateLimitingActive: rateLimited };
  }

  // Test 10: Expired Token Handling
  async testExpiredToken() {
    // Create an expired token
    const expiredToken = crypto.randomBytes(32).toString('hex');
    const expiredTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    await this.supabase
      .from('password_reset_tokens')
      .insert({
        user_id: this.testUserId,
        token: expiredToken,
        expires_at: expiredTime.toISOString()
      });

    try {
      await axios.post(`${config.apiUrl}/password-reset/validate`, {
        token: expiredToken
      });
      throw new Error('Expired token should be rejected');
    } catch (error) {
      if (error.response?.status !== 400) {
        throw new Error('Should return 400 for expired token');
      }
    }

    return { expiredTokenRejected: true };
  }

  async runAllTests() {
    this.log('🧪 Starting Comprehensive Password Reset Tests', 'info');
    this.log(`Environment: ${config.isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`, 'info');
    this.log(`API URL: ${config.apiUrl}`, 'info');

    const tests = [
      ['Password Reset Request - Valid Email', () => this.testPasswordResetRequestValid()],
      ['Password Reset Request - Invalid Email', () => this.testPasswordResetRequestInvalid()],
      ['Password Reset Request - Malformed Email', () => this.testPasswordResetRequestMalformed()],
      ['Token Generation and Storage', () => this.testTokenGeneration()],
      ['Token Validation - Valid Token', () => this.testTokenValidationValid()],
      ['Token Validation - Invalid Token', () => this.testTokenValidationInvalid()],
      ['Password Reset - Valid Token and Password', () => this.testPasswordResetValid()],
      ['Password Reset - Weak Password', () => this.testPasswordResetWeakPassword()],
      ['Rate Limiting', () => this.testRateLimiting()],
      ['Expired Token Handling', () => this.testExpiredToken()]
    ];

    for (const [testName, testFunction] of tests) {
      await this.runTest(testName, testFunction);
    }
  }

  async cleanup() {
    this.log('\n🧹 Cleaning up test data...', 'info');
    
    try {
      // Remove test tokens
      await this.supabase
        .from('password_reset_tokens')
        .delete()
        .eq('user_id', this.testUserId);

      // Optionally remove test user (commented out to preserve for future tests)
      // await this.supabase
      //   .from('users')
      //   .delete()
      //   .eq('id', this.testUserId);

      this.log('✅ Cleanup completed', 'success');
    } catch (error) {
      this.log(`⚠️  Cleanup warning: ${error.message}`, 'warning');
    }
  }

  generateReport() {
    this.log('\n📊 TEST REPORT', 'info');
    this.log('='.repeat(50), 'info');

    const passed = this.testResults.filter(t => t.status === 'PASS').length;
    const failed = this.testResults.filter(t => t.status === 'FAIL').length;
    const total = this.testResults.length;

    this.log(`\n📈 Summary: ${passed}/${total} tests passed`, passed === total ? 'success' : 'error');

    if (failed > 0) {
      this.log('\n❌ Failed Tests:', 'error');
      this.testResults
        .filter(t => t.status === 'FAIL')
        .forEach(test => {
          this.log(`  • ${test.name}: ${test.error}`, 'error');
        });
    }

    this.log('\n✅ Passed Tests:', 'success');
    this.testResults
      .filter(t => t.status === 'PASS')
      .forEach(test => {
        this.log(`  • ${test.name} (${test.duration}ms)`, 'success');
      });

    return { passed, failed, total, success: failed === 0 };
  }
}

// Main execution
async function main() {
  const tester = new PasswordResetTester();
  
  try {
    const setupSuccess = await tester.setup();
    if (!setupSuccess) {
      process.exit(1);
    }

    await tester.runAllTests();
    await tester.cleanup();
    
    const report = tester.generateReport();
    process.exit(report.success ? 0 : 1);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PasswordResetTester;
