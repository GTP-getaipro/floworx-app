/**
 * Unit Tests for EmailService
 * Tests email sending, template rendering, and token management
 */

const crypto = require('crypto');

const nodemailer = require('nodemailer');

const EmailService = require('../../../services/emailService');

// Mock dependencies
jest.mock('nodemailer');
jest.mock('crypto');
jest.mock('../../../database/unified-connection');

describe('EmailService', () => {
  let emailService;
  let mockTransporter;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock transporter
    mockTransporter = {
      sendMail: jest.fn(),
      verify: jest.fn()
    };

    // Mock nodemailer
    nodemailer.createTransport = jest.fn().mockReturnValue(mockTransporter);

    // Mock crypto
    crypto.randomBytes = jest.fn().mockReturnValue({
      toString: jest.fn().mockReturnValue('mock-token-123456789')
    });

    // Create fresh instance
    emailService = new EmailService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Email Sending', () => {
    test('should send verification emails', async () => {
      const email = 'test@example.com';
      const firstName = 'John';
      const token = 'verification-token';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'mock-message-id',
        accepted: [email],
        rejected: []
      });

      const result = await emailService.sendVerificationEmail(email, firstName, token);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Welcome to Floworx - Please Verify Your Email',
          html: expect.stringContaining(firstName)
        })
      );
      expect(result.accepted).toContain(email);
    });

    test('should send password reset emails', async () => {
      const email = 'user@example.com';
      const firstName = 'Jane';
      const token = 'reset-token';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'reset-message-id',
        accepted: [email],
        rejected: []
      });

      const result = await emailService.sendPasswordResetEmail(email, firstName, token);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: expect.stringContaining('Password Reset'),
          html: expect.stringContaining(firstName)
        })
      );
      expect(result.accepted).toContain(email);
    });

    test('should send welcome emails', async () => {
      const email = 'welcome@example.com';
      const firstName = 'Bob';

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'welcome-message-id',
        accepted: [email],
        rejected: []
      });

      const result = await emailService.sendWelcomeEmail(email, firstName);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: expect.stringContaining('Welcome'),
          html: expect.stringContaining(firstName)
        })
      );
      expect(result.accepted).toContain(email);
    });

    test('should handle SMTP failures gracefully', async () => {
      const email = 'fail@example.com';
      const firstName = 'Test';
      const token = 'test-token';

      const smtpError = new Error('SMTP connection failed');
      mockTransporter.sendMail.mockRejectedValue(smtpError);

      await expect(
        emailService.sendVerificationEmail(email, firstName, token)
      ).rejects.toThrow('SMTP connection failed');
    });
  });

  describe('Template Rendering', () => {
    test('should render email templates correctly', () => {
      const firstName = 'Alice';
      const verificationUrl = 'https://app.floworx-iq.com/verify?token=abc123';

      const template = emailService.getVerificationEmailTemplate(firstName, verificationUrl);

      expect(template).toContain(firstName);
      expect(template).toContain(verificationUrl);
      expect(template).toContain('<!DOCTYPE html');
      expect(template).toContain('Verify Your Email');
    });

    test('should personalize email content', () => {
      const firstName = 'Charlie';
      const resetUrl = 'https://app.floworx-iq.com/reset?token=xyz789';

      const template = emailService.getPasswordResetTemplate(firstName, resetUrl);

      expect(template).toContain(`Hello ${firstName}`);
      expect(template).toContain(resetUrl);
      expect(template).toContain('Reset Your Password');
    });

    test('should handle missing template data', () => {
      const template = emailService.getVerificationEmailTemplate('', '');

      expect(template).toContain('Hello '); // Should handle empty name gracefully
      expect(template).toContain('href=""'); // Should handle empty URL
    });

    test('should include company branding', () => {
      const template = emailService.getWelcomeEmailTemplate('User');

      expect(template).toContain('Floworx');
      expect(template).toContain('workflow automation');
      expect(template).toMatch(/color:\s*#[0-9a-fA-F]{6}/); // Should contain brand colors
    });
  });

  describe('Token Management', () => {
    test('should generate secure verification tokens', () => {
      const token = emailService.generateVerificationToken();

      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      expect(token).toBe('mock-token-123456789');
      expect(token).toHaveLength(19); // Mock token length
    });

    test('should validate verification tokens', async () => {
      const validToken = 'valid-token-123';
      const email = 'test@example.com';

      // Mock database query for token validation
      const { query } = require('../../../database/unified-connection');
      query.mockResolvedValue({
        rows: [{ 
          id: 1, 
          email: email, 
          token: validToken, 
          expires_at: new Date(Date.now() + 3600000) // 1 hour from now
        }],
        rowCount: 1
      });

      const isValid = await emailService.validateVerificationToken(validToken);

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [validToken]
      );
      expect(isValid).toBe(true);
    });

    test('should reject expired tokens', async () => {
      const expiredToken = 'expired-token-456';

      const { query } = require('../../../database/unified-connection');
      query.mockResolvedValue({
        rows: [{ 
          id: 1, 
          token: expiredToken, 
          expires_at: new Date(Date.now() - 3600000) // 1 hour ago
        }],
        rowCount: 1
      });

      const isValid = await emailService.validateVerificationToken(expiredToken);

      expect(isValid).toBe(false);
    });

    test('should reject non-existent tokens', async () => {
      const nonExistentToken = 'non-existent-token';

      const { query } = require('../../../database/unified-connection');
      query.mockResolvedValue({
        rows: [],
        rowCount: 0
      });

      const isValid = await emailService.validateVerificationToken(nonExistentToken);

      expect(isValid).toBe(false);
    });
  });

  describe('Configuration', () => {
    test('should create transporter with correct SMTP settings', () => {
      process.env.SMTP_HOST = 'smtp.gmail.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'test@floworx.com';
      process.env.SMTP_PASS = 'app-password';

      const _service = new EmailService();

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@floworx.com',
          pass: 'app-password'
        }
      });
    });

    test('should use default SMTP settings when env vars missing', () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;

      const _service = new EmailService();

      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.gmail.com',
          port: 587
        })
      );
    });

    test('should verify transporter connection', async () => {
      mockTransporter.verify.mockResolvedValue(true);

      const isConnected = await emailService.verifyConnection();

      expect(mockTransporter.verify).toHaveBeenCalled();
      expect(isConnected).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle transporter creation errors', () => {
      nodemailer.createTransport.mockImplementation(() => {
        throw new Error('Transporter creation failed');
      });

      expect(() => new EmailService()).toThrow('Transporter creation failed');
    });

    test('should handle email sending errors with retry logic', async () => {
      const email = 'retry@example.com';
      const firstName = 'Retry';
      const token = 'retry-token';

      mockTransporter.sendMail
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          messageId: 'retry-success',
          accepted: [email],
          rejected: []
        });

      // Assuming retry logic exists in the service
      const result = await emailService.sendVerificationEmailWithRetry(email, firstName, token);

      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
      expect(result.accepted).toContain(email);
    });

    test('should handle database connection errors in token validation', async () => {
      const token = 'db-error-token';

      const { query } = require('../../../database/unified-connection');
      query.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        emailService.validateVerificationToken(token)
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('Email Queue Management', () => {
    test('should queue emails when SMTP is unavailable', async () => {
      const email = 'queue@example.com';
      const firstName = 'Queue';
      const token = 'queue-token';

      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP unavailable'));

      // Assuming queue functionality exists
      await emailService.queueEmail('verification', { email, firstName, token });

      expect(emailService.getQueueSize()).toBeGreaterThan(0);
    });

    test('should process queued emails when SMTP recovers', async () => {
      // Assuming queue processing functionality exists
      emailService.addToQueue({
        type: 'verification',
        data: { email: 'queued@example.com', firstName: 'Queued', token: 'queued-token' }
      });

      mockTransporter.sendMail.mockResolvedValue({
        messageId: 'queued-success',
        accepted: ['queued@example.com'],
        rejected: []
      });

      await emailService.processQueue();

      expect(mockTransporter.sendMail).toHaveBeenCalled();
      expect(emailService.getQueueSize()).toBe(0);
    });
  });
});
