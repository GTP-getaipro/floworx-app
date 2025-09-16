/**
 * Debug Auth Route Issues
 * Test individual components of the auth route to identify the problem
 */

const express = require('express');
const path = require('path');

// Set up basic Express app for testing
const app = express();
app.use(express.json());

// Test basic route
app.get('/test', (req, res) => {
  res.json({ message: 'Basic route working' });
});

// Test auth route imports
app.get('/test-imports', async (req, res) => {
  try {
    console.log('Testing imports...');
    
    const results = {};
    
    // Test bcrypt
    try {
      const bcrypt = require('bcryptjs');
      results.bcrypt = 'OK';
    } catch (error) {
      results.bcrypt = `ERROR: ${error.message}`;
    }
    
    // Test jwt
    try {
      const jwt = require('jsonwebtoken');
      results.jwt = 'OK';
    } catch (error) {
      results.jwt = `ERROR: ${error.message}`;
    }
    
    // Test logger
    try {
      const logger = require('./backend/utils/logger');
      results.logger = 'OK';
    } catch (error) {
      results.logger = `ERROR: ${error.message}`;
    }
    
    // Test database operations
    try {
      const { databaseOperations } = require('./backend/database/database-operations');
      results.databaseOperations = 'OK';
    } catch (error) {
      results.databaseOperations = `ERROR: ${error.message}`;
    }
    
    // Test circuit breaker
    try {
      const { databaseCircuitBreaker } = require('./backend/utils/circuitBreaker');
      results.circuitBreaker = 'OK';
    } catch (error) {
      results.circuitBreaker = `ERROR: ${error.message}`;
    }
    
    // Test validation schema
    try {
      const { registerSchema } = require('./backend/schemas/auth');
      results.registerSchema = 'OK';
    } catch (error) {
      results.registerSchema = `ERROR: ${error.message}`;
    }
    
    res.json({
      success: true,
      imports: results
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Test simple registration validation
app.post('/test-validation', (req, res) => {
  try {
    console.log('Testing validation with body:', req.body);
    
    const { email, password, firstName, lastName } = req.body;
    
    // Simple validation function (copied from auth.js)
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
    
    const validationResult = validateRegistrationInput({ email, password, firstName, lastName });
    
    res.json({
      success: true,
      validation: validationResult,
      receivedData: { email, firstName, lastName, passwordLength: password ? password.length : 0 }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Test database connection
app.get('/test-database', async (req, res) => {
  try {
    console.log('Testing database connection...');
    
    // Try to import and test database operations
    const { databaseOperations } = require('./backend/database/database-operations');
    
    // Test health check
    const healthResult = await databaseOperations.healthCheck();
    
    res.json({
      success: true,
      database: {
        health: healthResult,
        connectionInfo: databaseOperations.getConnectionInfo()
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Test simplified registration
app.post('/test-register', async (req, res) => {
  try {
    console.log('Testing simplified registration with body:', req.body);

    const { email, password, firstName, lastName, companyName } = req.body;

    // Import required modules
    const bcrypt = require('bcryptjs');
    const { databaseOperations } = require('./backend/database/database-operations');

    // Simple validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Check if user exists
    console.log('Checking if user exists...');
    const existingUser = await databaseOperations.getUserByEmail(email);
    console.log('Existing user check result:', existingUser);

    if (existingUser.success && existingUser.data) {
      return res.status(409).json({
        success: false,
        error: 'User already exists'
      });
    }

    // Hash password
    console.log('Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 12);
    console.log('Password hashed successfully');

    // Create user
    console.log('Creating user...');
    const createResult = await databaseOperations.createUser({
      email: email.toLowerCase(),
      password_hash: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      company_name: companyName || null
    });

    console.log('User creation result:', createResult);

    // Check for Supabase-style response format
    if (createResult.error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create user',
        details: createResult.error
      });
    }

    if (!createResult.data) {
      return res.status(500).json({
        success: false,
        error: 'User creation returned no data'
      });
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: createResult.data.id,
        email: createResult.data.email,
        firstName: createResult.data.first_name,
        lastName: createResult.data.last_name
      }
    });

  } catch (error) {
    console.error('Registration test error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Start debug server
const PORT = 3002;
app.listen(PORT, () => {
  console.log(`🔍 Debug server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /test - Basic route test');
  console.log('  GET  /test-imports - Test all imports');
  console.log('  POST /test-validation - Test validation logic');
  console.log('  GET  /test-database - Test database connection');
  console.log('  POST /test-register - Test simplified registration');
  console.log('\nTo test registration:');
  console.log(`curl -X POST http://localhost:${PORT}/test-register -H "Content-Type: application/json" -d '{"firstName":"Test","lastName":"User","email":"test@example.com","password":"TestPass123!","companyName":"Test Co"}'`);
});
