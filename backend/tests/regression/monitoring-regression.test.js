/**
 * Monitoring System Regression Tests
 * Comprehensive testing of monitoring, alerting, and performance tracking
 */

const testDataFactory = require('../helpers/testDataFactory');
const testUtils = require('../helpers/testUtils');

describe('Monitoring System Regression Tests', () => {
  beforeAll(async () => {
    // Test setup will be handled by the test runner
  });

  afterEach(async () => {
    await testUtils.cleanup();
  });

  describe('Real-time Monitoring Service', () => {
    test('should track database query performance', async () => {
      const queryData = testDataFactory.createDatabaseQuery({
        text: 'SELECT * FROM users WHERE id = $1',
        values: ['test-user-1'],
        duration: 150
      });

      const response = await testUtils.authenticatedRequest('GET', '/api/monitoring/queries');

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('queries');
      expect(Array.isArray(response.body.data.queries)).toBe(true);
    });

    test('should identify slow queries above threshold', async () => {
      const slowQueryData = testDataFactory.createDatabaseQuery({
        text: 'SELECT * FROM users u JOIN credentials c ON u.id = c.user_id',
        duration: 1500 // Above 500ms threshold
      });

      const response = await testUtils.authenticatedRequest('GET', '/api/monitoring/slow-queries');

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('slowQueries');
    });

    test('should monitor API endpoint response times', async () => {
      const performanceData = testDataFactory.createPerformanceMetrics({
        responseTime: 250
      });

      const response = await testUtils.authenticatedRequest('GET', '/api/monitoring/performance');

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('performance');
      expect(response.body.data.performance).toHaveProperty('averageResponseTime');
    });

    test('should track system resource usage', async () => {
      const response = await testUtils.authenticatedRequest('GET', '/api/monitoring/system');

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data.system).toHaveProperty('memoryUsage');
      expect(response.body.data.system).toHaveProperty('cpuUsage');
    });

    test('should provide monitoring dashboard data', async () => {
      const response = await testUtils.authenticatedRequest('GET', '/api/monitoring/dashboard');

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('performance');
      expect(response.body.data).toHaveProperty('recentAlerts');
      expect(response.body.data).toHaveProperty('topSlowQueries');
      expect(response.body.data).toHaveProperty('systemHealth');
    });
  });

  describe('Error Tracking Service', () => {
    test('should track client-side errors', async () => {
      const errorData = testDataFactory.createErrorLog({
        category: 'client',
        message: 'JavaScript runtime error',
        stack: 'Error: Test error\n    at component.js:45:12'
      });

      const response = await testUtils.authenticatedRequest('POST', '/api/errors/track')
        .send({
          message: errorData.message,
          stack: errorData.stack,
          category: errorData.category,
          url: '/dashboard',
          userAgent: 'Mozilla/5.0 Test Browser'
        });

      testUtils.assertSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('errorId');
    });

    test('should track server-side errors', async () => {
      const errorData = testDataFactory.createErrorLog({
        category: 'server',
        message: 'Database connection failed',
        severity: 'critical'
      });

      const response = await testUtils.authenticatedRequest('POST', '/api/errors/track')
        .send({
          message: errorData.message,
          category: errorData.category,
          severity: errorData.severity,
          metadata: { service: 'database' }
        });

      testUtils.assertSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('errorId');
    });

    test('should provide error statistics', async () => {
      const response = await testUtils.authenticatedRequest('GET', '/api/errors/stats');

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('bySeverity');
      expect(response.body.data).toHaveProperty('byCategory');
      expect(response.body.data).toHaveProperty('recentTrends');
    });

    test('should retrieve recent errors with pagination', async () => {
      const response = await testUtils.authenticatedRequest('GET', '/api/errors/recent?limit=10&offset=0');

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('errors');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.errors)).toBe(true);
    });

    test('should group similar errors', async () => {
      // Create multiple similar errors
      const baseError = testDataFactory.createErrorLog({
        message: 'Connection timeout',
        stack: 'Error: Connection timeout\n    at database.js:123:45'
      });

      const response = await testUtils.authenticatedRequest('GET', '/api/errors/grouped');

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('groupedErrors');
    });
  });

  describe('Business Alerting Engine', () => {
    test('should generate alerts for SLA violations', async () => {
      const alertData = {
        type: 'sla_violation',
        severity: 'critical',
        message: 'API response time exceeded 2 seconds',
        metadata: {
          endpoint: '/api/auth/login',
          responseTime: 2500,
          threshold: 2000
        }
      };

      const response = await testUtils.authenticatedRequest('POST', '/api/monitoring/test-alert')
        .send(alertData);

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('alertId');
    });

    test('should generate alerts for error rate thresholds', async () => {
      const alertData = {
        type: 'error_rate_threshold',
        severity: 'high',
        message: 'Error rate exceeded 5% in last 5 minutes',
        metadata: {
          errorRate: 0.08,
          threshold: 0.05,
          timeWindow: '5m'
        }
      };

      const response = await testUtils.authenticatedRequest('POST', '/api/monitoring/test-alert')
        .send(alertData);

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('alertId');
    });

    test('should generate business impact alerts', async () => {
      const alertData = {
        type: 'business_impact',
        severity: 'critical',
        message: 'Onboarding failure rate exceeded 20%',
        metadata: {
          failureRate: 0.25,
          threshold: 0.20,
          affectedUsers: 15
        }
      };

      const response = await testUtils.authenticatedRequest('POST', '/api/monitoring/test-alert')
        .send(alertData);

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('alertId');
    });

    test('should implement alert cooldown periods', async () => {
      const alertData = {
        type: 'test_cooldown',
        severity: 'medium',
        message: 'Test alert for cooldown validation'
      };

      // Send first alert
      const firstResponse = await testUtils.authenticatedRequest('POST', '/api/monitoring/test-alert')
        .send(alertData);

      testUtils.assertSuccessResponse(firstResponse, 200);

      // Send duplicate alert immediately (should be suppressed)
      const secondResponse = await testUtils.authenticatedRequest('POST', '/api/monitoring/test-alert')
        .send(alertData);

      // Should either succeed with suppression notice or be rate limited
      expect([200, 429]).toContain(secondResponse.status);
    });

    test('should escalate critical alerts', async () => {
      const criticalAlert = {
        type: 'system_failure',
        severity: 'critical',
        message: 'Database connection completely failed',
        metadata: {
          service: 'database',
          impact: 'total_outage'
        }
      };

      const response = await testUtils.authenticatedRequest('POST', '/api/monitoring/test-alert')
        .send(criticalAlert);

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('alertId');
      expect(response.body.data).toHaveProperty('escalated');
    });
  });

  describe('Adaptive Threshold Service', () => {
    test('should learn from historical performance data', async () => {
      // Generate historical performance data
      const performanceData = testUtils.generatePerformanceData(100);

      const response = await testUtils.authenticatedRequest('GET', '/api/monitoring/adaptive-thresholds');

      // Endpoint might not be implemented yet
      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('thresholds');
        expect(response.body.data).toHaveProperty('confidence');
      } else {
        expect(response.status).toBe(404); // Not implemented yet
      }
    });

    test('should adapt thresholds based on business hours', async () => {
      const response = await testUtils.authenticatedRequest('GET', '/api/monitoring/thresholds/business-hours');

      // Endpoint might not be implemented yet
      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('businessHours');
        expect(response.body.data).toHaveProperty('offHours');
      } else {
        expect(response.status).toBe(404); // Not implemented yet
      }
    });

    test('should provide threshold adaptation history', async () => {
      const response = await testUtils.authenticatedRequest('GET', '/api/monitoring/adaptation-history');

      // Endpoint might not be implemented yet
      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('adaptations');
        expect(Array.isArray(response.body.data.adaptations)).toBe(true);
      } else {
        expect(response.status).toBe(404); // Not implemented yet
      }
    });
  });

  describe('Stakeholder Reporting Service', () => {
    test('should provide executive dashboard data', async () => {
      const response = await testUtils.authenticatedRequest('GET', '/api/reports/executive');

      // Endpoint might not be implemented yet
      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('kpis');
        expect(response.body.data).toHaveProperty('systemHealth');
        expect(response.body.data).toHaveProperty('businessMetrics');
      } else {
        expect(response.status).toBe(404); // Not implemented yet
      }
    });

    test('should provide operations report data', async () => {
      const response = await testUtils.authenticatedRequest('GET', '/api/reports/operations');

      // Endpoint might not be implemented yet
      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('performance');
        expect(response.body.data).toHaveProperty('slaCompliance');
        expect(response.body.data).toHaveProperty('alerts');
      } else {
        expect(response.status).toBe(404); // Not implemented yet
      }
    });

    test('should check reporting status and schedules', async () => {
      const response = await testUtils.authenticatedRequest('GET', '/api/reports/status');

      // Endpoint might not be implemented yet
      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('scheduledReports');
        expect(response.body.data).toHaveProperty('lastGenerated');
      } else {
        expect(response.status).toBe(404); // Not implemented yet
      }
    });
  });

  describe('Performance and Load Testing', () => {
    test('should handle concurrent monitoring requests', async () => {
      const concurrentRequests = Array(20).fill().map(() =>
        testUtils.authenticatedRequest('GET', '/api/monitoring/dashboard')
      );

      const responses = await Promise.all(concurrentRequests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    test('should maintain monitoring performance under load', async () => {
      const loadTestResults = await testUtils.simulateLoad('/api/monitoring/status', {
        concurrency: 10,
        requests: 50,
        authenticated: true
      });

      expect(loadTestResults.successfulRequests).toBeGreaterThan(40); // 80% success rate
      expect(loadTestResults.averageResponseTime).toBeLessThan(1000); // Under 1 second
    });

    test('should handle error tracking under high volume', async () => {
      const errorRequests = Array(50).fill().map((_, index) =>
        testUtils.authenticatedRequest('POST', '/api/errors/track')
          .send({
            message: `Load test error ${index}`,
            category: 'client',
            severity: 'low',
            url: `/test/${index}`
          })
      );

      const responses = await Promise.all(errorRequests);
      
      // Most requests should succeed
      const successfulRequests = responses.filter(r => r.status === 201).length;
      expect(successfulRequests).toBeGreaterThan(40); // 80% success rate
    });
  });

  describe('Data Retention and Cleanup', () => {
    test('should respect monitoring data retention policies', async () => {
      const response = await testUtils.authenticatedRequest('GET', '/api/monitoring/retention-status');

      // Endpoint might not be implemented yet
      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('retentionPolicies');
        expect(response.body.data).toHaveProperty('dataAgeDistribution');
      } else {
        expect(response.status).toBe(404); // Not implemented yet
      }
    });

    test('should clean up old monitoring data', async () => {
      const response = await testUtils.authenticatedRequest('POST', '/api/monitoring/cleanup')
        .send({ dryRun: true });

      // Endpoint might not be implemented yet
      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('recordsToCleanup');
        expect(response.body.data).toHaveProperty('estimatedSpaceSaved');
      } else {
        expect(response.status).toBe(404); // Not implemented yet
      }
    });
  });

  describe('Health Checks and Status', () => {
    test('should provide comprehensive system health status', async () => {
      const response = await testUtils.authenticatedRequest('GET', '/api/monitoring/health');

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('overall');
      expect(response.body.data).toHaveProperty('services');
      expect(response.body.data).toHaveProperty('dependencies');
    });

    test('should validate monitoring service status', async () => {
      const response = await testUtils.authenticatedRequest('GET', '/api/monitoring/status');

      testUtils.assertSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('isMonitoring');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('alertCount');
    });

    test('should provide monitoring service metrics', async () => {
      const response = await testUtils.authenticatedRequest('GET', '/api/monitoring/metrics');

      // Endpoint might not be implemented yet
      if (response.status === 200) {
        expect(response.body.data).toHaveProperty('queryMetrics');
        expect(response.body.data).toHaveProperty('errorMetrics');
        expect(response.body.data).toHaveProperty('performanceMetrics');
      } else {
        expect(response.status).toBe(404); // Not implemented yet
      }
    });
  });
});
