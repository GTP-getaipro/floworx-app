/**
 * Jest Configuration for FloWorx Backend Testing
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Test file patterns
  testMatch: ['<rootDir>/tests/**/*.test.js', '<rootDir>/tests/**/*.spec.js'],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'routes/**/*.js',
    'middleware/**/*.js',
    'services/**/*.js',
    'utils/**/*.js',
    'database/**/*.js',
    '!**/*.test.js',
    '!**/*.spec.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],

  // Coverage thresholds (95%+ target)
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    // Service-specific thresholds
    './services/SecurityService.js': {
      branches: 98,
      functions: 98,
      lines: 98,
      statements: 98
    },
    './services/errorTrackingService.js': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './services/realTimeMonitoringService.js': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95
    },
    './middleware/errorHandler.js': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },

  // Coverage reporters
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],

  // Test timeout
  testTimeout: 15000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Error handling
  errorOnDeprecated: true,

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Transform files
  transform: {},

  // Global variables available in tests
  globals: {
    'process.env.NODE_ENV': 'test'
  }
};
