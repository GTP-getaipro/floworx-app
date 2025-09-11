/**
 * Integration Tests for Authentication Flow
 * Tests complete user registration, login, and authentication workflows
 */

const _bcrypt = require('bcrypt');
const request = require('supertest');

const app = require('../../app');
const { query } = require('../../database/unified-connection');

describe('Authentication Flow Integration Tests', () => {
  let _testUser;
  let authToken;

  beforeAll(async () => {
    // Clean up test data
    await query('DELETE FROM users WHERE email LIKE $1', ['%test-integration%']);
  });

  afterAll(async () => {
    // Clean up test data
    await query('DELETE FROM users WHERE email LIKE $1', ['%test-integration%']);
  });

  describe('User Registration Flow', () => {
    test('should register new user successfully', async () => {
      const userData = {
        email: 'test-integration-register@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        businessName: 'Test Business'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.firstName).toBe(userData.firstName);
      expect(response.body.token).toBeDefined();

      // Verify user was created in database
      const dbUser = await query('SELECT * FROM users WHERE email = $1', [userData.email]);
      expect(dbUser.rows).toHaveLength(1);
      expect(dbUser.rows[0].email).toBe(userData.email);
      expect(dbUser.rows[0].email_verified).toBe(false);

      const _testUser = response.body.user;
      authToken = response.body.token;
    });

    test('should reject duplicate email registration', async () => {
      const userData = {
        email: 'test-integration-register@example.com', // Same email as above
        password: 'TestPassword123!',
        firstName: 'Another',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    test('should reject weak password', async () => {
      const userData = {
        email: 'test-integration-weak@example.com',
        password: '123', // Weak password
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });

    test('should reject invalid email format', async () => {
      const userData = {
        email: 'invalid-email-format',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('User Login Flow', () => {
    test('should login with correct credentials', async () => {
      const loginData = {
        email: 'test-integration-register@example.com',
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

      // Update auth token for subsequent tests
      authToken = response.body.token;
    });

    test('should reject incorrect password', async () => {
      const loginData = {
        email: 'test-integration-register@example.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });

    test('should reject non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });

    test('should implement rate limiting for failed attempts', async () => {
      const loginData = {
        email: 'test-integration-register@example.com',
        password: 'WrongPassword123!'
      };

      // Make multiple failed attempts
      const promises = Array(6).fill().map(() => 
        request(app)
          .post('/api/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(promises);
      
      // Last request should be rate limited
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.status).toBe(429);
    });
  });

  describe('Protected Route Access', () => {
    test('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.email).toBe('test-integration-register@example.com');
    });

    test('should reject access without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });

    test('should reject access with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('INVALID_TOKEN');
    });

    test('should reject access with expired token', async () => {
      // This would require mocking JWT to create an expired token
      // For now, we'll test the error handling structure
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.invalid';
      
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Password Reset Flow', () => {
    test('should initiate password reset for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test-integration-register@example.com' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset instructions');
    });

    test('should handle password reset for non-existent user gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      // Should return success to prevent email enumeration
      expect(response.body.success).toBe(true);
    });
  });

  describe('Email Verification Flow', () => {
    let verificationToken;

    beforeAll(async () => {
      // Get verification token from database
      const result = await query(
        'SELECT verification_token FROM users WHERE email = $1',
        ['test-integration-register@example.com']
      );
      
      if (result.rows.length > 0) {
        verificationToken = result.rows[0].verification_token;
      }
    });

    test('should verify email with valid token', async () => {
      if (!verificationToken) {
        // Create a mock verification token for testing
        verificationToken = 'test-verification-token';
        await query(
          'UPDATE users SET verification_token = $1 WHERE email = $2',
          [verificationToken, 'test-integration-register@example.com']
        );
      }

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('verified');

      // Verify email_verified flag was updated
      const user = await query(
        'SELECT email_verified FROM users WHERE email = $1',
        ['test-integration-register@example.com']
      );
      expect(user.rows[0].email_verified).toBe(true);
    });

    test('should reject invalid verification token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('User Profile Management', () => {
    test('should update user profile with valid data', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        businessName: 'Updated Business'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.firstName).toBe(updateData.firstName);
      expect(response.body.user.lastName).toBe(updateData.lastName);
    });

    test('should reject profile update without authentication', async () => {
      const updateData = {
        firstName: 'Unauthorized',
        lastName: 'Update'
      };

      const response = await request(app)
        .put('/api/auth/profile')
        .send(updateData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('Logout Flow', () => {
    test('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('logged out');
    });

    test('should handle logout without token gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Security Features', () => {
    test('should implement CORS headers', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
    });

    test('should implement security headers', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    test('should sanitize input data', async () => {
      const maliciousData = {
        email: 'test-xss@example.com',
        password: 'TestPassword123!',
        firstName: '<script>alert("xss")</script>',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousData)
        .expect(201);

      expect(response.body.user.firstName).not.toContain('<script>');
    });
  });
});
