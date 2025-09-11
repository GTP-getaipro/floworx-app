/**
 * Validation Middleware Tests
 * Tests input validation and security features
 */

const express = require('express');
const request = require('supertest');

const { errorHandler } = require('../../middleware/errorHandler');
const {
  validateRegistration,
  validateLoginSecure: _validateLoginSecure,
  validateEmailSecure,
  validatePasswordSecure,
  validateUUID,
  validateBusinessType
} = require('../../middleware/validation');

describe('Validation Middleware', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  describe('Email Validation', () => {
    beforeEach(() => {
      app.post('/test-email', validateEmailSecure(), (req, res) => {
        res.json({ success: true, email: req.body.email });
      });
      app.use(errorHandler);
    });

    test('should accept valid email addresses', async () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@gmail.com',
        'user123@test-domain.com'
      ];

      for (const email of validEmails) {
        const response = await request(app).post('/test-email').send({ email }).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.email).toBe(email.toLowerCase());
      }
    });

    test('should reject invalid email formats', async () => {
      const invalidEmails = ['invalid-email', '@domain.com', 'user@', 'user..name@domain.com', 'user@domain', ''];

      for (const email of invalidEmails) {
        const response = await request(app).post('/test-email').send({ email }).expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error.type).toBe('VALIDATION_ERROR');
        expect(response.body.error.message).toBe('Validation failed');
      }
    });

    test('should reject disposable email domains', async () => {
      const disposableEmails = ['test@tempmail.org', 'user@10minutemail.com', 'fake@guerrillamail.com'];

      for (const email of disposableEmails) {
        const response = await request(app).post('/test-email').send({ email }).expect(400);

        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              message: 'Disposable email addresses are not allowed'
            })
          ])
        );
      }
    });

    test('should reject emails that are too long', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com';

      const response = await request(app).post('/test-email').send({ email: longEmail }).expect(400);

      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'Email must be less than 254 characters'
          })
        ])
      );
    });
  });

  describe('Password Validation', () => {
    beforeEach(() => {
      app.post('/test-password', validatePasswordSecure(), (req, res) => {
        res.json({ success: true });
      });
      app.use(errorHandler);
    });

    test('should accept strong passwords', async () => {
      const strongPasswords = ['TestPass123!', 'MySecure@Password1', 'Complex#Pass99', 'Strong$Password2024'];

      for (const password of strongPasswords) {
        const response = await request(app).post('/test-password').send({ password }).expect(200);

        expect(response.body.success).toBe(true);
      }
    });

    test('should reject weak passwords', async () => {
      const weakPasswords = [
        { password: '123', expectedError: 'Password must be between 8 and 128 characters' },
        { password: 'password', expectedError: 'Password must contain at least one uppercase letter' },
        { password: 'PASSWORD', expectedError: 'Password must contain at least one lowercase letter' },
        { password: 'Password', expectedError: 'Password must contain at least one number' },
        { password: 'Password123', expectedError: 'Password must contain at least one special character' },
        { password: 'a'.repeat(129), expectedError: 'Password must be between 8 and 128 characters' }
      ];

      for (const { password, expectedError } of weakPasswords) {
        const response = await request(app).post('/test-password').send({ password }).expect(400);

        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              message: expectedError
            })
          ])
        );
      }
    });
  });

  describe('Registration Validation', () => {
    beforeEach(() => {
      app.post('/test-registration', validateRegistration, (req, res) => {
        res.json({ success: true, user: req.body });
      });
      app.use(errorHandler);
    });

    test('should accept valid registration data', async () => {
      const validData = {
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: 'John',
        lastName: 'Doe',
        companyName: 'Test Company Inc.'
      };

      const response = await request(app).post('/test-registration').send(validData).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe('test@example.com');
    });

    test('should reject invalid registration data', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '123',
        firstName: '',
        lastName: 'Doe123',
        companyName: 'A'
      };

      const response = await request(app).post('/test-registration').send(invalidData).expect(400);

      expect(response.body.error.type).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveLength(5); // All fields should have errors
    });

    test('should sanitize and validate names', async () => {
      const testCases = [
        { name: 'John123', field: 'firstName', shouldFail: true },
        { name: 'John@Doe', field: 'lastName', shouldFail: true },
        { name: "O'Connor", field: 'firstName', shouldFail: false },
        { name: 'Mary-Jane', field: 'lastName', shouldFail: false },
        { name: 'Dr. Smith', field: 'firstName', shouldFail: false }
      ];

      for (const { name, field, shouldFail } of testCases) {
        const data = {
          email: 'test@example.com',
          password: 'TestPass123!',
          firstName: field === 'firstName' ? name : 'John',
          lastName: field === 'lastName' ? name : 'Doe',
          companyName: 'Test Company'
        };

        const response = await request(app).post('/test-registration').send(data);

        if (shouldFail) {
          expect(response.status).toBe(400);
          expect(response.body.error.details).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                field: field,
                message: expect.stringContaining('can only contain letters')
              })
            ])
          );
        } else {
          expect(response.status).toBe(200);
        }
      }
    });
  });

  describe('UUID Validation', () => {
    beforeEach(() => {
      app.get('/test-uuid/:id', validateUUID('id'), (req, res) => {
        res.json({ success: true, id: req.params.id });
      });
      app.use(errorHandler);
    });

    test('should accept valid UUIDs', async () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      ];

      for (const uuid of validUUIDs) {
        const response = await request(app).get(`/test-uuid/${uuid}`).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.id).toBe(uuid);
      }
    });

    test('should reject invalid UUIDs', async () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123',
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra'
      ];

      for (const uuid of invalidUUIDs) {
        const response = await request(app).get(`/test-uuid/${uuid}`).expect(400);

        expect(response.body.error.type).toBe('VALIDATION_ERROR');
        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              message: 'id must be a valid UUID'
            })
          ])
        );
      }
    });
  });

  describe('Business Type Validation', () => {
    beforeEach(() => {
      app.post('/test-business-type', validateBusinessType(), (req, res) => {
        res.json({ success: true, businessTypeId: req.body.businessTypeId });
      });
      app.use(errorHandler);
    });

    test('should accept valid business type IDs', async () => {
      const validIds = [1, 5, 100, 999];

      for (const id of validIds) {
        const response = await request(app).post('/test-business-type').send({ businessTypeId: id }).expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.businessTypeId).toBe(id);
      }
    });

    test('should reject invalid business type IDs', async () => {
      const invalidIds = [0, -1, 'string', null, undefined, 1.5];

      for (const id of invalidIds) {
        const response = await request(app).post('/test-business-type').send({ businessTypeId: id }).expect(400);

        expect(response.body.error.type).toBe('VALIDATION_ERROR');
        expect(response.body.error.details).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              message: 'Business type ID must be a positive integer'
            })
          ])
        );
      }
    });
  });

  describe('XSS Protection', () => {
    beforeEach(() => {
      app.post('/test-xss', validateRegistration, (req, res) => {
        res.json({ success: true, data: req.body });
      });
      app.use(errorHandler);
    });

    test('should sanitize XSS attempts in input', async () => {
      const maliciousData = {
        email: 'test@example.com',
        password: 'TestPass123!',
        firstName: '<script>alert("xss")</script>John',
        lastName: 'Doe<img src=x onerror=alert(1)>',
        companyName: 'Test Company'
      };

      const response = await request(app).post('/test-xss').send(maliciousData).expect(200);

      // XSS should be sanitized
      expect(response.body.data.firstName).not.toContain('<script>');
      expect(response.body.data.lastName).not.toContain('<img');
    });
  });
});
