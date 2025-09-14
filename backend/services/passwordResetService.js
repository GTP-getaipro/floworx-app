const crypto = require('crypto');

const bcrypt = require('bcryptjs');

const { databaseOperations } = require('../database/database-operations');

const emailService = require('./emailService');

class PasswordResetService {
  constructor() {
    this.tokenExpiry = 60 * 60 * 1000; // 1 hour in milliseconds
    this.maxResetAttempts = 5; // Max reset attempts per hour
    this.lockoutDuration = 60 * 60 * 1000; // 1 hour lockout
    this.maxFailedLogins = 5; // Max failed login attempts before lockout
    this.accountLockoutDuration = 15 * 60 * 1000; // 15 minutes account lockout
    this.progressiveLockoutMultiplier = 2; // Multiplier for progressive lockout
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
      const userResult = await databaseOperations.getUserWithSecurityInfo(email.toLowerCase());

      if (!userResult.success || !userResult.data) {
        // Don't reveal if email exists - return success for security
        return {
          success: true,
          message: 'If an account with this email exists, you will receive a password reset link.',
          emailSent: false
        };
      }

      const user = userResult.data;

      // Check if account is locked
      if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
        return {
          success: false,
          error: 'Account temporarily locked',
          message: 'Too many failed attempts. Please try again later.',
          lockedUntil: user.account_locked_until
        };
      }

      // Check rate limiting - max 5 reset attempts per hour
      const attemptsResult = await databaseOperations.getPasswordResetAttemptCount(user.id, this.maxResetAttempts);

      if (!attemptsResult.success) {
        throw new Error('Failed to check reset attempt count');
      }

