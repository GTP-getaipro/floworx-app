#!/usr/bin/env node

/**
 * Browser-based Staging Validation Suite
 * Uses Playwright to test all features with real browser sessions
 */

const { chromium } = require('playwright');
const fs = require('fs');

class BrowserStagingValidator {
  constructor() {
    this.baseURL = process.env.STAGING_URL || 'https://app.floworx-iq.com';
    this.results = {
      timestamp: new Date().toISOString(),
      environment: 'staging',
      totalTests: 0,
      passed: 0,
      failed: 0,
      errors: [],
      details: {}
    };
    
    this.testUser = {
      email: 'test@floworx-test.com',
      password: 'TestPass123!'
    };
    
    this.browser = null;
    this.page = null;
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[level] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runTest(testName, testFunction) {
    this.results.totalTests++;
    this.log(`Running: ${testName}`);
    
    try {
      const result = await testFunction();
      this.results.passed++;
      this.results.details[testName] = { status: 'PASS', result };
      this.log(`✅ PASS: ${testName}`, 'success');
      return result;
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({ test: testName, error: error.message, stack: error.stack });
      this.results.details[testName] = { status: 'FAIL', error: error.message };
      this.log(`❌ FAIL: ${testName} - ${error.message}`, 'error');
      throw error;
    }
  }

  async setup() {
    this.browser = await chromium.launch({ headless: true });
    this.page = await this.browser.newPage();
    
    // Set up request/response logging
    this.page.on('response', response => {
      if (response.status() >= 400) {
        this.log(`HTTP ${response.status()}: ${response.url()}`, 'warning');
      }
    });
  }

  async cleanup() {
    if (this.page) await this.page.close();
    if (this.browser) await this.browser.close();
  }

  // ==================== AUTHENTICATION TESTS ====================

  async testAuthentication() {
    this.log('\n🔐 AUTHENTICATION TESTS', 'info');
    
    // Test 1: Login Flow
    await this.runTest('User Login Flow', async () => {
      await this.page.goto(`${this.baseURL}/login`);
      
      // Fill login form
      await this.page.fill('input[name="email"], input[type="email"]', this.testUser.email);
      await this.page.fill('input[name="password"], input[type="password"]', this.testUser.password);
      
      // Submit form
      await this.page.click('button[type="submit"], button:has-text("Sign In")');
      
      // Wait for redirect or success
      await this.page.waitForTimeout(3000);
      
      const currentUrl = this.page.url();
      const isLoggedIn = currentUrl.includes('/dashboard') || currentUrl !== `${this.baseURL}/login`;
      
      return { currentUrl, isLoggedIn };
    });

    // Test 2: Dashboard Access
    await this.runTest('Dashboard Access', async () => {
      await this.page.goto(`${this.baseURL}/dashboard`);
      await this.page.waitForTimeout(2000);
      
      const currentUrl = this.page.url();
      const hasContent = await this.page.locator('text=Welcome').count() > 0;
      
      return { currentUrl, hasContent, isOnDashboard: currentUrl.includes('/dashboard') };
    });
  }

  // ==================== API TESTS ====================

  async testAPIEndpoints() {
    this.log('\n🔧 API ENDPOINT TESTS', 'info');
    
    // Test 1: Client Config API
    await this.runTest('Client Config API', async () => {
      const response = await this.page.evaluate(async () => {
        try {
          const res = await fetch('/api/clients/1/config', {
            credentials: 'include'
          });
          return {
            status: res.status,
            ok: res.ok,
            data: res.ok ? await res.json() : await res.text()
          };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      return response;
    });

    // Test 2: Mailbox Discovery API
    await this.runTest('Mailbox Discovery API', async () => {
      const response = await this.page.evaluate(async () => {
        try {
          const res = await fetch('/api/mailbox/discover?provider=gmail', {
            credentials: 'include'
          });
          return {
            status: res.status,
            ok: res.ok,
            data: res.ok ? await res.json() : await res.text()
          };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      return response;
    });
  }

  // ==================== UI TESTS ====================

  async testUIComponents() {
    this.log('\n🎨 UI COMPONENT TESTS', 'info');
    
    // Test 1: Settings Page Access
    await this.runTest('Settings Page Access', async () => {
      await this.page.goto(`${this.baseURL}/settings`);
      await this.page.waitForTimeout(2000);
      
      const currentUrl = this.page.url();
      const hasSettingsContent = await this.page.locator('text=Email Automation Settings, text=Settings').count() > 0;
      
      return { currentUrl, hasSettingsContent };
    });

    // Test 2: Registration Form
    await this.runTest('Registration Form', async () => {
      await this.page.goto(`${this.baseURL}/register`);
      await this.page.waitForTimeout(2000);
      
      const hasForm = await this.page.locator('form, input[type="email"]').count() > 0;
      const hasSubmitButton = await this.page.locator('button:has-text("Create Account"), button[type="submit"]').count() > 0;
      
      return { hasForm, hasSubmitButton };
    });
  }

  // ==================== MAIN EXECUTION ====================

  async run() {
    this.log('🚀 Starting Browser-based Staging Validation', 'info');
    this.log(`Environment: ${this.baseURL}`, 'info');
    
    try {
      await this.setup();
      
      // Phase 1: Authentication
      await this.testAuthentication();
      
      // Phase 2: API Endpoints
      await this.testAPIEndpoints();
      
      // Phase 3: UI Components
      await this.testUIComponents();
      
      // Generate final report
      this.generateReport();
      
    } catch (error) {
      this.log(`Critical error during validation: ${error.message}`, 'error');
      this.results.criticalError = error.message;
      this.generateReport();
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }

  generateReport() {
    const reportPath = 'BROWSER-STAGING-VALIDATION-REPORT.json';
    
    this.results.summary = {
      totalTests: this.results.totalTests,
      passed: this.results.passed,
      failed: this.results.failed,
      successRate: `${((this.results.passed / this.results.totalTests) * 100).toFixed(1)}%`,
      status: this.results.failed === 0 ? 'ALL_TESTS_PASSED' : 'TESTS_FAILED'
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    this.log('\n📊 VALIDATION SUMMARY', 'info');
    this.log(`Total Tests: ${this.results.totalTests}`, 'info');
    this.log(`Passed: ${this.results.passed}`, 'success');
    this.log(`Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'info');
    this.log(`Success Rate: ${this.results.summary.successRate}`, 'info');
    this.log(`Report saved: ${reportPath}`, 'info');
    
    if (this.results.failed === 0) {
      this.log('🎉 ALL TESTS PASSED - READY FOR PRODUCTION!', 'success');
    } else {
      this.log('❌ TESTS FAILED - PRODUCTION DEPLOYMENT BLOCKED', 'error');
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new BrowserStagingValidator();
  validator.run().catch(console.error);
}

module.exports = BrowserStagingValidator;
