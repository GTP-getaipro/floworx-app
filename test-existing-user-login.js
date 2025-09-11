#!/usr/bin/env node

/**
 * TEST EXISTING USER LOGIN
 * ========================
 * Tests login for dizelll2007@gmail.com which already exists
 * Provides password reset option if needed
 */

const axios = require('axios');
const { chromium } = require('playwright');
const readline = require('readline');

class ExistingUserLoginTest {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.apiUrl = `${baseUrl}/api`;
    this.testEmail = 'dizelll2007@gmail.com';
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async waitForUserInput(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async testLoginWithDifferentPasswords() {
    console.log('🔑 TESTING LOGIN WITH DIFFERENT PASSWORDS');
    console.log('=========================================');
    console.log(`📧 Email: ${this.testEmail}`);
    console.log('');

    const passwordsToTry = [
      'TestPassword123!',
      'Password123!',
      'Floworx123!',
      'Test123!',
      'Admin123!'
    ];

    for (const password of passwordsToTry) {
      try {
        console.log(`🔐 Trying password: ${password}`);
        const response = await axios.post(`${this.apiUrl}/auth/login`, {
          email: this.testEmail,
          password: password
        }, { timeout: 10000 });

        console.log(`✅ LOGIN SUCCESSFUL with password: ${password}`);
        console.log(`📊 Status: ${response.status}`);
        console.log(`🎫 Token: ${!!response.data.token}`);
        console.log(`👤 User: ${response.data.user?.email}`);
        
        return {
          success: true,
          password: password,
          token: response.data.token,
          user: response.data.user
        };

      } catch (error) {
        console.log(`❌ Failed with ${password}: ${error.response?.data?.error?.message || error.message}`);
        
        if (error.response?.data?.error?.type === 'EMAIL_NOT_VERIFIED') {
          console.log('📧 Email verification required!');
          return {
            success: false,
            needsVerification: true,
            password: password
          };
        }
      }
    }

    console.log('\n❌ None of the common passwords worked');
    return { success: false, needsVerification: false };
  }

  async testPasswordReset() {
    console.log('\n🔄 TESTING PASSWORD RESET');
    console.log('=========================');

    try {
      console.log(`📧 Sending password reset for: ${this.testEmail}`);
      const response = await axios.post(`${this.apiUrl}/auth/forgot-password`, {
        email: this.testEmail
      }, { timeout: 10000 });

      console.log(`✅ Password reset sent successfully: ${response.status}`);
      console.log(`💬 Message: ${response.data.message}`);
      
      // Check if development URL is provided
      if (response.data.resetUrl) {
        console.log(`🔗 Reset URL (development): ${response.data.resetUrl}`);
      }

      return {
        success: true,
        message: response.data.message,
        resetUrl: response.data.resetUrl
      };

    } catch (error) {
      console.log(`❌ Password reset failed: ${error.response?.data?.error?.message || error.message}`);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async testFrontendLoginFlow() {
    console.log('\n🎨 TESTING FRONTEND LOGIN FLOW');
    console.log('==============================');

    try {
      console.log('🌐 Opening browser for manual testing...');
      const browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000
      });
      const page = await browser.newPage();

      // Navigate to login page
      await page.goto(`${this.baseUrl}/login`);
      await page.waitForLoadState('networkidle');

      // Pre-fill the email
      await page.fill('input[type="email"], input[name="email"]', this.testEmail);

      console.log('\n📝 MANUAL TESTING INSTRUCTIONS:');
      console.log('===============================');
      console.log('1. The browser is now open with the login page');
      console.log(`2. Email is pre-filled: ${this.testEmail}`);
      console.log('3. Please enter the password you think is correct');
      console.log('4. Try to login and see what happens');
      console.log('5. If you get an error, note what it says');
      console.log('6. You can also try the "Forgot Password" link if available');
      console.log('');

      const proceed = await this.waitForUserInput('Press Enter when you have finished testing in the browser...');

      // Check current state
      const currentUrl = page.url();
      const isLoggedIn = !currentUrl.includes('/login');
      
      console.log(`\n📍 Final URL: ${currentUrl}`);
      console.log(`🔄 Logged in: ${isLoggedIn}`);

      if (isLoggedIn) {
        console.log('✅ Login appears successful!');
        
        // Check for auth tokens
        const authData = await page.evaluate(() => {
          return {
            localStorage: localStorage.getItem('token') || localStorage.getItem('authToken'),
            sessionStorage: sessionStorage.getItem('token') || sessionStorage.getItem('authToken'),
            cookies: document.cookie
          };
        });

        console.log(`🎫 Auth tokens found: ${!!authData.localStorage || !!authData.sessionStorage || authData.cookies.includes('token')}`);
      }

      await browser.close();

      return {
        success: isLoggedIn,
        finalUrl: currentUrl,
        manualTest: true
      };

    } catch (error) {
      console.log(`❌ Frontend test failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async runExistingUserTest() {
    console.log('🧪 EXISTING USER LOGIN TEST');
    console.log('===========================');
    console.log(`📧 Testing login for: ${this.testEmail}`);
    console.log(`🌐 Application: ${this.baseUrl}`);
    console.log('');

    const results = {
      passwordTest: null,
      passwordReset: null,
      frontendTest: null,
      timestamp: new Date().toISOString()
    };

    // Step 1: Try different passwords
    results.passwordTest = await this.testLoginWithDifferentPasswords();

    if (results.passwordTest.success) {
      console.log('\n🎉 LOGIN SUCCESSFUL!');
      console.log('====================');
      console.log(`✅ Working password found: ${results.passwordTest.password}`);
      console.log('You can now use this password to login to the application.');
      
    } else if (results.passwordTest.needsVerification) {
      console.log('\n📧 EMAIL VERIFICATION REQUIRED');
      console.log('==============================');
      console.log('The account exists but needs email verification.');
      console.log('Please check your email for a verification link.');
      
    } else {
      console.log('\n🔄 PASSWORD RESET NEEDED');
      console.log('========================');
      console.log('None of the common passwords worked. Let\'s try password reset.');
      
      // Step 2: Try password reset
      results.passwordReset = await this.testPasswordReset();
      
      if (results.passwordReset.success) {
        console.log('\n📧 PASSWORD RESET EMAIL SENT');
        console.log('============================');
        console.log('Please check your email (dizelll2007@gmail.com) for a password reset link.');
        
        if (results.passwordReset.resetUrl) {
          console.log(`🔗 Development reset URL: ${results.passwordReset.resetUrl}`);
        }
        
        const waitForReset = await this.waitForUserInput('\nHave you received and used the password reset email? (y/n): ');
        
        if (waitForReset.toLowerCase() === 'y') {
          console.log('✅ Great! Now let\'s test the new password.');
          results.passwordTest = await this.testLoginWithDifferentPasswords();
        }
      }
    }

    // Step 3: Frontend testing
    console.log('\n🎨 FRONTEND MANUAL TESTING');
    console.log('==========================');
    const doFrontendTest = await this.waitForUserInput('Would you like to test the frontend login manually? (y/n): ');
    
    if (doFrontendTest.toLowerCase() === 'y') {
      results.frontendTest = await this.testFrontendLoginFlow();
    }

    // Generate final report
    console.log('\n📊 EXISTING USER TEST RESULTS');
    console.log('==============================');
    
    if (results.passwordTest?.success) {
      console.log(`✅ LOGIN: SUCCESS with password "${results.passwordTest.password}"`);
      console.log(`🎫 Token: ${!!results.passwordTest.token}`);
      console.log(`👤 User: ${results.passwordTest.user?.email}`);
    } else if (results.passwordTest?.needsVerification) {
      console.log(`📧 LOGIN: NEEDS EMAIL VERIFICATION`);
    } else {
      console.log(`❌ LOGIN: FAILED - password unknown`);
    }

    if (results.passwordReset) {
      console.log(`🔄 PASSWORD RESET: ${results.passwordReset.success ? 'SENT' : 'FAILED'}`);
    }

    if (results.frontendTest) {
      console.log(`🎨 FRONTEND: ${results.frontendTest.success ? 'SUCCESS' : 'NEEDS WORK'}`);
    }

    // Save results
    const reportFile = `existing-user-test-${Date.now()}.json`;
    require('fs').writeFileSync(reportFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Results saved to: ${reportFile}`);

    // Final recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    if (results.passwordTest?.success) {
      console.log('✅ User can login successfully - authentication system working!');
      console.log(`🔑 Use password: ${results.passwordTest.password}`);
    } else if (results.passwordTest?.needsVerification) {
      console.log('📧 Check email for verification link and click it');
      console.log('🔄 Then try logging in again');
    } else if (results.passwordReset?.success) {
      console.log('📧 Check email for password reset link');
      console.log('🔄 Set a new password and try logging in');
    } else {
      console.log('🆕 Consider creating a new test account with a different email');
    }

    this.rl.close();
    return results;
  }
}

// Run test if called directly
if (require.main === module) {
  const tester = new ExistingUserLoginTest();
  tester.runExistingUserTest()
    .then(results => {
      const success = results.passwordTest?.success || results.frontendTest?.success;
      process.exit(success ? 0 : 1);
    })
    .catch(console.error);
}

module.exports = ExistingUserLoginTest;
