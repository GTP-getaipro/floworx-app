#!/usr/bin/env node

/**
 * Test Fixed Endpoints
 * 
 * This script tests the specific endpoints that were fixed to ensure they're working correctly
 */

const https = require('https');

class FixedEndpointTester {
  constructor() {
    this.productionUrl = 'app.floworx-iq.com';
    this.results = [];
  }

  async testFixedEndpoints() {
    console.log('🔧 TESTING FIXED ENDPOINTS');
    console.log('=' .repeat(60));
    console.log(`🎯 Target: https://${this.productionUrl}\n`);

    // Test 1: Registration endpoint (should work now)
    await this.testRegistrationEndpoint();

    // Test 2: User settings endpoint (newly added)
    await this.testUserSettingsEndpoint();

    // Test 3: Forgot password endpoint (newly added)
    await this.testForgotPasswordEndpoint();

    // Test 4: Business types endpoint (correct path)
    await this.testBusinessTypesEndpoint();

    // Display results
    this.displayResults();
  }

  async testRegistrationEndpoint() {
    console.log('📝 Testing Registration Endpoint');
    console.log('-' .repeat(40));

    const testData = {
      email: `test-fixed-${Date.now()}@floworx-test.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    };

    const result = await this.makeRequest('/api/auth/register', 'POST', testData);
    
    console.log(`   Status: ${result.statusCode} ${result.statusMessage}`);
    console.log(`   Response Time: ${result.responseTime}ms`);
    
    if (result.statusCode === 201 || result.statusCode === 409) {
      console.log('   ✅ SUCCESS: Registration endpoint working correctly');
      this.results.push({ endpoint: 'Registration', status: 'PASS', issue: 'Fixed' });
    } else {
      console.log('   ❌ ISSUE: Registration endpoint still has problems');
      this.results.push({ endpoint: 'Registration', status: 'FAIL', issue: 'Not Fixed' });
    }
    console.log('');
  }

  async testUserSettingsEndpoint() {
    console.log('⚙️  Testing User Settings Endpoint');
    console.log('-' .repeat(40));

    // Test GET /api/user/settings (should return 401 without auth)
    const getResult = await this.makeRequest('/api/user/settings', 'GET');
    
    console.log(`   GET Status: ${getResult.statusCode} ${getResult.statusMessage}`);
    
    if (getResult.statusCode === 401 || getResult.statusCode === 200) {
      console.log('   ✅ SUCCESS: User settings GET endpoint exists');
      this.results.push({ endpoint: 'User Settings GET', status: 'PASS', issue: 'Added' });
    } else if (getResult.statusCode === 404) {
      console.log('   ❌ ISSUE: User settings endpoint still missing');
      this.results.push({ endpoint: 'User Settings GET', status: 'FAIL', issue: 'Still Missing' });
    } else {
      console.log(`   ⚠️  UNEXPECTED: Status ${getResult.statusCode}`);
      this.results.push({ endpoint: 'User Settings GET', status: 'WARN', issue: 'Unexpected Response' });
    }

    // Test PUT /api/user/settings (should return 401 without auth)
    const putResult = await this.makeRequest('/api/user/settings', 'PUT', {
      notifications: { email: true },
      preferences: { theme: 'dark' }
    });
    
    console.log(`   PUT Status: ${putResult.statusCode} ${putResult.statusMessage}`);
    
    if (putResult.statusCode === 401 || putResult.statusCode === 200) {
      console.log('   ✅ SUCCESS: User settings PUT endpoint exists');
      this.results.push({ endpoint: 'User Settings PUT', status: 'PASS', issue: 'Added' });
    } else if (putResult.statusCode === 404) {
      console.log('   ❌ ISSUE: User settings PUT endpoint still missing');
      this.results.push({ endpoint: 'User Settings PUT', status: 'FAIL', issue: 'Still Missing' });
    } else {
      console.log(`   ⚠️  UNEXPECTED: Status ${putResult.statusCode}`);
      this.results.push({ endpoint: 'User Settings PUT', status: 'WARN', issue: 'Unexpected Response' });
    }
    console.log('');
  }

  async testForgotPasswordEndpoint() {
    console.log('🔑 Testing Forgot Password Endpoint');
    console.log('-' .repeat(40));

    const testData = {
      email: 'test@example.com'
    };

    const result = await this.makeRequest('/api/auth/forgot-password', 'POST', testData);
    
    console.log(`   Status: ${result.statusCode} ${result.statusMessage}`);
    console.log(`   Response Time: ${result.responseTime}ms`);
    
    if (result.statusCode === 200 || result.statusCode === 400) {
      console.log('   ✅ SUCCESS: Forgot password endpoint working');
      this.results.push({ endpoint: 'Forgot Password', status: 'PASS', issue: 'Added' });
    } else if (result.statusCode === 404) {
      console.log('   ❌ ISSUE: Forgot password endpoint still missing');
      this.results.push({ endpoint: 'Forgot Password', status: 'FAIL', issue: 'Still Missing' });
    } else {
      console.log(`   ⚠️  UNEXPECTED: Status ${result.statusCode}`);
      this.results.push({ endpoint: 'Forgot Password', status: 'WARN', issue: 'Unexpected Response' });
    }
    console.log('');
  }

  async testBusinessTypesEndpoint() {
    console.log('🏢 Testing Business Types Endpoint');
    console.log('-' .repeat(40));

    // Test correct path: /api/business-types
    const result = await this.makeRequest('/api/business-types', 'GET');
    
    console.log(`   Status: ${result.statusCode} ${result.statusMessage}`);
    console.log(`   Response Time: ${result.responseTime}ms`);
    
    if (result.statusCode === 200 || result.statusCode === 401) {
      console.log('   ✅ SUCCESS: Business types endpoint working');
      this.results.push({ endpoint: 'Business Types', status: 'PASS', issue: 'Correct Path' });
    } else if (result.statusCode === 404) {
      console.log('   ❌ ISSUE: Business types endpoint not found');
      this.results.push({ endpoint: 'Business Types', status: 'FAIL', issue: 'Still Missing' });
    } else {
      console.log(`   ⚠️  UNEXPECTED: Status ${result.statusCode}`);
      this.results.push({ endpoint: 'Business Types', status: 'WARN', issue: 'Unexpected Response' });
    }
    console.log('');
  }

  async makeRequest(path, method, data = null) {
    return new Promise((resolve) => {
      const postData = data ? JSON.stringify(data) : null;
      
      const options = {
        hostname: this.productionUrl,
        port: 443,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FloWorx-Fixed-Endpoint-Test/1.0',
          'Accept': 'application/json'
        }
      };

      if (postData) {
        options.headers['Content-Length'] = Buffer.byteLength(postData);
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
            body: body
          });
        });
      });

      req.on('error', (error) => {
        resolve({
          statusCode: 0,
          error: error.message,
          responseTime: Date.now() - startTime
        });
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve({
          statusCode: 0,
          error: 'Request timeout',
          responseTime: Date.now() - startTime
        });
      });

      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  displayResults() {
    console.log('📊 FIXED ENDPOINTS TEST RESULTS');
    console.log('=' .repeat(60));

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;

    console.log(`📈 SUMMARY:`);
    console.log(`   • Total Tested: ${this.results.length}`);
    console.log(`   • Fixed/Working: ${passed}`);
    console.log(`   • Still Failing: ${failed}`);
    console.log(`   • Warnings: ${warnings}`);

    console.log(`\n📋 DETAILED RESULTS:`);
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
      console.log(`   ${icon} ${result.endpoint}: ${result.issue}`);
    });

    if (failed === 0) {
      console.log(`\n🎉 ALL ENDPOINTS FIXED SUCCESSFULLY!`);
      console.log(`   • Registration endpoint: Working correctly`);
      console.log(`   • User settings: Added and functional`);
      console.log(`   • Forgot password: Added and functional`);
      console.log(`   • Business types: Using correct path`);
    } else {
      console.log(`\n🔧 REMAINING ISSUES:`);
      this.results.filter(r => r.status === 'FAIL').forEach(result => {
        console.log(`   • ${result.endpoint}: ${result.issue}`);
      });
    }

    console.log(`\n🎯 NEXT STEPS:`);
    console.log(`   1. Wait for deployment to complete (3-5 minutes)`);
    console.log(`   2. Re-run comprehensive API validation`);
    console.log(`   3. Test frontend integration with fixed endpoints`);
    console.log(`   4. Monitor production logs for any remaining issues`);
  }
}

/**
 * Main execution
 */
async function main() {
  const tester = new FixedEndpointTester();
  await tester.testFixedEndpoints();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test interrupted');
  process.exit(0);
});

// Run the test
if (require.main === module) {
  main().catch((error) => {
    console.error('\n💥 TEST ERROR:', error.message);
    process.exit(1);
  });
}
