/**
 * Test Error Handling System - Validate User-Friendly Messages
 * Tests various error scenarios to ensure proper user-friendly messaging
 */

const axios = require('axios');

const PRODUCTION_URL = 'https://app.floworx-iq.com';

async function testErrorHandlingSystem() {
  console.log('🧪 TESTING ERROR HANDLING SYSTEM');
  console.log('=' .repeat(60));
  console.log('🌐 Production URL:', PRODUCTION_URL);
  console.log('⏰ Test Started:', new Date().toISOString());
  console.log('');

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  const logTest = (testName, status, details) => {
    results.total++;
    if (status === 'PASS') {
      results.passed++;
      console.log(`✅ ${testName}: ${status}`);
      if (details) console.log(`   ${details}`);
    } else {
      results.failed++;
      console.log(`❌ ${testName}: ${status}`);
      if (details) console.log(`   ${details}`);
    }
  };

  try {
    console.log('🔍 ERROR SCENARIO TESTS');
    console.log('-'.repeat(30));

    // Test 1: Invalid Email Registration
    console.log('1️⃣ Testing invalid email registration...');
    try {
      const invalidEmailResponse = await axios.post(`${PRODUCTION_URL}/api/auth/register`, {
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email',
        password: 'ValidPassword123!',
        businessName: 'Test Co'
      }, { timeout: 10000, validateStatus: () => true });

      if (invalidEmailResponse.status === 400 && 
          invalidEmailResponse.data.error && 
          invalidEmailResponse.data.error.toLowerCase().includes('email')) {
        logTest('Invalid Email Error', 'PASS', 'Proper validation error returned');
      } else {
        logTest('Invalid Email Error', 'FAIL', `Status: ${invalidEmailResponse.status}, Response: ${JSON.stringify(invalidEmailResponse.data)}`);
      }
    } catch (error) {
      logTest('Invalid Email Error', 'FAIL', `Network error: ${error.message}`);
    }

    // Test 2: Weak Password Registration
    console.log('2️⃣ Testing weak password registration...');
    try {
      const weakPasswordResponse = await axios.post(`${PRODUCTION_URL}/api/auth/register`, {
        firstName: 'Test',
        lastName: 'User',
        email: 'test-weak-' + Date.now() + '@example.com',
        password: '123',
        businessName: 'Test Co'
      }, { timeout: 10000, validateStatus: () => true });

      if (weakPasswordResponse.status === 400 && 
          weakPasswordResponse.data.error && 
          weakPasswordResponse.data.error.toLowerCase().includes('password')) {
        logTest('Weak Password Error', 'PASS', 'Proper validation error returned');
      } else {
        logTest('Weak Password Error', 'FAIL', `Status: ${weakPasswordResponse.status}, Response: ${JSON.stringify(weakPasswordResponse.data)}`);
      }
    } catch (error) {
      logTest('Weak Password Error', 'FAIL', `Network error: ${error.message}`);
    }

    // Test 3: Duplicate Email Registration
    console.log('3️⃣ Testing duplicate email registration...');
    try {
      const testEmail = 'duplicate-test-' + Date.now() + '@example.com';
      
      // First registration
      const firstRegResponse = await axios.post(`${PRODUCTION_URL}/api/auth/register`, {
        firstName: 'First',
        lastName: 'User',
        email: testEmail,
        password: 'ValidPassword123!',
        businessName: 'First Co'
      }, { timeout: 10000, validateStatus: () => true });

      if (firstRegResponse.status === 201) {
        // Second registration with same email
        const duplicateResponse = await axios.post(`${PRODUCTION_URL}/api/auth/register`, {
          firstName: 'Second',
          lastName: 'User',
          email: testEmail,
          password: 'ValidPassword123!',
          businessName: 'Second Co'
        }, { timeout: 10000, validateStatus: () => true });

        if (duplicateResponse.status === 409 && 
            duplicateResponse.data.error && 
            duplicateResponse.data.error.toLowerCase().includes('exists')) {
          logTest('Duplicate Email Error', 'PASS', 'Proper conflict error returned');
        } else {
          logTest('Duplicate Email Error', 'FAIL', `Status: ${duplicateResponse.status}, Response: ${JSON.stringify(duplicateResponse.data)}`);
        }
      } else {
        logTest('Duplicate Email Error', 'FAIL', 'Could not create first user for duplicate test');
      }
    } catch (error) {
      logTest('Duplicate Email Error', 'FAIL', `Network error: ${error.message}`);
    }

    // Test 4: Invalid Login Credentials
    console.log('4️⃣ Testing invalid login credentials...');
    try {
      const invalidLoginResponse = await axios.post(`${PRODUCTION_URL}/api/auth/login`, {
        email: 'nonexistent@example.com',
        password: 'WrongPassword123!'
      }, { timeout: 10000, validateStatus: () => true });

      if (invalidLoginResponse.status === 401 || invalidLoginResponse.status === 400) {
        logTest('Invalid Login Error', 'PASS', 'Proper authentication error returned');
      } else {
        logTest('Invalid Login Error', 'FAIL', `Status: ${invalidLoginResponse.status}, Response: ${JSON.stringify(invalidLoginResponse.data)}`);
      }
    } catch (error) {
      logTest('Invalid Login Error', 'FAIL', `Network error: ${error.message}`);
    }

    // Test 5: Missing Required Fields
    console.log('5️⃣ Testing missing required fields...');
    try {
      const missingFieldsResponse = await axios.post(`${PRODUCTION_URL}/api/auth/register`, {
        firstName: 'Test',
        // Missing lastName, email, password
        businessName: 'Test Co'
      }, { timeout: 10000, validateStatus: () => true });

      if (missingFieldsResponse.status === 400 && 
          missingFieldsResponse.data.error && 
          missingFieldsResponse.data.error.toLowerCase().includes('required')) {
        logTest('Missing Fields Error', 'PASS', 'Proper validation error returned');
      } else {
        logTest('Missing Fields Error', 'FAIL', `Status: ${missingFieldsResponse.status}, Response: ${JSON.stringify(missingFieldsResponse.data)}`);
      }
    } catch (error) {
      logTest('Missing Fields Error', 'FAIL', `Network error: ${error.message}`);
    }

    console.log('');
    console.log('📊 ERROR HANDLING TEST RESULTS');
    console.log('=' .repeat(60));
    console.log(`✅ Tests Passed: ${results.passed}`);
    console.log(`❌ Tests Failed: ${results.failed}`);
    console.log(`📊 Total Tests: ${results.total}`);
    console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    console.log(`⏰ Test Completed: ${new Date().toISOString()}`);
    console.log('');

    if (results.passed >= 4) {
      console.log('🎉 ERROR HANDLING SYSTEM: OPERATIONAL');
      console.log('✅ User-friendly error messages are working correctly!');
    } else {
      console.log('⚠️ ERROR HANDLING SYSTEM: NEEDS IMPROVEMENT');
      console.log('❌ Some error scenarios are not handled properly');
    }

  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
  }
}

// Run the test
testErrorHandlingSystem().catch(console.error);
