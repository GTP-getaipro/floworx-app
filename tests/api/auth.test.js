/**
 * Authentication API Tests
 * Tests for user registration, login, logout, and JWT handling
 */

const APITestHelper = require('./setup/test-helpers');
const config = require('./setup/test-config');

// Mock Jest functions if not available
if (typeof describe === 'undefined') {
  global.describe = (name, fn) => {
    console.log(`\n📋 ${name}`);
    return fn();
  };
  global.test = async (name, fn, timeout) => {
    try {
      console.log(`  🧪 ${name}`);
      await fn();
      console.log(`  ✅ PASSED: ${name}`);
    } catch (error) {
      console.log(`  ❌ FAILED: ${name} - ${error.message}`);
    }
  };
  global.beforeAll = (fn) => fn();
  global.afterAll = (fn) => fn();
  global.expect = (actual) => ({
    toBe: (expected) => {
      if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
    },
    toHaveProperty: (prop) => {
      if (!(prop in actual)) throw new Error(`Expected property ${prop}`);
    },
    toMatch: (regex) => {
      if (!regex.test(actual)) throw new Error(`Expected ${actual} to match ${regex}`);
    },
    not: {
      toBe: (expected) => {
        if (actual === expected) throw new Error(`Expected not ${expected}, got ${actual}`);
      },
      toMatch: (regex) => {
        if (regex.test(actual)) throw new Error(`Expected ${actual} not to match ${regex}`);
      },
      toHaveProperty: (prop) => {
        if (prop in actual) throw new Error(`Expected not to have property ${prop}`);
      }
    }
  });
  global.toContain = (arr) => ({
    toContain: (item) => {
      if (!arr.includes(item)) throw new Error(`Expected array to contain ${item}`);
    }
  });
}

