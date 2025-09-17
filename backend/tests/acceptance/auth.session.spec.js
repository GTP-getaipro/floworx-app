const request = require('supertest');
const app = require('../../server');
const { databaseOperations } = require('../../database/database-operations');

describe('Auth Session Management', () => {
  let testUser;
  let testEmail = 'session.test@example.com';
  let testPassword = 'SecurePass123!';

  beforeAll(async () => {
    // Create a verified test user
    const passwordHash = await require('bcrypt').hash(testPassword, 12);

    const userData = {
      id: require('crypto').randomUUID(),
      email: testEmail.toLowerCase(),
      password_hash: passwordHash,
      first_name: 'Session',
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

  afterAll(async () => {
    // Clean up test user
    if (testUser) {
      await databaseOperations.deleteUser(testUser.id);
    }
  });

  describe('POST /api/auth/login', () => {
    it('should set session cookie and return userId on successful login', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        })
        .expect(200);

      // Check response body
      expect(response.body).toEqual({
        userId: testUser.id
      });

      // Check session cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      const sessionCookie = cookies.find(cookie => cookie.startsWith('fx_sess='));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toMatch(/HttpOnly/i);
      expect(sessionCookie).toMatch(/SameSite=lax/i);
      expect(sessionCookie).toMatch(/Path=\//);
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
      
      // Should not set cookie on failed login
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeUndefined();
    });

    it('should rate limit after 10 attempts per minute', async () => {
      const promises = [];
      
      // Make 11 rapid login attempts
      for (let i = 0; i < 11; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .send({
              email: 'ratelimit.test@example.com',
              password: 'wrongpassword'
            })
        );
      }
      
      const responses = await Promise.all(promises);
      
      // First 10 should be 401 (invalid credentials)
      for (let i = 0; i < 10; i++) {
        expect(responses[i].status).toBe(401);
      }
      
      // 11th should be 429 (rate limited)
      expect(responses[10].status).toBe(429);
      expect(responses[10].body.error.code).toBe('RATE_LIMITED');
    });
  });

  describe('GET /api/auth/me', () => {
    let sessionCookie;

    beforeEach(async () => {
      // Login to get session cookie
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      sessionCookie = cookies.find(cookie => cookie.startsWith('fx_sess='));
    });

    it('should return userId with valid session cookie', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body).toEqual({
        userId: testUser.id
      });
    });

    it('should return 401 without session cookie', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 with invalid session cookie', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', 'fx_sess=invalid.jwt.token')
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/auth/logout', () => {
    let sessionCookie;

    beforeEach(async () => {
      // Login to get session cookie
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      sessionCookie = cookies.find(cookie => cookie.startsWith('fx_sess='));
    });

    it('should clear session cookie and return 204', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', sessionCookie)
        .expect(204);

      // Check that cookie is cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      
      const clearedCookie = cookies.find(cookie => cookie.startsWith('fx_sess='));
      expect(clearedCookie).toBeDefined();
      expect(clearedCookie).toMatch(/fx_sess=;/); // Empty value
    });

    it('should make subsequent /me requests return 401', async () => {
      // Logout
      const logoutResponse = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', sessionCookie)
        .expect(204);

      // Get the cleared cookie from logout response
      const clearedCookies = logoutResponse.headers['set-cookie'];
      const clearedCookie = clearedCookies?.find(cookie => cookie.startsWith('fx_sess='));

      // Try to access /me with the cleared cookie (should fail)
      await request(app)
        .get('/api/auth/me')
        .set('Cookie', clearedCookie || 'fx_sess=')
        .expect(401);
    });
  });

  describe('Token expiration', () => {
    it('should return 401 for expired token', async () => {
      // Create a token that's already expired by manipulating the JWT directly
      const { sign } = require('../../utils/jwt');
      const expiredToken = sign({ sub: testUser.id }, -1); // Negative TTL = already expired

      // Try to access /me with expired token (should fail)
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `fx_sess=${expiredToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
