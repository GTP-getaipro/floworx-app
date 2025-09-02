// Jest Configuration for Frontend Component Tests
module.exports = {
  testEnvironment: 'jsdom',
  
  testMatch: [
    '**/tests/frontend/**/*.test.js',
    '**/tests/frontend/**/*.spec.js'
  ],
  
  collectCoverage: false, // Disable coverage for initial testing
  
  setupFilesAfterEnv: [
    '@testing-library/jest-dom',
    '<rootDir>/tests/setup/frontend.setup.js'
  ],
  
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/mocks/fileMock.js',
    '^@/(.*)$': '<rootDir>/frontend/src/$1',
    '^@components/(.*)$': '<rootDir>/frontend/src/components/$1',
    '^@services/(.*)$': '<rootDir>/frontend/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/frontend/src/utils/$1'
  },
  
  testTimeout: 30000,
  verbose: true,
  
  // Ignore node_modules and build directories
  testPathIgnorePatterns: [
    '/node_modules/',
    '/build/',
    '/dist/'
  ],
  
  // Transform configuration for React components
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'json'
  ]
};
