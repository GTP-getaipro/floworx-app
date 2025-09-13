const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const express = require('express');
const { body, validationResult } = require('express-validator');

const { databaseOperations } = require('../database/database-operations');
const { passwordResetRateLimit, authRateLimit } = require('../middleware/rateLimiter');
const { validationMiddleware } = require('../middleware/validation');
const emailService = require('../services/emailService');

const router = express.Router();

// GET /api/password-reset
// Get password reset information
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      passwordReset: {
        available: true,
        methods: ['email'],
        message: 'Password reset available'
      }
    });
  } catch (error) {
    console.error('Password reset info error:', error);
    res.status(500).json({
      error: 'Failed to get password reset info',
      message: error.message
    });
  }
});

// POST /api/password-reset/request - SECURED with centralized rate limiting
router.post('/request', passwordResetRateLimit, validationMiddleware.passwordResetRequest, async (req, res) => {
  try {
    // Validation is now handled by validationMiddleware.passwordResetRequest
    const { email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Check if user exists using REST API
    console.log(`🔍 Checking if user exists: ${email}`);
    const userResult = await databaseOperations.getUserByEmail(email);

    if (userResult.error || !userResult.data) {
      // Don't reveal if email exists - security best practice
      console.log('ℹ️ User not found, but returning success for security');
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    const user = userResult.data;
    console.log(`✅ User found: ${user.email}`);

    // Generate reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Create password reset token using REST API
    console.log('🔐 Creating password reset token...');
    try {
      const tokenResult = await databaseOperations.createPasswordResetToken(
        user.id,
        token,
        expiresAt.toISOString()
      );

      if (tokenResult.error) {
        console.error('Failed to create reset token:', tokenResult.error);
        return res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: 'Failed to process password reset request',
          details: tokenResult.error.message
        });
      }

      console.log('✅ Password reset token created');
    } catch (tokenError) {
      console.error('Failed to create reset token:', tokenError);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to process password reset request',
        details: tokenError.message
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

      // Validate password reset token using REST API
      console.log('🔍 Validating password reset token...');
      const tokenResult = await databaseOperations.getPasswordResetToken(token);

      if (tokenResult.error || !tokenResult.data) {
        console.log('❌ Invalid or expired token');
        return res.status(400).json({
          success: false,
          valid: false,
          message: 'Invalid or expired token'
        });
      }

      const tokenData = tokenResult.data;
      console.log('✅ Valid password reset token found');

      // Mark token as used using REST API
      console.log('🔒 Marking token as used...');
      const markUsedResult = await databaseOperations.markPasswordResetTokenUsed(token);

      if (markUsedResult.error) {
        console.error('Failed to mark token as used:', markUsedResult.error);
        // Continue anyway - token validation was successful
      } else {
        console.log('✅ Token marked as used');
      }

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

    // Validate token first using REST API
    console.log('🔍 Validating password reset token for password update...');
    const tokenResult = await databaseOperations.getPasswordResetToken(token);

    if (tokenResult.error || !tokenResult.data) {
      console.log('❌ Invalid or expired token for password reset');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    const tokenData = tokenResult.data;
    console.log('✅ Valid token found for password reset');

    // Hash new password
    console.log('🔐 Hashing new password...');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update user password using REST API
    console.log('💾 Updating user password...');
    const userId = tokenData.users ? tokenData.users.id : tokenData.user_id;
    const updateResult = await databaseOperations.updateUserPassword(userId, passwordHash);

    if (updateResult.error) {
      console.error('Failed to update password:', updateResult.error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to update password',
        details: updateResult.error.message
      });
    }

    // Mark token as used using REST API
    console.log('🔒 Marking password reset token as used...');
    const markUsedResult = await databaseOperations.markPasswordResetTokenUsed(token);

    if (markUsedResult.error) {
      console.error('Failed to mark token as used:', markUsedResult.error);
      // Continue anyway - password was updated successfully
    }

    const updatedUser = updateResult.data;
    console.log(`✅ Password reset completed for user ${updatedUser.id}`);

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
