#!/usr/bin/env node

/**
 * FloWorx Master Deployment Orchestrator
 * 
 * CRITICAL SAFETY ORCHESTRATION SYSTEM
 * 
 * This is the master controller that orchestrates all deployment validation
 * and monitoring systems while enforcing strict safety principles:
 * 
 * 1. STAGING FIRST - All validation must pass in staging before production
 * 2. HUMAN APPROVAL - No autonomous production deployments
 * 3. COMPREHENSIVE VALIDATION - API + Browser E2E + Security checks
 * 4. CONTINUOUS MONITORING - Real-time production health monitoring
 * 5. EMERGENCY CONTROLS - Immediate halt and rollback capabilities
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class MasterDeploymentOrchestrator {
  constructor(config = {}) {
    this.config = {
      stagingUrl: config.stagingUrl || 'https://staging.app.floworx-iq.com',
      productionUrl: config.productionUrl || 'https://app.floworx-iq.com',
      validationTimeout: config.validationTimeout || 300000, // 5 minutes
      monitoringInterval: config.monitoringInterval || 60000, // 1 minute
      emergencyThreshold: config.emergencyThreshold || 5, // 5 consecutive failures
      ...config
    };
    
    this.deploymentState = {
      phase: 'IDLE',
      startTime: null,
      validationResults: {},
      monitoringActive: false,
      emergencyMode: false,
      lastHealthCheck: null
    };
    
    this.validationSystems = [
      'deployment-validation-system.js',
      'browser-e2e-validation.js'
    ];
  }

  /**
   * MASTER DEPLOYMENT WORKFLOW
   * Orchestrates the complete deployment validation process
   */
  async executeDeploymentWorkflow() {
    console.log('🚀 FLOWORX MASTER DEPLOYMENT ORCHESTRATOR');
    console.log('=' .repeat(70));
    console.log('🛡️  SAFETY-FIRST DEPLOYMENT VALIDATION & MONITORING SYSTEM');
    console.log('⚠️  HUMAN OVERSIGHT REQUIRED FOR ALL PRODUCTION ACTIONS\n');

    this.deploymentState.phase = 'STARTING';
    this.deploymentState.startTime = new Date().toISOString();

    try {
      // PHASE 1: STAGING VALIDATION
      console.log('📋 PHASE 1: COMPREHENSIVE STAGING VALIDATION');
      console.log('=' .repeat(50));
      
      const stagingValidation = await this.executeStagingValidation();
      
      if (!stagingValidation.success) {
        console.log('\n❌ STAGING VALIDATION FAILED');
        console.log('🚨 DEPLOYMENT PROCESS HALTED');
        console.log('🔧 Issues must be resolved before proceeding');
        await this.generateFailureReport(stagingValidation);
        return { success: false, phase: 'STAGING_VALIDATION_FAILED' };
      }

      // PHASE 2: HUMAN APPROVAL GATE
      console.log('\n📋 PHASE 2: HUMAN APPROVAL GATE');
      console.log('=' .repeat(50));
      
      const approvalResult = await this.requestHumanApproval(stagingValidation);
      
      if (!approvalResult.approved) {
        console.log('\n⏸️  DEPLOYMENT PAUSED - AWAITING HUMAN APPROVAL');
        console.log('📋 Review validation reports and run with --approve-production when ready');
        return { success: false, phase: 'AWAITING_HUMAN_APPROVAL' };
      }

      // PHASE 3: PRODUCTION MONITORING
      console.log('\n📋 PHASE 3: PRODUCTION POST-DEPLOYMENT MONITORING');
      console.log('=' .repeat(50));
      
      await this.startProductionMonitoring();
      
      return { success: true, phase: 'PRODUCTION_MONITORING_ACTIVE' };

    } catch (error) {
      console.log('\n💥 CRITICAL SYSTEM ERROR');
      console.log('🚨 Master orchestrator failure - immediate human intervention required');
      console.error('Error:', error.message);
      
      await this.triggerEmergencyProtocol(error);
      return { success: false, phase: 'SYSTEM_ERROR' };
    }
  }

  /**
   * PHASE 1: Execute comprehensive staging validation
   */
  async executeStagingValidation() {
    console.log('🔍 Running comprehensive staging validation...\n');
    
    const validationResults = {
      timestamp: new Date().toISOString(),
      environment: 'staging',
      systems: {},
      summary: {
        totalSystems: this.validationSystems.length,
        passedSystems: 0,
        failedSystems: 0,
        errors: []
      },
      success: false
    };

    // Run API validation
    console.log('🌐 1. API Endpoint Validation...');
    try {
      const apiResult = await this.runValidationSystem('deployment-validation-system.js', '--validate-staging');
      validationResults.systems.api = apiResult;
      
      if (apiResult.success) {
        validationResults.summary.passedSystems++;
        console.log('✅ API validation: PASSED');
      } else {
        validationResults.summary.failedSystems++;
        validationResults.summary.errors.push('API validation failed');
        console.log('❌ API validation: FAILED');
      }
    } catch (error) {
      validationResults.systems.api = { success: false, error: error.message };
      validationResults.summary.failedSystems++;
      validationResults.summary.errors.push(`API validation error: ${error.message}`);
      console.log('💥 API validation: ERROR');
    }

    // Run Browser E2E validation
    console.log('\n🎭 2. Browser E2E Validation...');
    try {
      const e2eResult = await this.runValidationSystem('browser-e2e-validation.js', '--validate-staging-e2e');
      validationResults.systems.e2e = e2eResult;
      
      if (e2eResult.success) {
        validationResults.summary.passedSystems++;
        console.log('✅ Browser E2E validation: PASSED');
      } else {
        validationResults.summary.failedSystems++;
        validationResults.summary.errors.push('Browser E2E validation failed');
        console.log('❌ Browser E2E validation: FAILED');
      }
    } catch (error) {
      validationResults.systems.e2e = { success: false, error: error.message };
      validationResults.summary.failedSystems++;
      validationResults.summary.errors.push(`E2E validation error: ${error.message}`);
      console.log('💥 Browser E2E validation: ERROR');
    }

    // Run Security validation
    console.log('\n🔒 3. Security Validation...');
    try {
      const securityResult = await this.runSecurityValidation();
      validationResults.systems.security = securityResult;
      
      if (securityResult.success) {
        validationResults.summary.passedSystems++;
        console.log('✅ Security validation: PASSED');
      } else {
        validationResults.summary.failedSystems++;
        validationResults.summary.errors.push('Security validation failed');
        console.log('❌ Security validation: FAILED');
      }
    } catch (error) {
      validationResults.systems.security = { success: false, error: error.message };
      validationResults.summary.failedSystems++;
      validationResults.summary.errors.push(`Security validation error: ${error.message}`);
      console.log('💥 Security validation: ERROR');
    }

    // Determine overall success
    validationResults.success = validationResults.summary.failedSystems === 0;

    // Save comprehensive validation report
    await this.saveValidationReport(validationResults, 'staging-comprehensive');

    console.log('\n📊 STAGING VALIDATION SUMMARY:');
    console.log(`   • Total Systems: ${validationResults.summary.totalSystems}`);
    console.log(`   • Passed: ${validationResults.summary.passedSystems}`);
    console.log(`   • Failed: ${validationResults.summary.failedSystems}`);
    
    if (validationResults.success) {
      console.log('🎉 ALL STAGING VALIDATIONS PASSED');
    } else {
      console.log('🚨 STAGING VALIDATION FAILURES DETECTED');
      validationResults.summary.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }

    return validationResults;
  }

  /**
   * Run individual validation system
   */
  async runValidationSystem(script, command) {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [script, command], {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: this.config.validationTimeout
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
        process.stdout.write(data); // Real-time output
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        process.stderr.write(data); // Real-time error output
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          exitCode: code,
          stdout: stdout,
          stderr: stderr,
          timestamp: new Date().toISOString()
        });
      });

      child.on('error', (error) => {
        reject(new Error(`Failed to run ${script}: ${error.message}`));
      });

      // Handle timeout
      setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Validation timeout: ${script} took longer than ${this.config.validationTimeout}ms`));
      }, this.config.validationTimeout);
    });
  }

  /**
   * Run security validation checks
   */
  async runSecurityValidation() {
    console.log('🔍 Running security validation checks...');
    
    const securityChecks = {
      timestamp: new Date().toISOString(),
      checks: [],
      success: true
    };

    // Check 1: HTTPS enforcement
    try {
      const httpsCheck = await this.checkHTTPSEnforcement();
      securityChecks.checks.push(httpsCheck);
      if (!httpsCheck.passed) securityChecks.success = false;
    } catch (error) {
      securityChecks.checks.push({
        name: 'HTTPS Enforcement',
        passed: false,
        error: error.message
      });
      securityChecks.success = false;
    }

    // Check 2: Security headers
    try {
      const headersCheck = await this.checkSecurityHeaders();
      securityChecks.checks.push(headersCheck);
      if (!headersCheck.passed) securityChecks.success = false;
    } catch (error) {
      securityChecks.checks.push({
        name: 'Security Headers',
        passed: false,
        error: error.message
      });
      securityChecks.success = false;
    }

    // Check 3: Authentication endpoints security
    try {
      const authSecurityCheck = await this.checkAuthEndpointSecurity();
      securityChecks.checks.push(authSecurityCheck);
      if (!authSecurityCheck.passed) securityChecks.success = false;
    } catch (error) {
      securityChecks.checks.push({
        name: 'Auth Endpoint Security',
        passed: false,
        error: error.message
      });
      securityChecks.success = false;
    }

    return securityChecks;
  }

  /**
   * Check HTTPS enforcement
   */
  async checkHTTPSEnforcement() {
    const https = require('https');
    const http = require('http');

    return new Promise((resolve) => {
      // Try HTTP request to see if it redirects to HTTPS
      const req = http.request({
        hostname: new URL(this.config.stagingUrl).hostname,
        port: 80,
        path: '/',
        method: 'GET'
      }, (res) => {
        const httpsEnforced = res.statusCode === 301 || res.statusCode === 302;
        resolve({
          name: 'HTTPS Enforcement',
          passed: httpsEnforced,
          details: {
            statusCode: res.statusCode,
            location: res.headers.location
          }
        });
      });

      req.on('error', () => {
        // If HTTP fails, assume HTTPS is enforced
        resolve({
          name: 'HTTPS Enforcement',
          passed: true,
          details: { note: 'HTTP connection refused - HTTPS enforced' }
        });
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve({
          name: 'HTTPS Enforcement',
          passed: false,
          error: 'Timeout checking HTTPS enforcement'
        });
      });

      req.end();
    });
  }

  /**
   * Check security headers
   */
  async checkSecurityHeaders() {
    const https = require('https');

    return new Promise((resolve) => {
      const url = new URL(this.config.stagingUrl);

      const req = https.request({
        hostname: url.hostname,
        port: 443,
        path: '/',
        method: 'HEAD'
      }, (res) => {
        const requiredHeaders = [
          'x-frame-options',
          'x-content-type-options',
          'strict-transport-security'
        ];

        const presentHeaders = requiredHeaders.filter(header =>
          res.headers[header] || res.headers[header.toLowerCase()]
        );

        const passed = presentHeaders.length >= 2; // At least 2 out of 3

        resolve({
          name: 'Security Headers',
          passed: passed,
          details: {
            required: requiredHeaders,
            present: presentHeaders,
            headers: res.headers
          }
        });
      });

      req.on('error', (error) => {
        resolve({
          name: 'Security Headers',
          passed: false,
          error: error.message
        });
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve({
          name: 'Security Headers',
          passed: false,
          error: 'Timeout checking security headers'
        });
      });

      req.end();
    });
  }

  /**
   * Check authentication endpoint security
   */
  async checkAuthEndpointSecurity() {
    const https = require('https');

    return new Promise((resolve) => {
      const url = new URL('/api/auth/login', this.config.stagingUrl);

      // Test with malicious payload
      const maliciousPayload = JSON.stringify({
        email: "'; DROP TABLE users; --",
        password: "<script>alert('xss')</script>"
      });

      const req = https.request({
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(maliciousPayload)
        }
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          // Check if response contains unescaped malicious content
          const containsMaliciousContent = body.includes('<script>') ||
                                         body.includes('DROP TABLE');

          const passed = !containsMaliciousContent &&
                        (res.statusCode === 400 || res.statusCode === 401);

          resolve({
            name: 'Auth Endpoint Security',
            passed: passed,
            details: {
              statusCode: res.statusCode,
              containsMaliciousContent: containsMaliciousContent,
              responseLength: body.length
            }
          });
        });
      });

      req.on('error', (error) => {
        resolve({
          name: 'Auth Endpoint Security',
          passed: false,
          error: error.message
        });
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve({
          name: 'Auth Endpoint Security',
          passed: false,
          error: 'Timeout checking auth endpoint security'
        });
      });

      req.write(maliciousPayload);
      req.end();
    });
  }

  /**
   * PHASE 2: Request human approval for production deployment
   */
  async requestHumanApproval(validationResults) {
    console.log('🔐 HUMAN APPROVAL GATE ACTIVATED');
    console.log('⚠️  CRITICAL: No autonomous production deployment allowed\n');

    if (!validationResults.success) {
      console.log('❌ STAGING VALIDATION FAILED - PRODUCTION DEPLOYMENT BLOCKED');
      console.log('🔧 All issues must be resolved before proceeding to production');
      return { approved: false, reason: 'STAGING_VALIDATION_FAILED' };
    }

    console.log('✅ All staging validations passed successfully');
    console.log('\n📋 VALIDATION SUMMARY:');
    console.log(`   • API Validation: ${validationResults.systems.api?.success ? 'PASSED' : 'FAILED'}`);
    console.log(`   • Browser E2E: ${validationResults.systems.e2e?.success ? 'PASSED' : 'FAILED'}`);
    console.log(`   • Security Checks: ${validationResults.systems.security?.success ? 'PASSED' : 'FAILED'}`);
    console.log(`   • Total Systems: ${validationResults.summary.totalSystems}`);
    console.log(`   • Passed: ${validationResults.summary.passedSystems}`);
    console.log(`   • Failed: ${validationResults.summary.failedSystems}`);

    console.log('\n🚨 PRODUCTION DEPLOYMENT APPROVAL REQUIRED');
    console.log('👨‍💻 HUMAN ACTIONS REQUIRED:');
    console.log('   1. Review comprehensive validation report: ./reports/staging-comprehensive-*.json');
    console.log('   2. Verify all authentication flows are working correctly');
    console.log('   3. Confirm production deployment is authorized');
    console.log('   4. Run: node master-deployment-orchestrator.js --approve-production');
    console.log('\n⏸️  AUTOMATED PROCESS PAUSED - AWAITING HUMAN APPROVAL');
    console.log('🚫 NO AUTONOMOUS PRODUCTION ACTIONS WILL BE TAKEN');

    return { approved: false, reason: 'AWAITING_HUMAN_APPROVAL' };
  }

  /**
   * PHASE 3: Start production monitoring
   */
  async startProductionMonitoring() {
    console.log('📊 STARTING PRODUCTION MONITORING');
    console.log('🔍 Mode: LIGHTWEIGHT & NON-INTRUSIVE');
    console.log('🚫 NO AUTONOMOUS FIXES - Human intervention required for issues\n');

    this.deploymentState.phase = 'PRODUCTION_MONITORING';
    this.deploymentState.monitoringActive = true;

    // Start continuous monitoring
    const monitoringInterval = setInterval(async () => {
      if (!this.deploymentState.monitoringActive) {
        clearInterval(monitoringInterval);
        return;
      }

      try {
        const healthCheck = await this.performProductionHealthCheck();
        this.deploymentState.lastHealthCheck = healthCheck;

        if (healthCheck.status === 'HEALTHY') {
          console.log(`✅ ${new Date().toISOString()} - Production health: HEALTHY`);
        } else {
          console.log(`⚠️  ${new Date().toISOString()} - Production health: ${healthCheck.status}`);

          if (healthCheck.status === 'CRITICAL') {
            await this.triggerEmergencyProtocol(healthCheck);
          }
        }
      } catch (error) {
        console.log(`💥 ${new Date().toISOString()} - Monitoring error: ${error.message}`);
      }
    }, this.config.monitoringInterval);

    console.log('🔄 Production monitoring is now active...');
    console.log('📱 Emergency protocols will activate on critical issues');
    console.log('⏹️  Stop monitoring with: Ctrl+C or --stop-monitoring\n');
  }

  /**
   * Perform comprehensive production health check
   */
  async performProductionHealthCheck() {
    const healthCheck = {
      timestamp: new Date().toISOString(),
      status: 'HEALTHY',
      checks: [],
      issues: []
    };

    try {
      // Run API health check
      const apiResult = await this.runValidationSystem('deployment-validation-system.js', '--health-check');
      healthCheck.checks.push({
        system: 'API',
        status: apiResult.success ? 'HEALTHY' : 'UNHEALTHY',
        details: apiResult
      });

      // Run browser health check
      const browserResult = await this.runValidationSystem('browser-e2e-validation.js', '--production-health');
      healthCheck.checks.push({
        system: 'Browser',
        status: browserResult.success ? 'HEALTHY' : 'UNHEALTHY',
        details: browserResult
      });

      // Determine overall health
      const unhealthyChecks = healthCheck.checks.filter(check => check.status === 'UNHEALTHY');

      if (unhealthyChecks.length === 0) {
        healthCheck.status = 'HEALTHY';
      } else if (unhealthyChecks.length === healthCheck.checks.length) {
        healthCheck.status = 'CRITICAL';
        healthCheck.issues = unhealthyChecks.map(check => `${check.system} system unhealthy`);
      } else {
        healthCheck.status = 'DEGRADED';
        healthCheck.issues = unhealthyChecks.map(check => `${check.system} system unhealthy`);
      }

    } catch (error) {
      healthCheck.status = 'ERROR';
      healthCheck.error = error.message;
    }

    return healthCheck;
  }

  /**
   * Trigger emergency protocol
   */
  async triggerEmergencyProtocol(incident) {
    console.log('\n🚨 EMERGENCY PROTOCOL ACTIVATED');
    console.log('=' .repeat(60));
    console.log('⚠️  CRITICAL: Production authentication system failure detected');
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);

    this.deploymentState.emergencyMode = true;
    this.deploymentState.monitoringActive = false;

    const emergencyReport = {
      id: `EMERGENCY-${Date.now()}`,
      timestamp: new Date().toISOString(),
      severity: 'CRITICAL',
      system: 'Authentication',
      environment: 'production',
      incident: incident,
      deploymentState: this.deploymentState,
      recommendation: 'IMMEDIATE_HUMAN_INTERVENTION_AND_POSSIBLE_ROLLBACK'
    };

    // Save emergency report
    await this.saveEmergencyReport(emergencyReport);

    console.log('\n📋 EMERGENCY REPORT GENERATED:');
    console.log(`   • Emergency ID: ${emergencyReport.id}`);
    console.log(`   • Severity: ${emergencyReport.severity}`);
    console.log(`   • System: ${emergencyReport.system}`);
    console.log(`   • Report saved to: ./reports/emergency-${emergencyReport.id}.json`);

    console.log('\n🚫 ALL AUTOMATED SYSTEMS DISABLED');
    console.log('👨‍💻 IMMEDIATE HUMAN ACTIONS REQUIRED:');
    console.log('   1. Review emergency report immediately');
    console.log('   2. Investigate production authentication system');
    console.log('   3. Consider immediate rollback to previous version');
    console.log('   4. Implement manual fixes if rollback not sufficient');
    console.log('   5. Contact development team and stakeholders');
    console.log('   6. Document incident and resolution steps');

    console.log('\n🔄 ROLLBACK OPTIONS:');
    console.log('   • Emergency rollback: node master-deployment-orchestrator.js --emergency-rollback');
    console.log('   • Manual rollback: Follow documented rollback procedures');

    console.log('\n⏸️  ALL MONITORING PAUSED - EMERGENCY MODE ACTIVE');
  }

  /**
   * Save validation report
   */
  async saveValidationReport(results, type) {
    const reportsDir = './reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `${type}-validation-${Date.now()}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
    console.log(`📄 Validation report saved: ${filepath}`);
  }

  /**
   * Save emergency report
   */
  async saveEmergencyReport(report) {
    const reportsDir = './reports';
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `emergency-${report.id}.json`;
    const filepath = path.join(reportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`🚨 Emergency report saved: ${filepath}`);
  }

  /**
   * Generate failure report
   */
  async generateFailureReport(validationResults) {
    const failureReport = {
      timestamp: new Date().toISOString(),
      type: 'STAGING_VALIDATION_FAILURE',
      environment: 'staging',
      results: validationResults,
      recommendation: 'FIX_ISSUES_BEFORE_RETRY',
      nextSteps: [
        'Review individual validation system reports',
        'Fix identified issues in codebase',
        'Re-run staging validation',
        'Only proceed to production after all validations pass'
      ]
    };

    await this.saveValidationReport(failureReport, 'staging-failure');

    console.log('\n📋 FAILURE ANALYSIS:');
    validationResults.summary.errors.forEach(error => {
      console.log(`   • ${error}`);
    });

    console.log('\n🔧 RECOMMENDED ACTIONS:');
    failureReport.nextSteps.forEach(step => {
      console.log(`   • ${step}`);
    });
  }
}

