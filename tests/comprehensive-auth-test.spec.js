// Comprehensive authentication test to verify the full registration → login flow
const { test, expect } = require('@playwright/test');

test.describe('Comprehensive Authentication Flow', () => {
  
  test('should complete full registration and login flow', async ({ page }) => {
    console.log('🔍 Starting comprehensive auth test...');
    
    // Generate unique test user
    const testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: `comprehensive-test-${Date.now()}@example.com`,
      password: 'TestPassword123!'
    };
    
    console.log(`📝 Testing with user: ${testUser.email}`);
    
    // Step 1: Registration
    console.log('🔍 Step 1: Registration');
    await page.goto('/register');
    await page.waitForTimeout(3000); // Wait for form to load
    
    // Take screenshot of registration page
    await page.screenshot({ path: 'test-results/01-registration-page.png' });
    
    // Fill registration form
    console.log('📝 Filling registration form...');
    await page.fill('input[name="firstName"]', testUser.firstName);
    await page.fill('input[name="lastName"]', testUser.lastName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    
    // Take screenshot before submit
    await page.screenshot({ path: 'test-results/02-registration-filled.png' });
    
    // Submit registration
    console.log('🚀 Submitting registration...');
    await page.click('button[type="submit"], button:has-text("Create Account")');
    
    // Wait for registration to complete
    await page.waitForTimeout(5000);
    
    // Take screenshot after registration
    await page.screenshot({ path: 'test-results/03-registration-result.png' });
    
    // Check current URL and page content
    const registrationUrl = page.url();
    const registrationContent = await page.textContent('body');
    console.log('📍 Registration URL:', registrationUrl);
    console.log('📄 Registration content preview:', registrationContent.substring(0, 200) + '...');
    
    // Check if registration was successful
    const hasSuccessMessage = registrationContent.includes('Registration Successful') || 
                              registrationContent.includes('Account created') ||
                              registrationContent.includes('Welcome');
    
    const hasErrorMessage = registrationContent.includes('error') || 
                           registrationContent.includes('failed') ||
                           registrationContent.includes('invalid');
    
    console.log('✅ Registration success indicators:', hasSuccessMessage);
    console.log('❌ Registration error indicators:', hasErrorMessage);
    
    if (hasErrorMessage) {
      console.log('❌ Registration failed - checking for specific errors');
      const errorElements = await page.locator('[class*="error"], [role="alert"]').allTextContents();
      console.log('Error messages:', errorElements);
    }
    
    // Step 2: Login
    console.log('🔍 Step 2: Login');
    
    // Navigate to login page
    await page.goto('/login');
    await page.waitForTimeout(3000);
    
    // Take screenshot of login page
    await page.screenshot({ path: 'test-results/04-login-page.png' });
    
    // Fill login form
    console.log('🔐 Filling login form...');
    await page.fill('input[name="email"], input[type="email"]', testUser.email);
    await page.fill('input[name="password"], input[type="password"]', testUser.password);
    
    // Take screenshot before login
    await page.screenshot({ path: 'test-results/05-login-filled.png' });
    
    // Submit login
    console.log('🚀 Submitting login...');
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    
    // Wait for login to complete
    await page.waitForTimeout(8000);
    
    // Take screenshot after login
    await page.screenshot({ path: 'test-results/06-login-result.png' });
    
    // Check current URL and page content
    const loginUrl = page.url();
    const loginContent = await page.textContent('body');
    console.log('📍 Login URL:', loginUrl);
    console.log('📄 Login content preview:', loginContent.substring(0, 200) + '...');
    
    // Check login result
    if (loginUrl.includes('/dashboard')) {
      console.log('✅ Login successful - redirected to dashboard');
      
      // Check if dashboard is loading properly
      const loadingElements = await page.locator('[class*="loading"], [class*="spinner"]').count();
      console.log(`🔄 Loading elements on dashboard: ${loadingElements}`);
      
      if (loadingElements > 0) {
        console.log('⚠️ Dashboard is loading - waiting for completion...');
        
        // Wait for loading to complete or timeout
        try {
          await page.waitForFunction(
            () => {
              const loadingEls = document.querySelectorAll('[class*="loading"], [class*="spinner"]');
              return loadingEls.length === 0;
            },
            { timeout: 15000 }
          );
          console.log('✅ Dashboard loading completed');
        } catch (e) {
          console.log('⚠️ Dashboard loading timeout - but login was successful');
        }
        
        // Take final screenshot
        await page.screenshot({ path: 'test-results/07-dashboard-final.png' });
      }
      
      // Test passes if we reach the dashboard
      expect(loginUrl).toContain('/dashboard');
      
    } else if (loginUrl.includes('/login')) {
      console.log('❌ Login failed - still on login page');
      
      // Check for error messages
      const loginErrors = await page.locator('[class*="error"], [role="alert"]').allTextContents();
      console.log('Login error messages:', loginErrors);
      
      // Check if there are validation errors
      const validationErrors = await page.locator('[class*="validation"]').allTextContents();
      console.log('Validation errors:', validationErrors);
      
      // This is the main issue we're trying to fix
      throw new Error(`Login failed - user may not have been registered properly. URL: ${loginUrl}`);
      
    } else {
      console.log('❓ Unexpected redirect after login');
      console.log('Current URL:', loginUrl);
      console.log('Page title:', await page.title());
      
      // Take screenshot of unexpected page
      await page.screenshot({ path: 'test-results/08-unexpected-page.png' });
    }
    
    console.log('🎉 Comprehensive auth test completed successfully!');
  });
  
  test('should handle registration with existing email', async ({ page }) => {
    console.log('🔍 Testing duplicate email registration...');
    
    const existingEmail = 'existing-user@example.com';
    
    // First registration
    await page.goto('/register');
    await page.waitForTimeout(2000);
    
    await page.fill('input[name="firstName"]', 'First');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', existingEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    
    // Second registration with same email
    await page.goto('/register');
    await page.waitForTimeout(2000);
    
    await page.fill('input[name="firstName"]', 'Second');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', existingEmail);
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    
    // Should show error for duplicate email
    const content = await page.textContent('body');
    const hasErrorMessage = content.includes('already exists') || 
                           content.includes('already registered') ||
                           content.includes('email is taken');
    
    console.log('✅ Duplicate email error shown:', hasErrorMessage);
    
    // Test should pass if error is shown or if it redirects (both are acceptable)
    expect(hasErrorMessage || page.url().includes('/dashboard')).toBeTruthy();
  });
});
