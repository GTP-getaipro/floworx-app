#!/usr/bin/env node

/**
 * FloWorx E2E Test Suite Executor
 * Complete regression testing with setup, execution, and reporting
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Test Execution Configuration
 */
const EXECUTION_CONFIG = {
  // Test environment
  environment: {
    NODE_ENV: 'test',
    TEST_DB_NAME: 'floworx_e2e_test',
    TEST_SERVER_PORT: 5001,
    TEST_FRONTEND_PORT: 3001,
    E2E_HEADLESS: process.env.E2E_HEADLESS || 'true',
    DEBUG_E2E: process.env.DEBUG_E2E || 'false'
  },
  
  // Test phases
  phases: [
    {
      name: 'Environment Setup',
      script: 'tests/e2e/setup/test-environment.js',
      critical: true
    },
    {
      name: 'Authentication Tests',
      script: 'tests/e2e/suites/authentication.test.js',
      critical: true
    },
    {
      name: 'Business Logic Tests',
      script: 'tests/e2e/suites/business-logic.test.js',
      critical: true
    },
    {
      name: 'API Integration Tests',
      script: 'tests/e2e/suites/api-integration.test.js',
      critical: true
    },
    {
      name: 'Frontend Integration Tests',
      script: 'tests/e2e/suites/frontend-integration.test.js',
      critical: false
    },
    {
      name: 'Security Scan',
      script: 'tests/security/security-scan.js',
      critical: false
    },
    {
      name: 'Performance Tests',
      script: 'tests/performance/load-test.js',
      critical: false
    }
  ]
};

/**
 * Main Test Executor Class
 */
