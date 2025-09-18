#!/usr/bin/env node

/**
 * Comprehensive API Validation for FloWorx Production
 * 
 * This script validates ALL API endpoints in production to ensure they're working correctly
 * and identifies any issues that need to be fixed.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class ComprehensiveAPIValidator {
  constructor() {
    this.productionUrl = 'app.floworx-iq.com';
    this.results = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      url: `https://${this.productionUrl}`,
      endpoints: [],
      summary: {
        total: 0,
        working: 0,
        failing: 0,
        errors: []
      }
    };
    
    // Define all endpoints to test
    this.endpointsToTest = [
      // Authentication endpoints
      { path: '/api/auth/register', method: 'POST', category: 'Authentication', 
        data: { email: 'test@example.com', password: 'Test123!', firstName: 'Test', lastName: 'User' },
        expectedStatuses: [201, 400, 409] },
      { path: '/api/auth/login', method: 'POST', category: 'Authentication',
        data: { email: 'test@example.com', password: 'wrongpassword' },
        expectedStatuses: [200, 401, 400] },
      { path: '/api/auth/logout', method: 'POST', category: 'Authentication',
        data: {},
        expectedStatuses: [200, 401] },
      { path: '/api/auth/refresh', method: 'POST', category: 'Authentication',
        data: {},
        expectedStatuses: [200, 401] },
      { path: '/api/auth/forgot-password', method: 'POST', category: 'Authentication',
        data: { email: 'test@example.com' },
        expectedStatuses: [200, 400, 404] },
      
      // Health and system endpoints
      { path: '/api/health', method: 'GET', category: 'System',
        expectedStatuses: [200] },
      { path: '/health', method: 'GET', category: 'System',
        expectedStatuses: [200] },
      
      // User endpoints (require authentication)
      { path: '/api/user/profile', method: 'GET', category: 'User',
        requiresAuth: true,
        expectedStatuses: [200, 401] },
      { path: '/api/user/settings', method: 'GET', category: 'User',
        requiresAuth: true,
        expectedStatuses: [200, 401] },
      
      // OAuth endpoints
      { path: '/api/oauth/google', method: 'GET', category: 'OAuth',
        expectedStatuses: [302, 400] },
      
      // Business types endpoints (corrected path)
      { path: '/api/business-types', method: 'GET', category: 'Business Types',
        expectedStatuses: [200, 401] },
      
      // Dashboard endpoints
      { path: '/api/dashboard', method: 'GET', category: 'Dashboard',
        requiresAuth: true,
        expectedStatuses: [200, 401] },
      
      // Static file endpoints
      { path: '/', method: 'GET', category: 'Static',
        expectedStatuses: [200] },
      { path: '/login', method: 'GET', category: 'Static',
        expectedStatuses: [200] },
      { path: '/register', method: 'GET', category: 'Static',
        expectedStatuses: [200] }
    ];
  }

  /**
   * Run comprehensive API validation
   */
  async validateAllEndpoints() {
    console.log('🔍 COMPREHENSIVE API VALIDATION');
    console.log('=' .repeat(60));
    console.log(`🎯 Target: https://${this.productionUrl}`);
    console.log(`📊 Testing ${this.endpointsToTest.length} endpoints\n`);

    // Test each endpoint
    for (const endpoint of this.endpointsToTest) {
      await this.testEndpoint(endpoint);
      // Small delay between requests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Generate summary
    this.generateSummary();
    
    // Save results
    await this.saveResults();
    
    // Display results
    this.displayResults();
    
    return this.results;
  }

  /**
   * Test a single endpoint
   */
  async testEndpoint(endpoint) {
    console.log(`📡 Testing: ${endpoint.method} ${endpoint.path}`);
    
    const result = {
      ...endpoint,
      timestamp: new Date().toISOString(),
      status: 'PENDING'
    };

    try {
      const response = await this.makeRequest(endpoint);
      
      result.statusCode = response.statusCode;
      result.statusMessage = response.statusMessage;
      result.responseTime = response.responseTime;
      result.contentType = response.contentType;
      result.bodyLength = response.bodyLength;
      result.rateLimitRemaining = response.rateLimitRemaining;
      result.rateLimitLimit = response.rateLimitLimit;

      // Check if status code is expected
      if (endpoint.expectedStatuses.includes(response.statusCode)) {
        result.status = 'PASS';
        result.message = `Expected status ${response.statusCode}`;
        console.log(`   ✅ PASS: ${response.statusCode} ${response.statusMessage} (${response.responseTime}ms)`);
      } else if (response.statusCode === 404) {
        result.status = 'FAIL';
        result.error = 'Endpoint not found (404)';
        console.log(`   ❌ FAIL: 404 Not Found - Endpoint may not exist`);
      } else if (response.statusCode >= 500) {
        result.status = 'FAIL';
        result.error = `Server error: ${response.statusCode} ${response.statusMessage}`;
        console.log(`   ❌ FAIL: Server error ${response.statusCode}`);
      } else {
        result.status = 'WARN';
        result.message = `Unexpected status ${response.statusCode} (not in expected list)`;
        console.log(`   ⚠️  WARN: Unexpected status ${response.statusCode}`);
      }

      // Parse response body if available
      if (response.body) {
        try {
          result.responseBody = typeof response.body === 'string' ? 
            JSON.parse(response.body) : response.body;
        } catch (e) {
          result.responseBody = response.body.substring(0, 200);
        }
      }

    } catch (error) {
      result.status = 'FAIL';
      result.error = error.message;
      console.log(`   💥 ERROR: ${error.message}`);
    }

    this.results.endpoints.push(result);
    console.log('');
  }

  /**
   * Make HTTP request
   */
  async makeRequest(endpoint) {
    return new Promise((resolve, reject) => {
      const data = endpoint.data ? JSON.stringify(endpoint.data) : null;
      
      const options = {
        hostname: this.productionUrl,
        port: 443,
        path: endpoint.path,
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FloWorx-API-Validator/1.0',
          'Accept': 'application/json, text/html, */*'
        }
      };

      if (data) {
        options.headers['Content-Length'] = Buffer.byteLength(data);
      }

      // Add auth header if required (using a dummy token for testing)
      if (endpoint.requiresAuth) {
        options.headers['Authorization'] = 'Bearer dummy-token-for-testing';
      }

      const startTime = Date.now();
      
      const req = https.request(options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            responseTime: Date.now() - startTime,
            contentType: res.headers['content-type'],
            bodyLength: body.length,
            rateLimitRemaining: res.headers['ratelimit-remaining'] || res.headers['x-ratelimit-remaining'],
            rateLimitLimit: res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit'],
            body: body
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(15000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(data);
      }
      
      req.end();
    });
  }

  /**
   * Generate summary statistics
   */
  generateSummary() {
    this.results.summary.total = this.results.endpoints.length;
    this.results.summary.working = this.results.endpoints.filter(e => e.status === 'PASS').length;
    this.results.summary.failing = this.results.endpoints.filter(e => e.status === 'FAIL').length;
    this.results.summary.warnings = this.results.endpoints.filter(e => e.status === 'WARN').length;
    
    // Collect errors
    this.results.summary.errors = this.results.endpoints
      .filter(e => e.status === 'FAIL')
      .map(e => ({
        endpoint: `${e.method} ${e.path}`,
        error: e.error,
        category: e.category
      }));
  }

  /**
   * Save results to file
   */
  async saveResults() {
    const reportsDir = './reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `comprehensive-api-validation-${Date.now()}.json`;
    const filepath = path.join(reportsDir, filename);
    
    fs.writeFileSync(filepath, JSON.stringify(this.results, null, 2));
    console.log(`📄 Validation report saved: ${filepath}`);
  }

  /**
   * Display comprehensive results
   */
  displayResults() {
    console.log('\n📊 COMPREHENSIVE API VALIDATION RESULTS');
    console.log('=' .repeat(60));
    
    // Overall statistics
    console.log(`📈 OVERALL STATISTICS:`);
    console.log(`   • Total Endpoints: ${this.results.summary.total}`);
    console.log(`   • Working: ${this.results.summary.working}`);
    console.log(`   • Failing: ${this.results.summary.failing}`);
    console.log(`   • Warnings: ${this.results.summary.warnings || 0}`);
    console.log(`   • Success Rate: ${((this.results.summary.working / this.results.summary.total) * 100).toFixed(1)}%`);

    // Results by category
    const categories = [...new Set(this.results.endpoints.map(e => e.category))];
    console.log(`\n📋 RESULTS BY CATEGORY:`);
    
    categories.forEach(category => {
      const categoryEndpoints = this.results.endpoints.filter(e => e.category === category);
      const working = categoryEndpoints.filter(e => e.status === 'PASS').length;
      const total = categoryEndpoints.length;
      
      console.log(`   ${category}: ${working}/${total} working`);
    });

    // Failed endpoints
    if (this.results.summary.failing > 0) {
      console.log(`\n❌ FAILED ENDPOINTS:`);
      this.results.summary.errors.forEach(error => {
        console.log(`   • ${error.endpoint}: ${error.error}`);
      });
    }

    // Recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    
    if (this.results.summary.failing === 0) {
      console.log(`   ✅ All endpoints are working correctly!`);
    } else {
      console.log(`   🔧 Fix ${this.results.summary.failing} failing endpoints`);
      console.log(`   📋 Review detailed error messages above`);
      console.log(`   🔍 Check server logs for additional context`);
    }

    // Next steps
    console.log(`\n🎯 NEXT STEPS:`);
    console.log(`   1. Review detailed validation report`);
    console.log(`   2. Fix any failing endpoints`);
    console.log(`   3. Re-run validation after fixes`);
    console.log(`   4. Monitor production logs for issues`);
  }
}

/**
 * Main execution
 */
async function main() {
  const validator = new ComprehensiveAPIValidator();
  const results = await validator.validateAllEndpoints();
  
  // Exit with appropriate code
  process.exit(results.summary.failing === 0 ? 0 : 1);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 API validation interrupted');
  process.exit(1);
});

// Run the validation
if (require.main === module) {
  main().catch((error) => {
    console.error('\n💥 VALIDATION ERROR:', error.message);
    process.exit(1);
  });
}
