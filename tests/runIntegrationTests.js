const TestServer = require('./utils/testServer');
const path = require('path');
const jest = require('jest');
const chalk = require('chalk');

/**
 * Run tests with local server connected to Supabase
 */
async function runIntegrationTests() {
  let server;

  try {
    console.log(chalk.blue('\nStarting integration test suite...'));

    // Initialize and start test server
    server = new TestServer();
    await server.initialize();
    await server.start();

    // Configure Jest options
    const jestConfig = {
      roots: ['<rootDir>/tests'],
      testMatch: [
        '**/__tests__/**/*.js',
        '**/?(*.)+(spec|test).js'
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: [
        path.join(__dirname, 'setup', 'jest.setup.js')
      ],
      testTimeout: parseInt(process.env.TEST_TIMEOUT || '30000'),
      verbose: true,
      forceExit: true,
      detectOpenHandles: true
    };

    // Run Jest tests
    const result = await jest.runCLI(
      { 
        ...jestConfig,
        _: ['integration']
      },
      [process.cwd()]
    );

    // Handle test results
    if (!result.results.success) {
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red('\nTest execution failed:'), error);
    process.exit(1);
  } finally {
    // Clean up
    if (server) {
      await server.stop();
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  runIntegrationTests().catch(console.error);
}

module.exports = runIntegrationTests;
