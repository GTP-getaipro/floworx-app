#!/usr/bin/env node

/**
 * E2E Test Runner for FloWorx SaaS
 * Orchestrates test execution, reporting, and cleanup
 */

const Mocha = require('mocha');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

/**
 * Test Runner Configuration
 */
const RUNNER_CONFIG = {
  timeout: 300000, // 5 minutes per test suite
  reporter: 'spec',
  reporterOptions: {
    reportDir: path.join(__dirname, '../../reports/e2e'),
    reportFilename: `e2e-report-${Date.now()}.json`
  },
  suites: [
    {
      name: 'Authentication Flow',
      file: './suites/authentication.test.js',
      priority: 1,
      critical: true
    },
    {
      name: 'Core Business Logic',
      file: './suites/business-logic.test.js',
      priority: 2,
      critical: true
    },
    {
      name: 'API Integration',
      file: './suites/api-integration.test.js',
      priority: 3,
      critical: true
    },
    {
      name: 'Frontend Integration',
      file: './suites/frontend-integration.test.js',
      priority: 4,
      critical: false
    }
  ]
};

/**
 * E2E Test Runner Class
 */
class E2ETestRunner {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      suiteResults: [],
      errors: [],
      performance: {
        setupTime: 0,
        executionTime: 0,
        cleanupTime: 0
      }
    };
  }

  /**
   * Run all E2E tests
   */
  async run() {
    console.log('🚀 Starting FloWorx E2E Test Suite');
    console.log('==================================\n');

    try {
      // Pre-flight checks
      await this.preflightChecks();

      // Run test suites
      await this.runTestSuites();

      // Generate reports
      await this.generateReports();

      // Performance analysis
      await this.performanceAnalysis();

      // Security scan
      await this.securityScan();

      console.log('\n✅ E2E Test Suite Completed Successfully');
      return this.results;

    } catch (error) {
      console.error('\n❌ E2E Test Suite Failed:', error.message);
      this.results.errors.push({
        type: 'RUNNER_ERROR',
        message: error.message,
        stack: error.stack,
        timestamp: new Date()
      });
      
      throw error;
    } finally {
      this.results.endTime = new Date();
      await this.cleanup();
    }
  }

  /**
   * Pre-flight checks before running tests
   */
  async preflightChecks() {
    console.log('🔍 Running pre-flight checks...');

    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`Node.js version: ${nodeVersion}`);

    // Check required dependencies
    const requiredDeps = ['mocha', 'chai', 'axios', 'puppeteer', 'pg'];
    for (const dep of requiredDeps) {
      try {
        require.resolve(dep);
        console.log(`✅ ${dep} - OK`);
      } catch (error) {
        throw new Error(`Missing required dependency: ${dep}`);
      }
    }

    // Check database connectivity
    try {
      const { Client } = require('pg');
      const client = new Client({
        host: process.env.TEST_DB_HOST || 'localhost',
        port: process.env.TEST_DB_PORT || 5432,
        database: 'postgres',
        user: process.env.TEST_DB_USER || 'postgres',
        password: process.env.TEST_DB_PASSWORD || 'password'
      });
      
      await client.connect();
      await client.end();
      console.log('✅ Database connectivity - OK');
    } catch (error) {
      throw new Error(`Database connectivity failed: ${error.message}`);
    }

    // Check available ports
    const requiredPorts = [5001, 3001]; // Test server and frontend ports
    for (const port of requiredPorts) {
      try {
        const net = require('net');
        const server = net.createServer();
        
        await new Promise((resolve, reject) => {
          server.listen(port, () => {
            server.close(resolve);
          });
          server.on('error', reject);
        });
        
        console.log(`✅ Port ${port} - Available`);
      } catch (error) {
        throw new Error(`Port ${port} is not available`);
      }
    }

    console.log('✅ Pre-flight checks completed\n');
  }

  /**
   * Run test suites in order
   */
  async runTestSuites() {
    console.log('🧪 Running test suites...\n');

    // Sort suites by priority
    const sortedSuites = RUNNER_CONFIG.suites.sort((a, b) => a.priority - b.priority);

    for (const suite of sortedSuites) {
      console.log(`📋 Running ${suite.name}...`);
      
      const suiteStartTime = Date.now();
      const suiteResult = await this.runSuite(suite);
      const suiteEndTime = Date.now();
      
      suiteResult.duration = suiteEndTime - suiteStartTime;
      this.results.suiteResults.push(suiteResult);
      
      // Update totals
      this.results.totalTests += suiteResult.totalTests;
      this.results.passedTests += suiteResult.passedTests;
      this.results.failedTests += suiteResult.failedTests;
      this.results.skippedTests += suiteResult.skippedTests;
      
      console.log(`✅ ${suite.name} completed in ${suiteResult.duration}ms`);
      console.log(`   Passed: ${suiteResult.passedTests}, Failed: ${suiteResult.failedTests}, Skipped: ${suiteResult.skippedTests}\n`);
      
      // Stop on critical suite failure
      if (suite.critical && suiteResult.failedTests > 0) {
        console.log(`❌ Critical suite failed: ${suite.name}`);
        console.log('Stopping test execution due to critical failure\n');
        break;
      }
    }
  }

  /**
   * Run individual test suite
   */
  async runSuite(suite) {
    return new Promise((resolve) => {
      const mocha = new Mocha({
        timeout: RUNNER_CONFIG.timeout,
        reporter: 'json'
      });

      // Add test file
      const testFile = path.resolve(__dirname, suite.file);
      mocha.addFile(testFile);

      // Capture results
      let jsonResults = '';
      
      const runner = mocha.run();
      
      // Capture JSON output
      runner.on('end', function() {
        const stats = this.stats;
        
        resolve({
          name: suite.name,
          file: suite.file,
          totalTests: stats.tests,
          passedTests: stats.passes,
          failedTests: stats.failures,
          skippedTests: stats.pending,
          duration: stats.duration,
          critical: suite.critical,
          success: stats.failures === 0
        });
      });
    });
  }

  /**
   * Generate comprehensive test reports
   */
  async generateReports() {
    console.log('📊 Generating test reports...');

    // Ensure reports directory exists
    const reportsDir = RUNNER_CONFIG.reporterOptions.reportDir;
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Generate JSON report
    const jsonReport = {
      summary: {
        startTime: this.results.startTime,
        endTime: this.results.endTime,
        duration: this.results.endTime - this.results.startTime,
        totalTests: this.results.totalTests,
        passedTests: this.results.passedTests,
        failedTests: this.results.failedTests,
        skippedTests: this.results.skippedTests,
        successRate: this.results.totalTests > 0 ? 
          (this.results.passedTests / this.results.totalTests * 100).toFixed(2) : 0
      },
      suites: this.results.suiteResults,
      errors: this.results.errors,
      performance: this.results.performance,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: process.memoryUsage(),
        env: process.env.NODE_ENV || 'test'
      }
    };

    const jsonReportPath = path.join(reportsDir, RUNNER_CONFIG.reporterOptions.reportFilename);
    fs.writeFileSync(jsonReportPath, JSON.stringify(jsonReport, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(jsonReport);
    const htmlReportPath = path.join(reportsDir, `e2e-report-${Date.now()}.html`);
    fs.writeFileSync(htmlReportPath, htmlReport);

    // Generate summary report
    const summaryPath = path.join(reportsDir, 'latest-summary.txt');
    const summary = this.generateSummaryReport(jsonReport);
    fs.writeFileSync(summaryPath, summary);

    console.log(`✅ Reports generated:`);
    console.log(`   JSON: ${jsonReportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
    console.log(`   Summary: ${summaryPath}\n`);
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport(jsonReport) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>FloWorx E2E Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .stat-card { background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 5px; flex: 1; }
        .passed { border-left: 4px solid #4caf50; }
        .failed { border-left: 4px solid #f44336; }
        .skipped { border-left: 4px solid #ff9800; }
        .suite { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .suite.success { border-left: 4px solid #4caf50; }
        .suite.failure { border-left: 4px solid #f44336; }
        .error { background: #ffebee; padding: 10px; margin: 10px 0; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>FloWorx E2E Test Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Duration: ${jsonReport.summary.duration}ms</p>
        <p>Success Rate: ${jsonReport.summary.successRate}%</p>
    </div>
    
    <div class="summary">
        <div class="stat-card passed">
            <h3>Passed</h3>
            <h2>${jsonReport.summary.passedTests}</h2>
        </div>
        <div class="stat-card failed">
            <h3>Failed</h3>
            <h2>${jsonReport.summary.failedTests}</h2>
        </div>
        <div class="stat-card skipped">
            <h3>Skipped</h3>
            <h2>${jsonReport.summary.skippedTests}</h2>
        </div>
    </div>
    
    <h2>Test Suites</h2>
    ${jsonReport.suites.map(suite => `
        <div class="suite ${suite.success ? 'success' : 'failure'}">
            <h3>${suite.name}</h3>
            <p>Duration: ${suite.duration}ms</p>
            <p>Tests: ${suite.totalTests} | Passed: ${suite.passedTests} | Failed: ${suite.failedTests} | Skipped: ${suite.skippedTests}</p>
            ${suite.critical ? '<p><strong>Critical Suite</strong></p>' : ''}
        </div>
    `).join('')}
    
    ${jsonReport.errors.length > 0 ? `
        <h2>Errors</h2>
        ${jsonReport.errors.map(error => `
            <div class="error">
                <h4>${error.type}</h4>
                <p>${error.message}</p>
                <small>${error.timestamp}</small>
            </div>
        `).join('')}
    ` : ''}
</body>
</html>`;
  }

  /**
   * Generate summary report
   */
  generateSummaryReport(jsonReport) {
    return `
FloWorx E2E Test Suite Summary
==============================

Execution Time: ${new Date(jsonReport.summary.startTime).toLocaleString()} - ${new Date(jsonReport.summary.endTime).toLocaleString()}
Total Duration: ${jsonReport.summary.duration}ms

Test Results:
- Total Tests: ${jsonReport.summary.totalTests}
- Passed: ${jsonReport.summary.passedTests}
- Failed: ${jsonReport.summary.failedTests}
- Skipped: ${jsonReport.summary.skippedTests}
- Success Rate: ${jsonReport.summary.successRate}%

Suite Results:
${jsonReport.suites.map(suite => 
  `- ${suite.name}: ${suite.success ? 'PASS' : 'FAIL'} (${suite.duration}ms)`
).join('\n')}

${jsonReport.errors.length > 0 ? `
Errors:
${jsonReport.errors.map(error => `- ${error.type}: ${error.message}`).join('\n')}
` : 'No errors reported.'}

Environment:
- Node.js: ${jsonReport.environment.nodeVersion}
- Platform: ${jsonReport.environment.platform}
- Architecture: ${jsonReport.environment.arch}
- Memory Usage: ${Math.round(jsonReport.environment.memory.heapUsed / 1024 / 1024)}MB
`;
  }

  /**
   * Performance analysis
   */
  async performanceAnalysis() {
    console.log('⚡ Running performance analysis...');

    // Analyze test execution times
    const slowSuites = this.results.suiteResults
      .filter(suite => suite.duration > 60000) // Slower than 1 minute
      .sort((a, b) => b.duration - a.duration);

    if (slowSuites.length > 0) {
      console.log('⚠️  Slow test suites detected:');
      slowSuites.forEach(suite => {
        console.log(`   ${suite.name}: ${suite.duration}ms`);
      });
    }

    // Memory usage analysis
    const memoryUsage = process.memoryUsage();
    console.log(`📊 Memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`);

    console.log('✅ Performance analysis completed\n');
  }

  /**
   * Security scan
   */
  async securityScan() {
    console.log('🔒 Running security scan...');

    try {
      // Check for known vulnerabilities in dependencies
      execSync('npm audit --audit-level moderate', { 
        cwd: path.join(__dirname, '../../'),
        stdio: 'pipe' 
      });
      console.log('✅ No security vulnerabilities found');
    } catch (error) {
      console.log('⚠️  Security vulnerabilities detected - check npm audit');
      this.results.errors.push({
        type: 'SECURITY_WARNING',
        message: 'Security vulnerabilities detected in dependencies',
        timestamp: new Date()
      });
    }

    console.log('✅ Security scan completed\n');
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up test resources...');
    
    // Cleanup would be handled by individual test suites
    // This is a placeholder for any global cleanup
    
    console.log('✅ Cleanup completed');
  }
}

// Run tests if called directly
if (require.main === module) {
  const runner = new E2ETestRunner();
  
  runner.run()
    .then((results) => {
      console.log('\n🎉 Test execution completed successfully!');
      process.exit(results.failedTests > 0 ? 1 : 0);
    })
    .catch((error) => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { E2ETestRunner, RUNNER_CONFIG };
