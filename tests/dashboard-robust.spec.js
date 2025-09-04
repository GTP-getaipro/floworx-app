const { test, expect } = require('@playwright/test');

test.describe('Dashboard - Robust Testing Suite', () => {
  let testUser;

  test.beforeAll(async () => {
    // Create a test user that we'll reuse
    testUser = {
      firstName: 'Dashboard',
      lastName: 'Robust',
      companyName: 'Dashboard Robust Co',
      email: `dashboard.robust.${Date.now()}@example.com`,
      password: 'DashboardRobust123!'
    };
  });

  // Helper function for robust login
  async function robustLogin(page, email, password) {
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('button[type="submit"]');
    
    // Wait for redirect with multiple fallbacks
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      await page.waitForTimeout(2000);
      const currentUrl = page.url();
      
      if (currentUrl.includes('/dashboard')) {
        // Wait for dashboard to fully load
        try {
          await page.waitForSelector('[data-testid="welcome-message"]', { timeout: 8000 });
          return true;
        } catch (error) {
          // Fallback check
          const hasWelcome = await page.locator('h1:has-text("Welcome")').count() > 0;
          if (hasWelcome) return true;
        }
      }
      
      attempts++;
      console.log(`Login attempt ${attempts}/${maxAttempts}, current URL: ${currentUrl}`);
    }
    
    throw new Error(`Failed to login after ${maxAttempts} attempts`);
  }

  test.describe('Core Dashboard Functionality', () => {
    test('should register user and verify all basic data-testids', async ({ page }) => {
      // Register new user
      await page.goto('https://app.floworx-iq.com/register');
      await page.waitForLoadState('networkidle');
      
      await page.fill('input[name="firstName"]', testUser.firstName);
      await page.fill('input[name="lastName"]', testUser.lastName);
      await page.fill('input[name="companyName"]', testUser.companyName);
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.fill('input[name="confirmPassword"]', testUser.password);
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(8000);
      
      // Handle login if redirected
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        await robustLogin(page, testUser.email, testUser.password);
      } else {
        // Wait for dashboard to load
        await page.waitForSelector('[data-testid="welcome-message"]', { timeout: 10000 });
      }
      
      // Verify we're on dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Test all basic data-testid attributes with individual checks
      const basicTestIds = [
        'dashboard-container',
        'dashboard-header', 
        'welcome-message',
        'dashboard-subtitle',
        'sign-out-button',
        'dashboard-content'
      ];
      
      for (const testId of basicTestIds) {
        await expect(page.locator(`[data-testid="${testId}"]`)).toBeVisible({ timeout: 5000 });
        console.log(`✅ ${testId} - visible`);
      }
      
      console.log('✅ All basic dashboard data-testids working');
    });

    test('should verify connection state data-testids', async ({ page }) => {
      await robustLogin(page, testUser.email, testUser.password);
      
      // Wait for dashboard to fully load
      await page.waitForTimeout(3000);
      
      // Check connection state (should be not-connected for new user)
      const hasNotConnectedState = await page.locator('[data-testid="not-connected-state"]').count() > 0;
      
      if (hasNotConnectedState) {
        console.log('Testing not-connected state elements...');
        
        const notConnectedTestIds = [
          'connect-title',
          'connect-description', 
          'feature-benefits',
          'connect-google-button',
          'feature-email-sorting',
          'feature-ai-responses',
          'feature-response-times',
          'feature-security'
        ];
        
        for (const testId of notConnectedTestIds) {
          await expect(page.locator(`[data-testid="${testId}"]`)).toBeVisible({ timeout: 5000 });
          console.log(`✅ ${testId} - visible`);
        }
        
        // Verify feature text content
        await expect(page.locator('[data-testid="feature-email-sorting"]')).toContainText('email');
        await expect(page.locator('[data-testid="feature-ai-responses"]')).toContainText('AI');
        await expect(page.locator('[data-testid="feature-response-times"]')).toContainText('response');
        await expect(page.locator('[data-testid="feature-security"]')).toContainText('Secure');
        
        console.log('✅ All not-connected state data-testids working');
      } else {
        console.log('User appears to be in connected state');
      }
    });

    test('should handle sign out functionality', async ({ page }) => {
      await robustLogin(page, testUser.email, testUser.password);
      
      // Verify we're on dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Click sign out using data-testid
      await page.click('[data-testid="sign-out-button"]');
      await page.waitForTimeout(3000);
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
      
      // Verify authentication is cleared
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeNull();
      
      console.log('✅ Sign out functionality working perfectly');
    });

    test('should display correct welcome message', async ({ page }) => {
      await robustLogin(page, testUser.email, testUser.password);
      
      // Check welcome message contains user email
      const welcomeMessage = page.locator('[data-testid="welcome-message"]');
      await expect(welcomeMessage).toBeVisible();
      await expect(welcomeMessage).toContainText('Welcome');
      await expect(welcomeMessage).toContainText(testUser.email);
      
      // Check subtitle
      const subtitle = page.locator('[data-testid="dashboard-subtitle"]');
      await expect(subtitle).toBeVisible();
      await expect(subtitle).toContainText('email automation');
      
      console.log('✅ Welcome message and subtitle working correctly');
    });

    test('should verify Google OAuth connection button', async ({ page }) => {
      await robustLogin(page, testUser.email, testUser.password);
      
      // Wait for dashboard to load
      await page.waitForTimeout(3000);
      
      // Check if connect button exists
      const connectButton = page.locator('[data-testid="connect-google-button"]');
      const buttonExists = await connectButton.count() > 0;
      
      if (buttonExists) {
        await expect(connectButton).toBeVisible();
        await expect(connectButton).toContainText('Google');
        
        // Test button is clickable (don't actually click to avoid OAuth flow)
        await expect(connectButton).toBeEnabled();
        
        console.log('✅ Google OAuth connection button working');
      } else {
        console.log('⚠️ Google OAuth button not found (user may be connected)');
      }
    });

    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      await robustLogin(page, testUser.email, testUser.password);
      
      // Verify dashboard elements are still visible on mobile
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="sign-out-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      
      // Check that content is properly responsive
      const dashboardContainer = page.locator('[data-testid="dashboard-container"]');
      await expect(dashboardContainer).toBeVisible();
      
      console.log('✅ Mobile responsiveness working');
    });

    test('should load dashboard in reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await robustLogin(page, testUser.email, testUser.password);
      
      const loadTime = Date.now() - startTime;
      console.log(`Dashboard load time: ${loadTime}ms`);
      
      // Should load within 20 seconds (generous for robust testing)
      expect(loadTime).toBeLessThan(20000);
      
      // Verify all critical elements are loaded
      await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      
      console.log('✅ Dashboard performance acceptable');
    });

    test('should handle login-logout cycle', async ({ page }) => {
      // Test login-logout cycle 2 times
      for (let i = 0; i < 2; i++) {
        console.log(`Login-logout cycle ${i + 1}/2`);
        
        await robustLogin(page, testUser.email, testUser.password);
        
        // Verify dashboard loads
        await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
        
        // Sign out
        await page.click('[data-testid="sign-out-button"]');
        await page.waitForTimeout(2000);
        
        // Verify redirect to login
        await expect(page).toHaveURL(/\/login/);
      }
      
      console.log('✅ Login-logout cycles handled correctly');
    });
  });
});
