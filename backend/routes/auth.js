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
const { makeLimiter } = require('../middleware/rateLimiter');
const { asyncHandler, successResponse } = require('../middleware/standardErrorHandler');
const { sign, makeRefresh } = require('../utils/jwt');
const requireAuth = require('../middleware/requireAuth');
const { ErrorResponse } = require('../utils/ErrorResponse');
const { validateRequest } = require('../schemas/common');
const { logger } = require('../utils/logger');
const { databaseCircuitBreaker, authCircuitBreaker } = require('../utils/circuitBreaker');
const { generateCSRFToken } = require('../middleware/csrf');

const router = express.Router();

// EMERGENCY TEST ROUTE - Bypass all middleware and dependencies
router.post('/test-emergency', (req, res) => {
  try {
    console.log('🚨 Emergency test route called');
    res.status(200).json({
      success: true,
      message: 'Emergency route working',
      timestamp: new Date().toISOString(),
      body: req.body
    });
  } catch (error) {
    console.error('Emergency route error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// GET /api/auth/csrf - Issue CSRF token
router.get('/csrf', (req, res) => {
  try {
    const csrfToken = generateCSRFToken();

    // Set CSRF cookie (non-HttpOnly so frontend can read it)
    const csrfCookieOptions = {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    };

    res.cookie('fx_csrf', csrfToken, csrfCookieOptions);

    res.status(200).json({
      csrf: csrfToken
    });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate CSRF token'
      }
    });
  }
});

// Helper function for database queries
const query = async (sql, params) => {
  await databaseManager.initialize();
  return databaseManager.query(sql, params);
};

// Enhanced validation helper functions
const validateRegistrationInput = ({ email, password, firstName, lastName }) => {
  const errors = [];

  // Required fields validation
  if (!email || !password || !firstName || !lastName) {
    errors.push('Missing required fields: email, password, firstName, lastName');
  }

  // Email format validation
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please provide a valid email address');
    }
    if (email.length > 255) {
      errors.push('Email address is too long');
    }
  }

  // Password strength validation
  if (password) {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (password.length > 128) {
      errors.push('Password is too long');
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }
  }

  // Name validation
  if (firstName && firstName.length > 100) {
    errors.push('First name is too long');
  }
  if (lastName && lastName.length > 100) {
    errors.push('Last name is too long');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const validateLoginInput = ({ email, password }) => {
  const errors = [];

  if (!email || !password) {
    errors.push('Email and password are required');
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please provide a valid email address');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
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
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Email and password are required" }
      });
    }

    // Email validation (simple regex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Invalid email format" }
      });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Password must be at least 8 characters long" }
      });
    }

    // Check for duplicate email
    const existingUser = await databaseOperations.getUserByEmail(email);
    if (existingUser.data) {
      return res.status(409).json({
        error: { code: "EMAIL_EXISTS", message: "Email already registered" }
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const userData = {
      id: require('crypto').randomUUID(),
      email: email.toLowerCase().trim(),
      password_hash: passwordHash,
      created_at: new Date().toISOString()
    };

    const createResult = await databaseOperations.createUser(userData);

    if (createResult.error) {
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Unexpected error" }
      });
    }

    // Success response
    res.status(201).json({
      userId: createResult.data.id
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: { code: "INTERNAL", message: "Unexpected error" }
    });
  }
});



// Rate limiting for login requests (10 requests / min per IP+email)
const loginRateLimiter = makeLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 10,
  keyBy: (req) => `${req.ip}:${(req.body?.email || '').toLowerCase()}`
});

// POST /api/auth/login
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({
        error: { code: "BAD_REQUEST", message: "Email and password are required" }
      });
    }

    // Find user by email
    const userResult = await databaseOperations.getUserByEmail(email);

    if (userResult.error || !userResult.data) {
      return res.status(401).json({
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" }
      });
    }

    const user = userResult.data;

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" }
      });
    }

    // Check if user is verified
    if (!user.email_verified) {
      return res.status(409).json({
        error: {
          code: "UNVERIFIED",
          message: "Email not verified"
        },
        resendUrl: "/api/auth/resend"
      });
    }

    // Success - create JWT session cookie and refresh token
    const sessionTtlMin = parseInt(process.env.SESSION_TTL_MIN) || 15;
    const refreshTtlDays = parseInt(process.env.REFRESH_TTL_DAYS) || 30;

    const accessToken = sign({ sub: user.id }, sessionTtlMin);
    const refreshToken = makeRefresh();

    // Store refresh token
    const refreshResult = await databaseOperations.createRefreshToken(user.id, refreshToken, refreshTtlDays);
    if (refreshResult.error) {
      console.error('Failed to create refresh token:', refreshResult.error);
      // Continue without refresh token - access token still works
    }

    // Set secure session cookie
    const accessCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: sessionTtlMin * 60 * 1000 // Convert minutes to milliseconds
    };

    // Set refresh cookie (longer TTL, restricted path)
    const refreshCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: refreshTtlDays * 24 * 60 * 60 * 1000 // Convert days to milliseconds
    };

    res.cookie('fx_sess', accessToken, accessCookieOptions);
    if (!refreshResult.error) {
      res.cookie('fx_refresh', refreshToken, refreshCookieOptions);
    }

    res.status(200).json({
      userId: user.id
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: { code: "INTERNAL", message: "Unexpected error" }
    });
  }
});

