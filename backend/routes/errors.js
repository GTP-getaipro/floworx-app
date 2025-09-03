/**
 * Error Tracking API Routes
 * Provides endpoints for error monitoring, analysis, and management
 */

const express = require('express');
const router = express.Router();
const errorTrackingService = require('../services/errorTrackingService');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

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
 * GET /api/errors/stats
 * Get error statistics and overview
 */
router.get('/stats', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const stats = errorTrackingService.getStats();
  
  res.json({
    success: true,
    data: stats
  });
}));

/**
 * GET /api/errors/groups
 * Get error groups with pagination and sorting
 */
router.get('/groups', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { 
    limit = 50, 
    sortBy = 'lastSeen',
    category,
    severity,
    startDate,
    endDate
  } = req.query;

  const filters = {};
  if (category) filters.category = category;
  if (severity) filters.severity = severity;
  if (startDate) filters.startDate = new Date(startDate).getTime();
  if (endDate) filters.endDate = new Date(endDate).getTime();

  const errorGroups = errorTrackingService.getErrorGroups(
    parseInt(limit), 
    sortBy
  );

  // Apply filters
  const filteredGroups = errorGroups.filter(group => {
    if (filters.category && group.category !== filters.category) return false;
    if (filters.severity && group.severity !== filters.severity) return false;
    if (filters.startDate && group.lastSeen < filters.startDate) return false;
    if (filters.endDate && group.firstSeen > filters.endDate) return false;
    return true;
  });

  res.json({
    success: true,
    data: {
      errorGroups: filteredGroups,
      total: filteredGroups.length,
      filters,
      sortBy,
      limit: parseInt(limit)
    }
  });
}));

/**
 * GET /api/errors/recent
 * Get recent individual errors
 */
router.get('/recent', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { limit = 100 } = req.query;
  
  const recentErrors = errorTrackingService.getRecentErrors(parseInt(limit));
  
  res.json({
    success: true,
    data: {
      errors: recentErrors,
      count: recentErrors.length
    }
  });
}));

/**
 * GET /api/errors/:errorId
 * Get specific error details
 */
router.get('/:errorId', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { errorId } = req.params;
  
  const error = errorTrackingService.getErrorById(errorId);
  
  if (!error) {
    return res.status(404).json({
      success: false,
      error: {
        type: 'NOT_FOUND_ERROR',
        message: 'Error not found',
        code: 404
      }
    });
  }
  
  res.json({
    success: true,
    data: error
  });
}));

/**
 * GET /api/errors/search
 * Search errors by query and filters
 */
router.get('/search', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { 
    q: query,
    category,
    severity,
    startDate,
    endDate,
    limit = 50
  } = req.query;

  if (!query) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Search query is required',
        code: 400
      }
    });
  }

  const filters = {};
  if (category) filters.category = category;
  if (severity) filters.severity = severity;
  if (startDate) filters.startDate = new Date(startDate).getTime();
  if (endDate) filters.endDate = new Date(endDate).getTime();

  const results = errorTrackingService.searchErrors(query, filters);
  
  // Limit results
  const limitedResults = results.slice(0, parseInt(limit));

  res.json({
    success: true,
    data: {
      results: limitedResults,
      total: results.length,
      query,
      filters,
      limit: parseInt(limit)
    }
  });
}));

/**
 * GET /api/errors/analytics/trends
 * Get error trends and analytics
 */
router.get('/analytics/trends', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { timeRange = '24h' } = req.query;
  const stats = errorTrackingService.getStats();
  
  // Calculate trend data based on time range
  let trendData;
  if (timeRange === '24h') {
    trendData = {
      hourly: stats.trends.hourly,
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`)
    };
  } else if (timeRange === '7d') {
    trendData = {
      daily: stats.trends.daily,
      labels: ['6d ago', '5d ago', '4d ago', '3d ago', '2d ago', '1d ago', 'Today']
    };
  } else {
    trendData = {
      hourly: stats.trends.hourly,
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`)
    };
  }

  res.json({
    success: true,
    data: {
      trends: trendData,
      timeRange,
      summary: {
        total: stats.total,
        byCategory: stats.byCategory,
        bySeverity: stats.bySeverity
      }
    }
  });
}));

/**
 * GET /api/errors/analytics/top-endpoints
 * Get endpoints with most errors
 */
