const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('./utils/test-helpers');
const nodemailer = require('nodemailer');

test.describe('Email Service Error Handling and Retry Logic', () => {
  let helpers;
  let originalTransporter;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);

    // Store original transporter for restoration
    const emailService = require('../backend/services/emailService');
    originalTransporter = emailService.transporter;
  });

  test.afterEach(async () => {
    // Restore original transporter
    const emailService = require('../backend/services/emailService');
    emailService.transporter = originalTransporter;

    await helpers.cleanup();
  });

  test.describe('SMTP Connection Errors', () => {
    test('should handle SMTP server unavailability gracefully', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      // Mock transporter to simulate connection failure
      const mockTransporter = {
        sendMail: jest.fn().mockRejectedValue(new Error('ECONNREFUSED: Connection refused')),
        verify: jest.fn().mockRejectedValue(new Error('ECONNREFUSED: Connection refused'))
      };

      emailService.transporter = mockTransporter;

      // Test verification email sending
      const result = await emailService.sendVerificationEmail(
        'test@example.com',
        'Test User',
        'test-token-123'
      );

      // Should return error but not crash
      expect(result).toBeUndefined();

      // Verify error was logged (we can't easily test console.log, but we can verify the function was called)
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });

    test('should handle authentication failures', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      // Mock transporter to simulate auth failure
      const mockTransporter = {
        sendMail: jest.fn().mockRejectedValue(new Error('Authentication failed: Invalid credentials')),
        verify: jest.fn().mockRejectedValue(new Error('Authentication failed: Invalid credentials'))
      };

      emailService.transporter = mockTransporter;

      // Test password reset email sending
      const result = await emailService.sendPasswordResetEmail(
        'test@example.com',
        'Test User',
        'reset-token-123'
      );

      // Should handle error gracefully
      expect(result).toBeUndefined();
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });

    test('should handle network timeouts', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      // Mock transporter to simulate timeout
      const mockTransporter = {
        sendMail: jest.fn().mockRejectedValue(new Error('ETIMEDOUT: Connection timed out')),
        verify: jest.fn().mockRejectedValue(new Error('ETIMEDOUT: Connection timed out'))
      };

      emailService.transporter = mockTransporter;

      // Test welcome email sending
      const result = await emailService.sendWelcomeEmail(
        'test@example.com',
        'Test User'
      );

      // Should handle timeout gracefully
      expect(result).toBeUndefined();
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });
  });

  test.describe('Rate Limiting Scenarios', () => {
    test('should handle SMTP rate limiting', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      // Mock transporter to simulate rate limiting
      let callCount = 0;
      const mockTransporter = {
        sendMail: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount <= 2) {
            return Promise.reject(new Error('450 4.1.1 Too many messages per hour'));
          }
          return Promise.resolve({ messageId: 'test-message-id' });
        }),
        verify: jest.fn().mockResolvedValue(true)
      };

      emailService.transporter = mockTransporter;

      // Test multiple email sends to trigger rate limiting
      for (let i = 0; i < 3; i++) {
        try {
          await emailService.sendVerificationEmail(
            `test${i}@example.com`,
            'Test User',
            `token-${i}`
          );
        } catch (error) {
          // Expected for first two calls
        }
      }

      // Verify rate limiting was encountered
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(3);
    });

    test('should handle Gmail daily sending limits', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      // Mock transporter to simulate Gmail's daily limit
      const mockTransporter = {
        sendMail: jest.fn().mockRejectedValue(new Error('552-5.2.3 Message rate exceeded')),
        verify: jest.fn().mockResolvedValue(true)
      };

      emailService.transporter = mockTransporter;

      // Test email sending when limit is exceeded
      const result = await emailService.sendOnboardingReminder(
        'test@example.com',
        'Test User',
        'email setup'
      );

      // Should handle limit exceeded gracefully
      expect(result).toBeUndefined();
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1);
    });
  });

  test.describe('Retry Logic', () => {
    test('should implement retry logic for temporary failures', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      // Mock transporter with temporary failure then success
      let attemptCount = 0;
      const mockTransporter = {
        sendMail: jest.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount === 1) {
            return Promise.reject(new Error('Temporary server error'));
          }
          return Promise.resolve({ messageId: 'retry-success-message-id' });
        }),
        verify: jest.fn().mockResolvedValue(true)
      };

      emailService.transporter = mockTransporter;

      // Test email sending with retry
      const result = await emailService.sendVerificationEmail(
        'test@example.com',
        'Test User',
        'test-token-123'
      );

      // Should eventually succeed after retry
      expect(result).toBeDefined();
      expect(result.messageId).toBe('retry-success-message-id');
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2); // Initial + retry
    });

    test('should not retry on permanent failures', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      // Mock transporter with permanent authentication failure
      const mockTransporter = {
        sendMail: jest.fn().mockRejectedValue(new Error('535-5.7.8 Authentication failed')),
        verify: jest.fn().mockResolvedValue(true)
      };

      emailService.transporter = mockTransporter;

      // Test email sending with permanent failure
      const result = await emailService.sendPasswordResetEmail(
        'test@example.com',
        'Test User',
        'reset-token-123'
      );

      // Should fail immediately without retry
      expect(result).toBeUndefined();
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(1); // Only initial attempt
    });
  });

  test.describe('Graceful Degradation', () => {
    test('should continue application flow when email service fails', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      // Mock transporter to always fail
      const mockTransporter = {
        sendMail: jest.fn().mockRejectedValue(new Error('Service unavailable')),
        verify: jest.fn().mockRejectedValue(new Error('Service unavailable'))
      };

      emailService.transporter = mockTransporter;

      // Test user registration flow (should not fail due to email issues)
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: `john.doe.error.${Date.now()}@example.com`,
        password: 'SecurePassword123!'
      };

      await page.goto('/register');

      // Fill registration form
      await page.fill('[data-testid="first-name-input"]', userData.firstName);
      await page.fill('[data-testid="last-name-input"]', userData.lastName);
      await page.fill('[data-testid="email-input"]', userData.email);
      await page.fill('[data-testid="password-input"]', userData.password);
      await page.fill('[data-testid="confirm-password-input"]', userData.password);

      // Submit registration
      await page.click('[data-testid="register-button"]');

      // Should still show success message despite email failure
      await helpers.waitForToast('Registration successful! Please check your email to verify your account.');

      // Verify user was still created
      const user = await helpers.getUserByEmail(userData.email);
      expect(user).toBeTruthy();
      expect(user.email_verified).toBe(false);

      // Cleanup
      await helpers.deleteTestUser(userData.email);
    });

    test('should log email failures for monitoring', async ({ page }) => {
      const emailService = require('../backend/services/emailService');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Mock transporter to fail
      const mockTransporter = {
        sendMail: jest.fn().mockRejectedValue(new Error('SMTP connection failed')),
        verify: jest.fn().mockResolvedValue(true)
      };

      emailService.transporter = mockTransporter;

      // Test email sending
      await emailService.sendWelcomeEmail('test@example.com', 'Test User');

      // Verify error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error sending welcome email'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  test.describe('Email Queue and Batch Processing', () => {
    test('should handle bulk email sending with error recovery', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      // Mock transporter with mixed success/failure
      let emailCount = 0;
      const mockTransporter = {
        sendMail: jest.fn().mockImplementation(() => {
          emailCount++;
          if (emailCount % 3 === 0) { // Every 3rd email fails
            return Promise.reject(new Error('Temporary failure'));
          }
          return Promise.resolve({ messageId: `message-${emailCount}` });
        }),
        verify: jest.fn().mockResolvedValue(true)
      };

      emailService.transporter = mockTransporter;

      // Simulate bulk email sending
      const emails = [
        { to: 'user1@example.com', template: 'verification', data: { firstName: 'User 1', token: 'token1' } },
        { to: 'user2@example.com', template: 'verification', data: { firstName: 'User 2', token: 'token2' } },
        { to: 'user3@example.com', template: 'verification', data: { firstName: 'User 3', token: 'token3' } },
        { to: 'user4@example.com', template: 'verification', data: { firstName: 'User 4', token: 'token4' } },
        { to: 'user5@example.com', template: 'verification', data: { firstName: 'User 5', token: 'token5' } }
      ];

      const results = [];
      for (const email of emails) {
        try {
          const result = await emailService.sendEmail({
            to: email.to,
            subject: 'Test Email',
            template: email.template,
            data: email.data
          });
          results.push({ success: true, result });
        } catch (error) {
          results.push({ success: false, error: error.message });
        }
      }

      // Verify mixed results
      expect(results.filter(r => r.success).length).toBeGreaterThan(0);
      expect(results.filter(r => !r.success).length).toBeGreaterThan(0);
      expect(mockTransporter.sendMail).toHaveBeenCalledTimes(5);
    });
  });
});