// GET /api/auth/me
// Get current user info from session cookie
router.get('/me', requireAuth, (req, res) => {
  res.status(200).json({
    userId: req.auth.userId
  });
});

// POST /api/auth/logout
// Clear session cookie and revoke refresh token
router.post('/logout', async (req, res) => {
  try {
    // Revoke refresh token if present
    const refreshToken = req.cookies?.fx_refresh;
    if (refreshToken) {
      await databaseOperations.revokeRefreshToken(refreshToken);
    }

    // Clear session cookie with same options as when set
    const accessCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    };

    // Clear refresh cookie
    const refreshCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth'
    };

    res.clearCookie('fx_sess', accessCookieOptions);
    res.clearCookie('fx_refresh', refreshCookieOptions);
    res.status(204).send();
  } catch (error) {
    console.error('Logout error:', error);
    // Still clear cookies even if revocation fails
    res.clearCookie('fx_sess');
    res.clearCookie('fx_refresh');
    res.status(204).send();
  }
});

// Rate limiting for refresh endpoint (20 requests / min per IP)
const refreshRateLimiter = makeLimiter({
  windowMs: 60 * 1000, // 1 minute
  limit: 20,
  keyBy: (req) => req.ip
});

// POST /api/auth/refresh
// Refresh access token using refresh token
router.post('/refresh', refreshRateLimiter, async (req, res) => {
  try {

    const refreshToken = req.cookies?.fx_refresh;

    if (!refreshToken) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Invalid or expired refresh token" }
      });
    }

    // Find and validate refresh token
    const tokenResult = await databaseOperations.findRefreshToken(refreshToken);

    if (tokenResult.error || !tokenResult.data) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Invalid or expired refresh token" }
      });
    }

    const tokenData = tokenResult.data;

    // Check if token is expired
    if (Date.now() > tokenData.exp) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Invalid or expired refresh token" }
      });
    }

    // Check if token has been used (reuse detection)
    if (tokenData.used) {
      // Token reuse detected - revoke all tokens for user if configured
      const revokeAllOnReuse = process.env.REVOKE_ALL_ON_REUSE !== 'false'; // Default true

      if (revokeAllOnReuse) {
        await databaseOperations.revokeAllRefreshTokensForUser(tokenData.userId);
      }

      return res.status(419).json({
        error: { code: "TOKEN_REUSED", message: "Refresh token reuse detected" }
      });
    }

    // Rotate tokens
    const newRefreshToken = makeRefresh();
    const refreshTtlDays = parseInt(process.env.REFRESH_TTL_DAYS) || 30;

    const rotateResult = await databaseOperations.rotateRefreshToken(
      refreshToken,
      newRefreshToken,
      refreshTtlDays
    );

    if (rotateResult.error) {
      return res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Invalid or expired refresh token" }
      });
    }

    // Create new access token
    const sessionTtlMin = parseInt(process.env.SESSION_TTL_MIN) || 15;
    const newAccessToken = sign({ sub: rotateResult.data.userId }, sessionTtlMin);

    // Set new cookies
    const accessCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: sessionTtlMin * 60 * 1000
    };

    const refreshCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth',
      maxAge: refreshTtlDays * 24 * 60 * 60 * 1000
    };

    res.cookie('fx_sess', newAccessToken, accessCookieOptions);
    res.cookie('fx_refresh', newRefreshToken, refreshCookieOptions);

    res.status(200).json({
      userId: rotateResult.data.userId
    });

  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({
      error: { code: "INTERNAL", message: "Unexpected error" }
    });
  }
});

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
    console.log('📊 Dashboard request for user:', req.user.id);

    // Get user's full information using databaseOperations
    const userResult = await databaseOperations.getUserById(req.user.id);

    if (userResult.error || !userResult.data) {
      console.log('❌ User not found:', req.user.id);
      return res.status(404).json({
        error: 'User not found',
        message: 'User account not found'
      });
    }

    const userDetails = userResult.data;
    console.log('✅ User found:', userDetails.email);

    // Simplified dashboard data (avoiding complex queries for now)
    const recentActivities = [];
    const connections = { google: { connected: false } };

    console.log('📊 Preparing dashboard data...');

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
// Enhanced email verification endpoint (for email links)
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
    const tokenResult = await databaseOperations.getEmailVerificationToken(token);

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
    const updateResult = await databaseOperations.markEmailAsVerified(user_id);

    if (updateResult.error) {
      return res.status(500).json({
        success: false,
        error: 'Verification failed',
        message: 'Unable to update email verification status'
      });
    }

    // Delete used token
    await databaseOperations.deleteEmailVerificationToken(token);

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

