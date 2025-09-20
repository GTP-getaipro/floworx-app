const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { databaseOperations } = require('../database/database-operations');
const emailService = require('./emailService');
const { getTokenTTLMs } = require('../config/authConfig');

class PasswordResetService {
  constructor() {
    // Use centralized configuration for token expiry
    this.tokenExpiry = getTokenTTLMs('passwordResetTTL');
  }

  /**
   * Generate secure password reset token
   * @returns {string} Secure random token
   */
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Initiate password reset process
   * @param {string} email - User email address
   * @param {string} ipAddress - Client IP address
   * @param {string} userAgent - Client user agent
   * @returns {Object} Result object
   */
  async initiatePasswordReset(email, ipAddress = null, userAgent = null) {
    try {
      // Find user by email
      const userResult = await databaseOperations.getUserByEmailForPasswordReset(email.toLowerCase());

      if (!userResult || !userResult.data) {
        // Don't reveal if email exists - return success for security
        return {
          success: true,
          message: 'If an account with this email exists, you will receive a password reset link.',
          emailSent: false
        };
      }

      const user = userResult.data;

      // Check if account is locked (simplified check)
      if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
        return {
          success: false,
          error: 'Account locked',
          message: 'Account is temporarily locked. Please try again later.',
          lockedUntil: user.account_locked_until
        };
      }

      // Generate reset token
      const resetToken = this.generateResetToken();
      const expiresAt = new Date(Date.now() + this.tokenExpiry);

      // Store reset token
      const tokenResult = await databaseOperations.createPasswordResetToken(
        user.id,
        resetToken,
        expiresAt
      );

      if (!tokenResult || tokenResult.error || !tokenResult.data) {
        throw new Error('Failed to create reset token');
      }

      // Send reset email
      let emailSent = false;
      try {
        const resetUrl = `${process.env.FRONTEND_URL || 'https://app.floworx-iq.com'}/reset-password?token=${resetToken}`;
        await emailService.sendPasswordResetEmail(user.email, resetUrl);
        emailSent = true;
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Continue - token is created, user can still reset if they have the token
      }

      return {
        success: true,
        message: 'Password reset link has been sent to your email address.',
        emailSent,
        expiresIn: this.tokenExpiry / 1000 / 60 // minutes
      };
    } catch (error) {
      console.error('Password reset initiation error:', error);
      return {
        success: false,
        error: 'Internal error',
        message: 'Unable to process password reset request'
      };
    }
  }

  /**
   * Verify password reset token
   * @param {string} token - Reset token
   * @returns {Object} Verification result
   */
  async verifyResetToken(token) {
    try {
      const tokenResult = await databaseOperations.getPasswordResetToken(token);

      if (!tokenResult || !tokenResult.data) {
        return {
          valid: false,
          error: 'Invalid or expired token',
          message: 'This password reset link is invalid or has expired.'
        };
      }

      const tokenData = tokenResult.data;

      // Check if token is expired
      if (new Date(tokenData.expires_at) <= new Date()) {
        return {
          valid: false,
          error: 'Token expired',
          message: 'The password reset token has expired. Please request a new one.'
        };
      }

      // Check if token has been used
      if (tokenData.used_at) {
        return {
          valid: false,
          error: 'Token already used',
          message: 'This password reset token has already been used.'
        };
      }

      return {
        valid: true,
        userId: tokenData.user_id,
        email: tokenData.users?.email || tokenData.email,
        firstName: tokenData.users?.first_name || tokenData.first_name,
        expiresAt: tokenData.expires_at
      };
    } catch (error) {
      console.error('Token verification error:', error);
      return {
        valid: false,
        error: 'Verification failed',
        message: 'Unable to verify the password reset token.'
      };
    }
  }

  /**
   * Reset user password
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @param {string} ipAddress - Client IP address
   * @param {string} userAgent - Client user agent
   * @returns {Object} Reset result
   */
  async resetPassword(token, newPassword, ipAddress = null, userAgent = null) {
    try {
      // Verify token first
      const tokenVerification = await this.verifyResetToken(token);
      if (!tokenVerification.valid) {
        return {
          success: false,
          error: tokenVerification.error,
          message: tokenVerification.message
        };
      }

      // Validate password strength
      const passwordValidation = this.validatePassword(newPassword);
      if (!passwordValidation.valid) {
        return {
          success: false,
          error: 'Invalid password',
          message: passwordValidation.message,
          requirements: passwordValidation.requirements
        };
      }

      // Hash new password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update user password
      const passwordUpdateResult = await databaseOperations.updateUserPassword(tokenVerification.userId, passwordHash);
      if (!passwordUpdateResult || !passwordUpdateResult.success) {
        throw new Error('Failed to update password');
      }

      // Mark token as used
      const tokenUpdateResult = await databaseOperations.markPasswordResetTokenUsed(token);
      if (!tokenUpdateResult || !tokenUpdateResult.success) {
        console.warn('Failed to mark token as used, but password was updated');
      }

      return {
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new password.'
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: 'Reset failed',
        message: 'Unable to reset password. Please try again.'
      };
    }
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  validatePassword(password) {
    const requirements = {
      minLength: 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password)
    };

    const isValid = password.length >= requirements.minLength &&
                   requirements.hasUppercase &&
                   requirements.hasLowercase &&
                   requirements.hasNumber &&
                   requirements.hasSpecialChar;

    return {
      valid: isValid,
      message: isValid ? 'Password meets all requirements' : 'Password does not meet security requirements',
      requirements
    };
  }
}

module.exports = new PasswordResetService();