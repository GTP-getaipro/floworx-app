#!/usr/bin/env node

/**
 * Test Authenticated Endpoints
 * Tests user status and dashboard endpoints with valid JWT tokens
 */

const crypto = require('crypto');

const axios = require('axios');

class AuthenticatedEndpointTester {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com';
    this.testUser = null;
    this.authToken = null;
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

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        timeout: 10000,
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return {
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers,
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 0,
        data: error.response?.data || error.message,
        headers: error.response?.headers || {},
        error: error.message,
      };
    }
  }

  async registerAndLogin() {
    this.log('\n🔐 SETTING UP TEST USER', 'info');

    // Generate unique test user
    this.testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: `test.${crypto.randomBytes(8).toString('hex')}@example.com`,
      password: 'TestPassword123!',
      businessName: 'Test Company',
      agreeToTerms: true,
    };

    this.log(`📧 Test email: ${this.testUser.email}`, 'info');

    // Register user
    const regResult = await this.makeRequest('POST', '/api/auth/register', this.testUser);

    if (!regResult.success) {
      this.log(`❌ Registration failed: ${regResult.status}`, 'error');
      return false;
    }

    this.log('✅ User registered successfully', 'success');
    this.authToken = regResult.data.token;
    this.log(`🎫 Token received: ${this.authToken.substring(0, 20)}...`, 'success');

    return true;
  }

  async testUserStatusEndpoint() {
    this.log('\n👤 TESTING USER STATUS ENDPOINT', 'info');

    const headers = {
      Authorization: `Bearer ${this.authToken}`,
    };

    const result = await this.makeRequest('GET', '/api/user/status', null, headers);

    this.log(`Status: ${result.status}`, result.success ? 'success' : 'error');
    this.log(`Response: ${JSON.stringify(result.data, null, 2)}`, 'info');

    if (result.success) {
      this.log('✅ User status endpoint working', 'success');
      return true;
    } else {
      this.log(`❌ User status failed: ${result.status} - ${JSON.stringify(result.data)}`, 'error');

      // Analyze the error
      if (result.status === 404) {
        this.log('   Issue: Endpoint not found - routing problem', 'error');
      } else if (result.status === 401) {
        this.log('   Issue: Authentication failed - token validation problem', 'error');
      } else if (result.status === 500) {
        this.log('   Issue: Server error - implementation problem', 'error');
      }

      return false;
    }
  }

  async testDashboardEndpoint() {
    this.log('\n📊 TESTING DASHBOARD ENDPOINT', 'info');

    const headers = {
      Authorization: `Bearer ${this.authToken}`,
    };

    const result = await this.makeRequest('GET', '/api/dashboard', null, headers);

    this.log(`Status: ${result.status}`, result.success ? 'success' : 'error');
    this.log(`Response: ${JSON.stringify(result.data, null, 2)}`, 'info');

    if (result.success) {
      this.log('✅ Dashboard endpoint working', 'success');
      return true;
    } else {
      this.log(`❌ Dashboard failed: ${result.status} - ${JSON.stringify(result.data)}`, 'error');

      // Analyze the error
      if (result.status === 404) {
        this.log('   Issue: Endpoint not found - routing problem', 'error');
      } else if (result.status === 401) {
        this.log('   Issue: Authentication failed - token validation problem', 'error');
      } else if (result.status === 500) {
        this.log('   Issue: Server error - implementation problem', 'error');
      }

      return false;
    }
  }

  async testTokenValidation() {
    this.log('\n🔍 TESTING TOKEN VALIDATION', 'info');

    // Test with valid token
    const headers = {
      Authorization: `Bearer ${this.authToken}`,
    };

    const result = await this.makeRequest('GET', '/api/auth/verify', null, headers);

    this.log(`Token verification status: ${result.status}`, result.success ? 'success' : 'error');
    this.log(`Response: ${JSON.stringify(result.data, null, 2)}`, 'info');

    if (result.success) {
      this.log('✅ Token validation working', 'success');
      return true;
    } else {
      this.log(`❌ Token validation failed: ${result.status}`, 'error');
      return false;
    }
  }

  async testAllAvailableEndpoints() {
    this.log('\n🔍 TESTING ALL AVAILABLE ENDPOINTS', 'info');

    const endpoints = [
      { method: 'GET', path: '/api/health', auth: false },
      { method: 'GET', path: '/api/auth/verify', auth: true },
      { method: 'GET', path: '/api/user/status', auth: true },
      { method: 'GET', path: '/api/dashboard', auth: true },
      { method: 'GET', path: '/api/user/profile', auth: true },
      { method: 'GET', path: '/api/workflows', auth: true },
      { method: 'GET', path: '/api/analytics', auth: true },
    ];

    const results = [];

    for (const endpoint of endpoints) {
      const headers = endpoint.auth ? { Authorization: `Bearer ${this.authToken}` } : {};
      const result = await this.makeRequest(endpoint.method, endpoint.path, null, headers);

      results.push({
        endpoint: `${endpoint.method} ${endpoint.path}`,
        status: result.status,
        success: result.success,
        requiresAuth: endpoint.auth,
      });

      const statusColor = result.success ? 'success' : result.status === 404 ? 'warning' : 'error';
      this.log(`${endpoint.method} ${endpoint.path}: ${result.status}`, statusColor);
    }

    return results;
  }

  async runAuthenticatedTests() {
    this.log('🧪 STARTING AUTHENTICATED ENDPOINT TESTS', 'info');
    this.log(`🌐 Target: ${this.baseURL}`, 'info');
    this.log('=' * 60, 'info');

    try {
      // Step 1: Register and login to get valid token
      const setupSuccess = await this.registerAndLogin();
      if (!setupSuccess) {
        this.log('❌ Failed to set up test user', 'error');
        return;
      }

      // Step 2: Test token validation
      await this.testTokenValidation();

      // Step 3: Test user status endpoint
      const userStatusWorking = await this.testUserStatusEndpoint();

      // Step 4: Test dashboard endpoint
      const dashboardWorking = await this.testDashboardEndpoint();

      // Step 5: Test all available endpoints
      const endpointResults = await this.testAllAvailableEndpoints();

      // Generate summary
      this.generateTestSummary(userStatusWorking, dashboardWorking, endpointResults);
    } catch (error) {
      this.log(`💥 Test suite failed: ${error.message}`, 'error');
    }
  }

  generateTestSummary(userStatusWorking, dashboardWorking, endpointResults) {
    this.log('\n📊 AUTHENTICATED ENDPOINT TEST SUMMARY', 'info');
    this.log('=' * 60, 'info');

    const workingEndpoints = endpointResults.filter(r => r.success).length;
    const totalEndpoints = endpointResults.length;

    this.log(`✅ User Registration & Login: Working`, 'success');
    this.log(
      `${userStatusWorking ? '✅' : '❌'} User Status Endpoint: ${userStatusWorking ? 'Working' : 'Failed'}`,
      userStatusWorking ? 'success' : 'error'
    );
    this.log(
      `${dashboardWorking ? '✅' : '❌'} Dashboard Endpoint: ${dashboardWorking ? 'Working' : 'Failed'}`,
      dashboardWorking ? 'success' : 'error'
    );
    this.log(
      `📊 Endpoint Coverage: ${workingEndpoints}/${totalEndpoints} (${Math.round((workingEndpoints / totalEndpoints) * 100)}%)`,
      'info'
    );

    if (!userStatusWorking || !dashboardWorking) {
      this.log('\n🔧 RECOMMENDED FIXES:', 'warning');

      if (!userStatusWorking) {
        this.log('• Check /api/user/status endpoint implementation', 'warning');
        this.log('• Verify JWT token validation in authenticate middleware', 'warning');
      }

      if (!dashboardWorking) {
        this.log('• Check /api/dashboard endpoint implementation', 'warning');
        this.log('• Verify routing configuration', 'warning');
      }
    }

    // Save detailed results
    const report = {
      timestamp: new Date().toISOString(),
      testUser: { email: this.testUser.email },
      userStatusWorking,
      dashboardWorking,
      endpointResults,
      summary: {
        workingEndpoints,
        totalEndpoints,
        successRate: Math.round((workingEndpoints / totalEndpoints) * 100),
      },
    };

    require('fs').writeFileSync(
      './authenticated-endpoints-report.json',
      JSON.stringify(report, null, 2)
    );
    this.log('\n📄 Detailed report saved to: ./authenticated-endpoints-report.json', 'info');
  }
}

// Run the tests
if (require.main === module) {
  const tester = new AuthenticatedEndpointTester();
  tester.runAuthenticatedTests().catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });
}

module.exports = AuthenticatedEndpointTester;
