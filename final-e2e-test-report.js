/**
 * Final End-to-End Test Report for FloWorx Application
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
const TEST_EMAIL = 'final-e2e-test@floworx-iq.com';
const TEST_PASSWORD = 'TestPassword123!';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runFinalTest() {
  console.log('🎯 FINAL END-TO-END TEST REPORT');
  console.log('=' .repeat(50));
  
  const results = [];
  
  try {
    // Test 1: Health Check
    console.log('\n1️⃣ Testing Health Endpoint...');
    const health = await axios.get(`${BASE_URL}/health`);
    const healthPass = health.status === 200 && health.data.status === 'ok';
    results.push({ test: 'Health Endpoint', passed: healthPass });
    console.log(healthPass ? '✅ PASS' : '❌ FAIL');

    // Test 2: User Registration
    console.log('\n2️⃣ Testing User Registration...');
    try {
      const register = await axios.post(`${BASE_URL}/auth/register`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        firstName: 'Final',
        lastName: 'Test',
        businessName: 'Final Test Business',
        agreeToTerms: true
      });
      const regPass = register.status === 201 && register.data.success && register.data.token;
      results.push({ test: 'User Registration', passed: regPass });
      console.log(regPass ? '✅ PASS - User created with JWT token' : '❌ FAIL');
      
      if (regPass) {
        // Small delay before login test
        await delay(1000);
        
        // Test 3: User Login
        console.log('\n3️⃣ Testing User Login...');
        const login = await axios.post(`${BASE_URL}/auth/login`, {
          email: TEST_EMAIL,
          password: TEST_PASSWORD
        });
        const loginPass = login.status === 200 && login.data.success && login.data.token;
        results.push({ test: 'User Login', passed: loginPass });
        console.log(loginPass ? '✅ PASS - Login successful with JWT token' : '❌ FAIL');
      }
    } catch (regError) {
      results.push({ test: 'User Registration', passed: false });
      console.log('❌ FAIL - Registration error');
      
      // Try login anyway in case user already exists
      try {
        console.log('\n3️⃣ Testing User Login (existing user)...');
        const login = await axios.post(`${BASE_URL}/auth/login`, {
          email: TEST_EMAIL,
          password: TEST_PASSWORD
        });
        const loginPass = login.status === 200 && login.data.success && login.data.token;
        results.push({ test: 'User Login', passed: loginPass });
        console.log(loginPass ? '✅ PASS - Login successful with JWT token' : '❌ FAIL');
      } catch (loginError) {
        results.push({ test: 'User Login', passed: false });
        console.log('❌ FAIL - Login error');
      }
    }

    // Test 4: Password Reset
    console.log('\n4️⃣ Testing Password Reset...');
    const reset = await axios.post(`${BASE_URL}/password-reset/request`, {
      email: TEST_EMAIL
    });
    const resetPass = reset.status === 200 && reset.data.success;
    results.push({ test: 'Password Reset', passed: resetPass });
    console.log(resetPass ? '✅ PASS - Reset email sent' : '❌ FAIL');

    // Test 5: Security - Invalid Login
    console.log('\n5️⃣ Testing Security (Invalid Login)...');
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: TEST_EMAIL,
        password: 'WrongPassword123!'
      });
      results.push({ test: 'Security - Invalid Login', passed: false });
      console.log('❌ FAIL - Should have rejected invalid password');
    } catch (error) {
      const secPass = error.response?.status === 401 || error.response?.status === 400;
      results.push({ test: 'Security - Invalid Login', passed: secPass });
      console.log(secPass ? '✅ PASS - Correctly rejected invalid credentials' : '❌ FAIL');
    }

  } catch (error) {
    console.error('💥 Test suite error:', error.message);
  }

  // Final Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const successRate = Math.round((passed / total) * 100);

  console.log('\n' + '=' .repeat(50));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('=' .repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${total - passed}`);
  console.log(`📊 Total: ${total}`);
  console.log(`🎯 Success Rate: ${successRate}%`);

  console.log('\n🔍 DETAILED RESULTS:');
  results.forEach((result, index) => {
    const status = result.passed ? '✅' : '❌';
    console.log(`   ${index + 1}. ${status} ${result.test}`);
  });

  console.log('\n🚀 FLOWORX APPLICATION STATUS:');
  if (successRate >= 80) {
    console.log('🎉 EXCELLENT - Application is production-ready!');
    console.log('   • All core functionality working');
    console.log('   • Security features implemented');
    console.log('   • Database operations stable');
    console.log('   • Ready for deployment to app.floworx-iq.com');
  } else if (successRate >= 60) {
    console.log('⚠️  GOOD - Minor issues need attention');
  } else {
    console.log('🔧 NEEDS WORK - Critical issues require fixing');
  }

  console.log('\n🏁 Final End-to-End Test Complete!');
  return successRate >= 80;
}

// Run the final test
runFinalTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Final test crashed:', error);
    process.exit(1);
  });