class E2ETestExecutor {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      phases: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      environment: EXECUTION_CONFIG.environment
    };
  }

  /**
   * Execute complete E2E test suite
   */
  async execute() {
    console.log('🚀 FloWorx E2E Regression Test Suite');
    console.log('====================================');
    console.log(`Started: ${this.results.startTime.toLocaleString()}`);
    console.log(`Environment: ${this.results.environment.NODE_ENV}`);
    console.log(`Headless: ${this.results.environment.E2E_HEADLESS}`);
    console.log(`Debug: ${this.results.environment.DEBUG_E2E}\n`);

    try {
      // Pre-flight checks
      await this.preflightChecks();

      // Setup test environment
      await this.setupTestEnvironment();

      // Execute test phases
      await this.executeTestPhases();

      // Generate final report
      await this.generateFinalReport();

      this.results.endTime = new Date();
      const duration = this.results.endTime - this.results.startTime;
      
      console.log('\n🎉 E2E Test Suite Completed!');
      console.log('============================');
      console.log(`Duration: ${Math.round(duration / 1000)}s`);
      console.log(`Passed: ${this.results.summary.passed}`);
      console.log(`Failed: ${this.results.summary.failed}`);
      console.log(`Skipped: ${this.results.summary.skipped}`);
      
      const success = this.results.summary.failed === 0;
      console.log(`\nResult: ${success ? '✅ SUCCESS' : '❌ FAILURE'}`);
      
      return success;

    } catch (error) {
      console.error('\n💥 Test suite execution failed:', error.message);
      return false;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Pre-flight checks
   */
  async preflightChecks() {
    console.log('🔍 Running pre-flight checks...');

    // Check Node.js version
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
    if (majorVersion < 16) {
      throw new Error(`Node.js 16+ required, found ${nodeVersion}`);
    }
    console.log(`✅ Node.js ${nodeVersion}`);

    // Check required commands
    const requiredCommands = ['npm', 'psql', 'node'];
    for (const cmd of requiredCommands) {
      try {
        execSync(`which ${cmd}`, { stdio: 'pipe' });
        console.log(`✅ ${cmd} available`);
      } catch (error) {
        throw new Error(`Required command not found: ${cmd}`);
      }
    }

    // Check PostgreSQL
    try {
      execSync('psql --version', { stdio: 'pipe' });
      console.log('✅ PostgreSQL available');
    } catch (error) {
      throw new Error('PostgreSQL not available');
    }

    // Check available ports
    const requiredPorts = [
      this.results.environment.TEST_SERVER_PORT,
      this.results.environment.TEST_FRONTEND_PORT
    ];
    
    for (const port of requiredPorts) {
      if (await this.isPortInUse(port)) {
        throw new Error(`Port ${port} is already in use`);
      }
      console.log(`✅ Port ${port} available`);
    }

    console.log('✅ Pre-flight checks passed\n');
  }

  /**
   * Setup test environment
   */
  async setupTestEnvironment() {
    console.log('🛠️  Setting up test environment...');

    // Create reports directory
    const reportsDir = path.join(__dirname, 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    // Install dependencies if needed
    try {
      console.log('📦 Checking dependencies...');
      execSync('npm list mocha chai axios puppeteer pg', { 
        stdio: 'pipe',
        cwd: __dirname
      });
      console.log('✅ Dependencies verified');
    } catch (error) {
      console.log('📦 Installing missing dependencies...');
      execSync('npm install mocha chai axios puppeteer pg bcryptjs uuid', {
        stdio: 'inherit',
        cwd: __dirname
      });
    }

    // Setup test database
    await this.setupTestDatabase();

    console.log('✅ Test environment ready\n');
  }

  /**
   * Setup test database
   */
  async setupTestDatabase() {
    console.log('🗄️  Setting up test database...');

    const dbName = this.results.environment.TEST_DB_NAME;
    
    try {
      // Drop existing test database
      execSync(`dropdb --if-exists ${dbName}`, { stdio: 'pipe' });
      
      // Create fresh test database
      execSync(`createdb ${dbName}`, { stdio: 'pipe' });
      
      // Apply schema if exists
      const schemaPath = path.join(__dirname, 'backend/database/schema.sql');
      if (fs.existsSync(schemaPath)) {
        execSync(`psql -d ${dbName} -f ${schemaPath}`, { stdio: 'pipe' });
      }
      
      console.log(`✅ Test database '${dbName}' ready`);
    } catch (error) {
      throw new Error(`Failed to setup test database: ${error.message}`);
    }
  }

  /**
   * Execute all test phases
   */
  async executeTestPhases() {
    console.log('🧪 Executing test phases...\n');

    for (const phase of EXECUTION_CONFIG.phases) {
      console.log(`📋 ${phase.name}...`);
      
      const phaseResult = await this.executePhase(phase);
      this.results.phases.push(phaseResult);
      
      // Update summary
      this.results.summary.total++;
      if (phaseResult.success) {
        this.results.summary.passed++;
        console.log(`✅ ${phase.name} - PASSED`);
      } else {
        this.results.summary.failed++;
        console.log(`❌ ${phase.name} - FAILED`);
        
        if (phase.critical) {
          console.log(`🚨 Critical phase failed: ${phase.name}`);
          console.log('Stopping test execution due to critical failure\n');
          break;
        }
      }
      
      console.log(); // Empty line between phases
    }
  }

  /**
   * Execute individual test phase
   */
  async executePhase(phase) {
    const startTime = Date.now();
    
    try {
      // Set environment variables
      const env = {
        ...process.env,
        ...this.results.environment
      };

      // Execute test script
      const result = await this.runScript(phase.script, env);
      
      return {
        name: phase.name,
        script: phase.script,
        success: result.exitCode === 0,
        duration: Date.now() - startTime,
        output: result.output,
        error: result.error
      };

    } catch (error) {
      return {
        name: phase.name,
        script: phase.script,
        success: false,
        duration: Date.now() - startTime,
        output: '',
        error: error.message
      };
    }
  }

  /**
   * Run script with environment
   */
  async runScript(scriptPath, env) {
    return new Promise((resolve) => {
      const child = spawn('node', [scriptPath], {
        env,
        stdio: 'pipe',
        cwd: __dirname
      });

      let output = '';
      let error = '';

      child.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        if (this.results.environment.DEBUG_E2E === 'true') {
          process.stdout.write(text);
        }
      });

      child.stderr.on('data', (data) => {
        const text = data.toString();
        error += text;
        if (this.results.environment.DEBUG_E2E === 'true') {
          process.stderr.write(text);
        }
      });

      child.on('close', (exitCode) => {
        resolve({
          exitCode,
          output,
          error
        });
      });
    });
  }

  /**
   * Generate final comprehensive report
   */
  async generateFinalReport() {
    console.log('📊 Generating final report...');

    const report = {
      metadata: {
        timestamp: new Date(),
        duration: this.results.endTime - this.results.startTime,
        environment: this.results.environment,
        nodeVersion: process.version,
        platform: process.platform
      },
      summary: this.results.summary,
      phases: this.results.phases,
      recommendations: this.generateRecommendations()
    };

    // Save JSON report
    const reportPath = path.join(__dirname, 'reports', `e2e-final-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(report);
    const htmlPath = path.join(__dirname, 'reports', `e2e-final-report-${Date.now()}.html`);
    fs.writeFileSync(htmlPath, htmlReport);

    console.log(`✅ Final reports generated:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   HTML: ${htmlPath}`);
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport(report) {
    const successRate = (report.summary.passed / report.summary.total * 100).toFixed(1);
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>FloWorx E2E Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 8px; text-align: center; }
        .stat-card h3 { margin: 0 0 10px 0; color: #495057; }
        .stat-card .number { font-size: 2em; font-weight: bold; margin: 10px 0; }
        .passed .number { color: #28a745; }
        .failed .number { color: #dc3545; }
        .total .number { color: #007bff; }
        .phase { margin: 20px 0; padding: 15px; border-radius: 8px; }
        .phase.success { background: #d4edda; border-left: 4px solid #28a745; }
        .phase.failure { background: #f8d7da; border-left: 4px solid #dc3545; }
        .phase h4 { margin: 0 0 10px 0; }
        .phase .duration { color: #6c757d; font-size: 0.9em; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>FloWorx E2E Test Report</h1>
            <p>Generated: ${report.metadata.timestamp.toLocaleString()}</p>
            <p>Duration: ${Math.round(report.metadata.duration / 1000)}s | Success Rate: ${successRate}%</p>
        </div>
        
        <div class="summary">
            <div class="stat-card total">
                <h3>Total Tests</h3>
                <div class="number">${report.summary.total}</div>
            </div>
            <div class="stat-card passed">
                <h3>Passed</h3>
                <div class="number">${report.summary.passed}</div>
            </div>
            <div class="stat-card failed">
                <h3>Failed</h3>
                <div class="number">${report.summary.failed}</div>
            </div>
        </div>
        
        <h2>Test Phases</h2>
        ${report.phases.map(phase => `
            <div class="phase ${phase.success ? 'success' : 'failure'}">
                <h4>${phase.name} - ${phase.success ? 'PASSED' : 'FAILED'}</h4>
                <div class="duration">Duration: ${phase.duration}ms</div>
                ${phase.error ? `<div style="color: #dc3545; margin-top: 10px;">Error: ${phase.error}</div>` : ''}
            </div>
        `).join('')}
        
        ${report.recommendations.length > 0 ? `
            <div class="recommendations">
                <h3>Recommendations</h3>
                <ul>
                    ${report.recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
        ` : ''}
    </div>
</body>
</html>`;
  }

  /**
   * Generate recommendations based on results
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.summary.failed > 0) {
      recommendations.push('Review failed test phases and address underlying issues');
    }
    
    if (this.results.summary.passed === this.results.summary.total) {
      recommendations.push('All tests passed! Consider adding more edge case testing');
    }
    
    recommendations.push('Run tests regularly in CI/CD pipeline');
    recommendations.push('Monitor performance metrics over time');
    
    return recommendations;
  }

  /**
   * Check if port is in use
   */
  async isPortInUse(port) {
    return new Promise((resolve) => {
      const net = require('net');
      const server = net.createServer();
      
      server.listen(port, () => {
        server.close(() => resolve(false));
      });
      
      server.on('error', () => resolve(true));
    });
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up...');
    
    // Cleanup would be handled by individual test suites
    // This is a placeholder for any global cleanup
    
    console.log('✅ Cleanup completed');
  }
}

// Execute if run directly
if (require.main === module) {
  const executor = new E2ETestExecutor();
  
  executor.execute()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Execution failed:', error);
      process.exit(1);
    });
}

module.exports = { E2ETestExecutor, EXECUTION_CONFIG };
