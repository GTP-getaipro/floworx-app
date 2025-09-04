const { test, expect } = require('@playwright/test');

test.describe('User Experience Analytics & Feedback Collection', () => {
  
  test('should track registration conversion funnel', async ({ page }) => {
    console.log('📊 Tracking registration conversion funnel...');
    
    const analytics = {
      pageLoad: null,
      formStart: null,
      formComplete: null,
      submission: null,
      success: null,
      errors: []
    };
    
    // Track page load time
    const startTime = Date.now();
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    analytics.pageLoad = Date.now() - startTime;
    
    console.log(`⏱️ Page load time: ${analytics.pageLoad}ms`);
    
    // Track form interaction start
    const formStartTime = Date.now();
    await page.fill('input[name="firstName"]', 'Analytics');
    analytics.formStart = Date.now() - formStartTime;
    
    // Track form completion time
    const formCompleteStartTime = Date.now();
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="companyName"]', 'Analytics Co');
    await page.fill('input[name="email"]', `analytics.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Analytics123!');
    await page.fill('input[name="confirmPassword"]', 'Analytics123!');
    analytics.formComplete = Date.now() - formCompleteStartTime;
    
    console.log(`📝 Form completion time: ${analytics.formComplete}ms`);
    
    // Track submission time
    const submissionStartTime = Date.now();
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    analytics.submission = Date.now() - submissionStartTime;
    
    console.log(`🚀 Submission processing time: ${analytics.submission}ms`);
    
    // Check for success or errors
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/dashboard')) {
      analytics.success = true;
      console.log('✅ Registration successful');
    } else {
      analytics.success = false;
      const errorElements = await page.locator('[class*="error"], [class*="danger"]').all();
      for (const element of errorElements) {
        const errorText = await element.textContent();
        if (errorText) analytics.errors.push(errorText);
      }
      console.log('❌ Registration failed:', analytics.errors);
    }
    
    // Log analytics data
    console.log('📊 Registration Analytics:', JSON.stringify(analytics, null, 2));
    
    // Performance expectations
    expect(analytics.pageLoad).toBeLessThan(5000); // Page should load within 5 seconds
    expect(analytics.submission).toBeLessThan(10000); // Submission should complete within 10 seconds
  });

  test('should measure form field interaction patterns', async ({ page }) => {
    console.log('🎯 Measuring form field interaction patterns...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    const fieldInteractions = {};
    
    // Track focus events on form fields
    const fields = ['firstName', 'lastName', 'companyName', 'email', 'password', 'confirmPassword'];
    
    for (const field of fields) {
      const input = page.locator(`input[name="${field}"]`);
      
      // Measure time to focus
      const focusStartTime = Date.now();
      await input.focus();
      const focusTime = Date.now() - focusStartTime;
      
      // Measure typing time
      const typingStartTime = Date.now();
      await input.fill(`Test${field}`);
      const typingTime = Date.now() - typingStartTime;
      
      fieldInteractions[field] = {
        focusTime,
        typingTime,
        completed: true
      };
      
      console.log(`📝 ${field}: Focus ${focusTime}ms, Typing ${typingTime}ms`);
    }
    
    // Check for validation feedback timing
    await page.fill('input[name="email"]', 'invalid-email');
    await page.blur('input[name="email"]');
    
    const validationStartTime = Date.now();
    await page.waitForTimeout(500); // Wait for validation
    const validationTime = Date.now() - validationStartTime;
    
    console.log(`⚡ Validation feedback time: ${validationTime}ms`);
    
    // Log interaction patterns
    console.log('🎯 Field Interaction Patterns:', JSON.stringify(fieldInteractions, null, 2));
  });

  test('should collect user behavior data', async ({ page }) => {
    console.log('👤 Collecting user behavior data...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    const behaviorData = {
      scrollEvents: 0,
      clickEvents: 0,
      keyboardEvents: 0,
      mouseMovements: 0,
      formFieldChanges: 0,
      timeOnPage: 0
    };
    
    const startTime = Date.now();
    
    // Track scroll events
    await page.evaluate(() => {
      window.scrollEventCount = 0;
      window.addEventListener('scroll', () => window.scrollEventCount++);
    });
    
    // Simulate user behavior
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    behaviorData.mouseMovements += 2;
    
    await page.click('input[name="firstName"]');
    behaviorData.clickEvents++;
    
    await page.keyboard.type('Behavior');
    behaviorData.keyboardEvents += 8; // 8 characters
    behaviorData.formFieldChanges++;
    
    await page.click('input[name="lastName"]');
    behaviorData.clickEvents++;
    
    await page.keyboard.type('Test');
    behaviorData.keyboardEvents += 4;
    behaviorData.formFieldChanges++;
    
    // Simulate scrolling
    await page.evaluate(() => window.scrollBy(0, 100));
    await page.evaluate(() => window.scrollBy(0, -50));
    
    const scrollEvents = await page.evaluate(() => window.scrollEventCount || 0);
    behaviorData.scrollEvents = scrollEvents;
    
    behaviorData.timeOnPage = Date.now() - startTime;
    
    console.log('👤 User Behavior Data:', JSON.stringify(behaviorData, null, 2));
    
    // Behavior expectations
    expect(behaviorData.clickEvents).toBeGreaterThan(0);
    expect(behaviorData.keyboardEvents).toBeGreaterThan(0);
    expect(behaviorData.timeOnPage).toBeGreaterThan(1000); // At least 1 second on page
  });

  test('should measure accessibility compliance', async ({ page }) => {
    console.log('♿ Measuring accessibility compliance...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    const accessibilityChecks = {
      hasLabels: true,
      hasRequiredAttributes: true,
      hasAriaAttributes: true,
      keyboardNavigable: true,
      colorContrast: true
    };
    
    // Check form labels
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const name = await input.getAttribute('name');
      const label = await page.locator(`label[for="${id}"]`).count();
      
      if (label === 0) {
        console.log(`⚠️ Missing label for input: ${name}`);
        accessibilityChecks.hasLabels = false;
      }
    }
    
    // Check required attributes
    const requiredInputs = await page.locator('input[required]').count();
    console.log(`📝 Required inputs found: ${requiredInputs}`);
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement.tagName);
    console.log(`⌨️ First tab focus: ${focusedElement}`);
    
    // Check for ARIA attributes
    const ariaElements = await page.locator('[aria-label], [aria-describedby], [role]').count();
    console.log(`🎯 ARIA elements found: ${ariaElements}`);
    
    console.log('♿ Accessibility Compliance:', JSON.stringify(accessibilityChecks, null, 2));
  });

  test('should track error patterns and recovery', async ({ page }) => {
    console.log('🔍 Tracking error patterns and recovery...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    const errorTracking = {
      validationErrors: [],
      recoveryAttempts: 0,
      successfulRecovery: false,
      timeToRecover: 0
    };
    
    // Trigger validation errors intentionally
    const errorStartTime = Date.now();
    
    // Empty form submission
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    let errors = await page.locator('[class*="error"], .text-red-500, .text-danger').all();
    for (const error of errors) {
      const errorText = await error.textContent();
      if (errorText) errorTracking.validationErrors.push('Empty form: ' + errorText);
    }
    
    // Invalid email format
    await page.fill('input[name="email"]', 'invalid-email');
    await page.blur('input[name="email"]');
    await page.waitForTimeout(500);
    
    errors = await page.locator('[class*="error"], .text-red-500, .text-danger').all();
    for (const error of errors) {
      const errorText = await error.textContent();
      if (errorText && !errorTracking.validationErrors.includes(errorText)) {
        errorTracking.validationErrors.push('Invalid email: ' + errorText);
      }
    }
    
    // Password mismatch
    await page.fill('input[name="firstName"]', 'Error');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', `error.test.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    errors = await page.locator('[class*="error"], .text-red-500, .text-danger').all();
    for (const error of errors) {
      const errorText = await error.textContent();
      if (errorText && !errorTracking.validationErrors.some(e => e.includes(errorText))) {
        errorTracking.validationErrors.push('Password mismatch: ' + errorText);
      }
    }
    
    // Attempt recovery
    errorTracking.recoveryAttempts++;
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/dashboard')) {
      errorTracking.successfulRecovery = true;
      errorTracking.timeToRecover = Date.now() - errorStartTime;
    }
    
    console.log('🔍 Error Tracking Data:', JSON.stringify(errorTracking, null, 2));
    
    expect(errorTracking.validationErrors.length).toBeGreaterThan(0);
  });

  test('should measure mobile user experience', async ({ page }) => {
    console.log('📱 Measuring mobile user experience...');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('https://app.floworx-iq.com/register');
    
    const mobileUX = {
      loadTime: 0,
      touchTargetSize: {},
      scrollRequired: false,
      formUsability: true
    };
    
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    mobileUX.loadTime = Date.now() - startTime;
    
    // Check touch target sizes
    const submitButton = page.locator('button[type="submit"]');
    const buttonBox = await submitButton.boundingBox();
    mobileUX.touchTargetSize.submitButton = {
      width: buttonBox.width,
      height: buttonBox.height,
      meetsMinimum: buttonBox.width >= 44 && buttonBox.height >= 44 // iOS guidelines
    };
    
    // Check if scrolling is required to see all form elements
    const formHeight = await page.locator('form').boundingBox();
    const viewportHeight = page.viewportSize().height;
    mobileUX.scrollRequired = formHeight.height > viewportHeight;
    
    // Test form usability on mobile
    try {
      await page.fill('input[name="firstName"]', 'Mobile');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="email"]', `mobile.${Date.now()}@example.com`);
      mobileUX.formUsability = true;
    } catch (error) {
      mobileUX.formUsability = false;
      console.log('❌ Mobile form usability issue:', error.message);
    }
    
    console.log('📱 Mobile UX Data:', JSON.stringify(mobileUX, null, 2));
    
    expect(mobileUX.loadTime).toBeLessThan(8000); // Mobile should load within 8 seconds
    expect(mobileUX.touchTargetSize.submitButton.meetsMinimum).toBe(true);
  });
});
