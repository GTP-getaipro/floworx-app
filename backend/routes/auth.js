const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const { authRateLimit, authSlowDown, accountLockoutLimiter } = require('../middleware/security');
const { validateRequest } = require('../utils/validateRequest');
const { asyncWrapper } = require('../utils/asyncWrapper');
const emailService = require('../services/emailService');
const passwordResetService = require('../services/passwordResetService');

// Import database connection
const { query } = require('../database/unified-connection');

// Import secure database queries
const { UserQueries, AuthQueries } = require('../database/secureQueries');

// Import new validation schemas and utilities
const {
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  changePasswordSchema,
  oauthCallbackSchema,
  refreshTokenSchema
} = require('../schemas/auth');
const { AuthenticationError, ConflictError, ValidationError, NotFoundError } = require('../utils/errors');

const router = express.Router();

// Input validation is now handled by centralized validation middleware

// POST /api/auth/register
// Register a new user account - SECURED with rate limiting and validation
router.post(
  '/register',
  validateRequest({ body: registerSchema }),
  asyncWrapper(async (req, res) => {
    const { email, password, firstName, lastName, businessName, phone, agreeToTerms, marketingConsent } = req.body;

    // Check if user already exists using secure query
    const existingUser = await UserQueries.findByEmail(email);

    if (existingUser) {
      if (existingUser.email_verified) {
        throw new ConflictError('An account with this email already exists');
      } else {
        // User exists but email not verified - resend verification
        const verificationToken = emailService.generateVerificationToken();
        await emailService.storeVerificationToken(existingUser.id, verificationToken);
        await emailService.sendVerificationEmail(email, firstName, verificationToken);

        return res.status(200).json({
          message: 'Verification email resent. Please check your email to verify your account.',
          requiresVerification: true
        });
      }
    }

    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Set trial period (14 days)
    const trialStartsAt = new Date();
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Create new user with extended fields and auto-verify email for production
    const insertUserQuery = `
      INSERT INTO users (
        email, password_hash, first_name, last_name, company_name,
        trial_started_at, trial_ends_at, subscription_status, email_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, email, first_name, last_name, company_name, created_at
    `;
    const newUser = await query(insertUserQuery, [
      email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      businessName || null,
      trialStartsAt,
      trialEndsAt,
      'trial',
      true // Auto-verify email for production
    ]);

    const user = newUser.rows[0];

    // Generate and store verification token
    const verificationToken = emailService.generateVerificationToken();
    await emailService.storeVerificationToken(user.id, verificationToken);

    // Send verification email (with error handling)
    let emailSent = false;
    try {
      await emailService.sendVerificationEmail(email, firstName, verificationToken);
      emailSent = true;
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError.message);
      // Continue with registration even if email fails
    }

    res.status(201).json({
      message: emailSent
        ? 'User registered successfully. Please check your email to verify your account.'
        : 'User registered successfully. Email verification is temporarily unavailable.',
      requiresVerification: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        companyName: user.company_name,
        created_at: user.created_at
      }
    });
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
  asyncWrapper(async (req, res) => {
    const { email, password } = req.body;

    try {
      // Find user by email using direct optimized query
      const userQuery = 'SELECT id, email, password_hash, email_verified, first_name, last_name, company_name, created_at FROM users WHERE email = $1';
      const userResult = await query(userQuery, [email.toLowerCase()]);

      if (userResult.rows.length === 0) {
        // Update lockout data for failed attempt
        if (req.updateLockoutData) {
          req.updateLockoutData(true);
        }
        return res.status(401).json({
          success: false,
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Invalid credentials',
            code: 401
          }
        });
      }

      const user = userResult.rows[0];

      // Check if email is verified
      if (!user.email_verified) {
        return res.status(403).json({
          success: false,
          error: {
            type: 'EMAIL_NOT_VERIFIED',
            message: 'Please verify your email address before logging in',
            code: 403
          },
          requiresVerification: true
        });
      }

      // Compare password with hash
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        // Update lockout data for failed attempt
        if (req.updateLockoutData) {
          req.updateLockoutData(true);
        }
        return res.status(401).json({
          success: false,
          error: {
            type: 'AUTHENTICATION_ERROR',
            message: 'Invalid credentials',
            code: 401
          }
        });
      }

      // Generate JWT token
      const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });

      // Update lockout data for successful attempt
      if (req.updateLockoutData) {
        req.updateLockoutData(false);
      }

      // Return success response
      res.status(200).json({
        success: true,
        message: 'Login successful',
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
      });
    } catch (error) {
      console.error('❌ Login error:', error.message);

      // Update lockout data for failed attempt
      if (req.updateLockoutData) {
        req.updateLockoutData(true);
      }

      return res.status(500).json({
        success: false,
        error: {
          type: 'INTERNAL_ERROR',
          message: 'Login service temporarily unavailable',
          code: 500
        }
      });
    }
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

