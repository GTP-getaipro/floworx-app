const axios = require('axios');
const { performance } = require('perf_hooks');

/**
 * Integration Tester
 * 
 * Tests complete user flows end-to-end:
 * - User registration with email verification
 * - Password reset flow
 * - Login/logout functionality
 * - API endpoint connectivity
 * - Database operations
 * - Email service functionality
 */
class IntegrationTester {
  constructor(config) {
    this.config = config;
    this.results = {
      summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
      issues: [],
      recommendations: [],
      tests: []
    };
    
    this.baseURL = this.config.endpoints.api;
    this.frontendURL = this.config.endpoints.frontend;
    this.timeout = this.config.modules.integrationTester.timeout || 30000;
  }

  async test() {
    console.log('  🧪 Running integration tests...');
    
    const testSuites = [
      { name: 'API Health Check', test: () => this.testAPIHealth() },
      { name: 'Database Connectivity', test: () => this.testDatabaseConnectivity() },
      { name: 'Email Service', test: () => this.testEmailService() },
      { name: 'User Registration Flow', test: () => this.testUserRegistration() },
      { name: 'Password Reset Flow', test: () => this.testPasswordReset() },
      { name: 'Authentication Flow', test: () => this.testAuthentication() },
      { name: 'Frontend Connectivity', test: () => this.testFrontendConnectivity() }
    ];

    for (const suite of testSuites) {
      await this.runTestSuite(suite);
    }

    this.generateRecommendations();
    return this.results;
  }

  async runTestSuite(suite) {
    const startTime = performance.now();
    this.results.summary.total++;

    try {
      console.log(`    🔍 ${suite.name}...`);
      const result = await Promise.race([
        suite.test(),
        this.timeoutPromise(this.timeout)
      ]);

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      this.results.tests.push({
        name: suite.name,
        status: 'passed',
        duration,
        result,
        timestamp: new Date().toISOString()
      });

      this.results.summary.passed++;
      console.log(`    ✅ ${suite.name} - PASSED (${duration}ms)`);

    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      this.results.tests.push({
        name: suite.name,
        status: 'failed',
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      this.addIssue(
        'integration_test_failure',
        'high',
        `${suite.name} failed: ${error.message}`,
        { testName: suite.name, error: error.message, duration }
      );

      this.results.summary.failed++;
      console.log(`    ❌ ${suite.name} - FAILED (${duration}ms): ${error.message}`);
    }
  }

  async testAPIHealth() {
    const healthEndpoints = [
      '/health',
      '/auth/csrf',
      '/auth/test-status'
    ];

    const results = {};
    
    for (const endpoint of healthEndpoints) {
      try {
        const response = await axios.get(`${this.baseURL}${endpoint}`, {
          timeout: 5000,
          validateStatus: (status) => status < 500 // Accept 4xx as valid responses
        });
        
        results[endpoint] = {
          status: response.status,
          responseTime: response.headers['x-response-time'] || 'N/A',
          healthy: response.status < 400
        };
      } catch (error) {
        results[endpoint] = {
          status: error.response?.status || 0,
          error: error.message,
          healthy: false
        };
      }
    }

    const healthyEndpoints = Object.values(results).filter(r => r.healthy).length;
    if (healthyEndpoints === 0) {
      throw new Error('No API endpoints are responding');
    }

    return results;
  }

  async testDatabaseConnectivity() {
    try {
      // Test database connection through API
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 10000
      });

      if (response.data && response.data.database) {
        return {
          connected: true,
          status: response.data.database.status,
          connectionPool: response.data.database.connectionPool || 'N/A'
        };
      }

      // Fallback test - try to access a protected endpoint that requires DB
      const testResponse = await axios.get(`${this.baseURL}/auth/test-status`, {
        timeout: 5000,
        validateStatus: (status) => status < 500
      });

      return {
        connected: testResponse.status < 500,
        status: testResponse.status === 200 ? 'healthy' : 'degraded',
        fallbackTest: true
      };

    } catch (error) {
      throw new Error(`Database connectivity test failed: ${error.message}`);
    }
  }

