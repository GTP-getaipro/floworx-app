#!/usr/bin/env node

/**
 * Deployment Validation Script
 * Comprehensive validation of production deployment before going live
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class DeploymentValidator {
  constructor() {
    this.validationResults = {};
    this.config = {};
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.adminToken = null;
  }

  /**
   * Main validation process
   */
  async run() {
    try {
      console.log('🔍 FloWorx Deployment Validation');
      console.log('================================');
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Base URL: ${this.baseUrl}`);
      console.log('');

      // Load configuration
      await this.loadConfiguration();

      // Run validation tests
      await this.validateEnvironmentSetup();
      await this.validateDatabaseConnectivity();
      await this.validateApplicationHealth();
      await this.validateMonitoringServices();
      await this.validateAlertingSystem();
      await this.validateReportingSystem();
      await this.validateSecurityConfiguration();
      await this.validatePerformanceBaseline();

      // Generate validation report
      await this.generateValidationReport();

      // Display summary
      this.displayValidationSummary();

    } catch (error) {
      console.error('❌ Deployment validation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Load configuration
   */
  async loadConfiguration() {
    try {
      const envPath = path.join(process.cwd(), '.env.production');
      const envContent = await fs.readFile(envPath, 'utf8');
      
      const lines = envContent.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=');
          this.config[key] = value;
        }
      }

      console.log('📋 Configuration loaded successfully');
    } catch (error) {
      console.warn('⚠️  Could not load .env.production, using process.env');
      this.config = { ...process.env };
    }
  }

  /**
   * Validate environment setup
   */
  async validateEnvironmentSetup() {
    console.log('🔧 Validating environment setup...');

    const requiredVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'JWT_SECRET',
      'ENCRYPTION_KEY'
    ];

    const missingVars = requiredVars.filter(varName => !this.config[varName]);
    
    this.validationResults.environment = {
      status: missingVars.length === 0 ? 'pass' : 'fail',
      requiredVariables: requiredVars.length,
      missingVariables: missingVars,
      details: {
        nodeEnv: this.config.NODE_ENV,
        hasDatabase: !!this.config.DATABASE_URL,
        hasJwtSecret: !!this.config.JWT_SECRET,
        hasEncryptionKey: !!this.config.ENCRYPTION_KEY
      }
    };

    if (missingVars.length === 0) {
      console.log('  ✅ All required environment variables present');
    } else {
      console.log(`  ❌ Missing required variables: ${missingVars.join(', ')}`);
    }
  }

  /**
   * Validate database connectivity
   */
  async validateDatabaseConnectivity() {
    console.log('🗄️  Validating database connectivity...');

    try {
      const { query } = require('../backend/database/unified-connection');
      
      // Test basic connectivity
      const healthResult = await query('SELECT 1 as health_check');
      
      // Test application tables
      const tablesResult = await query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);

      const expectedTables = ['users', 'credentials', 'workflow_deployments'];
      const existingTables = tablesResult.rows.map(row => row.table_name);
      const missingTables = expectedTables.filter(table => !existingTables.includes(table));

      this.validationResults.database = {
        status: missingTables.length === 0 ? 'pass' : 'fail',
        connectivity: 'success',
        tablesFound: existingTables.length,
        missingTables,
        details: {
          healthCheck: healthResult.rows[0].health_check === 1,
          existingTables
        }
      };

      if (missingTables.length === 0) {
        console.log(`  ✅ Database connectivity verified (${existingTables.length} tables found)`);
      } else {
        console.log(`  ❌ Missing database tables: ${missingTables.join(', ')}`);
      }

    } catch (error) {
      console.log(`  ❌ Database connectivity failed: ${error.message}`);
      this.validationResults.database = {
        status: 'fail',
        connectivity: 'failed',
        error: error.message
      };
    }
  }

  /**
   * Validate application health
   */
  async validateApplicationHealth() {
    console.log('🏥 Validating application health...');

    try {
      const healthResponse = await axios.get(`${this.baseUrl}/api/health`, {
        timeout: 10000
      });

      const isHealthy = healthResponse.status === 200 && 
                       healthResponse.data.status === 'healthy';

      this.validationResults.applicationHealth = {
        status: isHealthy ? 'pass' : 'fail',
        httpStatus: healthResponse.status,
        responseTime: healthResponse.headers['x-response-time'] || 'N/A',
        details: healthResponse.data
      };

      if (isHealthy) {
        console.log('  ✅ Application health check passed');
      } else {
        console.log('  ❌ Application health check failed');
      }

    } catch (error) {
      console.log(`  ❌ Application health check failed: ${error.message}`);
      this.validationResults.applicationHealth = {
        status: 'fail',
        error: error.message
      };
    }
  }

  /**
   * Validate monitoring services
   */
  async validateMonitoringServices() {
    console.log('📊 Validating monitoring services...');

    try {
      // Get admin token for authenticated endpoints
      await this.getAdminToken();

      if (!this.adminToken) {
        throw new Error('Could not obtain admin token for monitoring validation');
      }

      // Test monitoring dashboard
      const dashboardResponse = await axios.get(`${this.baseUrl}/api/monitoring/dashboard`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 10000
      });

      // Test monitoring status
      const statusResponse = await axios.get(`${this.baseUrl}/api/monitoring/status`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 10000
      });

      const monitoringHealthy = dashboardResponse.status === 200 && 
                               statusResponse.status === 200 &&
                               statusResponse.data.data.isMonitoring;

      this.validationResults.monitoring = {
        status: monitoringHealthy ? 'pass' : 'fail',
        dashboardStatus: dashboardResponse.status,
        statusEndpoint: statusResponse.status,
        isMonitoring: statusResponse.data.data.isMonitoring,
        details: {
          uptime: statusResponse.data.data.uptime,
          alertCount: statusResponse.data.data.alertCount,
          queryCount: statusResponse.data.data.queryCount
        }
      };

      if (monitoringHealthy) {
        console.log('  ✅ Monitoring services validated');
      } else {
        console.log('  ❌ Monitoring services validation failed');
      }

    } catch (error) {
      console.log(`  ❌ Monitoring services validation failed: ${error.message}`);
      this.validationResults.monitoring = {
        status: 'fail',
        error: error.message
      };
    }
  }

  /**
   * Validate alerting system
   */
  async validateAlertingSystem() {
    console.log('🚨 Validating alerting system...');

    try {
      if (!this.adminToken) {
        throw new Error('Admin token required for alerting validation');
      }

      // Test alert generation
      const testAlertResponse = await axios.post(`${this.baseUrl}/api/monitoring/test-alert`, {
        type: 'validation_test',
        severity: 'low',
        message: 'Deployment validation test alert'
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 10000
      });

      // Check error tracking
      const errorStatsResponse = await axios.get(`${this.baseUrl}/api/errors/stats`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 10000
      });

      const alertingHealthy = testAlertResponse.status === 200 && 
                             errorStatsResponse.status === 200;

      this.validationResults.alerting = {
        status: alertingHealthy ? 'pass' : 'fail',
        testAlertStatus: testAlertResponse.status,
        errorTrackingStatus: errorStatsResponse.status,
        details: {
          testAlertGenerated: testAlertResponse.data.success,
          errorTrackingActive: errorStatsResponse.data.success
        }
      };

      if (alertingHealthy) {
        console.log('  ✅ Alerting system validated');
      } else {
        console.log('  ❌ Alerting system validation failed');
      }

    } catch (error) {
      console.log(`  ❌ Alerting system validation failed: ${error.message}`);
      this.validationResults.alerting = {
        status: 'fail',
        error: error.message
      };
    }
  }

  /**
   * Validate reporting system
   */
  async validateReportingSystem() {
    console.log('📈 Validating reporting system...');

    try {
      if (!this.adminToken) {
        throw new Error('Admin token required for reporting validation');
      }

      // Check reporting status
      const reportStatusResponse = await axios.get(`${this.baseUrl}/api/reports/status`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 10000
      });

      const reportingHealthy = reportStatusResponse.status === 200;

      this.validationResults.reporting = {
        status: reportingHealthy ? 'pass' : 'fail',
        statusEndpoint: reportStatusResponse.status,
        details: reportStatusResponse.data
      };

      if (reportingHealthy) {
        console.log('  ✅ Reporting system validated');
      } else {
        console.log('  ❌ Reporting system validation failed');
      }

    } catch (error) {
      console.log(`  ❌ Reporting system validation failed: ${error.message}`);
      this.validationResults.reporting = {
        status: 'fail',
        error: error.message
      };
    }
  }

  /**
   * Validate security configuration
   */
  async validateSecurityConfiguration() {
    console.log('🔐 Validating security configuration...');

    const securityChecks = {
      jwtSecret: this.config.JWT_SECRET && this.config.JWT_SECRET.length >= 32,
      encryptionKey: this.config.ENCRYPTION_KEY && this.config.ENCRYPTION_KEY.length >= 32,
      httpsEnabled: this.baseUrl.startsWith('https://'),
      corsConfigured: !!this.config.CORS_ORIGIN,
      rateLimitingEnabled: !!this.config.RATE_LIMIT_WINDOW_MS
    };

    const passedChecks = Object.values(securityChecks).filter(Boolean).length;
    const totalChecks = Object.keys(securityChecks).length;

    this.validationResults.security = {
      status: passedChecks === totalChecks ? 'pass' : 'warn',
      passedChecks,
      totalChecks,
      details: securityChecks
    };

    if (passedChecks === totalChecks) {
      console.log('  ✅ Security configuration validated');
    } else {
      console.log(`  ⚠️  Security validation: ${passedChecks}/${totalChecks} checks passed`);
    }
  }

  /**
   * Validate performance baseline
   */
  async validatePerformanceBaseline() {
    console.log('⚡ Validating performance baseline...');

    try {
      const startTime = Date.now();
      
      // Test multiple endpoints for performance
      const endpoints = [
        '/api/health',
        '/api/auth/me'
      ];

      const performanceResults = [];

      for (const endpoint of endpoints) {
        try {
          const endpointStart = Date.now();
          const response = await axios.get(`${this.baseUrl}${endpoint}`, {
            headers: endpoint === '/api/auth/me' && this.adminToken ? 
              { Authorization: `Bearer ${this.adminToken}` } : {},
            timeout: 5000
          });
          const duration = Date.now() - endpointStart;

          performanceResults.push({
            endpoint,
            duration,
            status: response.status,
            success: response.status < 400
          });
        } catch (error) {
          performanceResults.push({
            endpoint,
            duration: -1,
            status: error.response?.status || 0,
            success: false,
            error: error.message
          });
        }
      }

      const totalDuration = Date.now() - startTime;
      const successfulRequests = performanceResults.filter(r => r.success).length;
      const averageResponseTime = performanceResults
        .filter(r => r.duration > 0)
        .reduce((sum, r) => sum + r.duration, 0) / performanceResults.length;

      const performanceGood = averageResponseTime < 1000 && successfulRequests > 0;

      this.validationResults.performance = {
        status: performanceGood ? 'pass' : 'warn',
        totalDuration,
        averageResponseTime: Math.round(averageResponseTime),
        successfulRequests,
        totalRequests: performanceResults.length,
        details: performanceResults
      };

      if (performanceGood) {
        console.log(`  ✅ Performance baseline validated (avg: ${Math.round(averageResponseTime)}ms)`);
      } else {
        console.log(`  ⚠️  Performance baseline warning (avg: ${Math.round(averageResponseTime)}ms)`);
      }

    } catch (error) {
      console.log(`  ❌ Performance validation failed: ${error.message}`);
      this.validationResults.performance = {
        status: 'fail',
        error: error.message
      };
    }
  }

  /**
   * Get admin token for authenticated requests
   */
  async getAdminToken() {
    try {
      // Try to create a test admin user or use existing credentials
      const loginResponse = await axios.post(`${this.baseUrl}/api/auth/login`, {
        email: 'admin@floworx-iq.com',
        password: 'AdminPassword123!'
      }, {
        timeout: 10000
      });

      if (loginResponse.data.token) {
        this.adminToken = loginResponse.data.token;
      }
    } catch (error) {
      console.warn('⚠️  Could not obtain admin token for authenticated tests');
    }
  }

  /**
   * Generate validation report
   */
  async generateValidationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.config.NODE_ENV || 'development',
      baseUrl: this.baseUrl,
      validationResults: this.validationResults,
      summary: this.calculateSummary()
    };

    try {
      await fs.mkdir('./reports', { recursive: true });
      const reportPath = `./reports/deployment-validation-${Date.now()}.json`;
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Validation report saved: ${reportPath}`);
    } catch (error) {
      console.warn(`⚠️  Failed to save validation report: ${error.message}`);
    }
  }

  /**
   * Calculate validation summary
   */
  calculateSummary() {
    const results = Object.values(this.validationResults);
    const passed = results.filter(r => r.status === 'pass').length;
    const warned = results.filter(r => r.status === 'warn').length;
    const failed = results.filter(r => r.status === 'fail').length;
    const total = results.length;

    return {
      total,
      passed,
      warned,
      failed,
      successRate: ((passed / total) * 100).toFixed(1)
    };
  }

  /**
   * Display validation summary
   */
  displayValidationSummary() {
    console.log('');
    console.log('📊 Deployment Validation Summary');
    console.log('===============================');

    const categories = [
      'environment',
      'database',
      'applicationHealth',
      'monitoring',
      'alerting',
      'reporting',
      'security',
      'performance'
    ];

    for (const category of categories) {
      const result = this.validationResults[category];
      if (!result) continue;

      const statusIcon = result.status === 'pass' ? '✅' : 
                        result.status === 'warn' ? '⚠️' : '❌';
      
      console.log(`${statusIcon} ${category.toUpperCase()}: ${result.status.toUpperCase()}`);
    }

    const summary = this.calculateSummary();
    
    console.log('');
    console.log(`Total Validations: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Warnings: ${summary.warned}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Success Rate: ${summary.successRate}%`);

    if (summary.failed > 0) {
      console.log('');
      console.log('❌ Deployment validation failed. Please address the issues above before proceeding.');
      process.exit(1);
    } else if (summary.warned > 0) {
      console.log('');
      console.log('⚠️  Deployment validation completed with warnings. Review the issues above.');
    } else {
      console.log('');
      console.log('🎉 All deployment validations passed! Ready for production deployment.');
    }
  }
}

// Handle script execution
if (require.main === module) {
  const validator = new DeploymentValidator();
  validator.run().catch(error => {
    console.error('Validation failed:', error.message);
    process.exit(1);
  });
}

module.exports = DeploymentValidator;
