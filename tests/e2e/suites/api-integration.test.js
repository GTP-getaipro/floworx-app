/**
 * API Integration E2E Tests for FloWorx SaaS
 * Tests all CRUD operations, error handling, validation, and security
 */

const { TestEnvironment } = require('../setup/test-environment');
const axios = require('axios');
const { expect } = require('chai');

describe('API Integration E2E Tests', function() {
  this.timeout(90000); // 90 second timeout
  
  let testEnv;
  let config;
  let apiClient;
  let authToken;
  let testUserId;
  
  before(async function() {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    config = testEnv.getConfig();
    
    // Setup API client
    apiClient = axios.create({
      baseURL: `http://localhost:${config.server.port}/api`,
      timeout: 15000,
      validateStatus: () => true
    });
    
    // Login to get auth token
    const loginResponse = await apiClient.post('/auth/login', {
      email: config.testData.users.valid.email,
      password: config.testData.users.valid.password
    });
    
    authToken = loginResponse.data.data.token;
    testUserId = loginResponse.data.data.user.id;
    
    // Set default authorization header
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
  });
  
  after(async function() {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  describe('CRUD Operations - Users', function() {
    it('should get user profile', async function() {
      const response = await apiClient.get('/auth/profile');
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('user');
      expect(response.data.data.user).to.have.property('id', testUserId);
      expect(response.data.data.user).to.have.property('email');
      expect(response.data.data.user).to.not.have.property('password_hash');
    });

    it('should update user profile', async function() {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '(555) 123-4567'
      };

      const response = await apiClient.put('/auth/profile', updateData);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data.user.first_name).to.equal(updateData.firstName);
      expect(response.data.data.user.last_name).to.equal(updateData.lastName);
    });

    it('should validate user profile updates', async function() {
      const invalidData = {
        firstName: '', // Empty name
        email: 'invalid-email', // Invalid email format
        phone: '123' // Invalid phone format
      };

      const response = await apiClient.put('/auth/profile', invalidData);
      
      expect(response.status).to.equal(400);
      expect(response.data).to.have.property('success', false);
      expect(response.data.error).to.have.property('type', 'VALIDATION_ERROR');
    });
  });

  describe('CRUD Operations - Workflows', function() {
    let workflowId;

    it('should create workflow with validation', async function() {
      const validWorkflow = {
        name: 'API Test Workflow',
        description: 'Test workflow for API integration testing',
        triggerType: 'inquiry',
        configuration: {
          steps: [
            { type: 'auto_response', template: 'Thank you!', delay: 0 }
          ]
        },
        isActive: true
      };

      const response = await apiClient.post('/workflows', validWorkflow);
      
      expect(response.status).to.equal(201);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('id');
      
      workflowId = response.data.data.id;
    });

    it('should reject invalid workflow creation', async function() {
      const invalidWorkflow = {
        name: '', // Empty name
        triggerType: 'invalid_type', // Invalid trigger type
        configuration: null // Invalid configuration
      };

      const response = await apiClient.post('/workflows', invalidWorkflow);
      
      expect(response.status).to.equal(400);
      expect(response.data).to.have.property('success', false);
      expect(response.data.error).to.have.property('type', 'VALIDATION_ERROR');
    });

    it('should get workflows with pagination', async function() {
      const response = await apiClient.get('/workflows', {
        params: { page: 1, limit: 10, sortBy: 'created_at', sortOrder: 'desc' }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.be.an('array');
      expect(response.data.meta).to.have.property('pagination');
      expect(response.data.meta.pagination).to.have.property('currentPage', 1);
      expect(response.data.meta.pagination).to.have.property('limit', 10);
    });

    it('should get workflows with filtering', async function() {
      const response = await apiClient.get('/workflows', {
        params: { 
          status: 'active',
          triggerType: 'inquiry',
          search: 'API Test'
        }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.be.an('array');
      
      if (response.data.data.length > 0) {
        const workflow = response.data.data[0];
        expect(workflow.name).to.include('API Test');
      }
    });

    it('should update workflow', async function() {
      const updateData = {
        name: 'Updated API Test Workflow',
        description: 'Updated description',
        isActive: false
      };

      const response = await apiClient.put(`/workflows/${workflowId}`, updateData);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data.name).to.equal(updateData.name);
      expect(response.data.data.is_active).to.equal(false);
    });

    it('should handle workflow not found', async function() {
      const fakeId = '00000000-0000-4000-8000-000000000000';
      const response = await apiClient.get(`/workflows/${fakeId}`);
      
      expect(response.status).to.equal(404);
      expect(response.data).to.have.property('success', false);
      expect(response.data.error).to.have.property('type', 'NOT_FOUND_ERROR');
    });

    it('should delete workflow (soft delete)', async function() {
      const response = await apiClient.delete(`/workflows/${workflowId}`);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      
      // Verify workflow is no longer accessible
      const getResponse = await apiClient.get(`/workflows/${workflowId}`);
      expect(getResponse.status).to.equal(404);
    });
  });

  describe('Error Handling and Validation', function() {
    it('should handle malformed JSON', async function() {
      const response = await axios.post(
        `http://localhost:${config.server.port}/api/workflows`,
        'invalid json',
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          validateStatus: () => true
        }
      );
      
      expect(response.status).to.equal(400);
      expect(response.data).to.have.property('success', false);
    });

    it('should handle missing required fields', async function() {
      const response = await apiClient.post('/workflows', {});
      
      expect(response.status).to.equal(400);
      expect(response.data).to.have.property('success', false);
      expect(response.data.error).to.have.property('type', 'VALIDATION_ERROR');
      expect(response.data.error).to.have.property('details');
    });

    it('should handle invalid field types', async function() {
      const response = await apiClient.post('/workflows', {
        name: 123, // Should be string
        isActive: 'yes', // Should be boolean
        configuration: 'invalid' // Should be object
      });
      
      expect(response.status).to.equal(400);
      expect(response.data).to.have.property('success', false);
      expect(response.data.error).to.have.property('type', 'VALIDATION_ERROR');
    });

    it('should handle field length validation', async function() {
      const response = await apiClient.post('/workflows', {
        name: 'a'.repeat(300), // Too long
        description: 'b'.repeat(2000), // Too long
        triggerType: 'inquiry',
        configuration: { steps: [] }
      });
      
      expect(response.status).to.equal(400);
      expect(response.data).to.have.property('success', false);
      expect(response.data.error).to.have.property('type', 'VALIDATION_ERROR');
    });

    it('should provide detailed validation errors', async function() {
      const response = await apiClient.post('/auth/register', {
        firstName: '',
        lastName: '',
        email: 'invalid',
        password: '123',
        businessName: '',
        businessType: 'invalid'
      });
      
      expect(response.status).to.equal(400);
      expect(response.data).to.have.property('success', false);
      expect(response.data.error).to.have.property('details');
      expect(response.data.error.details).to.be.an('array');
      expect(response.data.error.details.length).to.be.greaterThan(0);
    });
  });

  describe('Security Middleware', function() {
    it('should require authentication for protected routes', async function() {
      const unauthenticatedClient = axios.create({
        baseURL: `http://localhost:${config.server.port}/api`,
        validateStatus: () => true
      });

      const response = await unauthenticatedClient.get('/workflows');
      
      expect(response.status).to.equal(401);
      expect(response.data).to.have.property('success', false);
      expect(response.data.error).to.have.property('type', 'AUTHENTICATION_ERROR');
    });

    it('should reject invalid JWT tokens', async function() {
      const response = await apiClient.get('/workflows', {
        headers: { Authorization: 'Bearer invalid-token' }
      });
      
      expect(response.status).to.equal(401);
      expect(response.data).to.have.property('success', false);
    });

    it('should enforce rate limiting', async function() {
      // Create client without auth to test rate limiting on auth endpoints
      const rateLimitClient = axios.create({
        baseURL: `http://localhost:${config.server.port}/api`,
        validateStatus: () => true
      });

      // Make multiple rapid requests to trigger rate limiting
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(
          rateLimitClient.post('/auth/login', {
            email: 'test@example.com',
            password: 'wrongpassword'
          })
        );
      }

      const responses = await Promise.all(requests);
      
      // At least one should be rate limited
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).to.be.true;
    });

    it('should sanitize input data', async function() {
      const maliciousData = {
        name: '<script>alert("xss")</script>',
        description: 'javascript:alert("xss")',
        triggerType: 'inquiry',
        configuration: {
          steps: [{ type: 'auto_response', template: '<img src=x onerror=alert(1)>' }]
        }
      };

      const response = await apiClient.post('/workflows', maliciousData);
      
      if (response.status === 201) {
        // If created, verify data was sanitized
        const workflow = response.data.data;
        expect(workflow.name).to.not.include('<script>');
        expect(workflow.description).to.not.include('javascript:');
      }
    });
  });

  describe('Database Transactions and Data Integrity', function() {
    it('should maintain data consistency in complex operations', async function() {
      // Test onboarding flow which involves multiple table updates
      const onboardingData = {
        businessName: 'Transaction Test Business',
        businessType: 'hot_tub',
        businessDescription: 'Testing transaction integrity'
      };

      const response = await apiClient.post('/onboarding/start');
      const sessionId = response.data.data.sessionId;

      const businessResponse = await apiClient.post('/onboarding/business-info', {
        sessionId,
        ...onboardingData
      });
      
      expect(businessResponse.status).to.equal(200);
      
      // Verify data was saved consistently
      const dbClient = testEnv.getDbClient();
      const configResult = await dbClient.query(
        'SELECT * FROM business_configurations WHERE user_id = $1',
        [testUserId]
      );
      
      expect(configResult.rows).to.have.length(1);
      expect(configResult.rows[0].business_name).to.equal(onboardingData.businessName);
    });

    it('should handle concurrent requests safely', async function() {
      // Create multiple workflows concurrently
      const workflowPromises = [];
      for (let i = 0; i < 5; i++) {
        workflowPromises.push(
          apiClient.post('/workflows', {
            name: `Concurrent Workflow ${i}`,
            description: `Test workflow ${i}`,
            triggerType: 'inquiry',
            configuration: { steps: [] },
            isActive: true
          })
        );
      }

      const responses = await Promise.all(workflowPromises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).to.equal(201);
        expect(response.data).to.have.property('success', true);
      });

      // Verify all workflows were created with unique IDs
      const workflowIds = responses.map(r => r.data.data.id);
      const uniqueIds = [...new Set(workflowIds)];
      expect(uniqueIds.length).to.equal(workflowIds.length);
    });

    it('should rollback failed transactions', async function() {
      // This would require a scenario that causes a transaction failure
      // For now, we'll test that partial updates don't occur
      
      const dbClient = testEnv.getDbClient();
      const beforeCount = await dbClient.query('SELECT COUNT(*) FROM workflows WHERE user_id = $1', [testUserId]);
      
      // Try to create workflow with invalid data that might pass initial validation
      // but fail during database constraints
      const response = await apiClient.post('/workflows', {
        name: 'Test Rollback',
        triggerType: 'inquiry',
        configuration: { steps: [] },
        isActive: true
        // Missing required fields that might be caught at DB level
      });
      
      const afterCount = await dbClient.query('SELECT COUNT(*) FROM workflows WHERE user_id = $1', [testUserId]);
      
      if (response.status !== 201) {
        // If creation failed, count should be the same (no partial insert)
        expect(afterCount.rows[0].count).to.equal(beforeCount.rows[0].count);
      }
    });
  });

  describe('Performance and Load Testing', function() {
    it('should handle multiple simultaneous requests', async function() {
      const startTime = Date.now();
      
      // Create 20 simultaneous requests
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(apiClient.get('/workflows'));
      }

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).to.equal(200);
        expect(response.data).to.have.property('success', true);
      });
      
      // Should complete within reasonable time (adjust based on your requirements)
      expect(totalTime).to.be.lessThan(10000); // 10 seconds
      
      console.log(`20 simultaneous requests completed in ${totalTime}ms`);
    });

    it('should handle large data sets efficiently', async function() {
      // Test pagination with large offset
      const response = await apiClient.get('/analytics/events', {
        params: { page: 1, limit: 100 }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      
      // Response should be reasonably fast even with large datasets
      // This would be more meaningful with actual large datasets
    });

    it('should maintain performance under load', async function() {
      const iterations = 10;
      const responseTimes = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        const response = await apiClient.get('/auth/profile');
        const endTime = Date.now();
        
        expect(response.status).to.equal(200);
        responseTimes.push(endTime - startTime);
      }
      
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      
      console.log(`Average response time: ${avgResponseTime}ms`);
      console.log(`Max response time: ${maxResponseTime}ms`);
      
      // Performance thresholds (adjust based on requirements)
      expect(avgResponseTime).to.be.lessThan(500); // 500ms average
      expect(maxResponseTime).to.be.lessThan(2000); // 2s max
    });
  });
});
