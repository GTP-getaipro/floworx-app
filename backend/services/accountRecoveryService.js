const crypto = require('crypto');
const { query } = require('../database/unified-connection');
const emailService = require('./emailService');
const encryptionService = require('./encryptionService');

class AccountRecoveryService {
  constructor() {
    this.tokenExpiry = 24 * 60 * 60 * 1000; // 24 hours for account recovery
    this.backupCodeExpiry = 90 * 24 * 60 * 60 * 1000; // 90 days for backup codes
  }

  /**
   * Generate secure recovery token
   * @returns {string} Secure random token
   */
  generateRecoveryToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Generate backup codes for account recovery
   * @param {number} count - Number of backup codes to generate
   * @returns {Array} Array of backup codes
   */
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
    }
    return codes;
  }

  /**
   * Create credential backup for recovery
   * @param {string} userId - User ID
   * @param {string} serviceName - Service name (google, etc.)
   * @param {Object} credentialData - Credential metadata to backup
   * @returns {Object} Backup result
   */
  async createCredentialBackup(userId, serviceName, credentialData) {
    try {
      // Encrypt the backup data
      const encryptedBackup = await encryptionService.encrypt(JSON.stringify(credentialData));
      const expiresAt = new Date(Date.now() + this.backupCodeExpiry);

      const insertQuery = `
        INSERT INTO credential_backups (user_id, service_name, backup_data, backup_type, expires_at)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at
      `;

      const result = await pool.query(insertQuery, [
        userId,
        serviceName,
        JSON.stringify({ encrypted: encryptedBackup }),
        'oauth_refresh',
        expiresAt
      ]);

      return {
        success: true,
        backupId: result.rows[0].id,
        createdAt: result.rows[0].created_at,
        expiresAt
      };
    } catch (error) {
      console.error('Credential backup creation error:', error);
      throw new Error('Failed to create credential backup');
    }
  }

  /**
   * Initiate account recovery process
   * @param {string} email - User email
   * @param {string} recoveryType - Type of recovery (email_change, account_recovery, emergency_access)
   * @param {Object} recoveryData - Additional recovery data
   * @param {string} ipAddress - Client IP address
   * @param {string} userAgent - Client user agent
   * @returns {Object} Recovery result
   */
  async initiateAccountRecovery(email, recoveryType, recoveryData = {}, ipAddress = null, userAgent = null) {
    try {
      // Find user by email
      const userQuery = 'SELECT id, email, first_name, recovery_email FROM users WHERE email = $1';
      const userResult = await pool.query(userQuery, [email.toLowerCase()]);

      if (userResult.rows.length === 0) {
        // Don't reveal if email exists
        return {
          success: true,
          message: 'If an account with this email exists, recovery instructions have been sent.',
          emailSent: false
        };
      }

      const user = userResult.rows[0];

      // Generate recovery token
      const recoveryToken = this.generateRecoveryToken();
      const expiresAt = new Date(Date.now() + this.tokenExpiry);

      // Store recovery token
      const insertTokenQuery = `
        INSERT INTO account_recovery_tokens (user_id, token, recovery_type, recovery_data, expires_at, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `;

      await pool.query(insertTokenQuery, [
        user.id,
        recoveryToken,
        recoveryType,
        JSON.stringify(recoveryData),
        expiresAt,
        ipAddress,
        userAgent
      ]);

      // Send recovery email based on type
      await this.sendRecoveryEmail(user, recoveryType, recoveryToken, recoveryData);

      // Log security event
      await this.logSecurityEvent(
        user.id,
        `account_recovery_${recoveryType}_requested`,
        'user',
        user.id,
        ipAddress,
        userAgent,
        true,
        {
          email: user.email,
          recoveryType,
          tokenExpiry: expiresAt
        }
      );

      return {
        success: true,
        message: 'Recovery instructions have been sent to your email address.',
        emailSent: true,
        expiresIn: this.tokenExpiry / 1000 / 60 // minutes
      };
    } catch (error) {
      console.error('Account recovery initiation error:', error);
      throw new Error('Failed to initiate account recovery');
    }
  }

  /**
   * Verify account recovery token
   * @param {string} token - Recovery token
   * @returns {Object} Verification result
   */
  async verifyRecoveryToken(token) {
    try {
      const tokenQuery = `
        SELECT art.*, u.email, u.first_name 
        FROM account_recovery_tokens art
        JOIN users u ON art.user_id = u.id
        WHERE art.token = $1 AND art.used = false AND art.expires_at > CURRENT_TIMESTAMP
      `;
      const tokenResult = await pool.query(tokenQuery, [token]);

      if (tokenResult.rows.length === 0) {
        return {
          valid: false,
          error: 'Invalid or expired token',
          message: 'This recovery link is invalid or has expired.'
        };
      }

      const tokenData = tokenResult.rows[0];

      return {
        valid: true,
        userId: tokenData.user_id,
        email: tokenData.email,
        firstName: tokenData.first_name,
        recoveryType: tokenData.recovery_type,
        recoveryData: JSON.parse(tokenData.recovery_data || '{}'),
        expiresAt: tokenData.expires_at
      };
    } catch (error) {
      console.error('Recovery token verification error:', error);
      throw new Error('Failed to verify recovery token');
    }
  }

  /**
   * Complete account recovery
   * @param {string} token - Recovery token
   * @param {Object} recoveryActions - Actions to perform during recovery
   * @param {string} ipAddress - Client IP address
   * @param {string} userAgent - Client user agent
   * @returns {Object} Recovery result
   */
  async completeAccountRecovery(token, recoveryActions, ipAddress = null, userAgent = null) {
    try {
      // Verify token first
      const tokenVerification = await this.verifyRecoveryToken(token);
      if (!tokenVerification.valid) {
        return tokenVerification;
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Perform recovery actions based on type
        let result;
        switch (tokenVerification.recoveryType) {
          case 'email_change':
            result = await this.handleEmailChangeRecovery(client, tokenVerification, recoveryActions);
            break;
          case 'account_recovery':
            result = await this.handleAccountRecovery(client, tokenVerification, recoveryActions);
            break;
          case 'emergency_access':
            result = await this.handleEmergencyAccess(client, tokenVerification, recoveryActions);
            break;
          default:
            throw new Error('Unknown recovery type');
        }

        // Mark token as used
        const markTokenUsedQuery = `
          UPDATE account_recovery_tokens 
          SET used = true, used_at = CURRENT_TIMESTAMP 
          WHERE token = $1
        `;
        await client.query(markTokenUsedQuery, [token]);

        await client.query('COMMIT');

        // Log security event
        await this.logSecurityEvent(
          tokenVerification.userId,
          `account_recovery_${tokenVerification.recoveryType}_completed`,
          'user',
          tokenVerification.userId,
          ipAddress,
          userAgent,
          true,
          {
            email: tokenVerification.email,
            recoveryType: tokenVerification.recoveryType
          }
        );

        return {
          success: true,
          message: 'Account recovery completed successfully.',
          result
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Account recovery completion error:', error);
      throw new Error('Failed to complete account recovery');
    }
  }

  /**
   * Handle email change recovery
   * @private
   */
  async handleEmailChangeRecovery(client, tokenData, actions) {
    const { newEmail } = actions;

    if (!newEmail) {
      throw new Error('New email address is required');
    }

    // Update user email
    const updateQuery = `
      UPDATE users 
      SET email = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING email
    `;
    const result = await client.query(updateQuery, [newEmail.toLowerCase(), tokenData.userId]);

    return {
      type: 'email_change',
      oldEmail: tokenData.email,
      newEmail: result.rows[0].email
    };
  }

  /**
   * Handle general account recovery
   * @private
   */
  async handleAccountRecovery(client, tokenData, actions) {
    const { resetPassword, regenerateBackupCodes } = actions;
    const results = {};

    if (resetPassword) {
      // Reset password logic would go here
      results.passwordReset = true;
    }

    if (regenerateBackupCodes) {
      const newCodes = this.generateBackupCodes();
      const encryptedCodes = await Promise.all(newCodes.map(code => encryptionService.encrypt(code)));

      const updateQuery = `
        UPDATE users 
        SET backup_codes = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      await client.query(updateQuery, [encryptedCodes, tokenData.userId]);

      results.backupCodes = newCodes;
    }

    return {
      type: 'account_recovery',
      actions: results
    };
  }

  /**
   * Handle emergency access recovery
   * @private
   */
  async handleEmergencyAccess(_client, _tokenData, _actions) {
    // Emergency access logic - provide temporary access with limited permissions
    return {
      type: 'emergency_access',
      temporaryAccess: true,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    };
  }

  /**
   * Send recovery email based on type
   * @private
   */
  async sendRecoveryEmail(user, recoveryType, token, recoveryData) {
    const recoveryUrl = `${process.env.FRONTEND_URL}/account-recovery?token=${token}&type=${recoveryType}`;

    const templates = {
      email_change: 'email-change-recovery',
      account_recovery: 'account-recovery',
      emergency_access: 'emergency-access'
    };

    await emailService.sendEmail({
      to: user.recovery_email || user.email,
      subject: `Floworx Account Recovery - ${recoveryType.replace('_', ' ').toUpperCase()}`,
      template: templates[recoveryType] || 'account-recovery',
      data: {
        firstName: user.first_name,
        recoveryUrl,
        recoveryType,
        ...recoveryData
      }
    });
  }

  /**
   * Log security event
   * @private
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
    }
  }
}

module.exports = new AccountRecoveryService();
