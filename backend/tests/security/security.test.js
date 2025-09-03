/**
 * Security Testing Suite for FloWorx SaaS
 * Tests for SQL injection, XSS, rate limiting, and other security vulnerabilities
 */

const request = require('supertest');
const app = require('../../server');
const { query } = require('../../database/unified-connection');

describe('Security Tests', () => {
  describe('SQL Injection Prevention', () => {
    test('should prevent SQL injection in login endpoint', async () => {
      const maliciousPayloads = [
        "admin'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO users (email) VALUES ('hacker@test.com'); --",
        "' OR 1=1 --",
        "admin'/**/OR/**/1=1--",
        "' OR 'x'='x",
        "1' OR '1'='1' /*"
      ];

      for (const payload of maliciousPayloads) {
        const response = await request(app).post('/api/auth/login').send({
          email: payload,
          password: 'password123'
        });

        // Should not return 500 (SQL error) or 200 (successful injection)
        expect(response.status).not.toBe(500);
        expect(response.status).not.toBe(200);
        expect(response.status).toBeOneOf([400, 401, 422]);
      }
    });

    test('should prevent SQL injection in user search', async () => {
      const maliciousQueries = [
        "'; DROP TABLE users; --",
        "' UNION SELECT password_hash FROM users --",
        "' OR 1=1 --",
        "%'; DELETE FROM users WHERE '1'='1"
      ];

      // First login to get auth token
      const loginResponse = await request(app).post('/api/auth/login').send({
        email: 'test@example.com',
        password: 'validpassword'
      });

      const token = loginResponse.body.token;

      for (const maliciousQuery of maliciousQueries) {
        const response = await request(app)
          .get('/api/users/search')
          .set('Authorization', `Bearer ${token}`)
          .query({ search: maliciousQuery });

        expect(response.status).not.toBe(500);
        expect(response.body).not.toHaveProperty('password_hash');
      }
    });
  });

  describe('XSS Prevention', () => {
    test('should sanitize XSS payloads in registration', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">',
        '"><script>alert("XSS")</script>',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<body onload="alert(1)">',
        '<input type="text" onfocus="alert(1)" autofocus>'
      ];

      for (const payload of xssPayloads) {
        const response = await request(app).post('/api/auth/register').send({
          email: 'test@example.com',
          password: 'ValidPass123!',
          firstName: payload,
          lastName: 'User',
          agreeToTerms: true
        });

        // Should either reject the payload or sanitize it
        if (response.status === 201) {
          expect(response.body.user.firstName).not.toContain('<script>');
          expect(response.body.user.firstName).not.toContain('javascript:');
          expect(response.body.user.firstName).not.toContain('onerror');
          expect(response.body.user.firstName).not.toContain('onload');
        }
      }
    });

    test('should prevent XSS in error messages', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: '<script>alert("XSS")</script>@example.com',
        password: 'password'
      });

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).not.toContain('<script>');
      expect(response.body.error.message).not.toContain('javascript:');
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits on login attempts', async () => {
      const requests = [];

      // Make multiple rapid requests
      for (let i = 0; i < 10; i++) {
        requests.push(
          request(app).post('/api/auth/login').send({
            email: 'test@example.com',
            password: 'wrongpassword'
          })
        );
      }

      const responses = await Promise.all(requests);

      // Should have at least one rate limited response
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should enforce rate limits on registration', async () => {
      const requests = [];

      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/api/auth/register')
            .send({
              email: `test${i}@example.com`,
              password: 'ValidPass123!',
              firstName: 'Test',
              lastName: 'User',
              agreeToTerms: true
            })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should enforce rate limits on password reset', async () => {
      const requests = [];

      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app).post('/api/auth/password-reset-request').send({
            email: 'test@example.com'
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Input Validation', () => {
    test('should reject invalid email formats', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test..test@example.com',
        'test@example',
        'test@.com',
        'test@example..com'
      ];

      for (const email of invalidEmails) {
        const response = await request(app).post('/api/auth/register').send({
          email: email,
          password: 'ValidPass123!',
          firstName: 'Test',
          lastName: 'User',
          agreeToTerms: true
        });

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      }
    });

    test('should reject weak passwords', async () => {
      const weakPasswords = ['password', '123456', 'abc123', 'Password', 'password123', 'PASSWORD123', 'Pass123'];

      for (const password of weakPasswords) {
        const response = await request(app).post('/api/auth/register').send({
          email: 'test@example.com',
          password: password,
          firstName: 'Test',
          lastName: 'User',
          agreeToTerms: true
        });

        expect(response.status).toBe(400);
        expect(response.body.error.message).toContain('Password');
      }
    });

    test('should validate required fields', async () => {
      const incompleteData = [
        { email: 'test@example.com' }, // Missing password
        { password: 'ValidPass123!' }, // Missing email
        { email: 'test@example.com', password: 'ValidPass123!' }, // Missing names
        {
          email: 'test@example.com',
          password: 'ValidPass123!',
          firstName: 'Test',
          lastName: 'User'
          // Missing agreeToTerms
        }
      ];

      for (const data of incompleteData) {
        const response = await request(app).post('/api/auth/register').send(data);

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      }
    });
  });

  describe('Authentication Security', () => {
    test('should not expose sensitive information in error messages', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'password'
      });

      expect(response.status).toBe(401);
      expect(response.body.error.message).not.toContain('user not found');
      expect(response.body.error.message).not.toContain('email does not exist');
      expect(response.body.error.message).toBe('Email or password is incorrect');
    });

    test('should implement account lockout after failed attempts', async () => {
      const email = 'lockout-test@example.com';

      // Create a test user first
      await request(app).post('/api/auth/register').send({
        email: email,
        password: 'ValidPass123!',
        firstName: 'Test',
        lastName: 'User',
        agreeToTerms: true
      });

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app).post('/api/auth/login').send({
          email: email,
          password: 'wrongpassword'
        });
      }

      // Next attempt should be locked out
      const response = await request(app).post('/api/auth/login').send({
        email: email,
        password: 'ValidPass123!' // Even with correct password
      });

      expect(response.status).toBe(423); // Locked
      expect(response.body.error.message).toContain('locked');
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app).get('/health');

      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('x-xss-protection', '1; mode=block');
      expect(response.headers).toHaveProperty('referrer-policy', 'strict-origin-when-cross-origin');
      expect(response.headers).not.toHaveProperty('x-powered-by');
    });

    test('should set Content Security Policy', async () => {
      const response = await request(app).get('/health');

      expect(response.headers).toHaveProperty('content-security-policy');
      const csp = response.headers['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("object-src 'none'");
    });
  });
});

// Helper function for Jest
expect.extend({
  toBeOneOf(received, expected) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected}`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected}`,
        pass: false
      };
    }
  }
});
