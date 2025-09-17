#!/usr/bin/env node

/**
 * Test Suite for FloWorx Deployment Validation System
 * 
 * This script validates that all deployment validation components are working correctly
 * and ready for production use. It tests the orchestrator and all validation systems.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class DeploymentValidationSystemTester {
  constructor() {
    this.testResults = [];
    this.requiredFiles = [
      'deployment-validation-system.js',
      'browser-e2e-validation.js',
      'master-deployment-orchestrator.js'
    ];
    this.requiredDependencies = [
      'playwright'
    ];
  }

  /**
   * Run comprehensive test suite
   */
  async runTestSuite() {
    console.log('🧪 FLOWORX DEPLOYMENT VALIDATION SYSTEM TEST SUITE');
    console.log('=' .repeat(70));
    console.log('🔍 Validating all deployment validation components\n');

    const testSuite = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
      },
      recommendation: 'PENDING'
    };

    try {
      // Test 1: File Structure Validation
      console.log('📁 1. Testing File Structure...');
      const fileTests = await this.testFileStructure();
      testSuite.tests.push(...fileTests);

      // Test 2: Dependency Validation
      console.log('\n📦 2. Testing Dependencies...');
      const dependencyTests = await this.testDependencies();
      testSuite.tests.push(...dependencyTests);

      // Test 3: Script Execution Validation
      console.log('\n⚙️  3. Testing Script Execution...');
      const executionTests = await this.testScriptExecution();
      testSuite.tests.push(...executionTests);

      // Test 4: CLI Interface Validation
      console.log('\n🖥️  4. Testing CLI Interfaces...');
      const cliTests = await this.testCLIInterfaces();
      testSuite.tests.push(...cliTests);

      // Test 5: Safety Mechanism Validation
      console.log('\n🛡️  5. Testing Safety Mechanisms...');
      const safetyTests = await this.testSafetyMechanisms();
      testSuite.tests.push(...safetyTests);

      // Calculate summary
      testSuite.summary.total = testSuite.tests.length;
      testSuite.summary.passed = testSuite.tests.filter(t => t.status === 'PASS').length;
      testSuite.summary.failed = testSuite.tests.filter(t => t.status === 'FAIL').length;
      testSuite.summary.errors = testSuite.tests
        .filter(t => t.status === 'FAIL')
        .map(t => ({ test: t.name, error: t.error }));

      // Determine recommendation
      if (testSuite.summary.failed === 0) {
        testSuite.recommendation = 'SYSTEM_READY_FOR_USE';
        console.log('\n✅ ALL TESTS PASSED');
        console.log('🎉 Deployment validation system is ready for use');
      } else {
        testSuite.recommendation = 'SYSTEM_NEEDS_FIXES';
        console.log('\n❌ SOME TESTS FAILED');
        console.log('🔧 Issues must be resolved before using the system');
      }

    } catch (error) {
      testSuite.summary.errors.push({
        test: 'SYSTEM_ERROR',
        error: error.message
      });
      testSuite.recommendation = 'SYSTEM_ERROR';
      console.log('\n💥 SYSTEM ERROR DURING TESTING');
    }

    // Save test results
    await this.saveTestReport(testSuite);
    
    // Display summary
    this.displayTestSummary(testSuite);
    
    return testSuite;
  }

  /**
   * Test file structure
   */
  async testFileStructure() {
    const tests = [];
    
    // Test required files exist
    for (const file of this.requiredFiles) {
      const exists = fs.existsSync(file);
      tests.push({
        name: `File Exists - ${file}`,
        status: exists ? 'PASS' : 'FAIL',
        error: exists ? null : `Required file ${file} not found`,
        details: { file, exists }
      });
    }

    // Test reports directory can be created
    try {
      const reportsDir = './reports';
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      tests.push({
        name: 'Reports Directory - Writable',
        status: 'PASS',
        error: null,
        details: { directory: reportsDir }
      });
    } catch (error) {
      tests.push({
        name: 'Reports Directory - Writable',
        status: 'FAIL',
        error: error.message,
        details: null
      });
    }

    return tests;
  }

  /**
   * Test dependencies
   */
  async testDependencies() {
    const tests = [];
    
    // Test Node.js modules
    const nodeModules = ['https', 'fs', 'path', 'child_process'];
    for (const module of nodeModules) {
      try {
        require(module);
        tests.push({
          name: `Node Module - ${module}`,
          status: 'PASS',
          error: null,
          details: { module }
        });
      } catch (error) {
        tests.push({
          name: `Node Module - ${module}`,
          status: 'FAIL',
          error: error.message,
          details: { module }
        });
      }
    }

    // Test Playwright (optional but recommended)
    try {
      require('playwright');
      tests.push({
        name: 'Playwright - Available',
        status: 'PASS',
        error: null,
        details: { note: 'Browser E2E testing available' }
      });
    } catch (error) {
      tests.push({
        name: 'Playwright - Available',
        status: 'FAIL',
        error: 'Playwright not installed - browser E2E testing will not work',
        details: { 
          note: 'Install with: npm install playwright',
          impact: 'Browser E2E validation will fail'
        }
      });
    }

    return tests;
  }

  /**
   * Test script execution
   */
  async testScriptExecution() {
    const tests = [];
    
    // Test each script can be executed with --help
    for (const script of this.requiredFiles) {
      try {
        const result = await this.runScript(script, ['--help'], 10000);
        const helpDisplayed = result.stdout.includes('USAGE') || 
                             result.stdout.includes('COMMANDS') ||
                             result.stdout.includes('help');
        
        tests.push({
          name: `Script Execution - ${script}`,
          status: helpDisplayed ? 'PASS' : 'FAIL',
          error: helpDisplayed ? null : 'Help text not displayed properly',
          details: { 
            script, 
            exitCode: result.exitCode,
            helpDisplayed,
            outputLength: result.stdout.length
          }
        });
      } catch (error) {
        tests.push({
          name: `Script Execution - ${script}`,
          status: 'FAIL',
          error: error.message,
          details: { script }
        });
      }
    }

    return tests;
  }

  /**
   * Test CLI interfaces
   */
  async testCLIInterfaces() {
    const tests = [];
    
    const cliTests = [
      {
        script: 'deployment-validation-system.js',
        commands: ['--help', '--health-check']
      },
      {
        script: 'browser-e2e-validation.js',
        commands: ['--help']
      },
      {
        script: 'master-deployment-orchestrator.js',
        commands: ['--help', '--status']
      }
    ];

    for (const test of cliTests) {
      for (const command of test.commands) {
        try {
          const result = await this.runScript(test.script, [command], 15000);
          const validResponse = result.stdout.length > 0 && 
                               !result.stdout.includes('Error') &&
                               (result.exitCode === 0 || command === '--health-check');
          
          tests.push({
            name: `CLI Command - ${test.script} ${command}`,
            status: validResponse ? 'PASS' : 'FAIL',
            error: validResponse ? null : 'Invalid CLI response',
            details: { 
              script: test.script,
              command,
              exitCode: result.exitCode,
              outputLength: result.stdout.length,
              hasError: result.stderr.length > 0
            }
          });
        } catch (error) {
          tests.push({
            name: `CLI Command - ${test.script} ${command}`,
            status: 'FAIL',
            error: error.message,
            details: { script: test.script, command }
          });
        }
      }
    }

    return tests;
  }

  /**
   * Test safety mechanisms
   */
  async testSafetyMechanisms() {
    const tests = [];
    
    // Test that scripts contain safety keywords
    const safetyKeywords = [
      'HUMAN',
      'APPROVAL',
      'NO AUTONOMOUS',
      'STAGING',
      'PRODUCTION'
    ];

    for (const script of this.requiredFiles) {
      try {
        const content = fs.readFileSync(script, 'utf8');
        const foundKeywords = safetyKeywords.filter(keyword => 
          content.toUpperCase().includes(keyword)
        );
        
        const hasSafetyMechanisms = foundKeywords.length >= 3;
        
        tests.push({
          name: `Safety Mechanisms - ${script}`,
          status: hasSafetyMechanisms ? 'PASS' : 'FAIL',
          error: hasSafetyMechanisms ? null : 'Insufficient safety mechanisms detected',
          details: { 
            script,
            foundKeywords,
            totalKeywords: foundKeywords.length,
            requiredKeywords: 3
          }
        });
      } catch (error) {
        tests.push({
          name: `Safety Mechanisms - ${script}`,
          status: 'FAIL',
          error: error.message,
          details: { script }
        });
      }
    }

    return tests;
  }

  /**
   * Run a script with arguments
   */
  async runScript(script, args, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [script, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          exitCode: code,
          stdout: stdout,
          stderr: stderr
        });
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to run ${script}: ${error.message}`));
      });

      // Handle timeout
      setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Script timeout: ${script} took longer than ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Save test report
   */
  async saveTestReport(testSuite) {
    const reportsDir = './reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `deployment-system-test-${Date.now()}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(testSuite, null, 2));
    console.log(`\n📄 Test report saved: ${filepath}`);
  }

  /**
   * Display test summary
   */
  displayTestSummary(testSuite) {
    console.log('\n📊 TEST SUMMARY:');
    console.log('=' .repeat(50));
    console.log(`   • Total Tests: ${testSuite.summary.total}`);
    console.log(`   • Passed: ${testSuite.summary.passed}`);
    console.log(`   • Failed: ${testSuite.summary.failed}`);
    console.log(`   • Success Rate: ${((testSuite.summary.passed / testSuite.summary.total) * 100).toFixed(1)}%`);

    if (testSuite.summary.failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      testSuite.summary.errors.forEach(error => {
        console.log(`   • ${error.test}: ${error.error}`);
      });
    }

    console.log(`\n📋 RECOMMENDATION: ${testSuite.recommendation}`);

    if (testSuite.recommendation === 'SYSTEM_READY_FOR_USE') {
      console.log('\n🎉 DEPLOYMENT VALIDATION SYSTEM IS READY!');
      console.log('\n🚀 NEXT STEPS:');
      console.log('   1. Run staging validation: node master-deployment-orchestrator.js --full-validation');
      console.log('   2. Review validation reports manually');
      console.log('   3. Approve production deployment: node master-deployment-orchestrator.js --approve-production');
      console.log('   4. Monitor production health continuously');

      console.log('\n🛡️  SAFETY REMINDERS:');
      console.log('   • Always validate staging before production');
      console.log('   • Human approval required for all production actions');
      console.log('   • No autonomous fixes in production');
      console.log('   • Emergency rollback available for critical issues');
    } else {
      console.log('\n🔧 REQUIRED ACTIONS:');
      console.log('   1. Fix all failed tests');
      console.log('   2. Install missing dependencies (especially Playwright)');
      console.log('   3. Ensure all required files are present');
      console.log('   4. Re-run this test suite');
      console.log('   5. Only proceed when all tests pass');
    }
  }
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case '--test':
    case '--run':
    default:
      const tester = new DeploymentValidationSystemTester();
      const results = await tester.runTestSuite();
      process.exit(results.recommendation === 'SYSTEM_READY_FOR_USE' ? 0 : 1);
      break;

    case '--help':
    case '-h':
      console.log('🧪 FloWorx Deployment Validation System Tester');
      console.log('=' .repeat(60));
      console.log('\n📖 USAGE:');
      console.log('  node test-deployment-validation-system.js [command]');
      console.log('\n🔧 COMMANDS:');
      console.log('  --test, --run    Run comprehensive test suite (default)');
      console.log('  --help          Show this help message');
      console.log('\n🧪 WHAT THIS TESTS:');
      console.log('   • File structure and required components');
      console.log('   • Dependencies and Node.js modules');
      console.log('   • Script execution and CLI interfaces');
      console.log('   • Safety mechanisms and human approval gates');
      console.log('   • System readiness for deployment validation');
      console.log('\n✅ SUCCESS CRITERIA:');
      console.log('   • All required files present and executable');
      console.log('   • All dependencies available');
      console.log('   • CLI interfaces working correctly');
      console.log('   • Safety mechanisms properly implemented');
      break;
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Test suite interrupted');
  process.exit(1);
});

// Run main function
if (require.main === module) {
  main().catch((error) => {
    console.error('\n💥 TEST SYSTEM ERROR:', error.message);
    process.exit(1);
  });
}
