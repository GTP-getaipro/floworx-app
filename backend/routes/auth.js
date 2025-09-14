const bcrypt = require('bcryptjs');
const express = require('express');
const jwt = require('jsonwebtoken');

const { UserQueries: _UserQueries } = require('../database/secureQueries');
const { databaseOperations } = require('../database/database-operations');
const { databaseManager } = require('../database/unified-connection');
const { authenticateToken } = require('../middleware/auth');
const { authRateLimit, authSlowDown, accountLockoutLimiter } = require('../middleware/security');
const { registerSchema, loginSchema } = require('../schemas/auth');
const emailService = require('../services/emailService');
const passwordResetService = require('../services/passwordResetService');
const redisManager = require('../services/redis-connection-manager');
const { asyncHandler, successResponse } = require('../middleware/standardErrorHandler');
const { ErrorResponse } = require('../utils/ErrorResponse');
const { validateRequest } = require('../utils/validateRequest');
const logger = require('../utils/logger');

const router = express.Router();

// Helper function for database queries
const query = async (sql, params) => {
  await databaseManager.initialize();
  return databaseManager.query(sql, params);
};

// Input validation is now handled by centralized validation middleware

// POST /api/auth/register
// Register a new user account - SECURED with rate limiting and validation
router.post(
  '/register',
  validateRequest({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName, businessName } = req.body;

    logger.info('Registration attempt', { email, businessName });

    // Check if user already exists
    const existingUserResult = await databaseOperations.getUserByEmail(email);

    if (existingUserResult.data) {
      logger.warn('Registration failed - user already exists', { email });
      throw ErrorResponse.conflict('An account with this email already exists');
    }

    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate user ID
    const userId = require('crypto').randomUUID();

    // Create new user
    const userData = {
      id: userId,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      company_name: businessName || null,
      created_at: new Date().toISOString()
    };

    const createUserResult = await databaseOperations.createUser(userData);

    if (createUserResult.error) {
      logger.error('User creation failed', {
        email,
        error: createUserResult.error.message
      });
      throw ErrorResponse.database('Failed to create user account', {
        originalError: createUserResult.error.message
      });
    }

    const user = createUserResult.data;

    // Generate and store verification token
    let emailSent = false;
    let verificationToken = null;
    let emailError = null;

    try {
      verificationToken = emailService.generateVerificationToken();
      await emailService.storeVerificationToken(user.id, verificationToken, email, firstName);

      // Send verification email
      await emailService.sendVerificationEmail(email, firstName, verificationToken);
      emailSent = true;
      logger.info('Verification email sent successfully', { email });
    } catch (error) {
      emailError = error;
      logger.warn('Email verification failed', {
        email,
        error: error.message,
        stack: error.stack
      });

      // For now, continue with registration even if email verification fails
    }

    logger.info('Registration successful', {
      userId: user.id,
      email: user.email,
      emailSent
    });

    successResponse(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: firstName,
        lastName: lastName,
        companyName: businessName || null,
        emailVerified: false, // Always false for new registrations
        created_at: user.created_at
      },
      requiresVerification: emailSent,
      emailSent: emailSent,
      // Include error details in development/testing
      ...(process.env.NODE_ENV !== 'production' && emailError && {
        emailError: {
          message: emailError.message,
          type: emailError.constructor.name
        }
      }),
      title: emailSent ? 'Registration Successful!' : 'Registration Complete',
      instructions: emailSent ? [
        'Check your email inbox for a verification message',
        'Click the verification link to activate your account',
        'You cannot log in until your email is verified',
        'If you don\'t see the email, check your spam folder'
      ] : [
        'Your account has been created successfully',
        'Email verification is temporarily unavailable',
        'Please contact support to activate your account'
      ],
      nextSteps: emailSent ? 'Please verify your email before attempting to log in' : 'Contact support for account activation'
    }, emailSent
      ? `Welcome ${firstName}! We've sent a verification email to ${email}. Please click the link in that email to activate your account.`
      : 'User registered successfully. Email verification is temporarily unavailable - please contact support.',
    201);
  })
);

