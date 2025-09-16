/**
 * Robust Authentication Test with Cleanup and Unique Users
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
const timestamp = Date.now();
const TEST_USERS = {
  new: `robust-new-${timestamp}@floworx-iq.com`,
  existing: `robust-existing-${timestamp}@floworx-iq.com`,
  nonexistent: `robust-nonexistent-${timestamp}@floworx-iq.com`
};

const TEST_PASSWORD = 'TestPassword123!';

class RobustAuthTester {
  constructor() {
    this.results = [];
    this.criticalIssues = [];
  }

  log(scenario, passed, details = '', critical = false) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${scenario}${details ? ' - ' + details : ''}`);
    
    this.results.push({ scenario, passed, details, critical });
    
    if (!passed && critical) {
      this.criticalIssues.push({ scenario, details });
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testCriticalFlow() {
    console.log('🎯 ROBUST AUTHENTICATION CRITICAL FLOW TEST');
    console.log('=' .repeat(60));
    console.log(`Using unique test email: ${TEST_USERS.new}\n`);

    // Test 1: New User Registration
    console.log('1️⃣ Testing New User Registration...');
    let registrationSuccess = false;
    let userToken = null;
    
    try {
      const response = await axios.post(`${BASE_URL}/auth/register`, {
        email: TEST_USERS.new,
        password: TEST_PASSWORD,
        firstName: 'Robust',
        lastName: 'Test',
        businessName: 'Robust Test Business',
        agreeToTerms: true
      });
      
      registrationSuccess = response.status === 201 && response.data.success && response.data.token;
      if (registrationSuccess) {
        userToken = response.data.token;
      }
      
      this.log('New User Registration', registrationSuccess, 
        registrationSuccess ? 'User created with JWT token' : 'Registration failed', true);
      
      if (registrationSuccess) {
        console.log(`   ✓ User ID: ${response.data.user?.id}`);
        console.log(`   ✓ Token: ${userToken.substring(0, 50)}...`);
      }
    } catch (error) {
      this.log('New User Registration', false, 
        error.response?.data?.message || error.message, true);
    }

    // Test 2: User Login (only if registration succeeded)
    if (registrationSuccess) {
      console.log('\n2️⃣ Testing User Login...');
      await this.delay(2000); // Wait 2 seconds for database consistency
      
      try {
        const response = await axios.post(`${BASE_URL}/auth/login`, {
          email: TEST_USERS.new,
          password: TEST_PASSWORD
        });
        
        console.log('   🔍 Login Response Debug:');
        console.log(`      Status: ${response.status}`);
        console.log(`      Success: ${response.data.success}`);
        console.log(`      Has Token: ${!!response.data.token}`);
        console.log(`      Data Keys: ${Object.keys(response.data)}`);

        const loginSuccess = response.status === 200 && response.data.success &&
                         (response.data.token || response.data.data?.token);
        this.log('User Login', loginSuccess,
          loginSuccess ? 'Login successful with JWT token' : 'Login failed', true);

        if (loginSuccess) {
          const token = response.data.token || response.data.data?.token;
          const user = response.data.user || response.data.data?.user;
          console.log(`   ✓ Login Token: ${token.substring(0, 50)}...`);
          console.log(`   ✓ User Email: ${user?.email}`);
        }
      } catch (error) {
        console.log('   ❌ Login Error Details:');
        console.log(`      Status: ${error.response?.status}`);
        console.log(`      Data: ${JSON.stringify(error.response?.data, null, 2)}`);
        console.log(`      Message: ${error.message}`);
        this.log('User Login', false,
          error.response?.data?.message || error.message, true);
      }
    } else {
      this.log('User Login', false, 'Skipped due to registration failure', true);
    }

    // Test 3: Password Reset
    console.log('\n3️⃣ Testing Password Reset...');
    try {
      const response = await axios.post(`${BASE_URL}/password-reset/request`, {
        email: TEST_USERS.new
      });
      
      const resetSuccess = response.status === 200 && response.data.success;
      this.log('Password Reset Request', resetSuccess, 
        resetSuccess ? 'Reset email sent successfully' : 'Reset request failed', true);
    } catch (error) {
      this.log('Password Reset Request', false, 
        error.response?.data?.message || error.message, true);
    }

    // Test 4: Terms Agreement Validation
    console.log('\n4️⃣ Testing Terms Agreement Validation...');
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: `terms-test-${timestamp}@floworx-iq.com`,
        password: TEST_PASSWORD,
        firstName: 'Terms',
        lastName: 'Test',
        businessName: 'Terms Test Business',
        agreeToTerms: false
      });
      this.log('Terms Agreement Validation', false, 
        'Should have rejected without terms agreement');
    } catch (error) {
      const success = error.response?.status === 400 && 
                     error.response?.data?.details?.some(d => d.field === 'agreeToTerms');
      this.log('Terms Agreement Validation', success,
        success ? 'Correctly required terms agreement' : 'Unexpected error');
    }

    // Test 5: Duplicate Registration Prevention
    if (registrationSuccess) {
      console.log('\n5️⃣ Testing Duplicate Registration Prevention...');
      try {
        await axios.post(`${BASE_URL}/auth/register`, {
          email: TEST_USERS.new, // Same email as successful registration
          password: TEST_PASSWORD,
          firstName: 'Duplicate',
          lastName: 'Test',
          businessName: 'Duplicate Test Business',
          agreeToTerms: true
        });
        this.log('Duplicate Registration Prevention', false, 
          'Should have rejected duplicate email');
      } catch (error) {
        const success = error.response?.status === 409;
        this.log('Duplicate Registration Prevention', success,
          success ? 'Correctly rejected duplicate email' : 'Unexpected error');
      }
    }

    // Test 6: Invalid Login Protection
    console.log('\n6️⃣ Testing Invalid Login Protection...');
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: TEST_USERS.new,
        password: 'WrongPassword123!'
      });
      this.log('Invalid Login Protection', false, 
        'Should have rejected invalid password');
    } catch (error) {
      const success = error.response?.status === 401 || error.response?.status === 400;
      this.log('Invalid Login Protection', success,
        success ? 'Correctly rejected invalid password' : 'Unexpected error');
    }

    // Final Summary
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const successRate = Math.round((passed / total) * 100);

    console.log('\n' + '=' .repeat(60));
    console.log('📊 ROBUST TEST SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${total - passed}`);
    console.log(`📊 Total Tests: ${total}`);
    console.log(`🎯 Success Rate: ${successRate}%`);

    if (this.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      this.criticalIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.scenario}: ${issue.details}`);
      });
    }

    console.log('\n🎯 AUTHENTICATION SYSTEM STATUS:');
    if (this.criticalIssues.length === 0 && successRate >= 90) {
      console.log('🎉 EXCELLENT - Authentication system is production-ready!');
      console.log('   • All critical flows working perfectly');
      console.log('   • Security measures properly implemented');
      console.log('   • Ready to move to next module');
    } else if (this.criticalIssues.length === 0 && successRate >= 80) {
      console.log('✅ GOOD - Authentication system is functional');
      console.log('   • Core functionality working');
      console.log('   • Minor improvements recommended');
    } else {
      console.log('🔧 NEEDS ATTENTION - Critical issues require fixing');
    }

    console.log('\n🏁 Robust Authentication Test Complete!');
    return this.criticalIssues.length === 0 && successRate >= 80;
  }
}

// Run the robust test
const tester = new RobustAuthTester();
tester.testCriticalFlow()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Robust test crashed:', error);
    process.exit(1);
  });
