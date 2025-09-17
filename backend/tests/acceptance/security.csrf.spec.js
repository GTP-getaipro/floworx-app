const request = require('supertest');
const app = require('../../app');

describe('CSRF Protection', () => {
  let testUser;
  let sessionCookie;
  let csrfToken;
  let csrfCookie;

  beforeAll(async () => {
    // Create a test user with unique email
    const uniqueEmail = `csrf-test-${Date.now()}@example.com`;

    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        email: uniqueEmail,
        password: 'TestPassword123!',
        firstName: 'CSRF',
        lastName: 'Test'
      });

    expect(registerResponse.status).toBe(201);

    // Mark user as verified for testing
    await request(app)
      .post('/api/test/mark-verified')
      .send({ email: uniqueEmail });

    // Login to get session cookie
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: uniqueEmail,
        password: 'TestPassword123!'
      });

    expect(loginResponse.status).toBe(200);

    // Extract session cookie
    const cookies = loginResponse.headers['set-cookie'];
    sessionCookie = cookies?.find(cookie => cookie.startsWith('fx_sess='));
    expect(sessionCookie).toBeDefined();
  });

  beforeEach(async () => {
    // Get fresh CSRF token for each test
    const csrfResponse = await request(app)
      .get('/api/auth/csrf');

    expect(csrfResponse.status).toBe(200);
    expect(csrfResponse.body.csrf).toBeDefined();
    
    csrfToken = csrfResponse.body.csrf;
    
    // Extract CSRF cookie
    const cookies = csrfResponse.headers['set-cookie'];
    csrfCookie = cookies.find(cookie => cookie.startsWith('fx_csrf='));
    expect(csrfCookie).toBeDefined();
  });

  describe('GET /api/auth/csrf', () => {
    it('should return 200 and set fx_csrf cookie + body.csrf', async () => {
      const response = await request(app)
        .get('/api/auth/csrf');

      expect(response.status).toBe(200);
      expect(response.body.csrf).toBeDefined();
      expect(typeof response.body.csrf).toBe('string');
      expect(response.body.csrf.length).toBeGreaterThan(0);

      // Check cookie is set
      const cookies = response.headers['set-cookie'];
      const csrfCookie = cookies.find(cookie => cookie.startsWith('fx_csrf='));
      expect(csrfCookie).toBeDefined();
      expect(csrfCookie).toContain('SameSite=Lax');
    });
  });

  describe('CSRF Token Validation', () => {
    it('should reject POST to protected route WITHOUT token', async () => {
      expect(sessionCookie).toBeDefined();

      const response = await request(app)
        .post('/api/test/echo')
        .set('Cookie', sessionCookie)
        .send({ message: 'test' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('CSRF_FORBIDDEN');
      expect(response.body.error.message).toBe('Missing or invalid CSRF token');
    });

    it('should reject POST WITH mismatched token/cookie', async () => {
      const response = await request(app)
        .post('/api/test/echo')
        .set('Cookie', `${sessionCookie}; ${csrfCookie}`)
        .set('x-csrf-token', 'wrong-token')
        .send({ message: 'test' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('CSRF_FORBIDDEN');
      expect(response.body.error.message).toBe('Missing or invalid CSRF token');
    });

    it('should accept POST WITH matching cookie+header', async () => {
      const response = await request(app)
        .post('/api/test/echo')
        .set('Cookie', `${sessionCookie}; ${csrfCookie}`)
        .set('x-csrf-token', csrfToken)
        .send({ message: 'test' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Echo successful');
    });
  });

  describe('Origin/Referer Validation', () => {
    it('should reject request with disallowed Origin', async () => {
      const response = await request(app)
        .post('/api/test/echo')
        .set('Cookie', `${sessionCookie}; ${csrfCookie}`)
        .set('x-csrf-token', csrfToken)
        .set('Origin', 'https://evil.example')
        .send({ message: 'test' });

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('CSRF_FORBIDDEN');
      expect(response.body.error.message).toBe('Origin not allowed');
    });

    it('should accept request with allowed Origin', async () => {
      const response = await request(app)
        .post('/api/test/echo')
        .set('Cookie', `${sessionCookie}; ${csrfCookie}`)
        .set('x-csrf-token', csrfToken)
        .set('Origin', 'http://localhost:3000')
        .send({ message: 'test' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('Safe Methods', () => {
    it('should allow GET requests without CSRF token', async () => {
      expect(sessionCookie).toBeDefined();

      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', sessionCookie);

      expect(response.status).toBe(200);
    });

    it('should allow HEAD requests without CSRF token', async () => {
      expect(sessionCookie).toBeDefined();

      const response = await request(app)
        .head('/api/auth/me')
        .set('Cookie', sessionCookie);

      expect(response.status).toBe(200);
    });

    it('should allow OPTIONS requests without CSRF token', async () => {
      const response = await request(app)
        .options('/api/auth/me');

      // OPTIONS requests typically return 204 No Content
      expect([200, 204]).toContain(response.status);
    });
  });

  describe('Health Checks', () => {
    it('should allow health check without CSRF token', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
    });
  });
});
