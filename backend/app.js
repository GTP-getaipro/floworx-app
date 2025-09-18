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
const cookieParser = require('cookie-parser');

// Import middleware
const { errorHandler } = require('./middleware/errorHandler');
// const { performanceMiddlewareStack } = require('./middleware/performance');
const { additionalSecurityHeaders, sanitizeRequest } = require('./middleware/security');
const { csrfProtection } = require('./middleware/csrf');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const oauthRoutes = require('./routes/oauth');
const googleRoutes = require('./routes/google');
const microsoftRoutes = require('./routes/microsoft');
const dashboardRoutes = require('./routes/dashboard');
const businessTypesRoutes = require('./routes/businessTypes');
const onboardingRoutes = require('./routes/onboarding');
const workflowRoutes = require('./routes/workflows');
const analyticsRoutes = require('./routes/analytics');
const monitoringRoutes = require('./routes/monitoring');
const passwordResetRoutes = require('./routes/passwordReset');
const recoveryRoutes = require('./routes/recovery');
const errorRoutes = require('./routes/errors');
const healthRoutes = require('./routes/health');
const clientsRoutes = require('./routes/clients');

// Test routes (only in test environment)
let testRoutes = null;
if (process.env.NODE_ENV === 'test') {
  testRoutes = require('./routes/test');
}

const app = express();

// Trust proxy for accurate IP addresses - safer configuration
app.set('trust proxy', 'loopback, linklocal, uniquelocal');

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

// CORS configuration - Allow all origins for now, CSRF middleware will handle origin validation
const corsOptions = {
  origin: true, // Allow all origins, CSRF middleware will validate
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-csrf-token']
};

app.use(cors(corsOptions));

// Rate limiting
const { authConfig } = require('./config/authConfig');
const limiter = rateLimit({
  windowMs: authConfig.rateLimits.login.windowMs, // Use centralized rate limit config
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parsing middleware
app.use(cookieParser());

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

// Mount health routes
app.use(healthRoutes);

// CSRF protection for cookie-authenticated API routes
app.use('/api', csrfProtection);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/oauth', oauthRoutes);
app.use('/api/integrations/google', googleRoutes);
app.use('/api/integrations/microsoft', microsoftRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/business-types', businessTypesRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/password-reset', passwordResetRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/errors', errorRoutes);
app.use('/api/clients', clientsRoutes);

// Mount test routes only in test environment
if (process.env.NODE_ENV === 'test' && testRoutes) {
  app.use('/api/test', testRoutes);
}

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
