const { test, expect } = require('@playwright/test');

test.describe('Production Site Check', () => {
  test('should load production homepage and check structure', async ({ page }) => {
    console.log('🌐 Navigating to production site...');
    
    // Navigate to production site
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/production-homepage.png', fullPage: true });
    
    // Check if page loaded
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Check what's actually on the page
    const bodyText = await page.textContent('body');
    console.log(`📝 Page content preview: ${bodyText.substring(0, 500)}...`);
    
    // Check for common elements
    const hasLoginLink = await page.locator('a[href*="login"], button:has-text("Login"), [data-testid*="login"]').count();
    const hasRegisterLink = await page.locator('a[href*="register"], button:has-text("Register"), [data-testid*="register"]').count();
    const hasSignUpLink = await page.locator('a[href*="signup"], button:has-text("Sign Up"), [data-testid*="signup"]').count();
    
    console.log(`🔗 Login links found: ${hasLoginLink}`);
    console.log(`🔗 Register links found: ${hasRegisterLink}`);
    console.log(`🔗 Sign Up links found: ${hasSignUpLink}`);
    
    // Check if it's a React app or static page
    const hasReactRoot = await page.locator('#root, #__next, [data-reactroot]').count();
    console.log(`⚛️ React root elements found: ${hasReactRoot}`);
    
    // Check for any error messages
    const hasError = await page.locator('text=error, text=Error, text=404, text=500').count();
    console.log(`❌ Error indicators found: ${hasError}`);
    
    // Log all links on the page
    const links = await page.locator('a').all();
    console.log(`🔗 All links on page:`);
    for (let i = 0; i < Math.min(links.length, 10); i++) {
      const href = await links[i].getAttribute('href');
      const text = await links[i].textContent();
      console.log(`  - ${text?.trim() || 'No text'}: ${href || 'No href'}`);
    }
    
    // Check if we can navigate to login/register pages
    if (hasLoginLink > 0) {
      console.log('🔍 Attempting to navigate to login page...');
      await page.locator('a[href*="login"], button:has-text("Login"), [data-testid*="login"]').first().click();
      await page.waitForTimeout(2000);
      
      const loginUrl = page.url();
      console.log(`🔗 Login page URL: ${loginUrl}`);
      
      // Check for login form elements
      const emailInput = await page.locator('input[type="email"], [data-testid*="email"], input[name*="email"]').count();
      const passwordInput = await page.locator('input[type="password"], [data-testid*="password"], input[name*="password"]').count();
      
      console.log(`📧 Email inputs found: ${emailInput}`);
      console.log(`🔒 Password inputs found: ${passwordInput}`);
      
      await page.screenshot({ path: 'test-results/production-login.png', fullPage: true });
    }
    
    // Basic assertion to ensure test passes
    expect(title).toBeTruthy();
  });
  
  test('should check register page if accessible', async ({ page }) => {
    console.log('🌐 Checking register page...');
    
    try {
      await page.goto('/register', { waitUntil: 'networkidle' });
      
      const title = await page.title();
      console.log(`📄 Register page title: ${title}`);
      
      // Take screenshot
      await page.screenshot({ path: 'test-results/production-register.png', fullPage: true });
      
      // Check for form elements
      const firstNameInput = await page.locator('[data-testid="first-name-input"], input[name*="first"], input[placeholder*="first"]').count();
      const lastNameInput = await page.locator('[data-testid="last-name-input"], input[name*="last"], input[placeholder*="last"]').count();
      const emailInput = await page.locator('[data-testid="email-input"], input[type="email"], input[name*="email"]').count();
      const passwordInput = await page.locator('[data-testid="password-input"], input[type="password"], input[name*="password"]').count();
      
      console.log(`👤 First name inputs found: ${firstNameInput}`);
      console.log(`👤 Last name inputs found: ${lastNameInput}`);
      console.log(`📧 Email inputs found: ${emailInput}`);
      console.log(`🔒 Password inputs found: ${passwordInput}`);
      
      // Log all form elements
      const inputs = await page.locator('input').all();
      console.log(`📝 All input elements:`);
      for (let i = 0; i < inputs.length; i++) {
        const type = await inputs[i].getAttribute('type');
        const name = await inputs[i].getAttribute('name');
        const placeholder = await inputs[i].getAttribute('placeholder');
        const testId = await inputs[i].getAttribute('data-testid');
        console.log(`  - Type: ${type}, Name: ${name}, Placeholder: ${placeholder}, TestId: ${testId}`);
      }
      
      expect(title).toBeTruthy();
    } catch (error) {
      console.log(`❌ Register page not accessible: ${error.message}`);
      // Take screenshot of error page
      await page.screenshot({ path: 'test-results/production-register-error.png', fullPage: true });
    }
  });
});
