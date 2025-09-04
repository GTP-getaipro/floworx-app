const { test, expect } = require('@playwright/test');

test.describe('Registration Edge Cases Testing', () => {
  
  test('should handle duplicate email registration', async ({ page }) => {
    console.log('🔄 Testing duplicate email registration...');
    
    const duplicateEmail = `duplicate.test.${Date.now()}@example.com`;
    
    // First registration
    await page.goto('https://app.floworx-iq.com/register');
    await page.fill('input[name="firstName"]', 'First');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', duplicateEmail);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Second registration with same email
    await page.goto('https://app.floworx-iq.com/register');
    await page.fill('input[name="firstName"]', 'Second');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', duplicateEmail);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Should show error message or stay on registration page
    const currentUrl = page.url();
    const hasError = await page.locator('[class*="error"], [class*="danger"]').count() > 0;
    
    expect(currentUrl.includes('/register') || hasError).toBe(true);
    console.log('✅ Duplicate email handled correctly');
  });

  test('should handle special characters in input fields', async ({ page }) => {
    console.log('🔤 Testing special characters in input fields...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    const specialCharData = {
      firstName: "José-María",
      lastName: "O'Connor-Smith",
      companyName: "Café & Restaurant Co. (Ltd.)",
      email: `special.chars.${Date.now()}@example.com`,
      password: "P@ssw0rd!#$123"
    };
    
    await page.fill('input[name="firstName"]', specialCharData.firstName);
    await page.fill('input[name="lastName"]', specialCharData.lastName);
    await page.fill('input[name="companyName"]', specialCharData.companyName);
    await page.fill('input[name="email"]', specialCharData.email);
    await page.fill('input[name="password"]', specialCharData.password);
    await page.fill('input[name="confirmPassword"]', specialCharData.password);
    
    // Verify values are preserved
    expect(await page.inputValue('input[name="firstName"]')).toBe(specialCharData.firstName);
    expect(await page.inputValue('input[name="lastName"]')).toBe(specialCharData.lastName);
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    console.log('✅ Special characters handled correctly');
  });

  test('should handle very long input values', async ({ page }) => {
    console.log('📏 Testing very long input values...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    const longData = {
      firstName: 'A'.repeat(100),
      lastName: 'B'.repeat(100),
      companyName: 'C'.repeat(200),
      email: `very.long.email.address.${Date.now()}@example.com`,
      password: 'VeryLongPassword123!'.repeat(5)
    };
    
    await page.fill('input[name="firstName"]', longData.firstName);
    await page.fill('input[name="lastName"]', longData.lastName);
    await page.fill('input[name="companyName"]', longData.companyName);
    await page.fill('input[name="email"]', longData.email);
    await page.fill('input[name="password"]', longData.password);
    await page.fill('input[name="confirmPassword"]', longData.password);
    
    // Check if maxLength attributes are working
    const firstNameValue = await page.inputValue('input[name="firstName"]');
    const lastNameValue = await page.inputValue('input[name="lastName"]');
    
    // Should be truncated by maxLength attribute
    expect(firstNameValue.length).toBeLessThanOrEqual(50);
    expect(lastNameValue.length).toBeLessThanOrEqual(50);
    
    console.log('✅ Long input values handled correctly');
  });

  test('should handle network interruption during registration', async ({ page }) => {
    console.log('🌐 Testing network interruption handling...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    // Fill form
    await page.fill('input[name="firstName"]', 'Network');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', `network.test.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'NetworkTest123!');
    await page.fill('input[name="confirmPassword"]', 'NetworkTest123!');
    
    // Simulate slow network
    await page.route('**/api/auth/register', async route => {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
      route.continue();
    });
    
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Check if loading state is shown
    await page.waitForTimeout(1000);
    const isDisabled = await submitButton.isDisabled();
    expect(isDisabled).toBe(true);
    
    console.log('✅ Network interruption handled correctly');
  });

  test('should handle rapid form submissions', async ({ page }) => {
    console.log('⚡ Testing rapid form submissions...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    // Fill form
    await page.fill('input[name="firstName"]', 'Rapid');
    await page.fill('input[name="lastName"]', 'Submit');
    await page.fill('input[name="email"]', `rapid.submit.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'RapidSubmit123!');
    await page.fill('input[name="confirmPassword"]', 'RapidSubmit123!');
    
    const submitButton = page.locator('button[type="submit"]');
    
    // Try to submit multiple times rapidly
    await Promise.all([
      submitButton.click(),
      submitButton.click(),
      submitButton.click()
    ]);
    
    // Should prevent multiple submissions
    await page.waitForTimeout(2000);
    const isDisabled = await submitButton.isDisabled();
    expect(isDisabled).toBe(true);
    
    console.log('✅ Rapid submissions handled correctly');
  });

  test('should handle browser back/forward during registration', async ({ page }) => {
    console.log('⬅️ Testing browser navigation during registration...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    // Fill partial form
    await page.fill('input[name="firstName"]', 'Navigation');
    await page.fill('input[name="lastName"]', 'Test');
    
    // Navigate away and back
    await page.goto('https://app.floworx-iq.com/login');
    await page.goBack();
    
    // Check if form data is preserved or cleared appropriately
    const firstName = await page.inputValue('input[name="firstName"]');
    console.log(`📝 Form data after navigation: ${firstName ? 'Preserved' : 'Cleared'}`);
    
    // Form should be functional after navigation
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    console.log('✅ Browser navigation handled correctly');
  });

  test('should handle form autofill and autocomplete', async ({ page }) => {
    console.log('🔄 Testing form autofill and autocomplete...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    // Check autocomplete attributes
    const emailInput = page.locator('input[name="email"]');
    const firstNameInput = page.locator('input[name="firstName"]');
    const passwordInput = page.locator('input[name="password"]');
    
    const emailAutocomplete = await emailInput.getAttribute('autocomplete');
    const firstNameAutocomplete = await firstNameInput.getAttribute('autocomplete');
    const passwordAutocomplete = await passwordInput.getAttribute('autocomplete');
    
    expect(emailAutocomplete).toBe('email');
    expect(firstNameAutocomplete).toBe('given-name');
    expect(passwordAutocomplete).toBe('new-password');
    
    console.log('✅ Autocomplete attributes properly set');
  });

  test('should handle password mismatch validation', async ({ page }) => {
    console.log('🔐 Testing password mismatch validation...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    await page.fill('input[name="firstName"]', 'Password');
    await page.fill('input[name="lastName"]', 'Mismatch');
    await page.fill('input[name="email"]', `password.mismatch.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Should show validation error
    const hasError = await page.locator('[class*="error"], .text-red-500, .text-danger').count() > 0;
    expect(hasError).toBe(true);
    
    console.log('✅ Password mismatch validation working');
  });
});