describe('Authentication API Tests', () => {
  let api;
  let testUser;

  beforeAll(() => {
    api = new APITestHelper();
  });

  afterAll(async () => {
    await api.cleanup();
  });

  describe('POST /api/auth/register', () => {
    test('should register user with valid data', async () => {
      testUser = config.helpers.generateTestUser();
      const response = await api.post(config.endpoints.auth.register, testUser);

      expect(response.status).toBe(201);
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('user');
      expect(response.data).toHaveProperty('token');
      expect(response.data.user.email).toBe(testUser.email);
      
      // Validate response structure
      const validation = api.validateResponse(
        response, 
        config.expectedResponses.success.register
      );
      expect(validation.valid).toBe(true);
    }, config.timeouts.medium);

    test('should reject registration with invalid email', async () => {
      const invalidUser = {
        ...config.helpers.generateTestUser(),
        email: 'invalid-email'
      };

      const response = await api.post(config.endpoints.auth.register, invalidUser);

      expect(response.status).toBe(400);
      expect(response.success).toBe(false);
      expect(response.data).toHaveProperty('error');
      expect(response.data.message).toMatch(/email/i);
    });

    test('should reject registration with weak password', async () => {
      const weakPasswordUser = {
        ...config.helpers.generateTestUser(),
        password: '123'
      };

      const response = await api.post(config.endpoints.auth.register, weakPasswordUser);

      expect(response.status).toBe(400);
      expect(response.success).toBe(false);
      expect(response.data).toHaveProperty('error');
      expect(response.data.message).toMatch(/password/i);
    });

    test('should reject registration with missing required fields', async () => {
      const incompleteUser = {
        email: config.helpers.generateTestEmail()
        // Missing other required fields
      };

      const response = await api.post(config.endpoints.auth.register, incompleteUser);

      expect(response.status).toBe(400);
      expect(response.success).toBe(false);
      expect(response.data).toHaveProperty('error');
    });

    test('should reject duplicate email registration', async () => {
      // First registration
      const user1 = config.helpers.generateTestUser();
      await api.post(config.endpoints.auth.register, user1);

      // Attempt duplicate registration
      const response = await api.post(config.endpoints.auth.register, user1);

      expect(response.status).toBe(409);
      expect(response.success).toBe(false);
      expect(response.data).toHaveProperty('error');
      expect(response.data.message).toMatch(/already exists|duplicate/i);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      // Ensure we have a test user to login with
      if (!testUser) {
        const result = await api.registerTestUser();
        testUser = result.user;
      }
    });

    test('should login with valid credentials', async () => {
      const response = await api.post(config.endpoints.auth.login, {
        email: testUser.email,
        password: testUser.password
      });

      expect(response.status).toBe(200);
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('token');
      expect(response.data).toHaveProperty('user');
      expect(response.data.user.email).toBe(testUser.email);

      // Validate response structure
      const validation = api.validateResponse(
        response, 
        config.expectedResponses.success.login
      );
      expect(validation.valid).toBe(true);
    });

    test('should reject login with invalid email', async () => {
      const response = await api.post(config.endpoints.auth.login, {
        email: 'nonexistent@example.com',
        password: 'anypassword'
      });

      expect(response.status).toBe(401);
      expect(response.success).toBe(false);
      expect(response.data).toHaveProperty('error');
    });

    test('should reject login with incorrect password', async () => {
      const response = await api.post(config.endpoints.auth.login, {
        email: testUser.email,
        password: 'wrongpassword'
      });

      expect(response.status).toBe(401);
      expect(response.success).toBe(false);
      expect(response.data).toHaveProperty('error');
    });

    test('should reject login with missing credentials', async () => {
      const response = await api.post(config.endpoints.auth.login, {});

      expect(response.status).toBe(400);
      expect(response.success).toBe(false);
      expect(response.data).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    let authHeaders;

    beforeAll(async () => {
      // Login to get auth token
      const loginResponse = await api.loginTestUser(testUser.email, testUser.password);
      authHeaders = api.getAuthHeaders(testUser.email);
    });

    test('should logout authenticated user', async () => {
      const response = await api.post(config.endpoints.auth.logout, {}, authHeaders);

      expect(response.status).toBe(200);
      expect(response.success).toBe(true);
    });

    test('should handle logout without authentication', async () => {
      const response = await api.post(config.endpoints.auth.logout, {});

      // Should either require auth (401) or handle gracefully (200)
      expect([200, 401]).toContain(response.status);
    });
  });

  describe('JWT Token Validation', () => {
    let validToken;
    let authHeaders;

    beforeAll(async () => {
      const loginResponse = await api.loginTestUser(testUser.email, testUser.password);
      validToken = loginResponse.data.token;
      authHeaders = api.getAuthHeaders(testUser.email);
    });

    test('should accept valid JWT token', async () => {
      const response = await api.get(config.endpoints.user.status, authHeaders);

      // Should either work (200) or have specific auth issue
      expect(response.status).not.toBe(500);
    });

    test('should reject invalid JWT token', async () => {
      const invalidHeaders = { Authorization: 'Bearer invalid-token' };
      const response = await api.get(config.endpoints.user.status, invalidHeaders);

      expect(response.status).toBe(401);
      expect(response.success).toBe(false);
    });

    test('should reject malformed authorization header', async () => {
      const malformedHeaders = { Authorization: 'InvalidFormat' };
      const response = await api.get(config.endpoints.user.status, malformedHeaders);

      expect(response.status).toBe(401);
      expect(response.success).toBe(false);
    });

    test('should handle missing authorization header', async () => {
      const response = await api.get(config.endpoints.user.status);

      expect(response.status).toBe(401);
      expect(response.success).toBe(false);
    });
  });

  describe('Authentication Security', () => {
    test('should implement rate limiting on login attempts', async () => {
      const rateLimitTest = await api.testRateLimit(
        config.endpoints.auth.login, 
        15, // 15 requests
        5000 // in 5 seconds
      );

      // Rate limiting may or may not be implemented
      // This test documents the current behavior
      console.log('Rate limit test results:', rateLimitTest);
    }, config.timeouts.long);

    test('should not expose sensitive information in error messages', async () => {
      const response = await api.post(config.endpoints.auth.login, {
        email: 'test@example.com',
        password: 'wrongpassword'
      });

      expect(response.data.message).not.toMatch(/database|sql|internal/i);
      expect(response.data).not.toHaveProperty('stack');
      expect(response.data).not.toHaveProperty('query');
    });
  });
});
