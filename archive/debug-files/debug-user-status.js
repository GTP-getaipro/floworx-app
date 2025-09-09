#!/usr/bin/env node

/**
 * Debug User Status Endpoint
 * Detailed debugging of the user status endpoint issue
 */

const crypto = require('crypto');

const axios = require('axios');

class UserStatusDebugger {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com';
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
        timeout: 15000,
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

  async debugUserStatusEndpoint() {
    this.log('🔍 DEBUGGING USER STATUS ENDPOINT', 'info');
    this.log('=' * 50, 'info');

    // Step 1: Register a new user
    this.log('\n1️⃣ REGISTERING TEST USER', 'info');
    const testUser = {
      firstName: 'Debug',
      lastName: 'User',
      email: `debug.${crypto.randomBytes(8).toString('hex')}@example.com`,
      password: 'DebugPassword123!',
      businessName: 'Debug Company',
      agreeToTerms: true,
    };

    this.log(`📧 Test email: ${testUser.email}`, 'info');

    const regResult = await this.makeRequest('POST', '/api/auth/register', testUser);

    if (!regResult.success) {
      this.log(`❌ Registration failed: ${regResult.status}`, 'error');
      return;
    }

    this.log('✅ User registered successfully', 'success');
    const token = regResult.data.token;
    const userId = regResult.data.user.id;

    this.log(`🎫 Token: ${token.substring(0, 30)}...`, 'info');
    this.log(`👤 User ID: ${userId}`, 'info');

    // Step 2: Test token validation
    this.log('\n2️⃣ TESTING TOKEN VALIDATION', 'info');
    const verifyResult = await this.makeRequest('GET', '/api/auth/verify', null, {
      Authorization: `Bearer ${token}`,
    });

    this.log(
      `Token verification: ${verifyResult.status}`,
      verifyResult.success ? 'success' : 'error'
    );
    if (verifyResult.success) {
      this.log(`✅ Token is valid`, 'success');
      this.log(`User from token: ${JSON.stringify(verifyResult.data.user, null, 2)}`, 'info');
    } else {
      this.log(`❌ Token validation failed: ${JSON.stringify(verifyResult.data)}`, 'error');
      return;
    }

    // Step 3: Test user status endpoint with detailed logging
    this.log('\n3️⃣ TESTING USER STATUS ENDPOINT', 'info');
    const statusResult = await this.makeRequest('GET', '/api/user/status', null, {
      Authorization: `Bearer ${token}`,
    });

    this.log(
      `User status response: ${statusResult.status}`,
      statusResult.success ? 'success' : 'error'
    );
    this.log(`Response data: ${JSON.stringify(statusResult.data, null, 2)}`, 'info');
    this.log(`Response headers: ${JSON.stringify(statusResult.headers, null, 2)}`, 'info');

    if (!statusResult.success) {
      this.log('\n🔍 ANALYZING ERROR:', 'warning');

      if (statusResult.status === 500) {
        this.log('• Server error - likely database or implementation issue', 'warning');
        this.log('• Check server logs for detailed error information', 'warning');
        this.log('• Possible causes:', 'warning');
        this.log('  - Database query failing', 'warning');
        this.log('  - Missing table columns', 'warning');
        this.log('  - Authentication middleware issue', 'warning');
      } else if (statusResult.status === 404) {
        this.log('• Endpoint not found - routing issue', 'warning');
        this.log('• Check if endpoint is properly defined in routes', 'warning');
      } else if (statusResult.status === 401) {
        this.log('• Authentication failed - token issue', 'warning');
        this.log('• Check JWT secret and token validation', 'warning');
      }
    }

    // Step 4: Test dashboard endpoint
    this.log('\n4️⃣ TESTING DASHBOARD ENDPOINT', 'info');
    const dashResult = await this.makeRequest('GET', '/api/dashboard', null, {
      Authorization: `Bearer ${token}`,
    });

    this.log(`Dashboard response: ${dashResult.status}`, dashResult.success ? 'success' : 'error');
    this.log(`Response data: ${JSON.stringify(dashResult.data, null, 2)}`, 'info');

    // Step 5: Test direct user lookup
    this.log('\n5️⃣ TESTING DIRECT USER LOOKUP', 'info');
    this.log('This would require direct database access to verify user exists', 'info');
    this.log(`User ID to check: ${userId}`, 'info');
    this.log(`Email to check: ${testUser.email}`, 'info');

    // Step 6: Summary and recommendations
    this.log('\n📊 DEBUG SUMMARY', 'info');
    this.log('=' * 50, 'info');

    const results = {
      registration: regResult.success,
      tokenValidation: verifyResult.success,
      userStatus: statusResult.success,
      dashboard: dashResult.success,
    };

    Object.entries(results).forEach(([test, passed]) => {
      this.log(
        `${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`,
        passed ? 'success' : 'error'
      );
    });

    if (!results.userStatus || !results.dashboard) {
      this.log('\n🔧 NEXT STEPS:', 'warning');
      this.log('1. Check Vercel deployment logs', 'warning');
      this.log('2. Verify database schema matches code expectations', 'warning');
      this.log('3. Check if deployment is complete', 'warning');
      this.log('4. Test with a delay to ensure deployment propagation', 'warning');
    }

    // Save debug report
    const debugReport = {
      timestamp: new Date().toISOString(),
      testUser: { email: testUser.email, id: userId },
      token: token.substring(0, 30) + '...',
      results,
      responses: {
        registration: regResult,
        tokenValidation: verifyResult,
        userStatus: statusResult,
        dashboard: dashResult,
      },
    };

    require('fs').writeFileSync(
      './debug-user-status-report.json',
      JSON.stringify(debugReport, null, 2)
    );
    this.log('\n📄 Debug report saved to: ./debug-user-status-report.json', 'info');
  }
}

// Run the debug
if (require.main === module) {
  const debugTool = new UserStatusDebugger();
  debugTool.debugUserStatusEndpoint().catch(error => {
    console.error('❌ Debug error:', error);
    process.exit(1);
  });
}

module.exports = UserStatusDebugger;
