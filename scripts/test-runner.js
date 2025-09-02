#!/usr/bin/env node

/**
 * Floworx Test Runner
 * Comprehensive test execution script for business type selection and password reset functionality
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Handle chalk import (different versions have different exports)
let chalk;
try {
  chalk = require('chalk');
  if (!chalk.blue) {
    // Handle ES module chalk
    chalk = require('chalk').default;
  }
} catch (error) {
  // Fallback if chalk is not available
  chalk = {
    blue: { bold: (text) => text },
    yellow: { bold: (text) => text },
    green: (text) => text,
    red: { bold: (text) => text },
    cyan: (text) => text,
    gray: (text) => text
  };
}

class FloworxTestRunner {
  constructor() {
    this.testResults = {
      database: { passed: 0, failed: 0, duration: 0 },
      api: { passed: 0, failed: 0, duration: 0 },
      frontend: { passed: 0, failed: 0, duration: 0 },
      e2e: { passed: 0, failed: 0, duration: 0 },
      security: { passed: 0, failed: 0, duration: 0 }
    };
    
    this.coverageThresholds = {
      statements: 80,
      branches: 75,
      functions: 85,
      lines: 80
    };
  }

  async runAllTests() {
    console.log(chalk.blue.bold('🧪 Starting Floworx Test Suite'));
    console.log(chalk.gray('Testing Business Type Selection & Password Reset functionality\n'));

    const startTime = Date.now();

    try {
      // Run tests in sequence for better resource management
      await this.runDatabaseTests();
      await this.runApiTests();
      await this.runFrontendTests();
      await this.runSecurityTests();
      
      // Run E2E tests last (most resource intensive)
      if (process.env.SKIP_E2E !== 'true') {
        await this.runE2ETests();
      }

      const totalTime = Date.now() - startTime;
      await this.generateTestReport(totalTime);
      
    } catch (error) {
      console.error(chalk.red.bold('❌ Test suite failed:'), error.message);
      process.exit(1);
    }
  }

  async runDatabaseTests() {
    console.log(chalk.yellow.bold('\n📊 Running Database Integration Tests'));
    
    const startTime = Date.now();
    
    try {
      await this.setupTestDatabase();
      
      const result = await this.executeCommand(
        'jest',
        ['--config', 'jest.config.js', '--selectProjects="Database Integration Tests"', '--coverage']
      );
      
      this.testResults.database = {
        passed: this.extractPassedTests(result.stdout),
        failed: this.extractFailedTests(result.stdout),
        duration: Date.now() - startTime
      };
      
      console.log(chalk.green('✅ Database tests completed'));
      
    } catch (error) {
      console.error(chalk.red('❌ Database tests failed:'), error.message);
      this.testResults.database.failed = 999;
      throw error;
    }
  }

  async runApiTests() {
    console.log(chalk.yellow.bold('\n🔌 Running API Integration Tests'));
    
    const startTime = Date.now();
    
    try {
      // Start test server
      const serverProcess = await this.startTestServer();
      
      const result = await this.executeCommand(
        'jest',
        ['--config', 'jest.config.js', '--selectProjects="API Integration Tests"', '--coverage']
      );
      
      // Stop test server
      serverProcess.kill();
      
      this.testResults.api = {
        passed: this.extractPassedTests(result.stdout),
        failed: this.extractFailedTests(result.stdout),
        duration: Date.now() - startTime
      };
      
      console.log(chalk.green('✅ API tests completed'));
      
    } catch (error) {
      console.error(chalk.red('❌ API tests failed:'), error.message);
      this.testResults.api.failed = 999;
      throw error;
    }
  }

  async runFrontendTests() {
    console.log(chalk.yellow.bold('\n⚛️ Running Frontend Component Tests'));
    
    const startTime = Date.now();
    
    try {
      const result = await this.executeCommand(
        'jest',
        ['--config', 'jest.config.js', '--selectProjects="Frontend Component Tests"', '--coverage']
      );
      
      this.testResults.frontend = {
        passed: this.extractPassedTests(result.stdout),
        failed: this.extractFailedTests(result.stdout),
        duration: Date.now() - startTime
      };
      
      // Run accessibility tests
      await this.runAccessibilityTests();
      
      console.log(chalk.green('✅ Frontend tests completed'));
      
    } catch (error) {
      console.error(chalk.red('❌ Frontend tests failed:'), error.message);
      this.testResults.frontend.failed = 999;
      throw error;
    }
  }

  async runE2ETests() {
    console.log(chalk.yellow.bold('\n🎭 Running End-to-End Tests'));
    
    const startTime = Date.now();
    
    try {
      // Start full application stack
      const appProcess = await this.startFullApplication();
      
      const result = await this.executeCommand(
        'cypress',
        ['run', '--spec', 'tests/e2e/**/*.spec.js', '--browser', 'chrome', '--headless']
      );
      
      // Stop application
      appProcess.kill();
      
      this.testResults.e2e = {
        passed: this.extractCypressPassedTests(result.stdout),
        failed: this.extractCypressFailedTests(result.stdout),
        duration: Date.now() - startTime
      };
      
      console.log(chalk.green('✅ E2E tests completed'));
      
    } catch (error) {
      console.error(chalk.red('❌ E2E tests failed:'), error.message);
      this.testResults.e2e.failed = 999;
      throw error;
    }
  }

  async runSecurityTests() {
    console.log(chalk.yellow.bold('\n🔒 Running Security Tests'));
    
    const startTime = Date.now();
    
    try {
      // Run security audit
      await this.executeCommand('npm', ['audit', '--audit-level', 'high']);
      
      // Run security-specific tests
      const result = await this.executeCommand(
        'jest',
        ['--config', 'jest.config.js', '--selectProjects="Security Tests"']
      );
      
      this.testResults.security = {
        passed: this.extractPassedTests(result.stdout),
        failed: this.extractFailedTests(result.stdout),
        duration: Date.now() - startTime
      };
      
      console.log(chalk.green('✅ Security tests completed'));
      
    } catch (error) {
      console.error(chalk.red('❌ Security tests failed:'), error.message);
      this.testResults.security.failed = 999;
      throw error;
    }
  }

  async runAccessibilityTests() {
    console.log(chalk.cyan('  🔍 Running accessibility tests...'));
    
    try {
      await this.executeCommand(
        'jest',
        ['tests/accessibility/*.test.js', '--testTimeout=30000']
      );
      
      console.log(chalk.green('  ✅ Accessibility tests passed'));
      
    } catch (error) {
      console.warn(chalk.yellow('  ⚠️ Accessibility tests had issues:'), error.message);
    }
  }

  async setupTestDatabase() {
    console.log(chalk.cyan('  🗄️ Setting up test database...'));
    
    try {
      await this.executeCommand('node', ['scripts/setup-test-db.js']);
      await this.executeCommand('node', ['scripts/migrate-test-db.js']);
      await this.executeCommand('node', ['scripts/seed-test-db.js']);
      
      console.log(chalk.green('  ✅ Test database ready'));
      
    } catch (error) {
      console.error(chalk.red('  ❌ Database setup failed:'), error.message);
      throw error;
    }
  }

  async startTestServer() {
    console.log(chalk.cyan('  🚀 Starting test server...'));
    
    return new Promise((resolve, reject) => {
      const serverProcess = spawn('node', ['backend/server.js'], {
        env: { ...process.env, NODE_ENV: 'test', PORT: '3001' },
        stdio: 'pipe'
      });
      
      let serverReady = false;
      
      serverProcess.stdout.on('data', (data) => {
        if (data.toString().includes('Server running on port 3001') && !serverReady) {
          serverReady = true;
          console.log(chalk.green('  ✅ Test server started'));
          resolve(serverProcess);
        }
      });
      
      serverProcess.stderr.on('data', (data) => {
        console.error(chalk.red('Server error:'), data.toString());
      });
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (!serverReady) {
          serverProcess.kill();
          reject(new Error('Test server failed to start within 30 seconds'));
        }
      }, 30000);
    });
  }

  async startFullApplication() {
    console.log(chalk.cyan('  🚀 Starting full application stack...'));
    
    return new Promise((resolve, reject) => {
      // This would start both backend and frontend for E2E tests
      const appProcess = spawn('npm', ['run', 'start:test'], {
        stdio: 'pipe'
      });
      
      let appReady = false;
      
      appProcess.stdout.on('data', (data) => {
        if (data.toString().includes('Application ready') && !appReady) {
          appReady = true;
          console.log(chalk.green('  ✅ Application stack started'));
          resolve(appProcess);
        }
      });
      
      // Timeout after 60 seconds
      setTimeout(() => {
        if (!appReady) {
          appProcess.kill();
          reject(new Error('Application failed to start within 60 seconds'));
        }
      }, 60000);
    });
  }

  async executeCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, { stdio: 'pipe' });
      
      let stdout = '';
      let stderr = '';
      
      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  extractPassedTests(output) {
    const match = output.match(/(\d+) passing/);
    return match ? parseInt(match[1]) : 0;
  }

  extractFailedTests(output) {
    const match = output.match(/(\d+) failing/);
    return match ? parseInt(match[1]) : 0;
  }

  extractCypressPassedTests(output) {
    const match = output.match(/(\d+) passing/);
    return match ? parseInt(match[1]) : 0;
  }

  extractCypressFailedTests(output) {
    const match = output.match(/(\d+) failing/);
    return match ? parseInt(match[1]) : 0;
  }

  async generateTestReport(totalDuration) {
    console.log(chalk.blue.bold('\n📋 Test Results Summary'));
    console.log(chalk.gray('=' .repeat(50)));
    
    const totalPassed = Object.values(this.testResults).reduce((sum, result) => sum + result.passed, 0);
    const totalFailed = Object.values(this.testResults).reduce((sum, result) => sum + result.failed, 0);
    
    // Display results by category
    Object.entries(this.testResults).forEach(([category, result]) => {
      const status = result.failed === 0 ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED');
      const duration = (result.duration / 1000).toFixed(2);
      
      console.log(`${status} ${category.toUpperCase()}: ${result.passed} passed, ${result.failed} failed (${duration}s)`);
    });
    
    console.log(chalk.gray('-'.repeat(50)));
    console.log(`Total: ${totalPassed} passed, ${totalFailed} failed`);
    console.log(`Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    
    // Generate detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalPassed,
        totalFailed,
        totalDuration,
        success: totalFailed === 0
      },
      results: this.testResults,
      coverage: await this.getCoverageData()
    };
    
    // Save report
    const reportPath = path.join('tests', 'results', 'test-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
    
    console.log(chalk.cyan(`\n📄 Detailed report saved to: ${reportPath}`));
    
    // Check if all tests passed
    if (totalFailed === 0) {
      console.log(chalk.green.bold('\n🎉 All tests passed! Ready for deployment.'));
    } else {
      console.log(chalk.red.bold('\n💥 Some tests failed. Please review and fix issues.'));
      process.exit(1);
    }
  }

  async getCoverageData() {
    try {
      const coveragePath = path.join('coverage', 'coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        return JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      }
    } catch (error) {
      console.warn(chalk.yellow('⚠️ Could not read coverage data'));
    }
    return null;
  }
}

// CLI interface
if (require.main === module) {
  const runner = new FloworxTestRunner();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'all':
      runner.runAllTests();
      break;
    case 'db':
      runner.runDatabaseTests();
      break;
    case 'api':
      runner.runApiTests();
      break;
    case 'frontend':
      runner.runFrontendTests();
      break;
    case 'e2e':
      runner.runE2ETests();
      break;
    case 'security':
      runner.runSecurityTests();
      break;
    default:
      console.log(chalk.blue.bold('Floworx Test Runner'));
      console.log('Usage: node scripts/test-runner.js [command]');
      console.log('Commands:');
      console.log('  all       - Run all test suites');
      console.log('  db        - Run database integration tests');
      console.log('  api       - Run API integration tests');
      console.log('  frontend  - Run frontend component tests');
      console.log('  e2e       - Run end-to-end tests');
      console.log('  security  - Run security tests');
  }
}

module.exports = FloworxTestRunner;
