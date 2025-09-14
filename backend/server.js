const cors = require('cors');
const express = require('express');
const morgan = require('morgan');

// Load centralized configuration
const config = require('./config/config');
const { logger } = require('./utils/logger');

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
const diagnosticsRoutes = require('./routes/diagnostics');
const errorRoutes = require('./routes/errors');
const healthRoutes = require('./routes/health');
const monitoringRoutes = require('./routes/monitoring');
const oauthRoutes = require('./routes/oauth');
const onboardingRoutes = require('./routes/onboarding');
const passwordResetRoutes = require('./routes/passwordReset');
const performanceRoutes = require('./routes/performance');
const recoveryRoutes = require('./routes/recovery');
const testKeydbRoutes = require('./routes/test-keydb');
const userRoutes = require('./routes/user');
const workflowRoutes = require('./routes/workflows');

// Initialize Express app
const app = express();

// Trust proxy for proper IP detection behind load balancers (Coolify/Docker)
app.set('trust proxy', true);

// Load configuration and get PORT
const PORT = config.get('port');

// Import performance monitoring
const performanceService = require('./services/performanceService');

// Configuration validation middleware
app.use(validateConfigurationOnStartup);
app.use(addConfigContext);

// Request ID middleware for tracking
app.use(requestIdMiddleware);

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

// Security middleware stack (after CORS)
// app.use(helmet()); // Temporarily disabled due to initialization issues
app.use(additionalSecurityHeaders);
app.use(sanitizeRequest);

// Performance middleware stack
app.use(performanceMiddlewareStack);
app.use(smartCompression);
app.use(cacheHeaders);

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
    const { healthCheck } = require('./database/unified-connection');
    const result = await healthCheck();

    if (result.connected) {
      res.json({
        database: 'connected',
        method: result.method,
        timestamp: result.timestamp,
        status: 'healthy',
        supabaseUrl: result.supabaseUrl || undefined,
        version: result.version || undefined,
        poolSize: result.poolSize || undefined
      });
    } else {
      res.status(503).json({
        database: 'disconnected',
        method: result.method,
        error: result.error,
        status: 'unhealthy'
      });
    }
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

// Root health check route for Coolify/load balancer
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'floworx-api',
    timestamp: new Date().toISOString(),
    version: config.get('deployment.version') || '1.0.0'
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
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/business-types', businessTypesRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/health', healthRoutes); // Comprehensive health monitoring
app.use('/api/diagnostics', diagnosticsRoutes); // Database connection diagnostics

app.use('/api', testKeydbRoutes);

// Error handling middleware (must be last)
app.use(standardNotFoundHandler);
app.use(standardErrorHandler);

// Graceful shutdown handler
const gracefulShutdown = () => {
  logger.info('Received shutdown signal, starting graceful shutdown...');

  // Close server
  if (global.server) {
    global.server.close(() => {
      logger.info('✅ Server closed successfully');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.warn('⚠️ Forcing server shutdown');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
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
        console.log(`🔗 Frontend URL: ${config.get('app.frontendUrl')}`);
        console.log(`🌐 Server accessible on: 0.0.0.0:${PORT}`);
      }
    });

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
} else if (config.get('nodeEnv') === 'test') {
  // For testing, export the app without starting the server
  module.exports = app;
} else {
  // Start server normally for development
  startServer();
}
