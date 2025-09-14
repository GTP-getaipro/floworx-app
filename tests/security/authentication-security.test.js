/**
 * Comprehensive Authentication Security Tests
 * Tests authentication vulnerabilities, brute force protection, and security measures
 */

const request = require('supertest');
const app = require('../../backend/app');
const { query } = require('../../backend/database/unified-connection');

describe('Authentication Security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Brute Force Protection', () => {
    test('should implement progressive lockout', async () => {
      const testEmail = 'bruteforce@test.com';
      const wrongPassword = 'wrongpassword';

      // Mock user exists
      query.mockResolvedValue({
        rows: [{
          id: '123',
          email: testEmail,
          password_hash: '$2b$12$hashedpassword',
          failed_login_attempts: 0,
          account_locked_until: null
        }]
      });

      // First few attempts should work normally
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ email: testEmail, password: wrongPassword });

        expect(response.status).toBe(401);
      }

      // After threshold, should get locked out
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: wrongPassword });

      expect(response.status).toBe(423); // Locked
      expect(response.body.error.type).toBe('ACCOUNT_LOCKED');
    });

    test('should implement rate limiting on login attempts', async () => {
      const testEmail = 'ratelimit@test.com';
      const wrongPassword = 'wrongpassword';

      // Make multiple rapid requests
      const promises = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/auth/login')
          .send({ email: testEmail, password: wrongPassword })
      );

      const responses = await Promise.all(promises);
      
      // Should get rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should reset failed attempts on successful login', async () => {
      const testEmail = 'reset@test.com';
      const correctPassword = 'correctpassword';

      // Mock successful login
      query.mockResolvedValue({
        rows: [{
          id: '123',
          email: testEmail,
          password_hash: '$2b$12$hashedpassword',
          failed_login_attempts: 3,
          account_locked_until: null
        }]
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: correctPassword });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });
  });

  describe('JWT Security', () => {
    test('should reject expired tokens', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMX0.invalid';

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.type).toBe('TOKEN_EXPIRED');
    });

    test('should reject malformed tokens', async () => {
      const malformedToken = 'invalid.token.format';

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${malformedToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.type).toBe('INVALID_TOKEN');
    });

    test('should reject tokens with invalid signature', async () => {
      const invalidSignatureToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJpYXQiOjE2MDAwMDAwMDB9.invalid_signature';

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${invalidSignatureToken}`);

      expect(response.status).toBe(401);
      expect(response.body.error.type).toBe('INVALID_TOKEN');
    });

    test('should require Bearer prefix in Authorization header', async () => {
      const validToken = 'valid.jwt.token';

      const response = await request(app)
        .get('/api/user/profile')
        .set('Authorization', validToken); // Missing 'Bearer ' prefix

      expect(response.status).toBe(401);
      expect(response.body.error.type).toBe('INVALID_TOKEN_FORMAT');
    });
  });

  describe('Password Security', () => {
    test('should enforce password complexity requirements', async () => {
      const weakPasswords = [
        '123',           // Too short
        'password',      // Too common
        '12345678',      // Only numbers
        'abcdefgh',      // Only letters
        'Password',      // No numbers/special chars
        'PASSWORD123'    // No lowercase
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            firstName: 'Test',
            lastName: 'User',
            email: `test${Date.now()}@example.com`,
            password: weakPassword
          });

        expect(response.status).toBe(400);
        expect(response.body.error.type).toBe('PASSWORD_WEAK');
      }
    });

    test('should hash passwords with bcrypt', async () => {
      const testPassword = 'SecurePassword123!';
      
      // Mock successful registration
      query.mockResolvedValue({
        rows: [{
          id: '123',
          email: 'test@example.com',
          password_hash: '$2b$12$hashedpassword'
        }]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: testPassword
        });

      expect(response.status).toBe(201);
      
      // Verify password was hashed (not stored in plain text)
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          expect.not.stringMatching(testPassword) // Password should be hashed
        ])
      );
    });

    test('should prevent password reuse', async () => {
      const userId = '123';
      const oldPassword = 'OldPassword123!';
      const newPassword = 'NewPassword123!';

      // Mock password history check
      query.mockResolvedValue({
        rows: [{ password_hash: '$2b$12$oldhashedpassword' }]
      });

      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer valid.jwt.token`)
        .send({
          currentPassword: oldPassword,
          newPassword: newPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.error.type).toBe('PASSWORD_REUSE');
    });
  });

  describe('Session Security', () => {
    test('should implement secure session management', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'SecurePassword123!'
        });

      expect(response.status).toBe(200);
      
      const token = response.body.token;
      expect(token).toBeDefined();
      
      // Token should not contain sensitive information
      const decodedToken = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      expect(decodedToken).not.toHaveProperty('password');
      expect(decodedToken).not.toHaveProperty('passwordHash');
    });

    test('should invalidate sessions on logout', async () => {
      const token = 'valid.jwt.token';

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Logged out successfully');

      // Subsequent requests with same token should fail
      const protectedResponse = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(protectedResponse.status).toBe(401);
    });

    test('should handle concurrent sessions', async () => {
      const email = 'concurrent@test.com';
      const password = 'SecurePassword123!';

      // Mock successful login
      query.mockResolvedValue({
        rows: [{
          id: '123',
          email: email,
          password_hash: '$2b$12$hashedpassword'
        }]
      });

      // Create multiple sessions
      const sessions = await Promise.all([
        request(app).post('/api/auth/login').send({ email, password }),
        request(app).post('/api/auth/login').send({ email, password }),
        request(app).post('/api/auth/login').send({ email, password })
      ]);

      // All sessions should be valid
      sessions.forEach(session => {
        expect(session.status).toBe(200);
        expect(session.body.token).toBeDefined();
      });
    });
  });

  describe('Input Validation Security', () => {
    test('should prevent SQL injection in login', async () => {
      const sqlInjectionEmail = "admin@test.com'; DROP TABLE users; --";
      const sqlInjectionPassword = "password'; DROP TABLE users; --";

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: sqlInjectionEmail,
          password: sqlInjectionPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.error.type).toBe('INVALID_INPUT');
    });

    test('should prevent XSS in authentication forms', async () => {
      const xssPayload = '<script>alert("XSS")</script>';

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: xssPayload,
          lastName: 'User',
          email: 'test@example.com',
          password: 'SecurePassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.type).toBe('INVALID_INPUT');
    });

    test('should sanitize authentication inputs', async () => {
      const maliciousInput = {
        firstName: 'Test<script>alert("XSS")</script>',
        lastName: 'User<img src=x onerror=alert("XSS")>',
        email: 'test@example.com',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(maliciousInput);

      // Should sanitize and accept the input
      expect(response.status).toBe(201);
      
      // Verify sanitized data was stored
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          'Test', // Sanitized firstName
          'User'  // Sanitized lastName
        ])
      );
    });
  });

  describe('Account Recovery Security', () => {
    test('should implement secure password reset', async () => {
      const email = 'reset@test.com';

      const response = await request(app)
        .post('/api/password-reset/request')
        .send({ email });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password reset email sent');

      // Verify reset token was generated securely
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO password_reset_tokens'),
        expect.arrayContaining([
          expect.stringMatching(/^[a-f0-9]{64}$/) // 64-character hex token
        ])
      );
    });

    test('should limit password reset attempts', async () => {
      const email = 'limit@test.com';

      // Make multiple reset requests
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .post('/api/password-reset/request')
          .send({ email })
      );

      const responses = await Promise.all(promises);
      
      // Should get rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should expire password reset tokens', async () => {
      const expiredToken = 'expired-reset-token';

      // Mock expired token
      query.mockResolvedValue({
        rows: [{
          token: expiredToken,
          expires_at: new Date(Date.now() - 3600000), // 1 hour ago
          used: false
        }]
      });

      const response = await request(app)
        .post('/api/password-reset/reset')
        .send({
          token: expiredToken,
          newPassword: 'NewSecurePassword123!'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.type).toBe('TOKEN_EXPIRED');
    });
  });

  describe('OAuth Security', () => {
    test('should validate OAuth state parameter', async () => {
      const response = await request(app)
        .get('/api/oauth/google')
        .query({ state: 'invalid-state' });

      expect(response.status).toBe(400);
      expect(response.body.error.type).toBe('INVALID_STATE');
    });

    test('should handle OAuth callback securely', async () => {
      const maliciousCallback = {
        code: 'malicious-code',
        state: 'valid-state'
      };

      const response = await request(app)
        .get('/api/oauth/google/callback')
        .query(maliciousCallback);

      expect(response.status).toBe(400);
      expect(response.body.error.type).toBe('OAUTH_ERROR');
    });

    test('should encrypt OAuth tokens', async () => {
      const oauthToken = 'oauth-access-token';

      // Mock successful OAuth flow
      query.mockResolvedValue({
        rows: [{
          id: '123',
          encrypted_token: 'encrypted-oauth-token'
        }]
      });

      const response = await request(app)
        .get('/api/oauth/google/callback')
        .query({
          code: 'valid-code',
          state: 'valid-state'
        });

      expect(response.status).toBe(200);
      
      // Verify token was encrypted before storage
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO oauth_tokens'),
        expect.arrayContaining([
          expect.not.stringMatching(oauthToken) // Should be encrypted
        ])
      );
    });
  });
});
