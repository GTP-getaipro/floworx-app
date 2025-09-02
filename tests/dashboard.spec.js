const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('./utils/test-helpers');

test.describe('Dashboard & Navigation', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.loginUser();
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test.describe('Dashboard Overview', () => {
    test('should display dashboard with key metrics', async ({ page }) => {
      await expect(page).toHaveURL('/dashboard');
      
      // Verify main dashboard components
      await expect(page.locator('[data-testid="dashboard-title"]')).toContainText('Dashboard');
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
      
      // Verify key metrics cards
      await expect(page.locator('[data-testid="emails-processed-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflows-active-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-time-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="automation-savings-card"]')).toBeVisible();
      
      // Verify metrics have values
      await expect(page.locator('[data-testid="emails-processed-count"]')).not.toBeEmpty();
      await expect(page.locator('[data-testid="workflows-active-count"]')).not.toBeEmpty();
    });

    test('should display recent activity feed', async ({ page }) => {
      // Verify activity feed section
      await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
      await expect(page.locator('[data-testid="activity-feed-title"]')).toContainText('Recent Activity');
      
      // Check for activity items (may be empty for new users)
      const activityItems = page.locator('[data-testid^="activity-item-"]');
      const count = await activityItems.count();
      
      if (count > 0) {
        // Verify activity item structure
        await expect(activityItems.first().locator('[data-testid="activity-timestamp"]')).toBeVisible();
        await expect(activityItems.first().locator('[data-testid="activity-description"]')).toBeVisible();
        await expect(activityItems.first().locator('[data-testid="activity-type"]')).toBeVisible();
      } else {
        // Verify empty state
        await expect(page.locator('[data-testid="activity-empty-state"]')).toContainText('No recent activity');
      }
    });

    test('should display workflow status overview', async ({ page }) => {
      // Verify workflow status section
      await expect(page.locator('[data-testid="workflow-status"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflow-status-title"]')).toContainText('Workflow Status');
      
      // Check workflow status indicators
      await expect(page.locator('[data-testid="workflows-running"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflows-paused"]')).toBeVisible();
      await expect(page.locator('[data-testid="workflows-error"]')).toBeVisible();
    });

    test('should refresh dashboard data', async ({ page }) => {
      // Get initial email count
      const initialCount = await page.locator('[data-testid="emails-processed-count"]').textContent();
      
      // Click refresh button
      await page.click('[data-testid="refresh-dashboard-button"]');
      
      // Verify loading state
      await expect(page.locator('[data-testid="dashboard-loading"]')).toBeVisible();
      await helpers.waitForLoader();
      
      // Verify data is refreshed (count should be same or updated)
      await expect(page.locator('[data-testid="emails-processed-count"]')).not.toBeEmpty();
      await helpers.waitForToast('Dashboard updated');
    });
  });

  test.describe('Navigation', () => {
    test('should navigate between main sections', async ({ page }) => {
      // Test navigation to Workflows
      await page.click('[data-testid="nav-workflows"]');
      await expect(page).toHaveURL('/workflows');
      await expect(page.locator('[data-testid="page-title"]')).toContainText('Workflows');
      
      // Test navigation to Email Processing
      await page.click('[data-testid="nav-emails"]');
      await expect(page).toHaveURL('/emails');
      await expect(page.locator('[data-testid="page-title"]')).toContainText('Email Processing');
      
      // Test navigation to Analytics
      await page.click('[data-testid="nav-analytics"]');
      await expect(page).toHaveURL('/analytics');
      await expect(page.locator('[data-testid="page-title"]')).toContainText('Analytics');
      
      // Test navigation to Settings
      await page.click('[data-testid="nav-settings"]');
      await expect(page).toHaveURL('/settings');
      await expect(page.locator('[data-testid="page-title"]')).toContainText('Settings');
      
      // Test navigation back to Dashboard
      await page.click('[data-testid="nav-dashboard"]');
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="dashboard-title"]')).toContainText('Dashboard');
    });

    test('should highlight active navigation item', async ({ page }) => {
      // Verify dashboard is active initially
      await expect(page.locator('[data-testid="nav-dashboard"]')).toHaveClass(/active/);
      
      // Navigate to workflows
      await page.click('[data-testid="nav-workflows"]');
      await expect(page.locator('[data-testid="nav-workflows"]')).toHaveClass(/active/);
      await expect(page.locator('[data-testid="nav-dashboard"]')).not.toHaveClass(/active/);
    });

    test('should handle breadcrumb navigation', async ({ page }) => {
      // Navigate to a nested page
      await page.click('[data-testid="nav-workflows"]');
      await page.click('[data-testid="create-workflow-button"]');
      
      // Verify breadcrumbs
      await expect(page.locator('[data-testid="breadcrumb-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="breadcrumb-workflows"]')).toBeVisible();
      await expect(page.locator('[data-testid="breadcrumb-create"]')).toBeVisible();
      
      // Test breadcrumb navigation
      await page.click('[data-testid="breadcrumb-workflows"]');
      await expect(page).toHaveURL('/workflows');
    });

    test('should handle mobile navigation menu', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Verify mobile menu button is visible
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // Open mobile menu
      await page.click('[data-testid="mobile-menu-button"]');
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
      
      // Test mobile navigation
      await page.click('[data-testid="mobile-nav-workflows"]');
      await expect(page).toHaveURL('/workflows');
      
      // Verify menu closes after navigation
      await expect(page.locator('[data-testid="mobile-nav-menu"]')).not.toBeVisible();
    });
  });

  test.describe('User Profile Management', () => {
    test('should display user profile information', async ({ page }) => {
      // Open user menu
      await page.click('[data-testid="user-menu"]');
      await expect(page.locator('[data-testid="user-dropdown"]')).toBeVisible();
      
      // Verify user information
      await expect(page.locator('[data-testid="user-name"]')).toContainText('Test User');
      await expect(page.locator('[data-testid="user-email"]')).toContainText('test.user@example.com');
      
      // Navigate to profile
      await page.click('[data-testid="profile-link"]');
      await expect(page).toHaveURL('/profile');
    });

    test('should update user profile information', async ({ page }) => {
      await page.goto('/profile');
      
      // Update profile information
      await page.fill('[data-testid="first-name-input"]', 'Updated');
      await page.fill('[data-testid="last-name-input"]', 'Name');
      await page.fill('[data-testid="phone-input"]', '+1-555-123-4567');
      
      await page.click('[data-testid="save-profile-button"]');
      
      // Verify success
      await helpers.waitForToast('Profile updated successfully');
      
      // Verify changes are reflected in UI
      await expect(page.locator('[data-testid="first-name-input"]')).toHaveValue('Updated');
      await expect(page.locator('[data-testid="last-name-input"]')).toHaveValue('Name');
    });

    test('should change user password', async ({ page }) => {
      await page.goto('/profile');
      
      // Navigate to password change section
      await page.click('[data-testid="change-password-tab"]');
      
      // Fill password change form
      await page.fill('[data-testid="current-password-input"]', 'TestPassword123!');
      await page.fill('[data-testid="new-password-input"]', 'NewPassword123!');
      await page.fill('[data-testid="confirm-new-password-input"]', 'NewPassword123!');
      
      await page.click('[data-testid="change-password-button"]');
      
      // Verify success
      await helpers.waitForToast('Password changed successfully');
      
      // Verify form is cleared
      await expect(page.locator('[data-testid="current-password-input"]')).toHaveValue('');
      await expect(page.locator('[data-testid="new-password-input"]')).toHaveValue('');
      await expect(page.locator('[data-testid="confirm-new-password-input"]')).toHaveValue('');
    });

    test('should validate password change requirements', async ({ page }) => {
      await page.goto('/profile');
      await page.click('[data-testid="change-password-tab"]');
      
      // Test weak password
      await page.fill('[data-testid="current-password-input"]', 'TestPassword123!');
      await page.fill('[data-testid="new-password-input"]', '123');
      await page.fill('[data-testid="confirm-new-password-input"]', '123');
      
      await page.click('[data-testid="change-password-button"]');
      
      // Verify error
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 8 characters');
      
      // Test mismatched passwords
      await page.fill('[data-testid="new-password-input"]', 'NewPassword123!');
      await page.fill('[data-testid="confirm-new-password-input"]', 'DifferentPassword123!');
      
      await page.click('[data-testid="change-password-button"]');
      
      // Verify error
      await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText('Passwords do not match');
    });
  });

  test.describe('Settings Management', () => {
    test('should display and update notification settings', async ({ page }) => {
      await page.goto('/settings');
      
      // Navigate to notifications tab
      await page.click('[data-testid="notifications-tab"]');
      
      // Update notification preferences
      await page.check('[data-testid="email-notifications-checkbox"]');
      await page.check('[data-testid="urgent-notifications-checkbox"]');
      await page.selectOption('[data-testid="notification-frequency-select"]', 'daily');
      
      await page.click('[data-testid="save-notifications-button"]');
      
      // Verify success
      await helpers.waitForToast('Notification settings updated');
    });

    test('should display and update business settings', async ({ page }) => {
      await page.goto('/settings');
      
      // Navigate to business tab
      await page.click('[data-testid="business-tab"]');
      
      // Update business information
      await page.fill('[data-testid="business-name-input"]', 'Hot Tub Pros LLC');
      await page.fill('[data-testid="business-phone-input"]', '+1-555-987-6543');
      await page.fill('[data-testid="business-address-input"]', '123 Service St, City, ST 12345');
      
      await page.click('[data-testid="save-business-button"]');
      
      // Verify success
      await helpers.waitForToast('Business settings updated');
    });

    test('should manage API integrations', async ({ page }) => {
      await page.goto('/settings');
      
      // Navigate to integrations tab
      await page.click('[data-testid="integrations-tab"]');
      
      // Verify Gmail integration status
      await expect(page.locator('[data-testid="gmail-integration-status"]')).toBeVisible();
      
      // Test disconnect/reconnect Gmail
      if (await page.locator('[data-testid="disconnect-gmail-button"]').isVisible()) {
        await page.click('[data-testid="disconnect-gmail-button"]');
        await helpers.waitForToast('Gmail disconnected');
        await expect(page.locator('[data-testid="connect-gmail-button"]')).toBeVisible();
      }
    });

    test('should handle account deletion', async ({ page }) => {
      await page.goto('/settings');
      
      // Navigate to account tab
      await page.click('[data-testid="account-tab"]');
      
      // Scroll to danger zone
      await page.locator('[data-testid="danger-zone"]').scrollIntoViewIfNeeded();
      
      // Click delete account button
      await page.click('[data-testid="delete-account-button"]');
      
      // Verify confirmation modal
      await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="delete-warning-text"]')).toContainText('This action cannot be undone');
      
      // Cancel deletion
      await page.click('[data-testid="cancel-delete-button"]');
      await expect(page.locator('[data-testid="delete-confirmation-modal"]')).not.toBeVisible();
    });
  });

  test.describe('Search and Filtering', () => {
    test('should search across different sections', async ({ page }) => {
      // Test global search
      await page.fill('[data-testid="global-search-input"]', 'service request');
      await page.press('[data-testid="global-search-input"]', 'Enter');

      // Verify search results page
      await expect(page).toHaveURL(/\/search\?q=service\+request/);
      await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

      // Verify search filters
      await expect(page.locator('[data-testid="filter-emails"]')).toBeVisible();
      await expect(page.locator('[data-testid="filter-workflows"]')).toBeVisible();
      await expect(page.locator('[data-testid="filter-categories"]')).toBeVisible();
    });

    test('should filter dashboard data by date range', async ({ page }) => {
      // Open date filter
      await page.click('[data-testid="date-filter-button"]');

      // Select last 7 days
      await page.click('[data-testid="filter-7-days"]');

      // Verify filter is applied
      await expect(page.locator('[data-testid="active-filter"]')).toContainText('Last 7 days');
      await helpers.waitForLoader();

      // Verify metrics are updated
      await expect(page.locator('[data-testid="emails-processed-count"]')).not.toBeEmpty();
    });
  });

  test.describe('Responsive Design', () => {
    test('should adapt to tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });

      // Verify responsive layout
      await expect(page.locator('[data-testid="dashboard-grid"]')).toHaveClass(/tablet-layout/);
      await expect(page.locator('[data-testid="sidebar"]')).toHaveClass(/collapsed/);
    });

    test('should adapt to mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });

      // Verify mobile layout
      await expect(page.locator('[data-testid="mobile-header"]')).toBeVisible();
      await expect(page.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible();

      // Verify metrics stack vertically
      await expect(page.locator('[data-testid="metrics-container"]')).toHaveClass(/mobile-stack/);
    });
  });
});
