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
  // Only compress responses larger than 512 bytes (reduced for better performance)
  threshold: 512,

  // Higher compression level for better performance (7 is good balance)
  level: 7,

  // Custom filter for what to compress
  filter: (req, res) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Skip compression for very small responses
    const contentLength = res.getHeader('content-length');
    if (contentLength && parseInt(contentLength) < 512) {
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
  },

  // Optimized settings for better performance
  chunkSize: 8 * 1024, // 8KB chunks for faster streaming
  memLevel: 9, // Higher memory usage for better compression
  windowBits: 15 // Standard window size
});

/**
 * Enhanced cache headers middleware for optimal performance
 */
const cacheHeaders = (req, res, next) => {
  // Set cache headers based on content type and route
  const path = req.path.toLowerCase();

  if (path.includes('/api/')) {
    // API responses - optimized caching strategy
    if (path.includes('/business-types') || path.includes('/static') || path.includes('/health')) {
      // Static reference data and health checks - longer cache
      res.set({
        'Cache-Control': 'public, max-age=1800, s-maxage=3600', // 30min client, 1hr CDN
        ETag: `"${Date.now()}"`,
        'Last-Modified': new Date().toUTCString()
      });
    } else if (path.includes('/auth/') || path.includes('/user/')) {
      // Auth and user data - no cache for security
      res.set({
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
    } else {
      // Dynamic API data - short cache with validation
      res.set({
        'Cache-Control': 'private, max-age=300, must-revalidate', // 5 minutes
        'Vary': 'Authorization, Accept-Encoding'
      });
    }
  } else {
    // Static assets - aggressive caching with versioning
    if (path.includes('.js') || path.includes('.css')) {
      // JavaScript and CSS - long cache with immutable
      res.set({
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
        'ETag': `"${Date.now()}"`,
        'Last-Modified': new Date().toUTCString()
      });
    } else {
      // Other static assets - moderate cache
      res.set({
        'Cache-Control': 'public, max-age=86400', // 24 hours
        'ETag': `"${Date.now()}"`
      });
    }
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

    // Only set header if headers haven't been sent yet
    if (!res.headersSent) {
      try {
        res.set('X-Response-Time', `${responseTime}ms`);
      } catch (error) {
        // Silently ignore header setting errors to prevent crashes
        console.warn('Failed to set response time header:', error.message);
      }
    }

    return originalEnd.apply(res, args);
  };

  next();
};

/**
 * Container-aware memory usage monitoring middleware
 */
const ContainerMemoryMonitor = require('../utils/ContainerMemoryMonitor');

// Create a shared memory monitor instance
const sharedMemoryMonitor = new ContainerMemoryMonitor({
  warningThreshold: 70,
  criticalThreshold: 85,
  emergencyThreshold: 95,
  monitorInterval: 60000, // 1 minute for middleware
  enableLogging: true
});

const memoryMonitor = (req, res, next) => {
  const stats = sharedMemoryMonitor.getMemoryStats();
  const relevantUsage = stats.relevantUsage;

  // Log warnings based on container-aware memory usage
  if (relevantUsage.percent > 80) {
    console.warn(`⚠️ High memory usage: ${relevantUsage.description}`);
  }

  // Add comprehensive memory info to response headers in development
  if (process.env.NODE_ENV === 'development') {
    res.set({
      'X-Memory-Type': relevantUsage.type,
      'X-Memory-Usage': `${relevantUsage.used}MB`,
      'X-Memory-Limit': `${relevantUsage.limit}MB`,
      'X-Memory-Percent': `${relevantUsage.percent}%`,
      'X-Container': stats.container.isContainer ? 'true' : 'false',
      'X-Cgroup-Version': stats.container.cgroupVersion || 'none'
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
const cachePerformanceTracker = (req, res, next) => {
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
  cacheService.set = function (key, value, ttl) {
    cacheOperations++;
    return originalCacheSet.call(this, key, value, ttl);
  };

  // Override res.end to add cache headers before response is sent
  const originalEnd = res.end;
  res.end = function (...args) {
    // Add cache performance headers in development BEFORE sending response
    if (process.env.NODE_ENV === 'development' && cacheOperations > 0 && !res.headersSent) {
      try {
        const hitRate = cacheHits / (cacheHits + cacheMisses) || 0;
        res.set({
          'X-Cache-Operations': cacheOperations.toString(),
          'X-Cache-Hit-Rate': (hitRate * 100).toFixed(1) + '%'
        });
      } catch (error) {
        // Silently ignore header setting errors to prevent crashes
        console.warn('Failed to set cache performance headers:', error.message);
      }
    }

    return originalEnd.apply(res, args);
  };

  // Restore original methods after request
  res.on('finish', () => {
    cacheService.get = originalCacheGet;
    cacheService.set = originalCacheSet;
  });

  next();
};

/**
 * Frontend asset optimization middleware
 */
const frontendAssetOptimizer = (req, res, next) => {
  const path = req.path.toLowerCase();

  // Optimize frontend asset delivery
  if (path.includes('/static/') || path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.html')) {
    // Enable HTTP/2 Server Push hints for critical resources
    if (path.endsWith('.html')) {
      res.set('Link', [
        '</static/css/main.css>; rel=preload; as=style',
        '</static/js/main.js>; rel=preload; as=script'
      ].join(', '));
    }

    // Add performance hints
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    });

    // Enable Brotli compression preference
    const acceptEncoding = req.headers['accept-encoding'] || '';
    if (acceptEncoding.includes('br')) {
      res.set('Vary', 'Accept-Encoding');
    }
  }

  next();
};

/**
 * Performance middleware stack
 */
const performanceMiddlewareStack = [
  responseTimeHeader,
  performanceTracker,
  frontendAssetOptimizer,
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
  frontendAssetOptimizer,
  performanceMiddlewareStack
};
