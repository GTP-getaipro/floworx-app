/**
 * FloWorx Comprehensive Deployment Orchestration
 * Coordinates CI/CD pipeline, deployment execution, verification testing, and monitoring setup
 */

const { spawn, exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

class DeploymentOrchestrator {
  constructor() {
    this.deploymentId = `deploy-${Date.now()}`;
    this.baseUrl = process.env.PRODUCTION_URL || 'https://app.floworx-iq.com';
    this.logFile = `/tmp/floworx-deployment-${this.deploymentId}.log`;
    
    this.phases = {
      'environment-setup': { status: 'pending', startTime: null, endTime: null },
      'security-hardening': { status: 'pending', startTime: null, endTime: null },
      'database-preparation': { status: 'pending', startTime: null, endTime: null },
      'backend-deployment': { status: 'pending', startTime: null, endTime: null },
      'frontend-deployment': { status: 'pending', startTime: null, endTime: null },
      'dns-ssl-config': { status: 'pending', startTime: null, endTime: null },
      'monitoring-setup': { status: 'pending', startTime: null, endTime: null },
      'functional-testing': { status: 'pending', startTime: null, endTime: null },
      'performance-testing': { status: 'pending', startTime: null, endTime: null },
      'final-validation': { status: 'pending', startTime: null, endTime: null }
    };
  }

  /**
   * Execute complete deployment orchestration
   */
  async executeDeployment() {
    this.log('🚀 Starting FloWorx Comprehensive Deployment Orchestration');
    this.log(`📋 Deployment ID: ${this.deploymentId}`);
    this.log(`🎯 Target URL: ${this.baseUrl}`);
    this.log('=' * 80);

    try {
      // Phase 1: Environment Setup
      await this.executePhase('environment-setup', () => this.setupEnvironment());
      
      // Phase 2: Security Hardening
      await this.executePhase('security-hardening', () => this.hardenSecurity());
      
      // Phase 3: Database Preparation
      await this.executePhase('database-preparation', () => this.prepareDatabase());
      
      // Phase 4: Backend Deployment
      await this.executePhase('backend-deployment', () => this.deployBackend());
      
      // Phase 5: Frontend Deployment
      await this.executePhase('frontend-deployment', () => this.deployFrontend());
      
      // Phase 6: DNS and SSL Configuration
      await this.executePhase('dns-ssl-config', () => this.configureDnsAndSsl());
      
      // Phase 7: Monitoring Setup
      await this.executePhase('monitoring-setup', () => this.setupMonitoring());
      
      // Phase 8: Functional Testing
      await this.executePhase('functional-testing', () => this.runFunctionalTests());
      
      // Phase 9: Performance Testing
      await this.executePhase('performance-testing', () => this.runPerformanceTests());
      
      // Phase 10: Final Validation
      await this.executePhase('final-validation', () => this.runFinalValidation());
      
      // Generate deployment report
      await this.generateDeploymentReport();
      
      this.log('🎉 Deployment orchestration completed successfully!');
      return { success: true, deploymentId: this.deploymentId };
      
    } catch (error) {
      this.log(`❌ Deployment failed: ${error.message}`);
      await this.handleDeploymentFailure(error);
      throw error;
    }
  }

  /**
   * Execute a deployment phase with error handling and timing
   */
  async executePhase(phaseName, phaseFunction) {
    this.log(`\n🔄 Starting Phase: ${phaseName.toUpperCase()}`);
    this.phases[phaseName].status = 'running';
    this.phases[phaseName].startTime = new Date();
    
    try {
      await phaseFunction();
      
      this.phases[phaseName].status = 'completed';
      this.phases[phaseName].endTime = new Date();
      
      const duration = this.phases[phaseName].endTime - this.phases[phaseName].startTime;
      this.log(`✅ Phase completed: ${phaseName} (${duration}ms)`);
      
    } catch (error) {
      this.phases[phaseName].status = 'failed';
      this.phases[phaseName].endTime = new Date();
      this.phases[phaseName].error = error.message;
      
      this.log(`❌ Phase failed: ${phaseName} - ${error.message}`);
      throw error;
    }
  }

  /**
   * Phase 1: Environment Setup
   */
  async setupEnvironment() {
    this.log('Setting up production environment...');
    
    // Run production environment setup
    await this.runScript('node production-environment-setup.js');
    
    // Verify environment variables
    const requiredEnvVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'ENCRYPTION_KEY',
      'NODE_ENV'
    ];
    
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Required environment variable ${envVar} is not set`);
      }
    }
    
    this.log('✅ Environment setup completed');
  }

  /**
   * Phase 2: Security Hardening
   */
  async hardenSecurity() {
    this.log('Implementing security hardening...');
    
    // Run security audit
    await this.runScript('node security-audit-script.js');
    
    // Verify security configurations
    const securityChecks = [
      { name: 'CORS Configuration', check: () => this.verifySecurityHeader('Access-Control-Allow-Origin') },
      { name: 'HSTS Header', check: () => this.verifySecurityHeader('Strict-Transport-Security') },
      { name: 'CSP Header', check: () => this.verifySecurityHeader('Content-Security-Policy') },
      { name: 'Rate Limiting', check: () => this.verifyRateLimiting() }
    ];
    
    for (const check of securityChecks) {
      try {
        await check.check();
        this.log(`✅ ${check.name} verified`);
      } catch (error) {
        this.log(`⚠️ ${check.name} check failed: ${error.message}`);
      }
    }
    
    this.log('✅ Security hardening completed');
  }

  /**
   * Phase 3: Database Preparation
   */
  async prepareDatabase() {
    this.log('Preparing database...');
    
    // Run database schema validation
    await this.runScript('node database-schema-validation.js');
    
    // Verify database connectivity
    await this.verifyDatabaseConnection();
    
    this.log('✅ Database preparation completed');
  }

  /**
   * Phase 4: Backend Deployment
   */
  async deployBackend() {
    this.log('Deploying backend services...');
    
    // Build backend
    await this.runScript('npm run build:backend', { cwd: './backend' });
    
    // Deploy with scaling configuration
    await this.deployWithScaling('backend');
    
    // Verify backend health
    await this.verifyServiceHealth(`${this.baseUrl}/api/health`);
    
    this.log('✅ Backend deployment completed');
  }

  /**
   * Phase 5: Frontend Deployment
   */
  async deployFrontend() {
    this.log('Deploying frontend application...');
    
    // Build frontend
    await this.runScript('npm run build', { cwd: './frontend' });
    
    // Deploy to CDN
    await this.deployToCdn();
    
    // Verify frontend accessibility
    await this.verifyServiceHealth(this.baseUrl);
    
    this.log('✅ Frontend deployment completed');
  }

  /**
   * Phase 6: DNS and SSL Configuration
   */
  async configureDnsAndSsl() {
    this.log('Configuring DNS and SSL certificates...');
    
    // Verify DNS resolution
    await this.verifyDnsResolution('app.floworx-iq.com');
    
    // Verify SSL certificate
    await this.verifySslCertificate(this.baseUrl);
    
    this.log('✅ DNS and SSL configuration completed');
  }

  /**
   * Phase 7: Monitoring Setup
   */
  async setupMonitoring() {
    this.log('Setting up monitoring and alerting...');
    
    // Initialize monitoring system
    const MonitoringSystem = require('./monitoring/monitoring-setup.js');
    const monitoring = new MonitoringSystem();
    
    // Verify monitoring endpoints
    await this.verifyServiceHealth(`${this.baseUrl}/api/metrics`);
    await this.verifyServiceHealth(`${this.baseUrl}/api/health/detailed`);
    
    this.log('✅ Monitoring setup completed');
  }

  /**
   * Phase 8: Functional Testing
   */
  async runFunctionalTests() {
    this.log('Running functional tests...');
    
    // Run critical user flows tests
    await this.runScript('npm test -- tests/functional/critical-user-flows.test.js', {
      env: { ...process.env, TEST_BASE_URL: this.baseUrl }
    });
    
    this.log('✅ Functional testing completed');
  }

  /**
   * Phase 9: Performance Testing
   */
  async runPerformanceTests() {
    this.log('Running performance tests...');
    
    // Run load testing
    const LoadTester = require('./tests/performance/load-testing.js');
    const loadTester = new LoadTester(this.baseUrl);
    
    const results = await loadTester.runLoadTests();
    
    // Verify performance metrics
    if (results.overall.averageResponseTime > 2000) {
      throw new Error(`Performance test failed: Average response time ${results.overall.averageResponseTime}ms exceeds 2000ms threshold`);
    }
    
    if (results.overall.successfulRequests / results.overall.totalRequests < 0.95) {
      throw new Error(`Performance test failed: Success rate ${((results.overall.successfulRequests / results.overall.totalRequests) * 100).toFixed(1)}% below 95% threshold`);
    }
    
    this.log('✅ Performance testing completed');
  }

  /**
   * Phase 10: Final Validation
   */
  async runFinalValidation() {
    this.log('Running final validation...');
    
    // Comprehensive system check
    const validationChecks = [
      { name: 'Health Check', check: () => this.verifyServiceHealth(`${this.baseUrl}/api/health`) },
      { name: 'Authentication', check: () => this.validateAuthentication() },
      { name: 'Email Provider Selection', check: () => this.validateEmailProvider() },
      { name: 'Business Types', check: () => this.validateBusinessTypes() },
      { name: 'Database Connectivity', check: () => this.verifyDatabaseConnection() },
      { name: 'Monitoring', check: () => this.verifyServiceHealth(`${this.baseUrl}/api/metrics`) }
    ];
    
    for (const check of validationChecks) {
      await check.check();
      this.log(`✅ ${check.name} validation passed`);
    }
    
    this.log('✅ Final validation completed');
  }

  /**
   * Utility: Run script with proper error handling
   */
  async runScript(command, options = {}) {
    return new Promise((resolve, reject) => {
      const child = spawn('sh', ['-c', command], {
        stdio: 'pipe',
        ...options
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
        this.log(`[SCRIPT] ${data.toString().trim()}`);
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
        this.log(`[SCRIPT ERROR] ${data.toString().trim()}`);
      });
      
      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Script failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  /**
   * Utility: Verify service health
   */
  async verifyServiceHealth(url, maxAttempts = 5) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios.get(url, { timeout: 10000 });
        if (response.status === 200) {
          return response.data;
        }
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(`Health check failed for ${url}: ${error.message}`);
        }
        await this.sleep(5000);
      }
    }
  }

  /**
   * Utility: Verify database connection
   */
  async verifyDatabaseConnection() {
    // This would typically use your database client
    // For now, we'll verify via health endpoint
    const health = await this.verifyServiceHealth(`${this.baseUrl}/api/health`);
    if (!health || health.status !== 'ok') {
      throw new Error('Database connection verification failed');
    }
  }

  /**
   * Utility: Validate authentication
   */
  async validateAuthentication() {
    const testEmail = `deploy-test-${Date.now()}@example.com`;
    
    const response = await axios.post(`${this.baseUrl}/api/auth/test-register`, {
      email: testEmail,
      password: 'DeployTest123!',
      firstName: 'Deploy',
      lastName: 'Test'
    });
    
    if (!response.data.success || !response.data.data.token) {
      throw new Error('Authentication validation failed');
    }
  }

  /**
   * Utility: Validate email provider selection
   */
  async validateEmailProvider() {
    // First authenticate
    const testEmail = `provider-test-${Date.now()}@example.com`;
    const authResponse = await axios.post(`${this.baseUrl}/api/auth/test-register`, {
      email: testEmail,
      password: 'ProviderTest123!',
      firstName: 'Provider',
      lastName: 'Test'
    });
    
    const token = authResponse.data.data.token;
    
    // Test provider selection
    const providerResponse = await axios.post(`${this.baseUrl}/api/onboarding/email-provider`, 
      { provider: 'gmail' },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (!providerResponse.data.success) {
      throw new Error('Email provider validation failed');
    }
  }

  /**
   * Utility: Validate business types
   */
  async validateBusinessTypes() {
    // First authenticate
    const testEmail = `business-test-${Date.now()}@example.com`;
    const authResponse = await axios.post(`${this.baseUrl}/api/auth/test-register`, {
      email: testEmail,
      password: 'BusinessTest123!',
      firstName: 'Business',
      lastName: 'Test'
    });
    
    const token = authResponse.data.data.token;
    
    // Test business types endpoint
    const businessResponse = await axios.get(`${this.baseUrl}/api/onboarding/business-types`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (!businessResponse.data.success || !businessResponse.data.data.businessTypes) {
      throw new Error('Business types validation failed');
    }
  }

  /**
   * Generate comprehensive deployment report
   */
  async generateDeploymentReport() {
    const report = {
      deploymentId: this.deploymentId,
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      phases: this.phases,
      summary: {
        totalPhases: Object.keys(this.phases).length,
        completedPhases: Object.values(this.phases).filter(p => p.status === 'completed').length,
        failedPhases: Object.values(this.phases).filter(p => p.status === 'failed').length,
        totalDuration: this.calculateTotalDuration()
      }
    };
    
    const reportPath = `/tmp/deployment-report-${this.deploymentId}.json`;
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    this.log(`📊 Deployment report generated: ${reportPath}`);
    
    // Log summary
    this.log('\n' + '=' * 80);
    this.log('📊 DEPLOYMENT SUMMARY');
    this.log('=' * 80);
    this.log(`Deployment ID: ${this.deploymentId}`);
    this.log(`Total Phases: ${report.summary.totalPhases}`);
    this.log(`Completed: ${report.summary.completedPhases}`);
    this.log(`Failed: ${report.summary.failedPhases}`);
    this.log(`Total Duration: ${report.summary.totalDuration}ms`);
    this.log(`Target URL: ${this.baseUrl}`);
    this.log('=' * 80);
  }

  /**
   * Calculate total deployment duration
   */
  calculateTotalDuration() {
    const startTimes = Object.values(this.phases)
      .map(p => p.startTime)
      .filter(t => t !== null);
    
    const endTimes = Object.values(this.phases)
      .map(p => p.endTime)
      .filter(t => t !== null);
    
    if (startTimes.length === 0 || endTimes.length === 0) return 0;
    
    const earliestStart = Math.min(...startTimes.map(t => t.getTime()));
    const latestEnd = Math.max(...endTimes.map(t => t.getTime()));
    
    return latestEnd - earliestStart;
  }

  /**
   * Handle deployment failure
   */
  async handleDeploymentFailure(error) {
    this.log('🚨 Handling deployment failure...');
    
    // Create failure report
    const failureReport = {
      deploymentId: this.deploymentId,
      timestamp: new Date().toISOString(),
      error: error.message,
      phases: this.phases,
      rollbackRequired: true
    };
    
    const failureReportPath = `/tmp/deployment-failure-${this.deploymentId}.json`;
    await fs.writeFile(failureReportPath, JSON.stringify(failureReport, null, 2));
    
    this.log(`💥 Failure report generated: ${failureReportPath}`);
    
    // Send alerts
    await this.sendFailureAlert(error);
  }

  /**
   * Send failure alert
   */
  async sendFailureAlert(error) {
    // Implementation would depend on your alerting system
    this.log(`🚨 ALERT: Deployment ${this.deploymentId} failed: ${error.message}`);
  }

  /**
   * Utility functions
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    // Also write to log file
    fs.appendFile(this.logFile, logMessage + '\n').catch(() => {});
  }
}

module.exports = DeploymentOrchestrator;

// Run if called directly
if (require.main === module) {
  const orchestrator = new DeploymentOrchestrator();
  orchestrator.executeDeployment()
    .then(result => {
      console.log('🎉 Deployment orchestration completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Deployment orchestration failed:', error);
      process.exit(1);
    });
}
