/**
 * API Test Configuration
 * Centralized configuration for all API tests
 */

require('dotenv').config();

const config = {
  // Test environments
  environments: {
    local: {
      baseURL: 'http://localhost:5001',
      name: 'Local Development'
    },
    production: {
      baseURL: 'https://app.floworx-iq.com',
      name: 'Production'
    }
  },

  // Current test environment
  currentEnv: process.env.TEST_ENV || 'production',

  // Test timeouts
  timeouts: {
    short: 5000,    // 5 seconds
    medium: 15000,  // 15 seconds
    long: 30000     // 30 seconds
  },

  // Test data
  testUsers: {
    valid: {
      firstName: 'Test',
      lastName: 'User',
      companyName: 'Test Company',
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!'
    },
    invalid: {
      email: 'invalid-email',
      password: '123',
      firstName: '',
      lastName: ''
    },
    existing: {
      email: 'existing@example.com',
      password: 'ExistingPassword123!'
    }
  },

  // API endpoints
  endpoints: {
    auth: {
      register: '/api/auth/register',
      login: '/api/auth/login',
      logout: '/api/auth/logout',
      refresh: '/api/auth/refresh'
    },
    oauth: {
      google: '/api/oauth/google',
      callback: '/api/oauth/callback',
      disconnect: '/api/oauth/disconnect'
    },
    user: {
      status: '/api/user/status',
      profile: '/api/user/profile',
      settings: '/api/user/settings'
    },
    dashboard: {
      data: '/api/dashboard',
      stats: '/api/dashboard/stats'
    },
    system: {
      health: '/api/health',
      version: '/api/version'
    }
  },

  // Expected response structures
  expectedResponses: {
    success: {
      register: ['user', 'token', 'message'],
      login: ['user', 'token', 'expiresIn'],
      userStatus: ['id', 'email', 'firstName', 'lastName'],
      dashboard: ['user', 'stats', 'connections']
    },
    error: {
      required: ['error', 'message'],
      validation: ['error', 'message', 'details']
    }
  },

  // Test database cleanup
  cleanup: {
    enabled: true,
    testEmailPattern: /test-\d+@example\.com/,
    maxTestUsers: 10
  },

  // Security test parameters
  security: {
    maxRequestsPerMinute: 60,
    jwtExpirationTime: 3600, // 1 hour
    passwordMinLength: 8
  }
};

// Get current environment configuration
config.current = config.environments[config.currentEnv];

// Validation
if (!config.current) {
  throw new Error(`Invalid test environment: ${config.currentEnv}`);
}

// Helper functions
config.helpers = {
  // Generate unique test email
  generateTestEmail: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
  
  // Generate test user data
  generateTestUser: () => ({
    firstName: 'Test',
    lastName: 'User',
    companyName: 'Test Company',
    email: config.helpers.generateTestEmail(),
    password: 'TestPassword123!'
  }),

  // Check if response has expected structure
  validateResponseStructure: (response, expectedFields) => {
    const missing = expectedFields.filter(field => !(field in response));
    return {
      valid: missing.length === 0,
      missing
    };
  },

  // Clean test data
  isTestData: (email) => config.cleanup.testEmailPattern.test(email),

  // Get authorization header
  getAuthHeader: (token) => ({ Authorization: `Bearer ${token}` }),

  // Wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms))
};

module.exports = config;
