/**
 * Password Reset API Tests
 * Comprehensive testing for password reset functionality
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');

// Set environment to test to ensure app is exported
process.env.NODE_ENV = 'production';
process.env.VERCEL = 'true';

const app = require('../../server');

describe('Password Reset API', () => {
  const testEmail = 'test@example.com';
  const testPassword = 'NewPassword123!';
  const testToken = 'test-reset-token-123456789012345678901234567890ab';

  describe('GET /api/password-reset', () => {
    it('should return password reset information', async () => {
      const response = await request(app)
        .get('/api/password-reset')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        passwordReset: {
          available: true,
          methods: ['email'],
          message: 'Password reset available'
        }
      });
    });
  });

  describe('POST /api/password-reset/request', () => {
    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/password-reset/request')
        .send({ email: 'invalid-email' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed'
      });
    });

    it('should return success even for non-existent email (security)', async () => {
      // Mock user not found
      const mockGetUserByEmailForPasswordReset = jest.fn().mockResolvedValue({
        error: new Error('User not found'),
        data: null
      });

      const databaseOperations = require('../../database/database-operations').databaseOperations;
      const originalGetUserByEmailForPasswordReset = databaseOperations.getUserByEmailForPasswordReset;
      databaseOperations.getUserByEmailForPasswordReset = mockGetUserByEmailForPasswordReset;

      const response = await request(app)
        .post('/api/password-reset/request')
        .send({ email: 'nonexistent@example.com' })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });

      // Restore original function
      databaseOperations.getUserByEmailForPasswordReset = originalGetUserByEmailForPasswordReset;
    });

    it('should create reset token for existing user', async () => {
      // Mock successful user lookup and token creation
      const mockGetUserByEmailForPasswordReset = jest.fn().mockResolvedValue({
        data: {
          id: 'test-user-id',
          email: testEmail,
          first_name: 'Test'
        }
      });

      const mockCreatePasswordResetToken = jest.fn().mockResolvedValue({
        data: { token: testToken }
      });

      const mockSendPasswordResetEmail = jest.fn().mockResolvedValue(true);

      const databaseOperations = require('../../database/database-operations').databaseOperations;
      const emailService = require('../../services/emailService');

      const originalGetUserByEmailForPasswordReset = databaseOperations.getUserByEmailForPasswordReset;
      const originalCreatePasswordResetToken = databaseOperations.createPasswordResetToken;
      const originalSendPasswordResetEmail = emailService.sendPasswordResetEmail;

      databaseOperations.getUserByEmailForPasswordReset = mockGetUserByEmailForPasswordReset;
      databaseOperations.createPasswordResetToken = mockCreatePasswordResetToken;
      emailService.sendPasswordResetEmail = mockSendPasswordResetEmail;

      const response = await request(app)
        .post('/api/password-reset/request')
        .send({ email: testEmail })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });

      expect(mockGetUserByEmailForPasswordReset).toHaveBeenCalledWith(testEmail);
      expect(mockCreatePasswordResetToken).toHaveBeenCalled();
      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(testEmail, 'Test', expect.any(String));

      // Restore original functions
      databaseOperations.getUserByEmailForPasswordReset = originalGetUserByEmailForPasswordReset;
      databaseOperations.createPasswordResetToken = originalCreatePasswordResetToken;
      emailService.sendPasswordResetEmail = originalSendPasswordResetEmail;
    });

    it('should handle token creation errors', async () => {
      // Mock user found but token creation fails
      const mockGetUserByEmailForPasswordReset = jest.fn().mockResolvedValue({
        data: {
          id: 'test-user-id',
          email: testEmail,
          first_name: 'Test'
        }
      });

      const mockCreatePasswordResetToken = jest.fn().mockResolvedValue({
        error: new Error('Token creation failed')
      });

      const databaseOperations = require('../../database/database-operations').databaseOperations;
      const originalGetUserByEmailForPasswordReset = databaseOperations.getUserByEmailForPasswordReset;
      const originalCreatePasswordResetToken = databaseOperations.createPasswordResetToken;

      databaseOperations.getUserByEmailForPasswordReset = mockGetUserByEmailForPasswordReset;
      databaseOperations.createPasswordResetToken = mockCreatePasswordResetToken;

      const response = await request(app)
        .post('/api/password-reset/request')
        .send({ email: testEmail })
        .expect(500);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Internal server error',
        message: 'Failed to process password reset request'
      });

      // Restore original functions
      databaseOperations.getUserByEmailForPasswordReset = originalGetUserByEmailForPasswordReset;
      databaseOperations.createPasswordResetToken = originalCreatePasswordResetToken;
    });
  });

  describe('POST /api/password-reset/validate', () => {
    it('should validate token format', async () => {
      const response = await request(app)
        .post('/api/password-reset/validate')
        .send({ token: 'short' })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed'
      });
    });

    it('should return invalid for non-existent token', async () => {
      // Mock token not found
      const mockGetPasswordResetToken = jest.fn().mockResolvedValue({
        error: new Error('Token not found'),
        data: null
      });

      const databaseOperations = require('../../database/database-operations').databaseOperations;
      const originalGetPasswordResetToken = databaseOperations.getPasswordResetToken;
      databaseOperations.getPasswordResetToken = mockGetPasswordResetToken;

      const response = await request(app)
        .post('/api/password-reset/validate')
        .send({ token: testToken })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        valid: false,
        message: 'Invalid or expired token'
      });

      // Restore original function
      databaseOperations.getPasswordResetToken = originalGetPasswordResetToken;
    });

    it('should validate and mark token as used', async () => {
      // Mock valid token
      const mockGetPasswordResetToken = jest.fn().mockResolvedValue({
        data: {
          token: testToken,
          user_id: 'test-user-id',
          expires_at: new Date(Date.now() + 3600000).toISOString()
        }
      });

      const mockMarkPasswordResetTokenUsed = jest.fn().mockResolvedValue({
        data: {}
      });

      const databaseOperations = require('../../database/database-operations').databaseOperations;
      const originalGetPasswordResetToken = databaseOperations.getPasswordResetToken;
      const originalMarkPasswordResetTokenUsed = databaseOperations.markPasswordResetTokenUsed;

      databaseOperations.getPasswordResetToken = mockGetPasswordResetToken;
      databaseOperations.markPasswordResetTokenUsed = mockMarkPasswordResetTokenUsed;

      const response = await request(app)
        .post('/api/password-reset/validate')
        .send({ token: testToken })
        .expect(200);

      expect(response.body).toMatchObject({
        valid: true,
        message: 'Token is valid',
        userId: 'test-user-id'
      });

      expect(mockGetPasswordResetToken).toHaveBeenCalledWith(testToken);
      expect(mockMarkPasswordResetTokenUsed).toHaveBeenCalledWith(testToken);

      // Restore original functions
      databaseOperations.getPasswordResetToken = originalGetPasswordResetToken;
      databaseOperations.markPasswordResetTokenUsed = originalMarkPasswordResetTokenUsed;
    });
  });

  describe('POST /api/password-reset/reset', () => {
    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/password-reset/reset')
        .send({ token: testToken })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed'
      });
    });

    it('should validate password strength', async () => {
      const response = await request(app)
        .post('/api/password-reset/reset')
        .send({ 
          token: testToken,
          password: 'weak'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Validation failed'
      });
    });

    it('should reset password successfully', async () => {
      // Mock valid token and successful password update
      const mockGetPasswordResetToken = jest.fn().mockResolvedValue({
        data: {
          token: testToken,
          user_id: 'test-user-id',
          expires_at: new Date(Date.now() + 3600000).toISOString()
        }
      });

      const mockUpdateUserPassword = jest.fn().mockResolvedValue({
        data: { id: 'test-user-id' }
      });

      const mockMarkPasswordResetTokenUsed = jest.fn().mockResolvedValue({
        data: {}
      });

      const databaseOperations = require('../../database/database-operations').databaseOperations;
      const originalGetPasswordResetToken = databaseOperations.getPasswordResetToken;
      const originalUpdateUserPassword = databaseOperations.updateUserPassword;
      const originalMarkPasswordResetTokenUsed = databaseOperations.markPasswordResetTokenUsed;

      databaseOperations.getPasswordResetToken = mockGetPasswordResetToken;
      databaseOperations.updateUserPassword = mockUpdateUserPassword;
      databaseOperations.markPasswordResetTokenUsed = mockMarkPasswordResetTokenUsed;

      const response = await request(app)
        .post('/api/password-reset/reset')
        .send({ 
          token: testToken,
          password: testPassword
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Password has been reset successfully'
      });

      expect(mockGetPasswordResetToken).toHaveBeenCalledWith(testToken);
      expect(mockUpdateUserPassword).toHaveBeenCalledWith('test-user-id', expect.any(String));
      expect(mockMarkPasswordResetTokenUsed).toHaveBeenCalledWith(testToken);

      // Verify password was hashed
      const hashedPassword = mockUpdateUserPassword.mock.calls[0][1];
      const isValidHash = await bcrypt.compare(testPassword, hashedPassword);
      expect(isValidHash).toBe(true);

      // Restore original functions
      databaseOperations.getPasswordResetToken = originalGetPasswordResetToken;
      databaseOperations.updateUserPassword = originalUpdateUserPassword;
      databaseOperations.markPasswordResetTokenUsed = originalMarkPasswordResetTokenUsed;
    });
  });
});
