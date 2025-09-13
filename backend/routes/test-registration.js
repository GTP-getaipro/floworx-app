/**
 * Test Registration Endpoint
 * TEMPORARY - For debugging registration issues
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { databaseOperations } = require('../database/database-operations');

const router = express.Router();

// POST /api/test-registration
// Test user creation with detailed error reporting
router.post('/', async (req, res) => {
  try {
    console.log('🧪 Test registration started');
    console.log('Request body:', req.body);

    const { firstName, lastName, email, password } = req.body;

    // Step 1: Check database connection
    console.log('Step 1: Checking database connection...');
    const connectionInfo = databaseOperations.getConnectionInfo();
    console.log('Connection info:', connectionInfo);

    // Step 2: Test health check
    console.log('Step 2: Testing database health...');
    const healthResult = await databaseOperations.healthCheck();
    console.log('Health result:', healthResult);

    // Step 3: Check if user exists
    console.log('Step 3: Checking if user exists...');
    const existingUserResult = await databaseOperations.getUserByEmail(email);
    console.log('Existing user result:', existingUserResult);

    if (existingUserResult.data) {
      return res.status(409).json({
        error: 'User already exists',
        step: 'user_check',
        details: 'A user with this email already exists'
      });
    }

    // Step 4: Hash password
    console.log('Step 4: Hashing password...');
    const passwordHash = await bcrypt.hash(password, 12);
    console.log('Password hashed successfully');

    // Step 5: Generate user ID
    console.log('Step 5: Generating user ID...');
    const userId = require('crypto').randomUUID();
    console.log('User ID generated:', userId);

    // Step 6: Prepare user data
    console.log('Step 6: Preparing user data...');
    const userData = {
      id: userId,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      first_name: firstName,
      last_name: lastName,
      company_name: null,
      created_at: new Date().toISOString()
    };
    console.log('User data prepared:', { ...userData, password_hash: '[REDACTED]' });

    // Step 7: Create user
    console.log('Step 7: Creating user...');
    const createUserResult = await databaseOperations.createUser(userData);
    console.log('Create user result:', createUserResult);

    if (createUserResult.error) {
      return res.status(500).json({
        error: 'User creation failed',
        step: 'user_creation',
        details: createUserResult.error.message,
        supabaseError: createUserResult.error
      });
    }

    console.log('✅ Test registration completed successfully');

    res.status(201).json({
      success: true,
      message: 'Test registration completed successfully',
      user: {
        id: createUserResult.data.id,
        email: createUserResult.data.email,
        firstName: createUserResult.data.first_name,
        lastName: createUserResult.data.last_name
      },
      steps_completed: [
        'database_connection_check',
        'health_check',
        'user_existence_check',
        'password_hashing',
        'user_id_generation',
        'user_data_preparation',
        'user_creation'
      ]
    });

  } catch (error) {
    console.error('❌ Test registration error:', error);
    console.error('Error stack:', error.stack);

    res.status(500).json({
      error: 'Test registration failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/test-registration/info
// Get registration system info
router.get('/info', async (req, res) => {
  try {
    const connectionInfo = databaseOperations.getConnectionInfo();
    const healthResult = await databaseOperations.healthCheck();

    res.status(200).json({
      connection: connectionInfo,
      health: healthResult,
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseAnonKey: !!process.env.SUPABASE_ANON_KEY,
        hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
        hasJwtSecret: !!process.env.JWT_SECRET
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Info check failed',
      message: error.message
    });
  }
});

module.exports = router;
