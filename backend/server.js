const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Enhanced security imports
const {
  helmet,
  apiRateLimit,
  authRateLimit,
  registrationRateLimit,
  passwordResetRateLimit,
  oauthRateLimit,
  authSlowDown,
  sanitizeInput,
  securityHeaders,
  handleValidationErrors
} = require('./middleware/security');

// Performance middleware imports
const {
  performanceMiddlewareStack,
  smartCompression,
  cacheHeaders
} = require('./middleware/performance');

const { initialize: initializeDatabase } = require('./database/unified-connection');
const authRoutes = require('./routes/auth');
const { router: oauthRoutes } = require('./routes/oauth');
const onboardingRoutes = require('./routes/onboarding');
const recoveryRoutes = require('./routes/recovery');
const accountRecoveryRoutes = require('./routes/accountRecovery');
const passwordResetRoutes = require('./routes/passwordReset');
const businessTypesRoutes = require('./routes/businessTypes');
const workflowRoutes = require('./routes/workflows');
const analyticsRoutes = require('./routes/analytics');
const performanceRoutes = require('./routes/performance');
const { router: schedulerRoutes, scheduler } = require('./scheduler/n8nScheduler');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for accurate IP addresses behind load balancers
app.set('trust proxy', 1);

// Enhanced security middleware stack
app.use(helmet); // Comprehensive security headers
app.use(securityHeaders); // Additional custom security headers
app.use(sanitizeInput); // Input sanitization

// Performance middleware stack
app.use(smartCompression); // Response compression
app.use(cacheHeaders); // Cache control headers
app.use(...performanceMiddlewareStack); // Performance monitoring

// CORS configuration with enhanced security
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'https://floworx-app.vercel.app',
        'https://app.floworx-iq.com',
        'http://localhost:3000',
        'http://localhost:3001'
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
app.use(express.json({
  limit: '1mb', // Reduced from 10mb for security
  strict: true,
  type: 'application/json'
}));
app.use(express.urlencoded({
  extended: true,
  limit: '1mb', // Reduced from 10mb for security
  parameterLimit: 100 // Limit number of parameters
}));

// Request validation error handling
app.use(handleValidationErrors);

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Health check endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

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

// API routes with enhanced rate limiting
app.use('/api/auth', authRateLimit, authSlowDown, authRoutes);
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

// Use centralized error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown handler
const gracefulShutdown = () => {
  console.log('\n🛑 Received shutdown signal, closing server gracefully...');

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
    } catch (_error) {
      console.warn('⚠️ Database not available - running in limited mode');
      console.warn('Install PostgreSQL and configure .env to enable full functionality');
    }

    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Floworx backend server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });

    // Start the n8n scheduler
    scheduler.start();

    // Make server available for graceful shutdown
    global.server = server;
  } catch (_error) {
    console.error('❌ Failed to start server:', _error);
    process.exit(1);
  }
};

// For Vercel serverless deployment
if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
  // Initialize database for serverless
  initializeDatabase().catch(console.error);
  module.exports = app;
} else {
  // Start server normally for development
  startServer();
}
