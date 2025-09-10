/**
 * Error Handler Middleware Tests
 * Tests centralized error handling and security features
 */

const express = require('express');
const request = require('supertest');

const {
  errorHandler,
  notFoundHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  asyncHandler
} = require('../../middleware/errorHandler');

describe('Error Handler Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Custom Error Classes', () => {
    test('AppError should create error with correct properties', () => {
      const error = new AppError('Test message', 400, 'TEST_ERROR', { detail: 'test' });

      expect(error.message).toBe('Test message');
      expect(error.statusCode).toBe(400);
      expect(error.errorType).toBe('TEST_ERROR');
      expect(error.details).toEqual({ detail: 'test' });
      expect(error.isOperational).toBe(true);
    });

    test('ValidationError should have correct defaults', () => {
      const error = new ValidationError('Validation failed');

      expect(error.statusCode).toBe(400);
      expect(error.errorType).toBe('VALIDATION_ERROR');
      expect(error.isOperational).toBe(true);
    });

    test('AuthenticationError should have correct defaults', () => {
      const error = new AuthenticationError();

      expect(error.statusCode).toBe(401);
      expect(error.errorType).toBe('AUTHENTICATION_ERROR');
      expect(error.message).toBe('Authentication required');
    });

    test('DatabaseError should handle PostgreSQL error codes', () => {
      const error = new DatabaseError('Database error');

      expect(error.statusCode).toBe(500);
      expect(error.errorType).toBe('DATABASE_ERROR');
    });
  });

  describe('Error Handler Response Format', () => {
    beforeEach(() => {
      app.get('/test-validation-error', (req, res, next) => {
        next(new ValidationError('Invalid input', [{ field: 'email', message: 'Invalid email' }]));
      });

      app.get('/test-auth-error', (req, res, next) => {
        next(new AuthenticationError('Token expired'));
      });

      app.get('/test-database-error', (req, res, next) => {
        const dbError = new Error('Connection failed');
        dbError.code = '08006'; // PostgreSQL connection failure
        next(dbError);
      });

      app.get('/test-generic-error', (req, res, next) => {
        next(new Error('Generic error'));
      });

      app.use(errorHandler);
    });

    test('should format validation errors correctly', async () => {
      const response = await request(app).get('/test-validation-error').expect(400);

      expect(response.body).toEqual({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Invalid input',
          code: 400,
          details: [{ field: 'email', message: 'Invalid email' }]
        }
      });
    });

    test('should format authentication errors correctly', async () => {
      const response = await request(app).get('/test-auth-error').expect(401);

      expect(response.body).toEqual({
        success: false,
        error: {
          type: 'AUTHENTICATION_ERROR',
          message: 'Token expired',
          code: 401
        }
      });
    });

    test('should convert database errors to safe messages', async () => {
      const response = await request(app).get('/test-database-error').expect(500);

      expect(response.body).toEqual({
        success: false,
        error: {
          type: 'DATABASE_ERROR',
          message: 'Database connection failed',
          code: 500
        }
      });
    });

    test('should handle generic errors safely in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const response = await request(app).get('/test-generic-error').expect(500);

      expect(response.body).toEqual({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Internal server error',
          code: 500
        }
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Async Handler Wrapper', () => {
    beforeEach(() => {
      app.get(
        '/test-async-success',
        asyncHandler(async (req, res) => {
          res.json({ success: true, message: 'Async operation completed' });
        })
      );

      app.get(
        '/test-async-error',
        asyncHandler(async (req, _res) => {
          throw new ValidationError('Async validation failed');
        })
      );

      app.get(
        '/test-async-promise-rejection',
        asyncHandler(async (req, _res) => {
          await Promise.reject(new Error('Promise rejected'));
        })
      );

      app.use(errorHandler);
    });

    test('should handle successful async operations', async () => {
      const response = await request(app).get('/test-async-success').expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Async operation completed'
      });
    });

    test('should catch async errors and forward to error handler', async () => {
      const response = await request(app).get('/test-async-error').expect(400);

      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Async validation failed');
    });

    test('should catch promise rejections', async () => {
      const response = await request(app).get('/test-async-promise-rejection').expect(500);

      expect(response.body.error.type).toBe('INTERNAL_ERROR');
    });
  });

  describe('Not Found Handler', () => {
    beforeEach(() => {
      app.use(notFoundHandler);
      app.use(errorHandler);
    });

    test('should handle 404 errors with correct format', async () => {
      const response = await request(app).get('/non-existent-route').expect(404);

      expect(response.body).toEqual({
        success: false,
        error: {
          type: 'NOT_FOUND_ERROR',
          message: 'Route /non-existent-route not found',
          code: 404
        }
      });
    });
  });

  describe('Security Features', () => {
    let consoleSpy;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      app.get('/test-security-logging', (req, res, next) => {
        const error = new AuthenticationError('Invalid token');
        req.user = { id: 'test-user-123' };
        req.ip = '192.168.1.1';
        next(error);
      });

      app.use(errorHandler);
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    test('should log errors with security context', async () => {
      await request(app).get('/test-security-logging').set('User-Agent', 'Test-Agent/1.0').expect(401);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error:'));

      const logCall = consoleSpy.mock.calls[0][0];
      const logData = JSON.parse(logCall.replace('Error: ', ''));

      expect(logData).toMatchObject({
        method: 'GET',
        url: '/test-security-logging',
        ip: expect.any(String),
        userAgent: 'Test-Agent/1.0',
        userId: 'test-user-123',
        errorType: 'AUTHENTICATION_ERROR',
        statusCode: 401,
        message: 'Invalid token'
      });
    });

    test('should not expose sensitive information in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      app.get('/test-sensitive-error', (req, res, next) => {
        const error = new Error('Database password is: secret123');
        error.stack = 'Error: Database password is: secret123\n    at /app/database.js:42:15';
        next(error);
      });

      const response = await request(app).get('/test-sensitive-error').expect(500);

      expect(response.body.error.message).toBe('Internal server error');
      expect(response.body.error.stack).toBeUndefined();
      expect(response.body.error.details).toBeUndefined();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
