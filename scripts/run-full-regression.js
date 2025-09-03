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
      console.log('====================================');
      console.log(`Started: ${new Date().toISOString()}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'test'}`);
      console.log(`Working Directory: ${process.cwd()}`);
      console.log('');

      // Pre-test setup and validation
      await this.setupTestEnvironment();
      await this.validateTestPrerequisites();

      // Execute all test suites
      await this.executeTestSuites();

      // Collect and analyze results
      await this.collectCoverageData();
      await this.runQualityChecks();
      await this.validateQualityGates();

      // Generate comprehensive reports
      await this.generateRegressionReport();
      await this.generateCoverageReport();

      // Display final results
      this.displayFinalResults();

    } catch (error) {
      console.error('❌ Full regression testing failed:', error.message);
      await this.generateFailureReport(error);
      process.exit(1);
    }
  }

  /**
   * Setup test environment
   */
  async setupTestEnvironment() {
    console.log('🔧 Setting up test environment...');

    // Set test environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-jwt-secret-for-regression-testing-32-chars';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long';
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/floworx_test';

    // Create necessary directories
    const directories = ['./test-results', './coverage', './reports'];
    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }
    }

    // Clear previous test artifacts
    try {
      await fs.rm('./coverage', { recursive: true, force: true });
      await fs.rm('./test-results', { recursive: true, force: true });
    } catch (error) {
      // Files might not exist
    }

    console.log('  ✅ Test environment configured');
    console.log('');
  }

  /**
   * Validate test prerequisites
   */
  async validateTestPrerequisites() {
    console.log('🔍 Validating test prerequisites...');

    const checks = [
      { name: 'Node.js version', check: () => this.checkNodeVersion() },
      { name: 'NPM dependencies', check: () => this.checkDependencies() },
      { name: 'Test files exist', check: () => this.checkTestFiles() },
      { name: 'Jest configuration', check: () => this.checkJestConfig() }
    ];

    for (const check of checks) {
      try {
        await check.check();
        console.log(`  ✅ ${check.name}`);
      } catch (error) {
        console.log(`  ❌ ${check.name}: ${error.message}`);
        throw new Error(`Prerequisite check failed: ${check.name}`);
      }
    }

    console.log('  ✅ All prerequisites validated');
    console.log('');
  }

  /**
   * Check Node.js version
   */
  checkNodeVersion() {
    const version = process.version;
    const major = parseInt(version.substring(1).split('.')[0]);
    
    if (major < 16) {
      throw new Error(`Node.js 16+ required, found ${version}`);
    }
  }

  /**
   * Check NPM dependencies
   */
  async checkDependencies() {
    try {
      const packageJson = await fs.readFile('./package.json', 'utf8');
      const pkg = JSON.parse(packageJson);
      
      if (!pkg.devDependencies || !pkg.devDependencies.jest) {
        throw new Error('Jest not found in devDependencies');
      }
    } catch (error) {
      throw new Error(`Dependency check failed: ${error.message}`);
    }
  }

  /**
   * Check test files exist
   */
  async checkTestFiles() {
    const requiredTestFiles = [
      './tests/setup.js',
      './tests/helpers/testDataFactory.js',
      './tests/helpers/testUtils.js'
    ];

    for (const file of requiredTestFiles) {
      try {
        await fs.access(file);
      } catch (error) {
        throw new Error(`Required test file missing: ${file}`);
      }
    }
  }

  /**
   * Check Jest configuration
   */
  async checkJestConfig() {
    try {
      await fs.access('./jest.config.js');
    } catch (error) {
      throw new Error('Jest configuration file not found');
    }
  }

  /**
   * Execute all test suites
   */
  async executeTestSuites() {
    console.log('🧪 Executing test suites...');
    console.log('');

    for (let i = 0; i < this.testSuites.length; i++) {
      const suite = this.testSuites[i];
      console.log(`📋 Running ${suite.name} (${i + 1}/${this.testSuites.length})`);
      console.log(`   ${suite.description}`);

      try {
        const result = await this.executeTestSuite(suite);
        this.testResults[suite.name] = {
          status: 'passed',
          ...result
        };
        console.log(`   ✅ ${suite.name} completed (${result.duration}ms)`);
        console.log(`      Tests: ${result.testCounts.passed}/${result.testCounts.total} passed`);
      } catch (error) {
        this.testResults[suite.name] = {
          status: 'failed',
          error: error.message,
          duration: error.duration || 0,
          testCounts: error.testCounts || { total: 0, passed: 0, failed: 0 }
        };
        console.log(`   ❌ ${suite.name} failed: ${error.message}`);
        
        if (suite.critical) {
          console.log('   🛑 Critical test suite failed. Continuing with remaining tests...');
          // Continue with other tests but mark as critical failure
        }
      }
      console.log('');
    }
  }

  /**
   * Execute individual test suite
   */
  async executeTestSuite(suite) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const child = spawn(suite.command, suite.args, {
        stdio: ['inherit', 'pipe', 'pipe'],
        cwd: path.join(__dirname, '..', 'backend'),
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        
        // Show real-time output for verbose mode
        if (process.argv.includes('--verbose')) {
          process.stdout.write(output);
        }
      });

      child.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        
        if (process.argv.includes('--verbose')) {
          process.stderr.write(output);
        }
      });

      // Set timeout
      const timeout = setTimeout(() => {
        child.kill('SIGTERM');
        const error = new Error(`Test suite timed out after ${suite.timeout}ms`);
        error.duration = Date.now() - startTime;
        reject(error);
      }, suite.timeout);

      child.on('close', (code) => {
        clearTimeout(timeout);
        const duration = Date.now() - startTime;
        const testCounts = this.parseTestCounts(stdout);

        if (code === 0) {
          resolve({
            exitCode: code,
            duration,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            testCounts,
            coverage: this.parseCoverageFromOutput(stdout)
          });
        } else {
          const error = new Error(`Test suite exited with code ${code}`);
          error.duration = duration;
          error.stdout = stdout;
          error.stderr = stderr;
          error.testCounts = testCounts;
          reject(error);
        }
      });

      child.on('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to start test suite: ${error.message}`));
      });
    });
  }

  /**
   * Parse test counts from Jest output
   */
  parseTestCounts(output) {
    const counts = { total: 0, passed: 0, failed: 0, skipped: 0 };

    // Parse Jest summary line
    const summaryMatch = output.match(/Tests:\s+(?:(\d+)\s+failed,\s*)?(?:(\d+)\s+skipped,\s*)?(\d+)\s+passed,\s+(\d+)\s+total/);
    if (summaryMatch) {
      counts.failed = parseInt(summaryMatch[1]) || 0;
      counts.skipped = parseInt(summaryMatch[2]) || 0;
      counts.passed = parseInt(summaryMatch[3]) || 0;
      counts.total = parseInt(summaryMatch[4]) || 0;
    }

    return counts;
  }

  /**
   * Parse coverage data from Jest output
   */
  parseCoverageFromOutput(output) {
    const coverage = {};

    // Parse coverage table
    const coverageMatch = output.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      coverage.statements = parseFloat(coverageMatch[1]);
      coverage.branches = parseFloat(coverageMatch[2]);
      coverage.functions = parseFloat(coverageMatch[3]);
      coverage.lines = parseFloat(coverageMatch[4]);
    }

    return coverage;
  }

  /**
   * Collect coverage data
   */
  async collectCoverageData() {
    console.log('📊 Collecting coverage data...');

    try {
      // Read coverage summary if available
      const coverageSummaryPath = path.join(__dirname, '..', 'backend', 'coverage', 'coverage-summary.json');
      const coverageData = await fs.readFile(coverageSummaryPath, 'utf8');
      this.coverageData = JSON.parse(coverageData);
      
      console.log('  ✅ Coverage data collected');
      console.log(`     Overall: ${this.coverageData.total?.statements?.pct || 0}% statements`);
    } catch (error) {
      console.log(`  ⚠️  Coverage data not available: ${error.message}`);
      this.coverageData = { error: error.message };
    }
    console.log('');
  }

  /**
   * Run quality checks
   */
  async runQualityChecks() {
    console.log('🔍 Running quality checks...');

    const qualityChecks = [
      { name: 'ESLint', command: 'npm', args: ['run', 'lint'] },
      { name: 'Security Audit', command: 'npm', args: ['audit', '--audit-level', 'moderate'] },
      { name: 'Format Check', command: 'npm', args: ['run', 'format:check'] }
    ];

    for (const check of qualityChecks) {
      try {
        console.log(`  🔍 Running ${check.name}...`);
        await this.executeTestSuite({
          ...check,
          timeout: 60000,
          critical: false
        });
        console.log(`    ✅ ${check.name} passed`);
      } catch (error) {
        console.log(`    ⚠️  ${check.name} issues found`);
      }
    }
    console.log('');
  }

  /**
   * Validate quality gates
   */
  async validateQualityGates() {
    console.log('🚪 Validating quality gates...');

    const gates = {
      coverage: this.validateCoverageGate(),
      tests: this.validateTestGate(),
      performance: this.validatePerformanceGate()
    };

    const overallPassed = Object.values(gates).every(gate => gate.passed);

    console.log(`  Coverage Gate: ${gates.coverage.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Test Gate: ${gates.tests.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Performance Gate: ${gates.performance.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Overall: ${overallPassed ? '✅ PASSED' : '❌ FAILED'}`);

    if (!overallPassed) {
      console.log('');
      console.log('❌ Quality gates failed. See detailed report for issues.');
    }

    console.log('');
    return { gates, overallPassed };
  }

  /**
   * Validate coverage quality gate
   */
  validateCoverageGate() {
    if (!this.coverageData.total) {
      return { passed: false, reason: 'Coverage data not available' };
    }

    const coverage = this.coverageData.total;
    const thresholds = this.qualityGates.coverage;

    const checks = {
      statements: coverage.statements.pct >= thresholds.statements,
      branches: coverage.branches.pct >= thresholds.branches,
      functions: coverage.functions.pct >= thresholds.functions,
      lines: coverage.lines.pct >= thresholds.lines
    };

    const passed = Object.values(checks).every(Boolean);
    return {
      passed,
      checks,
      coverage: {
        statements: coverage.statements.pct,
        branches: coverage.branches.pct,
        functions: coverage.functions.pct,
        lines: coverage.lines.pct
      }
    };
  }

  /**
   * Validate test quality gate
   */
  validateTestGate() {
    const totalTests = Object.values(this.testResults).reduce((sum, result) => 
      sum + (result.testCounts?.total || 0), 0);
    const passedTests = Object.values(this.testResults).reduce((sum, result) => 
      sum + (result.testCounts?.passed || 0), 0);
    const failedSuites = Object.values(this.testResults).filter(result => 
      result.status === 'failed').length;

    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const passed = failedSuites === 0 && successRate >= 95;

    return {
      passed,
      totalTests,
      passedTests,
      failedSuites,
      successRate: successRate.toFixed(1)
    };
  }

  /**
   * Validate performance quality gate
   */
  validatePerformanceGate() {
    // This would analyze performance test results
    // For now, we'll return a basic check
    const performanceResults = this.testResults['Performance Tests'];
    
    if (!performanceResults || performanceResults.status === 'failed') {
      return { passed: false, reason: 'Performance tests not available or failed' };
    }

    return { passed: true, reason: 'Performance tests passed' };
  }

  /**
   * Generate comprehensive regression report
   */
  async generateRegressionReport() {
    const duration = Date.now() - this.startTime;
    const qualityGates = await this.validateQualityGates();
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${(duration / 1000).toFixed(2)}s`,
      environment: process.env.NODE_ENV,
      summary: this.calculateSummary(),
      testResults: this.testResults,
      coverage: this.coverageData,
      qualityGates: qualityGates.gates,
      overallResult: qualityGates.overallPassed ? 'PASSED' : 'FAILED',
      recommendations: this.generateRecommendations()
    };

    try {
      await fs.mkdir('./test-results', { recursive: true });
      const reportPath = `./test-results/full-regression-report-${Date.now()}.json`;
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      
      console.log(`📄 Regression report saved: ${reportPath}`);
    } catch (error) {
      console.warn(`⚠️  Failed to save regression report: ${error.message}`);
    }
  }

  /**
   * Calculate test summary
   */
  calculateSummary() {
    const suites = Object.values(this.testResults);
    const passedSuites = suites.filter(s => s.status === 'passed').length;
    const failedSuites = suites.filter(s => s.status === 'failed').length;
    const totalSuites = suites.length;

    const totalTests = suites.reduce((sum, s) => sum + (s.testCounts?.total || 0), 0);
    const passedTests = suites.reduce((sum, s) => sum + (s.testCounts?.passed || 0), 0);
    const failedTests = suites.reduce((sum, s) => sum + (s.testCounts?.failed || 0), 0);

    return {
      testSuites: { total: totalSuites, passed: passedSuites, failed: failedSuites },
      individualTests: { total: totalTests, passed: passedTests, failed: failedTests },
      suiteSuccessRate: totalSuites > 0 ? ((passedSuites / totalSuites) * 100).toFixed(1) : '0.0',
      testSuccessRate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0.0'
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Check for failed test suites
    Object.entries(this.testResults).forEach(([suiteName, result]) => {
      if (result.status === 'failed') {
        recommendations.push({
          category: 'testing',
          priority: 'critical',
          suite: suiteName,
          message: `${suiteName} test suite failed`,
          action: 'Review and fix failing tests before deployment'
        });
      }
    });

    // Check coverage
    const coverageGate = this.validateCoverageGate();
    if (!coverageGate.passed) {
      recommendations.push({
        category: 'coverage',
        priority: 'high',
        message: 'Code coverage below quality gate thresholds',
        action: 'Add tests to increase coverage to 95%+'
      });
    }

    return recommendations;
  }

  /**
   * Generate coverage report
   */
  async generateCoverageReport() {
    try {
      // Coverage report is generated by Jest automatically
      console.log('📊 Coverage report available in ./coverage/lcov-report/index.html');
    } catch (error) {
      console.warn(`⚠️  Coverage report generation failed: ${error.message}`);
    }
  }

  /**
   * Display final results
   */
  displayFinalResults() {
    const duration = Date.now() - this.startTime;
    const summary = this.calculateSummary();

    console.log('');
    console.log('📊 Full Regression Test Results');
    console.log('==============================');
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
