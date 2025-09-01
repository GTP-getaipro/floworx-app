/**
 * Jest Setup Configuration
 * Global setup for API tests
 */

const config = require('./test-config');

// Extend Jest timeout for API tests
jest.setTimeout(config.timeouts.long);

// Global test setup
beforeAll(async () => {
  console.log(`🧪 Setting up API tests for ${config.current.name} environment`);
  console.log(`📡 Base URL: ${config.current.baseURL}`);
});

// Global test cleanup
afterAll(async () => {
  console.log('🧹 Cleaning up API tests...');
});

// Custom Jest matchers
expect.extend({
  toBeValidApiResponse(received) {
    const pass = received && 
                 typeof received.status === 'number' &&
                 typeof received.success === 'boolean' &&
                 received.data !== undefined;

    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid API response`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid API response with status, success, and data properties`,
        pass: false,
      };
    }
  },

  toHaveValidJWT(received) {
    const jwtPattern = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
    const pass = typeof received === 'string' && jwtPattern.test(received);

    if (pass) {
      return {
        message: () => `Expected ${received} not to be a valid JWT token`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} to be a valid JWT token`,
        pass: false,
      };
    }
  },

  toBeUserFriendlyError(received) {
    const sensitivePatterns = [
      /database/i,
      /sql/i,
      /internal/i,
      /stack/i,
      /query/i,
      /connection/i
    ];

    const hasSensitiveInfo = sensitivePatterns.some(pattern => 
      pattern.test(received)
    );

    const pass = !hasSensitiveInfo;

    if (pass) {
      return {
        message: () => `Expected ${received} to contain sensitive information`,
        pass: true,
      };
    } else {
      return {
        message: () => `Expected ${received} not to contain sensitive information like database, sql, internal, stack, query, or connection details`,
        pass: false,
      };
    }
  }
});

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = {};
