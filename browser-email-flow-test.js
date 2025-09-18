#!/usr/bin/env node

/**
 * Browser-based Email Flow Testing
 * Tests the complete user experience for email verification and password reset
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;

class BrowserEmailFlowTester {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com';
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      baseURL: this.baseURL,
      tests: [],
      screenshots: [],
      summary: {}
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🌐',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      browser: '🔍',
      form: '📝'
    }[level] || '🌐';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async setup() {
    this.log('Setting up browser for testing...', 'browser');
    
    try {
      this.browser = await chromium.launch({ 
        headless: false, // Set to true for CI/CD
        slowMo: 1000 // Slow down for visibility
      });
      
      this.page = await this.browser.newPage();
      
      // Set viewport
      await this.page.setViewportSize({ width: 1280, height: 720 });
      
      // Enable request/response logging
      this.page.on('request', request => {
        if (request.url().includes('/api/')) {
          this.log(`→ ${request.method()} ${request.url()}`, 'browser');
        }
      });
      
      this.page.on('response', response => {
        if (response.url().includes('/api/')) {
          this.log(`← ${response.status()} ${response.url()}`, 'browser');
        }
      });
      
      this.log('Browser setup complete', 'success');
      return true;
    } catch (error) {
      this.log(`Error setting up browser: ${error.message}`, 'error');
      return false;
    }
  }

  async takeScreenshot(name, description) {
    try {
      const filename = `screenshot-${name}-${Date.now()}.png`;
      await this.page.screenshot({ path: filename, fullPage: true });
      
      this.results.screenshots.push({
        name,
        description,
        filename,
        timestamp: new Date().toISOString()
      });
      
      this.log(`📸 Screenshot saved: ${filename}`, 'info');
      return filename;
    } catch (error) {
      this.log(`Error taking screenshot: ${error.message}`, 'error');
      return null;
    }
  }

  async testForgotPasswordForm() {
    this.log('Testing forgot password form...', 'form');
    
    const test = {
      name: 'Forgot Password Form Test',
      success: false,
      steps: [],
      timestamp: new Date().toISOString()
    };
    
    try {
      // Navigate to forgot password page
      await this.page.goto(`${this.baseURL}/forgot-password`);
      await this.page.waitForLoadState('networkidle');
      
      test.steps.push('✅ Navigated to forgot password page');
      await this.takeScreenshot('forgot-password-page', 'Forgot password page loaded');
      
      // Check if form exists
      const emailInput = await this.page.locator('input[type="email"]').first();
      const submitButton = await this.page.locator('button[type="submit"]').first();
      
      if (await emailInput.count() === 0) {
        test.steps.push('❌ Email input field not found');
        this.results.tests.push(test);
        return test;
      }
      
      if (await submitButton.count() === 0) {
        test.steps.push('❌ Submit button not found');
        this.results.tests.push(test);
        return test;
      }
      
      test.steps.push('✅ Form elements found');
      
      // Fill and submit form
      const testEmail = 'browser-test@example.com';
      await emailInput.fill(testEmail);
      test.steps.push(`✅ Entered email: ${testEmail}`);
      
      await this.takeScreenshot('forgot-password-filled', 'Form filled with test email');
      
      // Submit form
      await submitButton.click();
      test.steps.push('✅ Clicked submit button');
      
      // Wait for response
      await this.page.waitForTimeout(3000);
      await this.takeScreenshot('forgot-password-submitted', 'After form submission');
      
      // Check for success message or error
      const successMessage = await this.page.locator('text=/success|sent|email/i').first();
      const errorMessage = await this.page.locator('text=/error|failed/i').first();
      
      if (await successMessage.count() > 0) {
        const messageText = await successMessage.textContent();
        test.steps.push(`✅ Success message displayed: ${messageText}`);
        test.success = true;
      } else if (await errorMessage.count() > 0) {
        const messageText = await errorMessage.textContent();
        test.steps.push(`⚠️ Error message displayed: ${messageText}`);
      } else {
        test.steps.push('⚠️ No clear success/error message found');
      }
      
      // Check network requests
      const requests = await this.page.evaluate(() => {
        return window.performance.getEntriesByType('navigation').concat(
          window.performance.getEntriesByType('resource')
        ).filter(entry => entry.name.includes('/api/auth/password')).length;
      });
      
      if (requests > 0) {
        test.steps.push('✅ API request detected');
      } else {
        test.steps.push('⚠️ No API request detected');
      }
      
    } catch (error) {
      test.steps.push(`❌ Error during test: ${error.message}`);
      this.log(`Error testing forgot password form: ${error.message}`, 'error');
    }
    
    this.results.tests.push(test);
    return test;
  }

  async testRegistrationForm() {
    this.log('Testing registration form...', 'form');
    
    const test = {
      name: 'Registration Form Test',
      success: false,
      steps: [],
      timestamp: new Date().toISOString()
    };
    
    try {
      // Navigate to registration page
      await this.page.goto(`${this.baseURL}/register`);
      await this.page.waitForLoadState('networkidle');
      
      test.steps.push('✅ Navigated to registration page');
      await this.takeScreenshot('registration-page', 'Registration page loaded');
      
      // Fill registration form
      const testUser = {
        firstName: 'Browser',
        lastName: 'Test',
        email: `browser-test-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      };
      
      // Check for form fields
      const firstNameInput = await this.page.locator('input[name="firstName"], input[placeholder*="first" i]').first();
      const lastNameInput = await this.page.locator('input[name="lastName"], input[placeholder*="last" i]').first();
      const emailInput = await this.page.locator('input[type="email"]').first();
      const passwordInput = await this.page.locator('input[type="password"]').first();
      const confirmPasswordInput = await this.page.locator('input[type="password"]').nth(1);
      const submitButton = await this.page.locator('button[type="submit"]').first();
      
      // Fill form fields
      if (await firstNameInput.count() > 0) {
        await firstNameInput.fill(testUser.firstName);
        test.steps.push('✅ Filled first name');
      }
      
      if (await lastNameInput.count() > 0) {
        await lastNameInput.fill(testUser.lastName);
        test.steps.push('✅ Filled last name');
      }
      
      if (await emailInput.count() > 0) {
        await emailInput.fill(testUser.email);
        test.steps.push(`✅ Filled email: ${testUser.email}`);
      } else {
        test.steps.push('❌ Email input not found');
        this.results.tests.push(test);
        return test;
      }
      
      if (await passwordInput.count() > 0) {
        await passwordInput.fill(testUser.password);
        test.steps.push('✅ Filled password');
      } else {
        test.steps.push('❌ Password input not found');
        this.results.tests.push(test);
        return test;
      }
      
      if (await confirmPasswordInput.count() > 0) {
        await confirmPasswordInput.fill(testUser.confirmPassword);
        test.steps.push('✅ Filled confirm password');
      }
      
      await this.takeScreenshot('registration-filled', 'Registration form filled');
      
      // Submit form
      if (await submitButton.count() > 0) {
        await submitButton.click();
        test.steps.push('✅ Clicked submit button');
      } else {
        test.steps.push('❌ Submit button not found');
        this.results.tests.push(test);
        return test;
      }
      
      // Wait for response
      await this.page.waitForTimeout(5000);
      await this.takeScreenshot('registration-submitted', 'After registration submission');
      
      // Check for success/error messages
      const successMessage = await this.page.locator('text=/success|registered|verification|email/i').first();
      const errorMessage = await this.page.locator('text=/error|failed/i').first();
      
      if (await successMessage.count() > 0) {
        const messageText = await successMessage.textContent();
        test.steps.push(`✅ Success message displayed: ${messageText}`);
        test.success = true;
      } else if (await errorMessage.count() > 0) {
        const messageText = await errorMessage.textContent();
        test.steps.push(`⚠️ Error message displayed: ${messageText}`);
      } else {
        test.steps.push('⚠️ No clear success/error message found');
      }
      
    } catch (error) {
      test.steps.push(`❌ Error during test: ${error.message}`);
      this.log(`Error testing registration form: ${error.message}`, 'error');
    }
    
    this.results.tests.push(test);
    return test;
  }

  async testLoginPageAccess() {
    this.log('Testing login page access...', 'browser');
    
    const test = {
      name: 'Login Page Access Test',
      success: false,
      steps: [],
      timestamp: new Date().toISOString()
    };
    
    try {
      await this.page.goto(`${this.baseURL}/login`);
      await this.page.waitForLoadState('networkidle');
      
      test.steps.push('✅ Navigated to login page');
      await this.takeScreenshot('login-page', 'Login page loaded');
      
      // Check for login form elements
      const emailInput = await this.page.locator('input[type="email"]').first();
      const passwordInput = await this.page.locator('input[type="password"]').first();
      const submitButton = await this.page.locator('button[type="submit"]').first();
      const forgotPasswordLink = await this.page.locator('a[href*="forgot"], text=/forgot.*password/i').first();
      
      if (await emailInput.count() > 0) {
        test.steps.push('✅ Email input found');
      } else {
        test.steps.push('❌ Email input not found');
      }
      
      if (await passwordInput.count() > 0) {
        test.steps.push('✅ Password input found');
      } else {
        test.steps.push('❌ Password input not found');
      }
      
      if (await submitButton.count() > 0) {
        test.steps.push('✅ Submit button found');
      } else {
        test.steps.push('❌ Submit button not found');
      }
      
      if (await forgotPasswordLink.count() > 0) {
        test.steps.push('✅ Forgot password link found');
        test.success = true;
      } else {
        test.steps.push('❌ Forgot password link not found');
      }
      
    } catch (error) {
      test.steps.push(`❌ Error during test: ${error.message}`);
      this.log(`Error testing login page: ${error.message}`, 'error');
    }
    
    this.results.tests.push(test);
    return test;
  }

  generateReport() {
    const passed = this.results.tests.filter(t => t.success).length;
    const failed = this.results.tests.filter(t => !t.success).length;
    const total = this.results.tests.length;
    
    this.results.summary = {
      total,
      passed,
      failed,
      successRate: `${((passed / total) * 100).toFixed(1)}%`,
      status: failed === 0 ? 'ALL_FORMS_FUNCTIONAL' : 'ISSUES_DETECTED'
    };
    
    this.log('\n📊 BROWSER EMAIL FLOW TEST SUMMARY', 'info');
    this.log(`Environment: ${this.baseURL}`, 'info');
    this.log(`Tests: ${passed}/${total} passed (${this.results.summary.successRate})`, passed === total ? 'success' : 'error');
    
    // Show detailed results
    this.log('\n📋 DETAILED TEST RESULTS:', 'info');
    this.results.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      this.log(`${status} ${test.name}`, test.success ? 'success' : 'error');
      test.steps.forEach(step => {
        this.log(`   ${step}`, 'info');
      });
    });
    
    if (this.results.screenshots.length > 0) {
      this.log('\n📸 SCREENSHOTS CAPTURED:', 'info');
      this.results.screenshots.forEach(screenshot => {
        this.log(`   ${screenshot.name}: ${screenshot.filename}`, 'info');
      });
    }
    
    return this.results;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.log('Browser closed', 'info');
    }
  }

  async run() {
    this.log('🚀 Starting Browser Email Flow Testing', 'info');
    this.log(`Target: ${this.baseURL}`, 'info');
    
    try {
      // Setup browser
      const setupSuccess = await this.setup();
      if (!setupSuccess) {
        throw new Error('Failed to setup browser');
      }
      
      // Run tests
      await this.testLoginPageAccess();
      await this.testForgotPasswordForm();
      await this.testRegistrationForm();
      
      // Generate report
      const results = this.generateReport();
      
      // Save results
      await fs.writeFile('browser-email-flow-results.json', JSON.stringify(results, null, 2));
      this.log('\n📄 Results saved to browser-email-flow-results.json', 'info');
      
      // Cleanup
      await this.cleanup();
      
      // Exit with appropriate code
      process.exit(results.summary.status === 'ALL_FORMS_FUNCTIONAL' ? 0 : 1);
      
    } catch (error) {
      this.log(`🚨 Critical error during testing: ${error.message}`, 'error');
      await this.cleanup();
      process.exit(1);
    }
  }
}

// Run testing if called directly
if (require.main === module) {
  const tester = new BrowserEmailFlowTester();
  tester.run().catch(console.error);
}

module.exports = BrowserEmailFlowTester;
