const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../database/connection');
const { authenticateToken } = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Input validation helper
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password && password.length >= 8;
};

// POST /api/auth/register
// Register a new user account
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, companyName } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        error: 'Invalid email',
        message: 'Please provide a valid email address'
      });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Password must be at least 8 characters long'
      });
    }

    // Check if user already exists
    const existingUserQuery = 'SELECT id, email_verified FROM users WHERE email = $1';
    const existingUser = await pool.query(existingUserQuery, [email.toLowerCase()]);

    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      if (user.email_verified) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'An account with this email already exists'
        });
      } else {
        // User exists but email not verified - resend verification
        const verificationToken = emailService.generateVerificationToken();
        await emailService.storeVerificationToken(user.id, verificationToken);
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

    // Create new user with extended fields
    const insertUserQuery = `
      INSERT INTO users (
        email, password_hash, first_name, last_name, company_name,
        trial_started_at, trial_ends_at, subscription_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, email, first_name, last_name, company_name, created_at
    `;
    const newUser = await pool.query(insertUserQuery, [
      email.toLowerCase(), passwordHash, firstName, lastName, companyName,
      trialStartsAt, trialEndsAt, 'trial'
    ]);

    const user = newUser.rows[0];

    // Generate and store verification token
    const verificationToken = emailService.generateVerificationToken();
    await emailService.storeVerificationToken(user.id, verificationToken);

    // Send verification email
    await emailService.sendVerificationEmail(email, firstName, verificationToken);

    res.status(201).json({
      message: 'User registered successfully. Please check your email to verify your account.',
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

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'Internal server error during registration'
    });
  }
});

// POST /api/auth/login
// Authenticate user and return JWT
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email and password are required'
      });
    }

    // Find user by email
    const userQuery = 'SELECT id, email, password_hash, email_verified, first_name FROM users WHERE email = $1';
    const userResult = await pool.query(userQuery, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    const user = userResult.rows[0];

    // Check if email is verified
    if (!user.email_verified) {
      return res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email address before logging in',
        requiresVerification: true
      });
    }

    // Compare password with hash
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Internal server error during login'
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

// GET /api/user/status
// Get user's connection status for dashboard
router.get('/user/status', authenticateToken, async (req, res) => {
  try {
    // Check if user has any connected services
    const credentialsQuery = `
      SELECT service_name, created_at, expiry_date 
      FROM credentials 
      WHERE user_id = $1
    `;
    const credentials = await pool.query(credentialsQuery, [req.user.id]);

    const connectedServices = credentials.rows.map(cred => ({
      service: cred.service_name,
      connected_at: cred.created_at,
      expires_at: cred.expiry_date
    }));

    res.json({
      user: req.user,
      connected_services: connectedServices,
      has_google_connection: connectedServices.some(service => service.service === 'google')
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      error: 'Status check failed',
      message: 'Unable to retrieve user status'
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
    const jwtToken = jwt.sign(
      { id: result.userId, email: result.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

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
    const userResult = await pool.query(userQuery, [email.toLowerCase()]);

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

    const result = await pool.query(updateQuery, [userId]);

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

module.exports = router;
