/**
 * Email Provider and Business Type Selection Tests
 * Tests for the new onboarding functionality
 */

const request = require('supertest');
const app = require('../app');
const { databaseOperations } = require('../database/database-operations');

describe('Email Provider and Business Type Selection', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Create a test user and get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test-onboarding@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        businessName: 'Test Business'
      });

    if (registerResponse.status === 201) {
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test-onboarding@example.com',
          password: 'TestPassword123!'
        });

      authToken = loginResponse.body.token;
      userId = loginResponse.body.user.id;
    }
  });

  afterAll(async () => {
    // Clean up test user
    if (userId) {
      try {
        await databaseOperations.deleteUser(userId);
      } catch (error) {
        console.log('Cleanup error:', error.message);
      }
    }
  });

  describe('GET /api/onboarding/status', () => {
    it('should return onboarding status with email provider and business type info', async () => {
      const response = await request(app)
        .get('/api/onboarding/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('emailProvider');
      expect(response.body).toHaveProperty('businessTypeId');
      expect(response.body).toHaveProperty('businessTypes');
      expect(response.body).toHaveProperty('onboardingComplete');
      expect(response.body).toHaveProperty('customSettings');
      expect(response.body).toHaveProperty('nextStep');
      
      // Initially, email provider should be null and next step should be email-provider
      expect(response.body.emailProvider).toBeNull();
      expect(response.body.nextStep).toBe('email-provider');
    });
  });

  describe('POST /api/onboarding/email-provider', () => {
    it('should successfully select gmail as email provider', async () => {
      const response = await request(app)
        .post('/api/onboarding/email-provider')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'gmail'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.provider).toBe('gmail');
    });

    it('should successfully select outlook as email provider', async () => {
      const response = await request(app)
        .post('/api/onboarding/email-provider')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'outlook'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.provider).toBe('outlook');
    });

    it('should reject invalid email provider', async () => {
      const response = await request(app)
        .post('/api/onboarding/email-provider')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'yahoo'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/onboarding/email-provider')
        .send({
          provider: 'gmail'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/onboarding/custom-settings', () => {
    it('should successfully save custom settings', async () => {
      const customSettings = {
        emailNotifications: true,
        autoArchive: false,
        priorityKeywords: ['urgent', 'emergency'],
        businessHours: {
          enabled: true,
          timezone: 'America/New_York',
          start: '09:00',
          end: '17:00',
          days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        }
      };

      const response = await request(app)
        .post('/api/onboarding/custom-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          settings: customSettings
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.settings).toEqual(customSettings);
    });

    it('should reject invalid settings format', async () => {
      const response = await request(app)
        .post('/api/onboarding/custom-settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          settings: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/onboarding/custom-settings')
        .send({
          settings: {}
        });

      expect(response.status).toBe(401);
    });
  });

  describe('Integration Test - Complete Email Provider Flow', () => {
    it('should complete email provider selection and update onboarding status', async () => {
      // Step 1: Select email provider
      await request(app)
        .post('/api/onboarding/email-provider')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          provider: 'gmail'
        });

      // Step 2: Check onboarding status
      const statusResponse = await request(app)
        .get('/api/onboarding/status')
        .set('Authorization', `Bearer ${authToken}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.emailProvider).toBe('gmail');
      expect(statusResponse.body.nextStep).toBe('business-type');

      // Step 3: Select business type (assuming business types exist)
      const businessTypes = statusResponse.body.businessTypes;
      if (businessTypes && businessTypes.length > 0) {
        const businessTypeResponse = await request(app)
          .post('/api/business-types/select')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            businessTypeId: businessTypes[0].id
          });

        expect(businessTypeResponse.status).toBe(200);

        // Step 4: Check final status
        const finalStatusResponse = await request(app)
          .get('/api/onboarding/status')
          .set('Authorization', `Bearer ${authToken}`);

        expect(finalStatusResponse.body.emailProvider).toBe('gmail');
        expect(finalStatusResponse.body.businessTypeId).toBe(businessTypes[0].id);
        expect(finalStatusResponse.body.nextStep).toBe('google-connection');
      }
    });
  });

  describe('Database Operations', () => {
    it('should update user email provider in database', async () => {
      const result = await databaseOperations.updateUserEmailProvider(userId, 'outlook');
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });

    it('should get user configuration from database', async () => {
      const result = await databaseOperations.getUserConfiguration(userId);
      expect(result.data).toBeDefined();
      expect(result.data.email_provider).toBe('outlook');
    });

    it('should update custom settings in database', async () => {
      const settings = { testSetting: true };
      const result = await databaseOperations.updateUserCustomSettings(userId, settings);
      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
    });
  });
});
