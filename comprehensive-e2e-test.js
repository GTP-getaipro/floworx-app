/**
 * Comprehensive End-to-End Test for FloWorx Application
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
const TEST_EMAIL = 'e2e-comprehensive-test@floworx-iq.com';
const TEST_PASSWORD = 'TestPassword123!';
const TEST_BUSINESS = 'E2E Test Business';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}${details ? ' - ' + details : ''}`);
  
  results.tests.push({ name, passed, details });
  if (passed) results.passed++;
  else results.failed++;
}

async function testHealthEndpoint() {
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    logTest('Health Endpoint', response.status === 200 && response.data.status === 'ok');
    return response.data;
  } catch (error) {
    logTest('Health Endpoint', false, error.message);
    return null;
  }
}

async function testUserRegistration() {
  try {
    // Clean up any existing test user first
    try {
      await axios.delete(`${BASE_URL}/test/cleanup/${TEST_EMAIL}`);
    } catch (e) {
      // Ignore cleanup errors
    }

    const response = await axios.post(`${BASE_URL}/auth/register`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      firstName: 'E2E',
      lastName: 'Test',
      businessName: TEST_BUSINESS,
      agreeToTerms: true
    });

    const success = response.status === 201 && response.data.success && response.data.token;
    logTest('User Registration', success, success ? 'User created with JWT token' : 'Registration failed');
    return success ? response.data : null;
  } catch (error) {
    logTest('User Registration', false, error.response?.data?.message || error.message);
    return null;
  }
}

async function testUserLogin() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    const success = response.status === 200 && response.data.success && response.data.token;
    logTest('User Login', success, success ? 'Login successful with JWT token' : 'Login failed');
    return success ? response.data : null;
  } catch (error) {
    logTest('User Login', false, error.response?.data?.message || error.message);
    return null;
  }
}

async function testPasswordReset() {
  try {
    const response = await axios.post(`${BASE_URL}/password-reset/request`, {
      email: TEST_EMAIL
    });

    const success = response.status === 200 && response.data.success;
    logTest('Password Reset Request', success, success ? 'Reset email sent' : 'Reset request failed');
    return success;
  } catch (error) {
    logTest('Password Reset Request', false, error.response?.data?.message || error.message);
    return false;
  }
}

async function testInvalidLogin() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: 'WrongPassword123!'
    });

    // Should fail
    logTest('Invalid Login (Security)', false, 'Login should have failed but succeeded');
    return false;
  } catch (error) {
    const success = error.response?.status === 401 || error.response?.status === 400;
    logTest('Invalid Login (Security)', success, success ? 'Correctly rejected invalid credentials' : 'Unexpected error');
    return success;
  }
}

async function testNonExistentUserPasswordReset() {
  try {
    const response = await axios.post(`${BASE_URL}/password-reset/request`, {
      email: 'nonexistent@floworx-iq.com'
    });

    // Should still return success for security (don't reveal if email exists)
    const success = response.status === 200 && response.data.success;
    logTest('Non-existent User Password Reset (Security)', success, 
      success ? 'Correctly handled non-existent email' : 'Security issue detected');
    return success;
  } catch (error) {
    logTest('Non-existent User Password Reset (Security)', false, error.response?.data?.message || error.message);
    return false;
  }
}

async function testDuplicateRegistration() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      firstName: 'E2E',
      lastName: 'Duplicate',
      businessName: TEST_BUSINESS + ' Duplicate',
      agreeToTerms: true
    });

    // Should fail
    logTest('Duplicate Registration (Security)', false, 'Duplicate registration should have failed but succeeded');
    return false;
  } catch (error) {
    const success = error.response?.status === 400 || error.response?.status === 409;
    logTest('Duplicate Registration (Security)', success, 
      success ? 'Correctly rejected duplicate email' : 'Unexpected error');
    return success;
  }
}

async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive End-to-End Test for FloWorx Application\n');
  console.log('=' .repeat(60));

  // Test 1: Health Check
  console.log('\n📊 Testing Health Endpoint...');
  await testHealthEndpoint();

  // Test 2: User Registration
  console.log('\n👤 Testing User Registration...');
  const registrationResult = await testUserRegistration();

  // Test 3: User Login
  console.log('\n🔐 Testing User Login...');
  await testUserLogin();

  // Test 4: Password Reset
  console.log('\n🔄 Testing Password Reset...');
  await testPasswordReset();

  // Test 5: Security Tests
  console.log('\n🛡️ Testing Security Features...');
  await testInvalidLogin();
  await testNonExistentUserPasswordReset();
  await testDuplicateRegistration();

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📊 Total: ${results.tests.length}`);
  console.log(`🎯 Success Rate: ${Math.round((results.passed / results.tests.length) * 100)}%`);

  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => !t.passed).forEach(test => {
      console.log(`   • ${test.name}: ${test.details}`);
    });
  }

  console.log('\n🏁 End-to-End Test Complete!');
  
  // Return overall success
  return results.failed === 0;
}

// Run the test
runComprehensiveTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Test suite crashed:', error);
    process.exit(1);
  });
