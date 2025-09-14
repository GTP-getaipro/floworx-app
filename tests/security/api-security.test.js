/**
 * API Security Tests
 * Tests API endpoint security, input validation, and attack prevention
 */

const request = require('supertest');
const app = require('../../backend/app');

describe('API Security', () => {
  describe('CORS Security', () => {
    test('should reject requests from unauthorized origins', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://malicious-site.com');

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('CORS');
    });

    test('should allow requests from authorized origins', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('Origin', 'https://app.floworx-iq.com');

      expect(response.status).toBe(200);
    });

    test('should handle preflight requests correctly', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'https://app.floworx-iq.com')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://app.floworx-iq.com');
    });
  });

  describe('Rate Limiting', () => {
    test('should implement rate limiting on API endpoints', async () => {
      const promises = Array.from({ length: 100 }, () =>
        request(app).get('/api/health')
      );

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should have different rate limits for different endpoints', async () => {
      // Test auth endpoints (should have stricter limits)
      const authPromises = Array.from({ length: 10 }, () =>
        request(app).post('/api/auth/login').send({ email: 'test@test.com', password: 'wrong' })
      );

      const authResponses = await Promise.all(authPromises);
      const authRateLimited = authResponses.filter(r => r.status === 429);

      // Test health endpoint (should have more lenient limits)
      const healthPromises = Array.from({ length: 50 }, () =>
        request(app).get('/api/health')
      );

      const healthResponses = await Promise.all(healthPromises);
      const healthRateLimited = healthResponses.filter(r => r.status === 429);

      expect(authRateLimited.length).toBeGreaterThan(healthRateLimited.length);
    });

    test('should include rate limit headers in responses', async () => {
      const response = await request(app).get('/api/health');

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Input Validation', () => {
    test('should prevent SQL injection attacks', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "' UNION SELECT * FROM users --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'password'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.type).toBe('INVALID_INPUT');
      }
    });

    test('should prevent XSS attacks', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
        '"><script>alert("XSS")</script>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            firstName: payload,
            lastName: 'User',
            email: 'test@example.com',
            password: 'SecurePassword123!'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.type).toBe('INVALID_INPUT');
      }
    });

    test('should prevent NoSQL injection attacks', async () => {
      const nosqlPayloads = [
        { $ne: null },
        { $gt: '' },
        { $regex: '.*' },
        { $where: 'this.password' }
      ];

      for (const payload of nosqlPayloads) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'password'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.type).toBe('INVALID_INPUT');
      }
    });

    test('should validate email format', async () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
        'test@.com',
        'test@example..com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            firstName: 'Test',
            lastName: 'User',
            email: email,
            password: 'SecurePassword123!'
          });

        expect(response.status).toBe(400);
        expect(response.body.error.type).toBe('INVALID_EMAIL');
      }
    });

    test('should validate request body size', async () => {
      const largePayload = 'x'.repeat(11 * 1024 * 1024); // 11MB

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'SecurePassword123!',
          extraData: largePayload
        });

      expect(response.status).toBe(413);
      expect(response.body.error.type).toBe('REQUEST_TOO_LARGE');
    });
  });

  describe('Authentication Bypass', () => {
    test('should require authentication for protected endpoints', async () => {
      const protectedEndpoints = [
        '/api/user/profile',
        '/api/dashboard',
        '/api/workflows',
        '/api/analytics'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(401);
        expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
      }
    });

    test('should reject requests with invalid authorization headers', async () => {
      const invalidHeaders = [
        'InvalidToken',
        'Bearer',
        'Bearer ',
        'Basic dXNlcjpwYXNz',
        'Digest username="test"'
      ];

      for (const header of invalidHeaders) {
        const response = await request(app)
          .get('/api/user/profile')
          .set('Authorization', header);

        expect(response.status).toBe(401);
        expect(response.body.error.type).toBe('INVALID_TOKEN');
      }
    });

    test('should handle missing authorization header', async () => {
      const response = await request(app).get('/api/user/profile');
      
      expect(response.status).toBe(401);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('HTTP Security Headers', () => {
    test('should include security headers in responses', async () => {
      const response = await request(app).get('/api/health');

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
      expect(response.headers).toHaveProperty('strict-transport-security');
    });

    test('should prevent clickjacking attacks', async () => {
      const response = await request(app).get('/api/health');
      
      expect(response.headers['x-frame-options']).toBe('DENY');
    });

    test('should enforce HTTPS in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app).get('/api/health');
      
      expect(response.headers['strict-transport-security']).toContain('max-age');

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Error Information Disclosure', () => {
    test('should not expose sensitive information in error messages', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.message).not.toContain('password');
      expect(response.body.error.message).not.toContain('hash');
      expect(response.body.error.message).not.toContain('database');
    });

    test('should not expose stack traces in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app)
        .get('/api/nonexistent-endpoint');

      expect(response.status).toBe(404);
      expect(response.body.error).not.toHaveProperty('stack');

      process.env.NODE_ENV = originalEnv;
    });

    test('should sanitize error responses', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: '<script>alert("XSS")</script>@example.com',
          password: 'password'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.message).not.toContain('<script>');
      expect(response.body.error.message).not.toContain('alert');
    });
  });

  describe('Request Method Security', () => {
    test('should reject unsupported HTTP methods', async () => {
      const unsupportedMethods = ['TRACE', 'CONNECT', 'PATCH'];

      for (const method of unsupportedMethods) {
        const response = await request(app)
          [method.toLowerCase()]('/api/health');

        expect(response.status).toBe(405);
        expect(response.body.error.type).toBe('METHOD_NOT_ALLOWED');
      }
    });

    test('should handle HEAD requests correctly', async () => {
      const response = await request(app)
        .head('/api/health');

      expect(response.status).toBe(200);
      expect(response.text).toBe('');
    });

    test('should handle OPTIONS requests correctly', async () => {
      const response = await request(app)
        .options('/api/auth/login');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });
  });

  describe('Content Type Security', () => {
    test('should reject requests with invalid content types', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'text/plain')
        .send('email=test@example.com&password=password');

      expect(response.status).toBe(400);
      expect(response.body.error.type).toBe('INVALID_CONTENT_TYPE');
    });

    test('should handle multipart form data securely', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'multipart/form-data')
        .field('email', 'test@example.com')
        .field('password', 'password');

      expect(response.status).toBe(400);
      expect(response.body.error.type).toBe('INVALID_CONTENT_TYPE');
    });

    test('should validate JSON payload structure', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
      expect(response.body.error.type).toBe('INVALID_JSON');
    });
  });

  describe('Path Traversal Protection', () => {
    test('should prevent directory traversal attacks', async () => {
      const traversalPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\drivers\\etc\\hosts',
        '....//....//....//etc/passwd',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd'
      ];

      for (const path of traversalPaths) {
        const response = await request(app)
          .get(`/api/files/${path}`);

        expect(response.status).toBe(400);
        expect(response.body.error.type).toBe('INVALID_PATH');
      }
    });

    test('should normalize URL paths', async () => {
      const normalizedPaths = [
        '/api//health',
        '/api/./health',
        '/api/../health',
        '/api/health/../health'
      ];

      for (const path of normalizedPaths) {
        const response = await request(app).get(path);
        expect(response.status).toBe(200);
      }
    });
  });
});