// POST /api/auth/login
// Authenticate user and return JWT - SECURED with rate limiting and validation
router.post(
  '/login',
  authRateLimit,
  authSlowDown,
  accountLockoutLimiter,
  validateRequest({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    logger.info('Login attempt', { email });

    // Find user by email
    const userResult = await databaseOperations.getUserByEmail(email);

    if (userResult.error || !userResult.data) {
      // Update lockout data for failed attempt
      if (req.updateLockoutData) {
        req.updateLockoutData(true);
      }
      logger.warn('Login failed - invalid credentials', { email });
      const errorResponse = ErrorResponse.authentication('Invalid credentials', req.requestId);
      return errorResponse.send(res, req);
    }

      const user = userResult.data;

      // Check if email is verified - ENABLED for proper security
      if (!user.email_verified) {
        logger.warn('Login blocked - email not verified', { email, userId: user.id });

        // Enhanced user-friendly error response
        return res.status(403).json({
          success: false,
          error: {
            type: 'EMAIL_NOT_VERIFIED',
            message: 'Email verification required',
            code: 403
          },
          requiresVerification: true,
          email: user.email,
          title: 'Please Verify Your Email',
          instructions: [
            'Check your email inbox for a verification message',
            'Click the verification link in the email to activate your account',
            'If you don\'t see the email, check your spam folder',
            'You can request a new verification email below'
          ],
          actions: {
            resendVerification: {
              endpoint: '/api/auth/resend-verification',
              method: 'POST',
              body: { email: user.email }
            }
          },
          userFriendlyMessage: `Hi ${user.first_name || 'there'}! We sent a verification email to ${user.email}. Please click the link in that email to activate your account and log in.`
        });
      }

    // Compare password with hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      // Update lockout data for failed attempt
      if (req.updateLockoutData) {
        req.updateLockoutData(true);
      }
      logger.warn('Login failed - password mismatch', { email });
      const errorResponse = ErrorResponse.authentication('Invalid credentials', req.requestId);
      return errorResponse.send(res, req);
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });

    // Update lockout data for successful attempt
    if (req.updateLockoutData) {
      req.updateLockoutData(false);
    }

    logger.info('Login successful', {
      userId: user.id,
      email: user.email
    });

    // Return success response
    successResponse(res, {
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        companyName: user.company_name,
        createdAt: user.created_at
      },
      expiresIn: '24h'
    }, 'Login successful');
  })
);

// GET /api/auth/verify
// Verify if current JWT token is valid
router.get('/verify', authenticateToken, (req, res) => {
  res.json({
    message: 'Token is valid',
    user: req.user
  });
});

// GET /api/auth/user/status
// Get user's connection status for dashboard
router.get('/user/status', authenticateToken, async (req, res) => {
  try {
    // Get user's full information
    const userResult = await databaseOperations.getUserById(req.user.id);

    if (userResult.error || !userResult.data) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    const userDetails = userResult.data;

    // For now, return empty arrays for services to avoid complex queries
    // TODO: Update these to use databaseOperations methods
    const connectedServices = [];
    const oauthServices = [];

    res.status(200).json({
      id: userDetails.id,
      email: userDetails.email,
      firstName: userDetails.first_name,
      lastName: userDetails.last_name,
      companyName: userDetails.company_name,
      createdAt: userDetails.created_at,
      lastLogin: userDetails.last_login,
      emailVerified: userDetails.email_verified || false,
      connected_services: connectedServices,
      oauth_connections: oauthServices,
      has_google_connection:
        connectedServices.some(service => service.service === 'google') ||
        oauthServices.some(service => service.service === 'google' && service.status === 'active')
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      error: 'Status check failed',
      message: 'Unable to retrieve user status'
    });
  }
});

