/**
 * Complete Authentication Flow Audit
 * Tests every possible authentication scenario and edge case
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
const TEST_USERS = {
  new: 'new-user-test@floworx-iq.com',
  existing: 'existing-user-test@floworx-iq.com',
  nonexistent: 'nonexistent-user@floworx-iq.com'
};

const TEST_PASSWORD = 'TestPassword123!';
const WEAK_PASSWORD = '123';
const INVALID_EMAIL = 'invalid-email';

class AuthFlowAuditor {
  constructor() {
    this.results = [];
    this.criticalIssues = [];
    this.warnings = [];
  }

  log(scenario, passed, details = '', critical = false) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${scenario}${details ? ' - ' + details : ''}`);
    
    this.results.push({ scenario, passed, details, critical });
    
    if (!passed) {
      if (critical) {
        this.criticalIssues.push({ scenario, details });
      } else {
        this.warnings.push({ scenario, details });
      }
    }
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async testNewUserRegistration() {
    console.log('\n🆕 NEW USER REGISTRATION SCENARIOS');
    console.log('=' .repeat(50));

    // Test 1: Valid new user registration
    try {
      const response = await axios.post(`${BASE_URL}/auth/register`, {
        email: TEST_USERS.new,
        password: TEST_PASSWORD,
        firstName: 'New',
        lastName: 'User',
        businessName: 'New User Business',
        agreeToTerms: true
      });
      
      const success = response.status === 201 && response.data.success && response.data.token;
      this.log('Valid New User Registration', success, 
        success ? 'User created with JWT token' : 'Registration failed', true);
      
      if (success) {
        console.log(`   Token: ${response.data.token.substring(0, 50)}...`);
        console.log(`   User ID: ${response.data.user?.id || 'Not provided'}`);
      }
    } catch (error) {
      this.log('Valid New User Registration', false, 
        error.response?.data?.message || error.message, true);
    }

    // Test 2: Duplicate email registration
    await this.delay(500);
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: TEST_USERS.new, // Same email as above
        password: TEST_PASSWORD,
        firstName: 'Duplicate',
        lastName: 'User',
        businessName: 'Duplicate Business',
        agreeToTerms: true
      });
      this.log('Duplicate Email Registration Prevention', false, 
        'Should have rejected duplicate email', true);
    } catch (error) {
      const success = error.response?.status === 400 || error.response?.status === 409;
      this.log('Duplicate Email Registration Prevention', success,
        success ? 'Correctly rejected duplicate email' : 'Unexpected error');
    }

    // Test 3: Invalid email format
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: INVALID_EMAIL,
        password: TEST_PASSWORD,
        firstName: 'Invalid',
        lastName: 'Email',
        businessName: 'Invalid Email Business',
        agreeToTerms: true
      });
      this.log('Invalid Email Format Validation', false, 
        'Should have rejected invalid email format');
    } catch (error) {
      const success = error.response?.status === 400;
      this.log('Invalid Email Format Validation', success,
        success ? 'Correctly rejected invalid email' : 'Unexpected error');
    }

    // Test 4: Weak password validation
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: 'weak-password@floworx-iq.com',
        password: WEAK_PASSWORD,
        firstName: 'Weak',
        lastName: 'Password',
        businessName: 'Weak Password Business',
        agreeToTerms: true
      });
      this.log('Weak Password Validation', false, 
        'Should have rejected weak password');
    } catch (error) {
      const success = error.response?.status === 400;
      this.log('Weak Password Validation', success,
        success ? 'Correctly rejected weak password' : 'Unexpected error');
    }

    // Test 5: Missing required fields
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: 'missing-fields@floworx-iq.com',
        password: TEST_PASSWORD
        // Missing firstName, lastName, businessName, agreeToTerms
      });
      this.log('Missing Required Fields Validation', false, 
        'Should have rejected missing fields');
    } catch (error) {
      const success = error.response?.status === 400;
      this.log('Missing Required Fields Validation', success,
        success ? 'Correctly rejected missing fields' : 'Unexpected error');
    }

    // Test 6: Terms agreement validation
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: 'no-terms@floworx-iq.com',
        password: TEST_PASSWORD,
        firstName: 'No',
        lastName: 'Terms',
        businessName: 'No Terms Business',
        agreeToTerms: false
      });
      this.log('Terms Agreement Validation', false, 
        'Should have rejected without terms agreement');
    } catch (error) {
      const success = error.response?.status === 400;
      this.log('Terms Agreement Validation', success,
        success ? 'Correctly required terms agreement' : 'Unexpected error');
    }
  }

  async testUserLogin() {
    console.log('\n🔐 USER LOGIN SCENARIOS');
    console.log('=' .repeat(50));

    // Test 1: Valid login for existing user
    await this.delay(1000);
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email: TEST_USERS.new,
        password: TEST_PASSWORD
      });
      
      const success = response.status === 200 && response.data.success && response.data.token;
      this.log('Valid User Login', success, 
        success ? 'Login successful with JWT token' : 'Login failed', true);
      
      if (success) {
        console.log(`   Token: ${response.data.token.substring(0, 50)}...`);
        console.log(`   User: ${response.data.user?.email || 'Not provided'}`);
      }
    } catch (error) {
      this.log('Valid User Login', false, 
        error.response?.data?.message || error.message, true);
    }

    // Test 2: Invalid password
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: TEST_USERS.new,
        password: 'WrongPassword123!'
      });
      this.log('Invalid Password Protection', false, 
        'Should have rejected invalid password', true);
    } catch (error) {
      const success = error.response?.status === 401 || error.response?.status === 400;
      this.log('Invalid Password Protection', success,
        success ? 'Correctly rejected invalid password' : 'Unexpected error');
    }

    // Test 3: Non-existent user login
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: TEST_USERS.nonexistent,
        password: TEST_PASSWORD
      });
      this.log('Non-existent User Login Protection', false, 
        'Should have rejected non-existent user', true);
    } catch (error) {
      const success = error.response?.status === 401 || error.response?.status === 400;
      this.log('Non-existent User Login Protection', success,
        success ? 'Correctly rejected non-existent user' : 'Unexpected error');
    }

    // Test 4: Empty credentials
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: '',
        password: ''
      });
      this.log('Empty Credentials Validation', false, 
        'Should have rejected empty credentials');
    } catch (error) {
      const success = error.response?.status === 400;
      this.log('Empty Credentials Validation', success,
        success ? 'Correctly rejected empty credentials' : 'Unexpected error');
    }

    // Test 5: Invalid email format in login
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: INVALID_EMAIL,
        password: TEST_PASSWORD
      });
      this.log('Invalid Email Format in Login', false, 
        'Should have rejected invalid email format');
    } catch (error) {
      const success = error.response?.status === 400 || error.response?.status === 401;
      this.log('Invalid Email Format in Login', success,
        success ? 'Correctly handled invalid email format' : 'Unexpected error');
    }
  }

  async testPasswordReset() {
    console.log('\n🔄 PASSWORD RESET SCENARIOS');
    console.log('=' .repeat(50));

    // Test 1: Valid password reset request
    try {
      const response = await axios.post(`${BASE_URL}/password-reset/request`, {
        email: TEST_USERS.new
      });
      
      const success = response.status === 200 && response.data.success;
      this.log('Valid Password Reset Request', success, 
        success ? 'Reset email sent successfully' : 'Reset request failed', true);
    } catch (error) {
      this.log('Valid Password Reset Request', false, 
        error.response?.data?.message || error.message, true);
    }

    // Test 2: Non-existent user password reset (should still return success for security)
    try {
      const response = await axios.post(`${BASE_URL}/password-reset/request`, {
        email: TEST_USERS.nonexistent
      });
      
      const success = response.status === 200 && response.data.success;
      this.log('Non-existent User Password Reset (Security)', success, 
        success ? 'Correctly handled non-existent email' : 'Security issue detected');
    } catch (error) {
      this.log('Non-existent User Password Reset (Security)', false, 
        error.response?.data?.message || error.message);
    }

    // Test 3: Invalid email format in password reset
    try {
      await axios.post(`${BASE_URL}/password-reset/request`, {
        email: INVALID_EMAIL
      });
      this.log('Invalid Email Format in Password Reset', false, 
        'Should have rejected invalid email format');
    } catch (error) {
      const success = error.response?.status === 400;
      this.log('Invalid Email Format in Password Reset', success,
        success ? 'Correctly rejected invalid email format' : 'Unexpected error');
    }

    // Test 4: Empty email in password reset
    try {
      await axios.post(`${BASE_URL}/password-reset/request`, {
        email: ''
      });
      this.log('Empty Email in Password Reset', false, 
        'Should have rejected empty email');
    } catch (error) {
      const success = error.response?.status === 400;
      this.log('Empty Email in Password Reset', success,
        success ? 'Correctly rejected empty email' : 'Unexpected error');
    }
  }

  async runCompleteAudit() {
    console.log('🔍 COMPLETE AUTHENTICATION FLOW AUDIT');
    console.log('=' .repeat(60));
    console.log('Testing every authentication scenario and edge case...\n');

    await this.testNewUserRegistration();
    await this.testUserLogin();
    await this.testPasswordReset();

    // Final Summary
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const successRate = Math.round((passed / total) * 100);

    console.log('\n' + '=' .repeat(60));
    console.log('📊 COMPLETE AUDIT SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${total - passed}`);
    console.log(`📊 Total Tests: ${total}`);
    console.log(`🎯 Success Rate: ${successRate}%`);

    if (this.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES (Must Fix):');
      this.criticalIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue.scenario}: ${issue.details}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS (Should Fix):');
      this.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning.scenario}: ${warning.details}`);
      });
    }

    console.log('\n🎯 AUTHENTICATION SYSTEM STATUS:');
    if (this.criticalIssues.length === 0 && successRate >= 90) {
      console.log('🎉 EXCELLENT - Authentication system is production-ready!');
      console.log('   • All critical flows working');
      console.log('   • Security measures implemented');
      console.log('   • Edge cases handled properly');
      console.log('   • Ready to move to next module');
    } else if (this.criticalIssues.length === 0 && successRate >= 80) {
      console.log('✅ GOOD - Minor improvements recommended');
    } else {
      console.log('🔧 NEEDS ATTENTION - Critical issues must be resolved');
    }

    console.log('\n🏁 Complete Authentication Audit Finished!');
    return this.criticalIssues.length === 0 && successRate >= 80;
  }
}

// Run the complete audit
const auditor = new AuthFlowAuditor();
auditor.runCompleteAudit()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Audit crashed:', error);
    process.exit(1);
  });
