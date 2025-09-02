const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { query } = require('../database/unified-connection');
const emailService = require('../services/emailService');
const { passwordResetRateLimit, authRateLimit } = require('../middleware/rateLimiter');
const { validationMiddleware } = require('../middleware/validation');

const router = express.Router();

// POST /api/password-reset/request - SECURED with centralized rate limiting
router.post('/request', passwordResetRateLimit, validationMiddleware.passwordResetRequest, async (req, res) => {
  try {
    // Validation is now handled by validationMiddleware.passwordResetRequest
    const { email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Check if user exists
    const userQuery = 'SELECT id, email, first_name FROM users WHERE email = $1';
    const userResult = await query(userQuery, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists - security best practice
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    const user = userResult.rows[0];

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Create password reset token
    const insertTokenQuery = `
        INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address, user_agent, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      `;

    try {
      await query(insertTokenQuery, [user.id, token, expiresAt, ipAddress, userAgent]);
    } catch (tokenError) {
      console.error('Failed to create reset token:', tokenError);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process password reset request'
      });
    }

    // Send password reset email
    await emailService.sendPasswordResetEmail(user.email, user.first_name, token);

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to process password reset request'
    });
  }
});

// POST /api/password-reset/validate
router.post(
  '/validate',
  [body('token').isLength({ min: 32, max: 128 }).withMessage('Invalid token format')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { token } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Validate and use password reset token
      const tokenQuery = `
        SELECT user_id, expires_at, used_at
        FROM password_reset_tokens
        WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL
      `;
      const tokenResult = await query(tokenQuery, [token]);

      if (tokenResult.rows.length === 0) {
        return res.status(400).json({
          valid: false,
          message: 'Invalid or expired token'
        });
      }

      const tokenData = tokenResult.rows[0];

      // Mark token as used
      const markUsedQuery = `
        UPDATE password_reset_tokens
        SET used_at = NOW(), used_ip = $1, used_user_agent = $2
        WHERE token = $3
      `;
      await query(markUsedQuery, [ipAddress, userAgent, token]);

      res.json({
        valid: true,
        message: 'Token is valid',
        userId: tokenData.user_id
      });
    } catch (error) {
      console.error('Token validation error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to validate token'
      });
    }
  }
);

// POST /api/password-reset/reset - SECURED with centralized rate limiting
router.post('/reset', authRateLimit, validationMiddleware.passwordReset, async (req, res) => {
  try {
    // Validation is now handled by validationMiddleware.passwordReset
    const { token, password } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Validate token first
    const tokenQuery = `
        SELECT user_id, expires_at, used_at
        FROM password_reset_tokens
        WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL
      `;
    const tokenResult = await query(tokenQuery, [token]);

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    const tokenData = tokenResult.rows[0];

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update user password and mark token as used
    const updatePasswordQuery = `
        UPDATE users
        SET password_hash = $1,
            last_password_reset = NOW(),
            failed_login_attempts = 0,
            account_locked_until = NULL,
            updated_at = NOW()
        WHERE id = $2
        RETURNING id, email, first_name
      `;
    const updateResult = await query(updatePasswordQuery, [passwordHash, tokenData.user_id]);

    // Mark token as used
    const markTokenUsedQuery = `
        UPDATE password_reset_tokens
        SET used_at = NOW(), used_ip = $1, used_user_agent = $2
        WHERE token = $3
      `;
    await query(markTokenUsedQuery, [ipAddress, userAgent, token]);

    if (updateResult.rows.length === 0) {
      console.error('Failed to update password: User not found');
      return res.status(500).json({
        success: false,
        message: 'Failed to reset password'
      });
    }

    const updatedUser = updateResult.rows[0];

    // Log successful password reset (optional - can be implemented later)
    console.log(`Password reset completed for user ${updatedUser.id} from IP ${ipAddress}`);

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

module.exports = router;
