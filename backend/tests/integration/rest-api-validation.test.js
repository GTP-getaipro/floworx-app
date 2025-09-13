/**
 * REST API Validation Tests
 * Comprehensive testing of all API endpoints using REST API instead of direct SQL
 */

const request = require('supertest');
const { restApiTestHelpers } = require('../../../tests/utils/rest-api-test-helpers');

// Import the app
const app = require('../../server');

describe('REST API Validation Tests', () => {
  let testUser;
  let authToken;
  let testBusinessType;

  beforeAll(async () => {
    // Verify database connection
    const connection = await restApiTestHelpers.verifyConnection();
    if (!connection.connected) {
      throw new Error(`Database connection failed: ${connection.error}`);
    }
    console.log(`✅ Connected to database via ${connection.type}`);

    // Create test user for authentication tests
    testUser = await restApiTestHelpers.createTestUser({
      email: 'rest-api-test@floworx-test.com',
      first_name: 'REST',
      last_name: 'API Test',
      company_name: 'REST API Test Company'
    });
  });

  afterAll(async () => {
    // Clean up all test data
    await restApiTestHelpers.cleanup();
  });

  describe('Authentication Endpoints', () => {
    test('POST /api/auth/register - should create new user', async () => {
      const userData = restApiTestHelpers.generateTestData('user', {
        email: 'new-user-test@floworx-test.com'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.token).toBeDefined();

      // Verify user exists in database
      const dbUser = await restApiTestHelpers.getTestUserByEmail(userData.email);
      expect(dbUser).toBeTruthy();
      expect(dbUser.email).toBe(userData.email);
    });

    test('POST /api/auth/login - should authenticate existing user', async () => {
      const loginData = {
        email: testUser.email,
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
      expect(response.body.token).toBeDefined();

      // Store token for subsequent tests
      authToken = response.body.token;
    });

    test('POST /api/auth/verify - should verify valid JWT token', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
    });

    test('POST /api/auth/verify - should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('System Health Endpoints', () => {
    test('GET /api/health - should return system health', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.timestamp).toBeDefined();
      expect(response.body.uptime).toBeDefined();
    });

    test('GET /api/health/database - should return database health', async () => {
      const response = await request(app)
        .get('/api/health/database')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.connection).toBeDefined();
      expect(response.body.responseTime).toBeDefined();
    });
  });

  describe('Protected Endpoints', () => {
    test('GET /api/dashboard/stats - should require authentication', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    test('GET /api/dashboard/stats - should return stats with valid token', async () => {
      const response = await request(app)
        .get('/api/dashboard/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    test('GET /api/user/profile - should return user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(testUser.email);
    });
  });

  describe('Business Configuration Endpoints', () => {
    test('GET /api/business-types - should return business types', async () => {
      const response = await request(app)
        .get('/api/business-types')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('POST /api/business-types - should create business type with auth', async () => {
      const businessTypeData = restApiTestHelpers.generateTestData('businessType');

      const response = await request(app)
        .post('/api/business-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send(businessTypeData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.name).toBe(businessTypeData.name);

      testBusinessType = response.body.data;
    });
  });

  describe('OAuth Endpoints', () => {
    test('GET /api/oauth/google - should redirect to Google OAuth', async () => {
      const response = await request(app)
        .get('/api/oauth/google')
        .expect(302);

      expect(response.headers.location).toContain('accounts.google.com');
    });

    test('GET /api/oauth/google/callback - should handle OAuth callback', async () => {
      // This test would require mocking Google OAuth response
      // For now, just verify the endpoint exists
      const response = await request(app)
        .get('/api/oauth/google/callback')
        .expect(400); // Expected without proper OAuth code

      expect(response.body.success).toBe(false);
    });
  });

  describe('Performance and Monitoring', () => {
    test('GET /api/performance - should return performance metrics', async () => {
      const response = await request(app)
        .get('/api/performance')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.metrics).toBeDefined();
      expect(response.body.metrics.memory).toBeDefined();
      expect(response.body.metrics.uptime).toBeDefined();
    });

    test('Database operations should complete within reasonable time', async () => {
      const startTime = Date.now();
      
      const user = await restApiTestHelpers.getTestUserByEmail(testUser.email);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(user).toBeTruthy();
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });

  describe('Error Handling', () => {
    test('Should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('Should handle missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({}) // Empty body
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    test('Should handle non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/non-existent-endpoint')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Data Validation', () => {
    test('Should validate email format in registration', async () => {
      const userData = restApiTestHelpers.generateTestData('user', {
        email: 'invalid-email-format'
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    test('Should validate password strength', async () => {
      const userData = restApiTestHelpers.generateTestData('user', {
        password: '123' // Weak password
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });
});
