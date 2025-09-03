#!/usr/bin/env node

/**
 * Health Check and Alert Monitoring Script
 * Comprehensive validation and testing of monitoring system components
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class HealthAndAlertMonitor {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.adminToken = null;
    this.testResults = {};
    this.monitoringData = {};
  }

  /**
   * Main monitoring process
   */
  async run() {
    try {
      console.log('🏥 FloWorx Health Check & Alert Monitoring');
      console.log('=========================================');
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Base URL: ${this.baseUrl}`);
      console.log('');

      // Get admin authentication
      await this.authenticateAdmin();

      // Run comprehensive health checks
      await this.performSystemHealthChecks();
      await this.testAlertGeneration();
      await this.validateMonitoringMetrics();
      await this.testErrorTracking();
      await this.validateReportingSystem();
      await this.testAdaptiveThresholds();

      // Generate monitoring report
      await this.generateMonitoringReport();

      // Display results
      this.displayMonitoringResults();

    } catch (error) {
      console.error('❌ Health and alert monitoring failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Authenticate admin user
   */
  async authenticateAdmin() {
    console.log('🔐 Authenticating admin user...');

    try {
      const loginResponse = await axios.post(`${this.baseUrl}/api/auth/login`, {
        email: 'admin@floworx-iq.com',
        password: 'AdminPassword123!'
      }, {
        timeout: 10000
      });

      if (loginResponse.data.token) {
        this.adminToken = loginResponse.data.token;
        console.log('  ✅ Admin authentication successful');
      } else {
        throw new Error('No token received from login');
      }

    } catch (error) {
      console.log(`  ❌ Admin authentication failed: ${error.message}`);
      throw new Error('Admin authentication required for monitoring tests');
    }
  }

  /**
   * Perform system health checks
   */
  async performSystemHealthChecks() {
    console.log('🏥 Performing system health checks...');

    const healthChecks = [
      { name: 'Application Health', endpoint: '/api/health' },
      { name: 'Database Health', endpoint: '/api/health/database' },
      { name: 'Monitoring Status', endpoint: '/api/monitoring/status' },
      { name: 'Error Tracking Status', endpoint: '/api/errors/stats' }
    ];

    const results = {};

    for (const check of healthChecks) {
      try {
        const startTime = Date.now();
        const response = await axios.get(`${this.baseUrl}${check.endpoint}`, {
          headers: { Authorization: `Bearer ${this.adminToken}` },
          timeout: 10000
        });
        const duration = Date.now() - startTime;

        results[check.name] = {
          status: 'pass',
          httpStatus: response.status,
          responseTime: duration,
          data: response.data
        };

        console.log(`  ✅ ${check.name}: ${duration}ms`);

      } catch (error) {
        results[check.name] = {
          status: 'fail',
          error: error.message,
          httpStatus: error.response?.status || 0
        };

        console.log(`  ❌ ${check.name}: ${error.message}`);
      }
    }

    this.testResults.healthChecks = results;
  }

  /**
   * Test alert generation
   */
  async testAlertGeneration() {
    console.log('🚨 Testing alert generation...');

    const alertTests = [
      {
        name: 'Low Severity Alert',
        payload: {
          type: 'test_alert',
          severity: 'low',
          message: 'Test low severity alert',
          metadata: { testType: 'health_check' }
        }
      },
      {
        name: 'Medium Severity Alert',
        payload: {
          type: 'test_alert',
          severity: 'medium',
          message: 'Test medium severity alert',
          metadata: { testType: 'health_check' }
        }
      },
      {
        name: 'High Severity Alert',
        payload: {
          type: 'test_alert',
          severity: 'high',
          message: 'Test high severity alert',
          metadata: { testType: 'health_check' }
        }
      }
    ];

    const results = {};

    for (const test of alertTests) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/monitoring/test-alert`, test.payload, {
          headers: { Authorization: `Bearer ${this.adminToken}` },
          timeout: 10000
        });

        results[test.name] = {
          status: 'pass',
          alertId: response.data.alertId,
          httpStatus: response.status
        };

        console.log(`  ✅ ${test.name}: Alert ID ${response.data.alertId}`);

      } catch (error) {
        results[test.name] = {
          status: 'fail',
          error: error.message,
          httpStatus: error.response?.status || 0
        };

        console.log(`  ❌ ${test.name}: ${error.message}`);
      }
    }

    this.testResults.alertGeneration = results;
  }

  /**
   * Validate monitoring metrics
   */
  async validateMonitoringMetrics() {
    console.log('📊 Validating monitoring metrics...');

    try {
      // Get dashboard data
      const dashboardResponse = await axios.get(`${this.baseUrl}/api/monitoring/dashboard`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 10000
      });

      // Get query performance data
      const queriesResponse = await axios.get(`${this.baseUrl}/api/monitoring/queries`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 10000
      });

      // Get optimization recommendations
      const recommendationsResponse = await axios.get(`${this.baseUrl}/api/monitoring/recommendations`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 10000
      });

      const metricsValid = dashboardResponse.status === 200 && 
                          queriesResponse.status === 200 && 
                          recommendationsResponse.status === 200;

      this.testResults.monitoringMetrics = {
        status: metricsValid ? 'pass' : 'fail',
        dashboardStatus: dashboardResponse.status,
        queriesStatus: queriesResponse.status,
        recommendationsStatus: recommendationsResponse.status,
        data: {
          dashboard: dashboardResponse.data.data,
          queryCount: queriesResponse.data.data.queries.length,
          recommendationCount: recommendationsResponse.data.data.recommendations.length
        }
      };

      if (metricsValid) {
        console.log('  ✅ Monitoring metrics validated');
        console.log(`    - Dashboard data: ${Object.keys(dashboardResponse.data.data).length} sections`);
        console.log(`    - Query metrics: ${queriesResponse.data.data.queries.length} queries tracked`);
        console.log(`    - Recommendations: ${recommendationsResponse.data.data.recommendations.length} available`);
      } else {
        console.log('  ❌ Monitoring metrics validation failed');
      }

    } catch (error) {
      console.log(`  ❌ Monitoring metrics validation failed: ${error.message}`);
      this.testResults.monitoringMetrics = {
        status: 'fail',
        error: error.message
      };
    }
  }

  /**
   * Test error tracking
   */
  async testErrorTracking() {
    console.log('🐛 Testing error tracking...');

    try {
      // Track a test client-side error
      const clientErrorResponse = await axios.post(`${this.baseUrl}/api/errors/track`, {
        message: 'Test client-side error for health check',
        stack: 'Error: Test error\n    at testFunction (test.js:1:1)',
        url: '/health-check',
        userAgent: 'Health Check Script',
        category: 'client',
        severity: 'low',
        metadata: {
          testType: 'health_check',
          timestamp: Date.now()
        }
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 10000
      });

      // Get error statistics
      const errorStatsResponse = await axios.get(`${this.baseUrl}/api/errors/stats`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 10000
      });

      // Get recent errors
      const recentErrorsResponse = await axios.get(`${this.baseUrl}/api/errors/recent?limit=5`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 10000
      });

      const errorTrackingValid = clientErrorResponse.status === 200 && 
                                errorStatsResponse.status === 200 && 
                                recentErrorsResponse.status === 200;

      this.testResults.errorTracking = {
        status: errorTrackingValid ? 'pass' : 'fail',
        clientErrorStatus: clientErrorResponse.status,
        errorStatsStatus: errorStatsResponse.status,
        recentErrorsStatus: recentErrorsResponse.status,
        data: {
          trackedErrorId: clientErrorResponse.data.data.errorId,
          totalErrors: errorStatsResponse.data.data.total,
          recentErrorsCount: recentErrorsResponse.data.data.errors.length
        }
      };

      if (errorTrackingValid) {
        console.log('  ✅ Error tracking validated');
        console.log(`    - Test error tracked: ${clientErrorResponse.data.data.errorId}`);
        console.log(`    - Total errors in system: ${errorStatsResponse.data.data.total}`);
        console.log(`    - Recent errors: ${recentErrorsResponse.data.data.errors.length}`);
      } else {
        console.log('  ❌ Error tracking validation failed');
      }

    } catch (error) {
      console.log(`  ❌ Error tracking validation failed: ${error.message}`);
      this.testResults.errorTracking = {
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
      // Check reporting status
      const reportStatusResponse = await axios.get(`${this.baseUrl}/api/reports/status`, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        timeout: 10000
      });

      // Test report generation (if endpoint exists)
      let testReportResponse = null;
      try {
        testReportResponse = await axios.post(`${this.baseUrl}/api/reports/generate-test`, {
          type: 'health_check',
          format: 'json'
        }, {
          headers: { Authorization: `Bearer ${this.adminToken}` },
          timeout: 15000
        });
      } catch (error) {
        // Test report endpoint might not exist, that's okay
      }

      const reportingValid = reportStatusResponse.status === 200;

      this.testResults.reporting = {
        status: reportingValid ? 'pass' : 'fail',
        statusEndpoint: reportStatusResponse.status,
        testReportGenerated: testReportResponse?.status === 200,
        data: {
          reportingStatus: reportStatusResponse.data,
          testReportData: testReportResponse?.data
        }
      };

      if (reportingValid) {
        console.log('  ✅ Reporting system validated');
        if (testReportResponse) {
          console.log('    - Test report generation successful');
        }
      } else {
        console.log('  ❌ Reporting system validation failed');
      }

    } catch (error) {
      console.log(`  ❌ Reporting system validation failed: ${error.message}`);
      this.testResults.reporting = {
        status: 'fail',
        error: error.message
      };
    }
  }

  /**
   * Test adaptive thresholds
   */
  async testAdaptiveThresholds() {
    console.log('🧠 Testing adaptive thresholds...');

    try {
      // Get current adaptive thresholds (if endpoint exists)
      let thresholdsResponse = null;
      try {
        thresholdsResponse = await axios.get(`${this.baseUrl}/api/monitoring/adaptive-thresholds`, {
          headers: { Authorization: `Bearer ${this.adminToken}` },
          timeout: 10000
        });
      } catch (error) {
        // Adaptive thresholds endpoint might not be implemented yet
      }

      // Test threshold update (if endpoint exists)
      let updateResponse = null;
      try {
        updateResponse = await axios.post(`${this.baseUrl}/api/monitoring/thresholds`, {
          slowQuery: 600,
          criticalQuery: 2100
        }, {
          headers: { Authorization: `Bearer ${this.adminToken}` },
          timeout: 10000
        });
      } catch (error) {
        // Threshold update endpoint might not be implemented yet
      }

      const adaptiveThresholdsWorking = thresholdsResponse?.status === 200 || 
                                       updateResponse?.status === 200;

      this.testResults.adaptiveThresholds = {
        status: adaptiveThresholdsWorking ? 'pass' : 'warn',
        thresholdsEndpoint: thresholdsResponse?.status || 'not_available',
        updateEndpoint: updateResponse?.status || 'not_available',
        data: {
          currentThresholds: thresholdsResponse?.data,
          updateResult: updateResponse?.data
        }
      };

      if (adaptiveThresholdsWorking) {
        console.log('  ✅ Adaptive thresholds system validated');
      } else {
        console.log('  ⚠️  Adaptive thresholds endpoints not available (may not be implemented yet)');
      }

    } catch (error) {
      console.log(`  ⚠️  Adaptive thresholds validation warning: ${error.message}`);
      this.testResults.adaptiveThresholds = {
        status: 'warn',
        error: error.message
      };
    }
  }

  /**
   * Generate monitoring report
   */
  async generateMonitoringReport() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      baseUrl: this.baseUrl,
      testResults: this.testResults,
      summary: this.calculateTestSummary(),
      recommendations: this.generateRecommendations()
    };

    try {
      await fs.mkdir('./reports', { recursive: true });
      const reportPath = `./reports/health-monitoring-${Date.now()}.json`;
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Health monitoring report saved: ${reportPath}`);
    } catch (error) {
      console.warn(`⚠️  Failed to save monitoring report: ${error.message}`);
    }
  }

  /**
   * Calculate test summary
   */
  calculateTestSummary() {
    const categories = Object.keys(this.testResults);
    let passed = 0;
    let warned = 0;
    let failed = 0;

    for (const category of categories) {
      const result = this.testResults[category];
      if (typeof result.status === 'string') {
        if (result.status === 'pass') passed++;
        else if (result.status === 'warn') warned++;
        else if (result.status === 'fail') failed++;
      } else {
        // Handle nested results
        const subResults = Object.values(result);
        for (const subResult of subResults) {
          if (subResult.status === 'pass') passed++;
          else if (subResult.status === 'warn') warned++;
          else if (subResult.status === 'fail') failed++;
        }
      }
    }

    const total = passed + warned + failed;

    return {
      total,
      passed,
      warned,
      failed,
      successRate: total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0'
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Check for failed tests
    for (const [category, result] of Object.entries(this.testResults)) {
      if (result.status === 'fail') {
        recommendations.push({
          category,
          priority: 'high',
          issue: `${category} validation failed`,
          recommendation: `Review and fix ${category} configuration and connectivity`
        });
      } else if (result.status === 'warn') {
        recommendations.push({
          category,
          priority: 'medium',
          issue: `${category} has warnings`,
          recommendation: `Consider implementing or improving ${category} functionality`
        });
      }
    }

    return recommendations;
  }

  /**
   * Display monitoring results
   */
  displayMonitoringResults() {
    console.log('');
    console.log('📊 Health Check & Alert Monitoring Results');
    console.log('=========================================');

    const categories = [
      'healthChecks',
      'alertGeneration',
      'monitoringMetrics',
      'errorTracking',
      'reporting',
      'adaptiveThresholds'
    ];

    for (const category of categories) {
      const result = this.testResults[category];
      if (!result) continue;

      const statusIcon = result.status === 'pass' ? '✅' : 
                        result.status === 'warn' ? '⚠️' : '❌';
      
      console.log(`${statusIcon} ${category.toUpperCase()}: ${result.status.toUpperCase()}`);

      // Show nested results for complex categories
      if (typeof result === 'object' && !result.status) {
        for (const [subCategory, subResult] of Object.entries(result)) {
          const subStatusIcon = subResult.status === 'pass' ? '✅' : 
                               subResult.status === 'warn' ? '⚠️' : '❌';
          console.log(`    ${subStatusIcon} ${subCategory}: ${subResult.status}`);
        }
      }
    }

    const summary = this.calculateTestSummary();
    
    console.log('');
    console.log(`Total Tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Warnings: ${summary.warned}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Success Rate: ${summary.successRate}%`);

    if (summary.failed > 0) {
      console.log('');
      console.log('❌ Some health checks failed. Please review the issues above.');
    } else if (summary.warned > 0) {
      console.log('');
      console.log('⚠️  Health checks completed with warnings. System is functional but could be improved.');
    } else {
      console.log('');
      console.log('🎉 All health checks passed! Monitoring system is fully operational.');
    }
  }
}

// Handle script execution
if (require.main === module) {
  const monitor = new HealthAndAlertMonitor();
  monitor.run().catch(error => {
    console.error('Health monitoring failed:', error.message);
    process.exit(1);
  });
}

module.exports = HealthAndAlertMonitor;
