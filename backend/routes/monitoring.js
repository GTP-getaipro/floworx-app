/**
 * Real-time Monitoring API Routes
 * Provides endpoints for performance monitoring and alerting
 *
 * Factory pattern to support dependency injection
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Create monitoring routes with injected dependencies
 * @param {Object} realTimeMonitoringService - Monitoring service instance
 * @returns {express.Router} Configured router
 */
function createMonitoringRoutes(realTimeMonitoringService) {
  const router = express.Router();

  // Middleware to check admin access
  const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({
        success: false,
        error: {
          type: 'AUTHORIZATION_ERROR',
          message: 'Admin access required',
          code: 403
        }
      });
    }
  };

/**
 * GET /api/monitoring/dashboard
 * Get real-time performance dashboard data
 */
router.get('/dashboard', authenticateToken, requireAdmin, asyncHandler((req, res) => {
  const dashboardData = realTimeMonitoringService.getDashboardData();
  
  res.json({
    success: true,
    data: dashboardData
  });
}));

/**
 * GET /api/monitoring/metrics
 * Get detailed performance metrics
 */
router.get('/metrics', authenticateToken, requireAdmin, asyncHandler((req, res) => {
  const metrics = realTimeMonitoringService.getMetrics();
  
  res.json({
    success: true,
    data: metrics
  });
}));

/**
 * GET /api/monitoring/alerts
 * Get current alerts
 */
router.get('/alerts', authenticateToken, requireAdmin, asyncHandler((req, res) => {
  const { severity, limit = 50 } = req.query;
  const metrics = realTimeMonitoringService.getMetrics();

  let alerts = metrics.alerts;

  // Filter by severity if specified
  if (severity) {
    alerts = alerts.filter(alert => alert.severity === severity);
  }

  // Sort by timestamp (newest first) and limit
  alerts = alerts
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, parseInt(limit, 10));

  res.json({
    success: true,
    data: {
      alerts,
      total: metrics.alerts.length,
      filtered: alerts.length
    }
  });
}));

/**
 * GET /api/monitoring/queries
 * Get query performance data
 */
router.get('/queries', authenticateToken, requireAdmin, asyncHandler((req, res) => {
  const { sortBy = 'averageDuration', order = 'desc', limit = 20 } = req.query;
  const metrics = realTimeMonitoringService.getMetrics();
  
  let queries = metrics.queries;
  
  // Sort queries
  queries.sort((a, b) => {
    const aVal = a[sortBy] || 0;
    const bVal = b[sortBy] || 0;
    return order === 'desc' ? bVal - aVal : aVal - bVal;
  });
  
  // Limit results
  queries = queries.slice(0, parseInt(limit, 10));

  res.json({
    success: true,
    data: {
      queries,
      total: metrics.queries.length,
      sortBy,
      order,
      limit: parseInt(limit, 10)
    }
  });
}));

/**
 * GET /api/monitoring/recommendations
 * Get optimization recommendations
 */
router.get('/recommendations', authenticateToken, requireAdmin, asyncHandler((req, res) => {
  const recommendations = realTimeMonitoringService.getOptimizationRecommendations();
  
  res.json({
    success: true,
    data: {
      recommendations,
      count: recommendations.length
    }
  });
}));

/**
 * POST /api/monitoring/thresholds
 * Update monitoring thresholds
 */
router.post('/thresholds', authenticateToken, requireAdmin, asyncHandler((req, res) => {
  const { slowQuery, criticalQuery, highConnectionCount, errorRate } = req.body;
  
  const newThresholds = {};
  if (slowQuery !== undefined) {newThresholds.slowQuery = parseInt(slowQuery, 10);}
  if (criticalQuery !== undefined) {newThresholds.criticalQuery = parseInt(criticalQuery, 10);}
  if (highConnectionCount !== undefined) {newThresholds.highConnectionCount = parseInt(highConnectionCount, 10);}
  if (errorRate !== undefined) {newThresholds.errorRate = parseFloat(errorRate);}
  
  realTimeMonitoringService.updateThresholds(newThresholds);
  
  res.json({
    success: true,
    message: 'Thresholds updated successfully',
    data: realTimeMonitoringService.getMetrics().thresholds
  });
}));

/**
 * POST /api/monitoring/reset
 * Reset monitoring metrics
 */
