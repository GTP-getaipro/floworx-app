const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('./utils/test-helpers');

test.describe('Business Logic Functional Tests (Hybrid Local-Cloud)', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Validate production security settings are loaded
    helpers.validateSecuritySettings();
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test.describe('Complete 5-Step User Onboarding Flow', () => {
    test('should complete full onboarding journey with data persistence', async ({ page }) => {
      console.log('🚀 Testing complete 5-step onboarding flow');

      // Step 1: Register and Login (using frontend registration)
      const testUser = await helpers.registerUser({
        firstName: 'E2E-Test',
        lastName: 'Onboarding',
        email: `e2e-test.onboarding.${Date.now()}@playwright-test.local`,
        password: 'TestPassword123!'
      });

      // Login with the registered user
      await helpers.loginUser(testUser.email, testUser.password);
      await expect(page.locator('[data-testid="welcome-step"]')).toBeVisible();
      
      // Step 2: Business Type Selection
      await page.click('[data-testid="next-step-button"]');
      await expect(page.locator('[data-testid="business-type-step"]')).toBeVisible();
      await page.selectOption('[data-testid="business-type-select"]', 'hot_tub_service');
      await page.fill('[data-testid="business-name-input"]', 'E2E-Test Hot Tub Services');
      await page.click('[data-testid="save-business-type"]');
      
      // Validate data persistence
      const businessData = await helpers.getBusinessProfile(testUser.id);
      expect(businessData.business_type).toBe('hot_tub_service');
      expect(businessData.business_name).toBe('E2E-Test Hot Tub Services');
      
      // Step 3: Google OAuth Integration
      await page.click('[data-testid="next-step-button"]');
      await expect(page.locator('[data-testid="oauth-step"]')).toBeVisible();
      
      // Mock Google OAuth flow
      await helpers.mockGoogleOAuth({
        email: testUser.email,
        access_token: 'mock_access_token_' + Date.now(),
        refresh_token: 'mock_refresh_token_' + Date.now()
      });
      
      await page.click('[data-testid="connect-google-button"]');
      await helpers.waitForToast('Google account connected successfully');
      
      // Step 4: Gmail Label Mapping
      await page.click('[data-testid="next-step-button"]');
      await expect(page.locator('[data-testid="label-mapping-step"]')).toBeVisible();
      
      // Configure label mappings
      const labelMappings = [
        { gmail_label: 'Service Requests', floworx_category: 'service_request' },
        { gmail_label: 'General Inquiries', floworx_category: 'general_inquiry' },
        { gmail_label: 'Urgent Issues', floworx_category: 'urgent_issue' }
      ];
      
      for (const mapping of labelMappings) {
        await page.click('[data-testid="add-label-mapping"]');
        await page.fill('[data-testid="gmail-label-input"]', mapping.gmail_label);
        await page.selectOption('[data-testid="floworx-category-select"]', mapping.floworx_category);
        await page.click('[data-testid="save-mapping"]');
      }
      
      // Step 5: Team Notifications & Review
      await page.click('[data-testid="next-step-button"]');
      await expect(page.locator('[data-testid="notifications-step"]')).toBeVisible();
      
      await page.fill('[data-testid="notification-email-input"]', `notifications.${testUser.email}`);
      await page.check('[data-testid="email-notifications-enabled"]');
      await page.check('[data-testid="workflow-completion-notifications"]');
      
      // Final review and completion
      await page.click('[data-testid="complete-onboarding"]');
      await helpers.waitForToast('Onboarding completed successfully!');
      
      // Verify redirect to dashboard
      await page.waitForURL('/dashboard');
      await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible();
      
      // Validate complete onboarding data persistence
      const profile = await helpers.getCompleteUserProfile(testUser.id);
      expect(profile.onboarding_completed).toBe(true);
      expect(profile.business_type).toBe('hot_tub_service');
      expect(profile.gmail_labels.length).toBe(3);
      expect(profile.notifications_enabled).toBe(true);
      
      console.log('✅ Complete onboarding flow validated with data persistence');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should handle onboarding interruption and resume', async ({ page }) => {
      // Register and login user
      const testUser = await helpers.registerUser({
        firstName: 'E2E-Test',
        lastName: 'Resume',
        email: `e2e-test.resume.${Date.now()}@playwright-test.local`,
        password: 'TestPassword123!'
      });

      // Start onboarding
      await helpers.loginUser(testUser.email, testUser.password);
      
      // Complete first two steps
      await page.click('[data-testid="next-step-button"]');
      await page.selectOption('[data-testid="business-type-select"]', 'pool_service');
      await page.click('[data-testid="save-business-type"]');
      
      // Simulate interruption (browser refresh)
      await page.reload();
      
      // Should resume from where left off
      await expect(page.locator('[data-testid="oauth-step"]')).toBeVisible();
      expect(await page.locator('[data-testid="progress-indicator"]').textContent()).toContain('Step 3 of 5');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });
  });

  test.describe('Email Categorization System', () => {
    test('should validate manual email categorization with persistence', async ({ page }) => {
      const testUser = await helpers.registerUser({
        firstName: 'E2E-Test',
        lastName: 'Email',
        email: `e2e-test.${Date.now()}@playwright-test.local`,
        password: 'TestPassword123!'
      });
      await helpers.loginUser(testUser.email, testUser.password);
      
      // Create test emails
      const testEmails = [
        {
          from: 'customer1@example.com',
          subject: 'Hot tub not heating properly',
          body: 'My hot tub stopped heating yesterday. Can you help?',
          expected_category: 'service_request'
        },
        {
          from: 'customer2@example.com',
          subject: 'General question about maintenance',
          body: 'How often should I clean my hot tub filters?',
          expected_category: 'general_inquiry'
        }
      ];
      
      for (const email of testEmails) {
        // Simulate email received
        const emailId = await helpers.simulateEmailReceived(email);
        
        // Navigate to email management
        await page.goto('/emails');
        await page.click(`[data-testid="email-${emailId}"]`);
        
        // Manually categorize
        await page.selectOption('[data-testid="category-select"]', email.expected_category);
        await page.click('[data-testid="save-category"]');
        
        await helpers.waitForToast('Email categorized successfully');
        
        // Validate persistence
        const savedEmail = await helpers.getEmailById(emailId);
        expect(savedEmail.category).toBe(email.expected_category);
        expect(savedEmail.manually_categorized).toBe(true);
      }
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should validate automated Gmail label mapping', async ({ page }) => {
      const testUser = await helpers.registerUser({
        firstName: 'E2E-Test',
        lastName: 'Gmail',
        email: `e2e-test.${Date.now()}@playwright-test.local`,
        password: 'TestPassword123!'
      });
      await helpers.setupGmailLabelMapping(testUser.id, [
        { gmail_label_id: 'Label_123', gmail_label_name: 'Service Requests', floworx_category: 'service_request' },
        { gmail_label_id: 'Label_456', gmail_label_name: 'Urgent', floworx_category: 'urgent_issue' }
      ]);
      
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      // Simulate Gmail webhook with labeled email
      const emailData = {
        from: 'urgent.customer@example.com',
        subject: 'URGENT: Hot tub emergency!',
        gmail_labels: ['Service Requests', 'Urgent'],
        body: 'Hot tub is overflowing!'
      };
      
      const emailId = await helpers.simulateGmailWebhook(emailData);
      
      // Verify automatic categorization
      await page.goto('/emails');
      const emailElement = page.locator(`[data-testid="email-${emailId}"]`);
      await expect(emailElement.locator('[data-testid="category-badge"]')).toContainText('urgent_issue');
      
      // Validate in database
      const email = await helpers.getEmailById(emailId);
      expect(email.category).toBe('urgent_issue');
      expect(email.auto_categorized).toBe(true);
      expect(email.gmail_labels).toContain('Urgent');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });
  });

  test.describe('Workflow Automation Lifecycle', () => {
    test('should create and execute complete workflow with n8n integration', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      console.log('🔄 Testing complete workflow lifecycle');
      
      // Create workflow template
      await page.goto('/workflows');
      await page.click('[data-testid="create-workflow-button"]');
      
      const workflowConfig = {
        name: 'E2E-Test Service Request Workflow',
        description: 'Automated response for service requests',
        trigger_type: 'email_received',
        trigger_conditions: {
          category: 'service_request',
          priority: 'high'
        },
        actions: [
          {
            type: 'send_auto_reply',
            template: 'service_request_acknowledgment',
            delay_minutes: 0
          },
          {
            type: 'create_ticket',
            system: 'internal',
            priority: 'high',
            delay_minutes: 5
          },
          {
            type: 'notify_team',
            channels: ['email', 'slack'],
            delay_minutes: 10
          }
        ]
      };
      
      // Fill workflow form
      await page.fill('[data-testid="workflow-name-input"]', workflowConfig.name);
      await page.fill('[data-testid="workflow-description-input"]', workflowConfig.description);
      await page.selectOption('[data-testid="trigger-type-select"]', workflowConfig.trigger_type);
      
      // Configure trigger conditions
      await page.selectOption('[data-testid="trigger-category"]', workflowConfig.trigger_conditions.category);
      await page.selectOption('[data-testid="trigger-priority"]', workflowConfig.trigger_conditions.priority);
      
      // Add actions
      for (let i = 0; i < workflowConfig.actions.length; i++) {
        const action = workflowConfig.actions[i];
        await page.click('[data-testid="add-action-button"]');
        await page.selectOption(`[data-testid="action-type-${i}"]`, action.type);
        await page.fill(`[data-testid="action-delay-${i}"]`, action.delay_minutes.toString());
        
        if (action.template) {
          await page.selectOption(`[data-testid="action-template-${i}"]`, action.template);
        }
      }
      
      // Save workflow
      await page.click('[data-testid="save-workflow-button"]');
      await helpers.waitForToast('Workflow created successfully');
      
      // Get workflow ID from URL or response
      const workflowId = await helpers.getLatestWorkflowId(testUser.id);
      
      // Validate n8n integration
      const n8nWorkflow = await helpers.validateN8nWorkflowCreated(workflowId);
      expect(n8nWorkflow.active).toBe(true);
      expect(n8nWorkflow.nodes.length).toBeGreaterThan(0);
      
      // Test workflow execution
      const triggerEmail = {
        from: 'test.customer@example.com',
        subject: 'Urgent hot tub repair needed',
        body: 'My hot tub broke down and needs immediate attention',
        category: 'service_request',
        priority: 'high'
      };
      
      const emailId = await helpers.simulateEmailReceived(triggerEmail);
      
      // Wait for workflow execution
      await helpers.waitForWorkflowExecution(workflowId, 30000);
      
      // Validate workflow execution results
      const execution = await helpers.getWorkflowExecution(workflowId);
      expect(execution.status).toBe('completed');
      expect(execution.actions_completed).toBe(3);
      
      // Verify actions were executed
      const autoReply = await helpers.getAutoReplyByEmailId(emailId);
      expect(autoReply.template_used).toBe('service_request_acknowledgment');
      
      const ticket = await helpers.getTicketByEmailId(emailId);
      expect(ticket.priority).toBe('high');
      expect(ticket.status).toBe('open');
      
      const notifications = await helpers.getNotificationsByWorkflowId(workflowId);
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].channels).toContain('email');
      
      console.log('✅ Complete workflow lifecycle validated');
      
      // Cleanup
      await helpers.deleteWorkflow(workflowId);
      await helpers.deleteTestUser(testUser.email);
    });

    test('should handle workflow execution failures gracefully', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      // Create workflow with intentionally failing action
      const workflowId = await helpers.createTestWorkflow({
        name: 'E2E-Test Failing Workflow',
        actions: [
          {
            type: 'send_email',
            to: 'invalid-email-address', // This will fail
            template: 'test_template'
          }
        ]
      });
      
      // Trigger workflow
      const emailId = await helpers.simulateEmailReceived({
        category: 'service_request'
      });
      
      // Wait for execution attempt
      await helpers.waitForWorkflowExecution(workflowId, 15000);
      
      // Validate failure handling
      const execution = await helpers.getWorkflowExecution(workflowId);
      expect(execution.status).toBe('failed');
      expect(execution.error_message).toContain('invalid email');
      expect(execution.retry_count).toBeGreaterThan(0);
      
      // Verify user notification of failure
      await page.goto('/workflows');
      await page.click(`[data-testid="workflow-${workflowId}"]`);
      await expect(page.locator('[data-testid="execution-status"]')).toContainText('Failed');
      await expect(page.locator('[data-testid="error-details"]')).toBeVisible();
      
      // Cleanup
      await helpers.deleteWorkflow(workflowId);
      await helpers.deleteTestUser(testUser.email);
    });
  });

  test.describe('Multi-Tenant Data Isolation (RLS)', () => {
    test('should enforce Row Level Security policies in Supabase', async ({ page }) => {
      // Create two separate test users
      const user1 = await helpers.createTestUser({
        email: `e2e-test.user1.${Date.now()}@playwright-test.local`
      });
      const user2 = await helpers.createTestUser({
        email: `e2e-test.user2.${Date.now()}@playwright-test.local`
      });
      
      // User 1 creates workflow
      await helpers.loginUser(user1.email, 'TestPassword123!');
      const user1WorkflowId = await helpers.createTestWorkflow({
        name: 'E2E-Test User1 Private Workflow',
        user_id: user1.id
      });
      
      // User 1 creates email
      const user1EmailId = await helpers.simulateEmailReceived({
        from: 'customer1@example.com',
        subject: 'User 1 Email',
        user_id: user1.id
      });
      
      // Switch to User 2
      await page.goto('/logout');
      await helpers.loginUser(user2.email, 'TestPassword123!');
      
      // User 2 should not see User 1's data
      await page.goto('/workflows');
      await expect(page.locator(`[data-testid="workflow-${user1WorkflowId}"]`)).not.toBeVisible();
      
      await page.goto('/emails');
      await expect(page.locator(`[data-testid="email-${user1EmailId}"]`)).not.toBeVisible();
      
      // Verify database-level isolation
      const user2Workflows = await helpers.getWorkflowsForUser(user2.id);
      expect(user2Workflows.find(w => w.id === user1WorkflowId)).toBeUndefined();
      
      const user2Emails = await helpers.getEmailsForUser(user2.id);
      expect(user2Emails.find(e => e.id === user1EmailId)).toBeUndefined();
      
      // User 2 creates their own data
      const user2WorkflowId = await helpers.createTestWorkflow({
        name: 'E2E-Test User2 Private Workflow',
        user_id: user2.id
      });
      
      // Verify User 2 can access their own data
      await page.goto('/workflows');
      await expect(page.locator(`[data-testid="workflow-${user2WorkflowId}"]`)).toBeVisible();
      
      console.log('✅ Multi-tenant data isolation validated');
      
      // Cleanup
      await helpers.deleteWorkflow(user1WorkflowId);
      await helpers.deleteWorkflow(user2WorkflowId);
      await helpers.deleteTestUser(user1.email);
      await helpers.deleteTestUser(user2.email);
    });
  });

  test.describe('Dashboard Analytics Validation', () => {
    test('should display accurate real-time metrics with proper data aggregation', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      console.log('📊 Testing dashboard analytics accuracy');
      
      // Create baseline data
      const testData = {
        emails: 15,
        workflows: 3,
        executions: 8,
        categories: ['service_request', 'general_inquiry', 'urgent_issue']
      };
      
      // Generate test emails
      for (let i = 0; i < testData.emails; i++) {
        await helpers.simulateEmailReceived({
          from: `customer${i}@example.com`,
          subject: `Test Email ${i}`,
          category: testData.categories[i % testData.categories.length],
          user_id: testUser.id
        });
      }
      
      // Create test workflows
      for (let i = 0; i < testData.workflows; i++) {
        await helpers.createTestWorkflow({
          name: `E2E-Test Workflow ${i}`,
          user_id: testUser.id
        });
      }
      
      // Generate workflow executions
      for (let i = 0; i < testData.executions; i++) {
        await helpers.simulateWorkflowExecution({
          user_id: testUser.id,
          status: i % 4 === 0 ? 'failed' : 'completed'
        });
      }
      
      // Navigate to dashboard
      await page.goto('/dashboard');
      
      // Validate metrics display
      await expect(page.locator('[data-testid="emails-processed-count"]')).toContainText(testData.emails.toString());
      await expect(page.locator('[data-testid="active-workflows-count"]')).toContainText(testData.workflows.toString());
      await expect(page.locator('[data-testid="workflow-executions-count"]')).toContainText(testData.executions.toString());
      
      // Validate success rate calculation
      const expectedSuccessRate = Math.round(((testData.executions - 2) / testData.executions) * 100); // 2 failures
      await expect(page.locator('[data-testid="success-rate-percentage"]')).toContainText(`${expectedSuccessRate}%`);
      
      // Validate category breakdown
      const categoryBreakdown = await page.locator('[data-testid="category-breakdown"]');
      await expect(categoryBreakdown).toBeVisible();
      
      for (const category of testData.categories) {
        const expectedCount = Math.ceil(testData.emails / testData.categories.length);
        await expect(page.locator(`[data-testid="category-${category}-count"]`)).toContainText(expectedCount.toString());
      }
      
      // Test real-time updates
      const newEmailId = await helpers.simulateEmailReceived({
        from: 'realtime.test@example.com',
        subject: 'Real-time Test Email',
        user_id: testUser.id
      });
      
      // Wait for real-time update (WebSocket or polling)
      await page.waitForTimeout(2000);
      
      // Verify count updated
      await expect(page.locator('[data-testid="emails-processed-count"]')).toContainText((testData.emails + 1).toString());
      
      console.log('✅ Dashboard analytics accuracy validated');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should validate performance KPIs with accurate calculations', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      // Create performance test data with known metrics
      const performanceData = [
        { response_time: 150, timestamp: new Date(Date.now() - 3600000) }, // 1 hour ago
        { response_time: 200, timestamp: new Date(Date.now() - 1800000) }, // 30 min ago
        { response_time: 180, timestamp: new Date(Date.now() - 900000) },  // 15 min ago
        { response_time: 120, timestamp: new Date() }                      // now
      ];
      
      for (const data of performanceData) {
        await helpers.recordPerformanceMetric({
          user_id: testUser.id,
          metric_type: 'email_processing_time',
          value: data.response_time,
          timestamp: data.timestamp
        });
      }
      
      await page.goto('/dashboard');
      
      // Validate average response time calculation
      const expectedAverage = Math.round(performanceData.reduce((sum, d) => sum + d.response_time, 0) / performanceData.length);
      await expect(page.locator('[data-testid="avg-response-time"]')).toContainText(`${expectedAverage}ms`);
      
      // Validate performance trend
      await expect(page.locator('[data-testid="performance-trend"]')).toBeVisible();
      const trendIndicator = page.locator('[data-testid="trend-indicator"]');
      
      // Last value (120) is better than previous (180), so should show improvement
      await expect(trendIndicator).toHaveClass(/trend-up|improvement/);
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });
  });
});
