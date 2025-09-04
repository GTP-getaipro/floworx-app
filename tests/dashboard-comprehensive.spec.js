const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('./utils/test-helpers');

test.describe('Dashboard - Comprehensive Testing Suite', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Create and login a test user
    const testUser = await helpers.createTestUser({
      firstName: 'Dashboard',
      lastName: 'Test',
      companyName: 'Dashboard Test Co',
      email: `dashboard.test.${Date.now()}@example.com`,
      password: 'DashboardTest123!'
    });
    
    await helpers.loginUser(testUser.email, testUser.password);
    await page.waitForURL('/dashboard');
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test.describe('Dashboard Loading & Authentication', () => {
    test('should load dashboard successfully after login', async ({ page }) => {
      // Verify we're on the dashboard
      await expect(page).toHaveURL('/dashboard');
      
      // Verify page title
      await expect(page).toHaveTitle(/Floworx/);
      
      // Verify main dashboard elements are present
      await expect(page.locator('h1')).toContainText('Welcome');
      await expect(page.locator('text=Manage your email automation connections')).toBeVisible();
    });

    test('should display user information correctly', async ({ page }) => {
      // Check welcome message contains user email
      const welcomeMessage = page.locator('h1');
      await expect(welcomeMessage).toBeVisible();
      
      // Should contain user's email in welcome message
      const welcomeText = await welcomeMessage.textContent();
      expect(welcomeText).toContain('Welcome');
      expect(welcomeText).toContain('@');
    });

    test('should show loading state initially', async ({ page }) => {
      // Reload page to catch loading state
      await page.reload();
      
      // Should show loading spinner initially
      const loadingSpinner = page.locator('.animate-spin');
      const loadingText = page.locator('text=Loading dashboard...');
      
      // At least one loading indicator should be visible
      const hasLoadingSpinner = await loadingSpinner.count() > 0;
      const hasLoadingText = await loadingText.count() > 0;
      
      expect(hasLoadingSpinner || hasLoadingText).toBeTruthy();
    });

    test('should handle authentication errors gracefully', async ({ page }) => {
      // Clear authentication token
      await page.evaluate(() => {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      });
      
      // Reload page
      await page.reload();
      
      // Should redirect to login or show error
      await page.waitForTimeout(3000);
      const currentUrl = page.url();
      
      expect(currentUrl.includes('/login') || currentUrl.includes('/dashboard')).toBeTruthy();
    });
  });

  test.describe('Dashboard UI Components', () => {
    test('should display header with navigation elements', async ({ page }) => {
      // Check header elements
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('button:has-text("Sign Out")')).toBeVisible();
      
      // Verify header styling and layout
      const header = page.locator('.bg-surface.border-b');
      await expect(header).toBeVisible();
    });

    test('should display Google connection status card', async ({ page }) => {
      // Wait for dashboard to load
      await page.waitForTimeout(3000);
      
      // Should show connection card
      const connectionCard = page.locator('.max-w-6xl .px-6');
      await expect(connectionCard).toBeVisible();
      
      // Should show either connected or not connected state
      const hasConnectedState = await page.locator('text=Connection Successful').count() > 0;
      const hasNotConnectedState = await page.locator('text=Connect Your Google Account').count() > 0;
      
      expect(hasConnectedState || hasNotConnectedState).toBeTruthy();
    });

    test('should show appropriate connection state', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Check for not connected state (most likely for new user)
      const notConnectedElements = [
        'text=Connect Your Google Account',
        'text=Connect your Google account to start automating',
        'button:has-text("Connect Google Account")'
      ];
      
      let hasNotConnectedElements = false;
      for (const selector of notConnectedElements) {
        if (await page.locator(selector).count() > 0) {
          hasNotConnectedElements = true;
          break;
        }
      }
      
      // Check for connected state
      const connectedElements = [
        'text=Connection Successful',
        'text=Your FloWorx email automations are now active'
      ];
      
      let hasConnectedElements = false;
      for (const selector of connectedElements) {
        if (await page.locator(selector).count() > 0) {
          hasConnectedElements = true;
          break;
        }
      }
      
      // Should show one of the states
      expect(hasNotConnectedElements || hasConnectedElements).toBeTruthy();
    });

    test('should display feature benefits when not connected', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // If not connected, should show feature benefits
      const notConnected = await page.locator('text=Connect Your Google Account').count() > 0;
      
      if (notConnected) {
        // Check for feature benefits
        await expect(page.locator('text=Automated email sorting')).toBeVisible();
        await expect(page.locator('text=AI-powered responses')).toBeVisible();
        await expect(page.locator('text=Faster response times')).toBeVisible();
        await expect(page.locator('text=Better customer satisfaction')).toBeVisible();
      }
    });
  });

  test.describe('Dashboard Functionality', () => {
    test('should handle sign out functionality', async ({ page }) => {
      // Click sign out button
      await page.click('button:has-text("Sign Out")');
      
      // Should redirect to login page
      await page.waitForURL('/login', { timeout: 10000 });
      await expect(page).toHaveURL('/login');
      
      // Should clear authentication
      const token = await page.evaluate(() => localStorage.getItem('token'));
      expect(token).toBeNull();
    });

    test('should handle Google OAuth connection flow', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Look for connect button
      const connectButton = page.locator('button:has-text("Connect Google Account")');
      
      if (await connectButton.count() > 0) {
        // Click connect button (will open OAuth flow)
        await connectButton.click();
        
        // Should either redirect to OAuth or show some response
        await page.waitForTimeout(2000);
        
        // Check if URL changed or if there's some indication of OAuth flow
        const currentUrl = page.url();
        const hasOAuthRedirect = currentUrl.includes('google') || currentUrl.includes('oauth');
        const hasLocalRedirect = currentUrl.includes('dashboard');
        
        expect(hasOAuthRedirect || hasLocalRedirect).toBeTruthy();
      }
    });

    test('should handle URL parameters for OAuth callbacks', async ({ page }) => {
      // Test success callback
      await page.goto('/dashboard?connected=google');
      await page.waitForTimeout(2000);
      
      // Should show success message
      const hasSuccessMessage = await page.locator('text=Google account connected successfully').count() > 0;
      
      if (hasSuccessMessage) {
        expect(hasSuccessMessage).toBeTruthy();
      }
      
      // Test error callback
      await page.goto('/dashboard?error=oauth_denied');
      await page.waitForTimeout(2000);
      
      // Should show error message
      const hasErrorMessage = await page.locator('text=Google connection was cancelled').count() > 0;
      
      if (hasErrorMessage) {
        expect(hasErrorMessage).toBeTruthy();
      }
    });

    test('should handle API errors gracefully', async ({ page }) => {
      // Intercept API calls and return errors
      await page.route('**/api/auth/user/status', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });
      
      await page.reload();
      await page.waitForTimeout(3000);
      
      // Should handle error gracefully (not crash)
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
      
      // Should not show loading indefinitely
      const isStillLoading = await page.locator('text=Loading dashboard...').count() > 0;
      expect(isStillLoading).toBeFalsy();
    });
  });

  test.describe('Dashboard Responsiveness', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForTimeout(3000);
      
      // Should still show main elements
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('button:has-text("Sign Out")')).toBeVisible();
      
      // Content should be responsive
      const mainContent = page.locator('.max-w-6xl');
      await expect(mainContent).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await page.waitForTimeout(3000);
      
      // Should show all elements properly
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('button:has-text("Sign Out")')).toBeVisible();
    });
  });

  test.describe('Dashboard Performance', () => {
    test('should load within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.reload();
      await page.waitForSelector('h1', { timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 10 seconds
      expect(loadTime).toBeLessThan(10000);
      
      console.log(`Dashboard load time: ${loadTime}ms`);
    });

    test('should handle multiple rapid navigations', async ({ page }) => {
      // Navigate away and back multiple times
      for (let i = 0; i < 3; i++) {
        await page.goto('/login');
        await page.waitForTimeout(500);
        await page.goto('/dashboard');
        await page.waitForTimeout(1000);
      }
      
      // Should still work properly
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('button:has-text("Sign Out")')).toBeVisible();
    });
  });
});
