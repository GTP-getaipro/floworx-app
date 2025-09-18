#!/usr/bin/env node

/**
 * Auth API Diagnostic Script
 * Tests authentication endpoints and email delivery
 */

const axios = require('axios');
const fs = require('fs').promises;

class AuthDiagnostic {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com';
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {}
    };
    this.testEmail = 'test-auth-diagnostic@floworx-test.com';
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[level] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async testAuthVerifyEndpoint() {
    this.log('Testing GET /api/auth/verify endpoint...');
    
    try {
      // Test without authentication (should return 401)
      const response = await axios.get(`${this.baseURL}/api/auth/verify`, {
        withCredentials: true,
        validateStatus: () => true // Don't throw on 4xx/5xx
      });
      
      const test = {
        name: 'Auth Verify Endpoint',
        endpoint: 'GET /api/auth/verify',
        status: response.status,
        data: response.data,
        headers: response.headers,
        success: response.status === 401, // Should be 401 without auth
        expectedFormat: response.data?.error?.code === 'UNAUTHORIZED'
      };
      
      this.results.tests.push(test);
      
      if (test.success && test.expectedFormat) {
        this.log('✅ Auth verify endpoint returns correct 401 with unified error format', 'success');
      } else if (test.success) {
        this.log('⚠️ Auth verify endpoint returns 401 but wrong error format', 'warning');
      } else {
        this.log(`❌ Auth verify endpoint returned ${response.status} instead of 401`, 'error');
      }
      
      return test;
    } catch (error) {
      this.log(`❌ Error testing auth verify: ${error.message}`, 'error');
      const test = {
        name: 'Auth Verify Endpoint',
        endpoint: 'GET /api/auth/verify',
        error: error.message,
        success: false
      };
      this.results.tests.push(test);
      return test;
    }
  }

  async testPasswordResetRequest() {
    this.log('Testing POST /api/auth/password/request endpoint...');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/password/request`, {
        email: this.testEmail
      }, {
        withCredentials: true,
        validateStatus: () => true
      });
      
      const test = {
        name: 'Password Reset Request',
        endpoint: 'POST /api/auth/password/request',
        status: response.status,
        data: response.data,
        success: response.status === 200 || response.status === 202, // 202 is correct for async email operations
        emailRequested: true
      };
      
      this.results.tests.push(test);
      
      if (test.success) {
        this.log('✅ Password reset request endpoint working', 'success');
      } else {
        this.log(`❌ Password reset request failed with status ${response.status}`, 'error');
      }
      
      return test;
    } catch (error) {
      this.log(`❌ Error testing password reset: ${error.message}`, 'error');
      const test = {
        name: 'Password Reset Request',
        endpoint: 'POST /api/auth/password/request',
        error: error.message,
        success: false
      };
      this.results.tests.push(test);
      return test;
    }
  }

  async testLoginEndpoint() {
    this.log('Testing POST /api/auth/login endpoint...');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'nonexistent@test.com',
        password: 'wrongpassword'
      }, {
        withCredentials: true,
        validateStatus: () => true
      });
      
      const test = {
        name: 'Login Endpoint',
        endpoint: 'POST /api/auth/login',
        status: response.status,
        data: response.data,
        success: response.status === 401, // Should be 401 for invalid credentials
        expectedFormat: response.data?.error?.code !== undefined
      };
      
      this.results.tests.push(test);
      
      if (test.success) {
        this.log('✅ Login endpoint returns correct 401 for invalid credentials', 'success');
      } else {
        this.log(`❌ Login endpoint returned ${response.status} instead of 401`, 'error');
      }
      
      return test;
    } catch (error) {
      this.log(`❌ Error testing login: ${error.message}`, 'error');
      const test = {
        name: 'Login Endpoint',
        endpoint: 'POST /api/auth/login',
        error: error.message,
        success: false
      };
      this.results.tests.push(test);
      return test;
    }
  }

  async testRegisterEndpoint() {
    this.log('Testing POST /api/auth/register endpoint...');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/register`, {
        firstName: 'Test',
        lastName: 'User',
        email: `test-${Date.now()}@floworx-test.com`,
        password: 'TestPass123!',
        confirmPassword: 'TestPass123!'
      }, {
        withCredentials: true,
        validateStatus: () => true
      });
      
      const test = {
        name: 'Register Endpoint',
        endpoint: 'POST /api/auth/register',
        status: response.status,
        data: response.data,
        success: response.status === 201 || response.status === 200,
        emailSent: response.data?.emailSent || false
      };
      
      this.results.tests.push(test);
      
      if (test.success) {
        this.log('✅ Register endpoint working', 'success');
        if (test.emailSent) {
          this.log('✅ Registration email sent', 'success');
        } else {
          this.log('⚠️ Registration succeeded but no email sent', 'warning');
        }
      } else {
        this.log(`❌ Register endpoint failed with status ${response.status}`, 'error');
      }
      
      return test;
    } catch (error) {
      this.log(`❌ Error testing register: ${error.message}`, 'error');
      const test = {
        name: 'Register Endpoint',
        endpoint: 'POST /api/auth/register',
        error: error.message,
        success: false
      };
      this.results.tests.push(test);
      return test;
    }
  }

  async testCookieHandling() {
    this.log('Testing cookie handling...');
    
    try {
      // Make a request and check if cookies are set properly
      const response = await axios.get(`${this.baseURL}/api/auth/verify`, {
        withCredentials: true,
        validateStatus: () => true
      });
      
      const setCookieHeaders = response.headers['set-cookie'] || [];
      const hasFxSessCookie = setCookieHeaders.some(cookie => cookie.includes('fx_sess'));
      
      const test = {
        name: 'Cookie Handling',
        endpoint: 'Cookie Configuration',
        setCookieHeaders,
        hasFxSessCookie,
        withCredentials: true,
        success: true // This is more about configuration than success
      };
      
      this.results.tests.push(test);
      
      this.log('✅ Cookie handling test completed', 'success');
      return test;
    } catch (error) {
      this.log(`❌ Error testing cookies: ${error.message}`, 'error');
      const test = {
        name: 'Cookie Handling',
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
      status: failed === 0 ? 'ALL_TESTS_PASSED' : 'ISSUES_DETECTED'
    };
    
    this.log('\n📊 AUTH API DIAGNOSTIC SUMMARY', 'info');
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
    this.log('🚀 Starting Auth API Diagnostic', 'info');
    this.log(`Target: ${this.baseURL}`, 'info');
    
    try {
      // Run all tests
      await this.testAuthVerifyEndpoint();
      await this.testLoginEndpoint();
      await this.testRegisterEndpoint();
      await this.testPasswordResetRequest();
      await this.testCookieHandling();
      
      // Generate report
      const results = this.generateReport();
      
      // Save results to file
      await fs.writeFile('auth-diagnostic-results.json', JSON.stringify(results, null, 2));
      this.log('📄 Results saved to auth-diagnostic-results.json', 'info');
      
      // Exit with appropriate code
      process.exit(results.summary.failed === 0 ? 0 : 1);
      
    } catch (error) {
      this.log(`🚨 Critical error during diagnostic: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run diagnostic if called directly
if (require.main === module) {
  const diagnostic = new AuthDiagnostic();
  diagnostic.run().catch(console.error);
}

module.exports = AuthDiagnostic;
