/**
 * Performance Monitoring API Routes for FloWorx SaaS
 * Provides real-time performance metrics and optimization insights
 */

const express = require('express');

const { authenticateToken } = require('../middleware/auth');
const { PerformanceAudit } = require('../scripts/performance-audit');
const cacheService = require('../services/cacheService');
const performanceService = require('../services/performanceService');
const { asyncWrapper } = require('../utils/asyncWrapper');

const router = express.Router();

// GET /api/performance
// Get basic performance overview (no auth required for testing)
router.get('/', asyncWrapper((req, res) => {
  const summary = performanceService.getPerformanceSummary();

  res.json({
    success: true,
    data: {
      uptime: summary.system.uptime,
      requestCount: summary.system.requestCount,
      errorRate: summary.system.errorRate,
      requestsPerSecond: summary.system.requestsPerSecond,
      slowRequestCount: summary.slowRequests.length,
      slowQueryCount: summary.slowQueries.length,
      status: 'healthy'
    }
  });
}));

// GET /api/performance/metrics
// Get real-time performance metrics (admin only)
router.get(
  '/metrics',
  authenticateToken,
  asyncWrapper((req, res) => {
    // Check if user is admin (implement your admin check logic)
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    const summary = performanceService.getPerformanceSummary();

    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });
  })
);

// GET /api/performance/endpoints
// Get detailed endpoint performance metrics
router.get(
  '/endpoints',
  authenticateToken,
  asyncWrapper((req, res) => {
    const { endpoint } = req.query;

    if (endpoint) {
      // Get specific endpoint metrics
      const metrics = performanceService.getEndpointMetrics(endpoint);
      if (!metrics) {
        return res.status(404).json({
          success: false,
          error: 'Endpoint metrics not found'
        });
      }

      res.json({
        success: true,
        data: metrics
      });
    } else {
      // Get all endpoint metrics
      const summary = performanceService.getPerformanceSummary();
      res.json({
        success: true,
        data: {
          slowRequests: summary.slowRequests,
          system: summary.system
        }
      });
    }
  })
);

// GET /api/performance/database
// Get database performance metrics
router.get(
  '/database',
  authenticateToken,
  asyncWrapper((req, res) => {
    const summary = performanceService.getPerformanceSummary();

    res.json({
      success: true,
      data: {
        slowQueries: summary.slowQueries,
        queryCount: summary.system.requestCount // Approximate
      }
    });
  })
);

// GET /api/performance/cache
// Get cache performance metrics
router.get(
  '/cache',
  authenticateToken,
  asyncWrapper(async (req, res) => {
    const cacheStats = cacheService.getStats();
    const cacheHealth = await cacheService.healthCheck();

    res.json({
      success: true,
      data: {
        stats: cacheStats,
        health: cacheHealth
      }
    });
  })
);

// POST /api/performance/cache/clear
// Clear cache (admin only)
router.post(
  '/cache/clear',
  authenticateToken,
  asyncWrapper(async (req, res) => {
    // Check if user is admin
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    const { pattern } = req.body;

    let clearedCount = 0;
    if (pattern) {
      clearedCount = await cacheService.deletePattern(pattern);
    } else {
      await cacheService.clear();
      clearedCount = 'all';
    }

    res.json({
      success: true,
      message: 'Cache cleared successfully',
      clearedCount
    });
  })
);

// GET /api/performance/recommendations
// Get performance optimization recommendations
router.get(
  '/recommendations',
  authenticateToken,
  asyncWrapper((req, res) => {
    const recommendations = performanceService.generateRecommendations();

    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length
    });
  })
);

// POST /api/performance/audit
// Run comprehensive performance audit
router.post(
  '/audit',
  authenticateToken,
  asyncWrapper(async (req, res) => {
    // Check if user is admin
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    try {
      const audit = new PerformanceAudit();
      const reportFile = await audit.runAudit();

      res.json({
        success: true,
        message: 'Performance audit completed',
        reportFile,
        summary: audit.results.summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Performance audit failed',
        message: error.message
      });
    }
  })
);

// GET /api/performance/system
// Get system resource metrics
router.get(
  '/system',
  authenticateToken,
  asyncWrapper((req, res) => {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const systemMetrics = {
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        usage: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1) + '%'
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid
    };

    res.json({
      success: true,
      data: systemMetrics
    });
  })
);

// GET /api/performance/health
// Comprehensive health check
router.get(
  '/health',
  asyncWrapper(async (req, res) => {
    const cacheHealth = await cacheService.healthCheck();
    const memUsage = process.memoryUsage();
    const memoryUsagePercent = memUsage.heapUsed / memUsage.heapTotal;

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        usage: (memoryUsagePercent * 100).toFixed(1) + '%',
        status: memoryUsagePercent > 0.9 ? 'critical' : memoryUsagePercent > 0.8 ? 'warning' : 'ok'
      },
      cache: cacheHealth,
      database: {
        status: 'connected' // You would check actual DB connection here
      }
    };

    // Determine overall health status
    if (health.memory.status === 'critical' || health.cache.overall === 'unhealthy') {
      health.status = 'unhealthy';
    } else if (health.memory.status === 'warning' || health.cache.overall === 'degraded') {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: health.status !== 'unhealthy',
      data: health
    });
  })
);

// POST /api/performance/reset
// Reset performance metrics (admin only)
router.post(
  '/reset',
  authenticateToken,
  asyncWrapper((req, res) => {
    // Check if user is admin
    // if (!req.user.isAdmin) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    performanceService.reset();

    res.json({
      success: true,
      message: 'Performance metrics reset successfully'
    });
  })
);

// GET /api/performance/dashboard
// Get dashboard data for performance monitoring UI
router.get(
  '/dashboard',
  authenticateToken,
  asyncWrapper(async (req, res) => {
    const [summary, cacheStats, cacheHealth] = await Promise.all([
      performanceService.getPerformanceSummary(),
      cacheService.getStats(),
      cacheService.healthCheck()
    ]);

    const memUsage = process.memoryUsage();

    const dashboard = {
      overview: {
        overallScore: Math.max(0, 100 - summary.slowRequests.length * 10),
        uptime: summary.system.uptime,
        requestCount: summary.system.requestCount,
        errorRate: summary.system.errorRate,
        requestsPerSecond: summary.system.requestsPerSecond
      },
      performance: {
        slowEndpoints: summary.slowRequests.slice(0, 5),
        slowQueries: summary.slowQueries.slice(0, 5),
        averageResponseTime:
          summary.slowRequests.length > 0
            ? Math.round(summary.slowRequests.reduce((sum, req) => sum + req.avgTime, 0) / summary.slowRequests.length)
            : 0
      },
      cache: {
        hitRate: (cacheStats.combined.hitRate * 100).toFixed(1) + '%',
        operations: cacheStats.combined.hits + cacheStats.combined.misses,
        status: cacheHealth.overall
      },
      system: {
        memoryUsage: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1) + '%',
        memoryUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
        memoryTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB'
      },
      recommendations: performanceService.generateRecommendations().slice(0, 3)
    };

    res.json({
      success: true,
      data: dashboard
    });
  })
);

module.exports = router;
