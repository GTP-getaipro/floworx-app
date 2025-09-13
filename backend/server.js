const cors = require('cors');
const express = require('express');
const morgan = require('morgan');

// Load environment variables with proper path resolution
const path = require('path');
const dotenv = require('dotenv');

// Try different .env file locations based on execution context
const envPaths = [
  path.resolve(__dirname, '../.env'),      // Development: .env in root from backend
  path.resolve(__dirname, '../../.env'),   // Container: .env in root from backend/config
  path.resolve(process.cwd(), '.env')      // Fallback: current working directory
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
      console.log(`✅ Environment loaded from: ${envPath}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded) {
  console.warn('⚠️ No .env file found, using system environment variables only');
}

// 🔍 TEMPORARY DEBUG - Remove after fixing Coolify issues
console.log('🔍 COOLIFY ENVIRONMENT DEBUG:');
console.log('================================');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? `SET (${process.env.DATABASE_URL.substring(0, 30)}...)` : '❌ NOT SET');
console.log('REDIS_URL:', process.env.REDIS_URL ? `SET (${process.env.REDIS_URL})` : '❌ NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || '❌ NOT SET');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : '❌ NOT SET');
console.log('DB_HOST:', process.env.DB_HOST || '❌ NOT SET (should be empty if using DATABASE_URL)');
console.log('DB_PORT:', process.env.DB_PORT || '❌ NOT SET (should be empty if using DATABASE_URL)');
console.log('PORT:', process.env.PORT || '❌ NOT SET (should be 5001)');
console.log('================================\n');

// Enhanced security imports
const { initialize: initializeDatabase } = require('./database/unified-connection');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
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
const healthRoutes = require('./routes/health'); // TEMPORARY - DELETE AFTER TESTING
const diagnosticsRoutes = require('./routes/diagnostics');
const { router: oauthRoutes } = require('./routes/oauth');
const onboardingRoutes = require('./routes/onboarding');
const passwordResetRoutes = require('./routes/passwordReset');
const performanceRoutes = require('./routes/performance');
const recoveryRoutes = require('./routes/recovery');
const testKeydbRoutes = require('./routes/test-keydb');
const userRoutes = require('./routes/user');
const workflowRoutes = require('./routes/workflows');
const { router: schedulerRoutes, scheduler } = require('./scheduler/n8nScheduler');

const app = express();
const PORT = process.env.PORT || 5001;

// Trust proxy for accurate IP addresses behind load balancers
app.set('trust proxy', 1);

// Request ID middleware for tracing
app.use((req, res, next) => {
  req.id = req.get('X-Request-ID') || require('crypto').randomBytes(16).toString('hex');
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Enhanced security middleware stack
app.use(helmet); // Comprehensive security headers
app.use(additionalSecurityHeaders); // Additional custom security headers
// app.use(securityHeaders); // Duplicate - helmet already applied above
app.use(sanitizeInput); // Input sanitization
app.use(sanitizeRequest); // Enhanced request sanitization
app.use(sanitizeResponse); // Response sanitization

// Performance middleware stack
app.use(smartCompression); // Response compression
app.use(cacheHeaders); // Cache control headers
app.use(...performanceMiddlewareStack); // Performance monitoring

// Container-aware memory monitoring for auto-scaling decisions
const ContainerMemoryMonitor = require('./utils/ContainerMemoryMonitor');

// Initialize global memory monitor
const globalMemoryMonitor = new ContainerMemoryMonitor({
  warningThreshold: 70,
  criticalThreshold: 85,
  emergencyThreshold: 95,
  monitorInterval: 30000, // 30 seconds
  enableLogging: true
});

// Set up memory monitoring events
globalMemoryMonitor.on('critical', ({ stats: _stats, relevantUsage }) => {
  console.error(`🚨 CRITICAL: Memory usage at ${relevantUsage.description}`);
  if (process.env.NODE_ENV === 'production') {
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
        ...(process.env.NODE_ENV === 'development' ? [
          'http://localhost:3000',
          'http://localhost:3001'
        ] : [])
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
    version: '1.0.0'
  });
});

// API Health check endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.1',
    environment: process.env.NODE_ENV || 'development',
    deployment: {
      buildTime: new Date().toISOString(),
      nodeVersion: process.version
    }
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
app.use('/api', testKeydbRoutes); // TEMPORARY - DELETE AFTER TESTING

// Serve static files from React build (production only)
if (process.env.NODE_ENV === 'production') {
  const path = require('path');

  // Serve static files from the React build directory
  app.use(express.static(path.join(__dirname, '../frontend/build')));

  // Handle React Router - send all non-API requests to index.html
  app.get('*', (req, res) => {
    // Skip API routes
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }

    res.sendFile(path.join(__dirname, '../frontend/build', 'index.html'));
  });
}

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
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Floworx backend server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`🌐 Server accessible on: 0.0.0.0:${PORT}`);
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