// POST /api/auth/verify-email
// Email verification endpoint (for API calls)
router.post('/verify-email', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Missing token',
        message: 'Verification token is required'
      });
    }

    // Get verification token from database
    const tokenResult = await databaseOperations.getEmailVerificationToken(token);

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
    const updateResult = await databaseOperations.markEmailAsVerified(user_id);

    if (updateResult.error) {
      return res.status(500).json({
        success: false,
        error: 'Verification failed',
        message: 'Unable to update email verification status'
      });
    }

    // Delete used token
    await databaseOperations.deleteEmailVerificationToken(token);

    // Get updated user data
    const userResult = await databaseOperations.getUserById(user_id);
    const user = userResult.data;

    // Generate JWT token for the verified user
    const jwtToken = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        emailVerified: true
      },
      token: jwtToken
    });
  } catch (error) {
    logger.error('Email verification error', { error, token: req.body.token });
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

// POST /api/auth/resend
// Resend verification email with throttling (1/min per user)
router.post('/resend', asyncHandler(async (req, res) => {
  const { email, returnTo } = req.body; // Accept returnTo but ignore it (no-op)

  if (!email) {
    return res.status(400).json({
      error: { code: "MISSING_EMAIL", message: "Email address is required" }
    });
  }

  // Check throttling (1/min per user)
  const throttleKey = `resend_throttle:${email}`;
  try {
    const lastResend = await redisManager.get(throttleKey);
    if (lastResend) {
      return res.status(429).json({
        error: { code: "THROTTLED", message: "Please wait before requesting another verification email" }
      });
    }
  } catch (error) {
    // Continue if Redis is unavailable
    logger.warn('Redis unavailable for throttling check', { error: error.message });
  }

  const userResult = await databaseOperations.getUserByEmail(email.toLowerCase());

  if (!userResult.data) {
    // Always return 202 for security (don't reveal user existence)
    return res.status(202).json({
      message: "If this email is registered, a verification email will be sent"
    });
  }

  const user = userResult.data;

  if (user.email_verified) {
    // Still return 202 to not reveal user status
    return res.status(202).json({
      message: "If this email is registered, a verification email will be sent"
    });
  }

  // Set throttle (1 minute)
  try {
    await redisManager.setex(throttleKey, 60, Date.now().toString());
  } catch (error) {
    logger.warn('Redis unavailable for throttling', { error: error.message });
  }

  // Invalidate any existing tokens for this user
  try {
    await query('DELETE FROM email_verification_tokens WHERE user_id = $1', [user.id]);
  } catch (error) {
    logger.warn('Failed to invalidate existing tokens', { error: error.message });
  }

  // Generate new verification token (15 minutes expiry)
  const verificationToken = emailService.generateVerificationToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await databaseOperations.createEmailVerificationToken(user.id, verificationToken, expiresAt.toISOString());

  // Send verification email (use fake mailer in test)
  try {
    await emailService.sendVerificationEmail(email, user.first_name, verificationToken);
  } catch (error) {
    logger.warn('Email sending failed', { error: error.message });
    // Don't fail the request - token is still created
  }

  res.status(202).json({
    message: "If this email is registered, a verification email will be sent"
  });
}));

// POST /api/auth/verify
// Verify email with token
router.post('/verify', asyncHandler(async (req, res) => {
  const { token, returnTo } = req.body;

  if (!token) {
    return res.status(400).json({
      error: { code: "MISSING_TOKEN", message: "Verification token is required" }
    });
  }

  // Get verification token from database
  const tokenResult = await databaseOperations.getEmailVerificationToken(token);

  if (!tokenResult.data) {
    return res.status(401).json({
      error: { code: "INVALID_TOKEN", message: "Invalid verification token" }
    });
  }

  const { user_id, expires_at } = tokenResult.data;

  // Check if token is expired
  if (new Date() > new Date(expires_at)) {
    return res.status(410).json({
      error: { code: "EXPIRED_TOKEN", message: "Verification token has expired" }
    });
  }

  // Update user's email verification status
  const updateResult = await databaseOperations.markEmailAsVerified(user_id);

  if (updateResult.error) {
    return res.status(500).json({
      error: { code: "VERIFICATION_FAILED", message: "Unable to verify email address" }
    });
  }

  // Delete used token (single-use)
  await databaseOperations.deleteEmailVerificationToken(token);

  // Sanitize returnTo if provided
  const { sanitizeReturnTo } = require('../utils/urls');
  const safeReturnTo = sanitizeReturnTo(returnTo);

  res.status(200).json({
    message: "Email verified successfully",
    ...(safeReturnTo && { returnTo: safeReturnTo })
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

// =====================================================
// PASSWORD RESET ENDPOINTS
// =====================================================

// Rate limiting for password reset requests (3 requests / 15 min per user)
const passwordResetRateLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 3,
  keyBy: (req) => `${req.ip}:${(req.body?.email || '').toLowerCase()}`
});

// POST /api/auth/password/request
router.post('/password/request', passwordResetRateLimiter, asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      error: { code: "MISSING_EMAIL", message: "Email address is required" }
    });
  }

  // Always return 202 regardless of whether user exists (security)
  const userResult = await databaseOperations.getUserByEmail(email.toLowerCase());

  if (userResult.data) {
    try {
      // Invalidate existing tokens for this user
      await databaseOperations.invalidateUserResetTokens(userResult.data.id);

      // Create new reset token (60 minute TTL)
      const { token } = await databaseOperations.createPasswordResetToken(userResult.data.id, 60);

      // Store token for test helper if in test environment
      if (process.env.NODE_ENV === 'test') {
        global.lastResetToken = { email: email.toLowerCase(), token };
      }

      // In a real implementation, send email here
      // await emailService.sendPasswordResetEmail(email, userResult.data.first_name, token);

    } catch (error) {
      logger.warn('Password reset token creation failed', { error: error.message });
      // Don't fail the request - always return 202
    }
  }

  res.status(202).json({
    message: "If this email is registered, a password reset link will be sent"
  });
}));

