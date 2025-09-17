const request = require('supertest');
const app = require('../../server');
const { setTestRunId, resetAll } = require('../../test-helpers/rateLimit');

describe('Rate Limiting Security', () => {
  let testRunId1, testRunId2;

  beforeAll(async () => {
    // Set up two different test run IDs for isolation testing
    testRunId1 = `ratelimit-test-1-${Date.now()}-${Math.random()}`;
    testRunId2 = `ratelimit-test-2-${Date.now()}-${Math.random()}`;
    
    // Reset all rate limits
    resetAll();
  });

  afterAll(async () => {
    // Clean up rate limits
    resetAll();
  });

  beforeEach(async () => {
    // Reset rate limits before each test
    await request(app)
      .post('/api/test/reset-rate-limits')
      .send({});
  });

  describe('Login Rate Limiting', () => {
    it('should rate limit after 10 login attempts', async () => {
      const promises = [];
      
      // Make 11 rapid login attempts with same test run ID
      for (let i = 0; i < 11; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .set('X-Test-Run-Id', testRunId1)
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
        expect(responses[i].body.error.code).toBe('INVALID_CREDENTIALS');
      }
      
      // 11th should be 429 (rate limited)
      expect(responses[10].status).toBe(429);
      expect(responses[10].body.error.code).toBe('RATE_LIMITED');
      expect(responses[10].body.error.message).toBe('Try again later');
    });

    it('should isolate rate limits by test run ID', async () => {
      // First, exhaust rate limit for testRunId1
      const promises1 = [];
      for (let i = 0; i < 10; i++) {
        promises1.push(
          request(app)
            .post('/api/auth/login')
            .set('X-Test-Run-Id', testRunId1)
            .send({
              email: 'ratelimit1.test@example.com',
              password: 'wrongpassword'
            })
        );
      }
      
      await Promise.all(promises1);
      
      // Next request with testRunId1 should be rate limited
      const response1 = await request(app)
        .post('/api/auth/login')
        .set('X-Test-Run-Id', testRunId1)
        .send({
          email: 'ratelimit1.test@example.com',
          password: 'wrongpassword'
        });
      
      expect(response1.status).toBe(429);
      expect(response1.body.error.code).toBe('RATE_LIMITED');
      
      // But request with testRunId2 should work (different namespace)
      const response2 = await request(app)
        .post('/api/auth/login')
        .set('X-Test-Run-Id', testRunId2)
        .send({
          email: 'ratelimit2.test@example.com',
          password: 'wrongpassword'
        });
      
      expect(response2.status).toBe(401); // Invalid credentials, not rate limited
      expect(response2.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Rate Limit Reset Endpoint', () => {
    it('should reset rate limits when called', async () => {
      // First, exhaust rate limit
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          request(app)
            .post('/api/auth/login')
            .set('X-Test-Run-Id', testRunId1)
            .send({
              email: 'reset.test@example.com',
              password: 'wrongpassword'
            })
        );
      }
      
      await Promise.all(promises);
      
      // Verify rate limit is active
      const rateLimitedResponse = await request(app)
        .post('/api/auth/login')
        .set('X-Test-Run-Id', testRunId1)
        .send({
          email: 'reset.test@example.com',
          password: 'wrongpassword'
        });
      
      expect(rateLimitedResponse.status).toBe(429);
      
      // Reset rate limits
      await request(app)
        .post('/api/test/reset-rate-limits')
        .send({ namespace: testRunId1 })
        .expect(204);
      
      // Now request should work again (not rate limited)
      const afterResetResponse = await request(app)
        .post('/api/auth/login')
        .set('X-Test-Run-Id', testRunId1)
        .send({
          email: 'reset.test@example.com',
          password: 'wrongpassword'
        });
      
      expect(afterResetResponse.status).toBe(401); // Invalid credentials, not rate limited
      expect(afterResetResponse.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Refresh Token Rate Limiting', () => {
    it('should rate limit refresh attempts', async () => {
      const promises = [];
      
      // Make 21 rapid refresh attempts
      for (let i = 0; i < 21; i++) {
        promises.push(
          request(app)
            .post('/api/auth/refresh')
            .set('X-Test-Run-Id', testRunId1)
            .set('Cookie', 'fx_refresh=invalid.token')
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

  describe('Password Reset Rate Limiting', () => {
    it('should rate limit password reset requests', async () => {
      const promises = [];
      
      // Make 4 rapid password reset attempts
      for (let i = 0; i < 4; i++) {
        promises.push(
          request(app)
            .post('/api/auth/password/request')
            .set('X-Test-Run-Id', testRunId1)
            .send({
              email: 'passwordreset.test@example.com'
            })
        );
      }
      
      const responses = await Promise.all(promises);
      
      // First 3 should be 202 (accepted)
      for (let i = 0; i < 3; i++) {
        expect(responses[i].status).toBe(202);
      }
      
      // 4th should be 429 (rate limited)
      expect(responses[3].status).toBe(429);
      expect(responses[3].body.error.code).toBe('RATE_LIMITED');
    });
  });
});
