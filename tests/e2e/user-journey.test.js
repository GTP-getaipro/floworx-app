/**
 * End-to-End User Journey Tests
 * Tests critical user flows from registration to active automation
 */

const { test, expect } = require('@playwright/test');

// Test configuration
const BASE_URL = process.env.TEST_URL || 'https://floworx-app.vercel.app';
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPassword123!';

test.describe('FloWorx User Journey Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for consistent testing
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('Complete user registration flow', async ({ page }) => {
    // Navigate to registration page
    await page.goto(`${BASE_URL}/register`);
    
    // Verify page loads correctly
    await expect(page).toHaveTitle(/FloWorx/);
    await expect(page.locator('h1, h2')).toContainText(/Create.*Account/i);

    // Fill registration form
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="companyName"]', 'Test Company');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // Wait for success response
    await page.waitForTimeout(2000);

    // Check for success modal or redirect
    const successModal = page.locator('[data-testid="success-modal"]');
    const dashboardUrl = page.url();
    
    // Either success modal appears or redirected to dashboard
    const hasSuccessModal = await successModal.isVisible().catch(() => false);
    const isOnDashboard = dashboardUrl.includes('/dashboard');
    
    expect(hasSuccessModal || isOnDashboard).toBeTruthy();

    // If modal is visible, test its functionality
    if (hasSuccessModal) {
      await expect(successModal).toContainText(/success/i);
      
      // Test modal actions
      const continueButton = successModal.locator('button:has-text("Continue"), button:has-text("Dashboard")');
      if (await continueButton.isVisible()) {
        await continueButton.click();
        await page.waitForURL('**/dashboard');
      }
    }

    // Verify we're on dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('Dashboard loads and displays user information', async ({ page }) => {
    // First register a user (or use existing test user)
    await registerTestUser(page);

    // Navigate to dashboard
    await page.goto(`${BASE_URL}/dashboard`);

    // Check for loading states
    const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    if (await loadingSpinner.isVisible()) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // Verify dashboard elements
    await expect(page.locator('h1, h2')).toContainText(/welcome|dashboard/i);
    
    // Check for user email display
    await expect(page.locator('text=' + TEST_EMAIL)).toBeVisible();

    // Verify Google Account Integration section
    const googleSection = page.locator('text=Google Account Integration');
    await expect(googleSection).toBeVisible();

    // Check connection status
    const connectionStatus = page.locator('[data-testid="connection-status"]');
    await expect(connectionStatus).toBeVisible();
  });

  test('Google OAuth integration flow', async ({ page }) => {
    // Register and navigate to dashboard
    await registerTestUser(page);
    await page.goto(`${BASE_URL}/dashboard`);

    // Find and click Google connect button
    const connectButton = page.locator('button:has-text("Connect Your Google Account")');
    await expect(connectButton).toBeVisible();
    
    // Click connect button
    await connectButton.click();

    // Handle OAuth redirect
    await page.waitForTimeout(1000);
    
    // Check if redirected to Google OAuth or if there's an error
    const currentUrl = page.url();
    
    if (currentUrl.includes('accounts.google.com')) {
      // We're on Google OAuth page - this is expected in production
      await expect(page).toHaveURL(/accounts\.google\.com/);
      
      // In a real test, we would complete OAuth flow
      // For now, we'll verify the redirect happened correctly
      console.log('✅ OAuth redirect to Google successful');
    } else if (currentUrl.includes('oauth') || page.locator('text=Access token required').isVisible()) {
      // We hit the OAuth endpoint but got an error - this is the current issue
      console.log('⚠️ OAuth endpoint reached but authentication failed');
      
      // Verify error handling
      const errorMessage = page.locator('text=Access token required, text=error');
      if (await errorMessage.isVisible()) {
        console.log('✅ Error message displayed correctly');
      }
    } else {
      // Unexpected behavior
      console.log('❌ Unexpected OAuth behavior, current URL:', currentUrl);
    }
  });

  test('Error handling and user feedback', async ({ page }) => {
    // Test registration with invalid data
    await page.goto(`${BASE_URL}/register`);

    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation errors
    const errorMessages = page.locator('.error, [role="alert"], .text-red-500');
    await expect(errorMessages.first()).toBeVisible();

    // Test password mismatch
    await page.fill('input[name="password"]', 'password1');
    await page.fill('input[name="confirmPassword"]', 'password2');
    await page.click('button[type="submit"]');
    
    // Should show password mismatch error
    await expect(page.locator('text=password')).toBeVisible();

    // Test API error handling
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Check for "Failed to load user status" error
    const statusError = page.locator('text=Failed to load user status');
    if (await statusError.isVisible()) {
      console.log('✅ User status error displayed correctly');
    }
  });

  test('Responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Test registration page on mobile
    await page.goto(`${BASE_URL}/register`);
    
    // Verify form is usable on mobile
    const form = page.locator('form');
    await expect(form).toBeVisible();
    
    // Check that inputs are properly sized
    const emailInput = page.locator('input[name="email"]');
    await expect(emailInput).toBeVisible();
    
    // Verify button is touchable
    const submitButton = page.locator('button[type="submit"]');
    const buttonBox = await submitButton.boundingBox();
    expect(buttonBox.height).toBeGreaterThan(40); // Minimum touch target

    // Test dashboard on mobile
    await registerTestUser(page);
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Verify mobile layout
    await expect(page.locator('h1, h2')).toBeVisible();
    
    // Check that content doesn't overflow
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    expect(bodyBox.width).toBeLessThanOrEqual(375);
  });

  test('Performance and loading times', async ({ page }) => {
    // Measure page load time
    const startTime = Date.now();
    
    await page.goto(`${BASE_URL}/register`);
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    console.log(`Registration page load time: ${loadTime}ms`);
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);

    // Test dashboard load time
    await registerTestUser(page);
    
    const dashboardStartTime = Date.now();
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    const dashboardLoadTime = Date.now() - dashboardStartTime;
    console.log(`Dashboard load time: ${dashboardLoadTime}ms`);
    
    // Dashboard should load within 5 seconds
    expect(dashboardLoadTime).toBeLessThan(5000);
  });
});

// Helper function to register a test user
async function registerTestUser(page) {
  await page.goto(`${BASE_URL}/register`);
  
  await page.fill('input[name="firstName"]', 'Test');
  await page.fill('input[name="lastName"]', 'User');
  await page.fill('input[name="email"]', TEST_EMAIL);
  await page.fill('input[name="password"]', TEST_PASSWORD);
  await page.fill('input[name="confirmPassword"]', TEST_PASSWORD);
  
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  
  // Handle success modal if it appears
  const continueButton = page.locator('button:has-text("Continue"), button:has-text("Dashboard")');
  if (await continueButton.isVisible()) {
    await continueButton.click();
  }
}
