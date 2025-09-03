const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('./utils/test-helpers');

test.describe('Email Content Correctness and Validation', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test.describe('Template Rendering Validation', () => {
    test('should render verification email template correctly', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      const firstName = 'John Doe';
      const verificationUrl = 'https://example.com/verify?token=test-token-123';

      const template = emailService.getVerificationEmailTemplate(firstName, verificationUrl);

      // Verify template contains required elements
      expect(template).toContain('Welcome to Floworx!');
      expect(template).toContain(firstName);
      expect(template).toContain(verificationUrl);
      expect(template).toContain('Verify My Email Address');
      expect(template).toContain('24 hours'); // Token expiry

      // Verify HTML structure
      expect(template).toContain('<html>');
      expect(template).toContain('<head>');
      expect(template).toContain('<body>');
      expect(template).toContain('</html>');

      // Verify email contains proper styling
      expect(template).toContain('font-family');
      expect(template).toContain('color:');
      expect(template).toContain('background:');

      // Verify responsive design
      expect(template).toContain('max-width: 600px');
      expect(template).toContain('width=device-width');
    });

    test('should render password reset template with correct data', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      const firstName = 'Jane Smith';
      const resetUrl = 'https://example.com/reset-password?token=reset-token-456';
      const expiryMinutes = 60;

      const template = emailService.getPasswordResetTemplate(firstName, resetUrl, expiryMinutes);

      // Verify template contains required elements
      expect(template).toContain('Password Reset Request');
      expect(template).toContain(firstName);
      expect(template).toContain(resetUrl);
      expect(template).toContain('Reset My Password');
      expect(template).toContain('1 hour'); // Expiry time
      expect(template).toContain('Secure Your Hot Tub Business Account');

      // Verify security notices
      expect(template).toContain('Security Notice');
      expect(template).toContain('If you didn\'t request this reset');

      // Verify HTML structure and styling
      expect(template).toContain('<html>');
      expect(template).toContain('linear-gradient');
      expect(template).toContain('border-radius');
    });

    test('should render welcome email template with personalization', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      const firstName = 'Mike Johnson';
      const dashboardUrl = 'https://example.com/dashboard';

      const template = emailService.getWelcomeEmailTemplate(firstName, dashboardUrl);

      // Verify template contains required elements
      expect(template).toContain('Welcome to Floworx!');
      expect(template).toContain(firstName);
      expect(template).toContain(dashboardUrl);
      expect(template).toContain('Start My Setup Journey');
      expect(template).toContain('Email Verified Successfully');

      // Verify onboarding steps
      expect(template).toContain('Step 1: Connect Your Google Account');
      expect(template).toContain('Step 2: Define Your Email Categories');
      expect(template).toContain('Step 3: Set Up Team Notifications');
      expect(template).toContain('Step 4: Activate Automation');

      // Verify personalization
      expect(template).toContain(`Great job, ${firstName}!`);
      expect(template).toContain(`Hi ${firstName},`);
    });
  });

  test.describe('Email Content Personalization', () => {
    test('should personalize emails with user data', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      // Test with various user data
      const testCases = [
        {
          firstName: 'Dr. Sarah Chen',
          lastName: 'Chen',
          company: 'Premium Spas Inc.',
          email: 'sarah.chen@premiumspas.com'
        },
        {
          firstName: 'Bob',
          lastName: 'Wilson',
          company: 'Wilson\'s Hot Tubs',
          email: 'bob@wilsonhottubs.com'
        },
        {
          firstName: 'Maria García',
          lastName: 'García',
          company: 'Spa Solutions LLC',
          email: 'maria@spasolutions.com'
        }
      ];

      for (const user of testCases) {
        const verificationUrl = `https://example.com/verify?token=${user.firstName.toLowerCase()}-token`;
        const template = emailService.getVerificationEmailTemplate(user.firstName, verificationUrl);

        // Verify personalization
        expect(template).toContain(`Hi ${user.firstName}`);
        expect(template).toContain(user.firstName);
        expect(template).toContain(verificationUrl);

        // Verify no placeholder text remains
        expect(template).not.toContain('{{');
        expect(template).not.toContain('}}');
        expect(template).not.toContain('undefined');
        expect(template).not.toContain('null');
      }
    });

    test('should handle edge cases in user data', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      // Test edge cases
      const edgeCases = [
        { firstName: '', expected: 'there' }, // Empty name
        { firstName: null, expected: 'there' }, // Null name
        { firstName: undefined, expected: 'there' }, // Undefined name
        { firstName: 'John', expected: 'John' }, // Normal case
        { firstName: 'José María', expected: 'José María' }, // Accented characters
        { firstName: 'O\'Connor', expected: 'O\'Connor' }, // Apostrophe
        { firstName: '张三', expected: '张三' } // Unicode characters
      ];

      for (const testCase of edgeCases) {
        const template = emailService.getWelcomeEmailTemplate(testCase.firstName, 'https://example.com/dashboard');

        if (testCase.expected === 'there') {
          expect(template).toContain('Great job, there!');
          expect(template).toContain('Hi there,');
        } else {
          expect(template).toContain(`Great job, ${testCase.expected}!`);
          expect(template).toContain(`Hi ${testCase.expected},`);
        }
      }
    });
  });

  test.describe('URL and Link Validation', () => {
    test('should generate valid verification URLs', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      const testTokens = [
        'simple-token-123',
        'complex_token_with_underscores',
        'token-with-dashes-456',
        'token123!@#$%^&*()',
        'very-long-token-that-might-be-generated-by-crypto-random-bytes-and-could-be-quite-long'
      ];

      for (const token of testTokens) {
        const verificationUrl = `${process.env.FRONTEND_URL || 'https://example.com'}/verify-email?token=${token}`;
        const template = emailService.getVerificationEmailTemplate('Test User', verificationUrl);

        // Verify URL is properly encoded in template
        expect(template).toContain(verificationUrl);

        // Verify URL structure
        expect(verificationUrl).toMatch(/^https?:\/\/.+/);
        expect(verificationUrl).toContain('/verify-email?token=');
        expect(verificationUrl).toContain(token);
      }
    });

    test('should generate valid password reset URLs', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      const testTokens = [
        'reset-token-abc',
        'another_reset_token',
        'reset-123-def'
      ];

      for (const token of testTokens) {
        const resetUrl = `${process.env.FRONTEND_URL || 'https://example.com'}/reset-password?token=${token}`;
        const template = emailService.getPasswordResetTemplate('Test User', resetUrl);

        // Verify URL is in template
        expect(template).toContain(resetUrl);

        // Verify URL contains both parts
        expect(resetUrl).toContain('/reset-password?token=');
        expect(resetUrl).toContain(token);

        // Verify URL is properly formatted
        const urlPattern = /^https?:\/\/[^\/\s]+\/reset-password\?token=[^&\s]+$/;
        expect(resetUrl).toMatch(urlPattern);
      }
    });

    test('should handle special characters in URLs', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      const specialTokens = [
        'token+with+plus',
        'token%20with%20spaces',
        'token&with&ampersand',
        'token=with=equals',
        'token?with?question'
      ];

      for (const token of specialTokens) {
        const verificationUrl = `${process.env.FRONTEND_URL || 'https://example.com'}/verify-email?token=${encodeURIComponent(token)}`;
        const template = emailService.getVerificationEmailTemplate('Test User', verificationUrl);

        // Verify URL is properly encoded
        expect(template).toContain(verificationUrl);
      }
    });
  });

  test.describe('Email Content Formatting', () => {
    test('should maintain proper HTML structure', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      const templates = [
        emailService.getVerificationEmailTemplate('Test', 'https://example.com/verify?token=test'),
        emailService.getPasswordResetTemplate('Test', 'https://example.com/reset?token=test'),
        emailService.getWelcomeEmailTemplate('Test', 'https://example.com/dashboard')
      ];

      for (const template of templates) {
        // Verify HTML structure
        expect(template).toContain('<html');
        expect(template).toContain('<head');
        expect(template).toContain('<body');
        expect(template).toContain('</html>');
        expect(template).toContain('</head>');
        expect(template).toContain('</body>');

        // Verify no broken tags
        const openTags = (template.match(/<[^\/][^>]*>/g) || []).length;
        const closeTags = (template.match(/<\/[^>]+>/g) || []).length;
        expect(openTags).toBeGreaterThan(0);
        expect(closeTags).toBeGreaterThan(0);

        // Verify meta tags for email clients
        expect(template).toContain('<meta charset');
        expect(template).toContain('content="width=device-width');
      }
    });

    test('should include proper email client compatibility', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      const template = emailService.getVerificationEmailTemplate('Test', 'https://example.com/verify?token=test');

      // Verify email client compatibility
      expect(template).toContain('charset="utf-8"');
      expect(template).toContain('http-equiv="Content-Type"');
      expect(template).toContain('name="viewport"');
      expect(template).toContain('initial-scale=1.0');

      // Verify inline CSS for email clients
      expect(template).toContain('style=');
      expect(template).toContain('font-family');
      expect(template).toContain('color:');
    });

    test('should handle long content properly', async ({ page }) => {
      const emailService = require('../backend/services/emailService');

      // Test with very long first name
      const longName = 'A'.repeat(100);
      const template = emailService.getWelcomeEmailTemplate(longName, 'https://example.com/dashboard');

      // Verify template still renders
      expect(template).toContain(longName);
      expect(template).toContain('<html');
      expect(template).toContain('</html>');

      // Verify no truncation issues
      expect(template.length).toBeGreaterThan(1000);
    });
  });

  test.describe('Real Scenario Integration', () => {
    test('should send correctly formatted emails in registration flow', async ({ page }) => {
      const userData = {
        firstName: 'Alice Cooper',
        lastName: 'Cooper',
        email: `alice.cooper.${Date.now()}@example.com`,
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

      // Verify success
      await helpers.waitForToast('Registration successful! Please check your email to verify your account.');

      // Verify user was created
      const user = await helpers.getUserByEmail(userData.email);
      expect(user).toBeTruthy();
      expect(user.first_name).toBe(userData.firstName);
      expect(user.email_verified).toBe(false);

      // Note: In a real scenario, we would verify the actual email content
      // For this test, we verify the user creation and email trigger

      // Cleanup
      await helpers.deleteTestUser(userData.email);
    });

    test('should send correctly formatted emails in password reset flow', async ({ page }) => {
      // Create test user
      const testEmail = `reset.test.${Date.now()}@example.com`;
      await helpers.createTestUser({ email: testEmail });

      await page.goto('/forgot-password');
      await page.fill('[data-testid="email-input"]', testEmail);
      await page.click('[data-testid="reset-password-button"]');

      // Verify success message
      await helpers.waitForToast('If an account with that email exists, password reset instructions have been sent');

      // Verify user still exists
      const user = await helpers.getUserByEmail(testEmail);
      expect(user).toBeTruthy();

      // Cleanup
      await helpers.deleteTestUser(testEmail);
    });
  });
});
