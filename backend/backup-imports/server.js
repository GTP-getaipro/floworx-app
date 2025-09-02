const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

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
const { router: schedulerRoutes, scheduler } = require('./scheduler/n8nScheduler');
const { apiRateLimit } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:']
      }
    }
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

// Security middleware - Apply rate limiting to all API routes
app.use('/api', apiRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/account-recovery', accountRecoveryRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/business-types', businessTypesRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/analytics', analyticsRoutes);
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