// GET /api/user/status
// Get user's connection status for dashboard
router.get('/user/status', authenticateToken, async (req, res) => {
  try {
    // Get user's full information
    const userQuery = `
      SELECT id, email, first_name, last_name, company_name, created_at, last_login, email_verified
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

    // Check if user has any connected services (graceful handling if table doesn't exist)
    let connectedServices = [];
    try {
      const credentialsQuery = `
        SELECT service_name, created_at, expiry_date
        FROM credentials
        WHERE user_id = $1
      `;
      const credentials = await query(credentialsQuery, [req.user.id]);
      connectedServices = credentials.rows.map(cred => ({
        service: cred.service_name,
        connected_at: cred.created_at,
        expires_at: cred.expiry_date
      }));
    } catch (credError) {
      console.log('Credentials table not found or accessible, continuing without service data');
    }

    // Check OAuth connections (graceful handling if table doesn't exist)
    let oauthServices = [];
    try {
      const oauthQuery = `
        SELECT provider, access_token, created_at, expires_at
        FROM oauth_tokens
        WHERE user_id = $1 AND access_token IS NOT NULL
      `;
      const oauthResult = await query(oauthQuery, [req.user.id]);
      oauthServices = oauthResult.rows.map(oauth => ({
        service: oauth.provider,
        connected_at: oauth.created_at,
        expires_at: oauth.expires_at,
        status: 'active'
      }));
    } catch (oauthError) {
      console.log('OAuth tokens table not found or accessible, continuing without OAuth data');
    }

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
    } catch (actError) {
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
    } catch (oauthError) {
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
    const jwtToken = jwt.sign({ id: result.userId, email: result.email }, process.env.JWT_SECRET, { expiresIn: '7d' });

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
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Missing email',
        message: 'Email address is required'
      });
    }

    // Find user
    const userQuery = 'SELECT id, first_name, email_verified FROM users WHERE email = $1';
    const userResult = await query(userQuery, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        error: 'User not found',
        message: 'No account found with this email address'
      });
    }

    const user = userResult.rows[0];

    if (user.email_verified) {
      return res.status(400).json({
        error: 'Already verified',
        message: 'This email address is already verified'
      });
    }

    // Generate and send new verification token
    const verificationToken = emailService.generateVerificationToken();
    await emailService.storeVerificationToken(user.id, verificationToken);
    await emailService.sendVerificationEmail(email, user.first_name, verificationToken);

    res.json({
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      error: 'Failed to resend verification',
      message: 'Unable to send verification email'
    });
  }
});

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

// GET /api/auth/welcome
// Welcome endpoint that logs requests and returns a welcome message
router.get('/welcome', (req, res) => {
  // Log request metadata
  console.log(`Request received: ${req.method} ${req.path} at ${new Date().toISOString()}`);

  res.status(200).json({
    message: 'Welcome to the FloworxInvite API!'
  });
});

module.exports = router;
