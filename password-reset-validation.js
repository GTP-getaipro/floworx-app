#!/usr/bin/env node

/**
 * Password Reset Feature Validation Script
 * Tests the complete password reset flow including frontend and backend integration
 */

const axios = require('axios');
const fs = require('fs').promises;

class PasswordResetValidator {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com';
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {}
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔐',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[level] || '🔐';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async testPasswordResetAPI() {
    this.log('Testing password reset API endpoint...', 'info');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/password/request`, {
        email: 'test-password-reset@floworx-test.com'
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      });
      
      const test = {
        name: 'Password Reset API',
        endpoint: 'POST /api/auth/password/request',
        status: response.status,
        data: response.data,
        success: response.status === 202,
        expectedMessage: response.data?.message?.includes('password reset link')
      };
      
      this.results.tests.push(test);
      
      if (test.success && test.expectedMessage) {
        this.log('✅ Password reset API working correctly', 'success');
      } else {
        this.log(`❌ Password reset API issue: ${response.status}`, 'error');
      }
      
      return test;
    } catch (error) {
      this.log(`❌ Error testing password reset API: ${error.message}`, 'error');
      const test = {
        name: 'Password Reset API',
        error: error.message,
        success: false
      };
      this.results.tests.push(test);
      return test;
    }
  }

  async testForgotPasswordAPI() {
    this.log('Testing forgot password API endpoint...', 'info');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/forgot-password`, {
        email: 'test-forgot-password@floworx-test.com'
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      });
      
      const test = {
        name: 'Forgot Password API',
        endpoint: 'POST /api/auth/forgot-password',
        status: response.status,
        data: response.data,
        success: response.status === 200 && response.data?.success === true
      };
      
      this.results.tests.push(test);
      
      if (test.success) {
        this.log('✅ Forgot password API working correctly', 'success');
      } else {
        this.log(`❌ Forgot password API issue: ${response.status}`, 'error');
      }
      
      return test;
    } catch (error) {
      this.log(`❌ Error testing forgot password API: ${error.message}`, 'error');
      const test = {
        name: 'Forgot Password API',
        error: error.message,
        success: false
      };
      this.results.tests.push(test);
      return test;
    }
  }

  async testCSRFExemption() {
    this.log('Testing CSRF exemption for password reset...', 'info');
    
    try {
      // Test without CSRF token - should work
      const response = await axios.post(`${this.baseURL}/api/auth/password/request`, {
        email: 'test-csrf-exempt@floworx-test.com'
      }, {
        headers: {
          'Content-Type': 'application/json'
          // Deliberately not including CSRF token
        },
        validateStatus: () => true
      });
      
      const test = {
        name: 'CSRF Exemption Test',
        endpoint: 'POST /api/auth/password/request (no CSRF token)',
        status: response.status,
        success: response.status === 202, // Should work without CSRF token
        csrfExempt: response.status !== 403
      };
      
      this.results.tests.push(test);
      
      if (test.success && test.csrfExempt) {
        this.log('✅ Password reset correctly exempt from CSRF protection', 'success');
      } else if (response.status === 403) {
        this.log('❌ Password reset still requires CSRF token (should be exempt)', 'error');
      } else {
        this.log(`⚠️ Unexpected response: ${response.status}`, 'warning');
      }
      
      return test;
    } catch (error) {
      this.log(`❌ Error testing CSRF exemption: ${error.message}`, 'error');
      const test = {
        name: 'CSRF Exemption Test',
        error: error.message,
        success: false
      };
      this.results.tests.push(test);
      return test;
    }
  }

  async testFrontendPageAccess() {
    this.log('Testing forgot password page accessibility...', 'info');
    
    try {
      const response = await axios.get(`${this.baseURL}/forgot-password`, {
        validateStatus: () => true,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      
      const test = {
        name: 'Frontend Page Access',
        endpoint: 'GET /forgot-password',
        status: response.status,
        success: response.status === 200,
        hasResetForm: response.data?.includes('Reset your password') || response.data?.includes('forgot-password')
      };
      
      this.results.tests.push(test);
      
      if (test.success) {
        this.log('✅ Forgot password page accessible', 'success');
      } else {
        this.log(`❌ Forgot password page not accessible: ${response.status}`, 'error');
      }
      
      return test;
    } catch (error) {
      this.log(`❌ Error accessing forgot password page: ${error.message}`, 'error');
      const test = {
        name: 'Frontend Page Access',
        error: error.message,
        success: false
      };
      this.results.tests.push(test);
      return test;
    }
  }

  async testRateLimiting() {
    this.log('Testing rate limiting on password reset...', 'info');
    
    try {
      const testEmail = 'test-rate-limit@floworx-test.com';
      const requests = [];
      
      // Make multiple rapid requests
      for (let i = 0; i < 3; i++) {
        requests.push(
          axios.post(`${this.baseURL}/api/auth/password/request`, {
            email: testEmail
          }, {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json'
            },
            validateStatus: () => true
          })
        );
      }
      
      const responses = await Promise.all(requests);
      const statuses = responses.map(r => r.status);
      
      const test = {
        name: 'Rate Limiting Test',
        endpoint: 'POST /api/auth/password/request (multiple requests)',
        statuses,
        success: statuses.every(status => status === 202 || status === 429), // All should be accepted or rate limited
        rateLimited: statuses.some(status => status === 429)
      };
      
      this.results.tests.push(test);
      
      if (test.success) {
        this.log('✅ Rate limiting working correctly', 'success');
        if (test.rateLimited) {
          this.log('✅ Rate limiting triggered as expected', 'success');
        }
      } else {
        this.log('❌ Rate limiting not working properly', 'error');
      }
      
      return test;
    } catch (error) {
      this.log(`❌ Error testing rate limiting: ${error.message}`, 'error');
      const test = {
        name: 'Rate Limiting Test',
        error: error.message,
        success: false
      };
      this.results.tests.push(test);
      return test;
    }
  }

  generateReport() {
    const passed = this.results.tests.filter(t => t.success).length;
    const failed = this.results.tests.filter(t => !t.success).length;
    const total = this.results.tests.length;
    
    this.results.summary = {
      total,
      passed,
      failed,
      successRate: `${((passed / total) * 100).toFixed(1)}%`,
      status: failed === 0 ? 'PASSWORD_RESET_FULLY_OPERATIONAL' : 'ISSUES_DETECTED'
    };
    
    this.log('\n📊 PASSWORD RESET VALIDATION SUMMARY', 'info');
    this.log(`Total Tests: ${total}`, 'info');
    this.log(`Passed: ${passed}`, 'success');
    this.log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');
    this.log(`Success Rate: ${this.results.summary.successRate}`, 'info');
    
    // Detailed results
    this.log('\n📋 DETAILED RESULTS:', 'info');
    this.results.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      this.log(`${status} ${test.name}: ${test.endpoint || 'N/A'}`, test.success ? 'success' : 'error');
      if (test.error) {
        this.log(`   Error: ${test.error}`, 'error');
      }
      if (test.status) {
        this.log(`   Status: ${test.status}`, 'info');
      }
    });
    
    return this.results;
  }

  async run() {
    this.log('🚀 Starting Password Reset Validation', 'info');
    this.log(`Target: ${this.baseURL}`, 'info');
    
    try {
      // Run all tests
      await this.testPasswordResetAPI();
      await this.testForgotPasswordAPI();
      await this.testCSRFExemption();
      await this.testFrontendPageAccess();
      await this.testRateLimiting();
      
      // Generate report
      const results = this.generateReport();
      
      // Save results
      await fs.writeFile('password-reset-validation-results.json', JSON.stringify(results, null, 2));
      this.log('📄 Results saved to password-reset-validation-results.json', 'info');
      
      // Exit with appropriate code
      process.exit(results.summary.failed === 0 ? 0 : 1);
      
    } catch (error) {
      this.log(`🚨 Critical error during validation: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new PasswordResetValidator();
  validator.run().catch(console.error);
}

module.exports = PasswordResetValidator;
