/**
 * E2E Test Environment Setup for FloWorx SaaS
 * Configures isolated test environment with production-like settings
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

/**
 * Test environment configuration
 */
const TEST_CONFIG = {
  database: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 5432,
    database: process.env.TEST_DB_NAME || 'floworx_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || 'password'
  },
  
  server: {
    port: process.env.TEST_SERVER_PORT || 5001,
    host: 'localhost'
  },
  
  frontend: {
    port: process.env.TEST_FRONTEND_PORT || 3001,
    host: 'localhost'
  },
  
  // Production-like security settings for testing
  security: {
    ACCOUNT_RECOVERY_TOKEN_EXPIRY: 86400000, // 24 hours
    MAX_FAILED_LOGIN_ATTEMPTS: 5,
    ACCOUNT_LOCKOUT_DURATION: 900000, // 15 minutes
    PROGRESSIVE_LOCKOUT_MULTIPLIER: 2,
    JWT_SECRET: 'test-jwt-secret-key-for-e2e-testing',
    JWT_EXPIRES_IN: '24h',
    BCRYPT_ROUNDS: 10
  },
  
  // Test data configuration
  testData: {
    users: {
      valid: {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@floworx-test.com',
        password: 'TestPass123!',
        businessName: 'Test Hot Tub Services',
        businessType: 'hot_tub'
      },
      admin: {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@floworx-test.com',
        password: 'AdminPass123!',
        businessName: 'Admin Business',
        businessType: 'hot_tub',
        role: 'admin'
      },
      invalid: {
        email: 'invalid-email',
        password: '123', // Too weak
        businessName: '', // Empty
        businessType: 'invalid'
      }
    }
  }
};

/**
 * Test Environment Manager
 */
class TestEnvironment {
  constructor() {
    this.dbClient = null;
    this.serverProcess = null;
    this.frontendProcess = null;
    this.isSetup = false;
  }

  /**
   * Setup complete test environment
   */
  async setup() {
    console.log('🚀 Setting up E2E test environment...');
    
    try {
      // Step 1: Setup test database
      await this.setupDatabase();
      
      // Step 2: Create test environment file
      await this.createTestEnvFile();
      
      // Step 3: Seed test data
      await this.seedTestData();
      
      // Step 4: Start backend server
      await this.startBackendServer();
      
      // Step 5: Start frontend server
      await this.startFrontendServer();
      
      // Step 6: Wait for services to be ready
      await this.waitForServices();
      
      this.isSetup = true;
      console.log('✅ Test environment setup complete');
      
    } catch (error) {
      console.error('❌ Test environment setup failed:', error);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Setup test database
   */
  async setupDatabase() {
    console.log('📊 Setting up test database...');
    
    // Connect to PostgreSQL to create test database
    const adminClient = new Client({
      host: TEST_CONFIG.database.host,
      port: TEST_CONFIG.database.port,
      user: TEST_CONFIG.database.user,
      password: TEST_CONFIG.database.password,
      database: 'postgres' // Connect to default database first
    });
    
    try {
      await adminClient.connect();
      
      // Drop test database if exists
      await adminClient.query(`DROP DATABASE IF EXISTS ${TEST_CONFIG.database.database}`);
      
      // Create fresh test database
      await adminClient.query(`CREATE DATABASE ${TEST_CONFIG.database.database}`);
      
      console.log(`✅ Test database '${TEST_CONFIG.database.database}' created`);
      
    } finally {
      await adminClient.end();
    }
    
    // Connect to test database and run schema
    this.dbClient = new Client(TEST_CONFIG.database);
    await this.dbClient.connect();
    
    // Run database schema
    const schemaPath = path.join(__dirname, '../../../backend/database/schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await this.dbClient.query(schema);
      console.log('✅ Database schema applied');
    }
    
    // Run optimizations
    const optimizationsPath = path.join(__dirname, '../../../scripts/optimize-database.sql');
    if (fs.existsSync(optimizationsPath)) {
      const optimizations = fs.readFileSync(optimizationsPath, 'utf8');
      await this.dbClient.query(optimizations);
      console.log('✅ Database optimizations applied');
    }
  }

  /**
   * Create test environment file
   */
  async createTestEnvFile() {
    console.log('📝 Creating test environment file...');
    
    const envContent = `
# E2E Test Environment Configuration
NODE_ENV=test
PORT=${TEST_CONFIG.server.port}

# Database Configuration
DB_HOST=${TEST_CONFIG.database.host}
DB_PORT=${TEST_CONFIG.database.port}
DB_NAME=${TEST_CONFIG.database.database}
DB_USER=${TEST_CONFIG.database.user}
DB_PASSWORD=${TEST_CONFIG.database.password}

# Security Configuration (Production-like)
JWT_SECRET=${TEST_CONFIG.security.JWT_SECRET}
JWT_EXPIRES_IN=${TEST_CONFIG.security.JWT_EXPIRES_IN}
BCRYPT_ROUNDS=${TEST_CONFIG.security.BCRYPT_ROUNDS}

# Account Security Settings
ACCOUNT_RECOVERY_TOKEN_EXPIRY=${TEST_CONFIG.security.ACCOUNT_RECOVERY_TOKEN_EXPIRY}
MAX_FAILED_LOGIN_ATTEMPTS=${TEST_CONFIG.security.MAX_FAILED_LOGIN_ATTEMPTS}
ACCOUNT_LOCKOUT_DURATION=${TEST_CONFIG.security.ACCOUNT_LOCKOUT_DURATION}
PROGRESSIVE_LOCKOUT_MULTIPLIER=${TEST_CONFIG.security.PROGRESSIVE_LOCKOUT_MULTIPLIER}

# Email Configuration (Test)
EMAIL_SERVICE=test
EMAIL_FROM=test@floworx-test.com
EMAIL_HOST=localhost
EMAIL_PORT=1025

# OAuth Configuration (Test)
GOOGLE_CLIENT_ID=test-google-client-id
GOOGLE_CLIENT_SECRET=test-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:${TEST_CONFIG.server.port}/api/oauth/google/callback

# Redis Configuration (Test)
REDIS_URL=redis://localhost:6379/1

# Frontend URL
FRONTEND_URL=http://localhost:${TEST_CONFIG.frontend.port}

# Test Flags
E2E_TESTING=true
DISABLE_RATE_LIMITING=false
ENABLE_TEST_ROUTES=true
`;

    const envPath = path.join(__dirname, '../../../backend/.env.test');
    fs.writeFileSync(envPath, envContent.trim());
    console.log('✅ Test environment file created');
  }

  /**
   * Seed test data
   */
  async seedTestData() {
    console.log('🌱 Seeding test data...');
    
    const bcrypt = require('bcryptjs');
    
    // Create test users
    for (const [key, userData] of Object.entries(TEST_CONFIG.testData.users)) {
      if (key === 'invalid') continue; // Skip invalid user data
      
      const hashedPassword = await bcrypt.hash(userData.password, TEST_CONFIG.security.BCRYPT_ROUNDS);
      
      await this.dbClient.query(`
        INSERT INTO users (
          first_name, last_name, email, password_hash, 
          email_verified, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (email) DO NOTHING
      `, [
        userData.firstName,
        userData.lastName,
        userData.email,
        hashedPassword,
        true // Pre-verify for testing
      ]);
      
      // Get user ID for business configuration
      const userResult = await this.dbClient.query(
        'SELECT id FROM users WHERE email = $1',
        [userData.email]
      );
      
      if (userResult.rows.length > 0) {
        const userId = userResult.rows[0].id;
        
        // Create business configuration
        await this.dbClient.query(`
          INSERT INTO business_configurations (
            user_id, business_name, business_type, 
            is_active, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (user_id) DO NOTHING
        `, [
          userId,
          userData.businessName,
          userData.businessType,
          true
        ]);
      }
    }
    
    console.log('✅ Test data seeded');
  }

  /**
   * Start backend server
   */
  async startBackendServer() {
    console.log('🖥️  Starting backend server...');
    
    const { spawn } = require('child_process');
    
    this.serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '../../../backend'),
      env: {
        ...process.env,
        NODE_ENV: 'test',
        PORT: TEST_CONFIG.server.port
      },
      stdio: 'pipe'
    });
    
