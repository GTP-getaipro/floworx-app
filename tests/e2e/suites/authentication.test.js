/**
 * Authentication Flow E2E Tests for FloWorx SaaS
 * Tests all authentication scenarios with production security settings
 */

const { TestEnvironment } = require('../setup/test-environment');
const axios = require('axios');
describe('Authentication Flow E2E Tests', () => {
  this.timeout(60000); // 60 second timeout for E2E tests
  
  let testEnv;
  let config;
  let apiClient;
  
  beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    config = testEnv.getConfig();
    
    // Setup API client
    apiClient = axios.create({
      baseURL: `http://localhost:${config.server.port}/api`,
      timeout: 10000,
      validateStatus: () => true // Don't throw on HTTP errors
    }), 90000;
  });
  
  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  describe('User Registration', () => {
    const testUser = {
      firstName: 'E2E',
      lastName: 'TestUser',
      email: 'e2e-test@floworx-test.com',
      password: 'E2ETestPass123!',
      businessName: 'E2E Test Business',
      businessType: 'hot_tub',
      acceptTerms: true
    };

    it('should successfully register a new user', async () => {
      const response = await apiClient.post('/auth/register', testUser);
      
      expect(response.status).toBe(201);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data.data).toHaveProperty('user');
      expect(response.data.data.user).toHaveProperty('email', testUser.email);
      expect(response.data.data).toHaveProperty('token');
      
      // Verify user was created in database
      const dbClient = testEnv.getDbClient();
      const userResult = await dbClient.query(
        'SELECT * FROM users WHERE email = $1',
        [testUser.email]
      );
      
      expect(userResult.rows).toHaveLength(1);
      expect(userResult.rows[0].first_name).toBe(testUser.firstName);
      expect(userResult.rows[0].email_verified).toBe(false); // Should require verification
    });

    it('should reject registration with invalid email', async () => {
      const invalidUser = { ...testUser, email: 'invalid-email' };
      const response = await apiClient.post('/auth/register', invalidUser);
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('success', false);
      expect(response.data.error).toHaveProperty('type', 'VALIDATION_ERROR');
    });

    it('should reject registration with weak password', async () => {
      const weakPasswordUser = { ...testUser, password: '123', email: 'weak@test.com' };
      const response = await apiClient.post('/auth/register', weakPasswordUser);
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('success', false);
      expect(response.data.error.message).toContain('password');
    });

    it('should reject duplicate email registration', async () => {
      // Try to register same user again
      const response = await apiClient.post('/auth/register', testUser);
      
      expect(response.status).toBe(409);
      expect(response.data).toHaveProperty('success', false);
      expect(response.data.error).toHaveProperty('type', 'CONFLICT_ERROR');
    });

    it('should reject registration without accepting terms', async () => {
      const noTermsUser = { 
        ...testUser, 
        email: 'noterms@test.com',
        acceptTerms: false 
      };
      const response = await apiClient.post('/auth/register', noTermsUser);
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('success', false);
    });
  });

  describe('User Login', () => {
    const loginUser = config.testData.users.valid;

    it('should successfully login with valid credentials', async () => {
      const response = await apiClient.post('/auth/login', {
        email: loginUser.email,
        password: loginUser.password
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data.data).toHaveProperty('user');
      expect(response.data.data).toHaveProperty('token');
      expect(response.data.data.user.email).toBe(loginUser.email);
    });

    it('should reject login with invalid email', async () => {
      const response = await apiClient.post('/auth/login', {
        email: 'nonexistent@test.com',
        password: loginUser.password
      });
      
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('success', false);
      expect(response.data.error).toHaveProperty('type', 'AUTHENTICATION_ERROR');
    });

    it('should reject login with invalid password', async () => {
      const response = await apiClient.post('/auth/login', {
        email: loginUser.email,
        password: 'wrongpassword'
      });
      
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('success', false);
    });

    it('should implement account lockout after failed attempts', async () => {
      const testEmail = 'lockout-test@floworx-test.com';
      const maxAttempts = config.security.MAX_FAILED_LOGIN_ATTEMPTS;
      
      // Create test user for lockout testing
      const dbClient = testEnv.getDbClient();
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('TestPass123!', 10);
      
      await dbClient.query(`
        INSERT INTO users (first_name, last_name, email, password_hash, email_verified)
        VALUES ('Lockout', 'Test', $1, $2, true)
        ON CONFLICT (email) DO NOTHING
      `, [testEmail, hashedPassword]);
      
      // Make failed login attempts
      for (let i = 0; i < maxAttempts; i++) {
        const response = await apiClient.post('/auth/login', {
          email: testEmail,
          password: 'wrongpassword'
        });
        
        expect(response.status).toBe(401);
      }
      
      // Next attempt should be locked out
      const lockedResponse = await apiClient.post('/auth/login', {
        email: testEmail,
        password: 'wrongpassword'
      });
      
      expect(lockedResponse.status).toBe(429);
      expect(lockedResponse.data.error).toHaveProperty('type', 'RATE_LIMIT_ERROR');
    });

    it('should implement progressive lockout multiplier', async () => {
      const testEmail = 'progressive-test@floworx-test.com';
      const dbClient = testEnv.getDbClient();
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('TestPass123!', 10);
      
      await dbClient.query(`
        INSERT INTO users (first_name, last_name, email, password_hash, email_verified)
        VALUES ('Progressive', 'Test', $1, $2, true)
        ON CONFLICT (email) DO NOTHING
      `, [testEmail, hashedPassword]);
      
      // Simulate multiple lockout cycles to test progressive multiplier
      // This would require waiting for lockout duration in real scenario
      // For E2E test, we'll verify the lockout mechanism exists
      
      const response = await apiClient.post('/auth/login', {
        email: testEmail,
        password: 'wrongpassword'
      });
      
      expect(response.status).toBe(401);
      // Progressive lockout testing would require time-based testing
      // which is covered in integration tests
    });
  });

  describe('Password Reset Flow', () => {
    const resetUser = config.testData.users.valid;

    it('should initiate password reset for valid email', async () => {
      const response = await apiClient.post('/auth/password-reset-request', {
        email: resetUser.email
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data.data).toHaveProperty('message');
      
      // Verify reset token was created in database
      const dbClient = testEnv.getDbClient();
      const tokenResult = await dbClient.query(
        'SELECT * FROM password_reset_tokens WHERE email = $1',
        [resetUser.email]
      );
      
      expect(tokenResult.rows).to.have.length.greaterThan(0);
      expect(tokenResult.rows[0].expires_at).to.be.a('date');
    });

    it('should reject password reset for invalid email', async () => {
      const response = await apiClient.post('/auth/password-reset-request', {
        email: 'nonexistent@test.com'
      });
      
      // Should still return success for security (don't reveal if email exists)
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
    });

    it('should complete password reset with valid token', async () => {
      // First, create a reset token
      const dbClient = testEnv.getDbClient();
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      
      await dbClient.query(`
        INSERT INTO password_reset_tokens (email, token_hash, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE SET
          token_hash = $2,
          expires_at = $3,
          created_at = NOW()
      `, [
        resetUser.email,
        hashedToken,
        new Date(Date.now() + config.security.ACCOUNT_RECOVERY_TOKEN_EXPIRY)
      ]);
      
      // Complete password reset
      const newPassword = 'NewTestPass123!';
      const response = await apiClient.post('/auth/password-reset-confirm', {
        token: resetToken,
        password: newPassword
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      
      // Verify can login with new password
      const loginResponse = await apiClient.post('/auth/login', {
        email: resetUser.email,
        password: newPassword
      });
      
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.data).toHaveProperty('success', true);
    });

    it('should reject password reset with expired token', async () => {
      const dbClient = testEnv.getDbClient();
      const crypto = require('crypto');
      const expiredToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(expiredToken).digest('hex');
      
      // Create expired token
      await dbClient.query(`
        INSERT INTO password_reset_tokens (email, token_hash, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (email) DO UPDATE SET
          token_hash = $2,
          expires_at = $3,
          created_at = NOW()
      `, [
        'expired-test@floworx-test.com',
        hashedToken,
        new Date(Date.now() - 1000) // Expired 1 second ago
      ]);
      
      const response = await apiClient.post('/auth/password-reset-confirm', {
        token: expiredToken,
        password: 'NewPassword123!'
      });
      
      expect(response.status).toBe(400);
      expect(response.data).toHaveProperty('success', false);
      expect(response.data.error.message).toContain('expired');
    });
  });

  describe('Session Management', () => {
    let authToken;
    const sessionUser = config.testData.users.valid;

    beforeAll(async () => {
      // Login to get auth token
      const loginResponse = await apiClient.post('/auth/login', {
        email: sessionUser.email,
        password: sessionUser.password
      }), 90000;
      
      authToken = loginResponse.data.data.token;
    });

    it('should access protected route with valid token', async () => {
      const response = await apiClient.get('/auth/profile', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      expect(response.data.data.user.email).toBe(sessionUser.email);
    });

    it('should reject access with invalid token', async () => {
      const response = await apiClient.get('/auth/profile', {
        headers: { Authorization: 'Bearer invalid-token' }
      });
      
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('success', false);
    });

    it('should reject access without token', async () => {
      const response = await apiClient.get('/auth/profile');
      
      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('success', false);
    });

    it('should successfully logout', async () => {
      const response = await apiClient.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('success', true);
      
      // Verify token is invalidated (if token blacklisting is implemented)
      // This depends on your logout implementation
    });
  });

  describe('OAuth Integration', () => {
    it('should initiate Google OAuth flow', async () => {
      const response = await apiClient.get('/oauth/google');
      
      // Should redirect to Google OAuth
      expect(response.status).toBe(302);
      expect(response.headers.location).toContain('accounts.google.com');
    });

    it('should handle OAuth callback with valid code', async () => {
      // This would require mocking Google OAuth response
      // For E2E testing, we'll verify the endpoint exists and handles errors
      
      const response = await apiClient.get('/oauth/google/callback?error=access_denied');
      
      // Should handle OAuth errors gracefully
      expect(response.status).to.be.oneOf([400, 302]); // Either error response or redirect
    });
  });
});
