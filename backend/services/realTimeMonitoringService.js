/**
 * Real-time Query Performance Monitoring Service
 * Provides live monitoring, alerting, and optimization recommendations
 */

const EventEmitter = require('events');

// Note: We avoid importing unified-connection directly to prevent circular dependencies
// Database queries are handled through event listeners and lazy loading
const { logger } = require('../utils/logger');

class RealTimeMonitoringService extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      queries: new Map(),
      alerts: [],
      performance: {
        totalQueries: 0,
        slowQueries: 0,
        failedQueries: 0,
        averageResponseTime: 0,
        peakResponseTime: 0,
        currentConnections: 0
      },
      thresholds: {
        slowQuery: 1000,      // 1 second
        criticalQuery: 3000,  // 3 seconds
        highConnectionCount: 20,
        errorRate: 0.05       // 5%
      }
    };

    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.connectionMonitoringInterval = null;
    this.alertCooldowns = new Map();
    
    // Start monitoring
    this.startMonitoring();

    // Listen for database query events to track performance
    this.setupDatabaseEventListeners();
  }

  /**
   * Setup database event listeners
   */
  setupDatabaseEventListeners() {
    // Listen for database query events from unified-connection
    process.on('database:query', (queryData) => {
      this.trackQuery(
        queryData.queryText,
        queryData.params,
        queryData.duration,
        queryData.success,
        queryData.error ? { message: queryData.error } : null
      );
    });
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) {return;}

    this.isMonitoring = true;

    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkAlerts();
      this.cleanupOldData();
    }, 30000);

    // Monitor database connections every 10 seconds
    this.connectionMonitoringInterval = setInterval(() => {
      this.monitorConnections();
    }, 10000);

    // Emit monitoring started event
    this.emit('monitoring:started');
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {return;}

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    if (this.connectionMonitoringInterval) {
      clearInterval(this.connectionMonitoringInterval);
      this.connectionMonitoringInterval = null;
    }

    console.log('⏹️ Stopped real-time query monitoring');
    this.emit('monitoring:stopped');
  }

  /**
   * Track query execution
   */
  trackQuery(queryText, params, duration, success = true, error = null) {
    const queryId = this.getQueryId(queryText);
    const timestamp = Date.now();

    // Update query metrics
    if (!this.metrics.queries.has(queryId)) {
      this.metrics.queries.set(queryId, {
        queryText: queryText.substring(0, 200),
        executions: [],
        totalExecutions: 0,
        totalDuration: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: Infinity,
        errorCount: 0,
        lastExecution: timestamp
      });
    }

    const queryMetrics = this.metrics.queries.get(queryId);
    
    // Add execution record
    queryMetrics.executions.push({
      timestamp,
      duration,
      success,
      error: error?.message,
      params: params?.length || 0
    });

    // Update aggregated metrics
    queryMetrics.totalExecutions++;
    queryMetrics.lastExecution = timestamp;

    if (success) {
      queryMetrics.totalDuration += duration;
      queryMetrics.averageDuration = queryMetrics.totalDuration / queryMetrics.totalExecutions;
      queryMetrics.maxDuration = Math.max(queryMetrics.maxDuration, duration);
      queryMetrics.minDuration = Math.min(queryMetrics.minDuration, duration);
    } else {
      queryMetrics.errorCount++;
    }

    // Update global metrics
    this.metrics.performance.totalQueries++;
    if (duration > this.metrics.thresholds.slowQuery) {
      this.metrics.performance.slowQueries++;
    }
    if (!success) {
      this.metrics.performance.failedQueries++;
    }

    // Update average response time
    this.updateGlobalAverageResponseTime(duration);
    this.metrics.performance.peakResponseTime = Math.max(
      this.metrics.performance.peakResponseTime, 
      duration
    );

    // Check for immediate alerts
    this.checkQueryAlert(queryId, queryMetrics, duration, success, error);

    // Emit real-time event
    this.emit('query:executed', {
      queryId,
      duration,
      success,
      timestamp,
      isSlowQuery: duration > this.metrics.thresholds.slowQuery
    });

    // Keep only last 100 executions per query
    if (queryMetrics.executions.length > 100) {
      queryMetrics.executions = queryMetrics.executions.slice(-100);
    }
  }

  /**
   * Get query identifier
   */
  getQueryId(queryText) {
    // Normalize query text for grouping
    const normalized = queryText
      .replace(/\s+/g, ' ')
      .replace(/\$\d+/g, '$?')
      .replace(/\d+/g, 'N')
      .trim()
      .toLowerCase();
    
    return require('crypto')
      .createHash('md5')
      .update(normalized)
      .digest('hex')
      .substring(0, 8);
  }

  /**
   * Update global average response time
   */
  updateGlobalAverageResponseTime(newDuration) {
    const currentAvg = this.metrics.performance.averageResponseTime;
    const totalQueries = this.metrics.performance.totalQueries;
    
    this.metrics.performance.averageResponseTime = 
      ((currentAvg * (totalQueries - 1)) + newDuration) / totalQueries;
  }

  /**
   * Collect system metrics
   */
  async collectMetrics() {
    try {
      // Get database statistics
      const dbStats = await this.getDatabaseStats();
      
      // Update connection count
      this.metrics.performance.currentConnections = dbStats.activeConnections;

      // Emit metrics update
      this.emit('metrics:updated', {
        timestamp: Date.now(),
        performance: this.metrics.performance,
        dbStats
      });

    } catch (error) {
      logger.error('Failed to collect metrics', { error: error.message });
    }
  }

  /**
   * Get database statistics
   * Compatible with both REST API and direct PostgreSQL connections
   */
  async getDatabaseStats() {
    try {
      // Lazy load to avoid circular dependency
      const { databaseManager, query } = require('../database/unified-connection');

      // If using REST API, return mock stats since PostgreSQL stats aren't available
      if (databaseManager.useRestApi && databaseManager.restClient) {
        // For REST API, we can't get PostgreSQL connection stats
        // Return basic health status instead
        const healthCheck = await databaseManager.healthCheck();
        return {
          activeConnections: healthCheck.connected ? 1 : 0,
          totalConnections: healthCheck.connected ? 1 : 0,
          backendCount: healthCheck.connected ? 1 : 0,
          connectionMethod: 'REST API',
          status: healthCheck.connected ? 'healthy' : 'unhealthy'
        };
      }

      // For direct PostgreSQL connections, get actual stats
      const stats = await query(`
        SELECT
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT count(*) FROM pg_stat_activity) as total_connections,
          (SELECT sum(numbackends) FROM pg_stat_database) as backend_count
      `);

      return {
        activeConnections: parseInt(stats.rows[0].active_connections, 10) || 0,
        totalConnections: parseInt(stats.rows[0].total_connections, 10) || 0,
        backendCount: parseInt(stats.rows[0].backend_count, 10) || 0,
        connectionMethod: 'PostgreSQL',
        status: 'healthy'
      };
    } catch (error) {
      logger.error('Failed to get database stats', { error: error.message });
      return {
        activeConnections: 0,
        totalConnections: 0,
        backendCount: 0,
        connectionMethod: 'unknown',
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Check for alerts
   */
  checkAlerts() {
    const now = Date.now();
    
    // Check global performance alerts
    this.checkGlobalPerformanceAlerts();
    
    // Check individual query alerts
    for (const [queryId, queryMetrics] of this.metrics.queries) {
      this.checkQueryPerformanceAlerts(queryId, queryMetrics);
    }

    // Clean up old alerts
    this.metrics.alerts = this.metrics.alerts.filter(
      alert => now - alert.timestamp < 24 * 60 * 60 * 1000 // Keep for 24 hours
    );
  }

  /**
   * Check global performance alerts
   */
  checkGlobalPerformanceAlerts() {
    const perf = this.metrics.performance;
    const _now = Date.now();

    // High error rate alert
    const errorRate = perf.totalQueries > 0 ? perf.failedQueries / perf.totalQueries : 0;
    if (errorRate > this.metrics.thresholds.errorRate) {
      this.createAlert('high_error_rate', 'critical', {
        message: `High error rate detected: ${(errorRate * 100).toFixed(2)}%`,
        errorRate,
        totalQueries: perf.totalQueries,
        failedQueries: perf.failedQueries
      });
    }

    // High connection count alert
    if (perf.currentConnections > this.metrics.thresholds.highConnectionCount) {
      this.createAlert('high_connection_count', 'warning', {
        message: `High connection count: ${perf.currentConnections}`,
        connectionCount: perf.currentConnections,
        threshold: this.metrics.thresholds.highConnectionCount
      });
    }

    // Slow average response time alert
    if (perf.averageResponseTime > this.metrics.thresholds.slowQuery) {
      this.createAlert('slow_average_response', 'warning', {
        message: `Slow average response time: ${perf.averageResponseTime.toFixed(2)}ms`,
        averageResponseTime: perf.averageResponseTime,
        threshold: this.metrics.thresholds.slowQuery
      });
    }
  }

  /**
   * Check query-specific alerts
   */
  checkQueryAlert(queryId, queryMetrics, duration, success, error) {
    // Critical slow query alert
    if (duration > this.metrics.thresholds.criticalQuery) {
      this.createAlert('critical_slow_query', 'critical', {
        message: `Critical slow query detected: ${duration}ms`,
        queryId,
        duration,
        queryText: queryMetrics.queryText
      });
    }

    // Query error alert
    if (!success && error) {
      this.createAlert('query_error', 'error', {
        message: `Query execution failed: ${error.message}`,
        queryId,
        error: error.message,
        queryText: queryMetrics.queryText
      });
    }
  }

  /**
   * Check query performance alerts
   */
  checkQueryPerformanceAlerts(queryId, queryMetrics) {
    // Consistently slow query alert
    if (queryMetrics.totalExecutions >= 10 && 
        queryMetrics.averageDuration > this.metrics.thresholds.slowQuery) {
      this.createAlert('consistently_slow_query', 'warning', {
        message: `Query consistently slow: ${queryMetrics.averageDuration.toFixed(2)}ms average`,
        queryId,
        averageDuration: queryMetrics.averageDuration,
        totalExecutions: queryMetrics.totalExecutions,
        queryText: queryMetrics.queryText
      });
    }

    // High error rate for specific query
    const errorRate = queryMetrics.errorCount / queryMetrics.totalExecutions;
    if (queryMetrics.totalExecutions >= 5 && errorRate > 0.2) { // 20% error rate
      this.createAlert('high_query_error_rate', 'error', {
        message: `High error rate for query: ${(errorRate * 100).toFixed(2)}%`,
        queryId,
        errorRate,
        errorCount: queryMetrics.errorCount,
        totalExecutions: queryMetrics.totalExecutions,
        queryText: queryMetrics.queryText
      });
    }
  }

  /**
   * Create alert with cooldown
   */
  createAlert(type, severity, data) {
    const now = Date.now();
    const cooldownKey = `${type}:${data.queryId || 'global'}`;
    const cooldownPeriod = severity === 'critical' ? 5 * 60 * 1000 : 15 * 60 * 1000; // 5 or 15 minutes

    // Check cooldown
    if (this.alertCooldowns.has(cooldownKey)) {
      const lastAlert = this.alertCooldowns.get(cooldownKey);
      if (now - lastAlert < cooldownPeriod) {
        return; // Skip alert due to cooldown
      }
    }

    // Create alert
    const alert = {
      id: require('crypto').randomBytes(8).toString('hex'),
      type,
      severity,
      timestamp: now,
      ...data
    };

    this.metrics.alerts.push(alert);
    this.alertCooldowns.set(cooldownKey, now);

    // Log alert
    logger.warn('Performance alert created', alert);

    // Emit alert event
    this.emit('alert:created', alert);

    return alert;
  }

  /**
   * Monitor database connections
   */
  async monitorConnections() {
    try {
      const dbStats = await this.getDatabaseStats();
      this.metrics.performance.currentConnections = dbStats.activeConnections;

      this.emit('connections:updated', {
        timestamp: Date.now(),
        ...dbStats
      });
    } catch (error) {
      logger.error('Connection monitoring failed', { error: error.message });
    }
  }

  /**
   * Clean up old data
   */
  cleanupOldData() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    // Clean up old query executions
    for (const [queryId, queryMetrics] of this.metrics.queries) {
      queryMetrics.executions = queryMetrics.executions.filter(
        execution => now - execution.timestamp < maxAge
      );

      // Remove queries with no recent executions
      if (queryMetrics.executions.length === 0 && 
          now - queryMetrics.lastExecution > maxAge) {
        this.metrics.queries.delete(queryId);
      }
    }

    // Clean up old alert cooldowns
    for (const [key, timestamp] of this.alertCooldowns) {
      if (now - timestamp > 60 * 60 * 1000) { // 1 hour
        this.alertCooldowns.delete(key);
      }
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      performance: { ...this.metrics.performance },
      queries: Array.from(this.metrics.queries.entries()).map(([id, metrics]) => ({
        id,
        ...metrics,
        executions: metrics.executions.slice(-10) // Last 10 executions
      })),
      alerts: [...this.metrics.alerts],
      thresholds: { ...this.metrics.thresholds }
    };
  }

  /**
   * Get performance dashboard data
   */
  getDashboardData() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;

    // Get recent query performance
    const recentQueries = Array.from(this.metrics.queries.entries())
      .map(([id, metrics]) => ({
        id,
        queryText: metrics.queryText,
        averageDuration: metrics.averageDuration,
        totalExecutions: metrics.totalExecutions,
        errorCount: metrics.errorCount,
        lastExecution: metrics.lastExecution,
        recentExecutions: metrics.executions.filter(
          exec => exec.timestamp > oneHourAgo
        ).length
      }))
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 20);

    // Get recent alerts
    const recentAlerts = this.metrics.alerts
      .filter(alert => alert.timestamp > oneHourAgo)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    return {
      timestamp: now,
      performance: this.metrics.performance,
      topSlowQueries: recentQueries,
      recentAlerts,
      isMonitoring: this.isMonitoring
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations() {
    const recommendations = [];

    // Analyze slow queries
    for (const [queryId, metrics] of this.metrics.queries) {
      if (metrics.averageDuration > this.metrics.thresholds.slowQuery && 
          metrics.totalExecutions >= 5) {
        recommendations.push({
          type: 'slow_query',
          priority: metrics.averageDuration > this.metrics.thresholds.criticalQuery ? 'high' : 'medium',
          queryId,
          queryText: metrics.queryText,
          averageDuration: metrics.averageDuration,
          suggestion: 'Consider adding indexes, optimizing query structure, or implementing caching'
        });
      }
    }

    // Check connection usage
    if (this.metrics.performance.currentConnections > this.metrics.thresholds.highConnectionCount * 0.8) {
      recommendations.push({
        type: 'high_connections',
        priority: 'medium',
        currentConnections: this.metrics.performance.currentConnections,
        suggestion: 'Consider optimizing connection pooling or implementing connection limits'
      });
    }

    // Check error rates
    const errorRate = this.metrics.performance.totalQueries > 0 ? 
      this.metrics.performance.failedQueries / this.metrics.performance.totalQueries : 0;
    
    if (errorRate > this.metrics.thresholds.errorRate * 0.5) {
      recommendations.push({
        type: 'error_rate',
        priority: errorRate > this.metrics.thresholds.errorRate ? 'high' : 'medium',
        errorRate,
        suggestion: 'Review error logs and implement better error handling'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Update thresholds
   */
  updateThresholds(newThresholds) {
    this.metrics.thresholds = { ...this.metrics.thresholds, ...newThresholds };
    logger.info('Monitoring thresholds updated', this.metrics.thresholds);
    this.emit('thresholds:updated', this.metrics.thresholds);
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics.queries.clear();
    this.metrics.alerts = [];
    this.metrics.performance = {
      totalQueries: 0,
      slowQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0,
      peakResponseTime: 0,
      currentConnections: 0
    };

    logger.info('Monitoring metrics reset');
    this.emit('metrics:reset');
  }
}

// Export singleton instance
const realTimeMonitoringService = new RealTimeMonitoringService();
module.exports = realTimeMonitoringService;
