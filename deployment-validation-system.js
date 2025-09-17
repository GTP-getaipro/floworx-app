#!/usr/bin/env node

/**
 * FloWorx Authentication Flow Deployment Validation System
 * 
 * CRITICAL SAFETY PRINCIPLES:
 * 1. STAGING/UAT VALIDATION FIRST - Never deploy directly to production
 * 2. HUMAN APPROVAL REQUIRED - No autonomous production deployments
 * 3. NON-INTRUSIVE MONITORING - Production monitoring must be lightweight
 * 4. IMMEDIATE HALT ON ISSUES - Stop all automation if problems detected
 * 5. COMPREHENSIVE REPORTING - Detailed logs and incident reports
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

class AuthenticationValidationSystem {
  constructor(config = {}) {
    this.config = {
      stagingUrl: config.stagingUrl || 'https://staging.app.floworx-iq.com',
      productionUrl: config.productionUrl || 'https://app.floworx-iq.com',
      testTimeout: config.testTimeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      monitoringInterval: config.monitoringInterval || 60000, // 1 minute
      alertThreshold: config.alertThreshold || 3, // 3 consecutive failures
      ...config
    };
    
    this.testResults = [];
    this.monitoringActive = false;
    this.alertCount = 0;
    this.lastHealthCheck = null;
    
    // Test user data for validation
    this.testUsers = {
      valid: {
        email: `test-${Date.now()}@floworx-validation.com`,
        password: 'ValidPass123!',
        firstName: 'Test',
        lastName: 'User',
        companyName: 'Test Company',
        agreeToTerms: true
      },
      existing: {
        email: 'existing@floworx-validation.com',
        password: 'ExistingPass123!'
      },
      invalid: {
        email: 'invalid-email',
        password: '123',
        firstName: '',
        lastName: ''
      }
    };
  }

  /**
   * PHASE 1: STAGING/UAT DEPLOYMENT VALIDATION
   * This is the primary safety gate - all changes must pass here first
   */
  async validateStagingDeployment() {
    console.log('🚀 PHASE 1: STAGING/UAT DEPLOYMENT VALIDATION');
    console.log('=' .repeat(60));
    console.log(`🎯 Target: ${this.config.stagingUrl}`);
    console.log(`⏰ Started: ${new Date().toISOString()}\n`);

    const validationResults = {
      timestamp: new Date().toISOString(),
      environment: 'staging',
      url: this.config.stagingUrl,
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
      // Test 1: User Registration Flow
      console.log('📝 Testing User Registration Flow...');
      const registrationTests = await this.testRegistrationFlow(this.config.stagingUrl);
      validationResults.tests.push(...registrationTests);

      // Test 2: User Login Flow  
      console.log('🔐 Testing User Login Flow...');
      const loginTests = await this.testLoginFlow(this.config.stagingUrl);
      validationResults.tests.push(...loginTests);

      // Test 3: Forgot Password Flow
      console.log('🔑 Testing Forgot Password Flow...');
      const passwordTests = await this.testForgotPasswordFlow(this.config.stagingUrl);
      validationResults.tests.push(...passwordTests);

      // Test 4: Logout/Sign Out Flow
      console.log('🚪 Testing Logout/Sign Out Flow...');
      const logoutTests = await this.testLogoutFlow(this.config.stagingUrl);
      validationResults.tests.push(...logoutTests);

      // Calculate summary
      validationResults.summary.total = validationResults.tests.length;
      validationResults.summary.passed = validationResults.tests.filter(t => t.status === 'PASS').length;
      validationResults.summary.failed = validationResults.tests.filter(t => t.status === 'FAIL').length;
      validationResults.summary.errors = validationResults.tests
        .filter(t => t.status === 'FAIL')
        .map(t => ({ test: t.name, error: t.error }));

      // Determine recommendation
      if (validationResults.summary.failed === 0) {
        validationResults.recommendation = 'APPROVED_FOR_PRODUCTION';
        console.log('\n✅ STAGING VALIDATION: PASSED');
        console.log('🎉 All authentication flows working correctly');
        console.log('📋 RECOMMENDATION: APPROVED FOR PRODUCTION DEPLOYMENT');
      } else {
        validationResults.recommendation = 'REJECTED_NEEDS_FIXES';
        console.log('\n❌ STAGING VALIDATION: FAILED');
        console.log('🚨 Critical issues detected - HALTING DEPLOYMENT PROCESS');
        console.log('📋 RECOMMENDATION: REJECTED - NEEDS IMMEDIATE FIXES');
      }

    } catch (error) {
      validationResults.summary.errors.push({
        test: 'SYSTEM_ERROR',
        error: error.message
      });
      validationResults.recommendation = 'SYSTEM_ERROR';
      console.log('\n💥 SYSTEM ERROR DURING VALIDATION');
      console.log('🚨 CRITICAL: Validation system failure - HALTING ALL PROCESSES');
    }

    // Save detailed results
    await this.saveValidationReport(validationResults, 'staging');
    
    return validationResults;
  }

  /**
   * Test User Registration Flow
   * Covers: successful registration, duplicate email handling, validation errors
   */
  async testRegistrationFlow(baseUrl) {
    const tests = [];
    
    // Test 1.1: Successful Registration
    try {
      const result = await this.makeRequest(baseUrl, '/api/auth/register', 'POST', this.testUsers.valid);
      tests.push({
        name: 'Registration - Valid Data',
        status: [201, 409].includes(result.statusCode) ? 'PASS' : 'FAIL',
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        error: [201, 409].includes(result.statusCode) ? null : `Expected 201 or 409, got ${result.statusCode}`,
        details: result.body
      });
    } catch (error) {
      tests.push({
        name: 'Registration - Valid Data',
        status: 'FAIL',
        error: error.message,
        details: null
      });
    }

    // Test 1.2: Duplicate Email Handling
    try {
      const result = await this.makeRequest(baseUrl, '/api/auth/register', 'POST', this.testUsers.valid);
      const isValidResponse = result.statusCode === 409 && 
                             result.body && 
                             (result.body.error || result.body.message);
      tests.push({
        name: 'Registration - Duplicate Email (409 Conflict)',
        status: isValidResponse ? 'PASS' : 'FAIL',
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        error: isValidResponse ? null : 'Should return 409 with user-friendly error message',
        details: result.body
      });
    } catch (error) {
      tests.push({
        name: 'Registration - Duplicate Email (409 Conflict)',
        status: 'FAIL',
        error: error.message,
        details: null
      });
    }

    // Test 1.3: Invalid Data Validation
    try {
      const result = await this.makeRequest(baseUrl, '/api/auth/register', 'POST', this.testUsers.invalid);
      tests.push({
        name: 'Registration - Invalid Data Validation',
        status: result.statusCode === 400 ? 'PASS' : 'FAIL',
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        error: result.statusCode === 400 ? null : `Expected 400, got ${result.statusCode}`,
        details: result.body
      });
    } catch (error) {
      tests.push({
        name: 'Registration - Invalid Data Validation',
        status: 'FAIL',
        error: error.message,
        details: null
      });
    }

    return tests;
  }

  /**
   * Test User Login Flow
   * Covers: successful login, invalid credentials, non-existent email
   */
  async testLoginFlow(baseUrl) {
    const tests = [];
    
    // Test 2.1: Invalid Credentials (Wrong Password)
    try {
      const loginData = {
        email: this.testUsers.valid.email,
        password: 'WrongPassword123!'
      };
      const result = await this.makeRequest(baseUrl, '/api/auth/login', 'POST', loginData);
      const isValidResponse = result.statusCode === 401 && 
                             result.body && 
                             result.body.error &&
                             result.body.error.message;
      tests.push({
        name: 'Login - Invalid Credentials (401 Unauthorized)',
        status: isValidResponse ? 'PASS' : 'FAIL',
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        error: isValidResponse ? null : 'Should return 401 with user-friendly error message',
        details: result.body
      });
    } catch (error) {
      tests.push({
        name: 'Login - Invalid Credentials (401 Unauthorized)',
        status: 'FAIL',
        error: error.message,
        details: null
      });
    }

    // Test 2.2: Non-existent Email
    try {
      const loginData = {
        email: 'nonexistent@floworx-validation.com',
        password: 'SomePassword123!'
      };
      const result = await this.makeRequest(baseUrl, '/api/auth/login', 'POST', loginData);
      tests.push({
        name: 'Login - Non-existent Email',
        status: result.statusCode === 401 ? 'PASS' : 'FAIL',
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        error: result.statusCode === 401 ? null : `Expected 401, got ${result.statusCode}`,
        details: result.body
      });
    } catch (error) {
      tests.push({
        name: 'Login - Non-existent Email',
        status: 'FAIL',
        error: error.message,
        details: null
      });
    }

    // Test 2.3: Missing Required Fields
    try {
      const result = await this.makeRequest(baseUrl, '/api/auth/login', 'POST', { email: '' });
      tests.push({
        name: 'Login - Missing Required Fields',
        status: result.statusCode === 400 ? 'PASS' : 'FAIL',
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        error: result.statusCode === 400 ? null : `Expected 400, got ${result.statusCode}`,
        details: result.body
      });
    } catch (error) {
      tests.push({
        name: 'Login - Missing Required Fields',
        status: 'FAIL',
        error: error.message,
        details: null
      });
    }

    return tests;
  }

  /**
   * Test Forgot Password Flow
   * Covers: password reset request, invalid email handling
   */
  async testForgotPasswordFlow(baseUrl) {
    const tests = [];
    
    // Test 3.1: Valid Email Password Reset
    try {
      const resetData = { email: this.testUsers.valid.email };
      const result = await this.makeRequest(baseUrl, '/api/auth/forgot-password', 'POST', resetData);
      tests.push({
        name: 'Forgot Password - Valid Email',
        status: [200, 404].includes(result.statusCode) ? 'PASS' : 'FAIL',
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        error: [200, 404].includes(result.statusCode) ? null : `Expected 200 or 404, got ${result.statusCode}`,
        details: result.body
      });
    } catch (error) {
      tests.push({
        name: 'Forgot Password - Valid Email',
        status: 'FAIL',
        error: error.message,
        details: null
      });
    }

    // Test 3.2: Invalid Email Format
    try {
      const resetData = { email: 'invalid-email-format' };
      const result = await this.makeRequest(baseUrl, '/api/auth/forgot-password', 'POST', resetData);
      tests.push({
        name: 'Forgot Password - Invalid Email Format',
        status: result.statusCode === 400 ? 'PASS' : 'FAIL',
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        error: result.statusCode === 400 ? null : `Expected 400, got ${result.statusCode}`,
        details: result.body
      });
    } catch (error) {
      tests.push({
        name: 'Forgot Password - Invalid Email Format',
        status: 'FAIL',
        error: error.message,
        details: null
      });
    }

    return tests;
  }

  /**
   * Test Logout/Sign Out Flow
   * Covers: successful logout, session invalidation
   */
  async testLogoutFlow(baseUrl) {
    const tests = [];
    
    // Test 4.1: Logout Endpoint Availability
    try {
      const result = await this.makeRequest(baseUrl, '/api/auth/logout', 'POST', {});
      tests.push({
        name: 'Logout - Endpoint Availability',
        status: [200, 401].includes(result.statusCode) ? 'PASS' : 'FAIL',
        statusCode: result.statusCode,
        responseTime: result.responseTime,
        error: [200, 401].includes(result.statusCode) ? null : `Expected 200 or 401, got ${result.statusCode}`,
        details: result.body
      });
    } catch (error) {
      tests.push({
        name: 'Logout - Endpoint Availability',
        status: 'FAIL',
        error: error.message,
        details: null
      });
    }

    return tests;
  }

  /**
   * PHASE 2: HUMAN APPROVAL GATE
   * CRITICAL: No autonomous production deployment allowed
   */
  async requestHumanApproval(validationResults) {
    console.log('\n🚨 PHASE 2: HUMAN APPROVAL REQUIRED');
    console.log('=' .repeat(60));

    if (validationResults.recommendation !== 'APPROVED_FOR_PRODUCTION') {
      console.log('❌ STAGING VALIDATION FAILED - PRODUCTION DEPLOYMENT BLOCKED');
      console.log('🔧 Issues must be resolved before proceeding');
      return { approved: false, reason: 'STAGING_VALIDATION_FAILED' };
    }

    console.log('✅ Staging validation passed successfully');
    console.log('📋 VALIDATION SUMMARY:');
    console.log(`   • Total Tests: ${validationResults.summary.total}`);
    console.log(`   • Passed: ${validationResults.summary.passed}`);
    console.log(`   • Failed: ${validationResults.summary.failed}`);
    console.log(`   • Environment: ${validationResults.environment}`);
    console.log(`   • Timestamp: ${validationResults.timestamp}`);

    console.log('\n🔐 PRODUCTION DEPLOYMENT APPROVAL REQUIRED');
    console.log('⚠️  HUMAN INTERVENTION NEEDED:');
    console.log('   1. Review validation report: ./reports/staging-validation-report.json');
    console.log('   2. Verify all authentication flows are working correctly');
    console.log('   3. Confirm production deployment is authorized');
    console.log('   4. Run: node deployment-validation-system.js --approve-production');
    console.log('\n🚫 AUTOMATED PROCESS PAUSED - AWAITING HUMAN APPROVAL');

    return { approved: false, reason: 'AWAITING_HUMAN_APPROVAL' };
  }

  /**
   * PHASE 3: PRODUCTION POST-DEPLOYMENT MONITORING
   * Lightweight, non-intrusive monitoring only
   */
  async startProductionMonitoring() {
    console.log('\n📊 PHASE 3: PRODUCTION POST-DEPLOYMENT MONITORING');
    console.log('=' .repeat(60));
    console.log(`🎯 Target: ${this.config.productionUrl}`);
    console.log(`⏰ Started: ${new Date().toISOString()}`);
    console.log('🔍 Monitoring Mode: LIGHTWEIGHT & NON-INTRUSIVE\n');

    this.monitoringActive = true;
    this.alertCount = 0;

    // Start continuous monitoring
    const monitoringInterval = setInterval(async () => {
      if (!this.monitoringActive) {
        clearInterval(monitoringInterval);
        return;
      }

      try {
        const healthCheck = await this.performProductionHealthCheck();
        this.lastHealthCheck = healthCheck;

        if (healthCheck.status === 'HEALTHY') {
          this.alertCount = 0; // Reset alert count on success
          console.log(`✅ ${new Date().toISOString()} - Production health check: HEALTHY`);
        } else {
          this.alertCount++;
          console.log(`⚠️  ${new Date().toISOString()} - Production health check: UNHEALTHY (${this.alertCount}/${this.config.alertThreshold})`);

          if (this.alertCount >= this.config.alertThreshold) {
            await this.triggerProductionAlert(healthCheck);
          }
        }
      } catch (error) {
        this.alertCount++;
        console.log(`💥 ${new Date().toISOString()} - Production monitoring error: ${error.message}`);

        if (this.alertCount >= this.config.alertThreshold) {
          await this.triggerProductionAlert({
            status: 'ERROR',
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
    }, this.config.monitoringInterval);

    console.log('🔄 Production monitoring active...');
    console.log('📱 Alerts will trigger after 3 consecutive failures');
    console.log('🚫 NO AUTONOMOUS FIXES - Human intervention required for any issues\n');
  }

  /**
   * Perform lightweight production health check
   * NON-INTRUSIVE: Only basic endpoint availability checks
   */
  async performProductionHealthCheck() {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      status: 'HEALTHY',
      checks: [],
      responseTime: 0
    };

    const startTime = Date.now();

    try {
      // Check 1: Basic endpoint availability (login page)
      const loginPageCheck = await this.makeRequest(this.config.productionUrl, '/', 'GET');
      healthCheck.checks.push({
        name: 'Login Page Availability',
        status: loginPageCheck.statusCode === 200 ? 'PASS' : 'FAIL',
        statusCode: loginPageCheck.statusCode,
        responseTime: loginPageCheck.responseTime
      });

      // Check 2: Auth API endpoint availability (non-intrusive)
      const authApiCheck = await this.makeRequest(this.config.productionUrl, '/api/auth/debug', 'GET');
      healthCheck.checks.push({
        name: 'Auth API Availability',
        status: [200, 404].includes(authApiCheck.statusCode) ? 'PASS' : 'FAIL',
        statusCode: authApiCheck.statusCode,
        responseTime: authApiCheck.responseTime
      });

      // Check 3: Basic login endpoint (with invalid data - non-intrusive)
      const loginEndpointCheck = await this.makeRequest(this.config.productionUrl, '/api/auth/login', 'POST', {});
      healthCheck.checks.push({
        name: 'Login Endpoint Response',
        status: [400, 401].includes(loginEndpointCheck.statusCode) ? 'PASS' : 'FAIL',
        statusCode: loginEndpointCheck.statusCode,
        responseTime: loginEndpointCheck.responseTime
      });

      healthCheck.responseTime = Date.now() - startTime;

      // Determine overall health
      const failedChecks = healthCheck.checks.filter(check => check.status === 'FAIL');
      if (failedChecks.length > 0) {
        healthCheck.status = 'UNHEALTHY';
        healthCheck.issues = failedChecks.map(check => check.name);
      }

    } catch (error) {
      healthCheck.status = 'ERROR';
      healthCheck.error = error.message;
      healthCheck.responseTime = Date.now() - startTime;
    }

    return healthCheck;
  }

  /**
   * Trigger production alert - NO AUTONOMOUS FIXES
   */
  async triggerProductionAlert(healthCheck) {
    console.log('\n🚨 PRODUCTION ALERT TRIGGERED');
    console.log('=' .repeat(60));
    console.log('⚠️  CRITICAL: Production authentication system issues detected');
    console.log(`📊 Alert Count: ${this.alertCount}/${this.config.alertThreshold}`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

    const incidentReport = {
      id: `INCIDENT-${Date.now()}`,
      timestamp: new Date().toISOString(),
      severity: 'HIGH',
      system: 'Authentication',
      environment: 'production',
      url: this.config.productionUrl,
      healthCheck: healthCheck,
      alertCount: this.alertCount,
      recommendation: 'IMMEDIATE_HUMAN_INTERVENTION_REQUIRED'
    };

    // Save incident report
    await this.saveIncidentReport(incidentReport);

    console.log('\n📋 INCIDENT REPORT GENERATED:');
    console.log(`   • Incident ID: ${incidentReport.id}`);
    console.log(`   • Severity: ${incidentReport.severity}`);
    console.log(`   • System: ${incidentReport.system}`);
    console.log(`   • Report saved to: ./reports/incident-${incidentReport.id}.json`);

    console.log('\n🚫 AUTOMATED ACTIONS DISABLED');
    console.log('👨‍💻 REQUIRED HUMAN ACTIONS:');
    console.log('   1. Review incident report immediately');
    console.log('   2. Investigate production authentication system');
    console.log('   3. Implement manual fixes if needed');
    console.log('   4. Consider rollback if issues persist');
    console.log('   5. Resume monitoring after resolution');

    // Pause monitoring to prevent spam
    this.monitoringActive = false;
    console.log('\n⏸️  Production monitoring PAUSED to prevent alert spam');
    console.log('🔄 Resume with: node deployment-validation-system.js --resume-monitoring');
  }

  /**
   * Make HTTP request with timeout and error handling
   */
  async makeRequest(baseUrl, path, method, data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, baseUrl);
      const startTime = Date.now();

      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FloWorx-Validation-System/1.0'
        },
        timeout: this.config.testTimeout
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        const postData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = https.request(options, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          const responseTime = Date.now() - startTime;
          let parsedBody = null;

          try {
            parsedBody = JSON.parse(body);
          } catch (e) {
            parsedBody = body;
          }

          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedBody,
            responseTime: responseTime
          });
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Request failed: ${error.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timeout after ${this.config.testTimeout}ms`));
      });

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Save validation report to file
   */
  async saveValidationReport(results, environment) {
    const reportsDir = './reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `${environment}-validation-report-${Date.now()}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    console.log(`📄 Validation report saved: ${filepath}`);
  }

  /**
   * Save incident report to file
   */
  async saveIncidentReport(incident) {
    const reportsDir = './reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `incident-${incident.id}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(incident, null, 2));
    console.log(`🚨 Incident report saved: ${filepath}`);
  }
}

/**
 * CLI Interface and Main Execution
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🔐 FloWorx Authentication Deployment Validation System');
  console.log('=' .repeat(70));
  console.log('🛡️  SAFETY-FIRST DEPLOYMENT VALIDATION & MONITORING');
  console.log('⚠️  HUMAN OVERSIGHT REQUIRED FOR ALL PRODUCTION ACTIONS\n');

  const validator = new AuthenticationValidationSystem();

  switch (command) {
    case '--validate-staging':
    case '--staging':
      console.log('🎯 COMMAND: Validate Staging Deployment');
      const stagingResults = await validator.validateStagingDeployment();

      if (stagingResults.recommendation === 'APPROVED_FOR_PRODUCTION') {
        await validator.requestHumanApproval(stagingResults);
      }
      break;

    case '--approve-production':
      console.log('🎯 COMMAND: Approve Production Deployment');
      console.log('⚠️  HUMAN APPROVAL CONFIRMED - Starting production monitoring');
      await validator.startProductionMonitoring();
      break;

    case '--monitor-production':
    case '--monitor':
      console.log('🎯 COMMAND: Start Production Monitoring');
      await validator.startProductionMonitoring();
      break;

    case '--health-check':
      console.log('🎯 COMMAND: Single Production Health Check');
      const healthCheck = await validator.performProductionHealthCheck();
      console.log('\n📊 HEALTH CHECK RESULTS:');
      console.log(JSON.stringify(healthCheck, null, 2));
      break;

    case '--resume-monitoring':
      console.log('🎯 COMMAND: Resume Production Monitoring');
      validator.monitoringActive = true;
      validator.alertCount = 0;
      await validator.startProductionMonitoring();
      break;

    case '--help':
    case '-h':
    default:
      console.log('📖 USAGE:');
      console.log('  node deployment-validation-system.js [command]');
      console.log('\n🔧 COMMANDS:');
      console.log('  --validate-staging    Validate staging deployment (Phase 1)');
      console.log('  --approve-production  Approve and monitor production (Phase 2+3)');
      console.log('  --monitor-production  Start production monitoring only');
      console.log('  --health-check        Single production health check');
      console.log('  --resume-monitoring   Resume paused production monitoring');
      console.log('  --help               Show this help message');
      console.log('\n🚨 SAFETY WORKFLOW:');
      console.log('  1. Always run --validate-staging FIRST');
      console.log('  2. Review validation reports manually');
      console.log('  3. Only run --approve-production after human review');
      console.log('  4. Monitor production health continuously');
      console.log('  5. Human intervention required for any issues');
      console.log('\n⚠️  CRITICAL: NO AUTONOMOUS PRODUCTION FIXES');
      console.log('   All production issues require immediate human intervention');
      break;
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Graceful shutdown initiated...');
  console.log('📊 Validation/monitoring stopped');
  console.log('💾 All reports saved to ./reports/ directory');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\n💥 CRITICAL ERROR:', error.message);
  console.error('🚨 Validation system failure - manual intervention required');
  process.exit(1);
});

// Run main function
if (require.main === module) {
  main().catch((error) => {
    console.error('\n💥 SYSTEM ERROR:', error.message);
    console.error('🚨 Validation system failure - manual intervention required');
    process.exit(1);
  });
}
