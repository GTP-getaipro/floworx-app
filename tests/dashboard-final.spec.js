const { test, expect } = require('@playwright/test');

test.describe('Dashboard - Final Comprehensive Testing', () => {
  let testUser;

  test.beforeAll(async () => {
    // Create a test user that we'll reuse
    testUser = {
      firstName: 'Dashboard',
      lastName: 'Final',
      companyName: 'Dashboard Final Co',
      email: `dashboard.final.${Date.now()}@example.com`,
      password: 'DashboardFinal123!'
    };
  });

  test.describe('Dashboard Core Functionality', () => {
    test('should register user and access dashboard with all data-testids', async ({ page }) => {
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
      
      // Handle login if redirected
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        await page.fill('input[name="email"]', testUser.email);
        await page.fill('input[name="password"]', testUser.password);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(5000);
      }
      
      // Verify we're on dashboard
      await expect(page).toHaveURL(/\/dashboard/);
      
      // Test all basic data-testid attributes
      await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-subtitle"]')).toBeVisible();
      await expect(page.locator('[data-testid="sign-out-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      
      console.log('✅ All basic dashboard data-testids working');
    });

    test('should display connection status with proper data-testids', async ({ page }) => {
      // Login
      await page.goto('https://app.floworx-iq.com/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      
      // Wait for dashboard to load
      await page.waitForTimeout(3000);
      
      // Check connection state (should be not-connected for new user)
      const hasNotConnectedState = await page.locator('[data-testid="not-connected-state"]').count() > 0;
      
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
        
        // Verify feature text content
        await expect(page.locator('[data-testid="feature-email-sorting"]')).toContainText('Automated email sorting');
        await expect(page.locator('[data-testid="feature-ai-responses"]')).toContainText('AI-powered responses');
        await expect(page.locator('[data-testid="feature-response-times"]')).toContainText('Faster response times');
        await expect(page.locator('[data-testid="feature-security"]')).toContainText('Secure connections');
        
        console.log('✅ All not-connected state data-testids working');
      }
    });

    test('should handle sign out functionality correctly', async ({ page }) => {
      // Login
      await page.goto('https://app.floworx-iq.com/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      
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

    test('should display welcome message with user email', async ({ page }) => {
      // Login
      await page.goto('https://app.floworx-iq.com/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      
      // Check welcome message contains user email
      const welcomeMessage = page.locator('[data-testid="welcome-message"]');
      await expect(welcomeMessage).toBeVisible();
      await expect(welcomeMessage).toContainText('Welcome');
      await expect(welcomeMessage).toContainText(testUser.email);
      
      // Check subtitle
      const subtitle = page.locator('[data-testid="dashboard-subtitle"]');
      await expect(subtitle).toBeVisible();
      await expect(subtitle).toContainText('Manage your email automation connections');
      
      console.log('✅ Welcome message and subtitle working correctly');
    });

    test('should handle Google OAuth connection button', async ({ page }) => {
      // Login
      await page.goto('https://app.floworx-iq.com/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      
      // Wait for dashboard to load
      await page.waitForTimeout(3000);
      
      // Check if connect button exists
      const connectButton = page.locator('[data-testid="connect-google-button"]');
      const buttonExists = await connectButton.count() > 0;
      
      if (buttonExists) {
        await expect(connectButton).toBeVisible();
        await expect(connectButton).toContainText('Connect Your Google Account');
        
        // Test button is clickable (don't actually click to avoid OAuth flow)
        await expect(connectButton).toBeEnabled();
        
        console.log('✅ Google OAuth connection button working');
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
      
      // Check that content is properly responsive
      const dashboardContainer = page.locator('[data-testid="dashboard-container"]');
      await expect(dashboardContainer).toBeVisible();
      
      console.log('✅ Mobile responsiveness working');
    });

    test('should load dashboard within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      // Login
      await page.goto('https://app.floworx-iq.com/login');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      
      // Wait for dashboard to load using data-testid
      await page.waitForSelector('[data-testid="welcome-message"]', { timeout: 15000 });
      
      const loadTime = Date.now() - startTime;
      console.log(`Dashboard load time: ${loadTime}ms`);
      
      // Should load within 15 seconds
      expect(loadTime).toBeLessThan(15000);
      
      // Verify all critical elements are loaded
      await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      
      console.log('✅ Dashboard performance acceptable');
    });

    test('should handle multiple rapid navigations', async ({ page }) => {
      // Test rapid navigation between login and dashboard
      for (let i = 0; i < 3; i++) {
        console.log(`Navigation cycle ${i + 1}/3`);
        
        // Go to login
        await page.goto('https://app.floworx-iq.com/login');
        await page.waitForTimeout(500);
        
        // Login
        await page.fill('input[name="email"]', testUser.email);
        await page.fill('input[name="password"]', testUser.password);
        await page.click('button[type="submit"]');
        await page.waitForTimeout(2000);
        
        // Verify dashboard loads
        await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
        
        // Sign out
        await page.click('[data-testid="sign-out-button"]');
        await page.waitForTimeout(1000);
      }
      
      console.log('✅ Multiple rapid navigations handled correctly');
    });
  });
});
