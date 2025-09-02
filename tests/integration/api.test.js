const request = require('supertest');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Import your Express app
const app = require('../../backend/server');

describe('API Integration Tests - Business Types & Password Reset', () => {
  let authToken;
  let testUserId;
  let testBusinessTypeId;

  beforeAll(async () => {
    // Create test user and generate JWT token
    testUserId = uuidv4();
    authToken = jwt.sign(
      { id: testUserId, email: 'test@floworx-test.com' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create test business type for API tests
    const businessTypeResponse = await request(app)
      .post('/api/business-types')
      .send({
        name: 'API Test Business Type',
        description: 'Test business type for API integration tests',
        slug: `api-test-${uuidv4()}`,
        default_categories: [
          { name: 'Test Category', priority: 'medium', description: 'Test category' }
        ]
      });

    if (businessTypeResponse.status === 201) {
      testBusinessTypeId = businessTypeResponse.body.data.id;
    }
  });

  describe('Business Types API Endpoints', () => {
    describe('GET /api/business-types', () => {
      test('BT-API-001: Returns active business types', async () => {
        const response = await request(app)
          .get('/api/business-types')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);

        const businessType = response.body.data[0];
        expect(businessType).toHaveProperty('id');
        expect(businessType).toHaveProperty('name');
        expect(businessType).toHaveProperty('slug');
        expect(businessType).toHaveProperty('description');
      });

      test('BT-API-001-PERF: Response time under 200ms', async () => {
        const startTime = Date.now();
        
        await request(app)
          .get('/api/business-types')
          .expect(200);
        
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(200);
      });
    });

    describe('GET /api/business-types/:slug', () => {
      test('BT-API-002: Returns specific business type by slug', async () => {
        const response = await request(app)
          .get('/api/business-types/hot-tub-spa')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
        expect(response.body.data.slug).toBe('hot-tub-spa');
        expect(response.body.data.name).toBe('Hot Tub & Spa');
      });

      test('BT-API-002-404: Returns 404 for non-existent slug', async () => {
        const response = await request(app)
          .get('/api/business-types/non-existent-slug')
          .expect(404);

        expect(response.body.error).toBe('Business type not found');
      });
    });

    describe('POST /api/business-types/select', () => {
      test('BT-API-003: Requires authentication', async () => {
        const response = await request(app)
          .post('/api/business-types/select')
          .send({ businessTypeId: 1 })
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      test('BT-API-004: Validates business type ID', async () => {
        const response = await request(app)
          .post('/api/business-types/select')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ businessTypeId: 'invalid' })
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
        expect(response.body.details).toBeDefined();
      });

      test('BT-API-004-SUCCESS: Selects valid business type', async () => {
        const response = await request(app)
          .post('/api/business-types/select')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ businessTypeId: 1 })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Business type selected successfully');
        expect(response.body.data.businessType).toBeDefined();
      });

      test('BT-API-004-INVALID: Rejects invalid business type ID', async () => {
        const response = await request(app)
          .post('/api/business-types/select')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ businessTypeId: 99999 })
          .expect(400);

        expect(response.body.error).toBe('Invalid business type');
      });
    });

    describe('GET /api/business-types/user/current', () => {
      test('BT-API-005: Returns user current selection', async () => {
        const response = await request(app)
          .get('/api/business-types/user/current')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        // May be null if user hasn't selected a business type yet
        if (response.body.data) {
          expect(response.body.data.businessType).toBeDefined();
        }
      });

      test('BT-API-005-AUTH: Requires authentication', async () => {
        await request(app)
          .get('/api/business-types/user/current')
          .expect(401);
      });
    });
  });

  describe('Password Reset API Endpoints', () => {
    const testEmail = 'password-reset-test@floworx-test.com';
    let resetToken;

    describe('POST /api/password-reset/request', () => {
      test('PR-API-001: Rate limiting (3 requests per 15 minutes)', async () => {
        // Make 3 requests quickly
        for (let i = 0; i < 3; i++) {
          await request(app)
            .post('/api/password-reset/request')
            .send({ email: `test${i}@floworx-test.com` })
            .expect(200);
        }

        // 4th request should be rate limited
        const response = await request(app)
          .post('/api/password-reset/request')
          .send({ email: 'test4@floworx-test.com' })
          .expect(429);

        expect(response.body.error).toBe('Too many password reset requests');
      });

      test('PR-API-002: Email validation', async () => {
        const response = await request(app)
          .post('/api/password-reset/request')
          .send({ email: 'invalid-email' })
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
        expect(response.body.details[0].msg).toContain('Valid email is required');
      });

      test('PR-API-002-SUCCESS: Valid email request', async () => {
        const response = await request(app)
          .post('/api/password-reset/request')
          .send({ email: testEmail })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toContain('password reset link has been sent');
      });

      test('PR-API-002-PERF: Response time under 500ms', async () => {
        const startTime = Date.now();
        
        await request(app)
          .post('/api/password-reset/request')
          .send({ email: 'perf-test@floworx-test.com' });
        
        const responseTime = Date.now() - startTime;
        expect(responseTime).toBeLessThan(500);
      });
    });

    describe('POST /api/password-reset/validate', () => {
      beforeAll(() => {
        // Generate a test token for validation tests
        resetToken = 'a'.repeat(64); // 64-character hex string
      });

      test('PR-API-003: Token format validation', async () => {
        const response = await request(app)
          .post('/api/password-reset/validate')
          .send({ token: 'short' })
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
        expect(response.body.details[0].msg).toContain('Invalid token format');
      });

      test('PR-API-003-INVALID: Invalid token', async () => {
        const response = await request(app)
          .post('/api/password-reset/validate')
          .send({ token: resetToken })
          .expect(400);

        expect(response.body.valid).toBe(false);
        expect(response.body.message).toContain('Invalid or expired token');
      });
    });

    describe('POST /api/password-reset/reset', () => {
      test('PR-API-004: Password strength validation', async () => {
        const response = await request(app)
          .post('/api/password-reset/reset')
          .send({
            token: resetToken,
            password: 'weak'
          })
          .expect(400);

        expect(response.body.error).toBe('Validation failed');
        expect(response.body.details.some(detail => 
          detail.msg.includes('Password must be at least 8 characters')
        )).toBe(true);
      });

      test('PR-API-005: Rate limiting (5 attempts per 15 minutes)', async () => {
        const validToken = 'b'.repeat(64);
        const validPassword = 'ValidPassword123!';

        // Make 5 requests quickly
        for (let i = 0; i < 5; i++) {
          await request(app)
            .post('/api/password-reset/reset')
            .send({
              token: validToken,
              password: validPassword
            });
        }

        // 6th request should be rate limited
        const response = await request(app)
          .post('/api/password-reset/reset')
          .send({
            token: validToken,
            password: validPassword
          })
          .expect(429);

        expect(response.body.error).toBe('Too many password reset attempts');
      });
    });
  });

  describe('Authentication & Authorization', () => {
    test('AUTH-001: JWT token validation on protected endpoints', async () => {
      const validToken = jwt.sign(
        { id: testUserId, email: 'test@floworx-test.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '1h' }
      );

      const response = await request(app)
        .get('/api/business-types/user/current')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('AUTH-002: Expired token rejection', async () => {
      const expiredToken = jwt.sign(
        { id: testUserId, email: 'test@floworx-test.com' },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/business-types/user/current')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    test('AUTH-003: Invalid token format handling', async () => {
      const response = await request(app)
        .get('/api/business-types/user/current')
        .set('Authorization', 'Bearer invalid-token-format')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    test('AUTH-004: Missing authorization header handling', async () => {
      const response = await request(app)
        .get('/api/business-types/user/current')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('ERR-001: 400 Bad Request for invalid input', async () => {
      const response = await request(app)
        .post('/api/business-types/select')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalidField: 'invalid' })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    test('ERR-002: 401 Unauthorized for missing/invalid auth', async () => {
      await request(app)
        .post('/api/business-types/select')
        .send({ businessTypeId: 1 })
        .expect(401);
    });

    test('ERR-003: 404 Not Found for non-existent resources', async () => {
      await request(app)
        .get('/api/business-types/non-existent-slug')
        .expect(404);
    });

    test('ERR-005: 500 Internal Server Error handling', async () => {
      // This test would require mocking database failures
      // Implementation depends on your error handling middleware
    });
  });

  describe('CORS and Security Headers', () => {
    test('CORS headers present', async () => {
      const response = await request(app)
        .get('/api/business-types')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    test('Security headers present', async () => {
      const response = await request(app)
        .get('/api/business-types')
        .expect(200);

      // Check for security headers (depends on your helmet configuration)
      expect(response.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
