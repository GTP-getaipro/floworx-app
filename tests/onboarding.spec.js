const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('./utils/test-helpers');

test.describe('User Onboarding Flow', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test.describe('Complete Onboarding Journey', () => {
    test('should complete full onboarding flow for new user', async ({ page }) => {
      // Step 1: Register new user
      const userData = await helpers.registerUser({
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: `sarah.johnson.${Date.now()}@example.com`,
        password: 'SecurePassword123!'
      });

      // Verify registration success and redirect to onboarding
      await expect(page).toHaveURL('/onboarding/welcome');
      await expect(page.locator('[data-testid="welcome-title"]')).toContainText('Welcome to Floworx');
      await expect(page.locator('[data-testid="user-name"]')).toContainText('Sarah Johnson');

      // Step 2: Business Type Selection
      await page.click('[data-testid="continue-button"]');
      await expect(page).toHaveURL('/onboarding/business-type');
      
      await page.click('[data-testid="business-type-hot-tub-service"]');
      await page.click('[data-testid="continue-button"]');

      // Step 3: Google OAuth Integration
      await expect(page).toHaveURL('/onboarding/gmail-integration');
      await expect(page.locator('[data-testid="gmail-integration-title"]')).toContainText('Connect Your Gmail');
      
      // Mock Google OAuth flow
      await page.route('**/auth/google', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            user: { email: userData.email },
            tokens: { access_token: 'mock_access_token', refresh_token: 'mock_refresh_token' }
          })
        });
      });

      await page.click('[data-testid="connect-gmail-button"]');
      await helpers.waitForToast('Gmail connected successfully!');

      // Step 4: Gmail Label Mapping
      await page.click('[data-testid="continue-button"]');
      await expect(page).toHaveURL('/onboarding/label-mapping');
      
      // Mock Gmail labels API response
      await page.route('**/api/gmail/labels', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            labels: [
              { id: 'INBOX', name: 'INBOX' },
              { id: 'service_requests', name: 'Service Requests' },
              { id: 'customer_inquiries', name: 'Customer Inquiries' },
              { id: 'urgent', name: 'Urgent' }
            ]
          })
        });
      });

      // Wait for labels to load
      await expect(page.locator('[data-testid="gmail-label-service_requests"]')).toBeVisible();
      
      // Map labels to categories
      await page.selectOption('[data-testid="category-mapping-service_requests"]', 'service_request');
      await page.selectOption('[data-testid="category-mapping-customer_inquiries"]', 'general_inquiry');
      await page.selectOption('[data-testid="category-mapping-urgent"]', 'emergency');
      
      await page.click('[data-testid="save-mappings-button"]');
      await helpers.waitForToast('Label mappings saved successfully!');

      // Step 5: Team Notifications Setup
      await page.click('[data-testid="continue-button"]');
      await expect(page).toHaveURL('/onboarding/notifications');
      
      await page.fill('[data-testid="notification-email-input"]', 'team@hottubpros.com');
      await page.check('[data-testid="notify-urgent-checkbox"]');
      await page.check('[data-testid="notify-service-requests-checkbox"]');
      await page.selectOption('[data-testid="notification-frequency-select"]', 'immediate');
      
      await page.click('[data-testid="save-notifications-button"]');
      await helpers.waitForToast('Notification preferences saved!');

      // Step 6: Review and Complete
      await page.click('[data-testid="continue-button"]');
      await expect(page).toHaveURL('/onboarding/review');
      
      // Verify all settings are displayed correctly
      await expect(page.locator('[data-testid="review-business-type"]')).toContainText('Hot Tub Service');
      await expect(page.locator('[data-testid="review-gmail-status"]')).toContainText('Connected');
      await expect(page.locator('[data-testid="review-label-mappings"]')).toContainText('3 labels mapped');
      await expect(page.locator('[data-testid="review-notifications"]')).toContainText('team@hottubpros.com');

      // Complete onboarding
      await page.click('[data-testid="complete-onboarding-button"]');
      
      // Verify redirect to dashboard
      await expect(page).toHaveURL('/dashboard');
      await helpers.waitForToast('Welcome to Floworx! Your automation is now active.');
      
      // Verify onboarding completion in database
      const user = await helpers.getUserByEmail(userData.email);
      expect(user.onboarding_completed).toBe(true);
      expect(user.business_type).toBe('hot_tub_service');

      // Cleanup
      await helpers.deleteTestUser(userData.email);
    });

    test('should handle onboarding interruption and resume', async ({ page }) => {
      // Start onboarding
      const userData = await helpers.registerUser();
      
      // Complete first step
      await page.click('[data-testid="continue-button"]');
      await page.click('[data-testid="business-type-hot-tub-service"]');
      await page.click('[data-testid="continue-button"]');
      
      // Simulate interruption (close browser/navigate away)
      await page.goto('/dashboard');
      
      // Should redirect back to onboarding
      await expect(page).toHaveURL('/onboarding/gmail-integration');
      await expect(page.locator('[data-testid="progress-indicator"]')).toContainText('Step 2 of 5');

      // Cleanup
      await helpers.deleteTestUser(userData.email);
    });

    test('should skip onboarding for users who already completed it', async ({ page }) => {
      // Create user with completed onboarding
      const user = await helpers.createTestUser({
        onboarding_completed: true,
        business_type: 'hot_tub_service'
      });

      // Login and try to access onboarding
      await helpers.loginUser(user.email, 'TestPassword123!');
      await page.goto('/onboarding/welcome');
      
      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard');

      // Cleanup
      await helpers.deleteTestUser(user.email);
    });
  });

  test.describe('Business Type Selection', () => {
    test('should display all available business types', async ({ page }) => {
      const userData = await helpers.registerUser();
      await page.click('[data-testid="continue-button"]');
      
      // Verify all business types are available
      await expect(page.locator('[data-testid="business-type-hot-tub-service"]')).toBeVisible();
      await expect(page.locator('[data-testid="business-type-pool-service"]')).toBeVisible();
      await expect(page.locator('[data-testid="business-type-spa-service"]')).toBeVisible();
      await expect(page.locator('[data-testid="business-type-other"]')).toBeVisible();

      // Cleanup
      await helpers.deleteTestUser(userData.email);
    });

    test('should require business type selection before continuing', async ({ page }) => {
      const userData = await helpers.registerUser();
      await page.click('[data-testid="continue-button"]');
      
      // Try to continue without selection
      await page.click('[data-testid="continue-button"]');
      
      // Should show error and stay on same page
      await expect(page.locator('[data-testid="business-type-error"]')).toContainText('Please select a business type');
      await expect(page).toHaveURL('/onboarding/business-type');

      // Cleanup
      await helpers.deleteTestUser(userData.email);
    });

    test('should handle custom business type input', async ({ page }) => {
      const userData = await helpers.registerUser();
      await page.click('[data-testid="continue-button"]');
      
      // Select "Other" option
      await page.click('[data-testid="business-type-other"]');
      
      // Should show custom input field
      await expect(page.locator('[data-testid="custom-business-type-input"]')).toBeVisible();
      
      // Fill custom business type
      await page.fill('[data-testid="custom-business-type-input"]', 'Pool Equipment Repair');
      await page.click('[data-testid="continue-button"]');
      
      // Should proceed to next step
      await expect(page).toHaveURL('/onboarding/gmail-integration');

      // Cleanup
      await helpers.deleteTestUser(userData.email);
    });
  });

  test.describe('Gmail Integration', () => {
    test('should handle Gmail OAuth success', async ({ page }) => {
      const userData = await helpers.registerUser();
      await page.click('[data-testid="continue-button"]');
      await page.click('[data-testid="business-type-hot-tub-service"]');
      await page.click('[data-testid="continue-button"]');
      
      // Mock successful OAuth
      await page.route('**/auth/google', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            user: { email: userData.email },
            tokens: { access_token: 'mock_token', refresh_token: 'mock_refresh' }
          })
        });
      });

      await page.click('[data-testid="connect-gmail-button"]');
      
      // Verify success state
      await helpers.waitForToast('Gmail connected successfully!');
      await expect(page.locator('[data-testid="gmail-status"]')).toContainText('Connected');
      await expect(page.locator('[data-testid="continue-button"]')).toBeEnabled();

      // Cleanup
      await helpers.deleteTestUser(userData.email);
    });

    test('should handle Gmail OAuth failure', async ({ page }) => {
      const userData = await helpers.registerUser();
      await page.click('[data-testid="continue-button"]');
      await page.click('[data-testid="business-type-hot-tub-service"]');
      await page.click('[data-testid="continue-button"]');
      
      // Mock OAuth failure
      await page.route('**/auth/google', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'OAuth authorization failed'
          })
        });
      });

      await page.click('[data-testid="connect-gmail-button"]');
      
      // Verify error state
      await helpers.waitForToast('Failed to connect Gmail. Please try again.', 'error');
      await expect(page.locator('[data-testid="gmail-status"]')).toContainText('Not Connected');
      await expect(page.locator('[data-testid="continue-button"]')).toBeDisabled();

      // Cleanup
      await helpers.deleteTestUser(userData.email);
    });

    test('should allow skipping Gmail integration', async ({ page }) => {
      const userData = await helpers.registerUser();
      await page.click('[data-testid="continue-button"]');
      await page.click('[data-testid="business-type-hot-tub-service"]');
      await page.click('[data-testid="continue-button"]');
      
      // Skip Gmail integration
      await page.click('[data-testid="skip-gmail-button"]');
      
      // Should proceed to notifications step (skipping label mapping)
      await expect(page).toHaveURL('/onboarding/notifications');

      // Cleanup
      await helpers.deleteTestUser(userData.email);
    });
  });

  test.describe('Progress Tracking', () => {
    test('should display correct progress throughout onboarding', async ({ page }) => {
      const userData = await helpers.registerUser();
      
      // Step 1: Welcome
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '0');
      await expect(page.locator('[data-testid="progress-text"]')).toContainText('Step 1 of 5');
      
      // Step 2: Business Type
      await page.click('[data-testid="continue-button"]');
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '20');
      await expect(page.locator('[data-testid="progress-text"]')).toContainText('Step 2 of 5');
      
      // Step 3: Gmail Integration
      await page.click('[data-testid="business-type-hot-tub-service"]');
      await page.click('[data-testid="continue-button"]');
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('aria-valuenow', '40');
      await expect(page.locator('[data-testid="progress-text"]')).toContainText('Step 3 of 5');

      // Cleanup
      await helpers.deleteTestUser(userData.email);
    });

    test('should allow navigation back to previous steps', async ({ page }) => {
      const userData = await helpers.registerUser();
      
      // Navigate to step 3
      await page.click('[data-testid="continue-button"]');
      await page.click('[data-testid="business-type-hot-tub-service"]');
      await page.click('[data-testid="continue-button"]');
      
      // Go back to previous step
      await page.click('[data-testid="back-button"]');
      await expect(page).toHaveURL('/onboarding/business-type');
      
      // Verify previous selection is preserved
      await expect(page.locator('[data-testid="business-type-hot-tub-service"]')).toBeChecked();

      // Cleanup
      await helpers.deleteTestUser(userData.email);
    });
  });
});