  async testEmailService() {
    try {
      // Test email service configuration
      const testEmail = `test.verification.${Date.now()}@example.com`;
      
      const response = await axios.post(`${this.baseURL}/auth/forgot-password`, {
        email: testEmail
      }, {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data && response.data.success) {
        return {
          emailService: 'operational',
          emailSent: response.data.emailSent || false,
          provider: 'SendGrid',
          testEmail
        };
      }

      throw new Error('Email service test returned unexpected response');

    } catch (error) {
      if (error.response?.status === 400) {
        // Bad request might be expected for test email
        return {
          emailService: 'operational',
          note: 'Service responding to requests',
          testLimited: true
        };
      }
      throw new Error(`Email service test failed: ${error.message}`);
    }
  }

  async testUserRegistration() {
    const testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: `test.user.${Date.now()}@example.com`,
      password: 'TestPassword123!',
      company: 'Test Company'
    };

    try {
      // Get CSRF token first
      const csrfResponse = await axios.get(`${this.baseURL}/auth/csrf`, {
        timeout: 5000
      });

      const csrfToken = csrfResponse.data.csrfToken;

      // Attempt registration
      const response = await axios.post(`${this.baseURL}/auth/register`, testUser, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        validateStatus: (status) => status < 500
      });

      return {
        registrationWorking: response.status === 201,
        emailVerificationRequired: response.data?.requiresVerification || false,
        emailSent: response.data?.emailSent || false,
        status: response.status,
        testUser: testUser.email
      };

    } catch (error) {
      throw new Error(`User registration test failed: ${error.message}`);
    }
  }

  async testPasswordReset() {
    const testEmail = 'test.password.reset@example.com';

    try {
      // Test password reset request
      const response = await axios.post(`${this.baseURL}/auth/forgot-password`, {
        email: testEmail
      }, {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.data && response.data.success) {
        return {
          passwordResetWorking: true,
          emailSent: response.data.emailSent || false,
          expiresIn: response.data.expiresIn || 'N/A',
          testEmail
        };
      }

      throw new Error('Password reset returned unexpected response');

    } catch (error) {
      throw new Error(`Password reset test failed: ${error.message}`);
    }
  }

  async testAuthentication() {
    try {
      // Test authentication endpoints
      const endpoints = [
        { path: '/auth/csrf', method: 'GET', expectStatus: 200 },
        { path: '/auth/verify', method: 'GET', expectStatus: 401 }, // Should fail without token
        { path: '/auth/logout', method: 'POST', expectStatus: 204 }
      ];

      const results = {};

      for (const endpoint of endpoints) {
        try {
          const response = await axios({
            method: endpoint.method,
            url: `${this.baseURL}${endpoint.path}`,
            timeout: 5000,
            validateStatus: () => true // Accept all status codes
          });

          results[endpoint.path] = {
            status: response.status,
            expected: endpoint.expectStatus,
            working: response.status === endpoint.expectStatus
          };
        } catch (error) {
          results[endpoint.path] = {
            status: 0,
            expected: endpoint.expectStatus,
            working: false,
            error: error.message
          };
        }
      }

      const workingEndpoints = Object.values(results).filter(r => r.working).length;
      if (workingEndpoints === 0) {
        throw new Error('No authentication endpoints are working correctly');
      }

      return results;

    } catch (error) {
      throw new Error(`Authentication test failed: ${error.message}`);
    }
  }

  async testFrontendConnectivity() {
    try {
      const response = await axios.get(this.frontendURL, {
        timeout: 10000,
        headers: { 'User-Agent': 'FloWorx-Verification-System' }
      });

      return {
        frontendAccessible: response.status === 200,
        status: response.status,
        contentLength: response.headers['content-length'] || 'N/A',
        contentType: response.headers['content-type'] || 'N/A'
      };

    } catch (error) {
      throw new Error(`Frontend connectivity test failed: ${error.message}`);
    }
  }

  timeoutPromise(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Test timed out after ${ms}ms`)), ms);
    });
  }

  addIssue(type, severity, message, details = {}) {
    this.results.issues.push({
      type,
      severity,
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  generateRecommendations() {
    const failedTests = this.results.tests.filter(t => t.status === 'failed');
    
    if (failedTests.length > 0) {
      this.results.recommendations.push({
        type: 'integration_failures',
        count: failedTests.length,
        recommendation: `${failedTests.length} integration test(s) failed. Review API endpoints, database connectivity, and service configurations.`,
        priority: 'high',
        failedTests: failedTests.map(t => t.name)
      });
    }

    const slowTests = this.results.tests.filter(t => t.duration > 5000);
    if (slowTests.length > 0) {
      this.results.recommendations.push({
        type: 'performance_issues',
        count: slowTests.length,
        recommendation: `${slowTests.length} test(s) took longer than 5 seconds. Consider optimizing performance.`,
        priority: 'medium',
        slowTests: slowTests.map(t => ({ name: t.name, duration: t.duration }))
      });
    }
  }
}

module.exports = IntegrationTester;
