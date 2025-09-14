#!/usr/bin/env node

/**
 * Full Regression Test Runner
 * Executes comprehensive regression testing using existing Jest framework
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class FullRegressionRunner {
  constructor() {
    this.startTime = Date.now();
    this.testResults = {};
    this.coverageData = {};

    // Define test execution order and configuration
    this.testSuites = [
      {
        name: 'Unit Tests',
        command: 'npm',
        args: ['run', 'test:unit', '--', '--verbose', '--coverage'],
        timeout: 180000,
        critical: true,
        description: 'Core business logic and service unit tests'
      },
      {
        name: 'Integration Tests',
        command: 'npm',
        args: ['run', 'test:integration', '--', '--verbose'],
        timeout: 300000,
        critical: true,
        description: 'API integration and service interaction tests'
      },
      {
        name: 'Authentication Regression',
        command: 'npx',
        args: ['jest', 'tests/regression/auth-regression.test.js', '--verbose'],
        timeout: 240000,
        critical: true,
        description: 'Comprehensive authentication flow testing'
      },
      {
        name: 'Monitoring Regression',
        command: 'npx',
        args: ['jest', 'tests/regression/monitoring-regression.test.js', '--verbose'],
        timeout: 300000,
        critical: true,
        description: 'Monitoring system and alerting regression tests'
      },
      {
        name: 'Security Tests',
        command: 'npx',
        args: ['jest', 'tests/security', '--verbose'],
        timeout: 180000,
        critical: true,
        description: 'Security vulnerability and penetration tests'
      },
      {
        name: 'Performance Tests',
        command: 'npm',
        args: ['run', 'test:performance', '--', '--verbose'],
        timeout: 600000,
        critical: false,
        description: 'Load testing and performance benchmarks'
      },
      {
        name: 'Middleware Tests',
        command: 'npx',
        args: ['jest', 'tests/middleware', '--verbose'],
        timeout: 120000,
        critical: true,
        description: 'Request processing middleware validation'
      },
      {
        name: 'Route Tests',
        command: 'npx',
        args: ['jest', 'tests/routes', '--verbose'],
        timeout: 240000,
        critical: true,
        description: 'API route handler comprehensive testing'
      }
    ];

    // Quality gates and thresholds
    this.qualityGates = {
      coverage: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95
      },
      performance: {
        maxAverageResponseTime: 1000,
        minSuccessRate: 95
      },
      security: {
        maxCriticalVulnerabilities: 0,
        maxHighVulnerabilities: 0
      }
    };
  }

  /**
   * Main regression test execution
   */
  async run() {
    try {
      console.log('🧪 FloWorx Full Regression Test Suite');
      );
    console.log(`Total Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`Test Suites: ${summary.testSuites.passed}/${summary.testSuites.total} passed (${summary.suiteSuccessRate}%)`);
    console.log(`Individual Tests: ${summary.individualTests.passed}/${summary.individualTests.total} passed (${summary.testSuccessRate}%)`);
    console.log('');

    // Show test suite results
    Object.entries(this.testResults).forEach(([name, result]) => {
      const icon = result.status === 'passed' ? '✅' : '❌';
      const testInfo = result.testCounts ?
        ` (${result.testCounts.passed}/${result.testCounts.total} tests)` : '';
      console.log(`${icon} ${name}: ${result.status.toUpperCase()}${testInfo}`);
    });

    // Show coverage summary
    if (this.coverageData.total) {
      console.log('');
      console.log('📊 Coverage Summary:');
      console.log(`   Statements: ${this.coverageData.total.statements.pct}%`);
      console.log(`   Branches: ${this.coverageData.total.branches.pct}%`);
      console.log(`   Functions: ${this.coverageData.total.functions.pct}%`);
      console.log(`   Lines: ${this.coverageData.total.lines.pct}%`);
    }

    // Show recommendations
    const recommendations = this.generateRecommendations();
    if (recommendations.length > 0) {
      console.log('');
      console.log('💡 Recommendations:');
      recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
        console.log(`      Action: ${rec.action}`);
      });
    }

    console.log('');
    if (summary.testSuites.failed === 0 && parseFloat(summary.testSuccessRate) >= 95) {
      console.log('🎉 All regression tests passed! System is ready for deployment.');
    } else {
      console.log('❌ Regression tests failed. Please address the issues above before deployment.');
      process.exit(1);
    }
  }

  /**
   * Generate failure report
   */
  async generateFailureReport(error) {
    const report = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      testResults: this.testResults,
      environment: process.env.NODE_ENV
    };

    try {
      await fs.mkdir('./test-results', { recursive: true });
      const reportPath = `./test-results/regression-failure-${Date.now()}.json`;
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Failure report saved: ${reportPath}`);
    } catch (reportError) {
      console.warn(`⚠️  Failed to save failure report: ${reportError.message}`);
    }
  }
}

// Handle script execution
if (require.main === module) {
  const runner = new FullRegressionRunner();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Regression testing interrupted by user');
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Regression testing terminated');
    process.exit(1);
  });

  // Run full regression tests
  runner.run().catch(error => {
    console.error('Full regression testing failed:', error.message);
    process.exit(1);
  });
}

module.exports = FullRegressionRunner;
