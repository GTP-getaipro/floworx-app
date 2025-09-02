const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../database/connection');
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
      const userQuery =
        'SELECT id, email, first_name, failed_login_attempts, account_locked_until FROM users WHERE email = $1';
      const userResult = await pool.query(userQuery, [email.toLowerCase()]);

      if (userResult.rows.length === 0) {
        // Don't reveal if email exists - return success for security
        return {
          success: true,
          message: 'If an account with this email exists, you will receive a password reset link.',
          emailSent: false
        };
      }

      const user = userResult.rows[0];

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
      const recentAttemptsQuery = `
        SELECT COUNT(*) as attempt_count 
        FROM password_reset_tokens 
        WHERE user_id = $1 AND created_at > $2
      `;
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const attemptsResult = await pool.query(recentAttemptsQuery, [user.id, oneHourAgo]);

      if (parseInt(attemptsResult.rows[0].attempt_count) >= this.maxResetAttempts) {
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
      const insertTokenQuery = `
        INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      await pool.query(insertTokenQuery, [user.id, resetToken, expiresAt, ipAddress, userAgent]);

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
      const tokenQuery = `
        SELECT prt.*, u.email, u.first_name 
        FROM password_reset_tokens prt
        JOIN users u ON prt.user_id = u.id
        WHERE prt.token = $1 AND prt.used = false AND prt.expires_at > CURRENT_TIMESTAMP
      `;
      const tokenResult = await pool.query(tokenQuery, [token]);

      if (tokenResult.rows.length === 0) {
        return {
          valid: false,
          error: 'Invalid or expired token',
          message: 'This password reset link is invalid or has expired.'
        };
      }

      const tokenData = tokenResult.rows[0];

      return {
        valid: true,
        userId: tokenData.user_id,
        email: tokenData.email,
        firstName: tokenData.first_name,
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

      // Begin transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Update user password
        const updatePasswordQuery = `
          UPDATE users 
          SET password_hash = $1, 
              last_password_reset = CURRENT_TIMESTAMP,
              failed_login_attempts = 0,
              account_locked_until = NULL
          WHERE id = $2
        `;
        await client.query(updatePasswordQuery, [passwordHash, tokenVerification.userId]);

        // Mark token as used
        const markTokenUsedQuery = `
          UPDATE password_reset_tokens 
          SET used = true, used_at = CURRENT_TIMESTAMP 
          WHERE token = $1
        `;
        await client.query(markTokenUsedQuery, [token]);

        // Invalidate all other reset tokens for this user
        const invalidateTokensQuery = `
          UPDATE password_reset_tokens 
          SET used = true, used_at = CURRENT_TIMESTAMP 
          WHERE user_id = $1 AND used = false AND token != $2
        `;
        await client.query(invalidateTokensQuery, [tokenVerification.userId, token]);

        await client.query('COMMIT');

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
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
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
      const logQuery = `
        INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address, user_agent, success, details)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      await pool.query(logQuery, [
        userId,
        action,
        resourceType,
        resourceId,
        ipAddress,
        userAgent,
        success,
        JSON.stringify(details)
      ]);
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
      const cleanupQuery = 'SELECT cleanup_expired_tokens()';
      const result = await pool.query(cleanupQuery);
      return result.rows[0].cleanup_expired_tokens;
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
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Get current user data
        const userQuery = `
          SELECT id, email, failed_login_attempts, account_locked_until, last_failed_login
          FROM users
          WHERE email = $1
        `;
        const userResult = await client.query(userQuery, [email.toLowerCase()]);

        if (userResult.rows.length === 0) {
          return { success: true, accountLocked: false }; // Don't reveal if user exists
        }

        const user = userResult.rows[0];
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

        // Update user record
        const updateQuery = `
          UPDATE users
          SET failed_login_attempts = $1,
              account_locked_until = $2,
              last_failed_login = $3,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `;
        await client.query(updateQuery, [failedAttempts, lockoutUntil, now, user.id]);

        // Log security event
        await this.logSecurityEvent(
          client,
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
            accountLocked: !!lockoutUntil,
            lockoutUntil
          }
        );

        await client.query('COMMIT');

        return {
          success: true,
          accountLocked: !!lockoutUntil,
          failedAttempts,
          lockoutUntil,
          remainingAttempts: Math.max(0, this.maxFailedLogins - failedAttempts)
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
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
      const userQuery = `
        SELECT id, email, failed_login_attempts, account_locked_until
        FROM users
        WHERE email = $1
      `;
      const userResult = await pool.query(userQuery, [email.toLowerCase()]);

      if (userResult.rows.length === 0) {
        return { locked: false, exists: false };
      }

      const user = userResult.rows[0];
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
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Reset failed login attempts and remove lockout
        const updateQuery = `
          UPDATE users
          SET failed_login_attempts = 0,
              account_locked_until = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING email
        `;
        const result = await client.query(updateQuery, [userId]);

        if (result.rows.length === 0) {
          throw new Error('User not found');
        }

        // Log security event
        await this.logSecurityEvent(client, userId, 'account_unlocked', 'user', userId, null, null, true, {
          reason,
          adminId,
          email: result.rows[0].email
        });

        await client.query('COMMIT');

        return {
          success: true,
          message: 'Account unlocked successfully',
          email: result.rows[0].email
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
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
      const updateQuery = `
        UPDATE users
        SET failed_login_attempts = 0,
            account_locked_until = NULL,
            last_successful_login = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;
      await pool.query(updateQuery, [userId]);

      return { success: true };
    } catch (error) {
      console.error('Reset failed login attempts error:', error);
      throw new Error('Failed to reset failed login attempts');
    }
  }

  /**
   * Log security event
   * @private
   */
  async logSecurityEvent(client, userId, action, resourceType, resourceId, ipAddress, userAgent, success, details) {
    try {
      const logQuery = `
        INSERT INTO security_audit_log (user_id, action, resource_type, resource_id, ip_address, user_agent, success, details)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      await client.query(logQuery, [
        userId,
        action,
        resourceType,
        resourceId,
        ipAddress,
        userAgent,
        success,
        JSON.stringify(details)
      ]);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }
}

module.exports = new PasswordResetService();
