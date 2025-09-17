const request = require('supertest');
const app = require('../../server');
const { databaseOperations } = require('../../database/database-operations');
const { setTestRunId, resetAll } = require('../../test-helpers/rateLimit');

describe('Auth Refresh Token Management', () => {
  let testUser;
  let testEmail = 'refresh.test@example.com';
  let testPassword = 'SecurePass123!';
  let testRunId;

  beforeAll(async () => {
    // Set unique test run ID for all tests in this suite
    testRunId = `refresh-test-${Date.now()}-${Math.random()}`;
    setTestRunId(testRunId);

    // Reset rate limits
    await request(app)
      .post('/api/test/reset-rate-limits')
      .send({ namespace: testRunId });

    // Reset all rate limits to be safe
    resetAll();
    // Create a verified test user
    const passwordHash = await require('bcrypt').hash(testPassword, 12);
    
    const userData = {
      id: require('crypto').randomUUID(),
      email: testEmail.toLowerCase(),
      password_hash: passwordHash,
      first_name: 'Refresh',
      last_name: 'Test',
      created_at: new Date().toISOString(),
      email_verified: true
    };

    const registerResult = await databaseOperations.createUser(userData);
    
    if (registerResult.error) {
      console.error('Failed to create test user:', registerResult.error);
      throw new Error(`Failed to create test user: ${JSON.stringify(registerResult.error)}`);
    }
    
    testUser = registerResult.data;
  });

  beforeEach(async () => {
    // Reset rate limits before each test but keep same test run ID
    await request(app)
      .post('/api/test/reset-rate-limits')
      .send({ namespace: testRunId });
  });

  afterAll(async () => {
    // Clean up test user
    if (testUser) {
      await databaseOperations.deleteUser(testUser.id);
    }

    // Reset rate limits after tests
    resetAll();
  });

  describe('Login with refresh token', () => {
    it('should set both fx_sess and fx_refresh cookies on successful login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Test-Run-Id', testRunId)
        .send({
          email: testEmail,
          password: testPassword
        })
        .expect(200);

      // Check response body
      expect(response.body).toEqual({
        userId: testUser.id
      });

      // Check both cookies are set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      const sessionCookie = cookies.find(cookie => cookie.startsWith('fx_sess='));
      const refreshCookie = cookies.find(cookie => cookie.startsWith('fx_refresh='));
      
      expect(sessionCookie).toBeDefined();
      expect(refreshCookie).toBeDefined();
      
      // Verify refresh cookie properties
      expect(refreshCookie).toMatch(/HttpOnly/i);
      expect(refreshCookie).toMatch(/SameSite=lax/i);
      expect(refreshCookie).toMatch(/Path=\/api\/auth/);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let sessionCookie;
    let refreshCookie;

    beforeEach(async () => {
      // Login to get both cookies
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('X-Test-Run-Id', testRunId)
        .send({
          email: testEmail,
          password: testPassword
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      sessionCookie = cookies.find(cookie => cookie.startsWith('fx_sess='));
      refreshCookie = cookies.find(cookie => cookie.startsWith('fx_refresh='));
    });

    it('should refresh tokens and return new cookies', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', refreshCookie)
        .set('X-Test-Run-Id', testRunId)
        .expect(200);

      expect(response.body).toEqual({
        userId: testUser.id
      });

      // Check new cookies are set
      const newCookies = response.headers['set-cookie'];
      expect(newCookies).toBeDefined();
      
      const newSessionCookie = newCookies.find(cookie => cookie.startsWith('fx_sess='));
      const newRefreshCookie = newCookies.find(cookie => cookie.startsWith('fx_refresh='));
      
      expect(newSessionCookie).toBeDefined();
      expect(newRefreshCookie).toBeDefined();
      
      // Verify new access token works with /me
      await request(app)
        .get('/api/auth/me')
        .set('Cookie', newSessionCookie)
        .expect(200);
    });

    it('should return 401 without refresh cookie', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('X-Test-Run-Id', testRunId)
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 with invalid refresh cookie', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', 'fx_refresh=invalid.refresh.token')
        .set('X-Test-Run-Id', testRunId)
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should detect token reuse and return 419', async () => {
      // First refresh (should work)
      await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', refreshCookie)
        .set('X-Test-Run-Id', testRunId)
        .expect(200);

      // Second refresh with same token (should fail with reuse detection)
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', refreshCookie)
        .set('X-Test-Run-Id', testRunId)
        .expect(419);

      expect(response.body.error.code).toBe('TOKEN_REUSED');
    });

    it('should rate limit after 20 attempts per minute', async () => {
      const promises = [];

      // Make 21 rapid refresh attempts with test run ID header
      for (let i = 0; i < 21; i++) {
        promises.push(
          request(app)
            .post('/api/auth/refresh')
            .set('Cookie', 'fx_refresh=invalid.token')
            .set('X-Test-Run-Id', testRunId)
        );
      }

      const responses = await Promise.all(promises);
      
      // First 20 should be 401 (invalid token)
      for (let i = 0; i < 20; i++) {
        expect(responses[i].status).toBe(401);
      }
      
      // 21st should be 429 (rate limited)
      expect(responses[20].status).toBe(429);
      expect(responses[20].body.error.code).toBe('RATE_LIMITED');
    });
  });

  describe('Logout with refresh token', () => {
    let sessionCookie;
    let refreshCookie;

    beforeEach(async () => {
      // Login to get both cookies
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .set('X-Test-Run-Id', testRunId)
        .send({
          email: testEmail,
          password: testPassword
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      sessionCookie = cookies.find(cookie => cookie.startsWith('fx_sess='));
      refreshCookie = cookies.find(cookie => cookie.startsWith('fx_refresh='));
    });

    it('should clear both cookies and revoke refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [sessionCookie, refreshCookie].join('; '))
        .set('X-Test-Run-Id', testRunId)
        .expect(204);

      // Check that both cookies are cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      const clearedSessionCookie = cookies.find(cookie => cookie.startsWith('fx_sess='));
      const clearedRefreshCookie = cookies.find(cookie => cookie.startsWith('fx_refresh='));
      
      expect(clearedSessionCookie).toBeDefined();
      expect(clearedRefreshCookie).toBeDefined();
    });

    it('should make subsequent refresh requests return 401', async () => {
      // Logout
      await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [sessionCookie, refreshCookie].join('; '))
        .set('X-Test-Run-Id', testRunId)
        .expect(204);

      // Try to refresh with the old token (should fail)
      await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', refreshCookie)
        .set('X-Test-Run-Id', testRunId)
        .expect(401);
    });
  });
});
