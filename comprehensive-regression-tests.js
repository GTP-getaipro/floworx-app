#!/usr/bin/env node

const https = require('https');
const fs = require('fs');

console.log('🔍 FLOWORX COMPREHENSIVE REGRESSION TEST SUITE');
console.log('===============================================');

const BASE_URL = 'https://app.floworx-iq.com';

// Test configuration including all discovered data validation
const testSuites = {
  health: {
    title: '🏥 Health & Monitoring Tests',
    tests: [
      { name: 'Main Health Check', endpoint: '/api/health', method: 'GET', expected: [200] },
      { name: 'Database Health', endpoint: '/api/health/db', method: 'GET', expected: [200] },
      { name: 'Cache Health', endpoint: '/api/health/cache', method: 'GET', expected: [200, 503] },
      { name: 'Performance Metrics', endpoint: '/api/performance', method: 'GET', expected: [200] }
    ]
  },
  
  auth: {
    title: '🔐 Authentication System Tests',
    tests: [
      { name: 'Password Requirements', endpoint: '/api/auth/password-requirements', method: 'GET', expected: [200, 429] },
      { name: 'Registration Validation', endpoint: '/api/auth/register', method: 'POST', 
        data: { email: 'regression.test@example.com', password: 'Test123!', firstName: 'Regression', lastName: 'Test' },
        expected: [400, 409, 429] },
      { name: 'Login Validation', endpoint: '/api/auth/login', method: 'POST',
        data: { email: 'nonexistent@example.com', password: 'WrongPass123!' },
        expected: [401, 429] },
      { name: 'Forgot Password', endpoint: '/api/auth/forgot-password', method: 'POST',
        data: { email: 'test@example.com' },
        expected: [200, 400, 429] }
    ]
  },
  
  business: {
    title: '🏢 Business Configuration Tests',
    tests: [
      { name: 'Business Types List', endpoint: '/api/business-types', method: 'GET', expected: [200],
        validate: (data) => data.success && data.data && data.data.length >= 6 },
      { name: 'Hot Tub Business Type', endpoint: '/api/business-types', method: 'GET', expected: [200],
        validate: (data) => data.data && data.data.some(type => type.slug === 'hot-tub-spa') },
      { name: 'Business Types Structure', endpoint: '/api/business-types', method: 'GET', expected: [200],
        validate: (data) => data.data && data.data.every(type => type.id && type.name && type.slug) }
    ]
  },
  
  oauth: {
    title: '🔗 OAuth Integration Tests',
    tests: [
      { name: 'Google OAuth Redirect', endpoint: '/api/oauth/google', method: 'GET', expected: [302] },
      { name: 'OAuth Callback Handler', endpoint: '/api/oauth/google/callback', method: 'GET', expected: [302] }
    ]
  },
  
  protected: {
    title: '🔒 Protected Endpoints Tests',
    tests: [
      { name: 'User Status (Auth Required)', endpoint: '/api/user/status', method: 'GET', expected: [401] },
      { name: 'User Profile (Auth Required)', endpoint: '/api/user/profile', method: 'GET', expected: [401] },
      { name: 'Dashboard Data (Auth Required)', endpoint: '/api/dashboard', method: 'GET', expected: [401] },
      { name: 'Onboarding Status (Auth Required)', endpoint: '/api/onboarding/status', method: 'GET', expected: [401] },
      { name: 'Gmail Labels (Auth Required)', endpoint: '/api/onboarding/gmail-labels', method: 'GET', expected: [401] },
      { name: 'Workflow Status (Auth Required)', endpoint: '/api/workflows/status', method: 'GET', expected: [401] },
      { name: 'Analytics Dashboard (Auth Required)', endpoint: '/api/analytics/dashboard', method: 'GET', expected: [401] }
    ]
  },
  
  onboarding: {
    title: '🎯 Onboarding Flow Tests',
    tests: [
      { name: 'Business Categories Endpoint', endpoint: '/api/onboarding/step/business-categories', method: 'POST',
        data: { categories: ['customer_service'] }, expected: [401] },
      { name: 'Label Mapping Endpoint', endpoint: '/api/onboarding/step/label-mapping', method: 'POST',
        data: { mappings: [] }, expected: [401] },
      { name: 'Team Setup Endpoint', endpoint: '/api/onboarding/step/team-setup', method: 'POST',
        data: { teamMembers: [] }, expected: [401] }
    ]
  },
  
  workflows: {
    title: '⚙️ Workflow Management Tests',
    tests: [
      { name: 'Workflow Health Check', endpoint: '/api/workflows/health', method: 'GET', expected: [401] },
      { name: 'Workflow Deploy Endpoint', endpoint: '/api/workflows/deploy', method: 'POST', expected: [401] },
      { name: 'Workflow Status Check', endpoint: '/api/workflows/status', method: 'GET', expected: [401] }
    ]
  },
  
  analytics: {
    title: '📈 Analytics System Tests',
    tests: [
      { name: 'Analytics Dashboard', endpoint: '/api/analytics/dashboard', method: 'GET', expected: [401, 429] },
      { name: 'Onboarding Funnel', endpoint: '/api/analytics/funnel', method: 'GET', expected: [401, 429] },
      { name: 'Conversion Analytics', endpoint: '/api/analytics/conversion', method: 'GET', expected: [401, 429] },
      { name: 'User Behavior Analytics', endpoint: '/api/analytics/behavior', method: 'GET', expected: [401, 429] },
      { name: 'Real-time Metrics', endpoint: '/api/analytics/realtime', method: 'GET', expected: [401, 429] }
    ]
  },

  performance: {
    title: '⚡ Performance Monitoring Tests',
    tests: [
      { name: 'System Performance (Public)', endpoint: '/api/performance', method: 'GET', expected: [200, 429] },
      { name: 'Endpoint Performance (Protected)', endpoint: '/api/performance/endpoints', method: 'GET', expected: [401, 429] },
      { name: 'System Performance (Protected)', endpoint: '/api/performance/system', method: 'GET', expected: [401, 429] }
    ]
  }
};

