const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('./utils/test-helpers');

test.describe('Email Processing & Workflows', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.loginUser();
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test.describe('Email Categorization', () => {
    test('should automatically categorize incoming emails', async ({ page }) => {
      // Navigate to email processing page
      await page.goto('/emails');
      
      // Simulate incoming email
      const emailData = {
        from: 'customer@example.com',
        subject: 'Hot tub not heating properly',
        body: 'My hot tub stopped heating yesterday. Can someone come take a look?',
        category: 'service_request',
        priority: 'high'
      };
      
      // Mock email processing API
      await page.route('**/api/emails/process', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            email: {
              id: 'email_123',
              ...emailData,
              categorized: true,
              confidence: 0.95
            }
          })
        });
      });
      
      // Trigger email processing
      await helpers.simulateEmailReceived(emailData);
      
      // Verify email appears in the list
      await page.reload();
      await expect(page.locator('[data-testid="email-item-email_123"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-category-email_123"]')).toContainText('Service Request');
      await expect(page.locator('[data-testid="email-priority-email_123"]')).toContainText('High');
    });

    test('should handle manual email categorization', async ({ page }) => {
      await page.goto('/emails');
      
      // Create uncategorized email
      const emailData = {
        from: 'customer@example.com',
        subject: 'General question',
        body: 'What are your business hours?',
        category: 'uncategorized'
      };
      
      await helpers.simulateEmailReceived(emailData);
      await page.reload();
      
      // Manually categorize email
      await page.click('[data-testid="email-item-actions"]');
      await page.click('[data-testid="categorize-email-button"]');
      
      // Select category
      await page.selectOption('[data-testid="category-select"]', 'general_inquiry');
      await page.selectOption('[data-testid="priority-select"]', 'medium');
      await page.click('[data-testid="save-categorization-button"]');
      
      // Verify categorization
      await helpers.waitForToast('Email categorized successfully');
      await expect(page.locator('[data-testid="email-category"]')).toContainText('General Inquiry');
    });

    test('should suggest categories based on content analysis', async ({ page }) => {
      await page.goto('/emails');
      
      // Mock AI categorization suggestions
      await page.route('**/api/emails/suggest-category', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            suggestions: [
              { category: 'service_request', confidence: 0.89, reason: 'Contains service-related keywords' },
              { category: 'emergency', confidence: 0.76, reason: 'Urgent language detected' },
              { category: 'general_inquiry', confidence: 0.45, reason: 'Question format detected' }
            ]
          })
        });
      });
      
      // Open categorization dialog
      await page.click('[data-testid="email-item-actions"]');
      await page.click('[data-testid="categorize-email-button"]');
      
      // Verify suggestions are displayed
      await expect(page.locator('[data-testid="category-suggestions"]')).toBeVisible();
      await expect(page.locator('[data-testid="suggestion-service_request"]')).toContainText('89% confidence');
      
      // Accept suggestion
      await page.click('[data-testid="accept-suggestion-service_request"]');
      await expect(page.locator('[data-testid="category-select"]')).toHaveValue('service_request');
    });

    test('should handle bulk email categorization', async ({ page }) => {
      await page.goto('/emails');
      
      // Select multiple emails
      await page.check('[data-testid="email-checkbox-1"]');
      await page.check('[data-testid="email-checkbox-2"]');
      await page.check('[data-testid="email-checkbox-3"]');
      
      // Open bulk actions
      await page.click('[data-testid="bulk-actions-button"]');
      await page.click('[data-testid="bulk-categorize-button"]');
      
      // Set bulk category
      await page.selectOption('[data-testid="bulk-category-select"]', 'general_inquiry');
      await page.selectOption('[data-testid="bulk-priority-select"]', 'low');
      await page.click('[data-testid="apply-bulk-categorization-button"]');
      
      // Verify bulk categorization
      await helpers.waitForToast('3 emails categorized successfully');
    });
  });

  test.describe('Workflow Creation and Management', () => {
    test('should create new workflow', async ({ page }) => {
      await page.goto('/workflows');
      
      // Create new workflow
      await page.click('[data-testid="create-workflow-button"]');
      
      // Fill workflow details
      await page.fill('[data-testid="workflow-name-input"]', 'Service Request Auto-Response');
      await page.fill('[data-testid="workflow-description-input"]', 'Automatically respond to service requests');
      
      // Set trigger
      await page.selectOption('[data-testid="trigger-type-select"]', 'email_received');
      await page.selectOption('[data-testid="trigger-category-select"]', 'service_request');
      
      // Add actions
      await page.click('[data-testid="add-action-button"]');
      await page.selectOption('[data-testid="action-type-select"]', 'send_auto_response');
      await page.selectOption('[data-testid="response-template-select"]', 'service_request_acknowledgment');
      
      await page.click('[data-testid="add-action-button"]');
      await page.selectOption('[data-testid="action-type-select-1"]', 'create_ticket');
      await page.fill('[data-testid="ticket-system-input"]', 'internal');
      
      // Save workflow
      await page.click('[data-testid="save-workflow-button"]');
      
      // Verify workflow creation
      await helpers.waitForToast('Workflow created successfully');
      await expect(page).toHaveURL('/workflows');
      await expect(page.locator('[data-testid="workflow-item"]')).toContainText('Service Request Auto-Response');
    });

    test('should edit existing workflow', async ({ page }) => {
      // Create test workflow first
      const workflow = await helpers.createTestWorkflow({
        name: 'Test Edit Workflow',
        description: 'Workflow for editing test'
      });
      
      await page.goto('/workflows');
      
      // Edit workflow
      await page.click(`[data-testid="edit-workflow-${workflow.id}"]`);
      
      // Update workflow details
      await page.fill('[data-testid="workflow-name-input"]', 'Updated Test Workflow');
      await page.fill('[data-testid="workflow-description-input"]', 'Updated description');
      
      // Save changes
      await page.click('[data-testid="save-workflow-button"]');
      
      // Verify update
      await helpers.waitForToast('Workflow updated successfully');
      await expect(page.locator('[data-testid="workflow-item"]')).toContainText('Updated Test Workflow');
    });

    test('should activate and deactivate workflows', async ({ page }) => {
      const workflow = await helpers.createTestWorkflow({
        name: 'Test Toggle Workflow',
        active: false
      });
      
      await page.goto('/workflows');
      
      // Verify workflow is inactive
      await expect(page.locator(`[data-testid="workflow-status-${workflow.id}"]`)).toContainText('Inactive');
      
      // Activate workflow
      await page.click(`[data-testid="toggle-workflow-${workflow.id}"]`);
      
      // Verify activation
      await helpers.waitForToast('Workflow activated');
      await expect(page.locator(`[data-testid="workflow-status-${workflow.id}"]`)).toContainText('Active');
      
      // Deactivate workflow
      await page.click(`[data-testid="toggle-workflow-${workflow.id}"]`);
      
      // Verify deactivation
      await helpers.waitForToast('Workflow deactivated');
      await expect(page.locator(`[data-testid="workflow-status-${workflow.id}"]`)).toContainText('Inactive');
    });

    test('should delete workflow with confirmation', async ({ page }) => {
      const workflow = await helpers.createTestWorkflow({
        name: 'Test Delete Workflow'
      });
      
      await page.goto('/workflows');
      
      // Delete workflow
      await page.click(`[data-testid="delete-workflow-${workflow.id}"]`);
      
      // Verify confirmation dialog
      await expect(page.locator('[data-testid="delete-confirmation-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="delete-warning"]')).toContainText('This action cannot be undone');
      
      // Confirm deletion
      await page.fill('[data-testid="confirm-workflow-name-input"]', 'Test Delete Workflow');
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Verify deletion
      await helpers.waitForToast('Workflow deleted successfully');
      await expect(page.locator(`[data-testid="workflow-item-${workflow.id}"]`)).not.toBeVisible();
    });
  });

  test.describe('N8n Integration', () => {
    test('should sync workflows with n8n', async ({ page }) => {
      await page.goto('/workflows');
      
      // Mock n8n sync API
      await page.route('**/api/n8n/sync', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            synced: 3,
            created: 1,
            updated: 2,
            errors: 0
          })
        });
      });
      
      // Trigger sync
      await page.click('[data-testid="sync-n8n-button"]');
      
      // Verify sync progress
      await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible();
      await helpers.waitForLoader();
      
      // Verify sync results
      await helpers.waitForToast('N8n sync completed: 3 workflows synced');
      await expect(page.locator('[data-testid="last-sync-time"]')).not.toBeEmpty();
    });

    test('should handle n8n workflow execution status', async ({ page }) => {
      const workflow = await helpers.createTestWorkflow({
        name: 'N8n Test Workflow',
        n8n_workflow_id: 'n8n_123'
      });
      
      await page.goto('/workflows');
      
      // Mock n8n execution status
      await page.route(`**/api/n8n/workflows/${workflow.id}/executions`, async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            executions: [
              {
                id: 'exec_1',
                status: 'success',
                startedAt: new Date().toISOString(),
                finishedAt: new Date().toISOString(),
                data: { emailsProcessed: 5 }
              },
              {
                id: 'exec_2',
                status: 'error',
                startedAt: new Date().toISOString(),
                error: 'Gmail API rate limit exceeded'
              }
            ]
          })
        });
      });
      
      // View workflow executions
      await page.click(`[data-testid="view-executions-${workflow.id}"]`);
      
      // Verify execution history
      await expect(page.locator('[data-testid="execution-history"]')).toBeVisible();
      await expect(page.locator('[data-testid="execution-exec_1"]')).toContainText('Success');
      await expect(page.locator('[data-testid="execution-exec_2"]')).toContainText('Error');
      await expect(page.locator('[data-testid="execution-error-exec_2"]')).toContainText('Gmail API rate limit exceeded');
    });

    test('should handle n8n connection errors', async ({ page }) => {
      await page.goto('/workflows');
      
      // Mock n8n connection error
      await page.route('**/api/n8n/status', async route => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'N8n service unavailable',
            status: 'disconnected'
          })
        });
      });
      
      // Check n8n status
      await page.click('[data-testid="check-n8n-status-button"]');
      
      // Verify error handling
      await helpers.waitForToast('N8n service is currently unavailable', 'error');
      await expect(page.locator('[data-testid="n8n-status"]')).toContainText('Disconnected');
      await expect(page.locator('[data-testid="n8n-error-message"]')).toContainText('N8n service unavailable');
    });
  });

  test.describe('Automated Responses', () => {
    test('should send automated response for categorized emails', async ({ page }) => {
      // Create workflow with auto-response
      const workflow = await helpers.createTestWorkflow({
        name: 'Auto Response Test',
        trigger_type: 'email_received',
        actions: [
          {
            type: 'send_auto_response',
            config: {
              template: 'service_request_acknowledgment',
              delay: 0
            }
          }
        ]
      });

      // Simulate email that triggers workflow
      const emailData = {
        from: 'customer@example.com',
        subject: 'Service request',
        body: 'Need help with hot tub',
        category: 'service_request'
      };

      // Mock auto-response API
      await page.route('**/api/emails/auto-respond', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            response: {
              id: 'response_123',
              template: 'service_request_acknowledgment',
              sent: true,
              sentAt: new Date().toISOString()
            }
          })
        });
      });

      await helpers.simulateEmailReceived(emailData);

      // Navigate to email processing page
      await page.goto('/emails');
      await page.reload();

      // Verify auto-response was sent
      await expect(page.locator('[data-testid="email-auto-response-status"]')).toContainText('Response sent');
      await expect(page.locator('[data-testid="response-template"]')).toContainText('service_request_acknowledgment');
    });

    test('should customize response templates', async ({ page }) => {
      await page.goto('/settings/templates');

      // Edit response template
      await page.click('[data-testid="edit-template-service_request_acknowledgment"]');

      // Update template content
      await page.fill('[data-testid="template-subject-input"]', 'We received your service request');
      await page.fill('[data-testid="template-body-input"]', 'Thank you for contacting us. We will respond within 24 hours.');

      // Save template
      await page.click('[data-testid="save-template-button"]');

      // Verify template update
      await helpers.waitForToast('Template updated successfully');
      await expect(page.locator('[data-testid="template-preview"]')).toContainText('We received your service request');
    });

    test('should handle response delivery failures', async ({ page }) => {
      // Mock response delivery failure
      await page.route('**/api/emails/auto-respond', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'SMTP server unavailable',
            retryable: true
          })
        });
      });

      const emailData = {
        from: 'customer@example.com',
        subject: 'Service request',
        body: 'Need help',
        category: 'service_request'
      };

      await helpers.simulateEmailReceived(emailData);
      await page.goto('/emails');
      await page.reload();

      // Verify failure handling
      await expect(page.locator('[data-testid="email-auto-response-status"]')).toContainText('Failed');
      await expect(page.locator('[data-testid="response-error"]')).toContainText('SMTP server unavailable');
      await expect(page.locator('[data-testid="retry-response-button"]')).toBeVisible();
    });

    test('should implement retry logic for failed responses', async ({ page }) => {
      let attemptCount = 0;

      // Mock response delivery with retry success
      await page.route('**/api/emails/auto-respond', async route => {
        attemptCount++;
        if (attemptCount === 1) {
          // First attempt fails
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Temporary SMTP server error',
              retryable: true
            })
          });
        } else {
          // Second attempt succeeds
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              response: {
                id: 'response_retry_123',
                template: 'service_request_acknowledgment',
                sent: true,
                sentAt: new Date().toISOString(),
                retryCount: 1
              }
            })
          });
        }
      });

      const emailData = {
        from: 'customer@example.com',
        subject: 'Service request with retry',
        body: 'Need urgent help',
        category: 'service_request'
      };

      await helpers.simulateEmailReceived(emailData);
      await page.goto('/emails');
      await page.reload();

      // Initially should show failed status
      await expect(page.locator('[data-testid="email-auto-response-status"]')).toContainText('Failed');

      // Click retry button
      await page.click('[data-testid="retry-response-button"]');

      // Wait for retry to complete
      await page.waitForTimeout(1000);
      await page.reload();

      // Verify retry was successful
      await expect(page.locator('[data-testid="email-auto-response-status"]')).toContainText('Response sent');
      await expect(page.locator('[data-testid="response-retry-count"]')).toContainText('1');
    });

    test('should handle permanent failures gracefully', async ({ page }) => {
      // Mock permanent failure (non-retryable)
      await page.route('**/api/emails/auto-respond', async route => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Invalid email address',
            retryable: false
          })
        });
      });

      const emailData = {
        from: 'invalid-email',
        subject: 'Service request',
        body: 'Need help',
        category: 'service_request'
      };

      await helpers.simulateEmailReceived(emailData);
      await page.goto('/emails');
      await page.reload();

      // Verify permanent failure handling
      await expect(page.locator('[data-testid="email-auto-response-status"]')).toContainText('Failed');
      await expect(page.locator('[data-testid="response-error"]')).toContainText('Invalid email address');
      await expect(page.locator('[data-testid="retry-response-button"]')).not.toBeVisible(); // No retry button for permanent failures
    });

    test('should handle rate limiting in automated responses', async ({ page }) => {
      let requestCount = 0;

      // Mock rate limiting after multiple requests
      await page.route('**/api/emails/auto-respond', async route => {
        requestCount++;
        if (requestCount > 3) {
          await route.fulfill({
            status: 429,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Rate limit exceeded',
              retryable: true,
              retryAfter: 60
            })
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              response: {
                id: `response_${requestCount}`,
                template: 'service_request_acknowledgment',
                sent: true,
                sentAt: new Date().toISOString()
              }
            })
          });
        }
      });

      // Simulate multiple emails to trigger rate limiting
      for (let i = 1; i <= 5; i++) {
        const emailData = {
          from: `customer${i}@example.com`,
          subject: `Service request ${i}`,
          body: 'Need help with hot tub',
          category: 'service_request'
        };

        await helpers.simulateEmailReceived(emailData);
      }

      await page.goto('/emails');
      await page.reload();

      // Verify rate limiting was handled
      const failedResponses = page.locator('[data-testid="email-auto-response-status"]').filter({ hasText: 'Failed' });
      await expect(failedResponses).toHaveCount(2); // Last 2 should fail due to rate limiting

      // Verify rate limit error message
      await expect(page.locator('[data-testid="response-error"]')).toContainText('Rate limit exceeded');
    });

    test('should validate response template content', async ({ page }) => {
      await page.goto('/settings/templates');

      // Test template with missing required fields
      await page.click('[data-testid="edit-template-service_request_acknowledgment"]');

      // Clear required fields
      await page.fill('[data-testid="template-subject-input"]', '');
      await page.fill('[data-testid="template-body-input"]', '');

      // Try to save
      await page.click('[data-testid="save-template-button"]');

      // Verify validation errors
      await expect(page.locator('[data-testid="subject-error"]')).toContainText('Subject is required');
      await expect(page.locator('[data-testid="body-error"]')).toContainText('Body content is required');

      // Fill with valid content
      await page.fill('[data-testid="template-subject-input"]', 'Thank you for your service request');
      await page.fill('[data-testid="template-body-input"]', 'We have received your request and will respond within 24 hours. Thank you for choosing our service.');

      // Save successfully
      await page.click('[data-testid="save-template-button"]');
      await helpers.waitForToast('Template updated successfully');
    });

    test('should handle template rendering errors', async ({ page }) => {
      // Mock template rendering failure
      await page.route('**/api/emails/auto-respond', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Template rendering failed: missing variable',
            retryable: false
          })
        });
      });

      const emailData = {
        from: 'customer@example.com',
        subject: 'Service request',
        body: 'Need help',
        category: 'service_request'
      };

      await helpers.simulateEmailReceived(emailData);
      await page.goto('/emails');
      await page.reload();

      // Verify template error handling
      await expect(page.locator('[data-testid="email-auto-response-status"]')).toContainText('Failed');
      await expect(page.locator('[data-testid="response-error"]')).toContainText('Template rendering failed');
      await expect(page.locator('[data-testid="template-error-details"]')).toContainText('missing variable');
    });
  });
});
