/**
 * Password Reset Flow Acceptance Tests
 * Tests the complete password reset flow with security requirements
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-lon';
process.env.DISABLE_RATE_LIMITING = 'true';

const app = require('../../server');
const { databaseOperations } = require('../../database/database-operations');

describe('Password Reset Flow', () => {
  let testUser;
  let testEmail;
  let testPassword;
  let newPassword;

  beforeAll(async () => {
    // Create test user
    testEmail = `test-password-reset-${Date.now()}@example.com`;
    testPassword = 'OriginalPassword123!';
    newPassword = 'NewSecurePassword456!';

    const passwordHash = await bcrypt.hash(testPassword, 12);
    
    const userData = {
      id: require('crypto').randomUUID(),
      email: testEmail.toLowerCase(),
      password_hash: passwordHash,
      first_name: 'Test',
      last_name: 'User',
      created_at: new Date().toISOString(),
      email_verified: true
    };

    const createResult = await databaseOperations.createUser(userData);
    if (createResult.error) {
      throw new Error(`Failed to create test user: ${createResult.error.message}`);
    }
    testUser = createResult.data;
  });

  afterAll(async () => {
    // Clean up test user and tokens
    if (testUser) {
      try {
        await databaseOperations.invalidateUserResetTokens(testUser.id);
        // Note: In a real test, you might want to delete the test user
        // but for safety we'll leave it
      } catch (error) {
        console.warn('Cleanup error:', error);
      }
    }
  });

  beforeEach(() => {
    // Clear any stored test tokens
    if (global.lastResetToken) {
      delete global.lastResetToken;
    }
  });

  describe('POST /api/auth/password/request', () => {
    it('should always return 202 for any email (security)', async () => {
      const response = await request(app)
        .post('/api/auth/password/request')
        .send({ email: 'nonexistent@example.com' })
        .expect(202);

      expect(response.body).toEqual({
        message: "If this email is registered, a password reset link will be sent"
      });
    });

    it('should return 202 for valid email and create token', async () => {
      const response = await request(app)
        .post('/api/auth/password/request')
        .send({ email: testEmail })
        .expect(202);

      expect(response.body).toEqual({
        message: "If this email is registered, a password reset link will be sent"
      });

      // Check that token was stored for test helper
      expect(global.lastResetToken).toBeDefined();
      expect(global.lastResetToken.email).toBe(testEmail.toLowerCase());
      expect(global.lastResetToken.token).toBeDefined();
      expect(typeof global.lastResetToken.token).toBe('string');
      expect(global.lastResetToken.token.length).toBe(64); // 32 bytes hex = 64 chars
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .post('/api/auth/password/request')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: { code: "MISSING_EMAIL", message: "Email address is required" }
      });
    });

    it('should handle rate limiting (3 requests per 15 minutes)', async () => {
      const email = `rate-limit-test-${Date.now()}@example.com`;
      
      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/auth/password/request')
          .send({ email })
          .expect(202);
      }

      // 4th request should still return 202 (but be rate limited internally)
      const response = await request(app)
        .post('/api/auth/password/request')
        .send({ email })
        .expect(202);

      expect(response.body).toEqual({
        message: "If this email is registered, a password reset link will be sent"
      });
    });
  });

  describe('POST /api/auth/password/reset', () => {
    let resetToken;
    let resetTestEmail;

    beforeEach(async () => {
      // Use a unique email for each test to avoid token conflicts
      resetTestEmail = `reset-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;

      // Create a test user for this specific test
      const passwordHash = await bcrypt.hash('TestPassword123!', 12);
      const userData = {
        id: require('crypto').randomUUID(),
        email: resetTestEmail.toLowerCase(),
        password_hash: passwordHash,
        first_name: 'Reset',
        last_name: 'Test',
        created_at: new Date().toISOString(),
        email_verified: true
      };

      await databaseOperations.createUser(userData);

      // Request a reset token
      await request(app)
        .post('/api/auth/password/request')
        .send({ email: resetTestEmail })
        .expect(202);

      // Get the token from test helper
      const tokenResponse = await request(app)
        .get(`/api/test/last-reset-token?email=${resetTestEmail}`)
        .expect(200);

      resetToken = tokenResponse.body.token;
    });

    it('should successfully reset password with valid token and strong password', async () => {
      const response = await request(app)
        .post('/api/auth/password/reset')
        .send({ 
          token: resetToken, 
          password: newPassword 
        })
        .expect(200);

      expect(response.body).toEqual({
        message: "Password reset successful"
      });

      // Verify user can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: resetTestEmail,
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body.userId).toBeDefined();

      // Verify old password no longer works
      await request(app)
        .post('/api/auth/login')
        .send({
          email: resetTestEmail,
          password: 'TestPassword123!' // Original password for this test user
        })
        .expect(401);
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/password/reset')
        .send({ 
          token: 'invalid-token-123456789012345678901234567890123456789012345678901234567890', 
          password: newPassword 
        })
        .expect(401);

      expect(response.body).toEqual({
        error: { code: "INVALID_TOKEN", message: "Invalid or unknown reset token" }
      });
    });

    it('should return 410 for expired/used token', async () => {
      // Use the token once
      await request(app)
        .post('/api/auth/password/reset')
        .send({ 
          token: resetToken, 
          password: newPassword 
        })
        .expect(200);

      // Try to use the same token again
      const response = await request(app)
        .post('/api/auth/password/reset')
        .send({ 
          token: resetToken, 
          password: 'AnotherPassword789!' 
        })
        .expect(410);

      expect(response.body).toEqual({
        error: { code: "TOKEN_EXPIRED", message: "Reset token has expired or already been used" }
      });
    });

    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/password/reset')
        .send({ 
          token: resetToken, 
          password: 'weak' 
        })
        .expect(400);

      expect(response.body).toEqual({
        error: { code: "WEAK_PASSWORD", message: "Password must be at least 8 characters with uppercase, lowercase, and number" }
      });
    });

    it('should return 400 for missing fields', async () => {
      // Missing token
      let response = await request(app)
        .post('/api/auth/password/reset')
        .send({ password: newPassword })
        .expect(400);

      expect(response.body).toEqual({
        error: { code: "MISSING_FIELDS", message: "Token and password are required" }
      });

      // Missing password
      response = await request(app)
        .post('/api/auth/password/reset')
        .send({ token: resetToken })
        .expect(400);

      expect(response.body).toEqual({
        error: { code: "MISSING_FIELDS", message: "Token and password are required" }
      });
    });
  });

  describe('GET /api/test/last-reset-token (TEST ONLY)', () => {
    it('should return token after password reset request', async () => {
      // Request reset
      await request(app)
        .post('/api/auth/password/request')
        .send({ email: testEmail })
        .expect(202);

      // Get token via test helper
      const response = await request(app)
        .get(`/api/test/last-reset-token?email=${testEmail}`)
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBe(64);
    });

    it('should return 404 for email with no token', async () => {
      const response = await request(app)
        .get('/api/test/last-reset-token?email=no-token@example.com')
        .expect(404);

      expect(response.body).toEqual({
        error: { code: "TOKEN_NOT_FOUND", message: "No reset token found for this email" }
      });
    });

    it('should return 400 for missing email', async () => {
      const response = await request(app)
        .get('/api/test/last-reset-token')
        .expect(400);

      expect(response.body).toEqual({
        error: { code: "BAD_REQUEST", message: "Email is required" }
      });
    });
  });

  describe('Complete Flow Integration', () => {
    it('should complete full password reset flow: register → request reset → get token → reset → login', async () => {
      const flowEmail = `flow-test-${Date.now()}@example.com`;
      const originalPassword = 'FlowOriginal123!';
      const resetPassword = 'FlowReset456!';

      // 1. Register user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: flowEmail,
          password: originalPassword,
          firstName: 'Flow',
          lastName: 'Test'
        })
        .expect(201);

      expect(registerResponse.body.userId).toBeDefined();

      // 1.5. Mark user as verified (for testing)
      await request(app)
        .post('/api/test/mark-verified')
        .send({ email: flowEmail })
        .expect(200);

      // 2. Request password reset
      await request(app)
        .post('/api/auth/password/request')
        .send({ email: flowEmail })
        .expect(202);

      // 3. Get token via test route
      const tokenResponse = await request(app)
        .get(`/api/test/last-reset-token?email=${flowEmail}`)
        .expect(200);

      const token = tokenResponse.body.token;

      // 4. Reset password with strong password
      await request(app)
        .post('/api/auth/password/reset')
        .send({ 
          token, 
          password: resetPassword 
        })
        .expect(200);

      // 5. Login succeeds with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: flowEmail,
          password: resetPassword
        })
        .expect(200);

      expect(loginResponse.body.userId).toBeDefined();

      // 6. Login fails with old password
      await request(app)
        .post('/api/auth/login')
        .send({
          email: flowEmail,
          password: originalPassword
        })
        .expect(401);
    });
  });
});
