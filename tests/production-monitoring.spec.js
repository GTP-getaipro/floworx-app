const { test, expect } = require('@playwright/test');

test.describe('Production Monitoring - Registration System', () => {
  
  test('should monitor registration system health', async ({ page }) => {
    console.log('🏥 Testing registration system health...');
    
    // Navigate to registration page
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // Check page load performance
    const startTime = Date.now();
    await page.waitForSelector('h2:has-text("Create Your Floworx Account")');
    const loadTime = Date.now() - startTime;
    
    console.log(`⏱️ Page load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    
    // Check all critical elements are present
    const criticalElements = [
      'input[name="firstName"]',
      'input[name="lastName"]',
      'input[name="email"]',
      'input[name="password"]',
      'input[name="confirmPassword"]',
      'button[type="submit"]'
    ];
    
    for (const selector of criticalElements) {
      await expect(page.locator(selector)).toBeVisible();
    }
    
    console.log('✅ All critical elements present');
    
    // Check for JavaScript errors
    const jsErrors = [];
    page.on('pageerror', error => jsErrors.push(error.message));
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    expect(jsErrors.length).toBe(0);
    console.log('✅ No JavaScript errors detected');
  });

  test('should test API endpoint availability', async ({ page }) => {
    console.log('🔌 Testing API endpoint availability...');
    
    // Test registration endpoint
    const response = await page.request.post('https://app.floworx-iq.com/api/auth/register', {
      data: {
        firstName: 'Health',
        lastName: 'Check',
        email: `health.check.${Date.now()}@example.com`,
        password: 'HealthCheck123!',
        companyName: 'Health Check Co'
      }
    });
    
    expect(response.status()).toBe(201);
    console.log('✅ Registration API endpoint healthy');
    
    // Test login endpoint (should fail with invalid credentials)
    const loginResponse = await page.request.post('https://app.floworx-iq.com/api/auth/login', {
      data: {
        email: 'invalid@example.com',
        password: 'invalid'
      }
    });
    
    expect(loginResponse.status()).toBe(401);
    console.log('✅ Login API endpoint healthy');
  });

  test('should monitor form validation consistency', async ({ page }) => {
    console.log('📝 Testing form validation consistency...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    // Test required field validation
    await page.click('button[type="submit"]');
    
    const firstNameInput = page.locator('input[name="firstName"]');
    const isRequired = await firstNameInput.getAttribute('required');
    expect(isRequired).not.toBeNull();
    
    // Test email validation
    await page.fill('input[name="email"]', 'invalid-email');
    await page.blur('input[name="email"]');
    
    // Check if validation message appears or input is marked invalid
    const emailInput = page.locator('input[name="email"]');
    const isInvalid = await emailInput.evaluate(el => !el.validity.valid);
    expect(isInvalid).toBe(true);
    
    console.log('✅ Form validation working consistently');
  });

  test('should check mobile responsiveness', async ({ page }) => {
    console.log('📱 Testing mobile responsiveness...');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('https://app.floworx-iq.com/register');
    
    // Check if form is still usable on mobile
    await expect(page.locator('h2')).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.reload();
    
    await expect(page.locator('h2')).toBeVisible();
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    
    console.log('✅ Mobile responsiveness working');
  });

  test('should monitor cross-browser compatibility', async ({ browserName, page }) => {
    console.log(`🌐 Testing cross-browser compatibility on ${browserName}...`);
    
    await page.goto('https://app.floworx-iq.com/register');
    
    // Test basic functionality across browsers
    await page.fill('input[name="firstName"]', 'Cross');
    await page.fill('input[name="lastName"]', 'Browser');
    await page.fill('input[name="email"]', `cross.browser.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'CrossBrowser123!');
    await page.fill('input[name="confirmPassword"]', 'CrossBrowser123!');
    
    // Check if form can be filled properly
    const firstName = await page.inputValue('input[name="firstName"]');
    expect(firstName).toBe('Cross');
    
    console.log(`✅ Cross-browser compatibility working on ${browserName}`);
  });
});