// GET /api/dashboard
// Get user dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Get user's full information
    const userQuery = `
      SELECT id, email, first_name, last_name, company_name, created_at, last_login
      FROM users
      WHERE id = $1
    `;
    const userResult = await query(userQuery, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    const userDetails = userResult.rows[0];

    // Get recent activities (graceful handling)
    let recentActivities = [];
    try {
      const activitiesQuery = `
        SELECT action, ip_address, created_at
        FROM security_audit_log
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 5
      `;
      const activitiesResult = await query(activitiesQuery, [req.user.id]);
      recentActivities = activitiesResult.rows.map(activity => ({
        action: activity.action,
        timestamp: activity.created_at,
        ip_address: activity.ip_address
      }));
    } catch (_actError) {
      console.log('Activities data not available, continuing without recent activities');
    }

    // Get connection status
    const connections = { google: { connected: false } };
    try {
      const oauthQuery = `
        SELECT provider, created_at
        FROM oauth_tokens
        WHERE user_id = $1 AND access_token IS NOT NULL
      `;
      const oauthResult = await query(oauthQuery, [req.user.id]);

      oauthResult.rows.forEach(oauth => {
        connections[oauth.provider] = {
          connected: true,
          connected_at: oauth.created_at
        };
      });
    } catch (_oauthError) {
      console.log('OAuth data not available, showing default connection status');
    }

    const dashboardData = {
      user: {
        id: userDetails.id,
        email: userDetails.email,
        firstName: userDetails.first_name,
        lastName: userDetails.last_name,
        companyName: userDetails.company_name,
        createdAt: userDetails.created_at,
        lastLogin: userDetails.last_login
      },
      connections: connections,
      recentActivities: recentActivities,
      quickActions: [
        {
          id: 'connect_google',
          title: 'Connect Google Account',
          description: 'Connect your Google account to start automating emails',
          action: '/api/oauth/google',
          enabled: !connections.google?.connected,
          priority: 1
        },
        {
          id: 'create_workflow',
          title: 'Create First Workflow',
          description: 'Set up your first email automation workflow',
          action: '/workflows/create',
          enabled: connections.google?.connected,
          priority: 2
        }
      ],
      systemStatus: {
        apiHealthy: true,
        databaseConnected: true,
        lastUpdated: new Date().toISOString()
      }
    };

    res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      error: 'Failed to load dashboard',
      message: 'Something went wrong while loading dashboard data'
    });
  }
});

// POST /api/auth/verify-email
// Verify user's email address
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'Missing token',
        message: 'Verification token is required'
      });
    }

    const result = await emailService.verifyEmailToken(token);

    if (!result.valid) {
      return res.status(400).json({
        error: 'Invalid token',
        message: result.message
      });
    }

    // Generate JWT token for the verified user
    const jwtToken = jwt.sign({ userId: result.userId, email: result.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Email verified successfully',
      token: jwtToken,
      user: {
        id: result.userId,
        email: result.email,
        firstName: result.firstName,
        emailVerified: true
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: 'Unable to verify email address'
    });
  }
});

// POST /api/auth/resend-verification
// Resend verification email
router.post('/resend-verification', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: 'Missing email',
      message: 'Email address is required'
    });
  }

  // Find user using database operations
  const userResult = await databaseOperations.getUserByEmail(email.toLowerCase());

  if (!userResult.data) {
    // Don't reveal whether user exists or not for security
    return res.status(400).json({
      error: 'Invalid request',
      message: 'If this email is registered, a verification email will be sent'
    });
  }

  const user = userResult.data;

  if (user.email_verified) {
    return res.status(400).json({
      error: 'Already verified',
      message: 'This email address is already verified'
    });
  }

  // Generate and send new verification token
  const verificationToken = emailService.generateVerificationToken();
  await emailService.storeVerificationToken(user.id, verificationToken, email, user.first_name);
  await emailService.sendVerificationEmail(email, user.first_name, verificationToken);

  res.json({
    message: 'Verification email sent successfully'
  });
}));

