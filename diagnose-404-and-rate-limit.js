#!/usr/bin/env node

/**
 * Diagnose 404 and Rate Limit Issues
 * 
 * This script specifically tests for:
 * 1. The reported 404 on /api/api/auth/register (double /api/)
 * 2. Rate limiting trust proxy configuration issues
 * 3. Frontend URL configuration problems
 */

const https = require('https');

class ProductionDiagnosticTester {
  constructor() {
    this.productionUrl = 'app.floworx-iq.com';
    this.results = [];
  }

  async runDiagnostics() {
    console.log('🔍 PRODUCTION DIAGNOSTIC TEST');
    console.log('=' .repeat(60));
    console.log('🎯 Investigating reported issues:');
    console.log('   • 404 Not Found on /api/api/auth/register');
    console.log('   • Rate limiting trust proxy ValidationError');
    console.log('');

    // Test 1: Check the problematic double /api/ path
    await this.testDoubleApiPath();

    // Test 2: Check correct path
    await this.testCorrectPath();

    // Test 3: Test rate limiting behavior
    await this.testRateLimiting();

    // Test 4: Check for trust proxy headers
    await this.testTrustProxyHeaders();

    // Display comprehensive results
    this.displayDiagnosticResults();
  }

  /**
   * Test the problematic double /api/api/ path
   */
  async testDoubleApiPath() {
    console.log('🔍 Testing problematic path: /api/api/auth/register');
    
    const result = await this.makeRequest('/api/api/auth/register', {
      email: `test-double-${Date.now()}@floworx-test.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    });

    this.results.push({
      test: 'Double API Path',
      path: '/api/api/auth/register',
      ...result
    });

    if (result.statusCode === 404) {
      console.log('   ❌ CONFIRMED: 404 Not Found on double /api/ path');
      console.log('   🔧 This indicates frontend is making requests to wrong URL');
    } else {
      console.log(`   ℹ️  Unexpected response: ${result.statusCode}`);
    }
    console.log('');
  }

  /**
   * Test the correct path
   */
  async testCorrectPath() {
    console.log('🔍 Testing correct path: /api/auth/register');
    
    const result = await this.makeRequest('/api/auth/register', {
      email: `test-correct-${Date.now()}@floworx-test.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    });

    this.results.push({
      test: 'Correct API Path',
      path: '/api/auth/register',
      ...result
    });

    if (result.statusCode === 201 || result.statusCode === 400 || result.statusCode === 409) {
      console.log('   ✅ WORKING: Correct path responds properly');
    } else if (result.statusCode === 404) {
      console.log('   ❌ PROBLEM: Even correct path returns 404');
    } else {
      console.log(`   ⚠️  Response: ${result.statusCode} - ${result.statusMessage}`);
    }
    console.log('');
  }

  /**
   * Test rate limiting behavior
   */
  async testRateLimiting() {
    console.log('🔍 Testing rate limiting behavior');
    
    const requests = [];
    
    // Make multiple requests to test rate limiting
    for (let i = 0; i < 3; i++) {
      const result = await this.makeRequest('/api/auth/register', {
        email: `test-rate-${Date.now()}-${i}@floworx-test.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      });
      
      requests.push(result);
      
      console.log(`   Request ${i + 1}: ${result.statusCode} - Rate Limit: ${result.rateLimitRemaining}/${result.rateLimitLimit}`);
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.results.push({
      test: 'Rate Limiting',
      requests: requests
    });

    // Check for rate limiting headers
    const hasRateLimit = requests.some(r => r.rateLimitLimit);
    if (hasRateLimit) {
      console.log('   ✅ Rate limiting is active and working');
    } else {
      console.log('   ⚠️  No rate limiting headers detected');
    }
    console.log('');
  }

  /**
   * Test trust proxy headers
   */
  async testTrustProxyHeaders() {
    console.log('🔍 Testing trust proxy configuration');
    
    // Test with various IP headers to see how trust proxy handles them
    const testHeaders = [
      { 'X-Forwarded-For': '192.168.1.100' },
      { 'X-Real-IP': '10.0.0.50' },
      { 'X-Forwarded-For': '192.168.1.100, 10.0.0.1' }
    ];

    for (const headers of testHeaders) {
      const result = await this.makeRequest('/api/auth/register', {
        email: `test-proxy-${Date.now()}@floworx-test.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      }, headers);

      console.log(`   Headers: ${JSON.stringify(headers)}`);
      console.log(`   Response: ${result.statusCode} - Rate Limit: ${result.rateLimitRemaining}/${result.rateLimitLimit}`);
    }
    console.log('');
  }

