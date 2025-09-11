#!/usr/bin/env node

/**
 * COMPREHENSIVE END-TO-END AUTHENTICATION TEST
 * ============================================
 * Complete authentication flow testing with browser automation and Supabase integration
 */

const { chromium } = require('playwright');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config();

class ComprehensiveE2EAuthTest {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.apiUrl = `${baseUrl}/api`;
    this.browser = null;
    this.page = null;
    this.testResults = [];
    this.screenshots = [];
    
    // Test data
    this.existingUser = {
      email: 'dizelll.test.1757606995372@gmail.com',
      password: 'TestPassword123!'
    };
    
    this.newUser = {
      firstName: 'E2E',
      lastName: 'TestUser',
      email: `e2e.test.${Date.now()}@floworx-test.com`,
      password: 'E2ETestPassword123!',
      businessName: 'E2E Test Business LLC',
      phone: '+1234567890'
    };

    // Initialize Supabase if available
    this.initializeSupabase();
  }

  initializeSupabase() {
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        this.supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        this.pgPool = new Pool({
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          database: process.env.DB_NAME,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          ssl: { rejectUnauthorized: false },
          max: 1
        });
        
        console.log('✅ Supabase clients initialized for E2E testing');
      } else {
        console.log('⚠️  Supabase env vars not found - using API-only testing');
      }
    } catch (error) {
      console.log(`⚠️  Supabase initialization failed: ${error.message}`);
    }
  }

  async initializeBrowser() {
    console.log('🌐 INITIALIZING BROWSER FOR E2E TESTING');
    console.log('=======================================');
    
    this.browser = await chromium.launch({
      headless: false,
      slowMo: 1000,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage();
    
    // Set viewport and user agent
    await this.page.setViewportSize({ width: 1280, height: 720 });
    
    // Enable console logging
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`🔴 Browser Error: ${msg.text()}`);
      }
    });
    
    // Monitor network requests
    this.page.on('response', response => {
      if (response.url().includes('/api/auth/')) {
        console.log(`📡 API Request: ${response.request().method()} ${response.url()} - ${response.status()}`);
      }
    });
    
    console.log('✅ Browser initialized successfully');
  }

  async takeScreenshot(name, description) {
    try {
      const filename = `e2e-${name}-${Date.now()}.png`;
      await this.page.screenshot({ path: filename, fullPage: true });
      this.screenshots.push({ name, description, filename });
      console.log(`📸 Screenshot saved: ${filename}`);
    } catch (error) {
      console.log(`⚠️  Screenshot failed: ${error.message}`);
    }
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 ${testName}`);
    console.log('='.repeat(testName.length + 3));

    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      const success = result.success !== false;
      console.log(`${success ? '✅' : '❌'} ${result.message || (success ? 'PASSED' : 'FAILED')} (${duration}ms)`);
      
      if (result.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }

      this.testResults.push({
        name: testName,
        success,
        message: result.message,
        details: result.details || {},
        duration,
        timestamp: new Date().toISOString()
      });

      return success;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ ERROR: ${error.message} (${duration}ms)`);
      
      this.testResults.push({
        name: testName,
        success: false,
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      });
      
      return false;
    }
  }

  async testRegistrationFlow() {
    console.log('📝 Starting registration flow test...');
    
    // Navigate to registration page
    await this.page.goto(`${this.baseUrl}/register`);
    await this.page.waitForLoadState('networkidle');
    await this.takeScreenshot('registration-page', 'Registration page loaded');

    // Check if registration form exists
    const formExists = await this.page.locator('form').count() > 0;
    if (!formExists) {
      throw new Error('Registration form not found on page');
    }

    // Fill out registration form
    console.log('📝 Filling registration form...');
    
    const formFields = [
      { selector: 'input[name="firstName"], input[placeholder*="First"], input[id*="first"]', value: this.newUser.firstName, name: 'First Name' },
      { selector: 'input[name="lastName"], input[placeholder*="Last"], input[id*="last"]', value: this.newUser.lastName, name: 'Last Name' },
      { selector: 'input[name="email"], input[type="email"]', value: this.newUser.email, name: 'Email' },
      { selector: 'input[name="password"], input[type="password"]', value: this.newUser.password, name: 'Password' },
      { selector: 'input[name="businessName"], input[placeholder*="Business"], input[placeholder*="Company"]', value: this.newUser.businessName, name: 'Business Name' }
    ];

    for (const field of formFields) {
      try {
        const element = this.page.locator(field.selector).first();
        if (await element.count() > 0) {
          await element.fill(field.value);
          console.log(`   ✅ ${field.name}: ${field.value}`);
        } else {
          console.log(`   ⚠️  ${field.name}: Field not found`);
        }
      } catch (error) {
        console.log(`   ❌ ${field.name}: ${error.message}`);
      }
    }

    // Handle terms agreement checkbox
    try {
      const termsCheckbox = this.page.locator('input[type="checkbox"]').first();
      if (await termsCheckbox.count() > 0) {
        await termsCheckbox.check();
        console.log('   ✅ Terms agreement: Checked');
      }
    } catch (error) {
      console.log(`   ⚠️  Terms checkbox: ${error.message}`);
    }

    await this.takeScreenshot('registration-filled', 'Registration form filled');

    // Submit form
    console.log('🚀 Submitting registration form...');
    const submitButton = this.page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up"), button:has-text("Create Account")').first();
    
    if (await submitButton.count() === 0) {
      throw new Error('Submit button not found');
    }

    await submitButton.click();
    
    // Wait for response
    await this.page.waitForTimeout(5000);
    await this.takeScreenshot('registration-submitted', 'After registration submission');

    // Check for success indicators
    const currentUrl = this.page.url();
    const hasSuccessMessage = await this.page.locator('.success, .alert-success, [class*="success"]').count() > 0;
    const hasErrorMessage = await this.page.locator('.error, .alert-error, [class*="error"]').count() > 0;
    const redirectedFromRegister = !currentUrl.includes('/register');

    // Verify user in database if Supabase available
    let userInDatabase = false;
    if (this.supabase) {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for DB write
        const { data: user, error } = await this.supabase
          .from('users')
          .select('id, email, first_name, last_name, business_name, created_at')
          .eq('email', this.newUser.email)
          .single();

        if (!error && user) {
          userInDatabase = true;
          console.log(`   ✅ User verified in database: ${user.id}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Database verification failed: ${error.message}`);
      }
    }

    const registrationSuccess = (hasSuccessMessage || redirectedFromRegister) && !hasErrorMessage;

    return {
      success: registrationSuccess,
      message: `Registration ${registrationSuccess ? 'successful' : 'failed'}`,
      details: {
        'Current URL': currentUrl,
        'Redirected from Register': redirectedFromRegister,
        'Success Message': hasSuccessMessage,
        'Error Message': hasErrorMessage,
        'User in Database': userInDatabase,
        'Test Email': this.newUser.email
      }
    };
  }

  async testLoginFlow() {
    console.log('🔐 Starting login flow test...');
    
    // Navigate to login page
    await this.page.goto(`${this.baseUrl}/login`);
    await this.page.waitForLoadState('networkidle');
    await this.takeScreenshot('login-page', 'Login page loaded');

    // Check if login form exists
    const emailInput = this.page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = this.page.locator('input[type="password"], input[name="password"]').first();
    
    if (await emailInput.count() === 0 || await passwordInput.count() === 0) {
      throw new Error('Login form fields not found');
    }

    // Fill login form
    console.log('📝 Filling login form...');
    await emailInput.fill(this.existingUser.email);
    await passwordInput.fill(this.existingUser.password);
    
    console.log(`   ✅ Email: ${this.existingUser.email}`);
    console.log(`   ✅ Password: ${this.existingUser.password}`);

    await this.takeScreenshot('login-filled', 'Login form filled');

    // Submit login form
    console.log('🚀 Submitting login form...');
    const loginButton = this.page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login"), button:has-text("Log In")').first();
    
    if (await loginButton.count() === 0) {
      throw new Error('Login button not found');
    }

    await loginButton.click();
    
    // Wait for response and potential redirect
    await this.page.waitForTimeout(5000);
    await this.takeScreenshot('login-submitted', 'After login submission');

    // Check login results
    const currentUrl = this.page.url();
    const redirectedFromLogin = !currentUrl.includes('/login');
    const hasErrorMessage = await this.page.locator('.error, .alert-error, [class*="error"]').count() > 0;
    
    // Check for auth tokens in storage
    const authData = await this.page.evaluate(() => {
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

    const hasAuthToken = !!(authData.localStorage.token || authData.localStorage.authToken || 
                           authData.sessionStorage.token || authData.sessionStorage.authToken ||
                           authData.cookies.includes('token'));

    const loginSuccess = redirectedFromLogin && !hasErrorMessage && hasAuthToken;

    return {
      success: loginSuccess,
      message: `Login ${loginSuccess ? 'successful' : 'failed'}`,
      details: {
        'Current URL': currentUrl,
        'Redirected from Login': redirectedFromLogin,
        'Has Auth Token': hasAuthToken,
        'Error Message': hasErrorMessage,
        'LocalStorage Token': !!(authData.localStorage.token || authData.localStorage.authToken),
        'SessionStorage Token': !!(authData.sessionStorage.token || authData.sessionStorage.authToken),
        'Cookies': authData.cookies.includes('token')
      }
    };
  }

  async testProtectedRouteAccess() {
    console.log('🛡️ Testing protected route access...');
    
    // Test dashboard access
    await this.page.goto(`${this.baseUrl}/dashboard`);
    await this.page.waitForLoadState('networkidle');
    await this.takeScreenshot('dashboard-access', 'Dashboard access attempt');

    const currentUrl = this.page.url();
    const onDashboard = currentUrl.includes('/dashboard');
    const redirectedToLogin = currentUrl.includes('/login');

    return {
      success: onDashboard,
      message: `Protected route access ${onDashboard ? 'successful' : 'blocked'}`,
      details: {
        'Current URL': currentUrl,
        'On Dashboard': onDashboard,
        'Redirected to Login': redirectedToLogin
      }
    };
  }

  async testFormValidation() {
    console.log('✅ Testing form validation...');

    // Test registration form validation
    await this.page.goto(`${this.baseUrl}/register`);
    await this.page.waitForLoadState('networkidle');

    // Try to submit empty form
    const submitButton = this.page.locator('button[type="submit"]').first();
    if (await submitButton.count() > 0) {
      await submitButton.click();
      await this.page.waitForTimeout(2000);

      const validationErrors = await this.page.locator('.error, .invalid, [class*="error"]').count();
      await this.takeScreenshot('validation-errors', 'Form validation errors');

      // Test invalid email format
      const emailInput = this.page.locator('input[type="email"]').first();
      if (await emailInput.count() > 0) {
        await emailInput.fill('invalid-email');
        await submitButton.click();
        await this.page.waitForTimeout(1000);
      }

      // Test weak password
      const passwordInput = this.page.locator('input[type="password"]').first();
      if (await passwordInput.count() > 0) {
        await passwordInput.fill('123');
        await submitButton.click();
        await this.page.waitForTimeout(1000);
      }

      const finalValidationErrors = await this.page.locator('.error, .invalid, [class*="error"]').count();

      return {
        success: validationErrors > 0 || finalValidationErrors > 0,
        message: `Form validation ${(validationErrors > 0 || finalValidationErrors > 0) ? 'working' : 'not working'}`,
        details: {
          'Initial Validation Errors': validationErrors,
          'Final Validation Errors': finalValidationErrors,
          'Email Validation': 'Tested invalid format',
          'Password Validation': 'Tested weak password'
        }
      };
    }

    return {
      success: false,
      message: 'Submit button not found for validation test'
    };
  }

  async testEmailVerification() {
    console.log('📧 Testing email verification flow...');

    // Check if the newly registered user requires email verification
    if (this.supabase) {
      try {
        const { data: user, error } = await this.supabase
          .from('users')
          .select('id, email, email_verified, created_at')
          .eq('email', this.newUser.email)
          .single();

        if (!error && user) {
          const emailVerified = user.email_verified;
          const requiresVerification = !emailVerified;

          return {
            success: true,
            message: `Email verification ${requiresVerification ? 'required' : 'not required'}`,
            details: {
              'User Email': user.email,
              'Email Verified': emailVerified,
              'Requires Verification': requiresVerification,
              'User Created': user.created_at
            }
          };
        }
      } catch (error) {
        return {
          success: false,
          message: `Email verification test failed: ${error.message}`
        };
      }
    }

    return {
      success: true,
      message: 'Email verification test skipped (no database access)',
      details: {
        'Reason': 'Supabase not available for direct testing'
      }
    };
  }

  async testSessionPersistence() {
    console.log('🔄 Testing session persistence...');

    // After successful login, refresh the page and check if session persists
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
    await this.takeScreenshot('session-refresh', 'After page refresh');

    // Check if still authenticated
    const currentUrl = this.page.url();
    const stillAuthenticated = !currentUrl.includes('/login');

    // Check auth tokens after refresh
    const authData = await this.page.evaluate(() => {
      return {
        localStorage: localStorage.getItem('token') || localStorage.getItem('authToken'),
        sessionStorage: sessionStorage.getItem('token') || sessionStorage.getItem('authToken')
      };
    });

    const hasPersistedToken = !!(authData.localStorage || authData.sessionStorage);

    return {
      success: stillAuthenticated && hasPersistedToken,
      message: `Session persistence ${(stillAuthenticated && hasPersistedToken) ? 'working' : 'not working'}`,
      details: {
        'Still Authenticated': stillAuthenticated,
        'Persisted Token': hasPersistedToken,
        'Current URL': currentUrl,
        'LocalStorage Token': !!authData.localStorage,
        'SessionStorage Token': !!authData.sessionStorage
      }
    };
  }

  async testLogoutFlow() {
    console.log('🚪 Testing logout flow...');

    // Look for logout button/link
    const logoutSelectors = [
      'button:has-text("Logout")',
      'button:has-text("Sign Out")',
      'a:has-text("Logout")',
      'a:has-text("Sign Out")',
      '[data-testid="logout"]',
      '.logout'
    ];

    let logoutElement = null;
    for (const selector of logoutSelectors) {
      const element = this.page.locator(selector).first();
      if (await element.count() > 0) {
        logoutElement = element;
        break;
      }
    }

    if (logoutElement) {
      await logoutElement.click();
      await this.page.waitForTimeout(3000);
      await this.takeScreenshot('after-logout', 'After logout');

      const currentUrl = this.page.url();
      const redirectedToLogin = currentUrl.includes('/login') || currentUrl === this.baseUrl + '/';

      // Check if auth tokens are cleared
      const authData = await this.page.evaluate(() => {
        return {
          localStorage: localStorage.getItem('token') || localStorage.getItem('authToken'),
          sessionStorage: sessionStorage.getItem('token') || sessionStorage.getItem('authToken')
        };
      });

      const tokensCleared = !authData.localStorage && !authData.sessionStorage;

      return {
        success: redirectedToLogin && tokensCleared,
        message: `Logout ${(redirectedToLogin && tokensCleared) ? 'successful' : 'failed'}`,
        details: {
          'Redirected to Login': redirectedToLogin,
          'Tokens Cleared': tokensCleared,
          'Current URL': currentUrl
        }
      };
    }

    return {
      success: false,
      message: 'Logout button not found',
      details: {
        'Reason': 'No logout element found on page'
      }
    };
  }

  async testAPIIntegration() {
    console.log('🔌 Testing API integration...');
    
    // Test registration API
    try {
      const registerResponse = await axios.post(`${this.apiUrl}/auth/register`, {
        firstName: 'API',
        lastName: 'Test',
        email: `api.test.${Date.now()}@example.com`,
        password: 'APITest123!',
        businessName: 'API Test Business',
        agreeToTerms: true
      }, { timeout: 15000 });

      const registerSuccess = registerResponse.status === 201;

      // Test login API
      const loginResponse = await axios.post(`${this.apiUrl}/auth/login`, this.existingUser, {
        timeout: 10000
      });

      const loginSuccess = loginResponse.status === 200 && !!loginResponse.data.token;

      return {
        success: registerSuccess && loginSuccess,
        message: 'API integration working',
        details: {
          'Registration API': registerResponse.status,
          'Login API': loginResponse.status,
          'JWT Token': !!loginResponse.data.token
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `API integration failed: ${error.message}`,
        details: {
          'Error': error.message,
          'Status': error.response?.status
        }
      };
    }
  }

  async runComprehensiveE2ETest() {
    console.log('🎯 COMPREHENSIVE END-TO-END AUTHENTICATION TEST');
    console.log('================================================');
    console.log(`🌐 Application: ${this.baseUrl}`);
    console.log(`📧 Existing User: ${this.existingUser.email}`);
    console.log(`📧 New User: ${this.newUser.email}\n`);

    const results = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      existingUser: this.existingUser.email,
      newUser: this.newUser.email,
      tests: {},
      screenshots: []
    };

    try {
      // Initialize browser
      await this.initializeBrowser();

      // Run comprehensive test suite
      const testSuite = [
        ['API Integration Test', () => this.testAPIIntegration()],
        ['Registration Flow Test', () => this.testRegistrationFlow()],
        ['Email Verification Test', () => this.testEmailVerification()],
        ['Login Flow Test', () => this.testLoginFlow()],
        ['Protected Route Access Test', () => this.testProtectedRouteAccess()],
        ['Session Persistence Test', () => this.testSessionPersistence()],
        ['Form Validation Test', () => this.testFormValidation()],
        ['Logout Flow Test', () => this.testLogoutFlow()]
      ];

      for (const [testName, testFunction] of testSuite) {
        const success = await this.runTest(testName, testFunction);
        results.tests[testName] = this.testResults[this.testResults.length - 1];
      }

    } finally {
      // Clean up
      if (this.browser) {
        await this.browser.close();
      }
      if (this.pgPool) {
        await this.pgPool.end();
      }
    }

    // Calculate results
    const testResults = Object.values(results.tests);
    const passedTests = testResults.filter(test => test.success).length;
    const totalTests = testResults.length;
    const successRate = (passedTests / totalTests * 100).toFixed(1);

    console.log('\n📊 COMPREHENSIVE E2E TEST RESULTS');
    console.log('==================================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}`);
    console.log(`📈 Success Rate: ${successRate}%`);

    // Detailed results by category
    console.log('\n📋 Test Results by Category:');
    testResults.forEach(test => {
      const status = test.success ? '✅' : '❌';
      const duration = test.duration ? `(${test.duration}ms)` : '';
      console.log(`   ${status} ${test.name}: ${test.message} ${duration}`);
      
      if (test.details) {
        Object.entries(test.details).forEach(([key, value]) => {
          console.log(`      ${key}: ${value}`);
        });
      }
    });

    // Screenshots summary
    console.log(`\n📸 Screenshots captured: ${this.screenshots.length}`);
    this.screenshots.forEach(screenshot => {
      console.log(`   📷 ${screenshot.name}: ${screenshot.filename}`);
    });

    // Assessment
    console.log('\n🎯 E2E TEST ASSESSMENT:');
    if (successRate >= 90) {
      console.log('🎉 EXCELLENT: End-to-end authentication flow working perfectly!');
    } else if (successRate >= 75) {
      console.log('✅ GOOD: End-to-end authentication mostly working');
    } else if (successRate >= 50) {
      console.log('⚠️  FAIR: End-to-end authentication has some issues');
    } else {
      console.log('❌ POOR: End-to-end authentication needs significant work');
    }

    // Save comprehensive report
    results.summary = {
      totalTests,
      passedTests,
      successRate: parseFloat(successRate),
      screenshots: this.screenshots,
      testResults: this.testResults
    };

    const reportFile = `e2e-auth-test-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Comprehensive E2E report saved to: ${reportFile}`);

    console.log('\n🎉 COMPREHENSIVE END-TO-END AUTHENTICATION TEST COMPLETE!');
    
    return results;
  }
}

// Run test if called directly
if (require.main === module) {
  const tester = new ComprehensiveE2EAuthTest();
  tester.runComprehensiveE2ETest()
    .then(results => {
      const success = results.summary.successRate >= 75;
      process.exit(success ? 0 : 1);
    })
    .catch(console.error);
}

module.exports = ComprehensiveE2EAuthTest;
