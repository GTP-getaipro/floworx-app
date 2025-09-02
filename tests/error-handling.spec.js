const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('./utils/test-helpers');

test.describe('Error Handling & Edge Cases', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test.describe('Network Failures', () => {
    test('should handle API server downtime gracefully', async ({ page }) => {
      await helpers.loginUser();
      
      // Mock server downtime
      await page.route('**/api/**', async route => {
        await route.abort('failed');
      });
      
      // Try to navigate to dashboard
      await page.goto('/dashboard');
      
      // Verify error handling
      await expect(page.locator('[data-testid="network-error-banner"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Unable to connect to server');
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      // Test retry functionality
      await page.unroute('**/api/**');
      await page.click('[data-testid="retry-button"]');
      
      // Verify recovery
      await helpers.waitForLoader();
      await expect(page.locator('[data-testid="network-error-banner"]')).not.toBeVisible();
    });

    test('should handle slow network connections', async ({ page }) => {
      await helpers.loginUser();
      
      // Mock slow API responses
      await page.route('**/api/dashboard/metrics', async route => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ metrics: {} })
        });
      });
      
      await page.goto('/dashboard');
      
      // Verify loading states
      await expect(page.locator('[data-testid="dashboard-loading"]')).toBeVisible();
      await expect(page.locator('[data-testid="metrics-skeleton"]')).toBeVisible();
      
      // Verify timeout handling
      await expect(page.locator('[data-testid="slow-connection-warning"]')).toBeVisible({ timeout: 6000 });
    });

    test('should handle intermittent connectivity', async ({ page }) => {
      await helpers.loginUser();
      
      let requestCount = 0;
      await page.route('**/api/emails', async route => {
        requestCount++;
        if (requestCount % 2 === 0) {
          await route.abort('failed');
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ emails: [] })
          });
        }
      });
      
      await page.goto('/emails');
      
      // Verify automatic retry mechanism
      await expect(page.locator('[data-testid="connection-unstable-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="auto-retry-indicator"]')).toBeVisible();
    });

    test('should handle CORS errors', async ({ page }) => {
      await helpers.loginUser();
      
      // Mock CORS error
      await page.route('**/api/workflows', async route => {
        await route.fulfill({
          status: 0,
          headers: { 'Access-Control-Allow-Origin': '' }
        });
      });
      
      await page.goto('/workflows');
      
      // Verify CORS error handling
      await expect(page.locator('[data-testid="cors-error-message"]')).toContainText('Cross-origin request blocked');
      await expect(page.locator('[data-testid="contact-support-link"]')).toBeVisible();
    });
  });

  test.describe('Authentication Edge Cases', () => {
    test('should handle progressive lockout correctly', async ({ page }) => {
      const email = 'test.lockout@example.com';
      const wrongPassword = 'WrongPassword123!';
      
      // Create test user
      await helpers.createTestUser({ email });
      
      // Test progressive lockout: 5 attempts, then lockout
      for (let attempt = 1; attempt <= 7; attempt++) {
        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', email);
        await page.fill('[data-testid="password-input"]', wrongPassword);
        await page.click('[data-testid="login-button"]');
        
        if (attempt < 5) {
          await helpers.waitForToast('Invalid email or password', 'error');
        } else if (attempt === 5) {
          await helpers.waitForToast('Account temporarily locked due to multiple failed login attempts', 'error');
        } else {
          // Subsequent attempts should show lockout message immediately
          await helpers.waitForToast('Account is temporarily locked', 'error');
        }
      }
      
      // Verify lockout duration increases (progressive lockout)
      await expect(page.locator('[data-testid="lockout-duration"]')).toContainText('15 minutes');
      
      // Cleanup
      await helpers.deleteTestUser(email);
    });

    test('should handle account recovery token expiration', async ({ page }) => {
      const email = 'test.recovery@example.com';
      await helpers.createTestUser({ email });
      
      // Mock expired token
      await page.route('**/api/auth/reset-password/*', async route => {
        const url = route.request().url();
        if (url.includes('expired-token')) {
          await route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Password reset token has expired',
              code: 'TOKEN_EXPIRED'
            })
          });
        }
      });
      
      // Try to use expired token
      await page.goto('/reset-password?token=expired-token');
      
      // Verify error handling
      await expect(page.locator('[data-testid="token-expired-error"]')).toContainText('Password reset link has expired');
      await expect(page.locator('[data-testid="request-new-link-button"]')).toBeVisible();
      
      // Test requesting new link
      await page.click('[data-testid="request-new-link-button"]');
      await expect(page).toHaveURL('/forgot-password');
      await expect(page.locator('[data-testid="email-input"]')).toHaveValue(email);
      
      // Cleanup
      await helpers.deleteTestUser(email);
    });

    test('should handle concurrent login sessions', async ({ page, context }) => {
      await helpers.loginUser();
      
      // Create second browser context (simulate another device)
      const secondContext = await context.browser().newContext();
      const secondPage = await secondContext.newPage();
      const secondHelpers = new TestHelpers(secondPage);
      
      // Login from second device
      await secondHelpers.loginUser('test.user@example.com', 'TestPassword123!');
      
      // First session should be invalidated
      await page.reload();
      await expect(page.locator('[data-testid="session-expired-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-conflict-message"]')).toContainText('logged in from another device');
      
      // Cleanup
      await secondContext.close();
      await secondHelpers.cleanup();
    });

    test('should handle malformed JWT tokens', async ({ page }) => {
      await page.goto('/login');
      
      // Set malformed token
      await page.evaluate(() => {
        localStorage.setItem('authToken', 'malformed.jwt.token');
      });
      
      // Try to access protected route
      await page.goto('/dashboard');
      
      // Should redirect to login with error
      await expect(page).toHaveURL('/login');
      await helpers.waitForToast('Invalid session. Please log in again.', 'error');
      
      // Verify token is cleared
      const token = await page.evaluate(() => localStorage.getItem('authToken'));
      expect(token).toBeNull();
    });
  });

  test.describe('Input Validation Edge Cases', () => {
    test('should handle XSS attempts in form inputs', async ({ page }) => {
      await page.goto('/register');
      
      const xssPayload = '<script>alert("XSS")</script>';
      
      // Try XSS in various fields
      await page.fill('[data-testid="first-name-input"]', xssPayload);
      await page.fill('[data-testid="last-name-input"]', xssPayload);
      await page.fill('[data-testid="email-input"]', `test${xssPayload}@example.com`);
      
      await page.click('[data-testid="register-button"]');
      
      // Verify XSS is prevented
      await expect(page.locator('[data-testid="first-name-error"]')).toContainText('Invalid characters detected');
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format');
      
      // Verify no script execution
      const alerts = [];
      page.on('dialog', dialog => {
        alerts.push(dialog.message());
        dialog.dismiss();
      });
      
      await page.waitForTimeout(1000);
      expect(alerts).toHaveLength(0);
    });

    test('should handle SQL injection attempts', async ({ page }) => {
      await page.goto('/login');
      
      const sqlPayload = "'; DROP TABLE users; --";
      
      // Try SQL injection in login form
      await page.fill('[data-testid="email-input"]', sqlPayload);
      await page.fill('[data-testid="password-input"]', 'password');
      await page.click('[data-testid="login-button"]');
      
      // Verify SQL injection is prevented
      await helpers.waitForToast('Invalid email format', 'error');
      await expect(page).toHaveURL('/login');
    });

    test('should handle extremely long input values', async ({ page }) => {
      await page.goto('/register');
      
      const longString = 'a'.repeat(10000);
      
      // Try extremely long inputs
      await page.fill('[data-testid="first-name-input"]', longString);
      await page.fill('[data-testid="last-name-input"]', longString);
      
      await page.click('[data-testid="register-button"]');
      
      // Verify length validation
      await expect(page.locator('[data-testid="first-name-error"]')).toContainText('Maximum length exceeded');
      await expect(page.locator('[data-testid="last-name-error"]')).toContainText('Maximum length exceeded');
    });

    test('should handle special characters and unicode', async ({ page }) => {
      await helpers.loginUser();
      await page.goto('/workflows');
      
      // Create workflow with special characters
      await page.click('[data-testid="create-workflow-button"]');
      
      const specialCharsName = 'Test 测试 🔥 Workflow ñáéíóú';
      const unicodeDescription = 'Description with émojis 🚀 and ünïcödé characters';
      
      await page.fill('[data-testid="workflow-name-input"]', specialCharsName);
      await page.fill('[data-testid="workflow-description-input"]', unicodeDescription);
      
      await page.click('[data-testid="save-workflow-button"]');
      
      // Verify special characters are handled correctly
      await helpers.waitForToast('Workflow created successfully');
      await expect(page.locator('[data-testid="workflow-item"]')).toContainText(specialCharsName);
    });
  });

  test.describe('Data Consistency Edge Cases', () => {
    test('should handle concurrent data modifications', async ({ page, context }) => {
      await helpers.loginUser();
      
      // Create test workflow
      const workflow = await helpers.createTestWorkflow({
        name: 'Concurrent Test Workflow'
      });
      
      // Open workflow in two tabs
      await page.goto(`/workflows/${workflow.id}/edit`);
      
      const secondTab = await context.newPage();
      await secondTab.goto(`/workflows/${workflow.id}/edit`);
      
      // Modify workflow in first tab
      await page.fill('[data-testid="workflow-name-input"]', 'Modified in Tab 1');
      await page.click('[data-testid="save-workflow-button"]');
      await helpers.waitForToast('Workflow updated successfully');
      
      // Try to modify in second tab
      await secondTab.fill('[data-testid="workflow-name-input"]', 'Modified in Tab 2');
      await secondTab.click('[data-testid="save-workflow-button"]');
      
      // Verify conflict detection
      await expect(secondTab.locator('[data-testid="conflict-warning"]')).toBeVisible();
      await expect(secondTab.locator('[data-testid="conflict-message"]')).toContainText('This workflow has been modified by another user');
      
      await secondTab.close();
    });

    test('should handle database connection failures', async ({ page }) => {
      await helpers.loginUser();
      
      // Mock database connection error
      await page.route('**/api/**', async route => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Database connection failed',
            code: 'DB_CONNECTION_ERROR'
          })
        });
      });
      
      await page.goto('/dashboard');
      
      // Verify database error handling
      await expect(page.locator('[data-testid="database-error-banner"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Database temporarily unavailable');
      await expect(page.locator('[data-testid="maintenance-mode-indicator"]')).toBeVisible();
    });

    test('should handle data corruption scenarios', async ({ page }) => {
      await helpers.loginUser();
      
      // Mock corrupted data response
      await page.route('**/api/workflows', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            workflows: [
              {
                id: null, // Corrupted ID
                name: undefined, // Missing name
                actions: 'invalid_json' // Invalid JSON
              }
            ]
          })
        });
      });
      
      await page.goto('/workflows');
      
      // Verify graceful handling of corrupted data
      await expect(page.locator('[data-testid="data-corruption-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="safe-mode-indicator"]')).toContainText('Safe Mode');
      await expect(page.locator('[data-testid="contact-support-button"]')).toBeVisible();
    });
  });

  test.describe('Browser Compatibility Edge Cases', () => {
    test('should handle localStorage unavailability', async ({ page }) => {
      // Disable localStorage
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: null,
          writable: false
        });
      });
      
      await page.goto('/login');
      
      // Verify fallback mechanism
      await expect(page.locator('[data-testid="storage-warning"]')).toContainText('Browser storage is disabled');
      await expect(page.locator('[data-testid="session-only-mode"]')).toBeVisible();
    });

    test('should handle JavaScript disabled scenarios', async ({ page }) => {
      // This test would require a different approach in real scenarios
      // as Playwright requires JavaScript, but we can test graceful degradation
      
      await page.goto('/login');
      
      // Verify noscript fallback content exists
      const noscriptContent = await page.locator('noscript').innerHTML();
      expect(noscriptContent).toContain('JavaScript is required');
    });

    test('should handle unsupported browser features', async ({ page }) => {
      // Mock unsupported features
      await page.addInitScript(() => {
        delete window.fetch;
        delete window.WebSocket;
      });
      
      await page.goto('/dashboard');
      
      // Verify feature detection and fallbacks
      await expect(page.locator('[data-testid="browser-compatibility-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-browser-message"]')).toContainText('Please upgrade your browser');
    });
  });
});
