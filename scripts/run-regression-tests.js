#!/usr/bin/env node

/**
 * Comprehensive Regression Testing Suite
 * Utilizes existing Jest test frameworks for full system validation
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class RegressionTestRunner {
  constructor() {
    this.startTime = Date.now();
    this.testResults = {};
    this.coverageResults = {};
    this.performanceBaseline = {};

    // Test suites configuration
    this.testSuites = [
      {
        name: 'Unit Tests',
        command: 'npm',
        args: ['run', 'test:unit'],
        critical: true,
        timeout: 120000, // 2 minutes
        description: 'Core business logic and service layer tests'
      },
      {
        name: 'Integration Tests',
        command: 'npm',
        args: ['run', 'test:integration'],
        critical: true,
        timeout: 180000, // 3 minutes
        description: 'API endpoints and service integration tests'
      },
      {
        name: 'Performance Tests',
        command: 'npm',
        args: ['run', 'test:performance'],
        critical: false,
        timeout: 300000, // 5 minutes
        description: 'Database and API performance validation'
      },
      {
        name: 'Security Tests',
        command: 'jest',
        args: ['tests/security', '--verbose'],
        critical: true,
        timeout: 120000, // 2 minutes
        description: 'Security vulnerability and authentication tests'
      },
      {
        name: 'Middleware Tests',
        command: 'jest',
        args: ['tests/middleware', '--verbose'],
        critical: true,
        timeout: 60000, // 1 minute
        description: 'Request processing and validation middleware tests'
      },
      {
        name: 'Route Tests',
        command: 'jest',
        args: ['tests/routes', '--verbose'],
        critical: true,
        timeout: 120000, // 2 minutes
        description: 'API route handler and endpoint tests'
      }
    ];

    // Quality gates configuration
    this.qualityGates = {
      coverage: {
        branches: 95,
        functions: 95,
        lines: 95,
        statements: 95
      },
      performance: {
        maxResponseTime: 1000, // ms
        maxQueryTime: 500, // ms
        maxMemoryUsage: 512 // MB
      },
      security: {
        maxVulnerabilities: 0,
        requiredSecurityHeaders: ['helmet', 'cors', 'rate-limiting']
      }
    };
  }

  /**
   * Main regression test execution
   */
  async run() {
    try {
      console.log('🧪 FloWorx Comprehensive Regression Testing Suite');
      );
    console.log(`Total Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`Test Suites: ${summary.testSuites.passed}/${summary.testSuites.total} passed (${summary.successRate}%)`);
    console.log(`Individual Tests: ${summary.individualTests.passed}/${summary.individualTests.total} passed (${summary.testSuccessRate}%)`);
    console.log('');

    // Show test suite results
    for (const [name, result] of Object.entries(this.testResults)) {
      const icon = result.status === 'passed' ? '✅' : '❌';
      console.log(`${icon} ${name}: ${result.status.toUpperCase()}`);
    }

    // Show coverage results
    console.log('');
    console.log('📊 Coverage Results:');
    console.log(`   Statements: ${this.coverageResults.statements || 0}%`);
    console.log(`   Branches: ${this.coverageResults.branches || 0}%`);
    console.log(`   Functions: ${this.coverageResults.functions || 0}%`);
    console.log(`   Lines: ${this.coverageResults.lines || 0}%`);

    // Show quality gates
    const qualityGates = this.evaluateQualityGates();
    console.log('');
    console.log('🚪 Quality Gates:');
    console.log(`   Coverage: ${qualityGates.coverage.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Performance: ${qualityGates.performance.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Security: ${qualityGates.security.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Overall: ${qualityGates.overall ? '✅ PASSED' : '❌ FAILED'}`);

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
    if (qualityGates.overall && summary.testSuites.failed === 0) {
      console.log('🎉 All regression tests passed! System is ready for deployment.');
    } else {
      console.log('❌ Regression tests failed. Please address the issues above before deployment.');
      process.exit(1);
    }
  }
}

// Handle script execution
if (require.main === module) {
  const runner = new RegressionTestRunner();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Regression testing interrupted by user');
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Regression testing terminated');
    process.exit(1);
  });

  // Run regression tests
  runner.run().catch(error => {
    console.error('Regression testing failed:', error.message);
    process.exit(1);
  });
}

module.exports = RegressionTestRunner;