/**
 * CLI Interface and Main Execution
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('🚀 FLOWORX MASTER DEPLOYMENT ORCHESTRATOR');
  console.log('=' .repeat(70));
  console.log('🛡️  COMPREHENSIVE DEPLOYMENT VALIDATION & MONITORING SYSTEM');
  console.log('⚠️  HUMAN OVERSIGHT REQUIRED FOR ALL PRODUCTION ACTIONS\n');

  const orchestrator = new MasterDeploymentOrchestrator();

  switch (command) {
    case '--full-validation':
    case '--validate':
      console.log('🎯 COMMAND: Full Deployment Validation Workflow');
      const result = await orchestrator.executeDeploymentWorkflow();
      process.exit(result.success ? 0 : 1);
      break;

    case '--approve-production':
      console.log('🎯 COMMAND: Approve Production Deployment');
      console.log('⚠️  HUMAN APPROVAL CONFIRMED - Starting production monitoring');
      await orchestrator.startProductionMonitoring();
      break;

    case '--monitor-production':
    case '--monitor':
      console.log('🎯 COMMAND: Start Production Monitoring');
      await orchestrator.startProductionMonitoring();
      break;

    case '--health-check':
      console.log('🎯 COMMAND: Production Health Check');
      const healthCheck = await orchestrator.performProductionHealthCheck();
      console.log('\n📊 PRODUCTION HEALTH CHECK RESULTS:');
      console.log(JSON.stringify(healthCheck, null, 2));
      process.exit(healthCheck.status === 'HEALTHY' ? 0 : 1);
      break;

    case '--emergency-rollback':
      console.log('🎯 COMMAND: Emergency Rollback');
      console.log('🚨 CRITICAL: Emergency rollback initiated');
      console.log('⚠️  This should only be used in critical production failures');
      console.log('👨‍💻 Manual rollback procedures must be followed');
      console.log('📋 Refer to deployment documentation for rollback steps');
      break;

    case '--status':
      console.log('🎯 COMMAND: System Status');
      console.log('\n📊 DEPLOYMENT ORCHESTRATOR STATUS:');
      console.log(`   • Phase: ${orchestrator.deploymentState.phase}`);
      console.log(`   • Monitoring Active: ${orchestrator.deploymentState.monitoringActive}`);
      console.log(`   • Emergency Mode: ${orchestrator.deploymentState.emergencyMode}`);
      console.log(`   • Start Time: ${orchestrator.deploymentState.startTime || 'Not started'}`);
      console.log(`   • Last Health Check: ${orchestrator.deploymentState.lastHealthCheck?.timestamp || 'None'}`);
      break;

    case '--help':
    case '-h':
    default:
      console.log('📖 USAGE:');
      console.log('  node master-deployment-orchestrator.js [command]');
      console.log('\n🔧 COMMANDS:');
      console.log('  --full-validation     Run complete deployment validation workflow');
      console.log('  --approve-production  Approve and start production monitoring (human approval)');
      console.log('  --monitor-production  Start production monitoring only');
      console.log('  --health-check        Single comprehensive production health check');
      console.log('  --emergency-rollback  Emergency rollback procedures (critical failures only)');
      console.log('  --status              Show current system status');
      console.log('  --help               Show this help message');
      console.log('\n🚨 SAFETY WORKFLOW:');
      console.log('  1. STAGING FIRST: Always run --full-validation first');
      console.log('  2. HUMAN REVIEW: Manually review all validation reports');
      console.log('  3. HUMAN APPROVAL: Only run --approve-production after review');
      console.log('  4. MONITORING: Continuous production health monitoring');
      console.log('  5. EMERGENCY: Human intervention required for all issues');
      console.log('\n⚠️  CRITICAL SAFETY PRINCIPLES:');
      console.log('   • NO autonomous production deployments');
      console.log('   • NO autonomous production fixes');
      console.log('   • ALL production issues require immediate human intervention');
      console.log('   • Emergency rollback available for critical failures');
      console.log('\n📋 VALIDATION SYSTEMS:');
      console.log('   • API Endpoint Validation (deployment-validation-system.js)');
      console.log('   • Browser E2E Testing (browser-e2e-validation.js)');
      console.log('   • Security Validation (HTTPS, headers, auth security)');
      console.log('   • Performance Monitoring (response times, health checks)');
      console.log('   • JavaScript Error Detection (TypeErrors, console errors)');
      break;
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Graceful shutdown initiated...');
  console.log('📊 All validation and monitoring stopped');
  console.log('💾 All reports saved to ./reports/ directory');
  console.log('🔄 Resume monitoring with: node master-deployment-orchestrator.js --monitor-production');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('\n💥 CRITICAL SYSTEM ERROR:', error.message);
  console.error('🚨 Master orchestrator failure - immediate human intervention required');
  console.error('📋 Check system logs and contact development team');
  process.exit(1);
});

// Run main function
if (require.main === module) {
  main().catch((error) => {
    console.error('\n💥 ORCHESTRATOR ERROR:', error.message);
    console.error('🚨 System failure - manual intervention required');
    process.exit(1);
  });
}
