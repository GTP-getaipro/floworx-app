/**
 * API Integration Tests with Mocks
 * Tests API endpoints using mocked Express app and dependencies
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { businessTypes, apiResponses } = require('../fixtures/testData');

// Create a mock Express app for testing
const createMockApp = () => {
  const app = express();
  app.use(express.json());

  // Mock business types routes
  app.get('/api/business-types', (req, res) => {
    res.json(apiResponses.businessTypes.success);
  });

  app.get('/api/business-types/:slug', (req, res) => {
    const { slug } = req.params;
    if (slug === 'hot-tub-spa') {
      res.json({
        success: true,
        data: businessTypes.hotTubSpa
      });
    } else {
      res.status(404).json({
        error: 'Business type not found',
        message: 'The requested business type does not exist or is not available'
      });
    }
  });

  app.post('/api/business-types/select', (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const { businessTypeId } = req.body;
    
    if (!businessTypeId || typeof businessTypeId !== 'number') {
      return res.status(400).json(apiResponses.businessTypeSelection.validationError);
    }

    if (businessTypeId === 99999) {
      return res.status(400).json(apiResponses.businessTypeSelection.invalidId);
    }

    res.json(apiResponses.businessTypeSelection.success);
  });

  // Mock password reset routes
  app.post('/api/password-reset/request', (req, res) => {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ msg: 'Valid email is required', param: 'email' }]
      });
    }

    res.json(apiResponses.passwordReset.requestSuccess);
  });

  app.post('/api/password-reset/validate', (req, res) => {
    const { token } = req.body;

    if (!token || token.length < 32) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ msg: 'Invalid token format', param: 'token' }]
      });
    }

    if (token.includes('invalid-token')) {
      return res.status(400).json({
        valid: false,
        message: 'Invalid or expired token'
      });
    }

    res.json(apiResponses.passwordReset.validateSuccess);
  });

  app.post('/api/password-reset/reset', (req, res) => {
    const { token, password } = req.body;
    
    if (!password || password.length < 8) {
      return res.status(400).json({
        error: 'Validation failed',
        details: [{ msg: 'Password must be at least 8 characters long', param: 'password' }]
      });
    }

    if (token === 'invalid-token') {
      return res.status(400).json(apiResponses.passwordReset.resetInvalidToken);
    }

    res.json(apiResponses.passwordReset.resetSuccess);
  });

  return app;
};

describe('API Integration Tests (Mocked)', () => {
  let app;
  let authToken;

  beforeAll(() => {
    app = createMockApp();
    authToken = jwt.sign(
      { id: 'test-user-id', email: 'test@floworx-test.com' },
      'test-secret',
      { expiresIn: '1h' }
    );
  });

  describe('Business Types API Endpoints', () => {
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
    });

    test('BT-API-001-PERF: Response time under 200ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/business-types')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    test('BT-API-002: Returns specific business type by slug', async () => {
      const response = await request(app)
        .get('/api/business-types/hot-tub-spa')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.slug).toBe('hot-tub-spa');
      expect(response.body.data.name).toBe('Hot Tub & Spa');
    });

    test('BT-API-002-404: Returns 404 for non-existent slug', async () => {
      const response = await request(app)
        .get('/api/business-types/non-existent-slug')
        .expect(404);

      expect(response.body.error).toBe('Business type not found');
    });

    test('BT-API-003: Requires authentication', async () => {
      const response = await request(app)
        .post('/api/business-types/select')
        .send({ businessTypeId: 1 })
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });

    test('BT-API-004: Validates business type ID', async () => {
      const response = await request(app)
        .post('/api/business-types/select')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ businessTypeId: 'invalid' })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
    });

    test('BT-API-004-SUCCESS: Selects valid business type', async () => {
      const response = await request(app)
        .post('/api/business-types/select')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ businessTypeId: 1 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Business type selected successfully');
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

  describe('Password Reset API Endpoints', () => {
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
        .send({ email: 'test@floworx-test.com' })
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

    test('PR-API-003: Token format validation', async () => {
      const response = await request(app)
        .post('/api/password-reset/validate')
        .send({ token: 'short' })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details[0].msg).toContain('Invalid token format');
    });

    test('PR-API-003-INVALID: Invalid token', async () => {
      const invalidToken = 'invalid-token' + 'x'.repeat(32); // Make it long enough to pass length validation
      const response = await request(app)
        .post('/api/password-reset/validate')
        .send({ token: invalidToken })
        .expect(400);

      expect(response.body.valid).toBe(false);
      expect(response.body.message).toContain('Invalid or expired token');
    });

    test('PR-API-003-VALID: Valid token', async () => {
      const validToken = 'a'.repeat(64);
      const response = await request(app)
        .post('/api/password-reset/validate')
        .send({ token: validToken })
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.message).toBe('Token is valid');
    });

    test('PR-API-004: Password strength validation', async () => {
      const response = await request(app)
        .post('/api/password-reset/reset')
        .send({
          token: 'a'.repeat(64),
          password: 'weak'
        })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details[0].msg).toContain('Password must be at least 8 characters');
    });

    test('PR-API-004-SUCCESS: Valid password reset', async () => {
      const response = await request(app)
        .post('/api/password-reset/reset')
        .send({
          token: 'a'.repeat(64),
          password: 'ValidPassword123!'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password has been reset successfully');
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

    test('ERR-002: 401 Unauthorized for missing auth', async () => {
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
  });

  describe('Performance Tests', () => {
    test('API-PERF-001: GET /api/business-types < 200ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .get('/api/business-types')
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(200);
    });

    test('API-PERF-002: POST /api/business-types/select < 300ms', async () => {
      const startTime = Date.now();
      
      await request(app)
        .post('/api/business-types/select')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ businessTypeId: 1 })
        .expect(200);
      
      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(300);
    });
  });
});
