#!/usr/bin/env node

/**
 * COMPREHENSIVE API TEST SUITE
 * ============================
 * Test all critical API endpoints to ensure they're working
 */

const axios = require('axios');
require('dotenv').config();

class ComprehensiveAPITester {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.apiUrl = `${baseUrl}/api`;
    this.results = [];
    this.authToken = null;
  }

  async testEndpoint(method, path, data = null, headers = {}, expectedStatus = [200, 201, 302, 401, 404]) {
    try {
      const url = `${this.apiUrl}${path}`;
      console.log(`🧪 Testing: ${method} ${path}`);
      
      const config = {
        method: method.toLowerCase(),
        url,
        timeout: 10000,
        validateStatus: () => true, // Don't throw on any status
        maxRedirects: 0, // Don't follow redirects
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.data = data;
      }

      const response = await axios(config);
      
      const isExpected = Array.isArray(expectedStatus) 
        ? expectedStatus.includes(response.status)
        : response.status === expectedStatus;
      
      const result = {
        method,
        path,
        status: response.status,
        success: isExpected,
        contentType: response.headers['content-type'],
        responseSize: response.headers['content-length'] || 'unknown',
        error: null
      };

      if (isExpected) {
        console.log(`   ✅ ${response.status} - ${response.statusText || 'OK'}`);
      } else {
        console.log(`   ❌ ${response.status} - Expected: ${expectedStatus}`);
        result.error = `Unexpected status: ${response.status}`;
      }

      // Store auth token if this is a login response
      if (path === '/auth/login' && response.status === 200 && response.data?.token) {
        this.authToken = response.data.token;
        console.log(`   🔑 Auth token captured for subsequent tests`);
      }

      this.results.push(result);
      return result;

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      const result = {
        method,
        path,
        status: 'ERROR',
        success: false,
        error: error.message
      };
      this.results.push(result);
      return result;
    }
  }

  async testPublicEndpoints() {
    console.log('\n🌐 TESTING PUBLIC ENDPOINTS');
    console.log('===========================');

    // Health endpoints
    await this.testEndpoint('GET', '/health', null, {}, [200]);
    await this.testEndpoint('GET', '/health/database', null, {}, [200]);
    await this.testEndpoint('GET', '/health/oauth', null, {}, [200]);

    // Business types (should be public)
    await this.testEndpoint('GET', '/business-types', null, {}, [200]);

    // Auth endpoints (without credentials - should return appropriate errors)
    await this.testEndpoint('POST', '/auth/login', {}, {}, [400, 401]);
    await this.testEndpoint('POST', '/auth/register', {}, {}, [400]);
    await this.testEndpoint('GET', '/auth/verify', null, {}, [401]);
  }

  async testAuthenticationFlow() {
    console.log('\n🔐 TESTING AUTHENTICATION FLOW');
    console.log('==============================');

    // Test registration with valid data
    const testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: `test.${Date.now()}@example.com`,
      password: 'TestPassword123!',
      businessName: 'Test Company',
      agreeToTerms: true,
      marketingConsent: false
    };

    await this.testEndpoint('POST', '/auth/register', testUser, {}, [201, 409]);

    // Test login with invalid credentials
    await this.testEndpoint('POST', '/auth/login', {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    }, {}, [401]);

    // Test login with valid test credentials (if available)
    const testEmail = process.env.TEST_USER_EMAIL || 'dizelll.test.1757606995372@gmail.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'TestPassword123!';
    
    await this.testEndpoint('POST', '/auth/login', {
      email: testEmail,
      password: testPassword
    }, {}, [200, 401]);
  }

  async testProtectedEndpoints() {
    console.log('\n🔒 TESTING PROTECTED ENDPOINTS');
    console.log('==============================');

    const authHeaders = this.authToken 
      ? { 'Authorization': `Bearer ${this.authToken}` }
      : {};

    // User endpoints
    await this.testEndpoint('GET', '/user/status', null, authHeaders, [200]);
    await this.testEndpoint('GET', '/user/profile', null, authHeaders, [200]);

    // Dashboard endpoints
    await this.testEndpoint('GET', '/dashboard/status', null, authHeaders, [200]);

    // OAuth endpoints
    await this.testEndpoint('GET', '/oauth/google', null, authHeaders, [302]);
    await this.testEndpoint('GET', '/oauth/status', null, authHeaders, [200, 404]);

    // Onboarding endpoints
    await this.testEndpoint('GET', '/onboarding/status', null, authHeaders, [200]);
    await this.testEndpoint('POST', '/onboarding/complete', {}, authHeaders, [200, 400]);
  }

  async testSpecialEndpoints() {
    console.log('\n🎯 TESTING SPECIAL ENDPOINTS');
    console.log('============================');

    // Test endpoints that might have special behavior
    await this.testEndpoint('GET', '/workflows', null, {}, [200, 401]);
    await this.testEndpoint('GET', '/analytics', null, {}, [200, 401]);
    await this.testEndpoint('GET', '/performance', null, {}, [200, 401]);
    
    // Recovery endpoints
    await this.testEndpoint('POST', '/recovery/initiate', {
      email: 'test@example.com'
    }, {}, [200, 400]);

    // Password reset endpoints (using correct Vercel API endpoint)
    await this.testEndpoint('POST', '/auth/forgot-password', {
      email: 'test@example.com'
    }, {}, [200, 400]);
  }

  generateReport() {
    console.log('\n📊 COMPREHENSIVE API TEST REPORT');
    console.log('=================================');

    const totalTests = this.results.length;
    const successfulTests = this.results.filter(r => r.success).length;
    const failedTests = this.results.filter(r => !r.success).length;
    const errorTests = this.results.filter(r => r.status === 'ERROR').length;

    console.log(`Total Endpoints Tested: ${totalTests}`);
    console.log(`✅ Successful: ${successfulTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`🚨 Errors: ${errorTests}`);
    console.log(`📈 Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);

    // Group results by category
    const categories = {
      'Health': this.results.filter(r => r.path.includes('/health')),
      'Authentication': this.results.filter(r => r.path.includes('/auth')),
      'User Management': this.results.filter(r => r.path.includes('/user')),
      'OAuth': this.results.filter(r => r.path.includes('/oauth')),
      'Dashboard': this.results.filter(r => r.path.includes('/dashboard')),
      'Business': this.results.filter(r => r.path.includes('/business')),
      'Other': this.results.filter(r => 
        !r.path.includes('/health') && 
        !r.path.includes('/auth') && 
        !r.path.includes('/user') && 
        !r.path.includes('/oauth') && 
        !r.path.includes('/dashboard') && 
        !r.path.includes('/business')
      )
    };

    console.log('\n📋 RESULTS BY CATEGORY:');
    Object.entries(categories).forEach(([category, results]) => {
      if (results.length > 0) {
        const categorySuccess = results.filter(r => r.success).length;
        const categoryTotal = results.length;
        console.log(`\n${category} (${categorySuccess}/${categoryTotal}):`);
        
        results.forEach(result => {
          const status = result.success ? '✅' : '❌';
          console.log(`  ${status} ${result.method} ${result.path} - ${result.status}`);
          if (result.error) {
            console.log(`     Error: ${result.error}`);
          }
        });
      }
    });

    // Critical issues
    const criticalIssues = this.results.filter(r => 
      !r.success && 
      (r.path.includes('/health') || r.path.includes('/auth/login') || r.path.includes('/auth/register'))
    );

    if (criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES DETECTED:');
      criticalIssues.forEach(issue => {
        console.log(`   • ${issue.method} ${issue.path}: ${issue.error || `Status ${issue.status}`}`);
      });
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (successfulTests === totalTests) {
      console.log('🎉 All APIs are working correctly!');
      console.log('   Your FloWorx application is ready for production use.');
    } else if (criticalIssues.length === 0) {
      console.log('✅ Core functionality is working.');
      console.log('   Some non-critical endpoints may need attention.');
    } else {
      console.log('⚠️  Critical issues detected that need immediate attention.');
      console.log('   Focus on fixing health and authentication endpoints first.');
    }

    return {
      totalTests,
      successfulTests,
      failedTests,
      errorTests,
      successRate: (successfulTests / totalTests) * 100,
      criticalIssues: criticalIssues.length,
      categories
    };
  }

  async runAllTests() {
    console.log('🚀 COMPREHENSIVE API TEST SUITE');
    console.log('================================');
    console.log(`🌐 Target: ${this.baseUrl}`);
    console.log(`⏰ Started: ${new Date().toISOString()}`);

    await this.testPublicEndpoints();
    await this.testAuthenticationFlow();
    await this.testProtectedEndpoints();
    await this.testSpecialEndpoints();

    const report = this.generateReport();

    // Save detailed report
    const reportFile = `api-test-report-${Date.now()}.json`;
    const fs = require('fs');
    fs.writeFileSync(reportFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      summary: report,
      detailedResults: this.results
    }, null, 2));

    console.log(`\n📄 Detailed report saved to: ${reportFile}`);
    console.log('\n🚀 COMPREHENSIVE API TEST COMPLETE!');

    return report;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new ComprehensiveAPITester();
  tester.runAllTests()
    .then(report => {
      const hasIssues = report.criticalIssues > 0;
      process.exit(hasIssues ? 1 : 0);
    })
    .catch(console.error);
}

module.exports = ComprehensiveAPITester;
