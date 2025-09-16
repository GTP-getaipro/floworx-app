/**
 * Final Complete Authentication Audit
 * Covers ALL authentication scenarios including edge cases and user messages
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
const timestamp = Date.now();

class FinalAuthAuditor {
  constructor() {
    this.results = [];
    this.scenarios = [];
  }

  log(scenario, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${scenario}${details ? ' - ' + details : ''}`);
    this.results.push({ scenario, passed, details });
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runCompleteAudit() {
    console.log('🔍 FINAL COMPLETE AUTHENTICATION AUDIT');
    console.log('=' .repeat(70));
    console.log('Testing EVERY authentication scenario and user message...\n');

    // === NEW USER REGISTRATION SCENARIOS ===
    console.log('🆕 NEW USER REGISTRATION SCENARIOS');
    console.log('-' .repeat(50));

    // 1. Valid new user registration
    const newUserEmail = `final-new-${timestamp}@floworx-iq.com`;
    try {
      const response = await axios.post(`${BASE_URL}/auth/register`, {
        email: newUserEmail,
        password: 'TestPassword123!',
        firstName: 'Final',
        lastName: 'Test',
        businessName: 'Final Test Business',
        agreeToTerms: true
      });
      
      const success = response.status === 201 && response.data.success && response.data.token;
      this.log('Valid New User Registration', success, 
        success ? 'User created with JWT token' : 'Registration failed');
    } catch (error) {
      this.log('Valid New User Registration', false, error.response?.data?.message || error.message);
    }

    await this.delay(500);

    // 2. Duplicate email registration with proper message
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: newUserEmail, // Same email
        password: 'TestPassword123!',
        firstName: 'Duplicate',
        lastName: 'User',
        businessName: 'Duplicate Business',
        agreeToTerms: true
      });
      this.log('Duplicate Email Message', false, 'Should show "email already registered" message');
    } catch (error) {
      const hasProperMessage = error.response?.data?.error?.includes('already exists') || 
                              error.response?.data?.error?.includes('already registered');
      this.log('Duplicate Email Message', hasProperMessage,
        hasProperMessage ? 'Shows proper "already registered" message' : 'Message unclear');
    }

    // 3. Terms agreement validation with proper message
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: `terms-${timestamp}@floworx-iq.com`,
        password: 'TestPassword123!',
        firstName: 'Terms',
        lastName: 'Test',
        businessName: 'Terms Business',
        agreeToTerms: false
      });
      this.log('Terms Agreement Message', false, 'Should require terms agreement');
    } catch (error) {
      const hasTermsMessage = error.response?.data?.details?.some(d => 
        d.field === 'agreeToTerms' && d.message.includes('terms'));
      this.log('Terms Agreement Message', hasTermsMessage,
        hasTermsMessage ? 'Shows proper terms agreement message' : 'Terms message unclear');
    }

    // 4. Weak password validation
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: `weak-${timestamp}@floworx-iq.com`,
        password: '123',
        firstName: 'Weak',
        lastName: 'Password',
        businessName: 'Weak Business',
        agreeToTerms: true
      });
      this.log('Weak Password Message', false, 'Should reject weak password');
    } catch (error) {
      const hasPasswordMessage = error.response?.data?.details?.some(d => 
        d.field === 'password' && (d.message.includes('8') || d.message.includes('strong')));
      this.log('Weak Password Message', hasPasswordMessage,
        hasPasswordMessage ? 'Shows proper password requirements' : 'Password message unclear');
    }

    // === USER LOGIN SCENARIOS ===
    console.log('\n🔐 USER LOGIN SCENARIOS');
    console.log('-' .repeat(50));

    await this.delay(1000);

    // 5. Valid user login
    try {
      const response = await axios.post(`${BASE_URL}/auth/login`, {
        email: newUserEmail,
        password: 'TestPassword123!'
      });
      
      const success = response.status === 200 && response.data.success && 
                     (response.data.token || response.data.data?.token);
      this.log('Valid User Login', success, 
        success ? 'Login successful with JWT token' : 'Login failed');
    } catch (error) {
      this.log('Valid User Login', false, error.response?.data?.message || error.message);
    }

    // 6. Invalid password with proper message
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: newUserEmail,
        password: 'WrongPassword123!'
      });
      this.log('Invalid Password Message', false, 'Should reject invalid password');
    } catch (error) {
      const hasInvalidMessage = error.response?.data?.error?.includes('Invalid') ||
                               error.response?.data?.error?.includes('credentials') ||
                               error.response?.data?.message?.includes('Invalid');
      this.log('Invalid Password Message', hasInvalidMessage,
        hasInvalidMessage ? 'Shows proper invalid credentials message' : 'Login error message unclear');
    }

    // 7. Non-existent user with proper message
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: `nonexistent-${timestamp}@floworx-iq.com`,
        password: 'TestPassword123!'
      });
      this.log('Non-existent User Message', false, 'Should reject non-existent user');
    } catch (error) {
      const hasUserMessage = error.response?.data?.error?.includes('Invalid') ||
                             error.response?.data?.error?.includes('credentials') ||
                             error.response?.data?.message?.includes('Invalid');
      this.log('Non-existent User Message (Security)', hasUserMessage,
        hasUserMessage ? 'Correctly shows generic "Invalid credentials" (security)' : 'User error message unclear');
    }

    // === PASSWORD RECOVERY SCENARIOS ===
    console.log('\n🔄 PASSWORD RECOVERY SCENARIOS');
    console.log('-' .repeat(50));

    // 8. Valid password reset request
    try {
      const response = await axios.post(`${BASE_URL}/password-reset/request`, {
        email: newUserEmail
      });
      
      const success = response.status === 200 && response.data.success;
      this.log('Valid Password Reset', success, 
        success ? 'Reset email sent successfully' : 'Reset request failed');
    } catch (error) {
      this.log('Valid Password Reset', false, error.response?.data?.message || error.message);
    }

    // 9. Non-existent user password reset (security - should still show success)
    try {
      const response = await axios.post(`${BASE_URL}/password-reset/request`, {
        email: `nonexistent-reset-${timestamp}@floworx-iq.com`
      });
      
      const success = response.status === 200 && response.data.success;
      this.log('Password Reset Security (Non-existent User)', success, 
        success ? 'Correctly handles non-existent email (security)' : 'Security issue detected');
    } catch (error) {
      this.log('Password Reset Security (Non-existent User)', false, 
        'Should return success for security reasons');
    }

    // === EMAIL VERIFICATION SCENARIOS ===
    console.log('\n📧 EMAIL VERIFICATION SCENARIOS');
    console.log('-' .repeat(50));

    // 10. Check if email verification is implemented
    try {
      const response = await axios.get(`${BASE_URL}/auth/verify-email/test-token`);
      this.log('Email Verification Endpoint', response.status !== 404, 
        response.status !== 404 ? 'Email verification endpoint exists' : 'Email verification not implemented');
    } catch (error) {
      const implemented = error.response?.status !== 404;
      this.log('Email Verification Endpoint', implemented,
        implemented ? 'Email verification endpoint exists' : 'Email verification not implemented');
    }

    // === SECURITY & VALIDATION SCENARIOS ===
    console.log('\n🛡️ SECURITY & VALIDATION SCENARIOS');
    console.log('-' .repeat(50));

    // 11. Invalid email format validation
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: 'invalid-email-format',
        password: 'TestPassword123!',
        firstName: 'Invalid',
        lastName: 'Email',
        businessName: 'Invalid Business',
        agreeToTerms: true
      });
      this.log('Invalid Email Format Validation', false, 'Should reject invalid email format');
    } catch (error) {
      const hasEmailMessage = error.response?.data?.details?.some(d => 
        d.field === 'email' && d.message.includes('valid'));
      this.log('Invalid Email Format Validation', hasEmailMessage,
        hasEmailMessage ? 'Shows proper email format message' : 'Email validation message unclear');
    }

    // 12. Missing required fields validation
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        email: `missing-${timestamp}@floworx-iq.com`,
        password: 'TestPassword123!'
        // Missing firstName, lastName, businessName, agreeToTerms
      });
      this.log('Missing Fields Validation', false, 'Should reject missing required fields');
    } catch (error) {
      const hasMissingMessage = error.response?.data?.details?.length > 0 ||
                               error.response?.data?.error?.includes('required');
      this.log('Missing Fields Validation', hasMissingMessage,
        hasMissingMessage ? 'Shows proper missing fields message' : 'Missing fields message unclear');
    }

    // Final Summary
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const successRate = Math.round((passed / total) * 100);

    console.log('\n' + '=' .repeat(70));
    console.log('📊 FINAL COMPLETE AUDIT SUMMARY');
    console.log('=' .repeat(70));
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${total - passed}`);
    console.log(`📊 Total Tests: ${total}`);
    console.log(`🎯 Success Rate: ${successRate}%`);

    const failedTests = this.results.filter(r => !r.passed);
    if (failedTests.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      failedTests.forEach((test, index) => {
        console.log(`   ${index + 1}. ${test.scenario}: ${test.details}`);
      });
    }

    console.log('\n🎯 AUTHENTICATION SYSTEM FINAL STATUS:');
    if (successRate >= 95) {
      console.log('🎉 PERFECT - Authentication system is fully production-ready!');
      console.log('   • All critical flows working flawlessly');
      console.log('   • All user messages clear and helpful');
      console.log('   • Security measures properly implemented');
      console.log('   • Ready to move to next module immediately');
    } else if (successRate >= 90) {
      console.log('🌟 EXCELLENT - Authentication system is production-ready!');
      console.log('   • Core functionality working perfectly');
      console.log('   • Minor improvements recommended');
      console.log('   • Ready to move to next module');
    } else if (successRate >= 80) {
      console.log('✅ GOOD - Authentication system is functional');
      console.log('   • Core functionality working');
      console.log('   • Some improvements needed');
    } else {
      console.log('🔧 NEEDS WORK - Critical issues require attention');
    }

    console.log('\n🏁 Final Complete Authentication Audit Finished!');
    return successRate >= 90;
  }
}

// Run the final complete audit
const auditor = new FinalAuthAuditor();
auditor.runCompleteAudit()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Final audit crashed:', error);
    process.exit(1);
  });