router.get('/analytics/top-endpoints', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const stats = errorTrackingService.getStats();
  
  const topEndpoints = Object.entries(stats.byEndpoint)
    .sort(([,a], [,b]) => b - a)
    .slice(0, parseInt(limit))
    .map(([endpoint, count]) => ({ endpoint, count }));

  res.json({
    success: true,
    data: {
      topEndpoints,
      total: Object.keys(stats.byEndpoint).length
    }
  });
}));

/**
 * GET /api/errors/analytics/top-users
 * Get users with most errors
 */
router.get('/analytics/top-users', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;
  const stats = errorTrackingService.getStats();
  
  const topUsers = Object.entries(stats.byUser)
    .sort(([,a], [,b]) => b - a)
    .slice(0, parseInt(limit))
    .map(([userId, count]) => ({ userId, count }));

  res.json({
    success: true,
    data: {
      topUsers,
      total: Object.keys(stats.byUser).length
    }
  });
}));

/**
 * POST /api/errors/track
 * Manually track an error (for client-side errors)
 */
router.post('/track', authenticateToken, asyncHandler(async (req, res) => {
  const { 
    message, 
    stack, 
    url, 
    userAgent, 
    category = 'client',
    severity = 'medium',
    metadata = {}
  } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: {
        type: 'VALIDATION_ERROR',
        message: 'Error message is required',
        code: 400
      }
    });
  }

  // Create error object
  const error = new Error(message);
  error.stack = stack;
  error.name = 'ClientError';

  // Track the error
  const errorId = await errorTrackingService.trackError(error, {
    user: req.user,
    endpoint: url,
    userAgent,
    category,
    severity,
    metadata,
    source: 'client'
  });

  res.json({
    success: true,
    data: {
      errorId,
      message: 'Error tracked successfully'
    }
  });
}));

/**
 * DELETE /api/errors/groups/:fingerprint
 * Mark error group as resolved
 */
router.delete('/groups/:fingerprint', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { fingerprint } = req.params;
  
  // This would mark the error group as resolved
  // For now, we'll just acknowledge the request
  res.json({
    success: true,
    message: `Error group ${fingerprint} marked as resolved`
  });
}));

/**
 * GET /api/errors/export
 * Export error data
 */
router.get('/export', authenticateToken, requireAdmin, asyncHandler(async (req, res) => {
  const { 
    format = 'json',
    timeRange = '24h',
    category,
    severity
  } = req.query;

  const stats = errorTrackingService.getStats();
  const recentErrors = errorTrackingService.getRecentErrors(1000);
  
  // Filter errors based on parameters
  let filteredErrors = recentErrors;
  
  if (category) {
    filteredErrors = filteredErrors.filter(err => err.category === category);
  }
  
  if (severity) {
    filteredErrors = filteredErrors.filter(err => err.severity === severity);
  }

  // Apply time range filter
  const now = Date.now();
  const timeRanges = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000
  };
  
  const rangeMs = timeRanges[timeRange] || timeRanges['24h'];
  const startTime = now - rangeMs;
  
  filteredErrors = filteredErrors.filter(err => err.timestamp >= startTime);

  const exportData = {
    exportTime: now,
    timeRange,
    filters: { category, severity },
    stats: {
      total: filteredErrors.length,
      byCategory: {},
      bySeverity: {}
    },
    errors: filteredErrors
  };

  // Calculate filtered stats
  filteredErrors.forEach(err => {
    exportData.stats.byCategory[err.category] = (exportData.stats.byCategory[err.category] || 0) + 1;
    exportData.stats.bySeverity[err.severity] = (exportData.stats.bySeverity[err.severity] || 0) + 1;
  });

  if (format === 'csv') {
    // Convert to CSV
    const csv = convertErrorsToCSV(filteredErrors);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="errors-${timeRange}.csv"`);
    res.send(csv);
  } else {
    // Return JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="errors-${timeRange}.json"`);
    res.json({
      success: true,
      data: exportData
    });
  }
}));

/**
 * Helper function to convert errors to CSV
 */
function convertErrorsToCSV(errors) {
  const lines = [];
  
  // Add headers
  lines.push('Timestamp,ID,Category,Severity,Message,Endpoint,User ID,User Agent');
  
  // Add error data
  errors.forEach(error => {
    lines.push([
      new Date(error.timestamp).toISOString(),
      error.id,
      error.category,
      error.severity,
      error.message.replace(/,/g, ';'),
      error.requestContext?.endpoint || '',
      error.userContext?.id || '',
      error.requestContext?.userAgent || ''
    ].join(','));
  });
  
  return lines.join('\n');
}

module.exports = router;
