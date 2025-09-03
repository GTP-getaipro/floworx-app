/**
 * Performance Monitoring Service for FloWorx SaaS
 * Tracks API response times, database query performance, and system metrics
 */

const { performance } = require('perf_hooks');
const cacheService = require('./cacheService');

/**
 * Performance monitoring and optimization service
 */
class PerformanceService {
  constructor() {
    this.metrics = {
      requests: new Map(),
      queries: new Map(),
      cache: new Map(),
      system: {
        startTime: Date.now(),
        requestCount: 0,
        errorCount: 0,
        slowRequestCount: 0,
        slowQueryCount: 0
      }
    };

    // Performance thresholds (milliseconds)
    this.thresholds = {
      slowRequest: 1000, // 1 second
      slowQuery: 500, // 500ms
      slowCache: 50, // 50ms
      criticalRequest: 5000 // 5 seconds
    };

    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Track API request performance
   */
  trackRequest(req, res, next) {
    const startTime = performance.now();
    const requestId = `${req.method}:${req.path}`;

    // Track request start
    req.performanceStart = startTime;
    req.requestId = requestId;

    // Override res.end to capture completion time
    const originalEnd = res.end;
    res.end = function (...args) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Update metrics
      this.updateRequestMetrics(requestId, duration, res.statusCode);

      // Log slow requests
      if (duration > this.thresholds.slowRequest) {
        console.warn(`🐌 Slow Request (${duration.toFixed(2)}ms): ${req.method} ${req.path}`);
        this.metrics.system.slowRequestCount++;
      }

      // Log critical requests
      if (duration > this.thresholds.criticalRequest) {
        console.error(`🚨 Critical Slow Request (${duration.toFixed(2)}ms): ${req.method} ${req.path}`);
      }

      originalEnd.apply(res, args);
    }.bind(this);

    next();
  }

  /**
   * Update request metrics
   */
  updateRequestMetrics(requestId, duration, statusCode) {
    if (!this.metrics.requests.has(requestId)) {
      this.metrics.requests.set(requestId, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0,
        errors: 0,
        lastAccess: Date.now()
      });
    }

    const metric = this.metrics.requests.get(requestId);
    metric.count++;
    metric.totalTime += duration;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.avgTime = metric.totalTime / metric.count;
    metric.lastAccess = Date.now();

    if (statusCode >= 400) {
      metric.errors++;
      this.metrics.system.errorCount++;
    }