// POST /api/auth/complete-onboarding
// Mark user's onboarding as completed
router.post('/complete-onboarding', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Update user's onboarding status
    const updateQuery = `
      UPDATE users
      SET onboarding_completed = true, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, email, onboarding_completed
    `;

    const result = await query(updateQuery, [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Unable to update onboarding status'
      });
    }

    res.json({
      message: 'Onboarding completed successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Complete onboarding error:', error);
    res.status(500).json({
      error: 'Failed to complete onboarding',
      message: error.message
    });
  }
});

// POST /api/auth/forgot-password
// Initiate password reset process
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Missing email',
        message: 'Email address is required'
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

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
});

// POST /api/auth/verify-reset-token
// Verify password reset token validity
router.post('/verify-reset-token', async (req, res) => {
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
});

// POST /api/auth/reset-password
// Complete password reset process
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

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

    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

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
});

// GET /api/auth/password-requirements
// Get password requirements for frontend validation
router.get('/password-requirements', (req, res) => {
  res.status(200).json({
    requirements: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false
    },
    description:
      'Password must be at least 8 characters long and contain uppercase letters, lowercase letters, and numbers.'
  });
});

// GET /api/auth/test-status
// Test endpoint to verify deployment and user status
router.get('/test-status', authenticateToken, async (req, res) => {
  try {
    console.log(`Test status request from user: ${req.user.id}`);

    // Get basic user info
    const userQuery = 'SELECT id, email, first_name, last_name, company_name FROM users WHERE id = $1';
    const userResult = await query(userQuery, [req.user.id]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const user = userResult.rows[0];

    res.status(200).json({
      message: 'Test status endpoint working',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        companyName: user.company_name
      },
      timestamp: new Date().toISOString(),
      deployment: 'latest'
    });
  } catch (error) {
    console.error('Test status error:', error);
    res.status(500).json({
      error: 'Test status failed',
      message: error.message
    });
  }
});

// GET /api/auth/welcome
// Welcome endpoint that logs requests and returns a welcome message
router.get('/welcome', (req, res) => {
  // Log request metadata
  console.log(`Request received: ${req.method} ${req.path} at ${new Date().toISOString()}`);

  res.status(200).json({
    message: 'Welcome to the FloworxInvite API!'
  });
});

// POST /api/auth/lockout-check
// Check account lockout status (temporary endpoint for frontend compatibility)
router.post('/lockout-check', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Use the password reset service to check lockout status
    const passwordResetService = require('../services/passwordResetService');
    const result = await passwordResetService.checkAccountLockout(email);

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Lockout check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check account lockout status'
    });
  }
});

// POST /api/auth/recovery
// Account recovery endpoint (temporary endpoint for frontend compatibility)
router.post('/recovery', async (req, res) => {
  try {
    const { email, recoveryType } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // For now, redirect to the standard password reset flow
    if (recoveryType === 'password_reset' || !recoveryType) {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      const passwordResetService = require('../services/passwordResetService');
      const result = await passwordResetService.initiatePasswordReset(email, ipAddress, userAgent);

      return res.json(result);
    }

    // For other recovery types, return a placeholder response
    res.json({
      success: true,
      message:
        'Recovery request received. If an account with this email exists, you will receive further instructions.',
      emailSent: false
    });
  } catch (error) {
    console.error('Recovery request error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process recovery request'
    });
  }
});

// POST /api/auth/logout
// Logout user (client-side token invalidation)
router.post('/logout', authenticateToken, (req, res) => {
  try {
    console.log(`🚪 User logout: ${req.user.email}`);

    // For JWT tokens, logout is primarily handled client-side by removing the token
    // We could implement server-side token blacklisting here if needed

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to logout',
      details: error.message
    });
  }
});

