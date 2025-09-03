/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  displayName: 'integration',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup/jest.setup.js'],
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.js'
  ],
  verbose: true,
  testTimeout: 30000,
  maxConcurrency: 1,
  maxWorkers: 1
};
