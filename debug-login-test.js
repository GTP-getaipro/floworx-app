// Debug test to identify login issues
const { test, expect } = require('@playwright/test');

test('Debug login flow', async ({ page }) => {
  console.log('🔍 Starting login debug test...');
  
  // Go to login page
  await page.goto('https://app.floworx-iq.com/login');
  console.log('✅ Navigated to login page');
  
  // Take screenshot of login page
  await page.screenshot({ path: 'debug-login-page.png' });
  console.log('📸 Screenshot taken: debug-login-page.png');
  
  // Check what elements are available
  const emailInput = await page.locator('input[type="email"], input[name="email"]').count();
  const passwordInput = await page.locator('input[type="password"], input[name="password"]').count();
  const submitButton = await page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').count();
  
  console.log(`📋 Form elements found:`);
  console.log(`   Email inputs: ${emailInput}`);
  console.log(`   Password inputs: ${passwordInput}`);
  console.log(`   Submit buttons: ${submitButton}`);
  
  if (emailInput === 0 || passwordInput === 0 || submitButton === 0) {
    console.log('❌ Missing form elements - login form may not be loaded');
    
    // Check page content
    const pageContent = await page.content();
    console.log('📄 Page title:', await page.title());
    console.log('📄 Page URL:', page.url());
    
    // Look for any error messages
    const errorMessages = await page.locator('[class*="error"], [class*="alert"]').allTextContents();
    if (errorMessages.length > 0) {
      console.log('🚨 Error messages found:', errorMessages);
    }
    
    return;
  }
  
  // Try to create a test user first
  console.log('🔍 Creating test user...');
  const testEmail = `debug-test-${Date.now()}@example.com`;
  const testPassword = 'DebugTest123!';
  
  // Go to register page
  await page.goto('https://app.floworx-iq.com/register');
  await page.waitForTimeout(2000);
  
  // Fill registration form
  try {
    await page.fill('input[name="firstName"]', 'Debug');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="confirmPassword"]', testPassword);
    
    // Submit registration
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    console.log('✅ Test user created');
  } catch (error) {
    console.log('⚠️ Registration failed:', error.message);
  }
  
  // Now try to login
  console.log('🔍 Attempting login...');
  await page.goto('https://app.floworx-iq.com/login');
  await page.waitForTimeout(2000);
  
  // Fill login form
  await page.fill('input[type="email"], input[name="email"]', testEmail);
  await page.fill('input[type="password"], input[name="password"]', testPassword);
  
  // Take screenshot before submit
  await page.screenshot({ path: 'debug-before-login.png' });
  console.log('📸 Screenshot before login: debug-before-login.png');
  
  // Submit login form
  await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
  
  // Wait and see what happens
  await page.waitForTimeout(5000);
  
  // Check current URL
  const currentUrl = page.url();
  console.log('📍 Current URL after login:', currentUrl);
  
  // Take screenshot after login attempt
  await page.screenshot({ path: 'debug-after-login.png' });
  console.log('📸 Screenshot after login: debug-after-login.png');
  
  // Check for error messages
  const errorMessages = await page.locator('[class*="error"], [class*="alert"], [role="alert"]').allTextContents();
  if (errorMessages.length > 0) {
    console.log('🚨 Error messages after login:', errorMessages);
  }
  
  // Check if we're on dashboard
  if (currentUrl.includes('/dashboard')) {
    console.log('✅ Successfully redirected to dashboard');
    
    // Check if dashboard is loading properly
    const loadingElements = await page.locator('[class*="loading"], [class*="spinner"]').count();
    console.log(`🔄 Loading elements on dashboard: ${loadingElements}`);
    
    if (loadingElements > 0) {
      console.log('⚠️ Dashboard is stuck loading - this matches our earlier issue');
      
      // Wait longer to see if it resolves
      await page.waitForTimeout(10000);
      const stillLoading = await page.locator('[class*="loading"], [class*="spinner"]').count();
      console.log(`🔄 Still loading after 10s: ${stillLoading}`);
    }
  } else {
    console.log('❌ Login failed - not redirected to dashboard');
    
    // Check what page we're on
    const pageTitle = await page.title();
    console.log('📄 Current page title:', pageTitle);
    
    // Look for specific error indicators
    const loginError = await page.locator('text="Invalid email or password"').count();
    const validationError = await page.locator('[class*="validation"]').count();
    
    console.log(`🔍 Login error messages: ${loginError}`);
    console.log(`🔍 Validation errors: ${validationError}`);
  }
  
  console.log('🏁 Debug test completed');
});
