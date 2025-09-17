/**
 * Integration Tests for Monitoring API
 * Tests real-time monitoring and error tracking endpoints
 */

const request = require('supertest');
const { createTestCompositionRoot } = require('../helpers/testCompositionRoot');
const createMonitoringRoutes = require('../../routes/monitoring');
const express = require('express');

// Create test app with dependency injection
async function createTestApp() {
  const app = express();
  app.use(express.json());

  // Set up composition root for testing
  const services = await createTestCompositionRoot({ useRealDb: false });

  // Mount monitoring routes with injected dependencies
  if (services.realTimeMonitoringService) {
    const monitoringRoutes = createMonitoringRoutes(services.realTimeMonitoringService);
    app.use('/api/monitoring', monitoringRoutes);
  }

  // Store services for test access
  app.testServices = services;

  return app;
}

describe('Monitoring API Integration Tests', () => {
  let app;
  let adminToken;
  let userToken;
  let realTimeMonitoringService;

  beforeAll(async () => {
    // Create test app with dependency injection
    app = await createTestApp();
    realTimeMonitoringService = app.testServices.realTimeMonitoringService;

    // Mock admin token for testing (since we're not testing auth here)
    adminToken = 'mock-admin-token';
    userToken = 'mock-user-token';

    // Mock authentication middleware for testing
    app.use((req, res, next) => {
      if (req.headers.authorization === `Bearer ${adminToken}`) {
        req.user = { id: 'admin-id', role: 'admin' };
      } else if (req.headers.authorization === `Bearer ${userToken}`) {
        req.user = { id: 'user-id', role: 'user' };
      }
      next();
    });
  });

  afterAll(async () => {
    // Cleanup test services
    if (app && app.testServices) {
      await app.testServices.cleanup();
    }
  });

  beforeEach(() => {
    // Reset monitoring services
    if (realTimeMonitoringService) {
      realTimeMonitoringService.resetMetrics();
    }
  });

  describe('Monitoring Dashboard API', () => {
    test('should get dashboard data with admin access', async () => {
      // Add some test data
      realTimeMonitoringService.trackQuery('SELECT * FROM users', [], 150, true);
      realTimeMonitoringService.trackQuery('SELECT * FROM orders', [], 1200, true);

      const response = await request(app)
        .get('/api/monitoring/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('performance');
      expect(response.body.data).toHaveProperty('topSlowQueries');
      expect(response.body.data).toHaveProperty('recentAlerts');
      expect(response.body.data.isMonitoring).toBe(true);
    });

    test('should reject dashboard access for non-admin users', async () => {
      const response = await request(app)
        .get('/api/monitoring/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHORIZATION_ERROR');
    });

    test('should reject dashboard access without authentication', async () => {
      const response = await request(app)
        .get('/api/monitoring/dashboard')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('AUTHENTICATION_ERROR');
    });
  });

  describe('Query Performance API', () => {
    test('should get query performance metrics', async () => {
      // Add test queries
      realTimeMonitoringService.trackQuery('SELECT * FROM users WHERE id = $1', ['1'], 100, true);
      realTimeMonitoringService.trackQuery('SELECT * FROM orders WHERE user_id = $1', ['1'], 250, true);
      realTimeMonitoringService.trackQuery('SELECT COUNT(*) FROM products', [], 1500, true);

      const response = await request(app)
        .get('/api/monitoring/queries')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.queries).toHaveLength(3);
      expect(response.body.data.sortBy).toBe('averageDuration');
      expect(response.body.data.order).toBe('desc');
    });

    test('should sort queries by different criteria', async () => {
      realTimeMonitoringService.trackQuery('Fast query', [], 50, true);
      realTimeMonitoringService.trackQuery('Slow query', [], 1500, true);

      const response = await request(app)
        .get('/api/monitoring/queries?sortBy=averageDuration&order=asc&limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.queries[0].averageDuration).toBeLessThan(
        response.body.data.queries[1].averageDuration
      );
    });

    test('should get optimization recommendations', async () => {
      // Create slow query
      for (let i = 0; i < 10; i++) {
        realTimeMonitoringService.trackQuery('SELECT * FROM large_table', [], 1500, true);
      }

      const response = await request(app)
        .get('/api/monitoring/recommendations')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.recommendations.length).toBeGreaterThan(0);
      expect(response.body.data.recommendations[0]).toHaveProperty('type');
      expect(response.body.data.recommendations[0]).toHaveProperty('suggestion');
    });
  });

  describe('Monitoring Configuration API', () => {
    test('should update monitoring thresholds', async () => {
      const newThresholds = {
        slowQuery: 2000,
        criticalQuery: 5000,
        errorRate: 0.1
      };

      const response = await request(app)
        .post('/api/monitoring/thresholds')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newThresholds)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.slowQuery).toBe(2000);
      expect(response.body.data.criticalQuery).toBe(5000);
    });

    test('should reset monitoring metrics', async () => {
      // Add some data first
      realTimeMonitoringService.trackQuery('Test query', [], 100, true);

      const response = await request(app)
        .post('/api/monitoring/reset')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset successfully');

      // Verify metrics were reset
      const metricsResponse = await request(app)
        .get('/api/monitoring/metrics')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(metricsResponse.body.data.performance.totalQueries).toBe(0);
    });

    test('should get monitoring status', async () => {
      const response = await request(app)
        .get('/api/monitoring/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isMonitoring');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('performance');
      expect(response.body.data).toHaveProperty('thresholds');
    });
  });

  describe('Error Tracking API', () => {
    test('should get error statistics', async () => {
      // Add test errors
      await errorTrackingService.trackError(new Error('Database error'), { 
        endpoint: '/api/users' 
      });
      await errorTrackingService.trackError(new Error('Auth error'), { 
        endpoint: '/api/auth' 
      });

      const response = await request(app)
        .get('/api/errors/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('byCategory');
      expect(response.body.data).toHaveProperty('bySeverity');
    });

    test('should get error groups', async () => {
      // Add similar errors to create groups
      await errorTrackingService.trackError(new Error('Connection failed'), {});
      await errorTrackingService.trackError(new Error('Connection failed'), {});
      await errorTrackingService.trackError(new Error('Timeout error'), {});

      const response = await request(app)
        .get('/api/errors/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.errorGroups.length).toBeGreaterThan(0);
    });

    test('should filter error groups by category', async () => {
      await errorTrackingService.trackError(new Error('DB connection failed'), {});
      await errorTrackingService.trackError(new Error('Invalid token'), { 
        endpoint: '/api/auth' 
      });

      const response = await request(app)
        .get('/api/errors/groups?category=authentication')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      const authErrors = response.body.data.errorGroups.filter(
        group => group.category === 'authentication'
      );
      expect(authErrors.length).toBeGreaterThan(0);
    });

    test('should get recent errors', async () => {
      await errorTrackingService.trackError(new Error('Recent error 1'), {});
      await errorTrackingService.trackError(new Error('Recent error 2'), {});

      const response = await request(app)
        .get('/api/errors/recent?limit=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.errors.length).toBeLessThanOrEqual(10);
    });

    test('should search errors', async () => {
      await errorTrackingService.trackError(new Error('Database connection timeout'), {});
      await errorTrackingService.trackError(new Error('Authentication failed'), {});

      const response = await request(app)
        .get('/api/errors/search?q=database')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results.length).toBeGreaterThan(0);
    });

    test('should require search query', async () => {
      const response = await request(app)
        .get('/api/errors/search')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('Client-side Error Tracking', () => {
    test('should track client-side errors', async () => {
      const clientError = {
        message: 'JavaScript runtime error',
        stack: 'Error: JavaScript runtime error\n    at Component.render',
        url: '/dashboard',
        userAgent: 'Mozilla/5.0...',
        category: 'client',
        severity: 'medium',
        metadata: {
          component: 'Dashboard',
          props: { userId: '123' }
        }
      };

      const response = await request(app)
        .post('/api/errors/track')
        .set('Authorization', `Bearer ${userToken}`)
        .send(clientError)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.errorId).toBeDefined();
    });

    test('should require error message for client tracking', async () => {
      const response = await request(app)
        .post('/api/errors/track')
        .set('Authorization', `Bearer ${userToken}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.type).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error Analytics', () => {
    test('should get error trends', async () => {
      // Add errors to generate trends
      for (let i = 0; i < 5; i++) {
        await errorTrackingService.trackError(new Error(`Error ${i}`), {});
      }

      const response = await request(app)
        .get('/api/errors/analytics/trends?timeRange=24h')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.trends).toHaveProperty('hourly');
      expect(response.body.data.summary).toHaveProperty('total');
    });

    test('should get top error endpoints', async () => {
      await errorTrackingService.trackError(new Error('Error 1'), { 
        endpoint: '/api/users' 
      });
      await errorTrackingService.trackError(new Error('Error 2'), { 
        endpoint: '/api/users' 
      });
      await errorTrackingService.trackError(new Error('Error 3'), { 
        endpoint: '/api/orders' 
      });

      const response = await request(app)
        .get('/api/errors/analytics/top-endpoints')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.topEndpoints.length).toBeGreaterThan(0);
      expect(response.body.data.topEndpoints[0]).toHaveProperty('endpoint');
      expect(response.body.data.topEndpoints[0]).toHaveProperty('count');
    });

    test('should get top error users', async () => {
      await errorTrackingService.trackError(new Error('Error 1'), { 
        user: { id: 'user-1' } 
      });
      await errorTrackingService.trackError(new Error('Error 2'), { 
        user: { id: 'user-1' } 
      });
      await errorTrackingService.trackError(new Error('Error 3'), { 
        user: { id: 'user-2' } 
      });

      const response = await request(app)
        .get('/api/errors/analytics/top-users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.topUsers.length).toBeGreaterThan(0);
    });
  });

  describe('Data Export', () => {
    test('should export monitoring data as JSON', async () => {
      realTimeMonitoringService.trackQuery('Export test query', [], 100, true);

      const response = await request(app)
        .get('/api/monitoring/export?format=json&timeRange=1h')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('exportTime');
      expect(response.body.data).toHaveProperty('performance');
    });

    test('should export error data as JSON', async () => {
      await errorTrackingService.trackError(new Error('Export test error'), {});

      const response = await request(app)
        .get('/api/errors/export?format=json&timeRange=24h')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('exportTime');
      expect(response.body.data).toHaveProperty('errors');
    });

    test('should export data as CSV', async () => {
      await errorTrackingService.trackError(new Error('CSV export test'), {});

      const response = await request(app)
        .get('/api/errors/export?format=csv&timeRange=24h')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.text).toContain('Timestamp,ID,Category,Severity');
    });
  });

  describe('Real-time Streaming', () => {
    test('should establish SSE connection for real-time updates', (done) => {
      const req = request(app)
        .get('/api/monitoring/stream')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Accept', 'text/event-stream');

      req.on('response', (res) => {
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toBe('text/event-stream');
        
        // Close connection after receiving headers
        req.abort();
        done();
      });
    });
  });

  describe('Authorization and Security', () => {
    test('should require admin role for all monitoring endpoints', async () => {
      const endpoints = [
        '/api/monitoring/dashboard',
        '/api/monitoring/metrics',
        '/api/monitoring/queries',
        '/api/monitoring/recommendations',
        '/api/monitoring/status',
        '/api/errors/stats',
        '/api/errors/groups',
        '/api/errors/recent'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app)
          .get(endpoint)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        expect(response.body.error.type).toBe('AUTHORIZATION_ERROR');
      }
    });

    test('should allow regular users to track client errors', async () => {
      const response = await request(app)
        .post('/api/errors/track')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          message: 'Client error',
          category: 'client'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should sanitize sensitive data in error tracking', async () => {
      const sensitiveError = {
        message: 'Authentication failed',
        metadata: {
          password: 'secret123',
          apiKey: 'key456',
          normalData: 'safe'
        }
      };

      await request(app)
        .post('/api/errors/track')
        .set('Authorization', `Bearer ${userToken}`)
        .send(sensitiveError)
        .expect(200);

      // Verify sensitive data was sanitized
      const recentErrors = await request(app)
        .get('/api/errors/recent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const trackedError = recentErrors.body.data.errors[0];
      expect(trackedError.metadata.password).toBe('[REDACTED]');
      expect(trackedError.metadata.apiKey).toBe('[REDACTED]');
      expect(trackedError.metadata.normalData).toBe('safe');
    });
  });
});
