// Jest Configuration for Floworx Test Suite
module.exports = {
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
  
  // Coverage thresholds - Realistic targets for current development phase
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 15,
      lines: 20,
      statements: 20
    },
    // Specific thresholds for critical services
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

  // Force exit to prevent hanging
  forceExit: true,

  // Detect open handles
  detectOpenHandles: true,

  // Clear mocks between tests
  clearMocks: true,

  // Reset modules between tests
  resetMocks: true,
  
  // Projects for different test types
  projects: [
    {
      displayName: 'Backend Tests',
      testMatch: [
        '<rootDir>/tests/backend/**/*.test.js',
        '<rootDir>/tests/integration/**/*.test.js',
        '<rootDir>/tests/security/**/*.test.js'
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
      collectCoverageFrom: [
        'backend/**/*.js',
        '!**/node_modules/**',
        '!**/coverage/**',
        '!**/tests/**'
      ]
    },
    {
      displayName: 'Frontend Tests',
      testMatch: [
        '<rootDir>/tests/frontend/**/*.test.js',
        '<rootDir>/frontend/src/**/*.test.js',
        '<rootDir>/frontend/src/**/*.spec.js'
      ],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: [
        '@testing-library/jest-dom',
        '<rootDir>/tests/setup/frontend.setup.js'
      ],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/frontend/src/$1',
        '^@components/(.*)$': '<rootDir>/frontend/src/components/$1',
        '^@services/(.*)$': '<rootDir>/frontend/src/services/$1',
        '^@utils/(.*)$': '<rootDir>/frontend/src/utils/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/mocks/fileMock.js'
      },
      transform: {
        '^.+\\.(js|jsx)$': 'babel-jest'
      },
      collectCoverageFrom: [
        'frontend/src/**/*.{js,jsx}',
        '!**/node_modules/**',
        '!**/coverage/**',
        '!**/tests/**'
      ]
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
  
  // Custom test results processor
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
