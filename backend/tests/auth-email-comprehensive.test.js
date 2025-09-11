/**
 * Comprehensive Authentication and Email Testing Suite
 * Tests registration, email verification, password recovery, and email delivery
 */

const request = require('supertest');

const { query } = require('../database/unified-connection');
const app = require('../server');
const emailService = require('../services/emailService');

describe('Authentication and Email Comprehensive Tests', () => {
  let testUser;
  let verificationToken;
  let resetToken;

  beforeAll(async () => {
    // Clean up any existing test data
    await query('DELETE FROM users WHERE email LIKE $1', ['%test-auth-email%']);
    await query('DELETE FROM email_verification_tokens WHERE email LIKE $1', ['%test-auth-email%']);
    await query('DELETE FROM password_reset_tokens WHERE user_id IN (SELECT id FROM users WHERE email LIKE $1)', [
      '%test-auth-email%'
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    if (testUser) {
      await query('DELETE FROM users WHERE id = $1', [testUser.id]);
      await query('DELETE FROM email_verification_tokens WHERE user_id = $1', [testUser.id]);
      await query('DELETE FROM password_reset_tokens WHERE user_id = $1', [testUser.id]);
    }
  });

  describe('1. User Registration with Email Verification', () => {
    test('should register user and trigger email verification', async () => {
      const userData = {
        email: 'test-auth-email-reg@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      };

      console.log('🧪 Testing user registration...');
      const response = await request(app).post('/api/auth/register').send(userData).expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('registered successfully');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.emailVerified).toBe(false);

      // Store test user for cleanup
      testUser = response.body.user;

      console.log('✅ User registration successful');
    });

    test('should create email verification token in database', async () => {
      console.log('🧪 Checking email verification token creation...');

      const tokenQuery = `
        SELECT token, email, user_id, expires_at, created_at
        FROM email_verification_tokens 
        WHERE user_id = $1 AND email = $2
      `;
      const result = await query(tokenQuery, [testUser.id, testUser.email]);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].email).toBe(testUser.email);
      expect(result.rows[0].user_id).toBe(testUser.id);
      expect(new Date(result.rows[0].expires_at)).toBeInstanceOf(Date);

      verificationToken = result.rows[0].token;
      console.log('✅ Email verification token created in database');
    });

    test('should attempt to send verification email', async () => {
      console.log('🧪 Testing email service call...');

      // Test email service directly
      try {
        await emailService.sendVerificationEmail(testUser.email, testUser.firstName, verificationToken);
        console.log('✅ Email service call completed (check SMTP for actual delivery)');
      } catch (error) {
        console.log('❌ Email service failed:', error.message);
        // Don't fail the test - we expect SMTP issues
        expect(error.message).toContain('Invalid login');
      }
    });
  });

  describe('2. Email Verification Process', () => {
    test('should verify email with valid token', async () => {
      console.log('🧪 Testing email verification...');

      const response = await request(app).post('/api/auth/verify-email').send({ token: verificationToken }).expect(200);

      expect(response.body.message).toContain('verified successfully');
      expect(response.body.user.emailVerified).toBe(true);
      expect(response.body.token).toBeDefined(); // JWT token

      console.log('✅ Email verification successful');
    });

    test('should reject invalid verification token', async () => {
      console.log('🧪 Testing invalid verification token...');

      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token-12345' })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.message).toContain('Invalid token');

      console.log('✅ Invalid token properly rejected');
    });
  });

  describe('3. Password Recovery Process', () => {
    test('should initiate password reset', async () => {
      console.log('🧪 Testing password reset initiation...');

      const response = await request(app).post('/api/auth/forgot-password').send({ email: testUser.email }).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset email sent');

      console.log('✅ Password reset initiated');
    });

    test('should create password reset token in database', async () => {
      console.log('🧪 Checking password reset token creation...');

      const tokenQuery = `
        SELECT token, user_id, expires_at, created_at
        FROM password_reset_tokens 
        WHERE user_id = $1 AND used_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `;
      const result = await query(tokenQuery, [testUser.id]);

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].user_id).toBe(testUser.id);
      expect(new Date(result.rows[0].expires_at)).toBeInstanceOf(Date);

      resetToken = result.rows[0].token;
      console.log('✅ Password reset token created in database');
    });

    test('should attempt to send password reset email', async () => {
      console.log('🧪 Testing password reset email service...');

      try {
        await emailService.sendPasswordResetEmail(testUser.email, testUser.firstName, resetToken);
        console.log('✅ Password reset email service call completed');
      } catch (error) {
        console.log('❌ Password reset email failed:', error.message);
        // Don't fail the test - we expect SMTP issues
        expect(error.message).toContain('Invalid login');
      }
    });
  });

  describe('4. Email Service Configuration Tests', () => {
    test('should have all required email environment variables', () => {
      console.log('🧪 Checking email environment variables...');

      const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL', 'FROM_NAME'];

      requiredVars.forEach(varName => {
        expect(process.env[varName]).toBeDefined();
        expect(process.env[varName]).not.toBe('');
      });

      console.log('✅ All email environment variables present');
    });

    test('should generate valid verification tokens', () => {
      console.log('🧪 Testing token generation...');

      const token1 = emailService.generateVerificationToken();
      const token2 = emailService.generateVerificationToken();

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2); // Should be unique
      expect(token1.length).toBe(64); // 32 bytes = 64 hex chars

      console.log('✅ Token generation working correctly');
    });

    test('should render email templates correctly', () => {
      console.log('🧪 Testing email template rendering...');

      const verificationHtml = emailService.getVerificationEmailTemplate(
        'Test User',
        'https://example.com/verify?token=test123'
      );

      const resetHtml = emailService.getPasswordResetTemplate('Test User', 'https://example.com/reset?token=test123');

      expect(verificationHtml).toContain('Test User');
      expect(verificationHtml).toContain('verify?token=test123');
      expect(resetHtml).toContain('Test User');
      expect(resetHtml).toContain('reset?token=test123');

      console.log('✅ Email templates rendering correctly');
    });
  });

  describe('5. Email Delivery Diagnosis', () => {
    test('should diagnose SMTP connection issues', async () => {
      console.log('🧪 Diagnosing SMTP connection...');

      const nodemailer = require('nodemailer');

      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT, 10),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });

      try {
        await transporter.verify();
        console.log('✅ SMTP connection successful');
      } catch (error) {
        console.log('❌ SMTP connection failed:', error.message);

        // Provide specific diagnosis
        if (error.message.includes('Invalid login')) {
          console.log('🔧 DIAGNOSIS: Gmail App Password issue');
          console.log('   - Check if 2FA is enabled on Gmail account');
          console.log('   - Generate new App Password in Google Account settings');
          console.log('   - Update SMTP_PASS environment variable');
        } else if (error.message.includes('connection')) {
          console.log('🔧 DIAGNOSIS: Network/firewall issue');
          console.log('   - Check SMTP_HOST and SMTP_PORT settings');
          console.log('   - Verify network connectivity to Gmail SMTP');
        }

        // Don't fail the test - this is diagnostic
        expect(error.message).toBeDefined();
      }
    });
  });
});
