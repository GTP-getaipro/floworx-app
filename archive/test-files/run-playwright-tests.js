#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class PlaywrightTestRunner {
  constructor() {
    this.testSuites = {
      auth: {
        name: 'Authentication & Security',
        file: 'tests/auth.spec.js',
        description: 'Login, registration, password reset, progressive lockout with production security settings'
      },
      business: {
        name: 'Business Logic Functional Tests',
        file: 'tests/business-logic.spec.js',
        description: 'Complete user onboarding, email categorization, workflow automation, multi-tenant isolation, dashboard analytics'
      },
      api: {
        name: 'API Integration Tests',
        file: 'tests/api-integration.spec.js',
        description: 'Authentication endpoints, workflow CRUD operations, email processing, database transactions, rate limiting'
      },
      edge: {
        name: 'Edge Cases & Error Handling',
        file: 'tests/edge-cases.spec.js',
        description: 'Network failures, concurrent operations, input validation, session management, database connection failures'
      },
      mobile: {
        name: 'Cross-Browser & Mobile Responsive',
        file: 'tests/mobile-responsive.spec.js',
        description: 'Mobile authentication, responsive design, touch interfaces, performance metrics, mobile-specific features'
      },
      onboarding: {
        name: 'User Onboarding Flow (Legacy)',
        file: 'tests/onboarding.spec.js',
        description: 'Complete onboarding with Google OAuth integration (replaced by business-logic tests)'
      },
      dashboard: {
        name: 'Dashboard & Navigation (Legacy)',
        file: 'tests/dashboard.spec.js',
        description: 'Dashboard functionality, navigation, user profile (replaced by business-logic tests)'
      },
      workflows: {
        name: 'Email Processing & Workflows (Legacy)',
        file: 'tests/email-workflows.spec.js',
        description: 'Email categorization, workflow creation, n8n integration (replaced by business-logic tests)'
      },
      errors: {
        name: 'Error Handling & Edge Cases (Legacy)',
        file: 'tests/error-handling.spec.js',
        description: 'Network failures, input validation, data consistency (replaced by edge-cases tests)'
      },
      performance: {
        name: 'Performance & Load Testing (Legacy)',
        file: 'tests/performance.spec.js',
        description: 'Page load performance, concurrent users, resource usage (replaced by mobile-responsive tests)'
      },
      comprehensive: {
        name: 'Comprehensive Test Suite',
        files: ['tests/business-logic.spec.js', 'tests/api-integration.spec.js', 'tests/edge-cases.spec.js', 'tests/mobile-responsive.spec.js'],
        description: 'Runs all business logic, API, edge case, and mobile tests (excludes basic auth tests)'
      },
      all: {
        name: 'Complete Test Suite',
        files: ['tests/auth.spec.js', 'tests/business-logic.spec.js', 'tests/api-integration.spec.js', 'tests/edge-cases.spec.js', 'tests/mobile-responsive.spec.js'],
        description: 'Runs all available test suites including authentication, business logic, API integration, edge cases, and mobile responsive tests'
      }
    };
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  async checkPrerequisites() {
    this.log('\n🔍 Checking prerequisites...', 'cyan');
    
    // Check if Playwright is installed
    if (!fs.existsSync('node_modules/@playwright/test')) {
      this.log('❌ Playwright not found. Please run: npm install', 'red');
      return false;
    }

    // Check if playwright.config.js exists
    if (!fs.existsSync('playwright.config.js')) {
      this.log('❌ playwright.config.js not found', 'red');
      return false;
    }

    // Check if test files exist
    const missingFiles = [];
    Object.values(this.testSuites).forEach(suite => {
      // Handle both single file and multiple files
      const filesToCheck = suite.files || [suite.file];
      filesToCheck.forEach(file => {
        if (file && !fs.existsSync(file)) {
          missingFiles.push(file);
        }
      });
    });

    if (missingFiles.length > 0) {
      this.log(`❌ Missing test files: ${missingFiles.join(', ')}`, 'red');
      return false;
    }

    this.log('✅ All prerequisites met', 'green');
    return true;
  }

  async runCommand(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        ...options
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(code);
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });
    });
  }

  async runTestSuite(suiteKey, options = {}) {
    const suite = this.testSuites[suiteKey];
    if (!suite) {
      throw new Error(`Unknown test suite: ${suiteKey}`);
    }

    this.log(`\n🧪 Running ${suite.name}`, 'bright');
    this.log(`📝 ${suite.description}`, 'blue');
    this.log(`📁 ${suite.file}`, 'magenta');

    const args = ['test', suite.file];
    
    if (options.headed) args.push('--headed');
    if (options.debug) args.push('--debug');
    if (options.reporter) args.push('--reporter', options.reporter);
    if (options.project) args.push('--project', options.project);

    try {
      await this.runCommand('npx', ['playwright', ...args]);
      this.log(`✅ ${suite.name} completed successfully`, 'green');
      return true;
    } catch (error) {
      this.log(`❌ ${suite.name} failed: ${error.message}`, 'red');
      return false;
    }
  }

  async runAllTests(options = {}) {
    this.log('\n🚀 Running complete Playwright test suite', 'bright');
    
    const results = {};
    let totalPassed = 0;
    let totalFailed = 0;

    for (const [key, suite] of Object.entries(this.testSuites)) {
      try {
        const success = await this.runTestSuite(key, options);
        results[key] = success;
        if (success) {
          totalPassed++;
        } else {
          totalFailed++;
        }
      } catch (error) {
        results[key] = false;
        totalFailed++;
        this.log(`❌ Error running ${suite.name}: ${error.message}`, 'red');
      }
    }

    // Print summary
    this.log('\n📊 Test Suite Summary', 'bright');
    this.log('═'.repeat(50), 'blue');
    
    Object.entries(results).forEach(([key, success]) => {
      const suite = this.testSuites[key];
      const status = success ? '✅ PASSED' : '❌ FAILED';
      const color = success ? 'green' : 'red';
      this.log(`${status} ${suite.name}`, color);
    });

    this.log('═'.repeat(50), 'blue');
    this.log(`Total: ${totalPassed + totalFailed} | Passed: ${totalPassed} | Failed: ${totalFailed}`, 'bright');

    if (totalFailed === 0) {
      this.log('\n🎉 All tests passed! The Floworx application is ready for production.', 'green');
    } else {
      this.log(`\n⚠️  ${totalFailed} test suite(s) failed. Please review the errors above.`, 'yellow');
    }

    return totalFailed === 0;
  }

  async generateReport() {
    this.log('\n📋 Generating test report...', 'cyan');
    
    try {
      await this.runCommand('npx', ['playwright', 'show-report']);
      this.log('✅ Test report generated successfully', 'green');
    } catch (error) {
      this.log(`❌ Failed to generate report: ${error.message}`, 'red');
    }
  }

  printUsage() {
    this.log('\n🧪 Floworx Playwright Test Runner', 'bright');
    this.log('═'.repeat(50), 'blue');
    this.log('\nUsage: node run-playwright-tests.js [command] [options]', 'cyan');
    
    this.log('\nCommands:', 'bright');
    this.log('  all                    Run all test suites', 'green');
    this.log('  comprehensive          Run comprehensive suite (business + api + edge + mobile)', 'green');
    this.log('  auth                   Run authentication & security tests', 'green');
    this.log('  business               Run business logic functional tests', 'green');
    this.log('  api                    Run API integration tests', 'green');
    this.log('  edge                   Run edge cases & error handling tests', 'green');
    this.log('  mobile                 Run cross-browser & mobile responsive tests', 'green');
    this.log('  onboarding            Run onboarding flow tests (legacy)', 'green');
    this.log('  dashboard             Run dashboard tests (legacy)', 'green');
    this.log('  workflows             Run email/workflow tests (legacy)', 'green');
    this.log('  errors                Run error handling tests (legacy)', 'green');
    this.log('  performance           Run performance tests (legacy)', 'green');
    this.log('  report                Generate and show test report', 'green');
    this.log('  help                  Show this help message', 'green');

    this.log('\nOptions:', 'bright');
    this.log('  --headed              Run tests with browser UI visible', 'yellow');
    this.log('  --debug               Run tests in debug mode', 'yellow');
    this.log('  --project <name>      Run tests for specific project/browser', 'yellow');
    this.log('  --reporter <type>     Use specific reporter (html, json, junit)', 'yellow');

    this.log('\nExamples:', 'bright');
    this.log('  node run-playwright-tests.js all', 'cyan');
    this.log('  node run-playwright-tests.js auth --headed', 'cyan');
    this.log('  node run-playwright-tests.js performance --debug', 'cyan');
    this.log('  node run-playwright-tests.js all --reporter junit', 'cyan');
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    
    const options = {
      headed: args.includes('--headed'),
      debug: args.includes('--debug'),
      reporter: args.includes('--reporter') ? args[args.indexOf('--reporter') + 1] : null,
      project: args.includes('--project') ? args[args.indexOf('--project') + 1] : null
    };

    // Check prerequisites first
    if (command !== 'help' && !(await this.checkPrerequisites())) {
      process.exit(1);
    }

    switch (command) {
      case 'all':
        const success = await this.runAllTests(options);
        process.exit(success ? 0 : 1);
        break;
        
      case 'auth':
      case 'business':
      case 'api':
      case 'edge':
      case 'mobile':
      case 'comprehensive':
      case 'onboarding':
      case 'dashboard':
      case 'workflows':
      case 'errors':
      case 'performance':
        const suiteSuccess = await this.runTestSuite(command, options);
        process.exit(suiteSuccess ? 0 : 1);
        break;
        
      case 'report':
        await this.generateReport();
        break;
        
      case 'help':
      default:
        this.printUsage();
        break;
    }
  }
}

// Run the test runner
if (require.main === module) {
  const runner = new PlaywrightTestRunner();
  runner.run().catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  });
}

module.exports = PlaywrightTestRunner;
