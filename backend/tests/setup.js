/**
 * Test Setup Configuration for FloWorx Backend
 * Configures test environment and database connections
 */

const { initialize: initializeDatabase } = require('../database/unified-connection');

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';

// Test database configuration (use separate test DB)
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/floworx_test';

// Security configuration for testing (using production values)
process.env.ACCOUNT_RECOVERY_TOKEN_EXPIRY = '86400000'; // 24 hours
process.env.MAX_FAILED_LOGIN_ATTEMPTS = '5';
process.env.ACCOUNT_LOCKOUT_DURATION = '900000'; // 15 minutes
process.env.PROGRESSIVE_LOCKOUT_MULTIPLIER = '2';

// Disable rate limiting in tests
process.env.DISABLE_RATE_LIMITING = 'true';

// Global test setup
beforeAll(async () => {
  // Initialize database connection for tests
  try {
    await initializeDatabase();
    console.log('✅ Test database initialized');
  } catch (_error) {
    console.warn('⚠️ Test database not available - some tests may fail');
    );
  }
});

// Global test teardown
afterAll(async () => {
  // Stop monitoring service if it exists
  try {
    const RealTimeMonitoringService = require('../services/realTimeMonitoringService');
    if (RealTimeMonitoringService && typeof RealTimeMonitoringService.stopMonitoring === 'function') {
      RealTimeMonitoringService.stopMonitoring();
    }
  } catch (_error) {
    // Monitoring service might not be initialized, ignore
  }

  // Close database connections
  const { databaseManager } = require('../database/unified-connection');
  if (databaseManager && databaseManager.pool) {
    await databaseManager.pool.end();
    console.log('✅ Test database connections closed');
  }
});

// Global test utilities
global.testUtils = {
  // Create test user data
  createTestUser: () => ({
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User',
    companyName: 'Test Company',
    agreeToTerms: true
  }),

  // Create invalid user data for validation testing
  createInvalidUser: () => ({
    email: 'invalid-email',
    password: '123', // Too short
    firstName: '', // Empty
    lastName: 'User123', // Contains numbers
    companyName: 'A' // Too short
  }),

  // Generate JWT token for testing
  generateTestToken: (userId = 'test-user-id') => {
    const jwt = require('jsonwebtoken');
    return jwt.sign({ id: userId, email: 'test@example.com' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  },

  // Common test headers
  getAuthHeaders: token => ({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }),

  // Validation test cases
  validationTestCases: {
    email: [
      { value: '', expected: 'email is required' },
      { value: 'invalid', expected: 'Must be a valid email address' },
      { value: 'test@tempmail.org', expected: 'Disposable email addresses are not allowed' },
      { value: 'a'.repeat(250) + '@example.com', expected: 'Email must be less than 254 characters' }
    ],
    password: [
      { value: '', expected: 'Password is required' },
      { value: '123', expected: 'Password must be between 8 and 128 characters' },
      { value: 'password', expected: 'Password must contain at least one uppercase letter' },
      { value: 'PASSWORD', expected: 'Password must contain at least one lowercase letter' },
      { value: 'Password', expected: 'Password must contain at least one number' },
      { value: 'Password123', expected: 'Password must contain at least one special character' }
    ],
    name: [
      { value: '', expected: 'must be between 1 and 100 characters' },
      { value: 'A'.repeat(101), expected: 'must be between 1 and 100 characters' },
      { value: 'Test123', expected: 'can only contain letters, spaces, hyphens, apostrophes, and periods' },
      { value: 'Test@Name', expected: 'can only contain letters, spaces, hyphens, apostrophes, and periods' }
    ]
  }
};

// Jest configuration
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: [__filename],
  testTimeout: 10000,
  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    '!**/*.test.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
