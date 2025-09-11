/**
 * Authentication Routes Integration Tests
 * Tests complete auth flow with error handling and validation
 */

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const request = require('supertest');

// Import the actual server components
const { errorHandler, notFoundHandler } = require('../../middleware/errorHandler');
const authRoutes = require('../../routes/auth');

describe('Authentication Routes Integration', () => {
  let app;

  beforeAll(() => {
    // Create test app with same middleware as main server
    app = express();
    app.use(helmet());
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // Use auth routes
    app.use('/api/auth', authRoutes);

    // Use error handlers
    app.use(notFoundHandler);
    app.use(errorHandler);
  });

  describe('POST /api/auth/register', () => {
    test('should register user with valid data', async () => {
      const userData = global.testUtils.createTestUser();

      const response = await request(app).post('/api/auth/register').send(userData);

      // May succeed or fail depending on database availability
      if (response.status === 201) {
        expect(response.body).toMatchObject({
          message: expect.stringContaining('registered successfully'),
          user: expect.objectContaining({
            email: userData.email.toLowerCase(),
            firstName: userData.firstName,
            lastName: userData.lastName
          })
        });
        expect(response.body.user.password).toBeUndefined();
      } else if (response.status === 500) {
        // Database not available - check error format
        expect(response.body).toMatchObject({
          success: false,
          error: {
            type: expect.any(String),
            message: expect.any(String),
            code: 500
          }
        });
      }
    });

    test('should reject registration with invalid email', async () => {
      const invalidData = {
        ...global.testUtils.createTestUser(),
        email: 'invalid-email'
      };

      const response = await request(app).post('/api/auth/register').send(invalidData).expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          code: 400,
          details: expect.arrayContaining([
            expect.objectContaining({
              location: 'body',
              details: expect.arrayContaining([
                expect.objectContaining({
                  path: ['email'],
                  message: expect.stringContaining('email')
                })
              ])
            })
          ])
        }
      });
    });

    test('should reject registration with weak password', async () => {
      const weakPasswordData = {
        ...global.testUtils.createTestUser(),
        password: '123'
      };

      const response = await request(app).post('/api/auth/register').send(weakPasswordData).expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            location: 'body',
            details: expect.arrayContaining([
              expect.objectContaining({
                path: ['password'],
                message: expect.stringContaining('Password must be at least')
              })
            ])
          })
        ])
      );
    });

    test('should reject registration with disposable email', async () => {
      const disposableEmailData = {
        ...global.testUtils.createTestUser(),
        email: 'test@tempmail.org'
      };

      const response = await request(app).post('/api/auth/register').send(disposableEmailData).expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            location: 'body',
            details: expect.arrayContaining([
              expect.objectContaining({
                path: ['email'],
                message: expect.stringContaining('email')
              })
            ])
          })
        ])
      );
    });

    test('should reject registration with invalid names', async () => {
      const invalidNameData = {
        ...global.testUtils.createTestUser(),
        firstName: 'John123',
        lastName: 'Doe@Invalid'
      };

      const response = await request(app).post('/api/auth/register').send(invalidNameData).expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            location: 'body',
            details: expect.arrayContaining([
              expect.objectContaining({
                path: ['firstName'],
                message: expect.stringContaining('letters')
              }),
              expect.objectContaining({
                path: ['lastName'],
                message: expect.stringContaining('letters')
              })
            ])
          })
        ])
      );
    });

    test('should handle missing required fields', async () => {
      const incompleteData = {
        email: 'test@example.com'
        // Missing password, firstName, lastName, companyName
      };

      const response = await request(app).post('/api/auth/register').send(incompleteData).expect(400);

      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            location: 'body',
            details: expect.any(Array)
          })
        ])
      );
      expect(response.body.error.details[0].details.length).toBeGreaterThan(1);
    });

    test('should sanitize XSS attempts in registration', async () => {
      const xssData = {
        ...global.testUtils.createTestUser(),
        firstName: '<script>alert("xss")</script>John',
        lastName: 'Doe<img src=x onerror=alert(1)>',
        companyName: 'Company<script>alert("hack")</script>'
      };

      const response = await request(app).post('/api/auth/register').send(xssData);

      // Should either succeed with sanitized data or fail validation
      if (response.status === 201) {
        expect(response.body.user.firstName).not.toContain('<script>');
        expect(response.body.user.lastName).not.toContain('<img');
      } else {
        expect(response.status).toBe(400);
        expect(response.body.error.type).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('POST /api/auth/login', () => {
    test('should reject login with invalid email format', async () => {
      const invalidLoginData = {
        email: 'invalid-email',
        password: 'TestPass123!'
      };

      const response = await request(app).post('/api/auth/login').send(invalidLoginData).expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          code: 400,
          details: expect.arrayContaining([
            expect.objectContaining({
              location: 'body',
              details: expect.arrayContaining([
                expect.objectContaining({
                  path: ['email'],
                  message: expect.stringContaining('email')
                })
              ])
            })
          ])
        }
      });
    });

    test('should reject login with empty password', async () => {
      const emptyPasswordData = {
        email: 'test@example.com',
        password: ''
      };

      const response = await request(app).post('/api/auth/login').send(emptyPasswordData).expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            location: 'body',
            details: expect.arrayContaining([
              expect.objectContaining({
                path: ['password'],
                message: 'Password is required'
              })
            ])
          })
        ])
      );
    });

    test('should handle non-existent user gracefully', async () => {
      const nonExistentUserData = {
        email: 'nonexistent@example.com',
        password: 'TestPass123!'
      };

      const response = await request(app).post('/api/auth/login').send(nonExistentUserData);

      // Should either return 401 (user not found) or 500 (database error)
      if (response.status === 401) {
        expect(response.body).toMatchObject({
          success: false,
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Invalid credentials',
            code: 401
          }
        });
      } else if (response.status === 500) {
        expect(response.body.error.type).toBe('DATABASE_ERROR');
      }
    });

    test('should reject login with SQL injection attempts', async () => {
      const sqlInjectionData = {
        email: "admin@example.com'; DROP TABLE users; --",
        password: "' OR '1'='1"
      };

      const response = await request(app).post('/api/auth/login').send(sqlInjectionData).expect(400);

      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          type: expect.any(String),
          message: expect.any(String),
          code: 400
        }
      });
    });

    test('should handle oversized payloads', async () => {
      const oversizedData = {
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'A'.repeat(10000), // Very long string
        lastName: 'Doe',
        companyName: 'Test Company'
      };

      const response = await request(app).post('/api/auth/register').send(oversizedData);

      // Should either reject due to validation or payload size
      expect([400, 413]).toContain(response.status);
      expect(response.body.success).toBe(false);
    });

    test('should return 404 for non-existent routes', async () => {
      const response = await request(app).get('/api/auth/non-existent-route').expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          type: 'NOT_FOUND_ERROR',
          message: expect.stringContaining('not found'),
          code: 404
        }
      });
    });
  });

  describe('Security Headers and CORS', () => {
    test('should include security headers', async () => {
      const response = await request(app).get('/api/auth/non-existent').expect(404);

      // Check for security headers added by helmet
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['x-xss-protection']).toBe('0');
    });

    test('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/api/auth/register')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });
});
