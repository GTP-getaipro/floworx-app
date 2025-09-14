const cors = require('cors');
const express = require('express');
const morgan = require('morgan');

// Load centralized configuration
const config = require('./config/config');
const logger = require('./utils/logger');

// Import configuration validation middleware
const { validateConfigurationOnStartup, addConfigContext, configHealthCheck, viewSafeConfig } = require('./middleware/configValidation');

// Enhanced security imports
const { initialize: initializeDatabase } = require('./database/unified-connection');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const {
  standardErrorHandler,
  notFoundHandler: standardNotFoundHandler,
  requestIdMiddleware,
  debugLogger
} = require('./middleware/standardErrorHandler');
const { performanceMiddlewareStack, smartCompression, cacheHeaders } = require('./middleware/performance');
const {
  helmet,
  additionalSecurityHeaders,
  apiRateLimit,
  // authRateLimit, // Not used in this file - handled in middleware/index.js
  // registrationRateLimit, // Not used in this file
  passwordResetRateLimit,
  oauthRateLimit,
  // authSlowDown, // Not used in this file - handled in middleware/index.js
  sanitizeInput,
  sanitizeRequest,
  sanitizeResponse,
  // securityHeaders, // Not used in this file
  handleValidationErrors
} = require('./middleware/security');
const accountRecoveryRoutes = require('./routes/accountRecovery');
const analyticsRoutes = require('./routes/analytics');
const authRoutes = require('./routes/auth');
const businessTypesRoutes = require('./routes/businessTypes');
const dashboardRoutes = require('./routes/dashboard');
const healthRoutes = require('./routes/health');   if (process.env.NODE_ENV === 'production') {
    console.error('🚨 Memory threshold exceeded - consider scaling');
    // TODO: Integrate with auto-scaling service
  }
});

globalMemoryMonitor.on('emergency', ({ stats: _stats, relevantUsage }) => {
  console.error(`🚨 EMERGENCY: Critical memory usage at ${relevantUsage.description}`);
  console.error('🚨 IMMEDIATE ACTION REQUIRED - System may become unstable');

  // Force garbage collection in emergency
  const gcResult = globalMemoryMonitor.forceGC();
  if (gcResult) {
    console.log('✅ Emergency garbage collection triggered');
  }
});

app.use((req, res, next) => {
  // The global monitor handles the heavy lifting
  // This middleware just adds request-level context if needed
  next();
});

// CORS configuration with enhanced security
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      const allowedOrigins = [
        process.env.FRONTEND_URL || 'https://app.floworx-iq.com',
        'https://app.floworx-iq.com',
        ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001'] : [])
      ];

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Cache-Control',
      'X-File-Name'
    ],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400 // 24 hours
  })
);

// Global rate limiting for all API routes
app.use('/api', apiRateLimit);

// Body parsing middleware with security limits
app.use(
  express.json({
    limit: '1mb', // Reduced from 10mb for security
    strict: true,
    type: 'application/json'
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: '1mb', // Reduced from 10mb for security
    parameterLimit: 100 // Limit number of parameters
  })
);

// Request validation error handling
app.use(handleValidationErrors);

// Enhanced logging middleware with Morgan
app.use(
  morgan(':requestId :method :url :status :response-time ms - :res[content-length]', {
    stream: {
      write: message => {
        console.log(message.trim());
      }
    },
    skip: req => req.path === '/health'
  })
);

// Add request ID token to Morgan
morgan.token('requestId', req => req.id);

// Error logging middleware
app.use((err, req, res, next) => {
  console.error('🚨 Error:', {
    requestId: req.id,
    method: req.method,
    path: req.path,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  next(err);
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: config.get('deployment.version')
  });
});

// API Health check endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: config.get('deployment.version'),
    environment: config.get('nodeEnv'),
    deployment: {
      buildTime: new Date().toISOString(),
      nodeVersion: process.version,
      platform: config.get('deployment.platform')
    }
  });
});

// Configuration health check endpoint
app.get('/api/health/config', configHealthCheck);

// Development-only configuration view endpoint
if (config.get('nodeEnv') !== 'production') {
  app.get('/api/config/view', viewSafeConfig);
}

app.get('/api/health/db', async (req, res) => {
  try {
    const { pool } = require('./database/unified-connection');
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({
      database: 'connected',
      timestamp: result.rows[0].current_time,
      status: 'healthy'
    });
  } catch (error) {
    res.status(503).json({
      database: 'disconnected',
      error: error.message,
      status: 'unhealthy'
    });
  }
});

// Basic user profile endpoint for testing
app.get('/api/user/profile', (req, res) => {
  // Check for authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authorization token required'
    });
  }

  // For testing purposes, return a mock profile
  res.json({
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User'
  });
});

// API routes (rate limiting handled in middleware/index.js)
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/oauth', oauthRateLimit, oauthRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/account-recovery', accountRecoveryRoutes);
app.use('/api/password-reset', passwordResetRateLimit, passwordResetRoutes);
app.use('/api/business-types', businessTypesRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/scheduler', schedulerRoutes);
app.use('/api/health', healthRoutes); // Comprehensive health monitoring
app.use('/api/diagnostics', diagnosticsRoutes); // Database connection diagnostics

app.use('/api', testKeydbRoutes);
  // Stop the scheduler
  scheduler.stop();

  // Close server
  global.server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.log('⚠️ Forcing server shutdown');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
const startServer = async () => {
  try {
    // Initialize database connection (skip if DB not available)
    try {
      await initializeDatabase();
      logger.info('Database connection initialized successfully');
    } catch (error) {
      logger.warn('Database not available - running in limited mode', { error: error.message });
      if (config.get('nodeEnv') !== 'production') {
        logger.warn('Install PostgreSQL and configure environment variables to enable full functionality');
      }
    }

    // Start the server
    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`FloworxInvite backend server started`, {
        port: PORT,
        environment: config.get('nodeEnv'),
        frontendUrl: config.get('app.frontendUrl'),
        version: config.get('deployment.version'),
        platform: config.get('deployment.platform')
      });

      // Only log detailed info in development
      if (config.get('nodeEnv') !== 'production') {
        console.log(`🚀 Floworx backend server running on port ${PORT}`);
        );
        console.log(`🔗 Frontend URL: ${config.get('app.frontendUrl')}`);
        console.log(`🌐 Server accessible on: 0.0.0.0:${PORT}`);
      }
    });

    // Start the n8n scheduler
    scheduler.start();

    // Make server available for graceful shutdown
    global.server = server;
  } catch (error) {
    logger.error('Failed to start server', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

// For Vercel serverless deployment
if (config.get('nodeEnv') === 'production' && process.env.VERCEL) {
  // Initialize database for serverless
  initializeDatabase().catch(error => logger.error('Serverless database initialization failed', { error: error.message }));
  module.exports = app;
} else {
  // Start server normally for development
  startServer();
}