      if (attemptsResult.rateLimited) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many password reset attempts. Please try again in an hour.',
          rateLimited: true
        };
      }

      // Generate reset token
      const resetToken = this.generateResetToken();
      const expiresAt = new Date(Date.now() + this.tokenExpiry);

      // Store reset token
      const tokenResult = await databaseOperations.createPasswordResetToken(
        user.id,
        resetToken,
        expiresAt,
        ipAddress,
        userAgent
      );

      if (!tokenResult.success) {
        throw new Error('Failed to create password reset token');
      }

      // Send password reset email
      await this.sendPasswordResetEmail(user.email, user.first_name, resetToken);

      // Log security event
      await this.logSecurityEvent(user.id, 'password_reset_requested', 'user', user.id, ipAddress, userAgent, true, {
        email: user.email,
        tokenExpiry: expiresAt
      });

      return {
        success: true,
        message: 'Password reset link sent to your email address.',
        emailSent: true,
        expiresIn: this.tokenExpiry / 1000 / 60 // minutes
      };
    } catch (error) {
      console.error('Password reset initiation error:', error);
      throw new Error('Failed to initiate password reset');
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

      if (!tokenResult.data) {
        return {
          valid: false,
          error: 'Invalid or expired token',
          message: 'This password reset link is invalid or has expired.'
        };
      }

      const tokenData = tokenResult.data;

      return {
        valid: true,
        userId: tokenData.user_id,
        email: tokenData.users?.email || tokenData.email,
        firstName: tokenData.users?.first_name || tokenData.first_name,
        expiresAt: tokenData.expires_at
      };
    } catch (error) {
      console.error('Token verification error:', error);
      throw new Error('Failed to verify reset token');
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
        return tokenVerification;
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
      if (!passwordUpdateResult.success) {
        throw new Error('Failed to update password');
      }

      // Mark token as used
      const tokenUpdateResult = await databaseOperations.markPasswordResetTokenUsed(token);
      if (!tokenUpdateResult.success) {
        throw new Error('Failed to mark token as used');
      }

      // Invalidate all other reset tokens for this user
      const invalidateResult = await databaseOperations.invalidateUserPasswordResetTokens(tokenVerification.userId, token);
      if (!invalidateResult.success) {
        console.warn('Failed to invalidate other tokens, but continuing...');
      }

        // Log security event
        await this.logSecurityEvent(
          tokenVerification.userId,
          'password_reset_completed',
          'user',
          tokenVerification.userId,
          ipAddress,
          userAgent,
          true,
          {
            email: tokenVerification.email
          }
        );

        // Send confirmation email
        await this.sendPasswordResetConfirmationEmail(tokenVerification.email, tokenVerification.firstName);

        return {
          success: true,
          message: 'Password reset successfully. You can now log in with your new password.',
          userId: tokenVerification.userId
        };
    } catch (error) {
      console.error('Password reset error:', error);

      // Log failed attempt
      if (token) {
        const tokenData = await this.verifyResetToken(token);
        if (tokenData.valid) {
          await this.logSecurityEvent(
            tokenData.userId,
            'password_reset_failed',
            'user',
            tokenData.userId,
            ipAddress,
            userAgent,
            false,
            {
              error: error.message
            }
          );
        }
      }

      throw new Error('Failed to reset password');
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
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const isValid =
      password.length >= requirements.minLength &&
      requirements.hasUpperCase &&
      requirements.hasLowerCase &&
      requirements.hasNumbers;

    return {
      valid: isValid,
      requirements,
      message: isValid
        ? 'Password meets requirements'
        : 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers'
    };
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @param {string} firstName - User first name
   * @param {string} token - Reset token
   */
  async sendPasswordResetEmail(email, firstName, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const expiryMinutes = this.tokenExpiry / 1000 / 60;

    await emailService.sendEmail({
      to: email,
      subject: 'Reset Your Floworx Password',
      template: 'password-reset',
      data: {
        firstName,
        resetUrl,
        expiryMinutes
      }
    });
  }

  /**
   * Send password reset confirmation email
   * @param {string} email - User email
   * @param {string} firstName - User first name
   */
  async sendPasswordResetConfirmationEmail(email, firstName) {
    await emailService.sendEmail({
      to: email,
      subject: 'Your Floworx Password Has Been Reset',
      template: 'password-reset-confirmation',
      data: {
        firstName,
        loginUrl: `${process.env.FRONTEND_URL}/login`
      }
    });
  }

  /**
   * Log security event
   * @param {string} userId - User ID
   * @param {string} action - Action performed
   * @param {string} resourceType - Resource type
   * @param {string} resourceId - Resource ID
   * @param {string} ipAddress - IP address
   * @param {string} userAgent - User agent
   * @param {boolean} success - Success status
   * @param {Object} details - Additional details
   */
  async logSecurityEvent(userId, action, resourceType, resourceId, ipAddress, userAgent, success, details) {
    try {
      const result = await databaseOperations.logSecurityEvent(
        userId,
        action,
        resourceType,
        resourceId,
        ipAddress,
        userAgent,
        success,
        details
      );
      if (!result.success) {
        console.warn('Failed to log security event:', result.error);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw - logging failure shouldn't break the main flow
    }
  }

  /**
   * Clean up expired tokens
   * @returns {number} Number of tokens cleaned up
   */
  async cleanupExpiredTokens() {
    try {
      const result = await databaseOperations.cleanupExpiredTokens();
      return result.success ? result.count : 0;
    } catch (error) {
      console.error('Token cleanup error:', error);
      return 0;
    }
  }

  /**
   * Handle failed login attempt and implement progressive lockout
   * @param {string} email - User email address
   * @param {string} ipAddress - Client IP address
   * @param {string} userAgent - Client user agent
   * @returns {Object} Result object with lockout information
   */
  async handleFailedLogin(email, ipAddress = null, userAgent = null) {
    try {
      // Use database operations instead of direct pool connection
      const userResult = await databaseOperations.getUserWithSecurityInfo(email.toLowerCase());
      if (!userResult.success || !userResult.data) {
        return { success: false, error: 'User not found' };
      }

      const user = userResult.data;
      const now = new Date();
      let failedAttempts = (user.failed_login_attempts || 0) + 1;
      let lockoutUntil = null;

      // Check if we should reset failed attempts (after successful login or lockout expiry)
      if (user.account_locked_until && new Date(user.account_locked_until) <= now) {
        failedAttempts = 1; // Reset to 1 for this new failed attempt
      }

      // Calculate lockout duration with progressive increase
      if (failedAttempts >= this.maxFailedLogins) {
        const lockoutMultiplier = Math.pow(
          this.progressiveLockoutMultiplier,
          Math.floor(failedAttempts / this.maxFailedLogins) - 1
        );
        const lockoutDuration = this.accountLockoutDuration * lockoutMultiplier;
        lockoutUntil = new Date(now.getTime() + lockoutDuration);
      }

      // Update user security info
      const updateResult = await databaseOperations.updateUserSecurityInfo(user.id, {
        failed_login_attempts: failedAttempts,
        account_locked_until: lockoutUntil ? lockoutUntil.toISOString() : null,
        last_failed_login: now.toISOString()
      });

      if (!updateResult.success) {
        throw new Error('Failed to update user security info');
      }

      // Log security event
      await databaseOperations.logSecurityEvent(
        user.id,
        'failed_login_attempt',
        'user',
        user.id,
        ipAddress,
        userAgent,
        false,
        {
          email: user.email,
          failedAttempts,
          accountLocked: Boolean(lockoutUntil),
          lockoutUntil
        }
      );

      return {
        success: true,
        accountLocked: Boolean(lockoutUntil),
        failedAttempts,
        lockoutUntil,
        remainingAttempts: Math.max(0, this.maxFailedLogins - failedAttempts)
      };
    } catch (error) {
      console.error('Failed login handling error:', error);
      throw new Error('Failed to process login attempt');
    }
  }

  /**
   * Check if account is currently locked
   * @param {string} email - User email address
   * @returns {Object} Lockout status
   */
  async checkAccountLockout(email) {
    try {
      const userResult = await databaseOperations.getUserWithSecurityInfo(email.toLowerCase());

      if (!userResult.success || !userResult.data) {
        return { locked: false, exists: false };
      }

      const user = userResult.data;
      const now = new Date();
      const lockedUntil = user.account_locked_until ? new Date(user.account_locked_until) : null;

      if (lockedUntil && lockedUntil > now) {
        return {
          locked: true,
          exists: true,
          lockedUntil,
          remainingTime: Math.ceil((lockedUntil - now) / 1000 / 60), // minutes
          failedAttempts: user.failed_login_attempts
        };
      }

      return {
        locked: false,
        exists: true,
        failedAttempts: user.failed_login_attempts || 0
      };
    } catch (error) {
      console.error('Account lockout check error:', error);
      throw new Error('Failed to check account lockout status');
    }
  }

  /**
   * Unlock account (admin function or after successful recovery)
   * @param {string} userId - User ID
   * @param {string} reason - Reason for unlock
   * @param {string} adminId - Admin user ID (if applicable)
   * @returns {Object} Result object
   */
  async unlockAccount(userId, reason = 'manual_unlock', adminId = null) {
    try {
      // Reset failed login attempts and remove lockout
      const updateResult = await databaseOperations.updateUserSecurityInfo(userId, {
        failed_login_attempts: 0,
        account_locked_until: null
      });

      if (!updateResult.success) {
        throw new Error('Failed to unlock account');
      }

      // Get user email for logging
      const userResult = await databaseOperations.getUserById(userId);
      if (!userResult.data) {
        throw new Error('User not found');
      }

      // Log security event
      await databaseOperations.logSecurityEvent(
        userId,
        'account_unlocked',
        'user',
        userId,
        null,
        null,
        true,
        {
          reason,
          adminId,
          email: userResult.data.email
        }
      );

      return {
        success: true,
        message: 'Account unlocked successfully',
        email: userResult.data.email
      };
    } catch (error) {
      console.error('Account unlock error:', error);
      throw new Error('Failed to unlock account');
    }
  }

  /**
   * Reset failed login attempts after successful login
   * @param {string} userId - User ID
   * @returns {Object} Result object
   */
  async resetFailedLoginAttempts(userId) {
    try {
      const result = await databaseOperations.updateUserSecurityInfo(userId, {
        failed_login_attempts: 0,
        account_locked_until: null,
        last_successful_login: new Date().toISOString()
      });

      return { success: result.success };
    } catch (error) {
      console.error('Reset failed login attempts error:', error);
      throw new Error('Failed to reset failed login attempts');
    }
  }

}

module.exports = new PasswordResetService();
