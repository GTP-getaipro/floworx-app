const rateLimit = require('express-rate-limit');

const passwordResetService = require('../../backend/services/passwordResetService');

// Rate limiting for password reset requests
const resetRequestLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 requests per windowMs
  message: {
    error: 'Too many password reset requests',
    message: 'Please wait 15 minutes before requesting another password reset.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for password reset completion
const resetCompletionLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 attempts per windowMs
  message: {
    error: 'Too many password reset attempts',
    message: 'Please wait 15 minutes before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * POST /api/auth/forgot-password
 * Initiate password reset process
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Input validation
    if (!email) {
      return res.status(400).json({
        error: 'Missing email',
        message: 'Email address is required'
      });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    // Get client information
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Initiate password reset
    const result = await passwordResetService.initiatePasswordReset(email, ipAddress, userAgent);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        message: result.message,
        ...(result.lockedUntil && { lockedUntil: result.lockedUntil }),
        ...(result.rateLimited && { rateLimited: true })
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
      emailSent: result.emailSent,
      expiresIn: result.expiresIn
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to process password reset request'
    });
  }
};

/**
 * POST /api/auth/verify-reset-token
 * Verify password reset token validity
 */
const verifyResetToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Missing token',
        message: 'Reset token is required'
      });
    }

    const verification = await passwordResetService.verifyResetToken(token);

    if (!verification.valid) {
      return res.status(400).json({
        error: verification.error,
        message: verification.message
      });
    }

    res.status(200).json({
      valid: true,
      email: verification.email,
      firstName: verification.firstName,
      expiresAt: verification.expiresAt
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to verify reset token'
    });
  }
};

/**
 * POST /api/auth/reset-password
 * Complete password reset process
 */
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    // Input validation
    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Token, new password, and password confirmation are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        error: 'Password mismatch',
        message: 'New password and confirmation do not match'
      });
    }

    // Get client information
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Reset password
    const result = await passwordResetService.resetPassword(token, newPassword, ipAddress, userAgent);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
        message: result.message,
        ...(result.requirements && { requirements: result.requirements })
      });
    }

    res.status(200).json({
      success: true,
      message: result.message,
      userId: result.userId
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to reset password'
    });
  }
};

/**
 * GET /api/auth/password-requirements
 * Get password requirements for frontend validation
 */
const getPasswordRequirements = (req, res) => {
  res.status(200).json({
    requirements: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false
    },
    description: 'Password must be at least 8 characters long and contain uppercase letters, lowercase letters, and numbers.'
  });
};

// Export handlers with rate limiting applied
module.exports = {
  forgotPassword: [resetRequestLimit, forgotPassword],
  verifyResetToken,
  resetPassword: [resetCompletionLimit, resetPassword],
  getPasswordRequirements
};
