// Jest Configuration for Floworx Test Suite
module.exports = {
  // Test environment setup
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 85,
      lines: 80,
      statements: 80
    },
    // Specific thresholds for new business type functionality
    './backend/routes/businessTypes.js': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90
    },
    './backend/routes/passwordReset.js': {
      branches: 85,
      functions: 90,
      lines: 85,
      statements: 85
    }
  },
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'backend/**/*.js',
    'frontend/src/**/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/tests/**',
    '!**/*.config.js',
    '!**/*.test.js',
    '!**/*.spec.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest.setup.js'
  ],
  
  // Module name mapping for frontend tests
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@components/(.*)$': '<rootDir>/frontend/src/components/$1',
    '^@services/(.*)$': '<rootDir>/frontend/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/frontend/src/utils/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/mocks/fileMock.js'
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'json'
  ],
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Projects for different test types
  projects: [
    {
      displayName: 'Database Integration Tests',
      testMatch: ['<rootDir>/tests/integration/database.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/database.setup.js']
    },
    {
      displayName: 'API Integration Tests',
      testMatch: ['<rootDir>/tests/integration/api.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/api.setup.js']
    },
    {
      displayName: 'Frontend Component Tests',
      testMatch: ['<rootDir>/tests/frontend/**/*.test.js'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup/frontend.setup.js',
        '@testing-library/jest-dom'
      ],
      moduleNameMapping: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/mocks/fileMock.js'
      }
    },
    {
      displayName: 'Security Tests',
      testMatch: ['<rootDir>/tests/security/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/security.setup.js']
    }
  ],
  
  // Global setup and teardown (commented out until files are created)
  // globalSetup: '<rootDir>/tests/setup/global.setup.js',
  // globalTeardown: '<rootDir>/tests/setup/global.teardown.js',
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'tests/results',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: 'tests/results',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Floworx Test Report'
      }
    ]
  ],
  
  // Error handling
  errorOnDeprecated: true,
  
  // Cache configuration
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ],
  
  // Custom matchers
  testResultsProcessor: '<rootDir>/tests/processors/results.processor.js'
};

// Environment-specific configurations
if (process.env.NODE_ENV === 'ci') {
  module.exports.ci = true;
  module.exports.maxWorkers = 2;
  module.exports.cache = false;
}

if (process.env.NODE_ENV === 'development') {
  module.exports.watch = true;
  module.exports.watchAll = false;
  module.exports.collectCoverage = false;
}
