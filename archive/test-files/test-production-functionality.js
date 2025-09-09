#!/usr/bin/env node

/**
 * Production Functionality Test Suite
 * Tests critical user flows on https://app.floworx-iq.com
 */

const axios = require('axios');
const crypto = require('crypto');

class ProductionFunctionalityTester {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com';
    this.testResults = {
      passed: 0,
      failed: 0,
      issues: [],
      details: []
    };
    
    // Generate unique test data
    this.testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: `test.${crypto.randomBytes(8).toString('hex')}@example.com`,
      password: 'TestPassword123!',
      companyName: 'Test Company'
    };
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 10000
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return {
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 0,
        data: error.response?.data || error.message,
        headers: error.response?.headers || {},
        error: error.message
      };
    }
  }

  async testHealthEndpoint() {
    this.log('\n🏥 Testing Health Endpoint', 'info');
    
    const result = await this.makeRequest('GET', '/api/health');
    
    if (result.success && result.status === 200) {
      this.log('✅ Health endpoint is working', 'success');
      this.testResults.passed++;
      this.testResults.details.push({
        test: 'Health Endpoint',
        status: 'PASSED',
        details: result.data
      });
    } else {
      this.log(`❌ Health endpoint failed: ${result.status} - ${JSON.stringify(result.data)}`, 'error');
      this.testResults.failed++;
      this.testResults.issues.push('Health endpoint not responding correctly');
    }
  }

  async testUserRegistration() {
    this.log('\n👤 Testing User Registration', 'info');
    this.log(`📧 Test email: ${this.testUser.email}`, 'info');
    
    const registrationData = {
      firstName: this.testUser.firstName,
      lastName: this.testUser.lastName,
      email: this.testUser.email,
      password: this.testUser.password,
      businessName: this.testUser.companyName,
      agreeToTerms: true,
      marketingConsent: false
    };

    const result = await this.makeRequest('POST', '/api/auth/register', registrationData);
    
    if (result.success && (result.status === 200 || result.status === 201)) {
      this.log('✅ User registration successful', 'success');
      this.testResults.passed++;
      this.testResults.details.push({
        test: 'User Registration',
        status: 'PASSED',
        email: this.testUser.email,
        response: result.data
      });
      return true;
    } else {
      this.log(`❌ User registration failed: ${result.status} - ${JSON.stringify(result.data)}`, 'error');
      this.testResults.failed++;
      this.testResults.issues.push(`Registration failed: ${result.status} - ${result.error || 'Unknown error'}`);
      return false;
    }
  }

  async testUserLogin() {
    this.log('\n🔐 Testing User Login', 'info');
    
    const loginData = {
      email: this.testUser.email,
      password: this.testUser.password
    };

    const result = await this.makeRequest('POST', '/api/auth/login', loginData);
    
    if (result.success && result.status === 200 && result.data.token) {
      this.log('✅ User login successful', 'success');
      this.testResults.passed++;
      this.testResults.details.push({
        test: 'User Login',
        status: 'PASSED',
        hasToken: !!result.data.token
      });
      return result.data.token;
    } else {
      this.log(`❌ User login failed: ${result.status} - ${JSON.stringify(result.data)}`, 'error');
      this.testResults.failed++;
      this.testResults.issues.push(`Login failed: ${result.status} - ${result.error || 'Unknown error'}`);
      return null;
    }
  }

  async testPasswordReset() {
    this.log('\n🔄 Testing Password Reset', 'info');
    
    const resetData = {
      email: this.testUser.email
    };

    const result = await this.makeRequest('POST', '/api/auth/forgot-password', resetData);
    
    if (result.success && (result.status === 200 || result.status === 202)) {
      this.log('✅ Password reset request successful', 'success');
      this.testResults.passed++;
      this.testResults.details.push({
        test: 'Password Reset',
        status: 'PASSED',
        response: result.data
      });
      return true;
    } else {
      this.log(`❌ Password reset failed: ${result.status} - ${JSON.stringify(result.data)}`, 'error');
      this.testResults.failed++;
      this.testResults.issues.push(`Password reset failed: ${result.status} - ${result.error || 'Unknown error'}`);
      return false;
    }
  }

  async testAuthenticatedEndpoints(token) {
    this.log('\n🔒 Testing Authenticated Endpoints', 'info');
    
    const headers = {
      'Authorization': `Bearer ${token}`
    };

    // Test user status
    const statusResult = await this.makeRequest('GET', '/api/user/status', null, headers);
    if (statusResult.success && statusResult.status === 200) {
      this.log('✅ User status endpoint working', 'success');
      this.testResults.passed++;
    } else {
      this.log(`❌ User status failed: ${statusResult.status}`, 'error');
      this.testResults.failed++;
      this.testResults.issues.push('User status endpoint not working with valid token');
    }

    // Test dashboard
    const dashboardResult = await this.makeRequest('GET', '/api/dashboard', null, headers);
    if (dashboardResult.success && dashboardResult.status === 200) {
      this.log('✅ Dashboard endpoint working', 'success');
      this.testResults.passed++;
    } else {
      this.log(`❌ Dashboard failed: ${dashboardResult.status}`, 'error');
      this.testResults.failed++;
      this.testResults.issues.push('Dashboard endpoint not working with valid token');
    }
  }

  async runFullRegressionTest() {
    this.log('🚀 Starting Production Functionality Test Suite', 'info');
    this.log(`🌐 Testing: ${this.baseURL}`, 'info');
    this.log('=' * 60, 'info');

    try {
      // Test 1: Health check
      await this.testHealthEndpoint();

      // Test 2: User registration
      const registrationSuccess = await this.testUserRegistration();

      // Test 3: User login (only if registration succeeded)
      let token = null;
      if (registrationSuccess) {
        token = await this.testUserLogin();
      }

      // Test 4: Password reset
      await this.testPasswordReset();

      // Test 5: Authenticated endpoints (only if login succeeded)
      if (token) {
        await this.testAuthenticatedEndpoints(token);
      }

      // Generate final report
      this.generateReport();

    } catch (error) {
      this.log(`💥 Test suite crashed: ${error.message}`, 'error');
      this.testResults.issues.push(`Test suite error: ${error.message}`);
    }
  }

  generateReport() {
    this.log('\n📊 PRODUCTION FUNCTIONALITY TEST RESULTS', 'info');
    this.log('=' * 60, 'info');
    
    const total = this.testResults.passed + this.testResults.failed;
    const successRate = total > 0 ? Math.round((this.testResults.passed / total) * 100) : 0;
    
    this.log(`✅ Passed: ${this.testResults.passed}`, 'success');
    this.log(`❌ Failed: ${this.testResults.failed}`, 'error');
    this.log(`📈 Success Rate: ${successRate}%`, successRate > 70 ? 'success' : 'error');
    
    if (this.testResults.issues.length > 0) {
      this.log('\n🚨 CRITICAL ISSUES FOUND:', 'error');
      this.testResults.issues.forEach((issue, index) => {
        this.log(`${index + 1}. ${issue}`, 'error');
      });
    }

    if (successRate < 70) {
      this.log('\n⚠️  APPLICATION HAS CRITICAL ISSUES - IMMEDIATE ACTION REQUIRED', 'error');
    } else if (successRate < 90) {
      this.log('\n⚠️  APPLICATION HAS SOME ISSUES - REVIEW RECOMMENDED', 'warning');
    } else {
      this.log('\n🎉 APPLICATION IS FUNCTIONING WELL', 'success');
    }

    // Save detailed report
    const reportPath = './production-test-report.json';
    require('fs').writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      baseURL: this.baseURL,
      testUser: { email: this.testUser.email },
      results: this.testResults
    }, null, 2));
    
    this.log(`\n📄 Detailed report saved to: ${reportPath}`, 'info');
  }
}

// Run the test suite
if (require.main === module) {
  const tester = new ProductionFunctionalityTester();
  tester.runFullRegressionTest().catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  });
}

module.exports = ProductionFunctionalityTester;
