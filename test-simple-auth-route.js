/**
 * Test Simple Auth Route
 * Create a simplified version of the auth route without circuit breakers and complex logic
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Import database operations
const { databaseOperations } = require('./backend/database/database-operations');

const app = express();
app.use(express.json());

// Simple validation function
const validateRegistrationInput = ({ email, password, firstName, lastName }) => {
  const errors = [];

  if (!email || !password || !firstName || !lastName) {
    errors.push('Missing required fields: email, password, firstName, lastName');
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Please provide a valid email address');
    }
    if (email.length > 255) {
      errors.push('Email address is too long');
    }
  }

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

// Simplified registration route (similar to the actual auth route but without circuit breakers)
app.post('/api/auth/register', async (req, res) => {
  const startTime = Date.now();
  const requestId = require('crypto').randomUUID();

  try {
    console.log('🔐 Registration attempt started', {
      requestId,
      email: req.body.email,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    const { email, password, firstName, lastName, businessName, companyName } = req.body;

    // Input validation
    const validationResult = validateRegistrationInput({ email, password, firstName, lastName });

    if (!validationResult.isValid) {
      console.log('❌ Registration validation failed', {
        requestId,
        email,
        errors: validationResult.errors
      });
      return res.status(400).json({
        success: false,
        error: validationResult.errors[0] || 'Invalid input data',
        requestId
      });
    }

    // Check if user exists
    console.log('🔍 Checking if user exists...');
    const existingUserResult = await databaseOperations.getUserByEmail(email);
    console.log('🔍 Existing user check result:', existingUserResult.error ? 'No user found' : 'User exists');

    if (!existingUserResult.error && existingUserResult.data) {
      console.log('⚠️ User already exists', { requestId, email });
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists',
        requestId
      });
    }

    // Hash password
    console.log('🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('✅ Password hashed successfully');

    // Prepare user data
    const userData = {
      id: uuidv4(),
      email: email.toLowerCase(),
      password_hash: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      company_name: companyName || businessName || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('👤 Creating user account', { requestId, userId: userData.id });

    // Create user (simplified - no circuit breaker)
    const createResult = await databaseOperations.createUser(userData);
    console.log('👤 User creation result:', createResult.error ? `Error: ${createResult.error.message}` : 'Success');

    if (createResult.error) {
      console.error('❌ User creation failed', {
        requestId,
        error: createResult.error.message,
        userId: userData.id
      });
      return res.status(500).json({
        success: false,
        error: 'Failed to create user account',
        requestId,
        details: createResult.error.message
      });
    }

    // Generate JWT token (simplified - no circuit breaker)
    console.log('🎫 Generating JWT token...');
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
        requestId
      });
    }

    const token = jwt.sign(
      { userId: userData.id, email: userData.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    console.log('✅ JWT token generated successfully');

    const responseTime = Date.now() - startTime;
    console.log('🎉 Registration completed successfully', {
      requestId,
      userId: userData.id,
      email: userData.email,
      responseTime: `${responseTime}ms`
    });

    // Success response
    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: createResult.data.id,
        email: createResult.data.email,
        firstName: createResult.data.first_name,
        lastName: createResult.data.last_name,
        companyName: createResult.data.company_name
      },
      token,
      expiresIn: '24h',
      requestId
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('💥 Registration failed with error', {
      requestId,
      error: error.message,
      stack: error.stack,
      responseTime: `${responseTime}ms`
    });

    res.status(500).json({
      success: false,
      error: 'Registration failed due to server error',
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'simple-auth-test'
  });
});

// Start server
const PORT = 3003;
app.listen(PORT, () => {
  console.log(`🧪 Simple Auth Test Server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  POST /api/auth/register - Simplified registration');
  console.log('  GET  /api/health - Health check');
  console.log('\nTo test registration:');
  console.log(`curl -X POST http://localhost:${PORT}/api/auth/register -H "Content-Type: application/json" -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"TestPass123!","companyName":"Test Co"}'`);
});
