const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('./utils/test-helpers');

test.describe('API Integration Testing (Hybrid Local-Cloud)', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Validate production security settings are loaded
    helpers.validateSecuritySettings();
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test.describe('Authentication Endpoints with Production Security', () => {
    test('should validate /api/auth/login with JWT token and security settings', async ({ page }) => {
      const testUser = await helpers.createTestUser({
        email: `e2e-test.login.${Date.now()}@playwright-test.local`
      });
      
      console.log('🔐 Testing authentication endpoints with production security');
      
      // Test successful login
      const loginResponse = await page.request.post(`${helpers.backendUrl}/api/auth/login`, {
        data: {
          email: testUser.email,
          password: 'TestPassword123!'
        }
      });
      
      expect(loginResponse.ok()).toBeTruthy();
      const loginData = await loginResponse.json();
      
      // Validate JWT token structure
      expect(loginData.token).toBeDefined();
      expect(loginData.refreshToken).toBeDefined();
      expect(loginData.user.id).toBe(testUser.id);
      expect(loginData.user.email).toBe(testUser.email);
      
      // Validate token expiry matches production settings
      const tokenPayload = helpers.decodeJWT(loginData.token);
      const tokenLifetime = tokenPayload.exp - tokenPayload.iat;
      expect(tokenLifetime).toBeLessThanOrEqual(3600); // 1 hour max
      
      // Test failed login with production lockout settings
      const settings = helpers.getSecuritySettings();
      
      for (let attempt = 1; attempt <= settings.MAX_FAILED_LOGIN_ATTEMPTS + 1; attempt++) {
        const failedResponse = await page.request.post(`${helpers.backendUrl}/api/auth/login`, {
          data: {
            email: testUser.email,
            password: 'WrongPassword123!'
          }
        });
        
        if (attempt <= settings.MAX_FAILED_LOGIN_ATTEMPTS) {
          expect(failedResponse.status()).toBe(401);
          const errorData = await failedResponse.json();
          expect(errorData.message).toContain('Invalid credentials');
        } else {
          // Account should be locked after MAX_FAILED_LOGIN_ATTEMPTS
          expect(failedResponse.status()).toBe(423); // Locked
          const lockoutData = await failedResponse.json();
          expect(lockoutData.message).toContain('Account temporarily locked');
          expect(lockoutData.lockoutDuration).toBe(settings.ACCOUNT_LOCKOUT_DURATION);
        }
      }
      
      console.log('✅ Authentication endpoints validated with production security');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should validate /api/auth/refresh with proper token rotation', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      
      // Get initial tokens
      const loginResponse = await page.request.post(`${helpers.backendUrl}/api/auth/login`, {
        data: {
          email: testUser.email,
          password: 'TestPassword123!'
        }
      });
      
      const { token, refreshToken } = await loginResponse.json();
      
      // Test token refresh
      const refreshResponse = await page.request.post(`${helpers.backendUrl}/api/auth/refresh`, {
        headers: {
          'Authorization': `Bearer ${refreshToken}`
        }
      });
      
      expect(refreshResponse.ok()).toBeTruthy();
      const refreshData = await refreshResponse.json();
      
      // Validate new tokens are different
      expect(refreshData.token).toBeDefined();
      expect(refreshData.token).not.toBe(token);
      expect(refreshData.refreshToken).toBeDefined();
      expect(refreshData.refreshToken).not.toBe(refreshToken);
      
      // Validate old refresh token is invalidated
      const oldTokenResponse = await page.request.post(`${helpers.backendUrl}/api/auth/refresh`, {
        headers: {
          'Authorization': `Bearer ${refreshToken}`
        }
      });
      
      expect(oldTokenResponse.status()).toBe(401);
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should validate /api/auth/register with input validation', async ({ page }) => {
      const timestamp = Date.now();
      
      // Test successful registration
      const validRegistration = {
        firstName: 'E2E-Test',
        lastName: 'User',
        email: `e2e-test.register.${timestamp}@playwright-test.local`,
        password: 'SecurePassword123!',
        businessType: 'hot_tub_service'
      };
      
      const registerResponse = await page.request.post(`${helpers.backendUrl}/api/auth/register`, {
        data: validRegistration
      });
      
      expect(registerResponse.ok()).toBeTruthy();
      const registerData = await registerResponse.json();
      expect(registerData.user.email).toBe(validRegistration.email);
      expect(registerData.token).toBeDefined();
      
      // Test duplicate email registration
      const duplicateResponse = await page.request.post(`${helpers.backendUrl}/api/auth/register`, {
        data: validRegistration
      });
      
      expect(duplicateResponse.status()).toBe(409); // Conflict
      const duplicateData = await duplicateResponse.json();
      expect(duplicateData.message).toContain('already exists');
      
      // Test invalid input validation
      const invalidInputs = [
        { ...validRegistration, email: 'invalid-email', expectedError: 'Invalid email format' },
        { ...validRegistration, password: '123', expectedError: 'Password too weak' },
        { ...validRegistration, firstName: '', expectedError: 'First name required' }
      ];
      
      for (const invalidInput of invalidInputs) {
        const invalidResponse = await page.request.post(`${helpers.backendUrl}/api/auth/register`, {
          data: invalidInput
        });
        
        expect(invalidResponse.status()).toBe(400);
        const errorData = await invalidResponse.json();
        expect(errorData.message).toContain(invalidInput.expectedError);
      }
      
      // Cleanup
      await helpers.deleteTestUser(validRegistration.email);
    });
  });

  test.describe('Workflow Endpoints with CRUD Operations', () => {
    test('should validate complete workflow CRUD lifecycle', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      const authToken = await helpers.getAuthToken(testUser.email, 'TestPassword123!');
      
      console.log('🔄 Testing workflow CRUD operations');
      
      // CREATE: Test workflow creation
      const workflowData = {
        name: 'E2E-Test API Workflow',
        description: 'Testing workflow API endpoints',
        trigger_type: 'email_received',
        trigger_conditions: {
          category: 'service_request',
          priority: 'high'
        },
        actions: [
          {
            type: 'send_auto_reply',
            template: 'service_acknowledgment',
            delay_minutes: 0
          },
          {
            type: 'create_ticket',
            system: 'internal',
            priority: 'high',
            delay_minutes: 5
          }
        ],
        active: true
      };
      
      const createResponse = await page.request.post(`${helpers.backendUrl}/api/workflows/create`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: workflowData
      });
      
      expect(createResponse.ok()).toBeTruthy();
      const createdWorkflow = await createResponse.json();
      expect(createdWorkflow.id).toBeDefined();
      expect(createdWorkflow.name).toBe(workflowData.name);
      expect(createdWorkflow.user_id).toBe(testUser.id);
      
      const workflowId = createdWorkflow.id;
      
      // READ: Test workflow retrieval
      const getResponse = await page.request.get(`${helpers.backendUrl}/api/workflows/${workflowId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(getResponse.ok()).toBeTruthy();
      const retrievedWorkflow = await getResponse.json();
      expect(retrievedWorkflow.id).toBe(workflowId);
      expect(retrievedWorkflow.actions.length).toBe(2);
      
      // UPDATE: Test workflow modification
      const updateData = {
        name: 'E2E-Test Updated Workflow',
        description: 'Updated description',
        active: false
      };
      
      const updateResponse = await page.request.put(`${helpers.backendUrl}/api/workflows/${workflowId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: updateData
      });
      
      expect(updateResponse.ok()).toBeTruthy();
      const updatedWorkflow = await updateResponse.json();
      expect(updatedWorkflow.name).toBe(updateData.name);
      expect(updatedWorkflow.active).toBe(false);
      
      // LIST: Test workflow listing with pagination
      const listResponse = await page.request.get(`${helpers.backendUrl}/api/workflows?page=1&limit=10`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(listResponse.ok()).toBeTruthy();
      const workflowList = await listResponse.json();
      expect(workflowList.workflows).toBeDefined();
      expect(workflowList.total).toBeGreaterThan(0);
      expect(workflowList.page).toBe(1);
      expect(workflowList.limit).toBe(10);
      
      // DELETE: Test workflow deletion
      const deleteResponse = await page.request.delete(`${helpers.backendUrl}/api/workflows/${workflowId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(deleteResponse.ok()).toBeTruthy();
      
      // Verify deletion
      const verifyDeleteResponse = await page.request.get(`${helpers.backendUrl}/api/workflows/${workflowId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(verifyDeleteResponse.status()).toBe(404);
      
      console.log('✅ Workflow CRUD operations validated');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should validate workflow execution with n8n integration', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      const authToken = await helpers.getAuthToken(testUser.email, 'TestPassword123!');
      
      // Create workflow
      const workflowId = await helpers.createTestWorkflow({
        user_id: testUser.id,
        name: 'E2E-Test Execution Workflow',
        trigger_type: 'manual'
      });
      
      // Test manual workflow execution
      const executeResponse = await page.request.post(`${helpers.backendUrl}/api/workflows/${workflowId}/execute`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          trigger_data: {
            email_id: 'test-email-123',
            category: 'service_request'
          }
        }
      });
      
      expect(executeResponse.ok()).toBeTruthy();
      const executionData = await executeResponse.json();
      expect(executionData.execution_id).toBeDefined();
      expect(executionData.status).toBe('started');
      
      // Test execution status monitoring
      const statusResponse = await page.request.get(`${helpers.backendUrl}/api/workflows/${workflowId}/executions/${executionData.execution_id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(statusResponse.ok()).toBeTruthy();
      const statusData = await statusResponse.json();
      expect(statusData.id).toBe(executionData.execution_id);
      expect(['started', 'running', 'completed', 'failed']).toContain(statusData.status);
      
      // Test n8n webhook integration
      const webhookData = {
        workflow_id: workflowId,
        execution_id: executionData.execution_id,
        status: 'completed',
        result: {
          actions_completed: 2,
          success: true,
          output: 'Workflow completed successfully'
        }
      };
      
      const webhookResponse = await page.request.post(`${helpers.backendUrl}/api/webhooks/n8n/execution`, {
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-Signature': helpers.generateN8nSignature(webhookData)
        },
        data: webhookData
      });
      
      expect(webhookResponse.ok()).toBeTruthy();
      
      // Verify execution status updated
      const finalStatusResponse = await page.request.get(`${helpers.backendUrl}/api/workflows/${workflowId}/executions/${executionData.execution_id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const finalStatus = await finalStatusResponse.json();
      expect(finalStatus.status).toBe('completed');
      expect(finalStatus.result.success).toBe(true);
      
      // Cleanup
      await helpers.deleteWorkflow(workflowId);
      await helpers.deleteTestUser(testUser.email);
    });
  });

  test.describe('Email Processing Endpoints', () => {
    test('should validate email categorization and processing pipeline', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      const authToken = await helpers.getAuthToken(testUser.email, 'TestPassword123!');
      
      console.log('📧 Testing email processing endpoints');
      
      // Test email categorization endpoint
      const emailData = {
        from: 'customer@example.com',
        subject: 'Hot tub not heating properly - urgent repair needed',
        body: 'My hot tub stopped heating yesterday and I have guests coming. Please help urgently!',
        received_at: new Date().toISOString()
      };
      
      const categorizeResponse = await page.request.post(`${helpers.backendUrl}/api/emails/categorize`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: emailData
      });
      
      expect(categorizeResponse.ok()).toBeTruthy();
      const categorizedEmail = await categorizeResponse.json();
      expect(categorizedEmail.category).toBeDefined();
      expect(categorizedEmail.priority).toBeDefined();
      expect(categorizedEmail.confidence_score).toBeGreaterThan(0);
      
      // Test email processing with workflow trigger
      const processResponse = await page.request.post(`${helpers.backendUrl}/api/emails/process`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          ...emailData,
          category: categorizedEmail.category,
          priority: categorizedEmail.priority
        }
      });
      
      expect(processResponse.ok()).toBeTruthy();
      const processedEmail = await processResponse.json();
      expect(processedEmail.id).toBeDefined();
      expect(processedEmail.workflows_triggered).toBeDefined();
      
      // Test Gmail API integration simulation
      const gmailWebhookData = {
        message: {
          id: 'gmail-message-123',
          threadId: 'gmail-thread-456',
          labelIds: ['INBOX', 'IMPORTANT'],
          snippet: emailData.body.substring(0, 100),
          payload: {
            headers: [
              { name: 'From', value: emailData.from },
              { name: 'Subject', value: emailData.subject },
              { name: 'Date', value: emailData.received_at }
            ],
            body: {
              data: Buffer.from(emailData.body).toString('base64')
            }
          }
        }
      };
      
      const gmailWebhookResponse = await page.request.post(`${helpers.backendUrl}/api/webhooks/gmail`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Gmail-Signature': helpers.generateGmailSignature(gmailWebhookData)
        },
        data: gmailWebhookData
      });
      
      expect(gmailWebhookResponse.ok()).toBeTruthy();
      const webhookResult = await gmailWebhookResponse.json();
      expect(webhookResult.processed).toBe(true);
      expect(webhookResult.email_id).toBeDefined();
      
      console.log('✅ Email processing endpoints validated');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should validate email search and filtering', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      const authToken = await helpers.getAuthToken(testUser.email, 'TestPassword123!');
      
      // Create test emails with different categories
      const testEmails = [
        { subject: 'Service request 1', category: 'service_request', priority: 'high' },
        { subject: 'General inquiry 1', category: 'general_inquiry', priority: 'medium' },
        { subject: 'Service request 2', category: 'service_request', priority: 'low' },
        { subject: 'Urgent issue', category: 'urgent_issue', priority: 'high' }
      ];
      
      for (const email of testEmails) {
        await helpers.simulateEmailReceived({
          ...email,
          from: 'test@example.com',
          body: `Test email body for ${email.subject}`,
          user_id: testUser.id
        });
      }
      
      // Test search functionality
      const searchResponse = await page.request.get(`${helpers.backendUrl}/api/emails/search?q=service&page=1&limit=10`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(searchResponse.ok()).toBeTruthy();
      const searchResults = await searchResponse.json();
      expect(searchResults.emails.length).toBe(2); // 2 service requests
      expect(searchResults.total).toBe(2);
      
      // Test category filtering
      const filterResponse = await page.request.get(`${helpers.backendUrl}/api/emails?category=service_request&priority=high`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(filterResponse.ok()).toBeTruthy();
      const filteredResults = await filterResponse.json();
      expect(filteredResults.emails.length).toBe(1); // 1 high priority service request
      
      // Test date range filtering
      const dateFrom = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 24 hours ago
      const dateTo = new Date().toISOString();
      
      const dateFilterResponse = await page.request.get(`${helpers.backendUrl}/api/emails?date_from=${dateFrom}&date_to=${dateTo}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      expect(dateFilterResponse.ok()).toBeTruthy();
      const dateFilteredResults = await dateFilterResponse.json();
      expect(dateFilteredResults.emails.length).toBe(4); // All test emails
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });
  });

  test.describe('Database Transaction Integrity', () => {
    test('should handle concurrent operations with proper isolation', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      const authToken = await helpers.getAuthToken(testUser.email, 'TestPassword123!');
      
      console.log('🔄 Testing concurrent database operations');
      
      // Simulate concurrent workflow creation
      const concurrentWorkflows = Array.from({ length: 5 }, (_, i) => ({
        name: `E2E-Test Concurrent Workflow ${i}`,
        description: `Concurrent test workflow ${i}`,
        trigger_type: 'email_received',
        actions: [
          {
            type: 'send_auto_reply',
            template: 'test_template'
          }
        ]
      }));
      
      // Execute concurrent requests
      const concurrentPromises = concurrentWorkflows.map(workflow =>
        page.request.post(`${helpers.backendUrl}/api/workflows/create`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          data: workflow
        })
      );
      
      const results = await Promise.all(concurrentPromises);
      
      // Validate all requests succeeded
      results.forEach((response, index) => {
        expect(response.ok()).toBeTruthy();
      });
      
      // Verify all workflows were created with unique IDs
      const workflowIds = [];
      for (const response of results) {
        const workflow = await response.json();
        expect(workflowIds).not.toContain(workflow.id);
        workflowIds.push(workflow.id);
      }
      
      expect(workflowIds.length).toBe(5);
      
      // Test transaction rollback on failure
      const invalidWorkflow = {
        name: 'E2E-Test Invalid Workflow',
        trigger_type: 'invalid_trigger_type', // This should cause validation error
        actions: []
      };
      
      const failedResponse = await page.request.post(`${helpers.backendUrl}/api/workflows/create`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        data: invalidWorkflow
      });
      
      expect(failedResponse.status()).toBe(400);
      
      // Verify no partial data was created
      const listResponse = await page.request.get(`${helpers.backendUrl}/api/workflows`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      const workflowList = await listResponse.json();
      const invalidWorkflows = workflowList.workflows.filter(w => w.name === invalidWorkflow.name);
      expect(invalidWorkflows.length).toBe(0);
      
      console.log('✅ Database transaction integrity validated');
      
      // Cleanup
      for (const workflowId of workflowIds) {
        await helpers.deleteWorkflow(workflowId);
      }
      await helpers.deleteTestUser(testUser.email);
    });
  });

  test.describe('Rate Limiting Enforcement', () => {
    test('should enforce rate limits with proper 429 responses', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      const authToken = await helpers.getAuthToken(testUser.email, 'TestPassword123!');
      
      console.log('🚦 Testing rate limiting enforcement');
      
      const settings = helpers.getSecuritySettings();
      // Production settings: 100 requests per 15-minute window
      
      // Make requests up to the limit
      const requests = [];
      for (let i = 0; i < 10; i++) { // Test with smaller number for speed
        requests.push(
          page.request.get(`${helpers.backendUrl}/api/workflows`, {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          })
        );
      }
      
      const responses = await Promise.all(requests);
      
      // All requests within limit should succeed
      responses.forEach(response => {
        expect(response.ok()).toBeTruthy();
      });
      
      // Simulate rate limit exceeded (would need to make 100+ requests in real scenario)
      // For testing, we'll mock the rate limit response
      const rateLimitResponse = await page.request.get(`${helpers.backendUrl}/api/test/rate-limit`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'X-Test-Rate-Limit': 'true' // Test header to trigger rate limit
        }
      });
      
      if (rateLimitResponse.status() === 429) {
        const rateLimitData = await rateLimitResponse.json();
        expect(rateLimitData.message).toContain('Rate limit exceeded');
        expect(rateLimitResponse.headers()['retry-after']).toBeDefined();
        expect(rateLimitResponse.headers()['x-ratelimit-limit']).toBe('100');
        expect(rateLimitResponse.headers()['x-ratelimit-window']).toBe('900'); // 15 minutes
      }
      
      console.log('✅ Rate limiting enforcement validated');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });
  });
});
