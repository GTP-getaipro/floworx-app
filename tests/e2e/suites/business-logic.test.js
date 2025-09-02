/**
 * Core Business Logic E2E Tests for FloWorx SaaS
 * Tests complete onboarding flow, workflows, and business operations
 */

const { TestEnvironment } = require('../setup/test-environment');
const axios = require('axios');
const { expect } = require('chai');

describe('Core Business Logic E2E Tests', function() {
  this.timeout(120000); // 2 minute timeout for complex flows
  
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

  describe('Complete Onboarding Flow', function() {
    let onboardingSessionId;

    it('should start onboarding process', async function() {
      const response = await apiClient.post('/onboarding/start');
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('sessionId');
      expect(response.data.data).to.have.property('currentStep', 'business_info');
      
      onboardingSessionId = response.data.data.sessionId;
    });

    it('should complete business info step', async function() {
      const businessInfo = {
        businessName: 'E2E Test Hot Tub Services',
        businessType: 'hot_tub',
        businessDescription: 'Full-service hot tub maintenance and repair',
        website: 'https://e2e-test-hottubs.com',
        phone: '(555) 123-4567',
        address: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'CA',
          zipCode: '90210',
          country: 'US'
        }
      };

      const response = await apiClient.post('/onboarding/business-info', {
        sessionId: onboardingSessionId,
        ...businessInfo
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('nextStep', 'gmail_connection');
      
      // Verify business configuration was saved
      const dbClient = testEnv.getDbClient();
      const configResult = await dbClient.query(
        'SELECT * FROM business_configurations WHERE user_id = $1',
        [testUserId]
      );
      
      expect(configResult.rows).to.have.length(1);
      expect(configResult.rows[0].business_name).to.equal(businessInfo.businessName);
    });

    it('should handle Gmail connection step', async function() {
      // Mock Gmail OAuth flow
      const response = await apiClient.post('/onboarding/gmail-connection', {
        sessionId: onboardingSessionId,
        authorizationCode: 'mock-auth-code',
        redirectUri: 'http://localhost:3001/onboarding/gmail-callback'
      });
      
      // In real scenario, this would connect to Gmail API
      // For E2E test, we'll verify the endpoint handles the request
      expect(response.status).to.be.oneOf([200, 400]); // Success or validation error
      
      if (response.status === 200) {
        expect(response.data.data).to.have.property('nextStep', 'label_mapping');
      }
    });

    it('should complete label mapping step', async function() {
      const labelMappings = {
        mappings: [
          {
            gmailLabel: 'Customer Inquiries',
            triggerType: 'inquiry',
            priority: 'medium',
            autoRespond: true,
            responseTemplate: 'Thank you for your inquiry. We will respond within 24 hours.'
          },
          {
            gmailLabel: 'Service Requests',
            triggerType: 'service_request',
            priority: 'high',
            autoRespond: false
          },
          {
            gmailLabel: 'Complaints',
            triggerType: 'complaint',
            priority: 'urgent',
            autoRespond: true,
            responseTemplate: 'We apologize for any inconvenience. A manager will contact you immediately.'
          }
        ]
      };

      const response = await apiClient.post('/onboarding/label-mapping', {
        sessionId: onboardingSessionId,
        ...labelMappings
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('nextStep', 'team_notifications');
    });

    it('should complete team notifications step', async function() {
      const teamNotifications = {
        notifications: [
          {
            type: 'email',
            recipient: 'manager@e2e-test-hottubs.com',
            triggers: ['complaint', 'service_request'],
            enabled: true
          },
          {
            type: 'sms',
            recipient: '+15551234567',
            triggers: ['complaint'],
            enabled: true
          },
          {
            type: 'slack',
            recipient: '#customer-service',
            triggers: ['inquiry', 'service_request'],
            enabled: false
          }
        ],
        defaultNotifications: true
      };

      const response = await apiClient.post('/onboarding/team-notifications', {
        sessionId: onboardingSessionId,
        ...teamNotifications
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('nextStep', 'workflow_preferences');
    });

    it('should complete workflow preferences step', async function() {
      const workflowPreferences = {
        autoStart: true,
        businessHours: {
          enabled: true,
          timezone: 'America/Los_Angeles',
          schedule: {
            monday: { start: '09:00', end: '17:00' },
            tuesday: { start: '09:00', end: '17:00' },
            wednesday: { start: '09:00', end: '17:00' },
            thursday: { start: '09:00', end: '17:00' },
            friday: { start: '09:00', end: '17:00' },
            saturday: { start: '10:00', end: '14:00' }
          }
        },
        responseDelay: 300, // 5 minutes
        escalationRules: [
          {
            condition: 'no_response_24h',
            action: 'notify_manager',
            delay: 86400 // 24 hours
          }
        ]
      };

      const response = await apiClient.post('/onboarding/workflow-preferences', {
        sessionId: onboardingSessionId,
        ...workflowPreferences
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('nextStep', 'review');
    });

    it('should complete onboarding review and finalization', async function() {
      const response = await apiClient.post('/onboarding/complete', {
        sessionId: onboardingSessionId,
        confirmed: true
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('completed', true);
      
      // Verify onboarding progress was marked complete
      const dbClient = testEnv.getDbClient();
      const progressResult = await dbClient.query(
        'SELECT * FROM onboarding_progress WHERE user_id = $1',
        [testUserId]
      );
      
      expect(progressResult.rows).to.have.length(1);
      expect(progressResult.rows[0].completed_at).to.not.be.null;
    });

    it('should get onboarding status', async function() {
      const response = await apiClient.get('/onboarding/status');
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('completed', true);
      expect(response.data.data).to.have.property('currentStep', 'completed');
    });
  });

  describe('Workflow Management', function() {
    let workflowId;

    it('should create a new workflow', async function() {
      const workflowData = {
        name: 'Customer Inquiry Auto-Response',
        description: 'Automatically respond to customer inquiries and create follow-up tasks',
        triggerType: 'inquiry',
        configuration: {
          steps: [
            {
              type: 'auto_response',
              template: 'Thank you for your inquiry. We will respond within 24 hours.',
              delay: 0
            },
            {
              type: 'create_task',
              assignTo: 'customer_service',
              priority: 'medium',
              delay: 300
            },
            {
              type: 'follow_up',
              delay: 86400,
              template: 'Following up on your inquiry. How can we help you further?'
            }
          ],
          conditions: {
            businessHours: true,
            autoStart: true
          }
        },
        isActive: true
      };

      const response = await apiClient.post('/workflows', workflowData);
      
      expect(response.status).to.equal(201);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('id');
      expect(response.data.data.name).to.equal(workflowData.name);
      
      workflowId = response.data.data.id;
    });

    it('should get workflow list', async function() {
      const response = await apiClient.get('/workflows');
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.be.an('array');
      expect(response.data.data.length).to.be.greaterThan(0);
      
      const workflow = response.data.data.find(w => w.id === workflowId);
      expect(workflow).to.exist;
    });

    it('should get specific workflow', async function() {
      const response = await apiClient.get(`/workflows/${workflowId}`);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data.id).to.equal(workflowId);
      expect(response.data.data.name).to.equal('Customer Inquiry Auto-Response');
    });

    it('should update workflow', async function() {
      const updateData = {
        name: 'Updated Customer Inquiry Workflow',
        description: 'Updated description for the workflow',
        isActive: false
      };

      const response = await apiClient.put(`/workflows/${workflowId}`, updateData);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data.name).to.equal(updateData.name);
      expect(response.data.data.is_active).to.equal(false);
    });

    it('should execute workflow', async function() {
      const executionData = {
        inputData: {
          emailId: 'test-email-123',
          from: 'customer@example.com',
          subject: 'Hot tub maintenance question',
          body: 'I need help with my hot tub maintenance schedule.'
        },
        context: {
          triggerSource: 'gmail',
          timestamp: new Date().toISOString()
        }
      };

      const response = await apiClient.post(`/workflows/${workflowId}/execute`, executionData);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('executionId');
      expect(response.data.data).to.have.property('status', 'pending');
    });

    it('should get workflow execution history', async function() {
      const response = await apiClient.get(`/workflows/${workflowId}/executions`);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.be.an('array');
      expect(response.data.data.length).to.be.greaterThan(0);
    });

    it('should delete workflow', async function() {
      const response = await apiClient.delete(`/workflows/${workflowId}`);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      
      // Verify workflow is soft deleted
      const getResponse = await apiClient.get(`/workflows/${workflowId}`);
      expect(getResponse.status).to.equal(404);
    });
  });

  describe('Analytics and Reporting', function() {
    before(async function() {
      // Seed some analytics data
      const events = [
        {
          eventType: 'workflow_executed',
          eventData: { workflowId: 'test-workflow-1', duration: 1500 }
        },
        {
          eventType: 'email_processed',
          eventData: { emailId: 'email-1', processingTime: 250 }
        },
        {
          eventType: 'user_action',
          eventData: { action: 'login', timestamp: new Date().toISOString() }
        }
      ];

      for (const event of events) {
        await apiClient.post('/analytics/track', event);
      }
    });

    it('should track analytics events', async function() {
      const eventData = {
        eventType: 'workflow_executed',
        eventData: {
          workflowId: 'test-workflow-123',
          duration: 2000,
          status: 'success',
          stepsCompleted: 3
        },
        metadata: {
          source: 'e2e-test',
          version: '1.0.0'
        }
      };

      const response = await apiClient.post('/analytics/track', eventData);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
    });

    it('should get analytics dashboard data', async function() {
      const response = await apiClient.get('/analytics/dashboard', {
        params: {
          period: 'week',
          metrics: ['workflow_executions', 'email_volume', 'response_times']
        }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('metrics');
      expect(response.data.data).to.have.property('period', 'week');
    });

    it('should get analytics events with filtering', async function() {
      const response = await apiClient.get('/analytics/events', {
        params: {
          eventType: 'workflow_executed',
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          page: 1,
          limit: 10
        }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.be.an('array');
      expect(response.data.meta).to.have.property('pagination');
    });

    it('should generate analytics report', async function() {
      const response = await apiClient.post('/analytics/report', {
        reportType: 'workflow_performance',
        period: 'month',
        filters: {
          workflowTypes: ['inquiry', 'service_request']
        }
      });
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('reportId');
    });
  });

  describe('Business Configuration Management', function() {
    it('should get current business configuration', async function() {
      const response = await apiClient.get('/business-types/configuration');
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.have.property('businessType');
      expect(response.data.data).to.have.property('businessName');
    });

    it('should update business configuration', async function() {
      const updateData = {
        businessName: 'Updated E2E Test Business',
        businessDescription: 'Updated description for E2E testing',
        website: 'https://updated-e2e-test.com',
        phone: '(555) 987-6543',
        settings: {
          autoResponse: true,
          businessHours: {
            enabled: true,
            timezone: 'America/New_York'
          }
        }
      };

      const response = await apiClient.put('/business-types/configuration', updateData);
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data.business_name).to.equal(updateData.businessName);
    });

    it('should get available business types', async function() {
      const response = await apiClient.get('/business-types');
      
      expect(response.status).to.equal(200);
      expect(response.data).to.have.property('success', true);
      expect(response.data.data).to.be.an('array');
      expect(response.data.data.length).to.be.greaterThan(0);
      
      const hotTubType = response.data.data.find(type => type.value === 'hot_tub');
      expect(hotTubType).to.exist;
      expect(hotTubType).to.have.property('label');
    });
  });
});
