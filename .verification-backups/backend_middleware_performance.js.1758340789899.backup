/**
 * Simple Performance Middleware
 * Replacement for the deleted performance middleware
 */

const compression = require('compression');

/**
 * Basic performance middleware stack
 */
const performanceMiddlewareStack = [
  // Basic compression
  compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }),

  // Basic response time header
  (req, res, next) => {
    const start = Date.now();

    // Override res.end to set header before response is sent
    const originalEnd = res.end;
    res.end = function(...args) {
      if (!res.headersSent) {
        const duration = Date.now() - start;
        res.set('X-Response-Time', `${duration}ms`);
      }
      originalEnd.apply(this, args);
    };

    next();
  }
];

/**
 * Smart compression middleware (simplified)
 */
const smartCompression = compression({
  level: 6,
  threshold: 1024
});

/**
 * Cache headers middleware (simplified)
 */
const cacheHeaders = (req, res, next) => {
  // Set basic cache headers for static assets
  if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
    res.set('Cache-Control', 'public, max-age=86400'); // 1 day
  } else {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  }
  next();
};

module.exports = {
  performanceMiddlewareStack,
  smartCompression,
  cacheHeaders
};
