#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');

/* eslint-disable no-console */
console.log('🧪 FLOWORX COMPREHENSIVE UX TEST SUITE');
console.log('======================================');

const BASE_URL = 'https://app.floworx-iq.com';

// Test user scenarios
const TEST_SCENARIOS = {
  validUser: {
    email: `valid.user.${Date.now()}@example.com`,
    password: 'ValidPass123!',
    firstName: 'Valid',
    lastName: 'User',
    companyName: 'Hot Tub Paradise',
    businessType: 'hot-tub-spa'
  },
  invalidEmail: {
    email: 'invalid-email-format',
    password: 'ValidPass123!',
    firstName: 'Invalid',
    lastName: 'Email'
  },
  weakPassword: {
    email: `weak.pass.${Date.now()}@example.com`,
    password: '123',
    firstName: 'Weak',
    lastName: 'Password'
  },
  existingUser: {
    email: 'owner@hottubparadise.com', // Known existing user
    password: 'TestPassword123!',
    firstName: 'Sarah',
    lastName: 'Johnson'
  },
  sqlInjection: {
    email: `sql.test.${Date.now()}@example.com`,
    password: "'; DROP TABLE users; --",
    firstName: '<script>alert("xss")</script>',
    lastName: 'Test'
  }
};

// Comprehensive test cases
const TEST_CASES = [
  {
    name: 'Homepage Load Performance',
    category: 'Performance',
    test: async (page) => {
      const startTime = Date.now();
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;
      return {
        success: loadTime < 5000,
        message: `Page loaded in ${loadTime}ms`,
        data: { loadTime }
      };
    }
  },
  
  {
    name: 'SEO Meta Tags Validation',
    category: 'SEO',
    test: async (page) => {
      await page.goto(BASE_URL);
      const title = await page.title();
      const description = await page.getAttribute('meta[name="description"]', 'content');
      const viewport = await page.getAttribute('meta[name="viewport"]', 'content');
      
      return {
        success: title && title.length > 0 && description && viewport,
        message: `Title: "${title}", Description: ${description ? 'Present' : 'Missing'}`,
        data: { title, description, viewport }
      };
    }
  },
  
  {
    name: 'Valid User Registration',
    category: 'Authentication',
    test: async (page) => {
      await page.goto(`${BASE_URL}/register`);
      await page.waitForLoadState('networkidle');
      
      // Fill registration form
      await page.fill('input[type="email"], input[name="email"]', TEST_SCENARIOS.validUser.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_SCENARIOS.validUser.password);
      
      // Try to fill additional fields if they exist
      try {
        await page.fill('input[name="firstName"], input[name="first_name"]', TEST_SCENARIOS.validUser.firstName);
        await page.fill('input[name="lastName"], input[name="last_name"]', TEST_SCENARIOS.validUser.lastName);
      } catch (e) {
        // Fields might not exist
      }
      
      // Submit form
      await page.click('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")');
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      const hasError = await page.locator('.error, .alert-danger, [role="alert"]').count() > 0;
      
      return {
        success: !hasError && (currentUrl.includes('dashboard') || currentUrl.includes('verify') || currentUrl.includes('success')),
        message: hasError ? 'Registration failed with error' : 'Registration submitted successfully',
        data: { currentUrl, hasError }
      };
    }
  },
  
  {
    name: 'Invalid Email Format Validation',
    category: 'Validation',
    test: async (page) => {
      await page.goto(`${BASE_URL}/register`);
      await page.waitForLoadState('networkidle');
      
      await page.fill('input[type="email"], input[name="email"]', TEST_SCENARIOS.invalidEmail.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_SCENARIOS.invalidEmail.password);
      
      // Try to submit
      await page.click('button[type="submit"], button:has-text("Register")');
      await page.waitForTimeout(2000);
      
      // Check for validation error
      const hasValidationError = await page.locator('input[type="email"]:invalid, .error, .invalid-feedback').count() > 0;
      
      return {
        success: hasValidationError,
        message: hasValidationError ? 'Email validation working correctly' : 'Email validation not working',
        data: { hasValidationError }
      };
    }
  },
  
  {
    name: 'Weak Password Validation',
    category: 'Security',
    test: async (page) => {
      await page.goto(`${BASE_URL}/register`);
      await page.waitForLoadState('networkidle');
      
      await page.fill('input[type="email"], input[name="email"]', TEST_SCENARIOS.weakPassword.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_SCENARIOS.weakPassword.password);
      
      await page.click('button[type="submit"], button:has-text("Register")');
      await page.waitForTimeout(2000);
      
      const hasPasswordError = await page.locator('.error, .invalid-feedback, [data-testid="password-error"]').count() > 0;
      
      return {
        success: hasPasswordError,
        message: hasPasswordError ? 'Password validation working' : 'Weak password accepted (security risk)',
        data: { hasPasswordError }
      };
    }
  },
  
  {
    name: 'SQL Injection Protection',
    category: 'Security',
    test: async (page) => {
      await page.goto(`${BASE_URL}/register`);
      await page.waitForLoadState('networkidle');
      
      await page.fill('input[type="email"], input[name="email"]', TEST_SCENARIOS.sqlInjection.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_SCENARIOS.sqlInjection.password);
      
      try {
        await page.fill('input[name="firstName"]', TEST_SCENARIOS.sqlInjection.firstName);
      } catch (e) {
        // Field might not exist
      }
      
      await page.click('button[type="submit"], button:has-text("Register")');
      await page.waitForTimeout(3000);
      
      // Check if page is still functional (not broken by injection)
      const pageTitle = await page.title();
      const isPageBroken = pageTitle.includes('error') || pageTitle.includes('500');
      
      return {
        success: !isPageBroken,
        message: isPageBroken ? 'SQL injection vulnerability detected' : 'SQL injection protection working',
        data: { pageTitle, isPageBroken }
      };
    }
  },
  
  {
    name: 'Login with Valid Credentials',
    category: 'Authentication',
    test: async (page) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      
      // Use existing user credentials
      await page.fill('input[type="email"], input[name="email"]', TEST_SCENARIOS.existingUser.email);
      await page.fill('input[type="password"], input[name="password"]', TEST_SCENARIOS.existingUser.password);
      
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      const hasError = await page.locator('.error, .alert-danger').count() > 0;
      
      return {
        success: !hasError && (currentUrl.includes('dashboard') || currentUrl !== `${BASE_URL}/login`),
        message: hasError ? 'Login failed' : 'Login attempt processed',
        data: { currentUrl, hasError }
      };
    }
  },
  
  {
    name: 'Login with Invalid Credentials',
    category: 'Security',
    test: async (page) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      
      await page.fill('input[type="email"], input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[type="password"], input[name="password"]', 'WrongPassword123!');
      
      await page.click('button[type="submit"], button:has-text("Login")');
      await page.waitForTimeout(3000);
      
      const hasError = await page.locator('.error, .alert-danger, .invalid-feedback').count() > 0;
      const stayedOnLogin = page.url().includes('/login');
      
      return {
        success: hasError || stayedOnLogin,
        message: hasError ? 'Invalid login properly rejected' : 'Login security needs review',
        data: { hasError, stayedOnLogin }
      };
    }
  },
  
  {
    name: 'Password Reset Flow',
    category: 'Authentication',
    test: async (page) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      
      // Look for forgot password link
      const forgotPasswordLink = await page.locator('a:has-text("Forgot"), a:has-text("Reset"), a[href*="forgot"], a[href*="reset"]').first();
      
      if (await forgotPasswordLink.count() > 0) {
        await forgotPasswordLink.click();
        await page.waitForLoadState('networkidle');
        
        // Fill email for password reset
        await page.fill('input[type="email"], input[name="email"]', TEST_SCENARIOS.existingUser.email);
        await page.click('button[type="submit"], button:has-text("Reset"), button:has-text("Send")');
        await page.waitForTimeout(2000);
        
        const hasSuccess = await page.locator('.success, .alert-success, .confirmation').count() > 0;
        
        return {
          success: hasSuccess,
          message: hasSuccess ? 'Password reset flow working' : 'Password reset flow needs attention',
          data: { hasSuccess }
        };
      } else {
        return {
          success: false,
          message: 'Forgot password link not found',
          data: { linkFound: false }
        };
      }
    }
  },
  
  {
    name: 'Business Type Selection',
    category: 'Onboarding',
    test: async (page) => {
      await page.goto(`${BASE_URL}/onboarding`);
      await page.waitForLoadState('networkidle');
      
      // Look for business type options
      const businessTypes = await page.locator('input[type="radio"], .business-type, .option, select option').count();
      const hotTubOption = await page.locator('text=Hot Tub, text=Spa, [value*="hot"], [value*="spa"]').count();
      
      return {
        success: businessTypes > 0 && hotTubOption > 0,
        message: `Found ${businessTypes} business type options, Hot Tub option: ${hotTubOption > 0 ? 'Yes' : 'No'}`,
        data: { businessTypes, hotTubOption }
      };
    }
  },
  
  {
    name: 'Google OAuth Button Presence',
    category: 'OAuth',
    test: async (page) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      
      const googleButton = await page.locator('button:has-text("Continue with Google"), [data-testid="google-oauth-button"], button:has-text("Google"), a:has-text("Google"), .google-signin, [href*="oauth/google"]').count();
      
      return {
        success: googleButton > 0,
        message: googleButton > 0 ? 'Google OAuth button found' : 'Google OAuth button not found',
        data: { googleButton }
      };
    }
  },
  
  {
    name: 'Mobile Responsiveness',
    category: 'Responsive',
    test: async (page) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      
      // Check if content is still accessible
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth); // eslint-disable-line no-undef
      const viewportWidth = 375;
      const hasHorizontalScroll = bodyWidth > viewportWidth + 10; // 10px tolerance
      
      return {
        success: !hasHorizontalScroll,
        message: hasHorizontalScroll ? 'Horizontal scroll detected on mobile' : 'Mobile layout responsive',
        data: { bodyWidth, viewportWidth, hasHorizontalScroll }
      };
    }
  },
  
  {
    name: 'Accessibility - Keyboard Navigation',
    category: 'Accessibility',
    test: async (page) => {
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      
      // Test tab navigation
      await page.keyboard.press('Tab');
      const firstFocused = await page.evaluate(() => document.activeElement.tagName); // eslint-disable-line no-undef

      await page.keyboard.press('Tab');
      const secondFocused = await page.evaluate(() => document.activeElement.tagName); // eslint-disable-line no-undef
      
      return {
        success: firstFocused && secondFocused && firstFocused !== secondFocused,
        message: `Keyboard navigation: ${firstFocused} → ${secondFocused}`,
        data: { firstFocused, secondFocused }
      };
    }
  },
  
  {
    name: 'Form Validation Messages',
    category: 'UX',
    test: async (page) => {
      await page.goto(`${BASE_URL}/register`);
      await page.waitForLoadState('networkidle');
      
      // Submit empty form
      await page.click('button[type="submit"], button:has-text("Register")');
      await page.waitForTimeout(1000);
      
      const validationMessages = await page.locator('[data-testid*="-error"], [role="alert"], .text-danger, .error, .invalid-feedback, :invalid, [aria-invalid="true"]').count();
      
      return {
        success: validationMessages > 0,
        message: `Found ${validationMessages} validation messages`,
        data: { validationMessages }
      };
    }
  },
  
  {
    name: 'HTTPS Security',
    category: 'Security',
    test: async (page) => {
      await page.goto(BASE_URL);
      const url = page.url();
      const isHTTPS = url.startsWith('https://');
      
      return {
        success: isHTTPS,
        message: isHTTPS ? 'HTTPS enabled' : 'HTTPS not enabled (security risk)',
        data: { url, isHTTPS }
      };
    }
  },
  
  {
    name: 'Console Errors Check',
    category: 'Technical',
    test: async (page) => {
      const consoleErrors = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      return {
        success: consoleErrors.length === 0,
        message: `Found ${consoleErrors.length} console errors`,
        data: { consoleErrors: consoleErrors.slice(0, 5) } // Limit to first 5 errors
      };
    }
  }
];

