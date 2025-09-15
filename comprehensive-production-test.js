const axios = require('axios');

// Production URL
const PRODUCTION_URL = 'https://app.floworx-iq.com';

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  validateStatus: () => true
};

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Helper functions
function logTest(testName, status, details = '') {
  testResults.total++;
  const emoji = status === 'PASS' ? '✅' : '❌';
  const message = `${emoji} ${testName}: ${status}`;
  
  if (status === 'PASS') {
    testResults.passed++;
  } else {
    testResults.failed++;
  }
  
  testResults.details.push({ testName, status, details });
  console.log(message);
  if (details) console.log(`   ${details}`);
}

function generateTestEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

// Test Suite
async function runComprehensiveTests() {
  console.log('🚀 STARTING COMPREHENSIVE FLOWORX PRODUCTION TESTING');
  console.log('=' .repeat(60));
  console.log(`🌐 Production URL: ${PRODUCTION_URL}`);
  console.log(`⏰ Test Started: ${new Date().toISOString()}`);
  console.log('');

  // 1. Infrastructure Tests
  console.log('📡 INFRASTRUCTURE TESTS');
  console.log('-'.repeat(30));
  
  try {
    const healthResponse = await axios.get(`${PRODUCTION_URL}/api/health`, TEST_CONFIG);
    if (healthResponse.status === 200) {
      logTest('Health Check', 'PASS', `Server responding with ${healthResponse.status}`);
    } else {
      logTest('Health Check', 'FAIL', `Expected 200, got ${healthResponse.status}`);
    }
  } catch (error) {
    logTest('Health Check', 'FAIL', `Error: ${error.message}`);
  }

  // Test frontend serving
  try {
    const frontendResponse = await axios.get(PRODUCTION_URL, TEST_CONFIG);
    if (frontendResponse.status === 200 &&
        (frontendResponse.data.includes('<!DOCTYPE html>') ||
         frontendResponse.data.includes('<html') ||
         frontendResponse.data.includes('React'))) {
      logTest('Frontend Serving', 'PASS', 'React app HTML served correctly');
    } else {
      logTest('Frontend Serving', 'FAIL', `Status: ${frontendResponse.status}, Content type: ${frontendResponse.headers['content-type']}`);
    }
  } catch (error) {
    logTest('Frontend Serving', 'FAIL', `Error: ${error.message}`);
  }

  console.log('');

  // 2. Authentication System Tests
  console.log('🔐 AUTHENTICATION SYSTEM TESTS');
  console.log('-'.repeat(30));

  let testUser = null;
  let authToken = null;

  // Test user registration
  try {
    const registrationData = {
      firstName: 'Test',
      lastName: 'User',
      email: generateTestEmail(),
      password: 'TestPassword123!',
      businessName: 'Test Company'
    };

    const regResponse = await axios.post(`${PRODUCTION_URL}/api/auth/register`, registrationData, TEST_CONFIG);
    
    if (regResponse.status === 201 && regResponse.data.success && regResponse.data.token) {
      logTest('User Registration', 'PASS', `User created: ${regResponse.data.user.email}`);
      testUser = regResponse.data.user;
      authToken = regResponse.data.token;
    } else {
      logTest('User Registration', 'FAIL', `Status: ${regResponse.status}, Response: ${JSON.stringify(regResponse.data)}`);
    }
  } catch (error) {
    logTest('User Registration', 'FAIL', `Error: ${error.message}`);
  }

  // Test user login (if registration succeeded)
  if (testUser) {
    try {
      const loginData = {
        email: testUser.email,
        password: 'TestPassword123!'
      };

      const loginResponse = await axios.post(`${PRODUCTION_URL}/api/auth/login`, loginData, TEST_CONFIG);
      
      if (loginResponse.status === 200 && loginResponse.data.success && loginResponse.data.token) {
        logTest('User Login', 'PASS', `Login successful for ${testUser.email}`);
      } else {
        logTest('User Login', 'FAIL', `Status: ${loginResponse.status}, Response: ${JSON.stringify(loginResponse.data)}`);
      }
    } catch (error) {
      logTest('User Login', 'FAIL', `Error: ${error.message}`);
    }
  } else {
    logTest('User Login', 'SKIP', 'Registration failed, cannot test login');
  }

  console.log('');

  // 3. API Endpoint Tests
  console.log('🔌 API ENDPOINT TESTS');
  console.log('-'.repeat(30));

  // Test dashboard endpoint (requires auth)
  if (authToken) {
    try {
      const dashboardResponse = await axios.get(`${PRODUCTION_URL}/api/dashboard`, {
        ...TEST_CONFIG,
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (dashboardResponse.status === 200) {
        logTest('Dashboard Endpoint', 'PASS', 'Protected route accessible with valid token');
      } else {
        logTest('Dashboard Endpoint', 'FAIL', `Status: ${dashboardResponse.status}`);
      }
    } catch (error) {
      logTest('Dashboard Endpoint', 'FAIL', `Error: ${error.message}`);
    }
  } else {
    logTest('Dashboard Endpoint', 'SKIP', 'No auth token available');
  }

  // Test user profile endpoint
  if (authToken) {
    try {
      const profileResponse = await axios.get(`${PRODUCTION_URL}/api/user/profile`, {
        ...TEST_CONFIG,
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (profileResponse.status === 200) {
        logTest('User Profile Endpoint', 'PASS', 'Profile data retrieved successfully');
      } else {
        logTest('User Profile Endpoint', 'FAIL', `Status: ${profileResponse.status}`);
      }
    } catch (error) {
      logTest('User Profile Endpoint', 'FAIL', `Error: ${error.message}`);
    }
  } else {
    logTest('User Profile Endpoint', 'SKIP', 'No auth token available');
  }

  console.log('');

  // 4. Error Handling Tests
  console.log('⚠️ ERROR HANDLING TESTS');
  console.log('-'.repeat(30));

  // Test invalid registration
  try {
    const invalidRegResponse = await axios.post(`${PRODUCTION_URL}/api/auth/register`, {
      firstName: 'Test',
      // Missing required fields
    }, TEST_CONFIG);
    
    if (invalidRegResponse.status === 400) {
      logTest('Invalid Registration Handling', 'PASS', 'Proper validation error returned');
    } else {
      logTest('Invalid Registration Handling', 'FAIL', `Expected 400, got ${invalidRegResponse.status}`);
    }
  } catch (error) {
    logTest('Invalid Registration Handling', 'FAIL', `Error: ${error.message}`);
  }

  // Test invalid login
  try {
    const invalidLoginResponse = await axios.post(`${PRODUCTION_URL}/api/auth/login`, {
      email: 'nonexistent@example.com',
      password: 'wrongpassword'
    }, TEST_CONFIG);
    
    if (invalidLoginResponse.status === 401 || invalidLoginResponse.status === 400) {
      logTest('Invalid Login Handling', 'PASS', 'Proper authentication error returned');
    } else {
      logTest('Invalid Login Handling', 'FAIL', `Expected 401/400, got ${invalidLoginResponse.status}`);
    }
  } catch (error) {
    logTest('Invalid Login Handling', 'FAIL', `Error: ${error.message}`);
  }

  // Test unauthorized access
  try {
    const unauthorizedResponse = await axios.get(`${PRODUCTION_URL}/api/dashboard`, TEST_CONFIG);
    
    if (unauthorizedResponse.status === 401) {
      logTest('Unauthorized Access Handling', 'PASS', 'Protected route properly secured');
    } else {
      logTest('Unauthorized Access Handling', 'FAIL', `Expected 401, got ${unauthorizedResponse.status}`);
    }
  } catch (error) {
    logTest('Unauthorized Access Handling', 'FAIL', `Error: ${error.message}`);
  }

  console.log('');

  // 5. Performance Tests
  console.log('⚡ PERFORMANCE TESTS');
  console.log('-'.repeat(30));

  // Test response times
  const startTime = Date.now();
  try {
    await axios.get(`${PRODUCTION_URL}/api/health`, TEST_CONFIG);
    const responseTime = Date.now() - startTime;
    
    if (responseTime < 2000) {
      logTest('Response Time', 'PASS', `Health endpoint responded in ${responseTime}ms`);
    } else {
      logTest('Response Time', 'WARN', `Slow response: ${responseTime}ms (>2000ms)`);
    }
  } catch (error) {
    logTest('Response Time', 'FAIL', `Error: ${error.message}`);
  }

  // Final Results
  console.log('');
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('=' .repeat(60));
  console.log(`✅ Tests Passed: ${testResults.passed}`);
  console.log(`❌ Tests Failed: ${testResults.failed}`);
  console.log(`📊 Total Tests: ${testResults.total}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  console.log(`⏰ Test Completed: ${new Date().toISOString()}`);
  
  if (testResults.passed / testResults.total >= 0.8) {
    console.log('');
    console.log('🎉 FLOWORX SYSTEM STATUS: OPERATIONAL');
    console.log('✅ System is ready for production use!');
  } else {
    console.log('');
    console.log('⚠️ FLOWORX SYSTEM STATUS: NEEDS ATTENTION');
    console.log('❌ Some critical issues need to be resolved.');
  }
  
  return testResults;
}

// Run the comprehensive test suite
runComprehensiveTests().catch(console.error);