    // Log server output for debugging
    this.serverProcess.stdout.on('data', (data) => {
      if (process.env.DEBUG_E2E) {
        console.log(`[Backend] ${data.toString()}`);
      }
    });
    
    this.serverProcess.stderr.on('data', (data) => {
      console.error(`[Backend Error] ${data.toString()}`);
    });
    
    console.log('✅ Backend server starting...');
  }

  /**
   * Start frontend server
   */
  async startFrontendServer() {
    console.log('🌐 Starting frontend server...');
    
    const { spawn } = require('child_process');
    
    this.frontendProcess = spawn('npm', ['start'], {
      cwd: path.join(__dirname, '../../../frontend'),
      env: {
        ...process.env,
        PORT: TEST_CONFIG.frontend.port,
        REACT_APP_API_URL: `http://localhost:${TEST_CONFIG.server.port}/api`,
        BROWSER: 'none' // Don't open browser
      },
      stdio: 'pipe'
    });
    
    // Log frontend output for debugging
    this.frontendProcess.stdout.on('data', (data) => {
      if (process.env.DEBUG_E2E) {
        console.log(`[Frontend] ${data.toString()}`);
      }
    });
    
    this.frontendProcess.stderr.on('data', (data) => {
      console.error(`[Frontend Error] ${data.toString()}`);
    });
    
    console.log('✅ Frontend server starting...');
  }

  /**
   * Wait for services to be ready
   */
  async waitForServices() {
    console.log('⏳ Waiting for services to be ready...');
    
    const axios = require('axios');
    const maxAttempts = 30;
    const delay = 2000;
    
    // Wait for backend
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await axios.get(`http://localhost:${TEST_CONFIG.server.port}/api/health`);
        console.log('✅ Backend server ready');
        break;
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error('Backend server failed to start');
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Wait for frontend
    for (let i = 0; i < maxAttempts; i++) {
      try {
        await axios.get(`http://localhost:${TEST_CONFIG.frontend.port}`);
        console.log('✅ Frontend server ready');
        break;
      } catch (error) {
        if (i === maxAttempts - 1) {
          throw new Error('Frontend server failed to start');
        }
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Cleanup test environment
   */
  async cleanup() {
    console.log('🧹 Cleaning up test environment...');
    
    // Stop servers
    if (this.serverProcess) {
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
    }
    
    if (this.frontendProcess) {
      this.frontendProcess.kill('SIGTERM');
      this.frontendProcess = null;
    }
    
    // Close database connection
    if (this.dbClient) {
      await this.dbClient.end();
      this.dbClient = null;
    }
    
    // Remove test environment file
    const envPath = path.join(__dirname, '../../../backend/.env.test');
    if (fs.existsSync(envPath)) {
      fs.unlinkSync(envPath);
    }
    
    this.isSetup = false;
    console.log('✅ Test environment cleaned up');
  }

  /**
   * Get test configuration
   */
  getConfig() {
    return TEST_CONFIG;
  }

  /**
   * Get database client
   */
  getDbClient() {
    return this.dbClient;
  }
}

module.exports = { TestEnvironment, TEST_CONFIG };