router.post('/reset', authenticateToken, requireAdmin, asyncHandler((req, res) => {
  realTimeMonitoringService.resetMetrics();
  
  res.json({
    success: true,
    message: 'Monitoring metrics reset successfully'
  });
}));

/**
 * GET /api/monitoring/status
 * Get monitoring service status
 */
router.get('/status', authenticateToken, requireAdmin, asyncHandler((req, res) => {
  const metrics = realTimeMonitoringService.getMetrics();
  
  res.json({
    success: true,
    data: {
      isMonitoring: realTimeMonitoringService.isMonitoring,
      uptime: process.uptime(),
      performance: metrics.performance,
      thresholds: metrics.thresholds,
      alertCount: metrics.alerts.length,
      queryCount: metrics.queries.length
    }
  });
}));

/**
 * WebSocket endpoint for real-time updates
 * GET /api/monitoring/stream
 */
router.get('/stream', authenticateToken, requireAdmin, (req, res) => {
  // Set headers for Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial data
  const initialData = realTimeMonitoringService.getDashboardData();
  res.write(`data: ${JSON.stringify({ type: 'initial', data: initialData })}\n\n`);

  // Set up event listeners
  const onQueryExecuted = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'query', data })}\n\n`);
  };

  const onAlertCreated = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'alert', data })}\n\n`);
  };

  const onMetricsUpdated = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'metrics', data })}\n\n`);
  };

  const onConnectionsUpdated = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'connections', data })}\n\n`);
  };

  // Register event listeners
  realTimeMonitoringService.on('query:executed', onQueryExecuted);
  realTimeMonitoringService.on('alert:created', onAlertCreated);
  realTimeMonitoringService.on('metrics:updated', onMetricsUpdated);
  realTimeMonitoringService.on('connections:updated', onConnectionsUpdated);

  // Handle client disconnect
  req.on('close', () => {
    realTimeMonitoringService.off('query:executed', onQueryExecuted);
    realTimeMonitoringService.off('alert:created', onAlertCreated);
    realTimeMonitoringService.off('metrics:updated', onMetricsUpdated);
    realTimeMonitoringService.off('connections:updated', onConnectionsUpdated);
  });

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: Date.now() })}\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

/**
 * GET /api/monitoring/export
 * Export monitoring data
 */
router.get('/export', authenticateToken, requireAdmin, asyncHandler((req, res) => {
  const { format = 'json', timeRange = '1h' } = req.query;
  
  const metrics = realTimeMonitoringService.getMetrics();
  const now = Date.now();
  
  // Calculate time range
  const timeRanges = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000
  };
  
  const rangeMs = timeRanges[timeRange] || timeRanges['1h'];
  const startTime = now - rangeMs;
  
  // Filter data by time range
  const filteredData = {
    exportTime: now,
    timeRange,
    performance: metrics.performance,
    queries: metrics.queries.map(query => ({
      ...query,
      executions: query.executions.filter(exec => exec.timestamp >= startTime)
    })).filter(query => query.executions.length > 0),
    alerts: metrics.alerts.filter(alert => alert.timestamp >= startTime),
    thresholds: metrics.thresholds
  };
  
  if (format === 'csv') {
    // Convert to CSV format
    const csv = convertToCSV(filteredData);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="monitoring-data-${timeRange}.csv"`);
    res.send(csv);
  } else {
    // Return JSON format
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="monitoring-data-${timeRange}.json"`);
    res.json({
      success: true,
      data: filteredData
    });
  }
}));

/**
 * Helper function to convert data to CSV
 */
function convertToCSV(data) {
  const lines = [];
  
  // Add headers
  lines.push('Type,Timestamp,Query ID,Duration,Success,Error,Message');
  
  // Add query executions
  data.queries.forEach(query => {
    query.executions.forEach(exec => {
      lines.push([
        'query',
        new Date(exec.timestamp).toISOString(),
        query.id,
        exec.duration,
        exec.success,
        exec.error || '',
        query.queryText.replace(/,/g, ';')
      ].join(','));
    });
  });
  
  // Add alerts
  data.alerts.forEach(alert => {
    lines.push([
      'alert',
      new Date(alert.timestamp).toISOString(),
      alert.queryId || '',
      '',
      '',
      alert.severity,
      alert.message.replace(/,/g, ';')
    ].join(','));
  });
  
  return lines.join('\n');
}

  return router;
}

module.exports = createMonitoringRoutes;
