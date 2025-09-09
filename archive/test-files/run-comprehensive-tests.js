const https = require('https');
const fs = require('fs');

const API_BASE = 'https://app.floworx-iq.com';

// Test results tracking
let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

async function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${path}`;
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

function logTest(name, status, details = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${name}: ${status}`);
  if (details) console.log(`   ${details}`);
  
  testResults.total++;
  if (status === 'PASS') {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  
  testResults.tests.push({
    name,
    status,
    details,
    timestamp: new Date().toISOString()
  });
}

async function testHealthEndpoints() {
  console.log('\n🏥 TESTING HEALTH ENDPOINTS');
  
  try {
    const healthResponse = await makeRequest('/api/health');
    if (healthResponse.status === 200 && healthResponse.data.status === 'healthy') {
      logTest('Health Endpoint', 'PASS', `Status: ${healthResponse.status}`);
    } else {
      logTest('Health Endpoint', 'FAIL', `Status: ${healthResponse.status}`);
    }
  } catch (error) {
    logTest('Health Endpoint', 'FAIL', `Error: ${error.message}`);
  }

  try {
    const dbHealthResponse = await makeRequest('/api/health/db');
    if (dbHealthResponse.status === 200 && dbHealthResponse.data.database === 'connected') {
      logTest('Database Health Endpoint', 'PASS', `Status: ${dbHealthResponse.status}`);
    } else {
      logTest('Database Health Endpoint', 'FAIL', `Status: ${dbHealthResponse.status}`);
    }
  } catch (error) {
    logTest('Database Health Endpoint', 'FAIL', `Error: ${error.message}`);
  }
}

async function testAuthenticationFlow() {
  console.log('\n🔐 TESTING AUTHENTICATION FLOW');
  
  const testEmail = `comprehensive-test-${Date.now()}@example.com`;
  const testPassword = 'ComprehensiveTest123!';
  
  try {
    // Test Registration
    const registerResponse = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: testEmail,
        password: testPassword,
        firstName: 'Comprehensive',
        lastName: 'Test',
        businessName: 'Comprehensive Test Company',
        agreeToTerms: true
      }
    });

    if (registerResponse.status === 201 && registerResponse.data.token) {
      logTest('User Registration', 'PASS', `User created: ${registerResponse.data.user.id}`);
      
      const token = registerResponse.data.token;
      
      // Test Token Verification
      const verifyResponse = await makeRequest('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (verifyResponse.status === 200 && verifyResponse.data.message === 'Token is valid') {
        logTest('Token Verification', 'PASS', 'Token validated successfully');
      } else {
        logTest('Token Verification', 'FAIL', `Status: ${verifyResponse.status}`);
      }
      
      return token; // Return token for further tests
    } else {
      logTest('User Registration', 'FAIL', `Status: ${registerResponse.status}`);
      return null;
    }
  } catch (error) {
    logTest('Authentication Flow', 'FAIL', `Error: ${error.message}`);
    return null;
  }
}

async function testAuthenticatedEndpoints(token) {
  console.log('\n👤 TESTING AUTHENTICATED ENDPOINTS');
  
  if (!token) {
    logTest('Authenticated Endpoints', 'SKIP', 'No valid token available');
    return;
  }
  
  const endpoints = [
    { path: '/api/user/status', name: 'User Status' },
    { path: '/api/dashboard', name: 'Dashboard' },
    { path: '/api/user/profile', name: 'User Profile' },
    { path: '/api/workflows', name: 'Workflows' },
    { path: '/api/analytics', name: 'Analytics' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint.path, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.status === 200) {
        logTest(endpoint.name, 'PASS', `Status: ${response.status}`);
      } else {
        logTest(endpoint.name, 'FAIL', `Status: ${response.status}`);
      }
    } catch (error) {
      logTest(endpoint.name, 'FAIL', `Error: ${error.message}`);
    }
  }
}

async function testPasswordReset() {
  console.log('\n🔒 TESTING PASSWORD RESET');
  
  try {
    const resetResponse = await makeRequest('/api/auth/forgot-password', {
      method: 'POST',
      body: {
        email: 'test-reset@example.com'
      }
    });
    
    if (resetResponse.status === 200) {
      logTest('Password Reset Request', 'PASS', `Status: ${resetResponse.status}`);
    } else {
      logTest('Password Reset Request', 'FAIL', `Status: ${resetResponse.status}`);
    }
  } catch (error) {
    logTest('Password Reset Request', 'FAIL', `Error: ${error.message}`);
  }
}

async function testErrorHandling() {
  console.log('\n⚠️ TESTING ERROR HANDLING');
  
  try {
    // Test invalid endpoint
    const invalidResponse = await makeRequest('/api/invalid-endpoint');
    if (invalidResponse.status === 404) {
      logTest('404 Error Handling', 'PASS', 'Correctly returns 404 for invalid endpoints');
    } else {
      logTest('404 Error Handling', 'FAIL', `Expected 404, got ${invalidResponse.status}`);
    }
  } catch (error) {
    logTest('404 Error Handling', 'FAIL', `Error: ${error.message}`);
  }
  
  try {
    // Test unauthorized access
    const unauthorizedResponse = await makeRequest('/api/user/status');
    if (unauthorizedResponse.status === 401) {
      logTest('401 Unauthorized Handling', 'PASS', 'Correctly returns 401 for unauthorized access');
    } else {
      logTest('401 Unauthorized Handling', 'FAIL', `Expected 401, got ${unauthorizedResponse.status}`);
    }
  } catch (error) {
    logTest('401 Unauthorized Handling', 'FAIL', `Error: ${error.message}`);
  }
}

async function generateReport() {
  console.log('\n📊 GENERATING TEST REPORT');
  
  const report = {
    summary: {
      total: testResults.total,
      passed: testResults.passed,
      failed: testResults.failed,
      successRate: ((testResults.passed / testResults.total) * 100).toFixed(2) + '%'
    },
    timestamp: new Date().toISOString(),
    environment: 'Production (https://app.floworx-iq.com)',
    tests: testResults.tests
  };
  
  // Save detailed report
  fs.writeFileSync('./comprehensive-test-report.json', JSON.stringify(report, null, 2));
  
  console.log(`\n🎯 COMPREHENSIVE TEST RESULTS:`);
  console.log(`📊 Total Tests: ${report.summary.total}`);
  console.log(`✅ Passed: ${report.summary.passed}`);
  console.log(`❌ Failed: ${report.summary.failed}`);
  console.log(`📈 Success Rate: ${report.summary.successRate}`);
  console.log(`📄 Detailed report saved to: ./comprehensive-test-report.json`);
  
  if (report.summary.failed === 0) {
    console.log(`\n🎉 ALL TESTS PASSED! Your application is working perfectly! 🚀`);
  } else {
    console.log(`\n⚠️ Some tests failed. Check the detailed report for more information.`);
  }
}

async function runComprehensiveTests() {
  console.log('🧪 STARTING COMPREHENSIVE TEST SUITE');
  console.log('🌐 Target: ' + API_BASE);
  console.log('⏰ Started at: ' + new Date().toISOString());
  
  await testHealthEndpoints();
  const token = await testAuthenticationFlow();
  await testAuthenticatedEndpoints(token);
  await testPasswordReset();
  await testErrorHandling();
  await generateReport();
}

// Run the comprehensive test suite
runComprehensiveTests().catch(console.error);
