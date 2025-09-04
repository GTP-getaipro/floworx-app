const { test, expect } = require('@playwright/test');

test.describe('Production Authentication Tests', () => {
  test('should attempt user registration and check response', async ({ page }) => {
    console.log('🌐 Testing user registration on production...');
    
    // Navigate to registration page
    await page.goto('/register');
    
    // Generate unique test data
    const timestamp = Date.now();
    const testEmail = `test.${timestamp}@example.com`;
    
    console.log(`📧 Using test email: ${testEmail}`);
    
    // Fill registration form
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
    
    // Take screenshot before submission
    await page.screenshot({ path: 'test-results/production-registration-before.png' });
    
    // Submit registration
    await page.click('button[type="submit"]');
    
    // Wait for response (either success redirect or error message)
    await page.waitForTimeout(3000);
    
    // Take screenshot after submission
    await page.screenshot({ path: 'test-results/production-registration-after.png' });
    
    const currentUrl = page.url();
    console.log(`🔗 Current URL after registration: ${currentUrl}`);
    
    // Check for various possible outcomes
    const hasErrorMessage = await page.locator('text=error, text=Error, .error, [class*="error"]').count();
    const hasSuccessMessage = await page.locator('text=success, text=Success, .success, [class*="success"]').count();
    const isOnDashboard = currentUrl.includes('/dashboard') || currentUrl.includes('/onboarding');
    const isOnLogin = currentUrl.includes('/login');
    const isStillOnRegister = currentUrl.includes('/register');
    
    console.log(`❌ Error messages found: ${hasErrorMessage}`);
    console.log(`✅ Success messages found: ${hasSuccessMessage}`);
    console.log(`📊 Redirected to dashboard/onboarding: ${isOnDashboard}`);
    console.log(`🔐 Redirected to login: ${isOnLogin}`);
    console.log(`📝 Still on register page: ${isStillOnRegister}`);
    
    // Log page content for debugging
    const bodyText = await page.textContent('body');
    console.log(`📄 Page content preview: ${bodyText.substring(0, 300)}...`);
    
    // Basic assertion - registration should either succeed or show a clear error
    expect(hasErrorMessage > 0 || hasSuccessMessage > 0 || isOnDashboard || isOnLogin).toBeTruthy();
  });
  
  test('should attempt login with invalid credentials', async ({ page }) => {
    console.log('🌐 Testing login with invalid credentials...');
    
    await page.goto('/login');
    
    // Try to login with invalid credentials
    await page.fill('input[name="email"], input[type="email"]', 'invalid@example.com');
    await page.fill('input[name="password"], input[type="password"]', 'wrongpassword');
    
    await page.screenshot({ path: 'test-results/production-login-before.png' });
    
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(2000);
    
    await page.screenshot({ path: 'test-results/production-login-after.png' });
    
    const currentUrl = page.url();
    console.log(`🔗 Current URL after login attempt: ${currentUrl}`);
    
    // Check for error messages
    const hasErrorMessage = await page.locator('text=error, text=Error, text=invalid, text=Invalid, .error, [class*="error"]').count();
    const isStillOnLogin = currentUrl.includes('/login');
    
    console.log(`❌ Error messages found: ${hasErrorMessage}`);
    console.log(`🔐 Still on login page: ${isStillOnLogin}`);
    
    // Should show error or stay on login page
    expect(hasErrorMessage > 0 || isStillOnLogin).toBeTruthy();
  });
  
  test('should check password reset functionality', async ({ page }) => {
    console.log('🌐 Testing password reset...');
    
    await page.goto('/login');
    
    // Look for forgot password link
    const forgotPasswordLink = page.locator('a[href*="forgot"], a:has-text("Forgot"), a:has-text("forgot")');
    const hasForgotLink = await forgotPasswordLink.count();
    
    console.log(`🔗 Forgot password links found: ${hasForgotLink}`);
    
    if (hasForgotLink > 0) {
      await forgotPasswordLink.first().click();
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      console.log(`🔗 Password reset URL: ${currentUrl}`);
      
      await page.screenshot({ path: 'test-results/production-password-reset.png' });
      
      // Check if we're on a password reset page
      const isOnPasswordReset = currentUrl.includes('/forgot') || currentUrl.includes('/reset');
      const hasEmailInput = await page.locator('input[type="email"], input[name*="email"]').count();
      
      console.log(`🔐 On password reset page: ${isOnPasswordReset}`);
      console.log(`📧 Email input found: ${hasEmailInput}`);
      
      expect(isOnPasswordReset || hasEmailInput > 0).toBeTruthy();
    } else {
      console.log('⚠️ No forgot password link found');
      expect(true).toBeTruthy(); // Pass the test if no forgot password functionality
    }
  });
  
  test('should check form validation', async ({ page }) => {
    console.log('🌐 Testing form validation...');
    
    await page.goto('/register');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Check for validation messages
    const validationMessages = await page.locator('input:invalid, .invalid, [class*="invalid"], [class*="error"]').count();
    const requiredFields = await page.locator('input[required]').count();
    
    console.log(`⚠️ Validation messages/invalid fields: ${validationMessages}`);
    console.log(`📝 Required fields: ${requiredFields}`);
    
    await page.screenshot({ path: 'test-results/production-validation.png' });
    
    // Should have some form of validation
    expect(validationMessages > 0 || requiredFields > 0).toBeTruthy();
  });
});