async function testEndpoint(test) {
  return new Promise((resolve) => {
    const client = https;
    const urlObj = new URL(`${BASE_URL}${test.endpoint}`);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: test.method,
      timeout: 15000,
      headers: {
        'User-Agent': 'FloWorx-Regression-Test/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };
    
    if (test.data && test.method !== 'GET') {
      const jsonData = JSON.stringify(test.data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }
    
    const req = client.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        let parsedData = null;
        try {
          parsedData = JSON.parse(responseData);
        } catch (e) {
          // Response is not JSON
        }
        
        const result = {
          success: true,
          status: res.statusCode,
          data: parsedData,
          rawData: responseData
        };
        
        // Check if status is expected
        if (test.expected.includes(res.statusCode)) {
          result.passed = true;
        } else {
          result.passed = false;
          result.error = `Expected status ${test.expected.join(' or ')}, got ${res.statusCode}`;
        }
        
        // Run custom validation if provided
        if (test.validate && parsedData && result.passed) {
          try {
            result.passed = test.validate(parsedData);
            if (!result.passed) {
              result.error = 'Custom validation failed';
            }
          } catch (e) {
            result.passed = false;
            result.error = `Validation error: ${e.message}`;
          }
        }
        
        resolve(result);
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        passed: false,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        passed: false,
        error: 'Request timeout'
      });
    });
    
    if (test.data && test.method !== 'GET') {
      req.write(JSON.stringify(test.data));
    }
    
    req.end();
  });
}