    this.metrics.system.requestCount++;
  }

  /**
   * Track database query performance
   */
  async trackQuery(queryText, params, executeFunction) {
    const startTime = performance.now();
    const queryId = this.getQueryId(queryText);

    try {
      const result = await executeFunction();
      const duration = performance.now() - startTime;

      this.updateQueryMetrics(queryId, duration, true);

      // Log slow queries
      if (duration > this.thresholds.slowQuery) {
        console.warn(`🐌 Slow Query (${duration.toFixed(2)}ms): ${queryText.substring(0, 100)}...`);
        this.metrics.system.slowQueryCount++;
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.updateQueryMetrics(queryId, duration, false);
      throw error;
    }
  }

  /**
   * Update query metrics
   */
  updateQueryMetrics(queryId, duration, success) {
    if (!this.metrics.queries.has(queryId)) {
      this.metrics.queries.set(queryId, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0,
        errors: 0,
        lastAccess: Date.now()
      });
    }

    const metric = this.metrics.queries.get(queryId);
    metric.count++;
    metric.totalTime += duration;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.avgTime = metric.totalTime / metric.count;
    metric.lastAccess = Date.now();

    if (!success) {
      metric.errors++;
    }
  }

  /**
   * Track cache operation performance
   */
  async trackCacheOperation(operation, key, executeFunction) {
    const startTime = performance.now();

    try {
      const result = await executeFunction();
      const duration = performance.now() - startTime;

      this.updateCacheMetrics(operation, duration, true);

      // Log slow cache operations
      if (duration > this.thresholds.slowCache) {
        console.warn(`🐌 Slow Cache ${operation} (${duration.toFixed(2)}ms): ${key}`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.updateCacheMetrics(operation, duration, false);
      throw error;
    }
  }

  /**
   * Update cache metrics
   */
  updateCacheMetrics(operation, duration, success) {
    if (!this.metrics.cache.has(operation)) {
      this.metrics.cache.set(operation, {
        count: 0,
        totalTime: 0,
        minTime: Infinity,
        maxTime: 0,
        avgTime: 0,
        errors: 0,
        lastAccess: Date.now()
      });
    }

    const metric = this.metrics.cache.get(operation);
    metric.count++;
    metric.totalTime += duration;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.avgTime = metric.totalTime / metric.count;
    metric.lastAccess = Date.now();

    if (!success) {
      metric.errors++;
    }
  }

  /**
   * Get normalized query ID for grouping similar queries
   */
  getQueryId(queryText) {
    return queryText
      .replace(/\$\d+/g, '$?') // Replace parameters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/IN\s*\([^)]+\)/gi, 'IN (?)') // Normalize IN clauses
      .trim()
      .substring(0, 200); // Limit length
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const uptime = Date.now() - this.metrics.system.startTime;

    // Top slow requests
    const slowRequests = Array.from(this.metrics.requests.entries())
      .sort(([, a], [, b]) => b.avgTime - a.avgTime)
      .slice(0, 10)
      .map(([path, metrics]) => ({
        path,
        avgTime: Math.round(metrics.avgTime),
        maxTime: Math.round(metrics.maxTime),
        count: metrics.count,
        errorRate: ((metrics.errors / metrics.count) * 100).toFixed(1)
      }));

    // Top slow queries
    const slowQueries = Array.from(this.metrics.queries.entries())
      .sort(([, a], [, b]) => b.avgTime - a.avgTime)
      .slice(0, 10)
      .map(([query, metrics]) => ({
        query: query.substring(0, 100) + '...',
        avgTime: Math.round(metrics.avgTime),
        maxTime: Math.round(metrics.maxTime),
        count: metrics.count,
        errorRate: ((metrics.errors / metrics.count) * 100).toFixed(1)
      }));

    return {
      system: {
        uptime: Math.round(uptime / 1000), // seconds
        requestCount: this.metrics.system.requestCount,
        errorCount: this.metrics.system.errorCount,
        slowRequestCount: this.metrics.system.slowRequestCount,
        slowQueryCount: this.metrics.system.slowQueryCount,
        errorRate: ((this.metrics.system.errorCount / this.metrics.system.requestCount) * 100).toFixed(2),
        requestsPerSecond: (this.metrics.system.requestCount / (uptime / 1000)).toFixed(2)
      },
      slowRequests,
      slowQueries,
      cache: cacheService.getStats(),
      thresholds: this.thresholds
    };
  }

  /**
   * Get detailed metrics for specific endpoint
   */
  getEndpointMetrics(endpoint) {
    const requestMetrics = this.metrics.requests.get(endpoint);
    if (!requestMetrics) {
      return null;
    }

    return {
      endpoint,
      metrics: {
        ...requestMetrics,
        avgTime: Math.round(requestMetrics.avgTime),
        minTime: Math.round(requestMetrics.minTime),
        maxTime: Math.round(requestMetrics.maxTime),
        errorRate: ((requestMetrics.errors / requestMetrics.count) * 100).toFixed(2)
      }
    };
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    const summary = this.getPerformanceSummary();

    // Check for slow requests
    summary.slowRequests.forEach(request => {
      if (request.avgTime > this.thresholds.slowRequest) {
        recommendations.push({
          type: 'slow_request',
          priority: request.avgTime > this.thresholds.criticalRequest ? 'high' : 'medium',
          message: `Endpoint ${request.path} has slow average response time: ${request.avgTime}ms`,
          suggestion: 'Consider adding caching, optimizing queries, or implementing pagination'
        });
      }
    });

    // Check for slow queries
    summary.slowQueries.forEach(query => {
      if (query.avgTime > this.thresholds.slowQuery) {
        recommendations.push({
          type: 'slow_query',
          priority: query.avgTime > 1000 ? 'high' : 'medium',
          message: `Database query has slow average time: ${query.avgTime}ms`,
          suggestion: 'Consider adding indexes, optimizing query structure, or implementing caching'
        });
      }
    });

    // Check cache hit rate
    if (summary.cache.combined.hitRate < 0.7) {
      recommendations.push({
        type: 'low_cache_hit_rate',
        priority: 'medium',
        message: `Cache hit rate is low: ${(summary.cache.combined.hitRate * 100).toFixed(1)}%`,
        suggestion: 'Review caching strategy and TTL values'
      });
    }

    // Check error rate
    if (parseFloat(summary.system.errorRate) > 5) {
      recommendations.push({
        type: 'high_error_rate',
        priority: 'high',
        message: `High error rate: ${summary.system.errorRate}%`,
        suggestion: 'Investigate and fix recurring errors'
      });
    }

    return recommendations;
  }

  /**
   * Start periodic cleanup of old metrics
   */
  startCleanup() {
    setInterval(
      () => {
        this.cleanupOldMetrics();
      },
      5 * 60 * 1000
    ); // Every 5 minutes
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  cleanupOldMetrics() {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    // Clean up request metrics
    for (const [key, metric] of this.metrics.requests.entries()) {
      if (metric.lastAccess < cutoffTime) {
        this.metrics.requests.delete(key);
      }
    }

    // Clean up query metrics
    for (const [key, metric] of this.metrics.queries.entries()) {
      if (metric.lastAccess < cutoffTime) {
        this.metrics.queries.delete(key);
      }
    }

    // Clean up cache metrics
    for (const [key, metric] of this.metrics.cache.entries()) {
      if (metric.lastAccess < cutoffTime) {
        this.metrics.cache.delete(key);
      }
    }
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.requests.clear();
    this.metrics.queries.clear();
    this.metrics.cache.clear();
    this.metrics.system = {
      startTime: Date.now(),
      requestCount: 0,
      errorCount: 0,
      slowRequestCount: 0,
      slowQueryCount: 0
    };
  }
}

// Create singleton instance
const performanceService = new PerformanceService();

module.exports = performanceService;
