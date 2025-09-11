#!/usr/bin/env node

/**
 * FLOWORX LOGIN MODULE
 * ====================
 * Isolated, fully functional login system with comprehensive testing
 * 
 * Features:
 * - Email/password authentication
 * - Form validation
 * - Error handling
 * - Success redirects
 * - API integration testing
 * - Frontend component testing
 */

const { chromium } = require('playwright');
const axios = require('axios');

class LoginModule {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.apiUrl = `${baseUrl}/api`;
    this.loginUrl = `${baseUrl}/login`;
    
        // Test users for different scenarios
    this.testUsers = {
      valid: {
        email: 'test.user@floworx-iq.com',
        password: 'TestUser123!',
        description: 'Verified working test user'
      },
      invalid: {
        email: 'nonexistent@example.com',
        password: 'WrongPassword123!',
        description: 'Non-existent user'
      },
      malformed: {
        email: 'invalid-email-format',
        password: 'short',
        description: 'Invalid email format'
      }
    };
  }

  /**
   * Test API login endpoint directly
   */
  async testApiLogin(userType = 'valid') {
    const user = this.testUsers[userType];
    console.log(`🔐 Testing API login for: ${user.description}`);
    
    try {
      const response = await axios.post(`${this.apiUrl}/auth/login`, {
        email: user.email,
        password: user.password
      }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });

      return {
        success: true,
        status: response.status,
        data: response.data,
        message: `✅ API login successful: ${response.status}`,
        hasToken: !!response.data.token,
        userInfo: response.data.user || null
      };

    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 0,
        error: error.response?.data || { message: error.message },
        message: `❌ API login failed: ${error.response?.status} - ${error.response?.data?.error?.message || error.message}`,
        errorType: error.response?.data?.error?.type || 'NETWORK_ERROR'
      };
    }
  }

  /**
   * Test frontend login form functionality
   */
  async testFrontendLogin(userType = 'valid', options = {}) {
    const { headless = false, slowMo = 500 } = options;
    const user = this.testUsers[userType];
    
    console.log(`🎨 Testing frontend login for: ${user.description}`);
    
    let browser;
    try {
      browser = await chromium.launch({ headless, slowMo });
      const page = await browser.newPage();

      // Monitor network requests
      const networkRequests = [];
      page.on('request', request => {
        if (request.url().includes('/api/auth/login')) {
          networkRequests.push({
            url: request.url(),
            method: request.method(),
            postData: request.postData()
          });
        }
      });

      const networkResponses = [];
      page.on('response', response => {
        if (response.url().includes('/api/auth/login')) {
          networkResponses.push({
            url: response.url(),
            status: response.status(),
            statusText: response.statusText()
          });
        }
      });

      // Navigate to login page
      await page.goto(this.loginUrl);
      await page.waitForLoadState('networkidle');

      const initialUrl = page.url();
      
      // Check if login form exists
      const emailField = await page.locator('input[type="email"], input[name="email"]').count();
      const passwordField = await page.locator('input[type="password"], input[name="password"]').count();
      const submitButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').count();

      if (emailField === 0 || passwordField === 0 || submitButton === 0) {
        return {
          success: false,
          message: '❌ Login form elements missing',
          data: { emailField, passwordField, submitButton, url: initialUrl }
        };
      }

      // Fill login form
      await page.fill('input[type="email"], input[name="email"]', user.email);
      await page.fill('input[type="password"], input[name="password"]', user.password);

      // Submit form
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      
      // Wait for response
      await page.waitForTimeout(5000);

      const finalUrl = page.url();
      
      // Check for error messages
      const errorElements = await page.locator('.error, .alert-danger, [role="alert"]').count();
      let errorMessage = '';
      if (errorElements > 0) {
        errorMessage = await page.locator('.error, .alert-danger, [role="alert"]').first().textContent();
      }

      // Check for success indicators
      const successElements = await page.locator('.success, .alert-success').count();
      let successMessage = '';
      if (successElements > 0) {
        successMessage = await page.locator('.success, .alert-success').first().textContent();
      }

      // Analyze results
      const redirected = finalUrl !== initialUrl;
      const onDashboard = finalUrl.includes('/dashboard');
      const onOnboarding = finalUrl.includes('/onboarding');
      const stayedOnLogin = finalUrl.includes('/login');

      return {
        success: userType === 'valid' ? (redirected && !stayedOnLogin) : stayedOnLogin,
        message: this.getLoginResultMessage(userType, {
          redirected, onDashboard, onOnboarding, stayedOnLogin, errorMessage, successMessage
        }),
        data: {
          initialUrl,
          finalUrl,
          redirected,
          onDashboard,
          onOnboarding,
          stayedOnLogin,
          errorMessage,
          successMessage,
          networkRequests: networkRequests.length,
          networkResponses: networkResponses.length,
          formElements: { emailField, passwordField, submitButton }
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `❌ Frontend test error: ${error.message}`,
        data: { error: error.message }
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Generate appropriate message based on login test results
   */
  getLoginResultMessage(userType, results) {
    const { redirected, onDashboard, onOnboarding, stayedOnLogin, errorMessage, successMessage } = results;

    if (userType === 'valid') {
      if (onDashboard) return '✅ Valid login successful - redirected to dashboard';
      if (onOnboarding) return '✅ Valid login successful - redirected to onboarding';
      if (redirected && !stayedOnLogin) return '✅ Valid login successful - redirected from login';
      if (errorMessage) return `❌ Valid login failed: ${errorMessage}`;
      return '❌ Valid login failed - stayed on login page';
    } else {
      if (stayedOnLogin && errorMessage) return `✅ Invalid login correctly rejected: ${errorMessage}`;
      if (stayedOnLogin) return '✅ Invalid login correctly rejected';
      if (redirected) return '❌ Invalid login incorrectly accepted';
      return '⚠️ Invalid login result unclear';
    }
  }

  /**
   * Test form validation
   */
  async testFormValidation(options = {}) {
    const { headless = false } = options;
    console.log('📝 Testing login form validation');

    let browser;
    try {
      browser = await chromium.launch({ headless });
      const page = await browser.newPage();

      await page.goto(this.loginUrl);
      await page.waitForLoadState('networkidle');

      const tests = [];

      // Test 1: Empty form submission
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      await page.waitForTimeout(1000);
      
      const emptyFormErrors = await page.locator('.error, [role="alert"], .invalid').count();
      tests.push({
        name: 'Empty form validation',
        success: emptyFormErrors > 0,
        message: emptyFormErrors > 0 ? '✅ Empty form correctly shows validation errors' : '❌ Empty form should show validation errors'
      });

      // Test 2: Invalid email format
      await page.fill('input[type="email"], input[name="email"]', 'invalid-email');
      await page.fill('input[type="password"], input[name="password"]', 'somepassword');
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      await page.waitForTimeout(1000);

      const emailValidationErrors = await page.locator('.error, [role="alert"], .invalid').count();
      tests.push({
        name: 'Email format validation',
        success: emailValidationErrors > 0,
        message: emailValidationErrors > 0 ? '✅ Invalid email format correctly rejected' : '❌ Invalid email format should be rejected'
      });

      return {
        success: tests.every(test => test.success),
        message: `Form validation: ${tests.filter(t => t.success).length}/${tests.length} tests passed`,
        data: { tests }
      };

    } catch (error) {
      return {
        success: false,
        message: `❌ Form validation test error: ${error.message}`,
        data: { error: error.message }
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Run comprehensive login module tests
   */
  async runComprehensiveTests(options = {}) {
    console.log('🧪 FLOWORX LOGIN MODULE - COMPREHENSIVE TESTING');
    console.log('===============================================');
    console.log('ℹ️  Note: Testing login functionality and form validation');
    console.log('ℹ️  Some tests may show "needs work" due to email verification requirements');

    const results = {
      apiTests: {},
      frontendTests: {},
      validationTests: {},
      summary: {}
    };

    // API Tests
    console.log('\n1️⃣ API AUTHENTICATION TESTS');
    console.log('============================');
    
    results.apiTests.validUser = await this.testApiLogin('valid');
    console.log(results.apiTests.validUser.message);
    
    results.apiTests.invalidUser = await this.testApiLogin('invalid');
    console.log(results.apiTests.invalidUser.message);

    // Frontend Tests
    console.log('\n2️⃣ FRONTEND LOGIN TESTS');
    console.log('=======================');
    
    results.frontendTests.validUser = await this.testFrontendLogin('valid', options);
    console.log(results.frontendTests.validUser.message);
    
    results.frontendTests.invalidUser = await this.testFrontendLogin('invalid', options);
    console.log(results.frontendTests.invalidUser.message);

    // Validation Tests
    console.log('\n3️⃣ FORM VALIDATION TESTS');
    console.log('=========================');
    
    results.validationTests = await this.testFormValidation(options);
    console.log(results.validationTests.message);

    // Summary
    const totalTests = 5;
    const passedTests = [
      results.apiTests.validUser.success,
      results.apiTests.invalidUser.success,
      results.frontendTests.validUser.success,
      results.frontendTests.invalidUser.success,
      results.validationTests.success
    ].filter(Boolean).length;

    results.summary = {
      totalTests,
      passedTests,
      successRate: (passedTests / totalTests * 100).toFixed(1),
      status: passedTests === totalTests ? 'FULLY_FUNCTIONAL' : passedTests >= 3 ? 'MOSTLY_FUNCTIONAL' : 'NEEDS_WORK'
    };

    console.log('\n📊 LOGIN MODULE TEST SUMMARY');
    console.log('============================');
    console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
    console.log(`📈 Success Rate: ${results.summary.successRate}%`);
    console.log(`🎯 Status: ${results.summary.status}`);

    return results;
  }
}

// Export for use as module
module.exports = LoginModule;

// Run tests if called directly
if (require.main === module) {
  const loginModule = new LoginModule();
  loginModule.runComprehensiveTests({ headless: false, slowMo: 1000 })
    .then(results => {
      console.log('\n🎉 LOGIN MODULE TESTING COMPLETE!');
      process.exit(results.summary.status === 'FULLY_FUNCTIONAL' ? 0 : 1);
    })
    .catch(console.error);
}
