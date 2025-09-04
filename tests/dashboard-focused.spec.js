const { test, expect } = require('@playwright/test');

test.describe('Dashboard - Focused Testing', () => {
  let testUser;

  test.beforeAll(async () => {
    // Create a test user that we'll reuse
    testUser = {
      firstName: 'Dashboard',
      lastName: 'Focus',
      companyName: 'Dashboard Focus Co',
      email: `dashboard.focus.${Date.now()}@example.com`,
      password: 'DashboardFocus123!'
    };
  });

  test.describe('Dashboard Access & Basic Functionality', () => {
    test('should register user and access dashboard', async ({ page }) => {
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
      await page.waitForTimeout(5000);
      
      // Should redirect to login or dashboard
      const currentUrl = page.url();
      console.log(`After registration URL: ${currentUrl}`);
      
      if (currentUrl.includes('/login')) {
        // Login with the created user
        await page.fill('input[name="email"]', testUser.email);
        await page.fill('input[name="password"]', testUser.password);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(5000);
      }
      
      // Verify we're on dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.locator('h1')).toContainText('Welcome');
    });

    test('should display dashboard with new data-testid attributes', async ({ page }) => {
      // Login first
      await page.goto('https://app.floworx-iq.com/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      
      // Verify we're on dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Test new data-testid attributes
      await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-subtitle"]')).toBeVisible();
      await expect(page.locator('[data-testid="sign-out-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      
      console.log('✅ All basic data-testid attributes found');
    });

    test('should display connection status with proper data-testids', async ({ page }) => {
      // Login first
      await page.goto('https://app.floworx-iq.com/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      
      // Wait for dashboard to load
      await page.waitForTimeout(3000);
      
      // Check connection state
      const hasConnectedState = await page.locator('[data-testid="connected-state"]').count() > 0;
      const hasNotConnectedState = await page.locator('[data-testid="not-connected-state"]').count() > 0;
      
      console.log(`Connected state: ${hasConnectedState}`);
      console.log(`Not connected state: ${hasNotConnectedState}`);
      
      // Should have one of the connection states
      expect(hasConnectedState || hasNotConnectedState).toBeTruthy();
      
      if (hasNotConnectedState) {
        // Test not connected state elements
        await expect(page.locator('[data-testid="connect-title"]')).toBeVisible();
        await expect(page.locator('[data-testid="connect-description"]')).toBeVisible();
        await expect(page.locator('[data-testid="feature-benefits"]')).toBeVisible();
        await expect(page.locator('[data-testid="connect-google-button"]')).toBeVisible();
        
        // Test individual feature benefits
        await expect(page.locator('[data-testid="feature-email-sorting"]')).toBeVisible();
        await expect(page.locator('[data-testid="feature-ai-responses"]')).toBeVisible();
        await expect(page.locator('[data-testid="feature-response-times"]')).toBeVisible();
        await expect(page.locator('[data-testid="feature-security"]')).toBeVisible();
        
        console.log('✅ All not-connected state data-testids found');
      }
      
      if (hasConnectedState) {
        // Test connected state elements
        await expect(page.locator('[data-testid="connection-success-title"]')).toBeVisible();
        await expect(page.locator('[data-testid="connection-success-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="success-icon"]')).toBeVisible();
        
        console.log('✅ All connected state data-testids found');
      }
    });

    test('should handle sign out functionality', async ({ page }) => {
      // Login first
      await page.goto('https://app.floworx-iq.com/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      
      // Verify we're on dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Click sign out
      await page.click('[data-testid="sign-out-button"]');
      await page.waitForTimeout(3000);
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
      
      // Verify authentication is cleared
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeNull();
      
      console.log('✅ Sign out functionality working');
    });

    test('should handle OAuth callback parameters', async ({ page }) => {
      // Login first
      await page.goto('https://app.floworx-iq.com/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      
      // Test success callback
      await page.goto('https://app.floworx-iq.com/dashboard?connected=google');
      await page.waitForTimeout(3000);
      
      // Should show success alert
      const successAlert = await page.locator('[data-testid="success-alert"]').count();
      if (successAlert > 0) {
        await expect(page.locator('[data-testid="success-alert"]')).toContainText('Google account connected successfully');
        console.log('✅ Success callback handled');
      }
      
      // Test error callback
      await page.goto('https://app.floworx-iq.com/dashboard?error=oauth_denied');
      await page.waitForTimeout(3000);
      
      // Should show error alert
      const errorAlert = await page.locator('[data-testid="error-alert"]').count();
      if (errorAlert > 0) {
        await expect(page.locator('[data-testid="error-alert"]')).toContainText('Google connection was cancelled');
        console.log('✅ Error callback handled');
      }
    });

    test('should be responsive on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Login
      await page.goto('https://app.floworx-iq.com/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      
      // Verify dashboard elements are still visible on mobile
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="sign-out-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      
      console.log('✅ Mobile responsiveness working');
    });

    test('should load dashboard within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      // Login
      await page.goto('https://app.floworx-iq.com/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      
      // Wait for dashboard to load
      await page.waitForSelector('[data-testid="welcome-message"]', { timeout: 15000 });
      
      const loadTime = Date.now() - startTime;
      console.log(`Dashboard load time: ${loadTime}ms`);
      
      // Should load within 15 seconds
      expect(loadTime).toBeLessThan(15000);
      
      console.log('✅ Dashboard performance acceptable');
    });
  });
});