async function runComprehensiveUXTests() {
  let browser;
  let results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    total: TEST_CASES.length,
    tests: [],
    categories: {}
  };
  
  try {
    console.log(`🚀 Starting ${TEST_CASES.length} comprehensive UX tests...\n`);
    
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 500
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    const page = await context.newPage();
    
    // Create screenshots directory
    if (!fs.existsSync('ux-test-screenshots')) {
      fs.mkdirSync('ux-test-screenshots');
    }
    
    let testIndex = 0;
    
    for (const testCase of TEST_CASES) {
      testIndex++;
      console.log(`${testIndex}/${TEST_CASES.length}. Testing: ${testCase.name} (${testCase.category})`);
      
      try {
        const result = await testCase.test(page);
        
        const testResult = {
          name: testCase.name,
          category: testCase.category,
          success: result.success,
          message: result.message,
          data: result.data,
          timestamp: new Date().toISOString()
        };
        
        results.tests.push(testResult);
        
        // Update category stats
        if (!results.categories[testCase.category]) {
          results.categories[testCase.category] = { passed: 0, failed: 0, total: 0 };
        }
        results.categories[testCase.category].total++;
        
        if (result.success) {
          results.passed++;
          results.categories[testCase.category].passed++;
          console.log(`   ✅ ${result.message}`);
        } else {
          results.failed++;
          results.categories[testCase.category].failed++;
          console.log(`   ❌ ${result.message}`);
        }
        
        // Take screenshot for important tests
        if (['Authentication', 'Security', 'Onboarding'].includes(testCase.category)) {
          await page.screenshot({ 
            path: `ux-test-screenshots/${testIndex.toString().padStart(2, '0')}-${testCase.name.replace(/[^a-zA-Z0-9]/g, '-')}.png` 
          });
        }
        
        // Small delay between tests
        await page.waitForTimeout(1000);
        
      } catch (error) {
        console.log(`   ❌ Test failed: ${error.message}`);
        results.failed++;
        results.tests.push({
          name: testCase.name,
          category: testCase.category,
          success: false,
          message: `Test error: ${error.message}`,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Generate comprehensive report
    console.log('\n📊 COMPREHENSIVE UX TEST RESULTS');
    console.log('=================================');
    console.log(`Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Results by Category:');
    for (const [category, stats] of Object.entries(results.categories)) {
      const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`   ${category}: ${stats.passed}/${stats.total} (${successRate}%)`);
    }
    
    // Save detailed results
    const reportFile = `ux-test-results-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed results saved to: ${reportFile}`);
    
    // Keep browser open for review
    console.log('\n🔍 Keeping browser open for 15 seconds for review...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error(`❌ Test suite failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  return results;
}

// Run the comprehensive test suite
if (require.main === module) {
  runComprehensiveUXTests().catch(console.error);
}

module.exports = { runComprehensiveUXTests, TEST_CASES };