  /**
   * Make HTTP request and return detailed result
   */
  async makeRequest(path, data, additionalHeaders = {}) {
    return new Promise((resolve) => {
      const postData = JSON.stringify(data);
      
      const options = {
        hostname: this.productionUrl,
        port: 443,
        path: path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'FloWorx-Diagnostic-Test/1.0',
          'Accept': 'application/json',
          ...additionalHeaders
        }
      };

      const startTime = Date.now();
      
      const req = https.request(options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          const result = {
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            responseTime: Date.now() - startTime,
            rateLimitLimit: res.headers['ratelimit-limit'] || res.headers['x-ratelimit-limit'],
            rateLimitRemaining: res.headers['ratelimit-remaining'] || res.headers['x-ratelimit-remaining'],
            rateLimitReset: res.headers['ratelimit-reset'] || res.headers['x-ratelimit-reset'],
            contentType: res.headers['content-type'],
            server: res.headers['server'],
            bodyLength: body.length
          };

          // Parse response body
          try {
            result.body = JSON.parse(body);
          } catch (e) {
            result.body = body.substring(0, 200);
          }

          resolve(result);
        });
      });

      req.on('error', (error) => {
        resolve({
          error: error.message,
          statusCode: 0
        });
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve({
          error: 'Request timeout',
          statusCode: 0
        });
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Display comprehensive diagnostic results
   */
  displayDiagnosticResults() {
    console.log('📋 DIAGNOSTIC RESULTS SUMMARY');
    console.log('=' .repeat(60));

    const doubleApiResult = this.results.find(r => r.test === 'Double API Path');
    const correctApiResult = this.results.find(r => r.test === 'Correct API Path');

    // Issue 1: 404 on double /api/api/ path
    console.log('🔍 ISSUE 1: 404 on /api/api/auth/register');
    if (doubleApiResult && doubleApiResult.statusCode === 404) {
      console.log('   ❌ CONFIRMED: Double /api/ path returns 404');
      console.log('   🔧 ROOT CAUSE: Frontend making requests to wrong URL');
      console.log('   💡 SOLUTION: Check frontend AuthContext.js baseURL configuration');
    } else {
      console.log('   ✅ No 404 issue detected on double /api/ path');
    }

    // Issue 2: Correct endpoint status
    console.log('\n🔍 CORRECT ENDPOINT STATUS: /api/auth/register');
    if (correctApiResult) {
      if (correctApiResult.statusCode === 201) {
        console.log('   ✅ WORKING: Registration endpoint is functional');
      } else if (correctApiResult.statusCode === 400 || correctApiResult.statusCode === 409) {
        console.log('   ✅ WORKING: Endpoint exists (validation/conflict errors expected)');
      } else if (correctApiResult.statusCode === 404) {
        console.log('   ❌ PROBLEM: Correct endpoint also returns 404');
      } else {
        console.log(`   ⚠️  Status: ${correctApiResult.statusCode} - ${correctApiResult.statusMessage}`);
      }
    }

    // Issue 3: Rate limiting
    console.log('\n🔍 RATE LIMITING STATUS:');
    const rateLimitResult = this.results.find(r => r.test === 'Rate Limiting');
    if (rateLimitResult && rateLimitResult.requests) {
      const hasRateLimit = rateLimitResult.requests.some(r => r.rateLimitLimit);
      if (hasRateLimit) {
        console.log('   ✅ WORKING: Rate limiting is active');
        console.log('   📊 Rate limits detected in response headers');
      } else {
        console.log('   ⚠️  No rate limiting headers detected');
        console.log('   🔧 May indicate trust proxy configuration issue');
      }
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (doubleApiResult && doubleApiResult.statusCode === 404) {
      console.log('   1. 🔧 Fix frontend URL configuration:');
      console.log('      • Check frontend/src/contexts/AuthContext.js');
      console.log('      • Verify API_BASE_URL is set correctly');
      console.log('      • Ensure no double /api/ in axios baseURL');
    }

    if (correctApiResult && correctApiResult.statusCode === 201) {
      console.log('   2. ✅ Registration endpoint is working correctly');
    }

    console.log('   3. 🔍 Check server logs for:');
    console.log('      • ValidationError messages about trust proxy');
    console.log('      • Rate limiting configuration warnings');
    console.log('      • Actual request paths being received');

    console.log('\n🎯 NEXT ACTIONS:');
    console.log('   1. Review frontend AuthContext.js for correct API URLs');
    console.log('   2. Check backend rate limiting trust proxy configuration');
    console.log('   3. Monitor server logs for ValidationError messages');
    console.log('   4. Test with corrected frontend configuration');
  }
}

/**
 * Main execution
 */
async function main() {
  const tester = new ProductionDiagnosticTester();
  await tester.runDiagnostics();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Diagnostic test interrupted');
  process.exit(0);
});

// Run the diagnostic
if (require.main === module) {
  main().catch((error) => {
    console.error('\n💥 DIAGNOSTIC ERROR:', error.message);
    process.exit(1);
  });
}