// Password strength validation
const validatePasswordStrength = (password) => {
  if (!password || password.length < 8) {
    return false;
  }

  // Check for at least one uppercase, one lowercase, one number
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  return hasUpper && hasLower && hasNumber;
};

// POST /api/auth/password/reset
router.post('/password/reset', asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({
      error: { code: "MISSING_FIELDS", message: "Token and password are required" }
    });
  }

  // Validate password strength
  if (!validatePasswordStrength(password)) {
    return res.status(400).json({
      error: { code: "WEAK_PASSWORD", message: "Password must be at least 8 characters with uppercase, lowercase, and number" }
    });
  }

  try {
    // Consume the token (single-use)
    const { userId } = await databaseOperations.consumePasswordResetToken(token);

    // Hash the new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Set new password and update timestamp
    await databaseOperations.setUserPassword(userId, passwordHash);

    // Clear all reset tokens for this user
    await databaseOperations.invalidateUserResetTokens(userId);

    res.status(200).json({
      message: "Password reset successful"
    });

  } catch (error) {
    if (error.message === 'INVALID_TOKEN') {
      return res.status(401).json({
        error: { code: "INVALID_TOKEN", message: "Invalid or unknown reset token" }
      });
    } else if (error.message === 'TOKEN_EXPIRED') {
      return res.status(410).json({
        error: { code: "TOKEN_EXPIRED", message: "Reset token has expired or already been used" }
      });
    } else {
      logger.error('Password reset error', { error: error.message });
      return res.status(500).json({
        error: { code: "INTERNAL", message: "Unexpected error" }
      });
    }
  }
}));

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

// POST /api/auth/forgot-password
// Forgot password endpoint (redirects to password reset service)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: { code: "BAD_REQUEST", message: "Email is required" }
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: { code: "BAD_REQUEST", message: "Invalid email format" }
      });
    }

    // Redirect to password reset service
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    const passwordResetService = require('../services/passwordResetService');
    const result = await passwordResetService.initiatePasswordReset(email, ipAddress, userAgent);

    return res.json(result);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL", message: "Unexpected error" }
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
      email_verified: true
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

// GET /api/auth/profile
// Get user profile information
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const userResult = await databaseOperations.getUserById(userId);
    if (userResult.error || !userResult.data) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = userResult.data;
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        companyName: user.company_name,
        emailVerified: user.email_verified || false,
        onboardingCompleted: user.onboarding_completed || false,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

// GET /api/auth/verify-email/:token
// Email verification endpoint (basic implementation)
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Verification token is required'
      });
    }

    // For now, return a basic response indicating the endpoint exists
    // In a full implementation, this would verify the token and update user status
    res.status(200).json({
      success: true,
      message: 'Email verification endpoint is available',
      note: 'Full email verification implementation pending'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Email verification failed'
    });
  }
});

module.exports = router;