async function runTestSuite(suiteKey, suite) {
  console.log(`\n${suite.title}`);
  console.log('='.repeat(suite.title.length));
  
  const results = { passed: 0, failed: 0, tests: [] };
  
  for (const test of suite.tests) {
    process.stdout.write(`Testing: ${test.name}... `);
    
    const result = await testEndpoint(test);
    
    if (result.passed) {
      console.log(`✅ ${result.status}`);
      results.passed++;
      
      // Show additional info for successful data validation
      if (test.validate && result.data) {
        if (test.name.includes('Business Types List')) {
          console.log(`   📋 Found ${result.data.data.length} business types`);
        }
        if (test.name.includes('Hot Tub Business Type')) {
          const hotTubType = result.data.data.find(type => type.slug === 'hot-tub-spa');
          if (hotTubType) {
            console.log(`   🛁 Hot Tub & Spa business type confirmed: "${hotTubType.name}"`);
          }
        }
      }
    } else {
      console.log(`❌ ${result.error || result.status || 'Failed'}`);
      results.failed++;
    }
    
    results.tests.push({
      name: test.name,
      passed: result.passed,
      status: result.status,
      error: result.error
    });
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

async function runComprehensiveTests() {
  console.log('🚀 Starting comprehensive regression tests...\n');
  console.log(`🎯 Target: ${BASE_URL}`);
  console.log(`📅 Started: ${new Date().toLocaleString()}\n`);
  
  const overallResults = {
    suites: {},
    summary: { total: 0, passed: 0, failed: 0 },
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL
  };
  
  // Run all test suites
  for (const [suiteKey, suite] of Object.entries(testSuites)) {
    const results = await runTestSuite(suiteKey, suite);
    overallResults.suites[suiteKey] = results;
    overallResults.summary.total += results.passed + results.failed;
    overallResults.summary.passed += results.passed;
    overallResults.summary.failed += results.failed;
  }
  
  // Display comprehensive summary
  console.log('\n📊 COMPREHENSIVE TEST SUMMARY');
  console.log('==============================');
  
  Object.entries(overallResults.suites).forEach(([suiteKey, results]) => {
    const suite = testSuites[suiteKey];
    const successRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
    console.log(`${suite.title}: ${results.passed}/${results.passed + results.failed} (${successRate}%)`);
  });
  
  const overallSuccessRate = ((overallResults.summary.passed / overallResults.summary.total) * 100).toFixed(1);
  
  console.log('\n🎯 OVERALL RESULTS:');
  console.log(`   Total Tests: ${overallResults.summary.total}`);
  console.log(`   Passed: ${overallResults.summary.passed}`);
  console.log(`   Failed: ${overallResults.summary.failed}`);
  console.log(`   Success Rate: ${overallSuccessRate}%`);
  
  // System status assessment
  console.log('\n🔍 SYSTEM STATUS ASSESSMENT:');
  
  const healthResults = overallResults.suites.health;
  const authResults = overallResults.suites.auth;
  const businessResults = overallResults.suites.business;
  
  if (healthResults && healthResults.passed >= 3) {
    console.log('✅ Core system health: EXCELLENT');
  } else {
    console.log('⚠️ Core system health: NEEDS ATTENTION');
  }
  
  if (authResults && authResults.passed >= 2) {
    console.log('✅ Authentication system: FUNCTIONAL');
  } else {
    console.log('⚠️ Authentication system: NEEDS REVIEW');
  }
  
  if (businessResults && businessResults.passed >= 2) {
    console.log('✅ Business configuration: READY');
  } else {
    console.log('⚠️ Business configuration: INCOMPLETE');
  }
  
  // Save detailed results
  const resultsFile = `regression-test-results-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(resultsFile, JSON.stringify(overallResults, null, 2));
  console.log(`\n📄 Detailed results saved to: ${resultsFile}`);
  
  console.log('\n🎉 Comprehensive regression testing completed!');
  
  if (overallSuccessRate >= 90) {
    console.log('🏆 EXCELLENT: System is performing exceptionally well!');
  } else if (overallSuccessRate >= 75) {
    console.log('✅ GOOD: System is functional with minor issues');
  } else if (overallSuccessRate >= 50) {
    console.log('⚠️ FAIR: System needs attention in several areas');
  } else {
    console.log('🚨 POOR: System requires immediate attention');
  }
  
  return overallResults;
}

// Run tests if called directly
if (require.main === module) {
  runComprehensiveTests().catch(console.error);
}

module.exports = { runComprehensiveTests, testSuites };
