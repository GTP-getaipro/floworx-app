/**
 * Authentication Regression Tests
 * Comprehensive testing of authentication flows and security
 */

const request = require('supertest');
// const app = require('../../server'); // Commented out for now - will be provided by test setup
const testDataFactory = require('../helpers/testDataFactory');
const testUtils = require('../helpers/testUtils');

describe('Authentication Regression Tests', () => {
  beforeAll(async () => {
    // testUtils.initialize(app); // Will be initialized by test setup
  });

  afterEach(async () => {
    await testUtils.cleanup();
  });

  describe('User Registration Flow', () => {
    test('should successfully register new user with valid data', async () => {
      const userData = testDataFactory.createUser({
        email: 'newuser@floworx-test.com',
        password: 'SecurePassword123!'
      });

      const response = await testUtils.unauthenticatedRequest('POST', '/api/auth/register')
        .send({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName
        });

      testUtils.assertSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(userData.email);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    test('should reject registration with invalid email format', async () => {
      const userData = testDataFactory.createUser({
        email: 'invalid-email-format',
        password: 'SecurePassword123!'
      });

      const response = await testUtils.unauthenticatedRequest('POST', '/api/auth/register')
        .send({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName
        });

      testUtils.assertErrorResponse(response, 400, 'Invalid email format');
    });

    test('should reject registration with weak password', async () => {
      const userData = testDataFactory.createUser({
        email: 'test@floworx-test.com',
        password: '123'
      });

      const response = await testUtils.unauthenticatedRequest('POST', '/api/auth/register')
        .send({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName
        });

      testUtils.assertErrorResponse(response, 400, 'Password does not meet requirements');
    });

    test('should reject duplicate email registration', async () => {
      const userData = testDataFactory.createUser();
      
      // First registration
      await testUtils.unauthenticatedRequest('POST', '/api/auth/register')
        .send({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName
        });

      // Duplicate registration
      const response = await testUtils.unauthenticatedRequest('POST', '/api/auth/register')
        .send({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName
        });

      testUtils.assertErrorResponse(response, 409, 'Email already registered');
    });
  });

  describe('User Login Flow', () => {
    test('should successfully login with valid credentials', async () => {
      const userData = testDataFactory.createUser();
      
      // Register user first
      await testUtils.unauthenticatedRequest('POST', '/api/auth/register')
        .send({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName
        });

      // Login
      const response = await testUtils.unauthenticatedRequest('POST', '/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(userData.email);
    });

    test('should reject login with invalid email', async () => {
      const response = await testUtils.unauthenticatedRequest('POST', '/api/auth/login')
        .send({
          email: 'nonexistent@floworx-test.com',
          password: 'SomePassword123!'
        });

      testUtils.assertErrorResponse(response, 401, 'Invalid credentials');
    });

    test('should reject login with invalid password', async () => {
      const userData = testDataFactory.createUser();
      
      // Register user first
      await testUtils.unauthenticatedRequest('POST', '/api/auth/register')
        .send({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName
        });

      // Login with wrong password
      const response = await testUtils.unauthenticatedRequest('POST', '/api/auth/login')
        .send({
          email: userData.email,
          password: 'WrongPassword123!'
        });

      testUtils.assertErrorResponse(response, 401, 'Invalid credentials');
    });

    test('should implement rate limiting for failed login attempts', async () => {
      const userData = testDataFactory.createUser();
      
      // Register user first
      await testUtils.unauthenticatedRequest('POST', '/api/auth/register')
        .send({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName
        });

      // Make multiple failed login attempts
      const failedAttempts = [];
      for (let i = 0; i < 6; i++) {
        failedAttempts.push(
          testUtils.unauthenticatedRequest('POST', '/api/auth/login')
            .send({
              email: userData.email,
              password: 'WrongPassword123!'
            })
        );
      }

      const responses = await Promise.all(failedAttempts);
      
      // First few attempts should return 401
      expect(responses[0].status).toBe(401);
      expect(responses[1].status).toBe(401);
      
      // Later attempts should be rate limited (429)
      const rateLimitedResponse = responses[responses.length - 1];
      expect(rateLimitedResponse.status).toBe(429);
    });
  });

  describe('JWT Token Validation', () => {
    test('should accept valid JWT token', async () => {
      const userData = testDataFactory.createUser();
      
      const response = await testUtils.authenticatedRequest('GET', '/api/auth/me', userData);

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.data.user.id).toBe(userData.id);
    });

    test('should reject expired JWT token', async () => {
      const userData = testDataFactory.createUser();
      const expiredToken = testDataFactory.generateJWTToken({
        userId: userData.id,
        email: userData.email,
        exp: Math.floor(Date.now() / 1000) - 3600 // Expired 1 hour ago
      });

      const response = await testUtils.unauthenticatedRequest('GET', '/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      testUtils.assertErrorResponse(response, 401, 'Token expired');
    });

    test('should reject malformed JWT token', async () => {
      const response = await testUtils.unauthenticatedRequest('GET', '/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-format');

      testUtils.assertErrorResponse(response, 401, 'Invalid token');
    });

    test('should reject request without authorization header', async () => {
      const response = await testUtils.unauthenticatedRequest('GET', '/api/auth/me');

      testUtils.assertErrorResponse(response, 401, 'No token provided');
    });
  });

  describe('Password Reset Flow', () => {
    test('should initiate password reset for valid email', async () => {
      const userData = testDataFactory.createUser();
      
      // Register user first
      await testUtils.unauthenticatedRequest('POST', '/api/auth/register')
        .send({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName
        });

      const response = await testUtils.unauthenticatedRequest('POST', '/api/auth/forgot-password')
        .send({ email: userData.email });

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.message).toContain('Password reset email sent');
    });

    test('should not reveal if email exists for security', async () => {
      const response = await testUtils.unauthenticatedRequest('POST', '/api/auth/forgot-password')
        .send({ email: 'nonexistent@floworx-test.com' });

      // Should return success even for non-existent email
      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.message).toContain('Password reset email sent');
    });

    test('should validate password reset token', async () => {
      const userData = testDataFactory.createUser();
      const resetToken = testDataFactory.generateToken();
      
      // This would normally validate against database
      const response = await testUtils.unauthenticatedRequest('POST', '/api/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'NewSecurePassword123!'
        });

      // For this test, we expect it to fail since token isn't in database
      testUtils.assertErrorResponse(response, 400, 'Invalid or expired reset token');
    });
  });

  describe('Session Management', () => {
    test('should maintain session state across requests', async () => {
      const userData = testDataFactory.createUser();
      
      // Register and login
      await testUtils.unauthenticatedRequest('POST', '/api/auth/register')
        .send({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName
        });

      const loginResponse = await testUtils.unauthenticatedRequest('POST', '/api/auth/login')
        .send({
          email: userData.email,
          password: userData.password
        });

      const token = loginResponse.body.data.token;

      // Use token for authenticated request
      const profileResponse = await testUtils.unauthenticatedRequest('GET', '/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      testUtils.assertSuccessResponse(profileResponse, 200);
      expect(profileResponse.body.data.user.email).toBe(userData.email);
    });

    test('should handle logout properly', async () => {
      const userData = testDataFactory.createUser();
      
      const response = await testUtils.authenticatedRequest('POST', '/api/auth/logout', userData);

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.message).toContain('Logged out successfully');
    });
  });

  describe('Security Headers and CORS', () => {
    test('should include security headers in responses', async () => {
      const response = await testUtils.unauthenticatedRequest('GET', '/api/health');

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    test('should handle CORS preflight requests', async () => {
      const response = await testUtils.unauthenticatedRequest('OPTIONS', '/api/auth/login')
        .set('Origin', 'https://app.floworx-iq.com')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      expect(response.status).toBe(200);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('Input Validation and Sanitization', () => {
    test('should sanitize user input to prevent XSS', async () => {
      const maliciousData = {
        email: 'test@floworx-test.com',
        password: 'SecurePassword123!',
        firstName: '<script>alert("xss")</script>',
        lastName: 'TestUser'
      };

      const response = await testUtils.unauthenticatedRequest('POST', '/api/auth/register')
        .send(maliciousData);

      if (response.status === 201) {
        expect(response.body.data.user.firstName).not.toContain('<script>');
        expect(response.body.data.user.firstName).not.toContain('alert');
      }
    });

    test('should validate required fields', async () => {
      const incompleteData = {
        email: 'test@floworx-test.com'
        // Missing password, firstName, lastName
      };

      const response = await testUtils.unauthenticatedRequest('POST', '/api/auth/register')
        .send(incompleteData);

      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error.message).toContain('required');
    });

    test('should enforce field length limits', async () => {
      const oversizedData = {
        email: 'test@floworx-test.com',
        password: 'SecurePassword123!',
        firstName: 'A'.repeat(256), // Assuming 255 char limit
        lastName: 'TestUser'
      };

      const response = await testUtils.unauthenticatedRequest('POST', '/api/auth/register')
        .send(oversizedData);

      testUtils.assertErrorResponse(response, 400);
      expect(response.body.error.message).toContain('too long');
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle concurrent login requests', async () => {
      const userData = testDataFactory.createUser();
      
      // Register user first
      await testUtils.unauthenticatedRequest('POST', '/api/auth/register')
        .send({
          email: userData.email,
          password: userData.password,
          firstName: userData.firstName,
          lastName: userData.lastName
        });

      // Simulate concurrent login requests
      const concurrentLogins = Array(10).fill().map(() =>
        testUtils.unauthenticatedRequest('POST', '/api/auth/login')
          .send({
            email: userData.email,
            password: userData.password
          })
      );

      const responses = await Promise.all(concurrentLogins);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('token');
      });
    });

    test('should maintain acceptable response times', async () => {
      const userData = testDataFactory.createUser();
      
      const startTime = Date.now();
      const response = await testUtils.authenticatedRequest('GET', '/api/auth/me', userData);
      const responseTime = Date.now() - startTime;

      testUtils.assertSuccessResponse(response, 200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });
  });
});