// GET /api/auth/generate-verification-link/:email
// Generate verification link for testing (DEVELOPMENT ONLY)
router.get('/generate-verification-link/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Find user by email
    const userResult = await databaseOperations.getUserByEmail(email.toLowerCase());

    if (!userResult || !userResult.data) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.data;

    // Generate verification token
    const verificationToken = emailService.generateVerificationToken();

    // Store verification token
    await emailService.storeVerificationToken(user.id, verificationToken, email, user.first_name);

    // Generate verification URL
    const verificationUrl = `${process.env.FRONTEND_URL || 'https://app.floworx-iq.com'}/verify-email?token=${verificationToken}`;

    res.json({
      success: true,
      message: 'Verification link generated successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        emailVerified: user.email_verified || false
      },
      verificationLink: verificationUrl,
      token: verificationToken,
      instructions: 'Click the verification link to verify your email address'
    });
  } catch (error) {
    console.error('Generate verification link error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate verification link',
      message: error.message
    });
  }
});

// GET /api/auth/check-verification-status/:email
// Check email verification status for testing
router.get('/check-verification-status/:email', async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Find user by email
    const userResult = await databaseOperations.getUserByEmail(email.toLowerCase());

    if (!userResult || !userResult.data) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        email: email
      });
    }

    const user = userResult.data;

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        emailVerified: user.email_verified || false,
        emailVerifiedAt: user.email_verified_at || null,
        createdAt: user.created_at
      },
      canLogin: user.email_verified || false,
      message: user.email_verified
        ? 'Email is verified - user can log in'
        : 'Email is not verified - login will be blocked'
    });
  } catch (error) {
    console.error('Check verification status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check verification status',
      message: error.message
    });
  }
});

// POST /api/auth/manual-verify-email
// Manually verify email for testing (DEVELOPMENT ONLY)
router.post('/manual-verify-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Find user by email
    const userResult = await databaseOperations.getUserByEmail(email.toLowerCase());

    if (!userResult || !userResult.data) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.data;

    // Manually set email as verified
    const updateResult = await databaseOperations.updateUser(user.id, {
      email_verified: true,
      email_verified_at: new Date().toISOString()
    });

    if (updateResult.error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to verify email',
        details: updateResult.error
      });
    }

    res.json({
      success: true,
      message: 'Email verified successfully (manual verification for testing)',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        emailVerified: true
      }
    });
  } catch (error) {
    console.error('Manual email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify email',
      message: error.message
    });
  }
});

// GET /api/auth/test-keydb
// Test KeyDB connection and credentials
router.get('/test-keydb', async (req, res) => {
  try {
    console.log('🔧 Testing KeyDB connection...');

    // Check environment variables
    const envCheck = {
      REDIS_URL: process.env.REDIS_URL ? '[SET]' : '[NOT SET]',
      REDIS_HOST: process.env.REDIS_HOST || '[NOT SET]',
      REDIS_PORT: process.env.REDIS_PORT || '[NOT SET]',
      REDIS_PASSWORD: process.env.REDIS_PASSWORD ? '[SET]' : '[NOT SET]',
      KEYDB_HOST: process.env.KEYDB_HOST || '[NOT SET]',
      KEYDB_PASSWORD: process.env.KEYDB_PASSWORD ? '[SET]' : '[NOT SET]',
      DISABLE_REDIS: process.env.DISABLE_REDIS || '[NOT SET]'
    };

    console.log('Environment Variables:', envCheck);

    // Test Redis connection
    let connectionTest = { connected: false, error: null };
    try {
      await redisManager.connect();
      const client = redisManager.getClient();

      if (client && typeof client.ping === 'function') {
        const pingResult = await client.ping();
        connectionTest = {
          connected: true,
          ping: pingResult,
          clientType: client.constructor.name
        };
      } else {
        connectionTest = {
          connected: false,
          error: 'Client not available or fallback client in use'
        };
      }
    } catch (error) {
      connectionTest = {
        connected: false,
        error: error.message
      };
    }

    res.json({
      success: true,
      message: 'KeyDB connection test completed',
      environment: envCheck,
      connection: connectionTest,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('KeyDB test error:', error);
    res.status(500).json({
      success: false,
      error: 'KeyDB test failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
