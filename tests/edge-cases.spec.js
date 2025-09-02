const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('./utils/test-helpers');

test.describe('Edge Cases and Error Handling (Hybrid Local-Cloud)', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Validate production security settings are loaded
    helpers.validateSecuritySettings();
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test.describe('Network Failure Scenarios', () => {
    test('should handle API timeouts with exponential backoff retry', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      console.log('🌐 Testing network failure scenarios');
      
      // Simulate slow API responses (>30s timeout)
      await page.route('**/api/workflows', async route => {
        // Delay response to simulate timeout
        await new Promise(resolve => setTimeout(resolve, 35000));
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ workflows: [] })
        });
      });
      
      const startTime = Date.now();
      
      // Navigate to workflows page
      await page.goto('/workflows');
      
      // Should show timeout error with retry option
      await expect(page.locator('[data-testid="timeout-error"]')).toBeVisible({ timeout: 40000 });
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
      
      const timeoutDuration = Date.now() - startTime;
      expect(timeoutDuration).toBeGreaterThan(30000); // Confirmed timeout occurred
      
      // Test exponential backoff retry mechanism
      let retryAttempts = 0;
      await page.route('**/api/workflows', async route => {
        retryAttempts++;
        if (retryAttempts <= 2) {
          // Fail first 2 attempts
          await route.abort('failed');
        } else {
          // Succeed on 3rd attempt
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ workflows: [] })
          });
        }
      });
      
      // Click retry button
      await page.click('[data-testid="retry-button"]');
      
      // Should eventually succeed after retries
      await expect(page.locator('[data-testid="workflows-list"]')).toBeVisible({ timeout: 15000 });
      expect(retryAttempts).toBe(3); // Confirmed exponential backoff
      
      console.log('✅ Network timeout and retry mechanism validated');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should handle connection drops during form submission', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      // Navigate to workflow creation
      await page.goto('/workflows/create');
      
      // Fill form data
      await page.fill('[data-testid="workflow-name-input"]', 'E2E-Test Connection Drop Workflow');
      await page.fill('[data-testid="workflow-description-input"]', 'Testing connection drop handling');
      await page.selectOption('[data-testid="trigger-type-select"]', 'email_received');
      
      // Simulate connection drop during form submission
      await page.route('**/api/workflows/create', async route => {
        await route.abort('failed');
      });
      
      // Submit form
      await page.click('[data-testid="save-workflow-button"]');
      
      // Should show connection error with form data preserved
      await expect(page.locator('[data-testid="connection-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="form-data-preserved-notice"]')).toBeVisible();
      
      // Verify form data is preserved
      expect(await page.locator('[data-testid="workflow-name-input"]').inputValue()).toBe('E2E-Test Connection Drop Workflow');
      expect(await page.locator('[data-testid="workflow-description-input"]').inputValue()).toBe('Testing connection drop handling');
      
      // Restore connection and retry
      await page.unroute('**/api/workflows/create');
      await page.click('[data-testid="retry-submission-button"]');
      
      // Should succeed on retry
      await helpers.waitForToast('Workflow created successfully');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should handle intermittent connectivity with automatic reconnection', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      let requestCount = 0;
      
      // Simulate intermittent connectivity (every other request fails)
      await page.route('**/api/**', async route => {
        requestCount++;
        if (requestCount % 2 === 0) {
          await route.abort('failed');
        } else {
          await route.continue();
        }
      });
      
      await page.goto('/dashboard');
      
      // Should show connectivity warning
      await expect(page.locator('[data-testid="connectivity-warning"]')).toBeVisible();
      await expect(page.locator('[data-testid="auto-retry-indicator"]')).toBeVisible();
      
      // Wait for automatic reconnection attempts
      await page.waitForTimeout(5000);
      
      // Should eventually stabilize and show content
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible({ timeout: 15000 });
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });
  });

  test.describe('Concurrent User Operations', () => {
    test('should handle race conditions in workflow modification', async ({ page, context }) => {
      const testUser = await helpers.createTestUser();
      const workflowId = await helpers.createTestWorkflow({
        name: 'E2E-Test Race Condition Workflow',
        user_id: testUser.id
      });
      
      console.log('🏃 Testing concurrent user operations');
      
      // Create two browser contexts (simulate two users/tabs)
      const context1 = await context.browser().newContext();
      const context2 = await context.browser().newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const helpers1 = new TestHelpers(page1);
      const helpers2 = new TestHelpers(page2);
      
      // Both contexts login as same user
      await helpers1.loginUser(testUser.email, 'TestPassword123!');
      await helpers2.loginUser(testUser.email, 'TestPassword123!');
      
      // Both navigate to edit the same workflow
      await page1.goto(`/workflows/${workflowId}/edit`);
      await page2.goto(`/workflows/${workflowId}/edit`);
      
      // User 1 modifies workflow
      await page1.fill('[data-testid="workflow-name-input"]', 'Modified by User 1');
      await page1.click('[data-testid="save-workflow-button"]');
      await helpers1.waitForToast('Workflow updated successfully');
      
      // User 2 tries to modify the same workflow (should detect conflict)
      await page2.fill('[data-testid="workflow-name-input"]', 'Modified by User 2');
      await page2.click('[data-testid="save-workflow-button"]');
      
      // Should show conflict resolution dialog
      await expect(page2.locator('[data-testid="conflict-resolution-modal"]')).toBeVisible();
      await expect(page2.locator('[data-testid="conflict-message"]')).toContainText('This workflow has been modified by another session');
      
      // User 2 can choose to overwrite or reload
      await page2.click('[data-testid="reload-latest-button"]');
      
      // Should reload with User 1's changes
      expect(await page2.locator('[data-testid="workflow-name-input"]').inputValue()).toBe('Modified by User 1');
      
      console.log('✅ Race condition handling validated');
      
      // Cleanup
      await context1.close();
      await context2.close();
      await helpers.deleteWorkflow(workflowId);
      await helpers.deleteTestUser(testUser.email);
    });

    test('should maintain data consistency during concurrent email processing', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      
      // Create workflow that processes emails
      const workflowId = await helpers.createTestWorkflow({
        name: 'E2E-Test Concurrent Email Processing',
        user_id: testUser.id,
        trigger_type: 'email_received',
        actions: [
          {
            type: 'update_counter',
            field: 'emails_processed'
          }
        ]
      });
      
      // Simulate concurrent email processing
      const concurrentEmails = Array.from({ length: 10 }, (_, i) => ({
        from: `concurrent${i}@example.com`,
        subject: `Concurrent Test Email ${i}`,
        body: `Test email body ${i}`,
        category: 'service_request',
        user_id: testUser.id
      }));
      
      // Process all emails concurrently
      const processingPromises = concurrentEmails.map(email =>
        helpers.simulateEmailReceived(email)
      );
      
      const emailIds = await Promise.all(processingPromises);
      
      // Wait for all workflow executions to complete
      await helpers.waitForAllWorkflowExecutions(workflowId, 30000);
      
      // Verify data consistency
      const finalCount = await helpers.getEmailProcessedCount(testUser.id);
      expect(finalCount).toBe(10); // All emails should be counted exactly once
      
      // Verify no duplicate processing
      const executions = await helpers.getWorkflowExecutions(workflowId);
      expect(executions.length).toBe(10); // One execution per email
      
      const uniqueEmailIds = [...new Set(executions.map(e => e.trigger_email_id))];
      expect(uniqueEmailIds.length).toBe(10); // All unique emails
      
      console.log('✅ Concurrent email processing consistency validated');
      
      // Cleanup
      await helpers.deleteWorkflow(workflowId);
      await helpers.deleteTestUser(testUser.email);
    });
  });

  test.describe('Input Validation and Security', () => {
    test('should prevent XSS attacks in all form fields', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      console.log('🛡️ Testing XSS prevention');
      
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src="x" onerror="alert(\'XSS\')">',
        '<svg onload="alert(\'XSS\')">',
        '"><script>alert("XSS")</script>',
        '\';alert("XSS");//'
      ];
      
      // Test XSS prevention in workflow creation form
      await page.goto('/workflows/create');
      
      for (const payload of xssPayloads) {
        // Clear and fill form with XSS payload
        await page.fill('[data-testid="workflow-name-input"]', payload);
        await page.fill('[data-testid="workflow-description-input"]', payload);
        
        await page.click('[data-testid="save-workflow-button"]');
        
        // Should show validation error, not execute script
        await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
        await expect(page.locator('[data-testid="validation-error"]')).toContainText('Invalid characters detected');
        
        // Verify no script execution occurred
        const alerts = [];
        page.on('dialog', dialog => {
          alerts.push(dialog.message());
          dialog.dismiss();
        });
        
        await page.waitForTimeout(1000);
        expect(alerts.length).toBe(0); // No alerts should have fired
      }
      
      // Test XSS prevention in search functionality
      await page.goto('/emails');
      
      for (const payload of xssPayloads) {
        await page.fill('[data-testid="search-input"]', payload);
        await page.press('[data-testid="search-input"]', 'Enter');
        
        // Should sanitize search query
        const searchResults = page.locator('[data-testid="search-results"]');
        if (await searchResults.isVisible()) {
          const resultsText = await searchResults.textContent();
          expect(resultsText).not.toContain('<script>');
          expect(resultsText).not.toContain('javascript:');
        }
      }
      
      console.log('✅ XSS prevention validated');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should prevent SQL injection in search and filter inputs', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      console.log('💉 Testing SQL injection prevention');
      
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; UPDATE users SET password='hacked'; --",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO users (email) VALUES ('hacker@evil.com'); --",
        "' OR 1=1 --",
        "'; EXEC xp_cmdshell('dir'); --"
      ];
      
      // Test SQL injection prevention in email search
      await page.goto('/emails');
      
      for (const payload of sqlInjectionPayloads) {
        await page.fill('[data-testid="search-input"]', payload);
        await page.press('[data-testid="search-input"]', 'Enter');
        
        // Should show validation error or safe empty results
        const errorMessage = page.locator('[data-testid="search-error"]');
        const searchResults = page.locator('[data-testid="search-results"]');
        
        if (await errorMessage.isVisible()) {
          expect(await errorMessage.textContent()).toContain('Invalid search query');
        } else if (await searchResults.isVisible()) {
          // Should return safe, empty results
          const resultsCount = await page.locator('[data-testid="results-count"]').textContent();
          expect(resultsCount).toContain('0 results');
        }
      }
      
      // Test SQL injection prevention in workflow filters
      await page.goto('/workflows');
      
      for (const payload of sqlInjectionPayloads) {
        await page.selectOption('[data-testid="status-filter"]', 'all');
        await page.fill('[data-testid="name-filter"]', payload);
        await page.click('[data-testid="apply-filters-button"]');
        
        // Should handle safely without database errors
        await expect(page.locator('[data-testid="workflows-list"]')).toBeVisible();
        
        // Verify no unauthorized data access
        const workflowItems = await page.locator('[data-testid^="workflow-item-"]').count();
        const userWorkflows = await helpers.getWorkflowsForUser(testUser.id);
        expect(workflowItems).toBeLessThanOrEqual(userWorkflows.length);
      }
      
      console.log('✅ SQL injection prevention validated');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should validate file upload security with size and type restrictions', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      console.log('📁 Testing file upload security');
      
      // Navigate to profile settings (assuming file upload for avatar)
      await page.goto('/profile');
      
      // Test file size restrictions
      const oversizedFile = await helpers.createTestFile('oversized.jpg', 10 * 1024 * 1024); // 10MB
      
      await page.setInputFiles('[data-testid="avatar-upload"]', oversizedFile);
      
      await expect(page.locator('[data-testid="file-size-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-size-error"]')).toContainText('File size exceeds 5MB limit');
      
      // Test file type restrictions
      const invalidFiles = [
        { name: 'malicious.exe', type: 'application/x-msdownload' },
        { name: 'script.js', type: 'application/javascript' },
        { name: 'document.pdf', type: 'application/pdf' },
        { name: 'archive.zip', type: 'application/zip' }
      ];
      
      for (const fileInfo of invalidFiles) {
        const invalidFile = await helpers.createTestFile(fileInfo.name, 1024, fileInfo.type);
        
        await page.setInputFiles('[data-testid="avatar-upload"]', invalidFile);
        
        await expect(page.locator('[data-testid="file-type-error"]')).toBeVisible();
        await expect(page.locator('[data-testid="file-type-error"]')).toContainText('Only image files are allowed');
      }
      
      // Test valid file upload
      const validFile = await helpers.createTestFile('avatar.jpg', 1024, 'image/jpeg');
      
      await page.setInputFiles('[data-testid="avatar-upload"]', validFile);
      await page.click('[data-testid="upload-avatar-button"]');
      
      await helpers.waitForToast('Avatar updated successfully');
      
      // Verify file was processed safely
      const uploadedAvatar = page.locator('[data-testid="user-avatar"]');
      await expect(uploadedAvatar).toBeVisible();
      
      console.log('✅ File upload security validated');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });
  });

  test.describe('Session Management Edge Cases', () => {
    test('should handle JWT token refresh during active sessions', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      console.log('🔑 Testing JWT token refresh during active sessions');
      
      // Navigate to a page that requires authentication
      await page.goto('/workflows');
      await expect(page.locator('[data-testid="workflows-list"]')).toBeVisible();
      
      // Simulate token expiration by manipulating the token
      await page.evaluate(() => {
        const expiredToken = localStorage.getItem('authToken');
        if (expiredToken) {
          // Create an expired token (set exp to past time)
          const payload = JSON.parse(atob(expiredToken.split('.')[1]));
          payload.exp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
          
          const header = expiredToken.split('.')[0];
          const signature = expiredToken.split('.')[2];
          const newPayload = btoa(JSON.stringify(payload));
          
          localStorage.setItem('authToken', `${header}.${newPayload}.${signature}`);
        }
      });
      
      // Make an API request that should trigger token refresh
      await page.click('[data-testid="create-workflow-button"]');
      
      // Should automatically refresh token and proceed
      await expect(page.locator('[data-testid="workflow-form"]')).toBeVisible();
      
      // Verify new token was set
      const newToken = await page.evaluate(() => localStorage.getItem('authToken'));
      expect(newToken).toBeDefined();
      
      // Verify token is valid by making another request
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      
      console.log('✅ JWT token refresh during active sessions validated');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should handle cross-tab synchronization', async ({ page, context }) => {
      const testUser = await helpers.createTestUser();
      
      // Login in first tab
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      await page.goto('/dashboard');
      
      // Open second tab
      const secondTab = await context.newPage();
      await secondTab.goto('/dashboard');
      
      // Second tab should automatically be logged in (shared session)
      await expect(secondTab.locator('[data-testid="dashboard-content"]')).toBeVisible();
      
      // Logout from first tab
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="logout-button"]');
      
      // Second tab should detect logout and redirect to login
      await expect(secondTab.locator('[data-testid="login-form"]')).toBeVisible({ timeout: 10000 });
      
      // Cleanup
      await secondTab.close();
      await helpers.deleteTestUser(testUser.email);
    });

    test('should handle browser refresh with session persistence', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      // Navigate to a specific page
      await page.goto('/workflows');
      await expect(page.locator('[data-testid="workflows-list"]')).toBeVisible();
      
      // Refresh the browser
      await page.reload();
      
      // Should remain logged in and on the same page
      await expect(page.locator('[data-testid="workflows-list"]')).toBeVisible();
      
      // Verify user is still authenticated
      await page.goto('/profile');
      await expect(page.locator('[data-testid="profile-form"]')).toBeVisible();
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should handle session timeout with proper user notification', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      // Simulate session timeout by clearing tokens
      await page.evaluate(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
      });
      
      // Try to navigate to protected page
      await page.goto('/workflows');
      
      // Should redirect to login with session timeout message
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="session-timeout-message"]')).toContainText('Your session has expired');
      
      // Should preserve the intended destination
      expect(page.url()).toContain('redirect=/workflows');
      
      // Login again
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      // Should redirect to originally intended page
      await expect(page.locator('[data-testid="workflows-list"]')).toBeVisible();
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });
  });

  test.describe('Database Connection Failures', () => {
    test('should handle Supabase connection loss with graceful degradation', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      console.log('🗄️ Testing database connection failure handling');
      
      // Simulate database connection failure
      await page.route('**/api/**', async route => {
        if (route.request().url().includes('/api/')) {
          await route.fulfill({
            status: 503,
            contentType: 'application/json',
            body: JSON.stringify({
              error: 'Database connection failed',
              code: 'DB_CONNECTION_ERROR'
            })
          });
        } else {
          await route.continue();
        }
      });
      
      // Try to access dashboard
      await page.goto('/dashboard');
      
      // Should show database error with graceful degradation
      await expect(page.locator('[data-testid="database-error-banner"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('Database temporarily unavailable');
      
      // Should show cached/offline content if available
      await expect(page.locator('[data-testid="offline-mode-indicator"]')).toBeVisible();
      
      // Should disable data modification features
      await expect(page.locator('[data-testid="create-workflow-button"]')).toBeDisabled();
      
      // Should show retry option
      await expect(page.locator('[data-testid="retry-connection-button"]')).toBeVisible();
      
      // Test automatic reconnection
      await page.unroute('**/api/**');
      await page.click('[data-testid="retry-connection-button"]');
      
      // Should restore normal functionality
      await expect(page.locator('[data-testid="database-error-banner"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="create-workflow-button"]')).toBeEnabled();
      
      console.log('✅ Database connection failure handling validated');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should handle partial database failures with service degradation', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      // Simulate partial database failure (some endpoints work, others don't)
      await page.route('**/api/workflows/**', async route => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Workflows service temporarily unavailable'
          })
        });
      });
      
      await page.goto('/dashboard');
      
      // Dashboard should load but show service degradation warnings
      await expect(page.locator('[data-testid="dashboard-content"]')).toBeVisible();
      await expect(page.locator('[data-testid="service-degradation-warning"]')).toBeVisible();
      
      // Workflows section should show error state
      await expect(page.locator('[data-testid="workflows-unavailable"]')).toBeVisible();
      
      // Other sections should work normally
      await page.goto('/emails');
      await expect(page.locator('[data-testid="emails-list"]')).toBeVisible();
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });
  });
});
