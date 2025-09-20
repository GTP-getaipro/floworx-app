#!/usr/bin/env node

/**
 * FloWorx Browser-based End-to-End Authentication Validation
 * 
 * This system uses Playwright to perform actual browser testing of authentication flows
 * including JavaScript error detection and UI interaction validation
 * 
 * SAFETY PRINCIPLES:
 * - Only runs in staging/UAT environments
 * - HUMAN APPROVAL required for production deployment
 * - NO AUTONOMOUS production fixes or deployments
 * - Detects JavaScript TypeErrors and console errors
 * - Validates actual user experience
 * - Non-intrusive production monitoring only
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

class BrowserAuthenticationValidator {
  constructor(config = {}) {
    this.config = {
      stagingUrl: config.stagingUrl || 'https://staging.app.floworx-iq.com',
      productionUrl: config.productionUrl || 'https://app.floworx-iq.com',
      headless: config.headless !== false, // Default to headless
      timeout: config.timeout || 30000,
      ...config
    };
    
    this.browser = null;
    this.context = null;
    this.page = null;
    this.consoleErrors = [];
    this.jsErrors = [];
    this.testResults = [];
  }

  /**
   * Initialize browser for testing
   */
  async initializeBrowser() {
    console.log('🌐 Initializing browser for E2E testing...');
    
    this.browser = await chromium.launch({ 
      headless: this.config.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'FloWorx-E2E-Validator/1.0'
    });
    
    this.page = await this.context.newPage();
    
    // Capture console errors
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.consoleErrors.push({
          timestamp: new Date().toISOString(),
          message: msg.text(),
          location: msg.location()
        });
      }
    });
    
    // Capture JavaScript errors
    this.page.on('pageerror', (error) => {
      this.jsErrors.push({
        timestamp: new Date().toISOString(),
        message: error.message,
        stack: error.stack
      });
    });
    
    console.log('✅ Browser initialized successfully');
  }

  /**
   * Cleanup browser resources
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      console.log('🧹 Browser cleanup completed');
    }
  }

  /**
   * STAGING E2E VALIDATION
   * Comprehensive browser-based testing of all authentication flows
   */
  async validateStagingE2E() {
    console.log('\n🎭 BROWSER E2E VALIDATION - STAGING ENVIRONMENT');
    console.log('=' .repeat(60));
    console.log(`🎯 Target: ${this.config.stagingUrl}`);
    console.log(`⏰ Started: ${new Date().toISOString()}\n`);

    const validationResults = {
      timestamp: new Date().toISOString(),
      environment: 'staging',
      url: this.config.stagingUrl,
      browser: 'chromium',
      tests: [],
      consoleErrors: [],
      jsErrors: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
      },
      recommendation: 'PENDING'
    };

    try {
      await this.initializeBrowser();

      // Test 1: Registration Flow UI
      console.log('📝 Testing Registration Flow UI...');
      const registrationTests = await this.testRegistrationFlowUI();
      validationResults.tests.push(...registrationTests);

      // Test 2: Login Flow UI
      console.log('🔐 Testing Login Flow UI...');
      const loginTests = await this.testLoginFlowUI();
      validationResults.tests.push(...loginTests);

      // Test 3: Error Handling UI
      console.log('⚠️  Testing Error Handling UI...');
      const errorTests = await this.testErrorHandlingUI();
      validationResults.tests.push(...errorTests);

      // Test 4: JavaScript Error Detection
      console.log('🐛 Testing JavaScript Error Detection...');
      const jsErrorTests = await this.testJavaScriptErrors();
      validationResults.tests.push(...jsErrorTests);

      // Collect all errors
      validationResults.consoleErrors = this.consoleErrors;
      validationResults.jsErrors = this.jsErrors;

      // Calculate summary
      validationResults.summary.total = validationResults.tests.length;
      validationResults.summary.passed = validationResults.tests.filter(t => t.status === 'PASS').length;
      validationResults.summary.failed = validationResults.tests.filter(t => t.status === 'FAIL').length;
      validationResults.summary.errors = validationResults.tests
        .filter(t => t.status === 'FAIL')
        .map(t => ({ test: t.name, error: t.error }));

      // Check for critical JavaScript errors
      const criticalJSErrors = this.jsErrors.filter(error => 
        error.message.includes('TypeError') || 
        error.message.includes('is not a function') ||
        error.message.includes('Cannot read properties of undefined')
      );

      if (criticalJSErrors.length > 0) {
        validationResults.summary.errors.push({
          test: 'JavaScript Errors',
          error: `${criticalJSErrors.length} critical JavaScript errors detected`
        });
        validationResults.summary.failed++;
      }

      // Determine recommendation
      if (validationResults.summary.failed === 0 && criticalJSErrors.length === 0) {
        validationResults.recommendation = 'APPROVED_FOR_PRODUCTION';
        console.log('\n✅ BROWSER E2E VALIDATION: PASSED');
        console.log('🎉 All authentication flows working correctly in browser');
        console.log('🚫 No JavaScript TypeErrors or critical errors detected');
      } else {
        validationResults.recommendation = 'REJECTED_NEEDS_FIXES';
        console.log('\n❌ BROWSER E2E VALIDATION: FAILED');
        console.log('🚨 Critical UI/JavaScript issues detected');
        if (criticalJSErrors.length > 0) {
          console.log(`💥 ${criticalJSErrors.length} JavaScript errors found:`);
          criticalJSErrors.forEach(error => {
            console.log(`   • ${error.message}`);
          });
        }
      }

    } catch (error) {
      validationResults.summary.errors.push({
        test: 'BROWSER_SYSTEM_ERROR',
        error: error.message
      });
      validationResults.recommendation = 'SYSTEM_ERROR';
      console.log('\n💥 BROWSER SYSTEM ERROR');
      console.log('🚨 E2E validation system failure');
    } finally {
      await this.cleanup();
    }

    // Save detailed results
    await this.saveE2EReport(validationResults, 'staging');
    
    return validationResults;
  }

  /**
   * Test Registration Flow UI
   */
  async testRegistrationFlowUI() {
    const tests = [];
    
    try {
      // Navigate to registration page
      await this.page.goto(`${this.config.stagingUrl}/register`, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      // Test 1.1: Page loads without errors
      const pageTitle = await this.page.title();
      tests.push({
        name: 'Registration Page - Loads Successfully',
        status: pageTitle.includes('FloWorx') ? 'PASS' : 'FAIL',
        error: pageTitle.includes('FloWorx') ? null : `Page title: ${pageTitle}`,
        details: { pageTitle, url: this.page.url() }
      });

      // Test 1.2: Form elements are present
      const emailInput = await this.page.locator('[data-testid="email-input"], input[name="email"]').first();
      const passwordInput = await this.page.locator('[data-testid="password-input"], input[name="password"]').first();
      const submitButton = await this.page.locator('[data-testid="register-button"], button[type="submit"]').first();

      const elementsPresent = await emailInput.isVisible() && 
                             await passwordInput.isVisible() && 
                             await submitButton.isVisible();

      tests.push({
        name: 'Registration Form - Elements Present',
        status: elementsPresent ? 'PASS' : 'FAIL',
        error: elementsPresent ? null : 'Required form elements not found',
        details: {
          emailVisible: await emailInput.isVisible(),
          passwordVisible: await passwordInput.isVisible(),
          submitVisible: await submitButton.isVisible()
        }
      });

      // Test 1.3: Form validation works
      if (elementsPresent) {
        await emailInput.fill('invalid-email');
        await passwordInput.fill('123');
        await submitButton.click();
        
        // Wait for validation errors
        await this.page.waitForTimeout(2000);
        
        const hasValidationErrors = await this.page.locator('.error, .error-message, [class*="error"]').count() > 0;
        
        tests.push({
          name: 'Registration Form - Validation Works',
          status: hasValidationErrors ? 'PASS' : 'FAIL',
          error: hasValidationErrors ? null : 'Form validation not working',
          details: { validationErrorsFound: hasValidationErrors }
        });
      }

    } catch (error) {
      tests.push({
        name: 'Registration Flow UI - System Error',
        status: 'FAIL',
        error: error.message,
        details: null
      });
    }

    return tests;
  }

  /**
   * Test Login Flow UI
   */
  async testLoginFlowUI() {
    const tests = [];
    
    try {
      // Navigate to login page
      await this.page.goto(`${this.config.stagingUrl}/login`, { 
        waitUntil: 'networkidle',
        timeout: this.config.timeout 
      });

      // Test 2.1: Page loads without errors
      const pageTitle = await this.page.title();
      tests.push({
        name: 'Login Page - Loads Successfully',
        status: pageTitle.includes('FloWorx') ? 'PASS' : 'FAIL',
        error: pageTitle.includes('FloWorx') ? null : `Page title: ${pageTitle}`,
        details: { pageTitle, url: this.page.url() }
      });

      // Test 2.2: Form elements are present
      const emailInput = await this.page.locator('[data-testid="email-input"], input[name="email"]').first();
      const passwordInput = await this.page.locator('[data-testid="password-input"], input[name="password"]').first();
      const submitButton = await this.page.locator('[data-testid="login-button"], button[type="submit"]').first();

      const elementsPresent = await emailInput.isVisible() && 
                             await passwordInput.isVisible() && 
                             await submitButton.isVisible();

      tests.push({
        name: 'Login Form - Elements Present',
        status: elementsPresent ? 'PASS' : 'FAIL',
        error: elementsPresent ? null : 'Required form elements not found',
        details: {
          emailVisible: await emailInput.isVisible(),
          passwordVisible: await passwordInput.isVisible(),
          submitVisible: await submitButton.isVisible()
        }
      });

      // Test 2.3: Invalid login shows proper error
      if (elementsPresent) {
        await emailInput.fill('test@example.com');
        await passwordInput.fill('wrongpassword');
        await submitButton.click();
        
        // Wait for response
        await this.page.waitForTimeout(3000);
        
        const hasErrorMessage = await this.page.locator('.error, .error-message, [class*="error"]').count() > 0;
        
        tests.push({
          name: 'Login Form - Error Handling',
          status: hasErrorMessage ? 'PASS' : 'FAIL',
          error: hasErrorMessage ? null : 'Login error not displayed properly',
          details: { errorMessageFound: hasErrorMessage }
        });
      }

    } catch (error) {
      tests.push({
        name: 'Login Flow UI - System Error',
        status: 'FAIL',
        error: error.message,
        details: null
      });
    }

    return tests;
  }

  /**
   * Test Error Handling UI
   */
  async testErrorHandlingUI() {
    const tests = [];

    try {
      // Test navigation between pages clears errors
      await this.page.goto(`${this.config.stagingUrl}/register`, { waitUntil: 'networkidle' });

      // Create an error state
      const emailInput = await this.page.locator('input[name="email"]').first();
      const submitButton = await this.page.locator('button[type="submit"]').first();

      if (await emailInput.isVisible() && await submitButton.isVisible()) {
        await emailInput.fill('invalid-email');
        await submitButton.click();
        await this.page.waitForTimeout(2000);

        // Navigate to login page
        await this.page.goto(`${this.config.stagingUrl}/login`, { waitUntil: 'networkidle' });
        await this.page.waitForTimeout(1000);

        // Check if errors are cleared
        const errorsCleared = await this.page.locator('.error, .error-message').count() === 0;

        tests.push({
          name: 'Error Handling - Navigation Clears Errors',
          status: errorsCleared ? 'PASS' : 'FAIL',
          error: errorsCleared ? null : 'Errors persist across page navigation',
          details: { errorsCleared }
        });
      }

    } catch (error) {
      tests.push({
        name: 'Error Handling UI - System Error',
        status: 'FAIL',
        error: error.message,
        details: null
      });
    }

    return tests;
  }

  /**
   * Test JavaScript Error Detection
   */
  async testJavaScriptErrors() {
    const tests = [];

    // Clear previous errors
    this.consoleErrors = [];
    this.jsErrors = [];

    try {
      // Visit all auth pages and check for JS errors
      const pages = ['/login', '/register'];

      for (const pagePath of pages) {
        await this.page.goto(`${this.config.stagingUrl}${pagePath}`, {
          waitUntil: 'networkidle',
          timeout: this.config.timeout
        });

        // Wait for any async JavaScript to execute
        await this.page.waitForTimeout(3000);

        // Interact with the page to trigger any event handlers
        try {
          const inputs = await this.page.locator('input').all();
          for (const input of inputs.slice(0, 3)) { // Limit to first 3 inputs
            if (await input.isVisible()) {
              await input.click();
              await input.fill('test');
              await input.clear();
            }
          }
        } catch (e) {
          // Ignore interaction errors, focus on JS errors
        }

        await this.page.waitForTimeout(2000);
      }

      // Check for TypeErrors specifically
      const typeErrors = this.jsErrors.filter(error =>
        error.message.includes('TypeError') ||
        error.message.includes('is not a function') ||
        error.message.includes('Cannot read properties of undefined')
      );

      tests.push({
        name: 'JavaScript - No TypeError Detected',
        status: typeErrors.length === 0 ? 'PASS' : 'FAIL',
        error: typeErrors.length === 0 ? null : `${typeErrors.length} TypeErrors detected`,
        details: {
          totalJSErrors: this.jsErrors.length,
          typeErrors: typeErrors.length,
          errors: typeErrors.map(e => e.message)
        }
      });

      // Check for console errors
      const criticalConsoleErrors = this.consoleErrors.filter(error =>
        !error.message.includes('favicon') && // Ignore favicon errors
        !error.message.includes('404') // Ignore 404s for non-critical resources
      );

      tests.push({
        name: 'Console - No Critical Errors',
        status: criticalConsoleErrors.length === 0 ? 'PASS' : 'FAIL',
        error: criticalConsoleErrors.length === 0 ? null : `${criticalConsoleErrors.length} console errors detected`,
        details: {
          totalConsoleErrors: this.consoleErrors.length,
          criticalErrors: criticalConsoleErrors.length,
          errors: criticalConsoleErrors.map(e => e.message)
        }
      });

    } catch (error) {
      tests.push({
        name: 'JavaScript Error Detection - System Error',
        status: 'FAIL',
        error: error.message,
        details: null
      });
    }

    return tests;
  }

  /**
   * PRODUCTION HEALTH CHECK (Non-intrusive)
   */
  async performProductionHealthCheck() {
    console.log('\n🔍 PRODUCTION HEALTH CHECK - NON-INTRUSIVE');
    console.log('=' .repeat(50));
    console.log(`🎯 Target: ${this.config.productionUrl}`);

    const healthCheck = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      url: this.config.productionUrl,
      status: 'HEALTHY',
      checks: [],
      jsErrors: [],
      consoleErrors: []
    };

    try {
      await this.initializeBrowser();

      // Check 1: Login page loads
      await this.page.goto(`${this.config.productionUrl}/login`, {
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeout
      });

      const pageLoaded = await this.page.title();
      healthCheck.checks.push({
        name: 'Login Page Load',
        status: pageLoaded.includes('FloWorx') ? 'PASS' : 'FAIL',
        details: { title: pageLoaded }
      });

      // Wait for page to fully load and check for immediate JS errors
      await this.page.waitForTimeout(5000);

      // Check for critical JavaScript errors
      const criticalErrors = this.jsErrors.filter(error =>
        error.message.includes('TypeError') ||
        error.message.includes('is not a function')
      );

      healthCheck.checks.push({
        name: 'No Critical JS Errors',
        status: criticalErrors.length === 0 ? 'PASS' : 'FAIL',
        details: {
          errorCount: criticalErrors.length,
          errors: criticalErrors.map(e => e.message)
        }
      });

      healthCheck.jsErrors = this.jsErrors;
      healthCheck.consoleErrors = this.consoleErrors;

      // Determine overall health
      const failedChecks = healthCheck.checks.filter(check => check.status === 'FAIL');
      if (failedChecks.length > 0) {
        healthCheck.status = 'UNHEALTHY';
        healthCheck.issues = failedChecks.map(check => check.name);
      }

    } catch (error) {
      healthCheck.status = 'ERROR';
      healthCheck.error = error.message;
    } finally {
      await this.cleanup();
    }

    return healthCheck;
  }

  /**
   * Save E2E report to file
   */
  async saveE2EReport(results, environment) {
    const reportsDir = './reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `${environment}-e2e-report-${Date.now()}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    console.log(`📄 E2E report saved: ${filepath}`);
  }
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🎭 FloWorx Browser E2E Authentication Validator');
  console.log('=' .repeat(60));

  const validator = new BrowserAuthenticationValidator();

  switch (command) {
    case '--validate-staging-e2e':
    case '--staging-e2e':
      const results = await validator.validateStagingE2E();
      process.exit(results.recommendation === 'APPROVED_FOR_PRODUCTION' ? 0 : 1);
      break;

    case '--production-health':
      const healthCheck = await validator.performProductionHealthCheck();
      console.log('\n📊 PRODUCTION HEALTH CHECK RESULTS:');
      console.log(JSON.stringify(healthCheck, null, 2));
      process.exit(healthCheck.status === 'HEALTHY' ? 0 : 1);
      break;

    case '--help':
    case '-h':
    default:
      console.log('📖 USAGE:');
      console.log('  node browser-e2e-validation.js [command]');
      console.log('\n🔧 COMMANDS:');
      console.log('  --validate-staging-e2e  Run full E2E validation on staging');
      console.log('  --production-health     Non-intrusive production health check');
      console.log('  --help                  Show this help message');
      console.log('\n🎭 BROWSER TESTING:');
      console.log('  • Detects JavaScript TypeErrors and console errors');
      console.log('  • Validates actual user interface interactions');
      console.log('  • Tests form validation and error handling');
      console.log('  • Non-intrusive production monitoring only');
      break;
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Graceful shutdown initiated...');
  process.exit(0);
});

// Run main function
if (require.main === module) {
  main().catch((error) => {
    console.error('\n💥 E2E SYSTEM ERROR:', error.message);
    process.exit(1);
  });
}
