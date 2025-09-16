/**
 * Test Real Email Verification Flow
 * Uses actual verification tokens and database operations
 */

require('dotenv').config();
const axios = require('axios');

class RealEmailVerificationTest {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com/api';
    this.testUser = {
      firstName: 'Real',
      lastName: 'Verification',
      email: `real-verify-${Date.now()}@example.com`,
      password: 'RealVerify123!',
      businessName: 'Real Verification Test Co'
    };
    this.userId = null;
    this.userToken = null;
    this.verificationToken = null;
  }

  /**
   * Step 1: Register user and get verification token
   */
  async registerAndGetVerificationToken() {
    console.log('👤 STEP 1: REGISTER USER AND GET VERIFICATION TOKEN');
    console.log('=' .repeat(55));
    console.log(`📧 Email: ${this.testUser.email}`);
    console.log('');

    try {
      // Register user
      const registerResponse = await axios.post(`${this.baseURL}/auth/register`, this.testUser, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
        validateStatus: () => true
      });

      if (registerResponse.status !== 201) {
        console.log('❌ Registration failed');
        return false;
      }

      console.log('✅ User registered successfully');
      this.userId = registerResponse.data.user?.id;
      this.userToken = registerResponse.data.token;
      console.log(`👤 User ID: ${this.userId}`);
      console.log('');

      // Generate verification link using the API endpoint
      const verificationResponse = await axios.get(
        `${this.baseURL}/auth/generate-verification-link/${encodeURIComponent(this.testUser.email)}`,
        { timeout: 10000, validateStatus: () => true }
      );

      if (verificationResponse.status === 200) {
        console.log('✅ Verification token generated');
        this.verificationToken = verificationResponse.data.token;
        console.log(`🔗 Token: ${this.verificationToken.substring(0, 20)}...`);
        console.log(`🔗 Link: ${verificationResponse.data.verificationLink}`);
        return true;
      } else {
        console.log('❌ Failed to generate verification token');
        console.log('Response:', verificationResponse.data);
        return false;
      }
    } catch (error) {
      console.log('❌ Error:', error.message);
      return false;
    }
  }

  /**
   * Step 2: Test POST email verification
   */
  async testPostEmailVerification() {
    console.log('\n✅ STEP 2: TEST POST EMAIL VERIFICATION');
    console.log('=' .repeat(45));
    
    if (!this.verificationToken) {
      console.log('❌ No verification token available');
      return false;
    }

    try {
      const response = await axios.post(`${this.baseURL}/auth/verify-email`, {
        token: this.verificationToken
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
        validateStatus: () => true
      });

      console.log(`📥 Verification Response: ${response.status}`);

      if (response.status === 200) {
        console.log('✅ Email verification successful!');
        console.log(`👤 User verified: ${response.data.user?.emailVerified}`);
        console.log(`🔐 New token provided: ${response.data.token ? 'Yes' : 'No'}`);
        
        if (response.data.token) {
          this.userToken = response.data.token;
        }
        
        return true;
      } else {
        console.log('❌ Email verification failed');
        console.log('Response:', JSON.stringify(response.data, null, 2));
        return false;
      }
    } catch (error) {
      console.log('❌ Verification error:', error.message);
      return false;
    }
  }

  /**
   * Step 3: Test login with verified account
   */
  async testLoginWithVerifiedAccount() {
    console.log('\n🔐 STEP 3: TEST LOGIN WITH VERIFIED ACCOUNT');
    console.log('=' .repeat(50));

    try {
      const loginResponse = await axios.post(`${this.baseURL}/auth/login`, {
        email: this.testUser.email,
        password: this.testUser.password
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
        validateStatus: () => true
      });

      console.log(`📥 Login Response: ${loginResponse.status}`);

      if (loginResponse.status === 200) {
        console.log('✅ Login successful with verified account!');
        console.log(`🔐 Token received: ${loginResponse.data.token ? 'Yes' : 'No'}`);
        console.log(`👤 User data: ${loginResponse.data.user ? 'Yes' : 'No'}`);
        console.log(`📧 Email verified: ${loginResponse.data.user?.emailVerified}`);
        
        if (loginResponse.data.token) {
          this.userToken = loginResponse.data.token;
        }
        
        return true;
      } else {
        console.log('❌ Login failed');
        console.log('Response:', JSON.stringify(loginResponse.data, null, 2));
        return false;
      }
    } catch (error) {
      console.log('❌ Login error:', error.message);
      return false;
    }
  }

  /**
   * Step 4: Test dashboard access
   */
  async testDashboardAccess() {
    console.log('\n🏠 STEP 4: TEST DASHBOARD ACCESS');
    console.log('=' .repeat(35));

    if (!this.userToken) {
      console.log('❌ No user token available');
      return false;
    }

    try {
      const dashboardResponse = await axios.get(`${this.baseURL}/dashboard`, {
        headers: {
          'Authorization': `Bearer ${this.userToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000,
        validateStatus: () => true
      });

      console.log(`📥 Dashboard Response: ${dashboardResponse.status}`);

      if (dashboardResponse.status === 200) {
        console.log('✅ Dashboard access successful!');
        console.log(`👤 User data: ${dashboardResponse.data.data?.user ? 'Yes' : 'No'}`);
        console.log(`⚙️  Configuration: ${dashboardResponse.data.data?.configuration ? 'Yes' : 'No'}`);
        console.log(`🔄 Workflow: ${dashboardResponse.data.data?.workflow ? 'Yes' : 'No'}`);
        return true;
      } else {
        console.log('❌ Dashboard access failed');
        console.log('Response:', JSON.stringify(dashboardResponse.data, null, 2));
        return false;
      }
    } catch (error) {
      console.log('❌ Dashboard error:', error.message);
      return false;
    }
  }

  /**
   * Step 5: Check verification status
   */
  async checkVerificationStatus() {
    console.log('\n🔍 STEP 5: CHECK VERIFICATION STATUS');
    console.log('=' .repeat(40));

    try {
      const statusResponse = await axios.get(
        `${this.baseURL}/auth/check-verification-status/${encodeURIComponent(this.testUser.email)}`,
        { timeout: 10000, validateStatus: () => true }
      );

      console.log(`📥 Status Response: ${statusResponse.status}`);

      if (statusResponse.status === 200) {
        console.log('✅ Status check successful!');
        console.log(`📧 Email verified: ${statusResponse.data.user?.emailVerified}`);
        console.log(`🔐 Can login: ${statusResponse.data.canLogin}`);
        console.log(`📝 Status: ${statusResponse.data.status}`);
        return statusResponse.data.user?.emailVerified === true;
      } else {
        console.log('❌ Status check failed');
        return false;
      }
    } catch (error) {
      console.log('❌ Status check error:', error.message);
      return false;
    }
  }

  /**
   * Generate comprehensive report
   */
  generateReport(results) {
    console.log('\n📊 REAL EMAIL VERIFICATION TEST REPORT');
    console.log('=' .repeat(50));
    console.log('');

    const tests = [
      { name: 'User Registration & Token Generation', result: results.registration },
      { name: 'POST Email Verification', result: results.verification },
      { name: 'Login with Verified Account', result: results.login },
      { name: 'Dashboard Access', result: results.dashboard },
      { name: 'Verification Status Check', result: results.status }
    ];

    tests.forEach(test => {
      const status = test.result ? '✅ PASS' : '❌ FAIL';
      console.log(`${test.name}: ${status}`);
    });

    const passCount = tests.filter(t => t.result).length;
    const totalCount = tests.length;

    console.log(`\n🎯 Overall: ${passCount}/${totalCount} tests passed`);

    if (passCount === totalCount) {
      console.log('\n🎉 EMAIL VERIFICATION FLOW FULLY WORKING!');
      console.log('✅ Complete registration to verification workflow');
      console.log('✅ POST email verification endpoint working');
      console.log('✅ Verified users can login successfully');
      console.log('✅ Dashboard accessible after verification');
      console.log('✅ Verification status tracking working');
      console.log('');
      console.log('🚀 Your FloWorx email verification system is production ready!');
    } else {
      console.log('\n⚠️  Issues found in email verification flow:');
      tests.filter(t => !t.result).forEach(test => {
        console.log(`   - ${test.name}`);
      });
    }

    console.log('\n📧 TEST USER DETAILS:');
    console.log(`Email: ${this.testUser.email}`);
    console.log(`User ID: ${this.userId}`);
    console.log(`Verification Token: ${this.verificationToken ? this.verificationToken.substring(0, 20) + '...' : 'None'}`);

    return passCount === totalCount;
  }

  /**
   * Run complete test
   */
  async runCompleteTest() {
    console.log('🔍 REAL EMAIL VERIFICATION FLOW TEST');
    console.log('=' .repeat(45));
    console.log(`Started at: ${new Date().toLocaleString()}\n`);

    const results = {};

    // Step 1: Register and get verification token
    results.registration = await this.registerAndGetVerificationToken();
    if (!results.registration) {
      console.log('\n❌ Registration failed. Cannot continue test.');
      return false;
    }

    // Step 2: Test POST email verification
    results.verification = await this.testPostEmailVerification();

    // Step 3: Test login with verified account
    results.login = await this.testLoginWithVerifiedAccount();

    // Step 4: Test dashboard access
    results.dashboard = await this.testDashboardAccess();

    // Step 5: Check verification status
    results.status = await this.checkVerificationStatus();

    // Generate report
    const allPassed = this.generateReport(results);

    return allPassed;
  }
}

// Run test if called directly
if (require.main === module) {
  const tester = new RealEmailVerificationTest();
  tester.runCompleteTest().catch(console.error);
}

module.exports = RealEmailVerificationTest;
