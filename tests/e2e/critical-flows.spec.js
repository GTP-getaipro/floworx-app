const { test, expect } = require('@playwright/test');
const testUtils = require('../utils/testUtils');

/**
 * End-to-end test suite for critical user flows
 */
test.describe('Critical User Flows', () => {
  let testData;

  test.beforeAll(async () => {
    // Generate test data
    testData = {
      user: testUtils.generateTestData('user', 1)[0],
      company: testUtils.generateTestData('company', 1)[0]
    };
  });

  test.beforeEach(async ({ page }) => {
    // Set up session and cookies
    await page.goto(process.env.BASE_URL || 'http://localhost:3000');
  });

  test('Complete registration flow', async ({ page }) => {
    await test.step('Navigate to registration', async () => {
      await page.click('text=Sign Up');
      await expect(page).toHaveURL(/.*register/);
    });

    await test.step('Fill registration form', async () => {
      await page.fill('[data-testid="firstName"]', testData.user.firstName);
      await page.fill('[data-testid="lastName"]', testData.user.lastName);
      await page.fill('[data-testid="email"]', testData.user.email);
      await page.fill('[data-testid="password"]', testData.user.password);
      await page.fill('[data-testid="confirmPassword"]', testData.user.password);
    });

    await test.step('Submit registration', async () => {
      await page.click('[data-testid="register-submit"]');
      await expect(page).toHaveURL(/.*dashboard/);
    });

    await test.step('Verify welcome message', async () => {
      const welcomeText = await page.textContent('[data-testid="welcome-message"]');
      expect(welcomeText).toContain(testData.user.firstName);
    });
  });

  test('Login and profile update flow', async ({ page }) => {
    await test.step('Login with credentials', async () => {
      await page.fill('[data-testid="email"]', testData.user.email);
      await page.fill('[data-testid="password"]', testData.user.password);
      await page.click('[data-testid="login-submit"]');
      await expect(page).toHaveURL(/.*dashboard/);
    });

    await test.step('Navigate to profile', async () => {
      await page.click('[data-testid="profile-menu"]');
      await page.click('text=Edit Profile');
      await expect(page).toHaveURL(/.*profile/);
    });

    await test.step('Update profile information', async () => {
      await page.fill('[data-testid="phone"]', testData.user.phone);
      await page.click('[data-testid="save-profile"]');
      
      const toast = await page.waitForSelector('[data-testid="toast-success"]');
      expect(await toast.textContent()).toContain('Profile updated');
    });
  });

  test('Company setup flow', async ({ page }) => {
    await test.step('Login as registered user', async () => {
      await page.fill('[data-testid="email"]', testData.user.email);
      await page.fill('[data-testid="password"]', testData.user.password);
      await page.click('[data-testid="login-submit"]');
    });

    await test.step('Navigate to company setup', async () => {
      await page.click('[data-testid="setup-company"]');
      await expect(page).toHaveURL(/.*company\/setup/);
    });

    await test.step('Fill company information', async () => {
      await page.fill('[data-testid="company-name"]', testData.company.name);
      await page.fill('[data-testid="company-address"]', testData.company.address);
      await page.fill('[data-testid="company-phone"]', testData.company.phone);
      await page.selectOption('[data-testid="company-type"]', testData.company.type);
    });

    await test.step('Submit company setup', async () => {
      await page.click('[data-testid="submit-company"]');
      await expect(page).toHaveURL(/.*dashboard/);
      
      const companyName = await page.textContent('[data-testid="company-display"]');
      expect(companyName).toBe(testData.company.name);
    });
  });

  test('Password reset flow', async ({ page }) => {
    await test.step('Navigate to forgot password', async () => {
      await page.click('text=Forgot Password?');
      await expect(page).toHaveURL(/.*forgot-password/);
    });

    await test.step('Submit reset request', async () => {
      await page.fill('[data-testid="email"]', testData.user.email);
      await page.click('[data-testid="reset-submit"]');
      
      const toast = await page.waitForSelector('[data-testid="toast-success"]');
      expect(await toast.textContent()).toContain('Reset instructions sent');
    });

    // Note: Complete reset flow would require email integration
    // This is a placeholder for the actual implementation
  });

  test('Error handling and validation', async ({ page }) => {
    await test.step('Test form validation', async () => {
      await page.click('text=Sign Up');
      await page.click('[data-testid="register-submit"]');
      
      const errors = await page.$$('[data-testid="error-message"]');
      expect(errors.length).toBeGreaterThan(0);
    });

    await test.step('Test duplicate email', async () => {
      await page.fill('[data-testid="firstName"]', testData.user.firstName);
      await page.fill('[data-testid="lastName"]', testData.user.lastName);
      await page.fill('[data-testid="email"]', testData.user.email);
      await page.fill('[data-testid="password"]', testData.user.password);
      await page.click('[data-testid="register-submit"]');
      
      const toast = await page.waitForSelector('[data-testid="toast-error"]');
      expect(await toast.textContent()).toContain('Email already exists');
    });
  });

  test('Performance and loading states', async ({ page }) => {
    await test.step('Verify loading indicators', async () => {
      await page.fill('[data-testid="email"]', testData.user.email);
      await page.fill('[data-testid="password"]', testData.user.password);
      await page.click('[data-testid="login-submit"]');
      
      await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
      await expect(page).toHaveURL(/.*dashboard/);
    });

    await test.step('Verify data loading placeholder', async () => {
      await page.click('[data-testid="reports-tab"]');
      await expect(page.locator('[data-testid="skeleton-loader"]')).toBeVisible();
      await expect(page.locator('[data-testid="report-data"]')).toBeVisible();
    });
  });
});
