#!/usr/bin/env node

/**
 * E2E Test Runner for FloWorx SaaS Application
 * Comprehensive BDD test execution with reporting
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class E2ETestRunner {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      environment: process.env.CYPRESS_BASE_URL || 'https://floworx-app.vercel.app',
      testSuites: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      }
    };
  }

  async runAllTests() {
    console.log('🧪 FloWorx E2E BDD Test Suite');
    console.log('='.repeat(60));
    );
    console.log(`Start Time: ${this.results.startTime.toISOString()}`);
    console.log('='.repeat(60));

    // Test suites to run in order
    const testSuites = [
      {
        name: 'Smoke Tests',
        pattern: 'cypress/e2e/features/**/*.feature',
        tags: '@smoke',
        critical: true
      },
      {
        name: 'API Integration Tests',
        pattern: 'cypress/e2e/features/api/**/*.feature',
        tags: '@api',
        critical: true
      },
      {
        name: 'Authentication Tests',
        pattern: 'cypress/e2e/features/user-authentication.feature',
        tags: '@authentication',
        critical: true
      },
      {
        name: 'Registration Tests',
        pattern: 'cypress/e2e/features/user-registration.feature',
        tags: '@registration',
        critical: false
      },
      {
        name: 'Dashboard Tests',
        pattern: 'cypress/e2e/features/dashboard-functionality.feature',
        tags: '@dashboard',
        critical: false
      },
      {
        name: 'OAuth Integration Tests',
        pattern: 'cypress/e2e/features/oauth-integration.feature',
        tags: '@oauth',
        critical: false
      },
      {
        name: 'Profile Management Tests',
        pattern: 'cypress/e2e/features/profile-management.feature',
        tags: '@profile',
        critical: false
      },
      {
        name: 'Complete User Journey Tests',
        pattern: 'cypress/e2e/features/integration/**/*.feature',
        tags: '@integration',
        critical: true
      }
    ];

    // Run test suites
    for (const suite of testSuites) {
      await this.runTestSuite(suite);
    }

    // Generate final report
    this.generateReport();
  }

  async runTestSuite(suite) {
    console.log(`\n🔍 Running ${suite.name}...`);
    console.log('-'.repeat(40));

    const startTime = Date.now();

    try {
      const result = await this.executeCypressTests(suite);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const suiteResult = {
        name: suite.name,
        pattern: suite.pattern,
        tags: suite.tags,
        critical: suite.critical,
        status: result.success ? 'passed' : 'failed',
        duration: duration,
        tests: result.tests || 0,
        passed: result.passed || 0,
        failed: result.failed || 0,
        skipped: result.skipped || 0,
        timestamp: new Date()
      };

      this.results.testSuites.push(suiteResult);

      if (result.success) {
        console.log(`✅ ${suite.name} completed successfully`);
        console.log(`   Tests: ${result.passed}/${result.tests} passed`);
      } else {
        console.log(`❌ ${suite.name} failed`);
        console.log(`   Tests: ${result.passed}/${result.tests} passed, ${result.failed} failed`);

        if (suite.critical) {
          console.log(`🚨 CRITICAL SUITE FAILED: ${suite.name}`);
        }
      }

      console.log(`   Duration: ${Math.round(duration / 1000)}s`);

    } catch (error) {
      console.log(`❌ ${suite.name} encountered an error: ${error.message}`);

      this.results.testSuites.push({
        name: suite.name,
        pattern: suite.pattern,
        tags: suite.tags,
        critical: suite.critical,
        status: 'error',
        duration: Date.now() - startTime,
        error: error.message,
        timestamp: new Date()
      });
    }
  }

  async executeCypressTests(suite) {
    return new Promise((resolve, reject) => {
      const cypressArgs = [
        'run',
        '--spec', suite.pattern,
        '--reporter', 'json',
        '--reporter-options', 'output=cypress/reports/results.json'
      ];

      // Add environment-specific arguments
      if (process.env.CYPRESS_BROWSER) {
        cypressArgs.push('--browser', process.env.CYPRESS_BROWSER);
      }

      if (process.env.CYPRESS_HEADED === 'true') {
        cypressArgs.push('--headed');
      }

      const cypress = spawn('npx', ['cypress', ...cypressArgs], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      cypress.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data);
      });

      cypress.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data);
      });

      cypress.on('close', (code) => {
        try {
          // Parse Cypress results
          const resultsPath = path.join(process.cwd(), 'cypress/reports/results.json');
          let results = { tests: 0, passed: 0, failed: 0, skipped: 0 };

          if (fs.existsSync(resultsPath)) {
            const cypressResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
            results = {
              tests: cypressResults.stats?.tests || 0,
              passed: cypressResults.stats?.passes || 0,
              failed: cypressResults.stats?.failures || 0,
              skipped: cypressResults.stats?.pending || 0,
              success: code === 0
            };
          } else {
            results.success = code === 0;
          }

          resolve(results);
        } catch (error) {
          resolve({
            tests: 0,
            passed: 0,
            failed: 1,
            skipped: 0,
            success: false
          });
        }
      });

      cypress.on('error', (error) => {
        reject(error);
      });
    });
  }

  generateReport() {
    this.results.endTime = new Date();
    const totalDuration = this.results.endTime - this.results.startTime;

    // Calculate summary
    this.results.summary = this.results.testSuites.reduce((summary, suite) => {
      return {
        total: summary.total + (suite.tests || 0),
        passed: summary.passed + (suite.passed || 0),
        failed: summary.failed + (suite.failed || 0),
        skipped: summary.skipped + (suite.skipped || 0),
        duration: summary.duration + (suite.duration || 0)
      };
    }, { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 });

    console.log('\n' + '='.repeat(60));
    console.log('📊 E2E BDD TEST SUITE RESULTS');
    console.log('='.repeat(60));

    // Test suite results
    console.log('\n📋 Test Suites:');
    this.results.testSuites.forEach(suite => {
      const status = suite.status === 'passed' ? '✅' :
                    suite.status === 'failed' ? '❌' : '⚠️';
      const critical = suite.critical ? ' (CRITICAL)' : '';
      console.log(`   ${status} ${suite.name}${critical}`);
      console.log(`      Tests: ${suite.passed || 0}/${suite.tests || 0} passed`);
      console.log(`      Duration: ${Math.round((suite.duration || 0) / 1000)}s`);

      if (suite.error) {
        console.log(`      Error: ${suite.error}`);
      }
    });

    // Summary
    console.log('\n📊 Overall Summary:');
    console.log(`   Total Tests: ${this.results.summary.total}`);
    console.log(`   Passed: ${this.results.summary.passed}`);
    console.log(`   Failed: ${this.results.summary.failed}`);
    console.log(`   Skipped: ${this.results.summary.skipped}`);
    console.log(`   Success Rate: ${Math.round((this.results.summary.passed / this.results.summary.total) * 100)}%`);
    console.log(`   Total Duration: ${Math.round(totalDuration / 1000)}s`);

    // Critical issues
    const criticalFailures = this.results.testSuites.filter(s => s.critical && s.status !== 'passed');
    if (criticalFailures.length > 0) {
      console.log('\n🚨 CRITICAL FAILURES:');
      criticalFailures.forEach(suite => {
        console.log(`   - ${suite.name}: ${suite.status}`);
      });
    }

    // Environment info
    );
    );
    console.log(`   Test Time: ${this.results.startTime.toISOString()}`);
    );

    // Save detailed report
    this.saveDetailedReport();

    console.log('\n✅ E2E BDD test suite completed!');
    console.log(`📄 Detailed report saved to: ${path.join(__dirname, '../cypress/reports/e2e-report.json')}`);

    // Exit with appropriate code
    const hasFailures = this.results.summary.failed > 0;
    const hasCriticalFailures = criticalFailures.length > 0;

    if (hasCriticalFailures) {
      console.log('\n🚨 CRITICAL FAILURES DETECTED - Exiting with error code');
      process.exit(1);
    } else if (hasFailures) {
      console.log('\n⚠️  Some tests failed - Check results for details');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed successfully!');
      process.exit(0);
    }
  }

  saveDetailedReport() {
    const reportPath = path.join(__dirname, '../cypress/reports/e2e-report.json');

    // Ensure reports directory exists
    const reportsDir = path.dirname(reportPath);
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const detailedReport = {
      ...this.results,
      metadata: {
        nodeVersion: process.version,
        platform: process.platform,
        testRunner: 'FloWorx E2E BDD Test Suite v1.0',
        cypressVersion: require('../package-e2e.json').devDependencies.cypress
      },
      recommendations: this.generateRecommendations(),
      criticalIssues: this.identifyCriticalIssues()
    };

    try {
      fs.writeFileSync(reportPath, JSON.stringify(detailedReport, null, 2));
    } catch (error) {
      console.log(`⚠️  Could not save detailed report: ${error.message}`);
    }
  }

  generateRecommendations() {
    const recommendations = [];

    const failedSuites = this.results.testSuites.filter(s => s.status === 'failed');
    if (failedSuites.length > 0) {
      recommendations.push('Review failed test suites and fix underlying issues');
    }

    const criticalFailures = this.results.testSuites.filter(s => s.critical && s.status !== 'passed');
    if (criticalFailures.length > 0) {
      recommendations.push('Address critical test failures immediately');
    }

    if (this.results.summary.total === 0) {
      recommendations.push('No tests were executed - check test configuration');
    }

    return recommendations;
  }

  identifyCriticalIssues() {
    const issues = [];

    this.results.testSuites.forEach(suite => {
      if (suite.critical && suite.status !== 'passed') {
        issues.push(`Critical suite failed: ${suite.name}`);
      }
    });

    return issues;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  // Handle command line arguments
  if (args.includes('--help') || args.includes('-h')) {
    console.log('FloWorx E2E BDD Test Suite');
    console.log('');
    console.log('Usage: node run-e2e-tests.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --browser <browser>    Browser to use (chrome, firefox, electron)');
    console.log('  --headed              Run tests in headed mode');
    );
    console.log('  --help, -h           Show this help message');
    console.log('');
    );
    console.log('  CYPRESS_BASE_URL     Target application URL');
    console.log('  CYPRESS_BROWSER      Browser to use for tests');
    console.log('  CYPRESS_HEADED       Run in headed mode (true/false)');
    return;
  }

  // Set environment variables from command line
  const browserIndex = args.indexOf('--browser');
  if (browserIndex !== -1 && args[browserIndex + 1]) {
    process.env.CYPRESS_BROWSER = args[browserIndex + 1];
  }

  if (args.includes('--headed')) {
    process.env.CYPRESS_HEADED = 'true';
  }

  const envIndex = args.indexOf('--env');
  if (envIndex !== -1 && args[envIndex + 1]) {
    process.env.CYPRESS_BASE_URL = args[envIndex + 1];
  }

  // Run the test suite
  const runner = new E2ETestRunner();
  await runner.runAllTests();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ E2E test runner failed:', error);
    process.exit(1);
  });
}

module.exports = E2ETestRunner;
