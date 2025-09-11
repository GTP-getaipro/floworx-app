#!/usr/bin/env node

const { chromium } = require('playwright');

console.log('🤖 FLOWORX AUTOMATED USER EXPERIENCE TEST');
console.log('==========================================');

const BASE_URL = 'https://app.floworx-iq.com';
const TEST_USERS = {
  primary: {
    email: `ux.test.${Date.now()}@example.com`,
    password: 'UXTest123!',
    firstName: 'UX',
    lastName: 'Tester',
    companyName: 'Test Hot Tub Paradise'
  },
  secondary: {
    email: `ux.secondary.${Date.now()}@example.com`,
    password: 'SecondaryTest123!',
    firstName: 'Secondary',
    lastName: 'User',
    companyName: 'Another Spa Business'
  },
  invalid: {
    email: 'invalid-email',
    password: '123',
    firstName: '',
    lastName: ''
  }
};

async function runAutomatedUserExperience() {
  let browser;
  let page;
  let testResults = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
  };

  try {
    console.log('🚀 Starting comprehensive automated user experience test...\n');
    console.log(`👤 Primary Test User: ${TEST_USERS.primary.email}`);
    console.log(`👤 Secondary Test User: ${TEST_USERS.secondary.email}`);
    console.log(`🎯 Target: ${BASE_URL}\n`);
    
    // Launch browser
    console.log('1. 🌐 Launching browser...');
    browser = await chromium.launch({ 
      headless: false, // Show browser for demonstration
      slowMo: 1000 // Slow down for visibility
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    page = await context.newPage();
    
    // Step 1: Visit homepage
    console.log('2. 🏠 Visiting homepage...');
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'test-screenshots/01-homepage.png' });
    console.log('   ✅ Homepage loaded');
    
    // Step 2: Navigate to registration
    console.log('3. 📝 Navigating to registration...');
    try {
      // Try multiple ways to find registration link
      const registerSelectors = [
        'a[href="/register"]',
        'a[href*="register"]',
        'text=Register',
        'text=Sign Up',
        'text=Get Started',
        '[data-testid="register-link"]'
      ];
      
      let registerLink = null;
      for (const selector of registerSelectors) {
        try {
          registerLink = await page.waitForSelector(selector, { timeout: 2000 });
          if (registerLink) break;
        } catch (e) {
          continue;
        }
      }
      
      if (registerLink) {
        await registerLink.click();
      } else {
        // Direct navigation if no link found
        await page.goto(`${BASE_URL}/register`);
      }
      
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-screenshots/02-register-page.png' });
      console.log('   ✅ Registration page loaded');
    } catch (error) {
      console.log('   ⚠️ Registration navigation failed, trying direct URL');
      await page.goto(`${BASE_URL}/register`);
      await page.waitForLoadState('networkidle');
    }
    
    // Step 3: Fill registration form
    console.log('4. 📋 Filling registration form...');
    try {
      // Wait for form elements
      await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 5000 });
      
      // Fill form fields
      const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
      await emailInput.fill(TEST_USER.email);
      
      const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
      await passwordInput.fill(TEST_USER.password);
      
      // Try to find first name field
      try {
        const firstNameInput = await page.locator('input[name="firstName"], input[name="first_name"], input[placeholder*="First"]').first();
        await firstNameInput.fill(TEST_USER.firstName);
      } catch (e) {
        console.log('   ⚠️ First name field not found');
      }
      
      // Try to find last name field
      try {
        const lastNameInput = await page.locator('input[name="lastName"], input[name="last_name"], input[placeholder*="Last"]').first();
        await lastNameInput.fill(TEST_USER.lastName);
      } catch (e) {
        console.log('   ⚠️ Last name field not found');
      }
      
      await page.screenshot({ path: 'test-screenshots/03-form-filled.png' });
      console.log('   ✅ Registration form filled');
      
      // Submit form
      const submitButton = await page.locator('button[type="submit"], button:has-text("Register"), button:has-text("Sign Up"), button:has-text("Create Account")').first();
      await submitButton.click();
      
      console.log('   ✅ Registration form submitted');
      
      // Wait for response
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-screenshots/04-registration-result.png' });
      
    } catch (error) {
      console.log(`   ❌ Registration form error: ${error.message}`);
      await page.screenshot({ path: 'test-screenshots/04-registration-error.png' });
    }
    
    // Step 4: Check for success or try login
    console.log('5. 🔐 Attempting login...');
    try {
      // Navigate to login page
      await page.goto(`${BASE_URL}/login`);
      await page.waitForLoadState('networkidle');
      
      // Fill login form
      const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
      await emailInput.fill(TEST_USER.email);
      
      const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
      await passwordInput.fill(TEST_USER.password);
      
      const loginButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
      await loginButton.click();
      
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'test-screenshots/05-login-attempt.png' });
      console.log('   ✅ Login attempted');
      
    } catch (error) {
      console.log(`   ❌ Login error: ${error.message}`);
    }
    
    // Step 5: Check current page and explore dashboard
    console.log('6. 📊 Exploring dashboard...');
    try {
      const currentUrl = page.url();
      console.log(`   📍 Current URL: ${currentUrl}`);
      
      // Take screenshot of current state
      await page.screenshot({ path: 'test-screenshots/06-current-state.png' });
      
      // Try to find dashboard elements
      const dashboardElements = await page.locator('nav, .dashboard, .sidebar, .header, .menu').count();
      console.log(`   📊 Found ${dashboardElements} dashboard elements`);
      
      // Look for business type selection
      try {
        const businessTypeElements = await page.locator('text=business, text=type, select, .business-type').count();
        if (businessTypeElements > 0) {
          console.log('   🏢 Business type selection available');
        }
      } catch (e) {
        console.log('   ⚠️ Business type selection not visible');
      }
      
    } catch (error) {
      console.log(`   ❌ Dashboard exploration error: ${error.message}`);
    }
    
    // Step 6: Test business type selection
    console.log('7. 🏢 Testing business type selection...');
    try {
      // Navigate to business types page
      await page.goto(`${BASE_URL}/onboarding`);
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-screenshots/07-onboarding.png' });
      
      // Look for Hot Tub & Spa option
      const hotTubOption = await page.locator('text=Hot Tub, text=Spa, [value*="hot"], [value*="spa"]').first();
      if (await hotTubOption.count() > 0) {
        await hotTubOption.click();
        console.log('   ✅ Hot Tub & Spa business type selected');
      } else {
        console.log('   ⚠️ Hot Tub & Spa option not found');
      }
      
      await page.screenshot({ path: 'test-screenshots/08-business-type-selected.png' });
      
    } catch (error) {
      console.log(`   ❌ Business type selection error: ${error.message}`);
    }
    
    // Step 7: Test OAuth integration
    console.log('8. 🔗 Testing OAuth integration...');
    try {
      // Look for Google OAuth button
      const googleButton = await page.locator('text=Google, .google, [href*="oauth/google"]').first();
      if (await googleButton.count() > 0) {
        console.log('   ✅ Google OAuth button found');
        // Don't actually click it to avoid OAuth flow
      } else {
        console.log('   ⚠️ Google OAuth button not found');
      }
      
      await page.screenshot({ path: 'test-screenshots/09-oauth-check.png' });
      
    } catch (error) {
      console.log(`   ❌ OAuth test error: ${error.message}`);
    }
    
    // Step 8: Explore available features
    console.log('9. 🔍 Exploring available features...');
    try {
      // Check for various UI elements
      const features = {
        'Navigation Menu': 'nav, .nav, .menu, .sidebar',
        'Dashboard Cards': '.card, .widget, .metric',
        'Forms': 'form, input, select, textarea',
        'Buttons': 'button, .btn, .button',
        'Links': 'a[href]',
        'Analytics': 'text=analytics, .analytics, .chart',
        'Workflows': 'text=workflow, .workflow',
        'Settings': 'text=settings, .settings'
      };
      
      for (const [featureName, selector] of Object.entries(features)) {
        const count = await page.locator(selector).count();
        console.log(`   ${count > 0 ? '✅' : '⚠️'} ${featureName}: ${count} elements`);
      }
      
      await page.screenshot({ path: 'test-screenshots/10-features-exploration.png' });
      
    } catch (error) {
      console.log(`   ❌ Feature exploration error: ${error.message}`);
    }
    
    // Step 9: Test responsive design
    console.log('10. 📱 Testing responsive design...');
    try {
      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-screenshots/11-mobile-view.png' });
      console.log('   ✅ Mobile view tested');
      
      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-screenshots/12-tablet-view.png' });
      console.log('   ✅ Tablet view tested');
      
      // Return to desktop
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: 'test-screenshots/13-desktop-view.png' });
      console.log('   ✅ Desktop view restored');
      
    } catch (error) {
      console.log(`   ❌ Responsive design test error: ${error.message}`);
    }
    
    // Step 10: Performance check
    console.log('11. ⚡ Checking performance...');
    try {
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          loadTime: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
          domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
          totalTime: Math.round(navigation.loadEventEnd - navigation.fetchStart)
        };
      });
      
      console.log(`   ⚡ Load Time: ${performanceMetrics.loadTime}ms`);
      console.log(`   ⚡ DOM Content Loaded: ${performanceMetrics.domContentLoaded}ms`);
      console.log(`   ⚡ Total Time: ${performanceMetrics.totalTime}ms`);
      
    } catch (error) {
      console.log(`   ❌ Performance check error: ${error.message}`);
    }
    
    console.log('\n🎉 Automated user experience test completed!');
    
    // Keep browser open for 10 seconds for review
    console.log('🔍 Keeping browser open for 10 seconds for review...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    if (page) {
      await page.screenshot({ path: 'test-screenshots/error-state.png' });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Create screenshots directory
const fs = require('fs');
if (!fs.existsSync('test-screenshots')) {
  fs.mkdirSync('test-screenshots');
}

// Run the test
runAutomatedUserExperience().catch(console.error);
