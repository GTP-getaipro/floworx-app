const express = require('express');
const compression = require('compression');
const cors = require('cors');
const morgan = require('morgan');

// Import middleware components
const security = require('./security');
const { errorHandler, notFoundHandler } = require('./errorHandler');
const validation = require('./validation');
const auth = require('./auth');

/**
 * Configure and export all middleware
 * @param {Express} app - Express application instance
 */
const setupMiddleware = app => {
  // Trust first proxy if behind a reverse proxy
  if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Basic middleware - always first
  app.use(compression()); // Compress responses
  app.use(morgan('combined')); // Request logging

  // Security middleware
  app.use(security.helmet); // Helmet with CSP and other security headers
  app.use(security.sanitizeInput); // Input sanitization
  app.use(security.securityHeaders); // Additional security headers

  // CORS configuration - before any routes
  const corsOptions = {
    origin: (origin, callback) => {
      const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map(o => o.trim());
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 86400 // 24 hours
  };
  app.use(cors(corsOptions));

  // Request parsing - after CORS, before routes
  app.use(
    express.json({
      limit: '10mb',
      verify: (req, res, buf) => {
        req.rawBody = buf.toString();
      }
    })
  );
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Global rate limiting - before routes
  app.use(security.apiRateLimit);

  // Apply route-specific rate limits
  app.use('/auth', security.authRateLimit, security.authSlowDown);
  app.use('/auth/register', security.registrationRateLimit);
  app.use('/auth/password-reset', security.passwordResetRateLimit);
  app.use('/auth/oauth', security.oauthRateLimit);

  // Apply account lockout protection
  app.use('/auth/login', security.accountLockoutLimiter);

  // Health check endpoint - before authentication
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Documentation - if enabled
  if (process.env.ENABLE_API_DOCS) {
    app.use('/docs', express.static('docs/api'));
  }

  // Error handling - always last
  app.use(notFoundHandler);
  app.use(errorHandler);

  // Add shutdown cleanup
  const cleanup = () => {
    // Clean any resources here
    console.log('Cleaning up before shutdown...');
    process.exit(0);
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
};

// Route-level middleware factories
const routeMiddleware = {
  /**
   * Creates middleware stack for authenticated routes
   * @param {Object} options - Middleware options
   * @param {boolean} options.requireAuth - Whether authentication is required
   * @param {string[]} options.roles - Required user roles
   * @param {Object} options.validation - Validation schema
   */
  createStack: ({ requireAuth, roles, validation: schema } = {}) => {
    const stack = [];

    // Add authentication if required
    if (requireAuth) {
      stack.push(auth.authenticateToken);
      if (roles?.length) {
        stack.push(auth.requireRoles(roles));
      }
    } else if (requireAuth === false) {
      stack.push(auth.optionalAuth);
    }

    // Add validation if schema provided
    if (schema) {
      stack.push(validation.createValidationMiddleware(schema), validation.handleValidationErrors);
    }

    return stack;
  }
};

module.exports = {
  setupMiddleware,
  routeMiddleware,
  auth,
  validation,
  security,
  errorHandler,
  notFoundHandler
};
