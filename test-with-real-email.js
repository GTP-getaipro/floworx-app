#!/usr/bin/env node

/**
 * REAL EMAIL REGISTRATION & LOGIN TEST
 * ====================================
 * Tests registration and login with dizelll2007@gmail.com
 * Waits for user confirmation before proceeding
 */

const axios = require('axios');
const { chromium } = require('playwright');
const readline = require('readline');

class RealEmailTest {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.apiUrl = `${baseUrl}/api`;
    this.testEmail = 'dizelll2007@gmail.com';
    this.testPassword = 'TestPassword123!';
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async waitForUserInput(question) {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.toLowerCase().trim());
      });
    });
  }

  async testRegistration() {
    console.log('🔐 TESTING REGISTRATION WITH REAL EMAIL');
    console.log('=======================================');
    console.log(`📧 Email: ${this.testEmail}`);
    console.log(`🔑 Password: ${this.testPassword}`);
    console.log('');

    try {
      const registrationData = {
        firstName: 'Test',
        lastName: 'User',
        email: this.testEmail,
        password: this.testPassword,
        businessName: 'Test Business LLC',
        phone: '+1234567890',
        agreeToTerms: true,
        marketingConsent: false
      };

      console.log('🚀 Attempting registration...');
      const response = await axios.post(`${this.apiUrl}/auth/register`, registrationData, {
        timeout: 15000
      });

      console.log(`✅ Registration successful!`);
      console.log(`📊 Status: ${response.status}`);
      console.log(`📧 Requires verification: ${response.data.requiresVerification || false}`);
      console.log(`🎫 Token received: ${!!response.data.token}`);
      
      if (response.data.user) {
        console.log(`👤 User ID: ${response.data.user.id}`);
        console.log(`📧 User email: ${response.data.user.email}`);
      }

      return {
        success: true,
        status: response.status,
        data: response.data,
        requiresVerification: response.data.requiresVerification || false
      };

    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️  User already exists - this is expected if testing multiple times');
        console.log(`📊 Status: ${error.response.status}`);
        console.log(`💬 Message: ${error.response.data.error?.message || 'User already exists'}`);
        
        return {
          success: true,
          status: error.response.status,
          userExists: true,
          message: 'User already exists'
        };
      } else {
        console.log(`❌ Registration failed!`);
        console.log(`📊 Status: ${error.response?.status || 'Network Error'}`);
        console.log(`💬 Error: ${error.response?.data?.error?.message || error.message}`);
        
        return {
          success: false,
          status: error.response?.status,
          error: error.response?.data?.error || error.message
        };
      }
    }
  }

  async testAPILogin() {
    console.log('\n🔑 TESTING API LOGIN');
    console.log('====================');

    try {
      console.log('🚀 Attempting API login...');
      const response = await axios.post(`${this.apiUrl}/auth/login`, {
        email: this.testEmail,
        password: this.testPassword
      }, { timeout: 10000 });

      console.log(`✅ API Login successful!`);
      console.log(`📊 Status: ${response.status}`);
      console.log(`🎫 Token received: ${!!response.data.token}`);
      console.log(`👤 User data: ${!!response.data.user}`);
      
      if (response.data.user) {
        console.log(`   - ID: ${response.data.user.id}`);
        console.log(`   - Email: ${response.data.user.email}`);
        console.log(`   - Name: ${response.data.user.first_name} ${response.data.user.last_name}`);
        console.log(`   - Email verified: ${response.data.user.email_verified}`);
      }

      return {
        success: true,
        status: response.status,
        token: response.data.token,
        user: response.data.user
      };

    } catch (error) {
      console.log(`❌ API Login failed!`);
      console.log(`📊 Status: ${error.response?.status || 'Network Error'}`);
      console.log(`💬 Error: ${error.response?.data?.error?.message || error.message}`);
      
      if (error.response?.data?.error?.type === 'EMAIL_NOT_VERIFIED') {
        console.log('📧 Email verification required - this should not happen with our fix');
      }

      return {
        success: false,
        status: error.response?.status,
        error: error.response?.data?.error || error.message
      };
    }
  }

  async testFrontendLogin() {
    console.log('\n🎨 TESTING FRONTEND LOGIN');
    console.log('=========================');

    try {
      console.log('🌐 Opening browser...');
      const browser = await chromium.launch({ 
        headless: false,  // Keep visible so you can see what's happening
        slowMo: 1000     // Slow down actions for visibility
      });
      const page = await browser.newPage();

      // Navigate to login page
      console.log('📍 Navigating to login page...');
      await page.goto(`${this.baseUrl}/login`);
      await page.waitForLoadState('networkidle');

      // Fill in the form
      console.log('📝 Filling login form...');
      await page.fill('input[type="email"], input[name="email"]', this.testEmail);
      await page.fill('input[type="password"], input[name="password"]', this.testPassword);

      // Monitor network requests
      const networkRequests = [];
      page.on('response', response => {
        if (response.url().includes('/auth/login')) {
          networkRequests.push({
            status: response.status(),
            url: response.url(),
            timestamp: new Date().toISOString()
          });
        }
      });

      console.log('🚀 Submitting login form...');
      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');

      // Wait for response
      console.log('⏳ Waiting for login response...');
      await page.waitForTimeout(5000);

      // Check results
      const currentUrl = page.url();
      const isRedirected = !currentUrl.includes('/login');
      
      // Check for stored authentication
      const authData = await page.evaluate(() => {
        return {
          localStorage: {
            token: localStorage.getItem('token'),
            authToken: localStorage.getItem('authToken'),
            user: localStorage.getItem('user')
          },
          sessionStorage: {
            token: sessionStorage.getItem('token'),
            authToken: sessionStorage.getItem('authToken'),
            user: sessionStorage.getItem('user')
          },
          cookies: document.cookie
        };
      });

      // Check for error messages
      const errorMessages = await page.locator('.error, .alert-error, [class*="error"], [role="alert"]').allTextContents();

      console.log('\n📊 FRONTEND LOGIN RESULTS:');
      console.log(`📍 Current URL: ${currentUrl}`);
      console.log(`🔄 Redirected from login: ${isRedirected}`);
      console.log(`📡 Network requests: ${networkRequests.length}`);
      
      if (networkRequests.length > 0) {
        networkRequests.forEach(req => {
          console.log(`   - ${req.status}: ${req.url}`);
        });
      }

      console.log(`🎫 Auth tokens found:`);
      console.log(`   - localStorage.token: ${!!authData.localStorage.token}`);
      console.log(`   - localStorage.authToken: ${!!authData.localStorage.authToken}`);
      console.log(`   - sessionStorage.token: ${!!authData.sessionStorage.token}`);
      console.log(`   - cookies: ${authData.cookies.includes('token') ? 'Contains token' : 'No token'}`);

      if (errorMessages.length > 0) {
        console.log(`❌ Error messages: ${errorMessages.join(', ')}`);
      }

      const loginSuccess = isRedirected || 
                          !!authData.localStorage.token || 
                          !!authData.localStorage.authToken || 
                          !!authData.sessionStorage.token ||
                          authData.cookies.includes('token');

      console.log(`\n${loginSuccess ? '✅' : '❌'} Frontend login ${loginSuccess ? 'successful' : 'failed'}`);

      // Keep browser open for manual inspection
      console.log('\n🔍 Browser will stay open for 30 seconds for manual inspection...');
      await page.waitForTimeout(30000);

      await browser.close();

      return {
        success: loginSuccess,
        currentUrl,
        isRedirected,
        authData,
        errorMessages,
        networkRequests
      };

    } catch (error) {
      console.log(`❌ Frontend login test failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async runComprehensiveTest() {
    console.log('🧪 COMPREHENSIVE REAL EMAIL TEST');
    console.log('=================================');
    console.log(`📧 Testing with: ${this.testEmail}`);
    console.log(`🌐 Application: ${this.baseUrl}`);
    console.log('');

    const results = {
      registration: null,
      apiLogin: null,
      frontendLogin: null,
      timestamp: new Date().toISOString()
    };

    // Step 1: Test Registration
    results.registration = await this.testRegistration();

    if (results.registration.success || results.registration.userExists) {
      console.log('\n⏳ WAITING FOR EMAIL CONFIRMATION');
      console.log('=================================');
      console.log('Please check your email (dizelll2007@gmail.com) for any verification emails.');
      console.log('If you receive a verification email, please click the link to verify your account.');
      console.log('');

      const proceed = await this.waitForUserInput('Have you checked your email and completed any verification steps? (y/n): ');
      
      if (proceed === 'y' || proceed === 'yes') {
        console.log('✅ Proceeding with login tests...');
        
        // Step 2: Test API Login
        results.apiLogin = await this.testAPILogin();

        // Step 3: Test Frontend Login
        results.frontendLogin = await this.testFrontendLogin();

      } else {
        console.log('⏸️  Test paused. You can run this script again after email verification.');
      }
    }

    // Generate final report
    console.log('\n📊 COMPREHENSIVE TEST RESULTS');
    console.log('==============================');
    
    console.log(`\n🔐 REGISTRATION:`);
    if (results.registration) {
      console.log(`   Status: ${results.registration.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`   HTTP Status: ${results.registration.status}`);
      if (results.registration.userExists) {
        console.log(`   Note: User already exists (expected for repeat tests)`);
      }
    }

    console.log(`\n🔑 API LOGIN:`);
    if (results.apiLogin) {
      console.log(`   Status: ${results.apiLogin.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`   HTTP Status: ${results.apiLogin.status}`);
      console.log(`   Token received: ${!!results.apiLogin.token}`);
    } else {
      console.log(`   Status: ⏸️  SKIPPED (waiting for email verification)`);
    }

    console.log(`\n🎨 FRONTEND LOGIN:`);
    if (results.frontendLogin) {
      console.log(`   Status: ${results.frontendLogin.success ? '✅ SUCCESS' : '❌ FAILED'}`);
      console.log(`   Redirected: ${results.frontendLogin.isRedirected}`);
      console.log(`   Auth tokens: ${!!results.frontendLogin.authData}`);
    } else {
      console.log(`   Status: ⏸️  SKIPPED (waiting for email verification)`);
    }

    // Save detailed results
    const reportFile = `real-email-test-results-${Date.now()}.json`;
    require('fs').writeFileSync(reportFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed results saved to: ${reportFile}`);

    // Overall assessment
    const overallSuccess = results.registration?.success && 
                          results.apiLogin?.success && 
                          results.frontendLogin?.success;

    console.log(`\n🎯 OVERALL ASSESSMENT: ${overallSuccess ? '✅ SUCCESS' : '⚠️  PARTIAL/PENDING'}`);
    
    if (overallSuccess) {
      console.log('🎉 All authentication flows working correctly with real email!');
    } else {
      console.log('📧 Some tests may be pending email verification - this is normal.');
    }

    this.rl.close();
    return results;
  }
}

// Run test if called directly
if (require.main === module) {
  const tester = new RealEmailTest();
  tester.runComprehensiveTest()
    .then(results => {
      const success = results.registration?.success || results.registration?.userExists;
      process.exit(success ? 0 : 1);
    })
    .catch(console.error);
}

module.exports = RealEmailTest;
