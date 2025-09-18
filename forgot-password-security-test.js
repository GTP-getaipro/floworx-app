#!/usr/bin/env node

/**
 * Forgot Password Security Validation Test
 * Tests the security fixes for pre-filled email field bug
 */

const { chromium } = require('playwright');
const fs = require('fs').promises;

class ForgotPasswordSecurityTester {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com';
    this.browser = null;
    this.page = null;
    this.results = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      baseURL: this.baseURL,
      securityTests: [],
      summary: {}
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔒',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      security: '🛡️',
      test: '🧪'
    }[level] || '🔒';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async setup() {
    this.log('Setting up browser for security testing...', 'security');
    
    try {
      this.browser = await chromium.launch({ 
        headless: false, // Set to true for CI/CD
        slowMo: 500 // Slow down for visibility
      });
      
      this.page = await this.browser.newPage();
      await this.page.setViewportSize({ width: 1280, height: 720 });
      
      this.log('Browser setup complete', 'success');
      return true;
    } catch (error) {
      this.log(`Error setting up browser: ${error.message}`, 'error');
      return false;
    }
  }

  async testEmptyEmailFieldOnLoad() {
    this.log('Testing email field is empty on initial load...', 'test');
    
    const test = {
      name: 'Empty Email Field on Load',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Navigate to forgot password page
      await this.page.goto(`${this.baseURL}/forgot-password`);
      await this.page.waitForLoadState('networkidle');
      
      test.details.push('✅ Navigated to forgot password page');

      // Check if email input exists and is empty
      const emailInput = await this.page.locator('input[type="email"]').first();
      const emailValue = await emailInput.inputValue();
      
      if (emailValue === '') {
        test.details.push('✅ Email field is empty on load');
        test.success = true;
      } else {
        test.details.push(`❌ Email field is pre-filled with: "${emailValue}"`);
        test.success = false;
      }

      // Check if field is editable
      await emailInput.fill('test@example.com');
      const newValue = await emailInput.inputValue();
      
      if (newValue === 'test@example.com') {
        test.details.push('✅ Email field is editable');
      } else {
        test.details.push('❌ Email field is not editable');
        test.success = false;
      }

    } catch (error) {
      test.details.push(`❌ Error during test: ${error.message}`);
      test.success = false;
    }

    this.results.securityTests.push(test);
    return test;
  }

  async testNoLocalStoragePersistence() {
    this.log('Testing no localStorage persistence of email data...', 'test');
    
    const test = {
      name: 'No localStorage Persistence',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Clear any existing storage first
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Navigate to forgot password page
      await this.page.goto(`${this.baseURL}/forgot-password`);
      await this.page.waitForLoadState('networkidle');
      
      // Fill email field
      const emailInput = await this.page.locator('input[type="email"]').first();
      await emailInput.fill('security-test@example.com');
      
      test.details.push('✅ Filled email field with test data');

      // Wait a moment for any potential auto-save
      await this.page.waitForTimeout(1000);

      // Check localStorage for any persisted email data
      const storedData = await this.page.evaluate(() => {
        const keys = Object.keys(localStorage);
        const emailKeys = keys.filter(key => 
          key.includes('email') || 
          key.includes('forgot') || 
          key.includes('auth') ||
          key.includes('floworx')
        );
        
        const result = {};
        emailKeys.forEach(key => {
          result[key] = localStorage.getItem(key);
        });
        
        return result;
      });

      if (Object.keys(storedData).length === 0) {
        test.details.push('✅ No email data found in localStorage');
        test.success = true;
      } else {
        test.details.push(`❌ Found persisted data: ${JSON.stringify(storedData)}`);
        test.success = false;
      }

    } catch (error) {
      test.details.push(`❌ Error during test: ${error.message}`);
      test.success = false;
    }

    this.results.securityTests.push(test);
    return test;
  }

  async testFormResetAfterSubmission() {
    this.log('Testing form reset after submission...', 'test');
    
    const test = {
      name: 'Form Reset After Submission',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Navigate to forgot password page
      await this.page.goto(`${this.baseURL}/forgot-password`);
      await this.page.waitForLoadState('networkidle');
      
      // Fill and submit form
      const emailInput = await this.page.locator('input[type="email"]').first();
      await emailInput.fill('form-reset-test@example.com');
      
      const submitButton = await this.page.locator('button[type="submit"]').first();
      await submitButton.click();
      
      test.details.push('✅ Submitted form with test email');

      // Wait for success page or response
      await this.page.waitForTimeout(3000);

      // Check if we're on success page or if form was reset
      const currentUrl = this.page.url();
      const pageContent = await this.page.textContent('body');
      
      if (pageContent.includes('Check your email') || pageContent.includes('sent you a link')) {
        test.details.push('✅ Success message displayed');
        
        // Check localStorage again after submission
        const storedDataAfterSubmit = await this.page.evaluate(() => {
          const keys = Object.keys(localStorage);
          const emailKeys = keys.filter(key => 
            key.includes('email') || 
            key.includes('forgot') || 
            key.includes('auth') ||
            key.includes('floworx')
          );
          
          const result = {};
          emailKeys.forEach(key => {
            result[key] = localStorage.getItem(key);
          });
          
          return result;
        });

        if (Object.keys(storedDataAfterSubmit).length === 0) {
          test.details.push('✅ No data persisted after successful submission');
          test.success = true;
        } else {
          test.details.push(`❌ Data still persisted after submission: ${JSON.stringify(storedDataAfterSubmit)}`);
          test.success = false;
        }
      } else {
        test.details.push('⚠️ Could not confirm successful submission');
      }

    } catch (error) {
      test.details.push(`❌ Error during test: ${error.message}`);
      test.success = false;
    }

    this.results.securityTests.push(test);
    return test;
  }

  async testSecurityAttributes() {
    this.log('Testing security attributes on email input...', 'test');
    
    const test = {
      name: 'Security Attributes',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Navigate to forgot password page
      await this.page.goto(`${this.baseURL}/forgot-password`);
      await this.page.waitForLoadState('networkidle');
      
      // Check email input attributes
      const emailInput = await this.page.locator('input[type="email"]').first();
      
      const attributes = await emailInput.evaluate(el => ({
        autoComplete: el.getAttribute('autocomplete'),
        autoCorrect: el.getAttribute('autocorrect'),
        autoCapitalize: el.getAttribute('autocapitalize'),
        spellCheck: el.getAttribute('spellcheck')
      }));

      test.details.push(`Email input attributes: ${JSON.stringify(attributes)}`);

      // Check for security attributes
      let securityScore = 0;
      
      if (attributes.autoComplete === 'off') {
        test.details.push('✅ autoComplete="off" set');
        securityScore++;
      } else {
        test.details.push('❌ autoComplete not disabled');
      }

      if (attributes.autoCorrect === 'off') {
        test.details.push('✅ autoCorrect="off" set');
        securityScore++;
      }

      if (attributes.autoCapitalize === 'off') {
        test.details.push('✅ autoCapitalize="off" set');
        securityScore++;
      }

      if (attributes.spellCheck === 'false') {
        test.details.push('✅ spellCheck="false" set');
        securityScore++;
      }

      test.success = securityScore >= 2; // At least autoComplete should be off
      test.details.push(`Security score: ${securityScore}/4`);

    } catch (error) {
      test.details.push(`❌ Error during test: ${error.message}`);
      test.success = false;
    }

    this.results.securityTests.push(test);
    return test;
  }

  async testCrossBrowserSessionIsolation() {
    this.log('Testing cross-browser session isolation...', 'test');
    
    const test = {
      name: 'Cross-Browser Session Isolation',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      // First session: fill email and close
      await this.page.goto(`${this.baseURL}/forgot-password`);
      await this.page.waitForLoadState('networkidle');
      
      const emailInput = await this.page.locator('input[type="email"]').first();
      await emailInput.fill('session-test@example.com');
      
      test.details.push('✅ First session: filled email field');

      // Close and reopen page (simulating new session)
      await this.page.close();
      this.page = await this.browser.newPage();
      await this.page.setViewportSize({ width: 1280, height: 720 });
      
      // Navigate again
      await this.page.goto(`${this.baseURL}/forgot-password`);
      await this.page.waitForLoadState('networkidle');
      
      // Check if email field is empty in new session
      const newEmailInput = await this.page.locator('input[type="email"]').first();
      const newEmailValue = await newEmailInput.inputValue();
      
      if (newEmailValue === '') {
        test.details.push('✅ Email field is empty in new session');
        test.success = true;
      } else {
        test.details.push(`❌ Email field pre-filled in new session: "${newEmailValue}"`);
        test.success = false;
      }

    } catch (error) {
      test.details.push(`❌ Error during test: ${error.message}`);
      test.success = false;
    }

    this.results.securityTests.push(test);
    return test;
  }

  generateReport() {
    const passed = this.results.securityTests.filter(t => t.success).length;
    const failed = this.results.securityTests.filter(t => !t.success).length;
    const total = this.results.securityTests.length;
    
    this.results.summary = {
      total,
      passed,
      failed,
      successRate: `${((passed / total) * 100).toFixed(1)}%`,
      securityStatus: failed === 0 ? 'SECURE' : 'VULNERABILITIES_DETECTED'
    };

    this.log('\n📊 FORGOT PASSWORD SECURITY TEST SUMMARY', 'info');
    this.log(`Environment: ${this.baseURL}`, 'info');
    this.log(`Tests: ${passed}/${total} passed (${this.results.summary.successRate})`, passed === total ? 'success' : 'error');
    this.log(`Security Status: ${this.results.summary.securityStatus}`, this.results.summary.securityStatus === 'SECURE' ? 'success' : 'error');

    // Show detailed results
    this.log('\n📋 DETAILED SECURITY TEST RESULTS:', 'info');
    this.results.securityTests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      this.log(`${status} ${test.name}`, test.success ? 'success' : 'error');
      test.details.forEach(detail => {
        this.log(`   ${detail}`, 'info');
      });
    });

    return this.results;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.log('Browser closed', 'info');
    }
  }

  async run() {
    this.log('🚀 Starting Forgot Password Security Testing', 'security');
    this.log(`Target: ${this.baseURL}`, 'info');

    try {
      // Setup browser
      const setupSuccess = await this.setup();
      if (!setupSuccess) {
        throw new Error('Failed to setup browser');
      }

      // Run security tests
      await this.testEmptyEmailFieldOnLoad();
      await this.testNoLocalStoragePersistence();
      await this.testFormResetAfterSubmission();
      await this.testSecurityAttributes();
      await this.testCrossBrowserSessionIsolation();

      // Generate report
      const results = this.generateReport();

      // Save results
      await fs.writeFile('forgot-password-security-results.json', JSON.stringify(results, null, 2));
      this.log('\n📄 Results saved to forgot-password-security-results.json', 'info');

      // Cleanup
      await this.cleanup();

      // Exit with appropriate code
      process.exit(results.summary.securityStatus === 'SECURE' ? 0 : 1);

    } catch (error) {
      this.log(`🚨 Critical error during security testing: ${error.message}`, 'error');
      await this.cleanup();
      process.exit(1);
    }
  }
}

// Run testing if called directly
if (require.main === module) {
  const tester = new ForgotPasswordSecurityTester();
  tester.run().catch(console.error);
}

module.exports = ForgotPasswordSecurityTester;
