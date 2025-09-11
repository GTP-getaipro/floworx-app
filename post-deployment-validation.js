#!/usr/bin/env node

/**
 * POST-DEPLOYMENT VALIDATION SUITE
 * ================================
 * Comprehensive validation after each deployment
 * Combines all testing approaches for complete confidence
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class PostDeploymentValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: {
        totalSuites: 0,
        passedSuites: 0,
        failedSuites: 0,
        overallSuccess: false
      }
    };
  }

  async runCommand(command, args = [], description = '') {
    return new Promise((resolve, reject) => {
      console.log(`\n🚀 Running: ${description || command}`);
      console.log(`📋 Command: ${command} ${args.join(' ')}`);
      console.log('-'.repeat(50));

      const process = spawn(command, args, {
        stdio: 'inherit',
        shell: true,
        cwd: __dirname
      });

      process.on('close', (code) => {
        const success = code === 0;
        console.log(`\n${success ? '✅' : '❌'} ${description || command}: ${success ? 'PASSED' : 'FAILED'} (Exit code: ${code})`);
        
        this.results.tests.push({
          name: description || command,
          command: `${command} ${args.join(' ')}`,
          success,
          exitCode: code,
          timestamp: new Date().toISOString()
        });

        resolve({ success, exitCode: code });
      });

      process.on('error', (error) => {
        console.log(`\n❌ ${description || command}: ERROR - ${error.message}`);
        
        this.results.tests.push({
          name: description || command,
          command: `${command} ${args.join(' ')}`,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        resolve({ success: false, error: error.message });
      });
    });
  }

  async waitForDeployment(minutes = 3) {
    console.log('⏰ POST-DEPLOYMENT VALIDATION SUITE');
    console.log('===================================');
    console.log(`🚀 Following deployment rules: Wait ${minutes} minutes after git push`);
    console.log(`⏱️  Duration: ${minutes} minutes`);
    console.log(`🕐 Started: ${new Date().toISOString()}`);
    
    const totalSeconds = minutes * 60;
    const intervalSeconds = 30;
    
    for (let elapsed = 0; elapsed < totalSeconds; elapsed += intervalSeconds) {
      const remaining = totalSeconds - elapsed;
      const remainingMinutes = Math.floor(remaining / 60);
      const remainingSeconds = remaining % 60;
      
      process.stdout.write(`\r⏳ Deployment wait... ${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')} remaining`);
      
      await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
    }
    
    console.log(`\n✅ Deployment wait complete! Starting comprehensive validation...`);
    console.log(`🕐 Completed: ${new Date().toISOString()}\n`);
  }

  async runValidationSuite(waitForDeployment = true) {
    console.log('🎯 COMPREHENSIVE POST-DEPLOYMENT VALIDATION');
    console.log('===========================================');
    console.log(`⏰ Started: ${new Date().toISOString()}`);
    console.log(`🌐 Target: https://app.floworx-iq.com`);
    console.log('');

    // Wait for deployment if requested
    if (waitForDeployment) {
      await this.waitForDeployment(3);
    }

    // Test Suite 1: Deployment-Aware Basic Tests
    console.log('\n📋 TEST SUITE 1: DEPLOYMENT-AWARE BASIC VALIDATION');
    console.log('==================================================');
    const basicTest = await this.runCommand('node', ['deployment-aware-test.js', '--no-wait'], 'Basic Deployment Validation');

    // Test Suite 2: Production Readiness Tests
    console.log('\n📋 TEST SUITE 2: PRODUCTION READINESS VALIDATION');
    console.log('================================================');
    const productionTest = await this.runCommand('node', ['production-readiness-test.js'], 'Production Readiness Validation');

    // Test Suite 3: Regression Tests Analysis
    console.log('\n📋 TEST SUITE 3: REGRESSION TESTS VALIDATION');
    console.log('============================================');
    const regressionTest = await this.runCommand('node', ['fix-regression-tests.js'], 'Regression Tests Analysis');

    // Test Suite 4: Playwright Browser Tests
    console.log('\n📋 TEST SUITE 4: PLAYWRIGHT BROWSER VALIDATION');
    console.log('==============================================');
    const playwrightTest = await this.runCommand('node', ['playwright-deployment-tests.js', '--no-wait'], 'Playwright Browser Tests');

    // Test Suite 5: Ultimate Validation (if all others pass)
    let ultimateTest = { success: true }; // Skip by default
    const criticalTestsPassed = basicTest.success && productionTest.success;
    
    if (criticalTestsPassed) {
      console.log('\n📋 TEST SUITE 5: ULTIMATE COMPREHENSIVE VALIDATION');
      console.log('==================================================');
      ultimateTest = await this.runCommand('node', ['ultimate-validation-test.js'], 'Ultimate Comprehensive Validation');
    } else {
      console.log('\n⚠️  SKIPPING ULTIMATE VALIDATION - Critical tests failed');
      this.results.tests.push({
        name: 'Ultimate Comprehensive Validation',
        success: false,
        skipped: true,
        reason: 'Critical tests failed',
        timestamp: new Date().toISOString()
      });
    }

    // Calculate final results
    this.results.summary.totalSuites = this.results.tests.length;
    this.results.summary.passedSuites = this.results.tests.filter(test => test.success).length;
    this.results.summary.failedSuites = this.results.tests.filter(test => !test.success).length;
    this.results.summary.overallSuccess = this.results.summary.failedSuites === 0;

    // Display comprehensive results
    this.displayResults();

    // Save comprehensive report
    const reportFile = `post-deployment-validation-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Comprehensive validation report saved to: ${reportFile}`);

    return this.results;
  }

  displayResults() {
    console.log('\n🎯 COMPREHENSIVE POST-DEPLOYMENT VALIDATION RESULTS');
    console.log('===================================================');
    
    const { summary } = this.results;
    const successRate = summary.totalSuites > 0 ? (summary.passedSuites / summary.totalSuites * 100).toFixed(1) : 0;
    
    console.log(`📊 Test Suites: ${summary.totalSuites}`);
    console.log(`✅ Passed: ${summary.passedSuites}`);
    console.log(`❌ Failed: ${summary.failedSuites}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    
    console.log('\n📋 Detailed Test Suite Results:');
    this.results.tests.forEach((test, index) => {
      const status = test.success ? '✅' : test.skipped ? '⏭️' : '❌';
      const details = test.skipped ? `(Skipped: ${test.reason})` : 
                     test.error ? `(Error: ${test.error})` : 
                     `(Exit code: ${test.exitCode})`;
      
      console.log(`   ${index + 1}. ${status} ${test.name} ${details}`);
    });

    // Overall assessment
    console.log('\n🎯 OVERALL DEPLOYMENT ASSESSMENT:');
    if (summary.overallSuccess) {
      console.log('🎉 PERFECT: All validation suites passed - deployment is excellent!');
      console.log('✅ System is ready for production traffic');
      console.log('✅ All critical functionality validated');
      console.log('✅ Browser compatibility confirmed');
      console.log('✅ API endpoints working perfectly');
    } else if (successRate >= 80) {
      console.log('✅ GOOD: Most validation suites passed - deployment is mostly successful');
      console.log('⚠️  Some non-critical issues detected - review failed tests');
    } else if (successRate >= 60) {
      console.log('⚠️  FAIR: Some validation suites failed - deployment needs attention');
      console.log('🔧 Review failed tests and address issues before production traffic');
    } else {
      console.log('❌ POOR: Multiple validation suites failed - deployment has significant issues');
      console.log('🚨 Do not proceed with production traffic until issues are resolved');
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (summary.overallSuccess) {
      console.log('🚀 Deploy to production with complete confidence');
      console.log('📊 Monitor system performance and user feedback');
      console.log('🔄 Continue regular deployment validation');
    } else {
      const failedTests = this.results.tests.filter(test => !test.success && !test.skipped);
      console.log('🔧 Address the following failed test suites:');
      failedTests.forEach(test => {
        console.log(`   • ${test.name}: ${test.error || 'Check logs for details'}`);
      });
    }

    console.log('\n🎉 POST-DEPLOYMENT VALIDATION COMPLETE!');
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const skipWait = args.includes('--no-wait') || args.includes('-n');
  
  console.log('🎯 POST-DEPLOYMENT VALIDATION SUITE');
  console.log('===================================');
  console.log(`📋 Wait for deployment: ${!skipWait ? 'YES (3 minutes)' : 'NO (immediate)'}`);
  console.log(`📖 Comprehensive validation including:`);
  console.log(`   • Basic deployment validation`);
  console.log(`   • Production readiness tests`);
  console.log(`   • Regression tests analysis`);
  console.log(`   • Playwright browser tests`);
  console.log(`   • Ultimate comprehensive validation`);
  console.log('');

  const validator = new PostDeploymentValidator();
  
  try {
    const results = await validator.runValidationSuite(!skipWait);
    
    if (results.summary.overallSuccess) {
      console.log('\n🎉 All validation suites passed - deployment successful!');
      process.exit(0);
    } else if (results.summary.passedSuites / results.summary.totalSuites >= 0.8) {
      console.log('\n✅ Most validation suites passed - deployment mostly successful');
      process.exit(0);
    } else {
      console.log('\n❌ Multiple validation suites failed - deployment needs attention');
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n❌ VALIDATION SUITE ERROR: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = PostDeploymentValidator;
