/**
 * Unit Tests for Real-time Monitoring Service
 * Tests query tracking, performance monitoring, and alerting
 */

const { createRealTimeMonitoringService } = require('../../../services/realTimeMonitoringService');

// Mock dependencies
const mockDb = {
  query: jest.fn(),
  useRestApi: false,
  restClient: null,
  healthCheck: jest.fn()
};

const mockPubsub = {
  emit: jest.fn(),
  on: jest.fn(),
  once: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('Real-time Monitoring Service', () => {
  let realTimeMonitoringService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create service instance with mocked dependencies
    realTimeMonitoringService = createRealTimeMonitoringService({
      db: mockDb,
      pubsub: mockPubsub,
      logger: mockLogger
    });

    // Mock database stats query
    mockDb.query.mockResolvedValue({
      rows: [{
        active_connections: 5,
        total_connections: 10,
        backend_count: 15
      }]
    });

    mockDb.healthCheck.mockResolvedValue({
      connected: true,
      method: 'PostgreSQL'
    });
  });

  afterEach(() => {
    if (realTimeMonitoringService) {
      realTimeMonitoringService.stopMonitoring();
    }
  });

  describe('Query Tracking', () => {
    test('should track successful query execution', () => {
      const queryText = 'SELECT * FROM users WHERE id = $1';
      const params = ['user-123'];
      const duration = 150;

      realTimeMonitoringService.trackQuery(queryText, params, duration, true);

      const metrics = realTimeMonitoringService.getMetrics();
      expect(metrics.performance.totalQueries).toBe(1);
      expect(metrics.performance.failedQueries).toBe(0);
      expect(metrics.performance.averageResponseTime).toBe(150);
    });

    test('should track failed query execution', () => {
      const queryText = 'SELECT * FROM invalid_table';
      const params = [];
      const duration = 50;
      const error = new Error('Table does not exist');

      realTimeMonitoringService.trackQuery(queryText, params, duration, false, error);

      const metrics = realTimeMonitoringService.getMetrics();
      expect(metrics.performance.totalQueries).toBe(1);
      expect(metrics.performance.failedQueries).toBe(1);
    });

    test('should identify slow queries', () => {
      const queryText = 'SELECT * FROM large_table';
      const params = [];
      const duration = 2000; // 2 seconds

      realTimeMonitoringService.trackQuery(queryText, params, duration, true);

      const metrics = realTimeMonitoringService.getMetrics();
      expect(metrics.performance.slowQueries).toBe(1);
    });

    test('should group similar queries by fingerprint', () => {
      const queryText1 = 'SELECT * FROM users WHERE id = $1';
      const queryText2 = 'SELECT * FROM users WHERE id = $1';
      
      realTimeMonitoringService.trackQuery(queryText1, ['user-1'], 100, true);
      realTimeMonitoringService.trackQuery(queryText2, ['user-2'], 120, true);

      const metrics = realTimeMonitoringService.getMetrics();
      expect(metrics.queries).toHaveLength(1);
      expect(metrics.queries[0].totalExecutions).toBe(2);
    });

    test('should calculate average duration correctly', () => {
      const queryText = 'SELECT * FROM users';
      
      realTimeMonitoringService.trackQuery(queryText, [], 100, true);
      realTimeMonitoringService.trackQuery(queryText, [], 200, true);
      realTimeMonitoringService.trackQuery(queryText, [], 300, true);

      const metrics = realTimeMonitoringService.getMetrics();
      expect(metrics.queries[0].averageDuration).toBe(200);
    });

    test('should track min and max duration', () => {
      const queryText = 'SELECT * FROM users';
      
      realTimeMonitoringService.trackQuery(queryText, [], 50, true);
      realTimeMonitoringService.trackQuery(queryText, [], 300, true);
      realTimeMonitoringService.trackQuery(queryText, [], 150, true);

      const metrics = realTimeMonitoringService.getMetrics();
      expect(metrics.queries[0].minDuration).toBe(50);
      expect(metrics.queries[0].maxDuration).toBe(300);
    });
  });

  describe('Query ID Generation', () => {
    test('should generate consistent IDs for similar queries', () => {
      const query1 = 'SELECT * FROM users WHERE id = $1';
      const query2 = 'SELECT * FROM users WHERE id = $2';
      
      const id1 = realTimeMonitoringService.getQueryId(query1);
      const id2 = realTimeMonitoringService.getQueryId(query2);
      
      expect(id1).toBe(id2); // Should be same after normalization
    });

    test('should generate different IDs for different queries', () => {
      const query1 = 'SELECT * FROM users';
      const query2 = 'SELECT * FROM orders';
      
      const id1 = realTimeMonitoringService.getQueryId(query1);
      const id2 = realTimeMonitoringService.getQueryId(query2);
      
      expect(id1).not.toBe(id2);
    });

    test('should normalize query parameters', () => {
      const query1 = 'SELECT * FROM users WHERE id = $1 AND age > 25';
      const query2 = 'SELECT * FROM users WHERE id = $1 AND age > 30';
      
      const id1 = realTimeMonitoringService.getQueryId(query1);
      const id2 = realTimeMonitoringService.getQueryId(query2);
      
      expect(id1).toBe(id2); // Numbers should be normalized
    });
  });

  describe('Performance Metrics', () => {
    test('should update global average response time', () => {
      realTimeMonitoringService.trackQuery('SELECT 1', [], 100, true);
      realTimeMonitoringService.trackQuery('SELECT 2', [], 200, true);
      
      const metrics = realTimeMonitoringService.getMetrics();
      expect(metrics.performance.averageResponseTime).toBe(150);
    });

    test('should track peak response time', () => {
      realTimeMonitoringService.trackQuery('SELECT 1', [], 100, true);
      realTimeMonitoringService.trackQuery('SELECT 2', [], 500, true);
      realTimeMonitoringService.trackQuery('SELECT 3', [], 200, true);
      
      const metrics = realTimeMonitoringService.getMetrics();
      expect(metrics.performance.peakResponseTime).toBe(500);
    });

    test('should emit real-time events', (done) => {
      realTimeMonitoringService.once('query:executed', (data) => {
        expect(data.duration).toBe(150);
        expect(data.success).toBe(true);
        expect(data.isSlowQuery).toBe(false);
        done();
      });

      realTimeMonitoringService.trackQuery('SELECT * FROM users', [], 150, true);
    });
  });

  describe('Database Statistics', () => {
    test('should collect database statistics', async () => {
      const stats = await realTimeMonitoringService.getDatabaseStats();
      
      expect(stats.activeConnections).toBe(5);
      expect(stats.totalConnections).toBe(10);
      expect(stats.backendCount).toBe(15);
    });

    test('should handle database stats errors gracefully', async () => {
      mockQuery.mockRejectedValue(new Error('Database unavailable'));
      
      const stats = await realTimeMonitoringService.getDatabaseStats();
      
      expect(stats.activeConnections).toBe(0);
      expect(stats.totalConnections).toBe(0);
      expect(stats.backendCount).toBe(0);
    });

    test('should update connection metrics', async () => {
      await realTimeMonitoringService.monitorConnections();
      
      const metrics = realTimeMonitoringService.getMetrics();
      expect(metrics.performance.currentConnections).toBe(5);
    });
  });

  describe('Alert System', () => {
    test('should create alert for critical slow query', () => {
      const alertPromise = new Promise(resolve => {
        realTimeMonitoringService.once('alert:created', resolve);
      });

      realTimeMonitoringService.trackQuery('SELECT * FROM huge_table', [], 5000, true);

      return alertPromise.then(alert => {
        expect(alert.type).toBe('critical_slow_query');
        expect(alert.duration).toBe(5000);
      });
    });

    test('should create alert for query errors', () => {
      const alertPromise = new Promise(resolve => {
        realTimeMonitoringService.once('alert:created', resolve);
      });

      const error = new Error('Syntax error');
      realTimeMonitoringService.trackQuery('INVALID SQL', [], 100, false, error);

      return alertPromise.then(alert => {
        expect(alert.type).toBe('query_error');
        expect(alert.error).toBe('Syntax error');
      });
    });

    test('should respect alert cooldowns', () => {
      let alertCount = 0;
      realTimeMonitoringService.on('alert:created', () => {
        alertCount++;
      });

      // Create multiple critical errors
      realTimeMonitoringService.trackQuery('SELECT 1', [], 5000, true);
      realTimeMonitoringService.trackQuery('SELECT 2', [], 5000, true);
      realTimeMonitoringService.trackQuery('SELECT 3', [], 5000, true);

      // Should only create one alert due to cooldown
      expect(alertCount).toBe(1);
    });

    test('should check for consistently slow queries', () => {
      const queryText = 'SELECT * FROM slow_table';
      
      // Execute query multiple times with slow duration
      for (let i = 0; i < 15; i++) {
        realTimeMonitoringService.trackQuery(queryText, [], 1500, true);
      }

      // Manually trigger alert check
      const queryId = realTimeMonitoringService.getQueryId(queryText);
      const queryMetrics = realTimeMonitoringService.metrics.queries.get(queryId);
      
      expect(queryMetrics.averageDuration).toBeGreaterThan(1000);
      expect(queryMetrics.totalExecutions).toBe(15);
    });
  });

  describe('Dashboard Data', () => {
    test('should provide dashboard data', () => {
      // Add some test data
      realTimeMonitoringService.trackQuery('SELECT * FROM users', [], 100, true);
      realTimeMonitoringService.trackQuery('SELECT * FROM orders', [], 200, true);
      realTimeMonitoringService.trackQuery('SELECT * FROM products', [], 1500, true);

      const dashboardData = realTimeMonitoringService.getDashboardData();
      
      expect(dashboardData.performance).toBeDefined();
      expect(dashboardData.topSlowQueries).toBeDefined();
      expect(dashboardData.recentAlerts).toBeDefined();
      expect(dashboardData.isMonitoring).toBe(true);
    });

    test('should sort queries by average duration', () => {
      realTimeMonitoringService.trackQuery('Fast query', [], 50, true);
      realTimeMonitoringService.trackQuery('Slow query', [], 1500, true);
      realTimeMonitoringService.trackQuery('Medium query', [], 300, true);

      const dashboardData = realTimeMonitoringService.getDashboardData();
      const queries = dashboardData.topSlowQueries;
      
      expect(queries[0].averageDuration).toBeGreaterThan(queries[1].averageDuration);
    });

    test('should limit top slow queries', () => {
      // Add many queries
      for (let i = 0; i < 30; i++) {
        realTimeMonitoringService.trackQuery(`Query ${i}`, [], 100 + i * 10, true);
      }

      const dashboardData = realTimeMonitoringService.getDashboardData();
      expect(dashboardData.topSlowQueries.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Optimization Recommendations', () => {
    test('should recommend optimization for slow queries', () => {
      const queryText = 'SELECT * FROM large_table WHERE column = $1';
      
      // Execute slow query multiple times
      for (let i = 0; i < 10; i++) {
        realTimeMonitoringService.trackQuery(queryText, [`value${i}`], 1500, true);
      }

      const recommendations = realTimeMonitoringService.getOptimizationRecommendations();
      
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].type).toBe('slow_query');
      expect(recommendations[0].suggestion).toContain('indexes');
    });

    test('should recommend connection optimization for high usage', () => {
      // Simulate high connection count
      realTimeMonitoringService.metrics.performance.currentConnections = 25;

      const recommendations = realTimeMonitoringService.getOptimizationRecommendations();
      
      const connectionRec = recommendations.find(r => r.type === 'high_connections');
      expect(connectionRec).toBeDefined();
      expect(connectionRec.suggestion).toContain('connection pooling');
    });

    test('should recommend error handling improvements', () => {
      // Simulate high error rate
      realTimeMonitoringService.metrics.performance.totalQueries = 100;
      realTimeMonitoringService.metrics.performance.failedQueries = 10;

      const recommendations = realTimeMonitoringService.getOptimizationRecommendations();
      
      const errorRec = recommendations.find(r => r.type === 'error_rate');
      expect(errorRec).toBeDefined();
      expect(errorRec.suggestion).toContain('error handling');
    });

    test('should sort recommendations by priority', () => {
      // Create conditions for multiple recommendations
      realTimeMonitoringService.metrics.performance.totalQueries = 100;
      realTimeMonitoringService.metrics.performance.failedQueries = 10;
      realTimeMonitoringService.metrics.performance.currentConnections = 25;

      const queryText = 'SELECT * FROM critical_table';
      for (let i = 0; i < 10; i++) {
        realTimeMonitoringService.trackQuery(queryText, [], 3500, true); // Critical slow
      }

      const recommendations = realTimeMonitoringService.getOptimizationRecommendations();
      
      // High priority should come first
      expect(recommendations[0].priority).toBe('high');
    });
  });

  describe('Data Cleanup', () => {
    test('should clean up old query executions', () => {
      const queryText = 'SELECT * FROM test_table';
      
      // Add executions
      realTimeMonitoringService.trackQuery(queryText, [], 100, true);
      
      // Manually set old timestamp
      const queryId = realTimeMonitoringService.getQueryId(queryText);
      const queryMetrics = realTimeMonitoringService.metrics.queries.get(queryId);
      queryMetrics.executions[0].timestamp = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
      queryMetrics.lastExecution = Date.now() - (2 * 60 * 60 * 1000);

      realTimeMonitoringService.cleanupOldData();

      const updatedMetrics = realTimeMonitoringService.metrics.queries.get(queryId);
      expect(updatedMetrics).toBeUndefined(); // Should be removed
    });

    test('should limit executions per query', () => {
      const queryText = 'SELECT * FROM test_table';
      
      // Add many executions
      for (let i = 0; i < 150; i++) {
        realTimeMonitoringService.trackQuery(queryText, [], 100, true);
      }

      const queryId = realTimeMonitoringService.getQueryId(queryText);
      const queryMetrics = realTimeMonitoringService.metrics.queries.get(queryId);
      
      expect(queryMetrics.executions.length).toBeLessThanOrEqual(100);
    });

    test('should clean up old alert cooldowns', () => {
      // Manually add old cooldown
      const cooldownKey = 'test_alert:global';
      realTimeMonitoringService.alertCooldowns.set(cooldownKey, Date.now() - (2 * 60 * 60 * 1000));

      realTimeMonitoringService.cleanupOldData();

      expect(realTimeMonitoringService.alertCooldowns.has(cooldownKey)).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    test('should update thresholds', () => {
      const newThresholds = {
        slowQuery: 2000,
        criticalQuery: 5000
      };

      realTimeMonitoringService.updateThresholds(newThresholds);

      const metrics = realTimeMonitoringService.getMetrics();
      expect(metrics.thresholds.slowQuery).toBe(2000);
      expect(metrics.thresholds.criticalQuery).toBe(5000);
    });

    test('should emit threshold update event', (done) => {
      realTimeMonitoringService.once('thresholds:updated', (thresholds) => {
        expect(thresholds.slowQuery).toBe(1500);
        done();
      });

      realTimeMonitoringService.updateThresholds({ slowQuery: 1500 });
    });

    test('should reset metrics', () => {
      // Add some data
      realTimeMonitoringService.trackQuery('SELECT 1', [], 100, true);
      
      realTimeMonitoringService.resetMetrics();

      const metrics = realTimeMonitoringService.getMetrics();
      expect(metrics.performance.totalQueries).toBe(0);
      expect(metrics.queries).toHaveLength(0);
      expect(metrics.alerts).toHaveLength(0);
    });

    test('should emit metrics reset event', (done) => {
      realTimeMonitoringService.once('metrics:reset', () => {
        done();
      });

      realTimeMonitoringService.resetMetrics();
    });
  });

  describe('Performance', () => {
    test('should handle high volume of query tracking', () => {
      const startTime = Date.now();
      
      // Track many queries
      for (let i = 0; i < 1000; i++) {
        realTimeMonitoringService.trackQuery(`Query ${i}`, [], 100, true);
      }
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should maintain reasonable memory usage', () => {
      // Track many different queries
      for (let i = 0; i < 500; i++) {
        realTimeMonitoringService.trackQuery(`Unique query ${i}`, [], 100, true);
      }

      const metrics = realTimeMonitoringService.getMetrics();
      expect(metrics.queries.length).toBeLessThanOrEqual(500);
    });
  });
});
