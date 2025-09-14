#!/usr/bin/env node

/**
 * Test Status and Configuration Checker
 * Validates test environment and shows available test commands
 */

const fs = require('fs').promises;
const path = require('path');

class TestStatusChecker {
  constructor() {
    this.testConfig = {
      jestConfig: './backend/jest.config.js',
      packageJson: './backend/package.json',
      testDirectories: [
        './backend/tests/unit',
        './backend/tests/integration',
        './backend/tests/regression',
        './backend/tests/security',
        './backend/tests/performance',
        './backend/tests/middleware',
        './backend/tests/routes'
      ],
      testHelpers: [
        './backend/tests/helpers/testDataFactory.js',
        './backend/tests/helpers/testUtils.js',
        './backend/tests/setup.js'
      ],
      regressionScripts: [
        './scripts/run-regression-tests.js',
        './scripts/run-full-regression.js',
        './run-regression-tests.bat',
        './run-regression-tests.sh'
      ]
    };
  }

  /**
   * Main status check
   */
  async run() {
    try {
      );
      console.log('=================================');
      console.log('');

      await this.checkTestEnvironment();
      await this.checkTestConfiguration();
      await this.checkTestFiles();
      await this.checkRegressionScripts();
      await this.showAvailableCommands();
      await this.showTestStatistics();

      console.log('');
      );

    } catch (error) {
      console.error('❌ Test status check failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Check test environment setup
   */
  async checkTestEnvironment() {
    );
    console.log('-------------------');

    // Check Node.js version
    const nodeVersion = process.version;
    const major = parseInt(nodeVersion.substring(1).split('.')[0]);
    console.log(`Node.js Version: ${nodeVersion} ${major >= 16 ? '✅' : '❌ (16+ required)'}`);

    // Check environment variables
    const envVars = ['NODE_ENV', 'JWT_SECRET', 'ENCRYPTION_KEY'];
    envVars.forEach(varName => {
      const value = process.env[varName];
      console.log(`${varName}: ${value ? '✅ Set' : '⚠️  Not set'}`);
    });

    // Check working directory
    const cwd = process.cwd();
    const hasBackend = await this.fileExists('./backend');
    console.log(`Working Directory: ${cwd} ${hasBackend ? '✅' : '❌ (backend/ not found)'}`);

    console.log('');
  }

  /**
   * Check test configuration
   */
  async checkTestConfiguration() {
    console.log('⚙️  Test Configuration');
    console.log('---------------------');

    // Check Jest config
    const jestConfigExists = await this.fileExists(this.testConfig.jestConfig);
    console.log(`Jest Config: ${jestConfigExists ? '✅ Found' : '❌ Missing'} (${this.testConfig.jestConfig})`);

    // Check package.json test scripts
    try {
      const packageJsonPath = this.testConfig.packageJson;
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
      const testScripts = Object.keys(packageJson.scripts || {}).filter(script => script.startsWith('test'));
      console.log(`Test Scripts: ✅ ${testScripts.length} available`);

      if (testScripts.length > 0) {
        testScripts.forEach(script => {
          console.log(`  - npm run ${script}`);
        });
      }
    } catch (error) {
      console.log(`Package.json: ❌ Error reading (${error.message})`);
    }

    console.log('');
  }

  /**
   * Check test files and directories
   */
  async checkTestFiles() {
    console.log('📁 Test Files and Directories');
    console.log('-----------------------------');

    // Check test directories
    for (const dir of this.testConfig.testDirectories) {
      const exists = await this.fileExists(dir);
      const fileCount = exists ? await this.countFilesInDirectory(dir) : 0;
      console.log(`${dir}: ${exists ? '✅' : '❌'} ${exists ? `(${fileCount} files)` : 'Missing'}`);
    }

    console.log('');

    // Check test helpers
    console.log('🛠️  Test Helpers');
    console.log('---------------');
    for (const helper of this.testConfig.testHelpers) {
      const exists = await this.fileExists(helper);
      console.log(`${helper}: ${exists ? '✅ Available' : '❌ Missing'}`);
    }

    console.log('');
  }

  /**
   * Check regression scripts
   */
  async checkRegressionScripts() {
    console.log('🚀 Regression Test Scripts');
    console.log('--------------------------');

    for (const script of this.testConfig.regressionScripts) {
      const exists = await this.fileExists(script);
      const executable = script.endsWith('.sh') ? await this.isExecutable(script) : true;
      console.log(`${script}: ${exists ? '✅' : '❌'} ${exists && !executable ? '⚠️  Not executable' : ''}`);
    }

    console.log('');
  }

  /**
   * Show available test commands
   */
  async showAvailableCommands() {
    console.log('📋 Available Test Commands');
    console.log('-------------------------');

    const commands = [
      {
        category: 'Quick Start',
        commands: [
          { cmd: 'run-regression-tests.bat', desc: 'Windows: Run all regression tests', platform: 'Windows' },
          { cmd: './run-regression-tests.sh', desc: 'Linux/Mac: Run all regression tests', platform: 'Linux/Mac' }
        ]
      },
      {
        category: 'Specific Test Suites',
        commands: [
          { cmd: 'npm run test:unit', desc: 'Run unit tests only', platform: 'All' },
          { cmd: 'npm run test:integration', desc: 'Run integration tests', platform: 'All' },
          { cmd: 'npm run test:auth-regression', desc: 'Run authentication regression tests', platform: 'All' },
          { cmd: 'npm run test:monitoring-regression', desc: 'Run monitoring regression tests', platform: 'All' },
          { cmd: 'npm run test:performance', desc: 'Run performance tests', platform: 'All' },
          { cmd: 'npm run test:security', desc: 'Run security tests', platform: 'All' }
        ]
      },
      {
        category: 'Advanced Options',
        commands: [
          { cmd: 'npm run test:coverage', desc: 'Run tests with coverage report', platform: 'All' },
          { cmd: 'npm run test:full-regression', desc: 'Run comprehensive regression suite', platform: 'All' },
          { cmd: 'npm run test:ci', desc: 'Run tests in CI mode', platform: 'All' }
        ]
      }
    ];

    commands.forEach(category => {
      console.log(`\n${category.category}:`);
      category.commands.forEach(cmd => {
        console.log(`  ${cmd.cmd}`);
        console.log(`    ${cmd.desc} (${cmd.platform})`);
      });
    });

    console.log('');
  }

  /**
   * Show test statistics
   */
  async showTestStatistics() {
    console.log('📊 Test Statistics');
    console.log('-----------------');

    try {
      let totalTestFiles = 0;
      let totalTestDirectories = 0;

      for (const dir of this.testConfig.testDirectories) {
        const exists = await this.fileExists(dir);
        if (exists) {
          totalTestDirectories++;
          const fileCount = await this.countFilesInDirectory(dir, '.test.js');
          totalTestFiles += fileCount;
        }
      }

      console.log(`Test Directories: ${totalTestDirectories}/${this.testConfig.testDirectories.length}`);
      console.log(`Test Files: ${totalTestFiles}`);

      // Check for recent test results
      const testResultsDir = './test-results';
      const testResultsExists = await this.fileExists(testResultsDir);
      if (testResultsExists) {
        const recentResults = await this.countFilesInDirectory(testResultsDir, '.json');
        console.log(`Recent Test Reports: ${recentResults}`);
      } else {
        console.log('Recent Test Reports: 0 (no test-results directory)');
      }

      // Check for coverage reports
      const coverageDir = './backend/coverage';
      const coverageExists = await this.fileExists(coverageDir);
      console.log(`Coverage Reports: ${coverageExists ? '✅ Available' : '❌ Not generated'}`);

    } catch (error) {
      console.log(`Statistics Error: ${error.message}`);
    }

    console.log('');
  }

  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if file is executable (Unix-like systems)
   */
  async isExecutable(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return (stats.mode & parseInt('111', 8)) !== 0;
    } catch {
      return false;
    }
  }

  /**
   * Count files in directory
   */
  async countFilesInDirectory(dirPath, extension = '') {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      return files.filter(file =>
        file.isFile() &&
        (extension === '' || file.name.endsWith(extension))
      ).length;
    } catch {
      return 0;
    }
  }
}

// Handle script execution
if (require.main === module) {
  const checker = new TestStatusChecker();
  checker.run().catch(error => {
    console.error('Test status check failed:', error.message);
    process.exit(1);
  });
}

module.exports = TestStatusChecker;
