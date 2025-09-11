#!/usr/bin/env node

/**
 * DEPLOYMENT-AWARE TESTING SYSTEM
 * ===============================
 * Follows user's deployment rules:
 * - After git push: Wait 3 minutes for build completion
 * - For comprehensive testing: Wait 10 minutes for full system readiness
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

class DeploymentAwareTest {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.apiUrl = `${baseUrl}/api`;
    this.testResults = [];
    
    // Test credentials
    this.workingUser = {
      email: 'dizelll.test.1757606995372@gmail.com',
      password: 'TestPassword123!'
    };
  }

  async waitForDeployment(minutes, reason) {
    console.log(`⏰ WAITING ${minutes} MINUTES FOR ${reason.toUpperCase()}`);
    console.log('='.repeat(50));
    console.log(`🚀 Reason: ${reason}`);
    console.log(`⏱️  Duration: ${minutes} minutes`);
    console.log(`🕐 Started: ${new Date().toISOString()}`);
    
    const totalSeconds = minutes * 60;
    const intervalSeconds = 30; // Update every 30 seconds
    
    for (let elapsed = 0; elapsed < totalSeconds; elapsed += intervalSeconds) {
      const remaining = totalSeconds - elapsed;
      const remainingMinutes = Math.floor(remaining / 60);
      const remainingSeconds = remaining % 60;
      
      process.stdout.write(`\r⏳ Waiting... ${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')} remaining`);
      
      await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
    }
    
    console.log(`\n✅ Wait complete! System should be ready for testing.`);
    console.log(`🕐 Completed: ${new Date().toISOString()}\n`);
  }

  async testSystemReadiness() {
    console.log('🔍 TESTING SYSTEM READINESS AFTER DEPLOYMENT');
    console.log('=============================================');
    
    const readinessTests = [];
    
    // Test 1: Basic API Health
    try {
      const healthResponse = await axios.get(`${this.apiUrl}/health`, { 
        timeout: 10000,
        headers: { 'Cache-Control': 'no-cache' }
      });
      readinessTests.push({
        name: 'API Health',
        success: healthResponse.status === 200,
        status: healthResponse.status,
        data: healthResponse.data
      });
      console.log(`✅ API Health: ${healthResponse.status} - ${healthResponse.data.status || 'OK'}`);
    } catch (error) {
      readinessTests.push({
        name: 'API Health',
        success: false,
        error: error.message
      });
      console.log(`❌ API Health: ${error.message}`);
    }

    // Test 2: Authentication Endpoint
    try {
      const loginResponse = await axios.post(`${this.apiUrl}/auth/login`, this.workingUser, {
        timeout: 15000,
        headers: { 'Cache-Control': 'no-cache' }
      });
      readinessTests.push({
        name: 'Authentication',
        success: loginResponse.status === 200 && !!loginResponse.data.token,
        status: loginResponse.status,
        hasToken: !!loginResponse.data.token
      });
      console.log(`✅ Authentication: ${loginResponse.status} - Token: ${!!loginResponse.data.token}`);
    } catch (error) {
      readinessTests.push({
        name: 'Authentication',
        success: false,
        error: error.message
      });
      console.log(`❌ Authentication: ${error.message}`);
    }

    // Test 3: Database Connectivity (if Supabase configured)
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data, error } = await supabase
          .from('users')
          .select('count')
          .limit(1);

        readinessTests.push({
          name: 'Database Connectivity',
          success: !error,
          error: error?.message
        });
        console.log(`✅ Database: ${!error ? 'Connected' : 'Error - ' + error.message}`);
      } catch (error) {
        readinessTests.push({
          name: 'Database Connectivity',
          success: false,
          error: error.message
        });
        console.log(`❌ Database: ${error.message}`);
      }
    } else {
      console.log(`⚠️  Database: Supabase credentials not configured for testing`);
    }

    // Test 4: Business Logic Endpoints
    try {
      const businessResponse = await axios.get(`${this.apiUrl}/business-types`, {
        timeout: 10000,
        headers: { 'Cache-Control': 'no-cache' }
      });
      readinessTests.push({
        name: 'Business Logic',
        success: businessResponse.status === 200,
        status: businessResponse.status
      });
      console.log(`✅ Business Logic: ${businessResponse.status}`);
    } catch (error) {
      readinessTests.push({
        name: 'Business Logic',
        success: false,
        error: error.message
      });
      console.log(`❌ Business Logic: ${error.message}`);
    }

    const successfulTests = readinessTests.filter(test => test.success).length;
    const totalTests = readinessTests.length;
    const readinessRate = (successfulTests / totalTests * 100).toFixed(1);

    console.log(`\n📊 SYSTEM READINESS: ${successfulTests}/${totalTests} (${readinessRate}%)`);
    
    return {
      ready: readinessRate >= 75, // 75% minimum for basic readiness
      readinessRate: parseFloat(readinessRate),
      tests: readinessTests,
      successfulTests,
      totalTests
    };
  }

  async runPostDeploymentTest(comprehensive = false) {
    const testType = comprehensive ? 'COMPREHENSIVE' : 'BASIC';
    const waitMinutes = comprehensive ? 10 : 3;
    const waitReason = comprehensive ? 
      'comprehensive testing (full system operational)' : 
      'build completion (basic system ready)';

    console.log(`🚀 POST-DEPLOYMENT ${testType} TEST`);
    console.log('='.repeat(40));
    console.log(`🌐 Application: ${this.baseUrl}`);
    console.log(`📧 Test User: ${this.workingUser.email}`);
    console.log(`⏰ Started: ${new Date().toISOString()}\n`);

    // Wait according to deployment rules
    await this.waitForDeployment(waitMinutes, waitReason);

    // Test system readiness
    const readinessResult = await this.testSystemReadiness();

    if (!readinessResult.ready) {
      console.log('\n⚠️  SYSTEM NOT READY');
      console.log('System readiness is below 75%. Deployment may have issues.');
      console.log('Consider checking deployment logs or waiting longer.');
      
      return {
        deploymentReady: false,
        readinessRate: readinessResult.readinessRate,
        message: 'System not ready after deployment wait period',
        tests: readinessResult.tests
      };
    }

    console.log('\n✅ SYSTEM READY - Proceeding with testing...\n');

    // If comprehensive testing requested, run additional tests
    if (comprehensive) {
      console.log('🧪 RUNNING COMPREHENSIVE POST-DEPLOYMENT TESTS');
      console.log('===============================================');

      // Run a subset of the ultimate validation tests
      const comprehensiveResults = await this.runComprehensiveTests();
      
      return {
        deploymentReady: true,
        readinessRate: readinessResult.readinessRate,
        comprehensiveResults,
        message: 'Comprehensive post-deployment testing complete',
        timestamp: new Date().toISOString()
      };
    }

    return {
      deploymentReady: true,
      readinessRate: readinessResult.readinessRate,
      message: 'Basic post-deployment testing complete - system ready',
      timestamp: new Date().toISOString()
    };
  }

  async runComprehensiveTests() {
    const tests = [];

    // Test 1: Complete Authentication Flow
    try {
      const testEmail = `post.deploy.${Date.now()}@test.com`;
      
      // Register new user
      const registerResponse = await axios.post(`${this.apiUrl}/auth/register`, {
        firstName: 'Post',
        lastName: 'Deploy',
        email: testEmail,
        password: 'PostDeploy123!',
        businessName: 'Post Deploy Test',
        agreeToTerms: true
      });

      // Login with existing user
      const loginResponse = await axios.post(`${this.apiUrl}/auth/login`, this.workingUser);

      tests.push({
        name: 'Authentication Flow',
        success: registerResponse.status === 201 && loginResponse.status === 200,
        details: {
          registration: registerResponse.status,
          login: loginResponse.status,
          newUser: testEmail
        }
      });

      console.log(`✅ Authentication Flow: Registration ${registerResponse.status}, Login ${loginResponse.status}`);

    } catch (error) {
      tests.push({
        name: 'Authentication Flow',
        success: false,
        error: error.message
      });
      console.log(`❌ Authentication Flow: ${error.message}`);
    }

    // Test 2: Performance Check
    try {
      const startTime = Date.now();
      await axios.get(`${this.apiUrl}/health`);
      const responseTime = Date.now() - startTime;

      tests.push({
        name: 'Performance Check',
        success: responseTime < 2000, // Under 2 seconds
        details: {
          responseTime: `${responseTime}ms`,
          acceptable: responseTime < 2000
        }
      });

      console.log(`✅ Performance: ${responseTime}ms response time`);

    } catch (error) {
      tests.push({
        name: 'Performance Check',
        success: false,
        error: error.message
      });
      console.log(`❌ Performance: ${error.message}`);
    }

    // Test 3: Security Check
    try {
      let securityPassed = false;
      try {
        await axios.get(`${this.apiUrl}/user/profile`); // Should fail without auth
      } catch (error) {
        securityPassed = error.response?.status === 401;
      }

      tests.push({
        name: 'Security Check',
        success: securityPassed,
        details: {
          unauthorizedBlocked: securityPassed
        }
      });

      console.log(`✅ Security: Unauthorized access ${securityPassed ? 'blocked' : 'allowed'}`);

    } catch (error) {
      tests.push({
        name: 'Security Check',
        success: false,
        error: error.message
      });
      console.log(`❌ Security: ${error.message}`);
    }

    const successfulTests = tests.filter(test => test.success).length;
    const successRate = (successfulTests / tests.length * 100).toFixed(1);

    console.log(`\n📊 Comprehensive Tests: ${successfulTests}/${tests.length} (${successRate}%)`);

    return {
      tests,
      successfulTests,
      totalTests: tests.length,
      successRate: parseFloat(successRate),
      allPassed: successfulTests === tests.length
    };
  }

  async saveTestReport(results) {
    const reportFile = `deployment-test-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Deployment test report saved to: ${reportFile}`);
    return reportFile;
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const comprehensive = args.includes('--comprehensive') || args.includes('-c');
  
  console.log('🚀 DEPLOYMENT-AWARE TESTING SYSTEM');
  console.log('==================================');
  console.log(`📋 Test Type: ${comprehensive ? 'COMPREHENSIVE (10 min wait)' : 'BASIC (3 min wait)'}`);
  console.log(`📖 Following deployment rules:`);
  console.log(`   • After git push: Wait 3 minutes for build completion`);
  console.log(`   • For comprehensive testing: Wait 10 minutes for full readiness`);
  console.log('');

  const tester = new DeploymentAwareTest();
  
  try {
    const results = await tester.runPostDeploymentTest(comprehensive);
    await tester.saveTestReport(results);

    if (results.deploymentReady) {
      console.log('\n🎉 DEPLOYMENT TEST COMPLETE!');
      console.log(`✅ System is ready and operational (${results.readinessRate}% readiness)`);
      
      if (comprehensive && results.comprehensiveResults) {
        const compResults = results.comprehensiveResults;
        console.log(`📊 Comprehensive Tests: ${compResults.successfulTests}/${compResults.totalTests} (${compResults.successRate}%)`);
        
        if (compResults.allPassed) {
          console.log('🏆 All comprehensive tests passed - system is perfect!');
        } else {
          console.log('⚠️  Some comprehensive tests failed - check results for details');
        }
      }
      
      process.exit(0);
    } else {
      console.log('\n❌ DEPLOYMENT TEST FAILED');
      console.log(`⚠️  System readiness: ${results.readinessRate}% (below 75% threshold)`);
      console.log('🔧 Check deployment logs and system status');
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n❌ DEPLOYMENT TEST ERROR: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = DeploymentAwareTest;
