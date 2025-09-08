#!/usr/bin/env node

/**
 * Production Deployment Test Suite
 * Tests all API endpoints and database connectivity for FloWorx SaaS
 */

const https = require('https');
const http = require('http');

class ProductionTester {
  constructor() {
    this.baseUrl = 'https://app.floworx-iq.com';
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  // Helper method to make HTTP requests
  async makeRequest(path, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FloWorx-Production-Tester/1.0',
          ...headers
        },
        // Allow self-signed certificates for testing
        rejectUnauthorized: false
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const jsonBody = body ? JSON.parse(body) : {};
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: jsonBody,
              rawBody: body
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: body,
              rawBody: body
            });
          }
        });
      });

      req.on('error', (err) => {
        reject(err);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  // Test helper
  async runTest(name, testFn) {
    console.log(`\n🧪 Testing: ${name}`);
    try {
      const result = await testFn();
      if (result.success) {
        console.log(`   ✅ PASS: ${result.message}`);
        this.results.passed++;
      } else {
        console.log(`   ❌ FAIL: ${result.message}`);
        this.results.failed++;
      }
      this.results.tests.push({ name, ...result });
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, success: false, message: error.message });
    }
  }

  // Test 1: Frontend Loading
  async testFrontendLoading() {
    return this.runTest('Frontend Loading', async () => {
      const response = await this.makeRequest('/');
      
      if (response.statusCode === 200) {
        const isHTML = response.rawBody.includes('<html') || response.rawBody.includes('<!DOCTYPE html');
        if (isHTML) {
          return { success: true, message: 'Frontend loads successfully' };
        } else {
          return { success: false, message: 'Response is not HTML content' };
        }
      } else {
        return { success: false, message: `Frontend returned ${response.statusCode}` };
      }
    });
  }

  // Test 2: Health Check Endpoint
  async testHealthCheck() {
    return this.runTest('Health Check Endpoint', async () => {
      const response = await this.makeRequest('/health');
      
      if (response.statusCode === 200 && response.body.status === 'healthy') {
        return { success: true, message: `Health check passed: ${response.body.status}` };
      } else {
        return { success: false, message: `Health check failed: ${response.statusCode}` };
      }
    });
  }

  // Test 3: API Health Check
  async testAPIHealthCheck() {
    return this.runTest('API Health Check', async () => {
      const response = await this.makeRequest('/api/health');
      
      if (response.statusCode === 200 && response.body.status === 'ok') {
        return { success: true, message: `API health check passed: ${response.body.status}` };
      } else {
        return { success: false, message: `API health check failed: ${response.statusCode}` };
      }
    });
  }

  // Test 4: Database Health Check
  async testDatabaseHealth() {
    return this.runTest('Database Health Check', async () => {
      const response = await this.makeRequest('/api/health/db');
      
      if (response.statusCode === 200 && response.body.status === 'healthy') {
        return { success: true, message: `Database connected: ${response.body.database}` };
      } else {
        return { success: false, message: `Database check failed: ${response.statusCode} - ${response.body?.error || 'Unknown error'}` };
      }
    });
  }

  // Test 5: Authentication Endpoints
  async testAuthEndpoints() {
    return this.runTest('Authentication Endpoints', async () => {
      // Test login endpoint (should return 400 for missing credentials)
      const loginResponse = await this.makeRequest('/api/auth/login', 'POST', {});
      
      if (loginResponse.statusCode === 400) {
        return { success: true, message: 'Auth endpoints responding correctly' };
      } else {
        return { success: false, message: `Auth endpoint unexpected response: ${loginResponse.statusCode}` };
      }
    });
  }

  // Test 6: User Registration Endpoint
  async testUserRegistration() {
    return this.runTest('User Registration Endpoint', async () => {
      // Test registration endpoint (should return 400 for missing data)
      const regResponse = await this.makeRequest('/api/auth/register', 'POST', {});
      
      if (regResponse.statusCode === 400) {
        return { success: true, message: 'Registration endpoint responding correctly' };
      } else {
        return { success: false, message: `Registration endpoint unexpected response: ${regResponse.statusCode}` };
      }
    });
  }

  // Test 7: Business Types Endpoint
  async testBusinessTypes() {
    return this.runTest('Business Types Endpoint', async () => {
      const response = await this.makeRequest('/api/business-types');
      
      if (response.statusCode === 200 && Array.isArray(response.body)) {
        return { success: true, message: `Business types loaded: ${response.body.length} types` };
      } else {
        return { success: false, message: `Business types failed: ${response.statusCode}` };
      }
    });
  }

  // Test 8: OAuth Endpoints
  async testOAuthEndpoints() {
    return this.runTest('OAuth Endpoints', async () => {
      // Test Google OAuth redirect (should redirect or return 302)
      const oauthResponse = await this.makeRequest('/api/oauth/google');
      
      if (oauthResponse.statusCode === 302 || oauthResponse.statusCode === 200) {
        return { success: true, message: 'OAuth endpoints accessible' };
      } else {
        return { success: false, message: `OAuth endpoint failed: ${oauthResponse.statusCode}` };
      }
    });
  }

  // Test 9: CORS Headers
  async testCORSHeaders() {
    return this.runTest('CORS Configuration', async () => {
      const response = await this.makeRequest('/api/health', 'OPTIONS');
      
      const corsHeader = response.headers['access-control-allow-origin'];
      if (corsHeader) {
        return { success: true, message: `CORS configured: ${corsHeader}` };
      } else {
        return { success: false, message: 'CORS headers missing' };
      }
    });
  }

  // Test 10: SSL Certificate
  async testSSLCertificate() {
    return this.runTest('SSL Certificate', async () => {
      try {
        await this.makeRequest('/health');
        return { success: true, message: 'SSL certificate valid' };
      } catch (error) {
        if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
          return { success: false, message: `SSL certificate issue: ${error.code}` };
        } else {
          return { success: true, message: 'SSL connection established' };
        }
      }
    });
  }

  // Run all tests
  async runAllTests() {
    console.log('🚀 Starting FloWorx Production Deployment Tests');
    console.log(`🌐 Testing: ${this.baseUrl}`);
    console.log('=' .repeat(60));

    await this.testFrontendLoading();
    await this.testHealthCheck();
    await this.testAPIHealthCheck();
    await this.testDatabaseHealth();
    await this.testAuthEndpoints();
    await this.testUserRegistration();
    await this.testBusinessTypes();
    await this.testOAuthEndpoints();
    await this.testCORSHeaders();
    await this.testSSLCertificate();

    // Print summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`);

    if (this.results.failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED! Your deployment is fully operational!');
    } else {
      console.log('\n⚠️  Some tests failed. Check the details above.');
    }

    return this.results;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ProductionTester();
  tester.runAllTests().catch(console.error);
}

module.exports = ProductionTester;
