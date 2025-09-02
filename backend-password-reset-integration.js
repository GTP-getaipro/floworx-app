// Floworx Password Reset Integration
// Add these routes and services to your existing backend

// =====================================================
// 1. PASSWORD RESET SERVICE (backend/services/passwordResetService.js)
// =====================================================

const crypto = require('crypto');
const { getSupabaseClient } = require('../database/supabase-client');
const emailService = require('./emailService');

class PasswordResetService {
  constructor() {
    this.supabase = getSupabaseClient();
  }

  /**
   * Generate secure password reset token
   */
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email, ipAddress, userAgent) {
    try {
      // Check if user exists
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('id, email, first_name')
        .eq('email', email.toLowerCase())
        .single();

      if (userError || !user) {
        // Don't reveal if email exists - security best practice
        return {
          success: true,
          message: 'If an account with that email exists, a password reset link has been sent.'
        };
      }

      // Generate reset token
      const token = this.generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Create password reset token using the secure function
      const { data: tokenData, error: tokenError } = await this.supabase
        .rpc('create_password_reset_token', {
          p_user_id: user.id,
          p_token: token,
          p_expires_at: expiresAt.toISOString(),
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        });

      if (tokenError) {
        throw new Error(`Failed to create reset token: ${tokenError.message}`);
      }

      // Send password reset email
      await emailService.sendPasswordResetEmail(
        user.email,
        user.first_name,
        token
      );

      return {
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      };

    } catch (error) {
      console.error('Password reset request error:', error);
      throw new Error('Failed to process password reset request');
    }
  }

  /**
   * Validate password reset token
   */
  async validateResetToken(token, ipAddress, userAgent) {
    try {
      const { data: result, error } = await this.supabase
        .rpc('use_password_reset_token', {
          p_token: token,
          p_ip_address: ipAddress,
          p_user_agent: userAgent
        });

      if (error) {
        throw new Error(`Token validation error: ${error.message}`);
      }

      const validation = result[0];
      return {
        valid: validation.valid,
        userId: validation.user_id,
        message: validation.message
      };

    } catch (error) {
      console.error('Token validation error:', error);
      return {
        valid: false,
        userId: null,
        message: 'Invalid or expired token'
      };
    }
  }

  /**
   * Reset password with valid token
   */
  async resetPassword(token, newPassword, ipAddress, userAgent) {
    try {
      // Validate token first
      const validation = await this.validateResetToken(token, ipAddress, userAgent);
      
      if (!validation.valid) {
        return {
          success: false,
          message: validation.message
        };
      }

      // Hash new password
      const bcrypt = require('bcrypt');
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update user password
      const { error: updateError } = await this.supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          last_password_reset: new Date().toISOString(),
          failed_login_attempts: 0, // Reset failed attempts
          account_locked_until: null // Unlock account if locked
        })
        .eq('id', validation.userId);

      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`);
      }

      // Log successful password reset
      await this.supabase.rpc('log_security_event', {
        p_user_id: validation.userId,
        p_action: 'password_reset_completed',
        p_resource_type: 'user_account',
        p_resource_id: validation.userId,
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_success: true,
        p_details: { reset_method: 'email_token' }
      });

      return {
        success: true,
        message: 'Password has been reset successfully'
      };

    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        message: 'Failed to reset password'
      };
    }
  }
}

module.exports = new PasswordResetService();

// =====================================================
// 2. PASSWORD RESET ROUTES (backend/routes/passwordReset.js)
// =====================================================

const express = require('express');
const rateLimit = require('express-rate-limit');
const passwordResetService = require('../services/passwordResetService');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Rate limiting for password reset requests
const resetRequestLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 requests per window
  message: {
    error: 'Too many password reset requests',
    message: 'Please wait 15 minutes before requesting another password reset'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const resetPasswordLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many password reset attempts',
    message: 'Please wait 15 minutes before trying again'
  }
});

// POST /api/password-reset/request
router.post('/request', 
  resetRequestLimit,
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { email } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const result = await passwordResetService.requestPasswordReset(
        email, 
        ipAddress, 
        userAgent
      );

      res.json(result);

    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to process password reset request'
      });
    }
  }
);

// POST /api/password-reset/validate
router.post('/validate',
  [
    body('token')
      .isLength({ min: 32, max: 128 })
      .withMessage('Invalid token format')
  ],
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

      const result = await passwordResetService.validateResetToken(
        token,
        ipAddress,
        userAgent
      );

      if (result.valid) {
        res.json({
          valid: true,
          message: 'Token is valid'
        });
      } else {
        res.status(400).json({
          valid: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Token validation error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to validate token'
      });
    }
  }
);

// POST /api/password-reset/reset
router.post('/reset',
  resetPasswordLimit,
  [
    body('token')
      .isLength({ min: 32, max: 128 })
      .withMessage('Invalid token format'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { token, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const result = await passwordResetService.resetPassword(
        token,
        password,
        ipAddress,
        userAgent
      );

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to reset password'
      });
    }
  }
);

module.exports = router;
