/**
 * Performance Monitoring Middleware for FloWorx SaaS
 * Tracks request performance, implements compression, and provides optimization hints
 */

const compression = require('compression');
const performanceService = require('../services/performanceService');
const cacheService = require('../services/cacheService');

/**
 * Request performance tracking middleware
 */
const performanceTracker = (req, res, next) => {
  // Add performance tracking
  performanceService.trackRequest(req, res, next);
};

/**
 * Response compression middleware with smart compression
 */
const smartCompression = compression({
  // Only compress responses larger than 1KB
  threshold: 1024,

  // Compression level (1-9, 6 is default balance of speed/compression)
  level: 6,

  // Custom filter for what to compress
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Don't compress images, videos, or already compressed content
    const contentType = res.getHeader('content-type');
    if (contentType) {
      const type = contentType.toLowerCase();
      if (
        type.includes('image/') ||
        type.includes('video/') ||
        type.includes('audio/') ||
        type.includes('application/zip') ||
        type.includes('application/gzip')
      ) {
        return false;
      }
    }

    // Use default compression filter for everything else
    return compression.filter(req, res);
  }
});

/**
 * Cache headers middleware for static content
 */
const cacheHeaders = (req, res, next) => {
  // Set cache headers based on content type and route
  const path = req.path.toLowerCase();

  if (path.includes('/api/')) {
    // API responses - short cache for dynamic content
    if (path.includes('/business-types') || path.includes('/static')) {
      // Static reference data - longer cache
      res.set({
        'Cache-Control': 'public, max-age=3600', // 1 hour
        ETag: `"${Date.now()}"` // Simple ETag
      });
    } else {
      // Dynamic API data - short cache
      res.set({
        'Cache-Control': 'private, max-age=60', // 1 minute
        Vary: 'Authorization'
      });
    }
  } else {
    // Static assets - long cache
    res.set({
      'Cache-Control': 'public, max-age=86400', // 24 hours
      ETag: `"${Date.now()}"`
    });
  }

  next();
};

/**
 * Request size limiter for performance
 */
const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = 10 * 1024 * 1024; // 10MB limit

  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      error: {
        message: 'Request entity too large',
        code: 'REQUEST_TOO_LARGE',
        maxSize: '10MB'
      }
    });
  }

  next();
};

/**
 * Response time header middleware
 */
const responseTimeHeader = (req, res, next) => {
  const startTime = Date.now();

  // Override res.end to add response time header
  const originalEnd = res.end;
  res.end = function (...args) {
    const responseTime = Date.now() - startTime;
    res.set('X-Response-Time', `${responseTime}ms`);
    originalEnd.apply(res, args);
  };

  next();
};

/**
 * Memory usage monitoring middleware
 */
const memoryMonitor = (req, res, next) => {
  const memUsage = process.memoryUsage();

  // Log memory warnings
  const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
  const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
  const memoryUsagePercent = (heapUsedMB / heapTotalMB) * 100;

  if (memoryUsagePercent > 80) {
    console.warn(
      `⚠️ High memory usage: ${memoryUsagePercent.toFixed(1)}% (${heapUsedMB.toFixed(1)}MB/${heapTotalMB.toFixed(1)}MB)`
    );
  }

  // Add memory info to response headers in development
  if (process.env.NODE_ENV === 'development') {
    res.set({
      'X-Memory-Usage': `${heapUsedMB.toFixed(1)}MB`,
      'X-Memory-Total': `${heapTotalMB.toFixed(1)}MB`
    });
  }

  next();
};

/**
 * Database connection pool monitoring
 */
const dbPoolMonitor = (req, res, next) => {
  // This would integrate with your database connection pool
  // to monitor active connections and queue size

  // Add DB pool info to response headers in development
  if (process.env.NODE_ENV === 'development') {
    // This is a placeholder - integrate with your actual DB pool
    res.set({
      'X-DB-Pool-Active': '5',
      'X-DB-Pool-Idle': '10'
    });
  }

  next();
};

/**
 * Performance optimization hints middleware
 */
const optimizationHints = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    // Add performance hints to response
    if (process.env.NODE_ENV === 'development') {
      const hints = [];

      // Check response size
      const responseSize = JSON.stringify(data).length;
      if (responseSize > 100000) {
        // 100KB
        hints.push('Consider implementing pagination for large datasets');
      }

      // Check for N+1 query patterns (simplified detection)
      if (Array.isArray(data?.data) && data.data.length > 10) {
        hints.push('Verify no N+1 query patterns in data fetching');
      }

      // Add hints to response
      if (hints.length > 0) {
        data._performanceHints = hints;
      }
    }

    originalJson.call(this, data);
  };

  next();
};

/**
 * Slow endpoint detection and alerting
 */
const slowEndpointDetector = (req, res, next) => {
  const startTime = Date.now();

  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = Date.now() - startTime;
    const endpoint = `${req.method} ${req.route?.path || req.path}`;

    // Alert on slow endpoints
    if (duration > 2000) {
      // 2 seconds
      console.warn(`🐌 Slow endpoint detected: ${endpoint} took ${duration}ms`);

      // In production, you might want to send this to a monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Example: Send to monitoring service
        // monitoringService.recordSlowEndpoint(endpoint, duration);
      }
    }

    originalEnd.apply(res, args);
  };

  next();
};

/**
 * Cache performance middleware
 */
const cachePerformanceTracker = async (req, res, next) => {
  // Track cache performance for this request
  const originalCacheGet = cacheService.get;
  const originalCacheSet = cacheService.set;

  let cacheHits = 0;
  let cacheMisses = 0;
  let cacheOperations = 0;

  // Wrap cache get method
  cacheService.get = async function (key, options) {
    cacheOperations++;
    const result = await originalCacheGet.call(this, key, options);
    if (result !== null) {
      cacheHits++;
    } else {
      cacheMisses++;
    }
    return result;
  };

  // Wrap cache set method
  cacheService.set = async function (key, value, ttl) {
    cacheOperations++;
    return await originalCacheSet.call(this, key, value, ttl);
  };

  // Restore original methods after request
  res.on('finish', () => {
    cacheService.get = originalCacheGet;
    cacheService.set = originalCacheSet;

    // Add cache performance headers in development
    if (process.env.NODE_ENV === 'development' && cacheOperations > 0) {
      const hitRate = cacheHits / (cacheHits + cacheMisses) || 0;
      res.set({
        'X-Cache-Operations': cacheOperations.toString(),
        'X-Cache-Hit-Rate': (hitRate * 100).toFixed(1) + '%'
      });
    }
  });

  next();
};

/**
 * Performance middleware stack
 */
const performanceMiddlewareStack = [
  responseTimeHeader,
  performanceTracker,
  memoryMonitor,
  dbPoolMonitor,
  requestSizeLimiter,
  cachePerformanceTracker,
  slowEndpointDetector,
  optimizationHints
];

module.exports = {
  performanceTracker,
  smartCompression,
  cacheHeaders,
  requestSizeLimiter,
  responseTimeHeader,
  memoryMonitor,
  dbPoolMonitor,
  optimizationHints,
  slowEndpointDetector,
  cachePerformanceTracker,
  performanceMiddlewareStack
};
