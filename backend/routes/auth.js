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

// GET /api/auth/debug - Debug registration dependencies
router.get('/debug', async (req, res) => {
  try {
    console.log('🔍 Auth debug endpoint called');

    // Test dependencies
    const debugInfo = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      jwtSecret: process.env.JWT_SECRET ? 'Present' : 'Missing',
      dependencies: {}
    };

    // Test database operations
    try {
      const testResult = await databaseOperations.getUserByEmail('test@example.com');
      debugInfo.dependencies.databaseOperations = 'Working';
    } catch (error) {
      debugInfo.dependencies.databaseOperations = `Error: ${error.message}`;
    }

    // Test email service
    try {
      const token = emailService.generateVerificationToken();
      debugInfo.dependencies.emailService = token ? 'Working' : 'Failed';
    } catch (error) {
      debugInfo.dependencies.emailService = `Error: ${error.message}`;
    }

    // Test validation schema
    try {
      const testData = {
        email: 'test@example.com',
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
        agreeToTerms: true
      };
      const { error } = registerSchema.validate(testData);
      debugInfo.dependencies.registerSchema = error ? `Validation Error: ${error.message}` : 'Working';
    } catch (error) {
      debugInfo.dependencies.registerSchema = `Error: ${error.message}`;
    }

    res.json({
      success: true,
      debug: debugInfo
    });
  } catch (error) {
    console.error('🔍 Auth debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// POST /api/auth/test-register - Simplified registration for debugging
router.post('/test-register', async (req, res) => {
  try {
    console.log('🧪 Test registration called with body:', req.body);

    const { email, password, firstName, lastName } = req.body;

    // Basic validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Check if user exists
    console.log('🧪 Checking if user exists...');
    const existingUser = await databaseOperations.getUserByEmail(email);
    console.log('🧪 Existing user check result:', existingUser.data ? 'User exists' : 'User not found');

    if (existingUser.data) {
      return res.status(409).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Hash password
    console.log('🧪 Hashing password...');
    const passwordHash = await bcrypt.hash(password, 12);
    console.log('🧪 Password hashed successfully');

    // Create user data
    const userData = {
      id: require('crypto').randomUUID(),
      email: email.toLowerCase(),
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      created_at: new Date().toISOString()
    };

    console.log('🧪 Creating user with data:', { ...userData, password_hash: '[HIDDEN]' });

    // Create user
    const createResult = await databaseOperations.createUser(userData);
    console.log('🧪 User creation result:', createResult.error ? `Error: ${createResult.error.message}` : 'Success');

    if (createResult.error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create user',
        details: createResult.error.message
      });
    }

    // Generate token
    console.log('🧪 Generating JWT token...');
    const token = jwt.sign(
      { userId: userData.id, email: userData.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('🧪 Token generated successfully');

    console.log('🧪 Test registration completed successfully');

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userData.id,
          email: userData.email,
          firstName: firstName,
          lastName: lastName
        },
        token: token
      },
      message: 'Test registration successful'
    });

  } catch (error) {
    console.error('🧪 Test registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Test registration failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST /api/auth/register
// Register a new user account - SECURED with rate limiting and validation
router.post('/register', async (req, res) => {
  try {
    console.log('Registration request received:', req.body);

    const { email, password, firstName, lastName, phone, businessName, agreeToTerms } = req.body;

    // Manual validation to avoid middleware issues
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Missing required fields: email, password, firstName, lastName',
          code: 400
        }
      });
    }

    if (!agreeToTerms) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'You must agree to the terms and conditions',
          code: 400
        }
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Please provide a valid email address',
          code: 400
        }
      });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Password must be at least 8 characters long',
          code: 400
        }
      });
    }

    console.log('Manual validation passed, proceeding with registration');

    logger.info('Registration attempt', { email, businessName });
    // Check if user already exists
    console.log('Checking if user exists...');
    const existingUserResult = await databaseOperations.getUserByEmail(email);

    if (existingUserResult.data) {
      logger.warn('Registration failed - user already exists', { email });
      return res.status(409).json({
        success: false,
        error: {
          type: 'CONFLICT_ERROR',
          message: 'An account with this email already exists',
          code: 409
        }
      });
    }

    // Hash the password
    console.log('Hashing password...');
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate user ID
    const userId = require('crypto').randomUUID();

    // Create new user
    console.log('Creating user...');
    const userData = {
      id: userId,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      company_name: businessName || null,
      phone: phone || null,
      created_at: new Date().toISOString()
    };

    const createUserResult = await databaseOperations.createUser(userData);

    if (createUserResult.error) {
      logger.error('User creation failed', {
        email,
        error: createUserResult.error.message
      });
      return res.status(500).json({
        success: false,
        error: {
          type: 'DATABASE_ERROR',
          message: 'Failed to create user account',
          code: 500,
          details: createUserResult.error.message
        }
      });
    }

    const user = createUserResult.data;

    // Generate JWT token for immediate login (skip email verification for now)
    console.log('Generating JWT token...');
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    logger.info('Registration successful', {
      userId: user.id,
      email: user.email
    });

    console.log('Registration completed successfully');

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: firstName,
          lastName: lastName,
          companyName: businessName || null,
          emailVerified: false,
          created_at: user.created_at
        },
        token: token
      },
      message: `Welcome ${firstName}! Your account has been created successfully.`
    });

  } catch (error) {
    console.error('Registration error:', error);
    logger.error('Registration failed', {
      email: req.body?.email,
      error: error.message,
      stack: error.stack
    });

    res.status(500).json({
      success: false,
      error: {
        type: 'INTERNAL_ERROR',
        message: 'Registration failed due to server error',
        code: 500,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

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

// GET /api/auth/verify-email
// Enhanced email verification endpoint
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Missing token',
        message: 'Verification token is required'
      });
    }

    // Get verification token from database
    const tokenResult = await databaseOperations.getVerificationToken(token);

    if (!tokenResult.data) {
      return res.status(400).json({
        success: false,
        error: 'Invalid token',
        message: 'Verification token is invalid or has been used'
      });
    }

    const { user_id, expires_at } = tokenResult.data;

    // Check if token is expired
    if (new Date() > new Date(expires_at)) {
      return res.status(400).json({
        success: false,
        error: 'Token expired',
        message: 'Verification token has expired. Please request a new verification email.'
      });
    }

    // Update user's email verification status
    const updateResult = await databaseOperations.updateUserEmailVerification(user_id, true);

    if (updateResult.error) {
      return res.status(500).json({
        success: false,
        error: 'Verification failed',
        message: 'Unable to update email verification status'
      });
    }

    // Delete used token
    await databaseOperations.deleteVerificationToken(token);

    // Get updated user data
    const userResult = await databaseOperations.getUserById(user_id);
    const user = userResult.data;

    // Generate JWT token for the verified user
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        emailVerified: true
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('Email verified successfully', { userId: user_id, email: user.email });

    res.json({
      success: true,
      message: 'Email verified successfully! You can now log in to your account.',
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        emailVerified: true
      },
      redirectUrl: `${process.env.FRONTEND_URL || 'https://app.floworx-iq.com'}/dashboard`
    });
  } catch (error) {
    logger.error('Email verification error', { error, token: req.query.token });
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      message: 'Unable to verify email address. Please try again or contact support.'
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
