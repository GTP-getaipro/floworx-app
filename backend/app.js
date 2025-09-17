// app.js - Express app for testing (without server startup)
require('dotenv').config();

// Validate environment variables early (fail-fast in dev, warn in prod)
const { validateEnvironment } = require('./utils/env');
validateEnvironment();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
// const { performanceMiddlewareStack } = require('./middleware/performance');
const { additionalSecurityHeaders, sanitizeRequest } = require('./middleware/security');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const oauthRoutes = require('./routes/oauth');
const dashboardRoutes = require('./routes/dashboard');
const businessTypesRoutes = require('./routes/businessTypes');
const onboardingRoutes = require('./routes/onboarding');
const workflowRoutes = require('./routes/workflows');
const analyticsRoutes = require('./routes/analytics');
const monitoringRoutes = require('./routes/monitoring');
const passwordResetRoutes = require('./routes/passwordReset');
const recoveryRoutes = require('./routes/recovery');
const errorRoutes = require('./routes/errors');

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.floworx-iq.com", "wss://api.floworx-iq.com"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://floworx-app.vercel.app',
      'https://app.floworx-iq.com',
      'https://www.floworx-iq.com'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Custom middleware
app.use(additionalSecurityHeaders);
app.use(sanitizeRequest);

// Health check endpoints (before other routes)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/healthz', (req, res) => {
  const { getKeyDBStatus } = require('./database/unified-connection');
  const { getDbStatus, getEnvStatus } = require('./utils/env');

  const cacheStatus = getKeyDBStatus();
  const dbStatus = getDbStatus();
  const envStatus = getEnvStatus();

  res.status(200).json({
    ok: true,
    cache: cacheStatus,
    db: dbStatus,
    env: envStatus
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/business-types', businessTypesRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/errors', errorRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      type: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found`
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
