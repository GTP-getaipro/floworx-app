const crypto = require('crypto');

// Security utility functions for the Floworx application

// Generate secure random strings for JWT secrets and encryption keys
const generateSecureKey = (length = 32) => {
  return crypto.randomBytes(length).toString('base64').slice(0, length);
};

// Generate JWT secret (recommended 64+ characters)
const generateJWTSecret = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Validate environment variables for security
const validateSecurityConfig = () => {
  const errors = [];

  // Check JWT secret
  if (!process.env.JWT_SECRET) {
    errors.push('JWT_SECRET environment variable is required');
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET should be at least 32 characters long');
  }

  // Check encryption key
  if (!process.env.ENCRYPTION_KEY) {
    errors.push('ENCRYPTION_KEY environment variable is required');
  } else if (process.env.ENCRYPTION_KEY.length !== 32) {
    errors.push('ENCRYPTION_KEY must be exactly 32 characters long');
  }

  // Check Google OAuth credentials
  if (!process.env.GOOGLE_CLIENT_ID) {
    errors.push('GOOGLE_CLIENT_ID environment variable is required');
  }
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    errors.push('GOOGLE_CLIENT_SECRET environment variable is required');
  }
  if (!process.env.GOOGLE_REDIRECT_URI) {
    errors.push('GOOGLE_REDIRECT_URI environment variable is required');
  }

  // Check database credentials
  if (!process.env.DB_USER) {
    errors.push('DB_USER environment variable is required');
  }
  if (!process.env.DB_PASSWORD) {
    errors.push('DB_PASSWORD environment variable is required');
  }
  if (!process.env.DB_NAME) {
    errors.push('DB_NAME environment variable is required');
  }

  return errors;
};

// Rate limiting configuration
const rateLimitConfig = {
  // General API rate limit
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests',
      message: 'Please try again later'
    }
  },

  // Auth endpoints (more restrictive)
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth attempts per windowMs
    message: {
      error: 'Too many authentication attempts',
      message: 'Please try again in 15 minutes'
    }
  }
};

// Input sanitization helpers
const sanitizeEmail = email => {
  if (typeof email !== 'string') {
    return '';
  }
  return email.toLowerCase().trim();
};

const sanitizeString = (str, maxLength = 255) => {
  if (typeof str !== 'string') {
    return '';
  }
  return str.trim().slice(0, maxLength);
};

// Security headers configuration
const securityHeaders = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://accounts.google.com', 'https://oauth2.googleapis.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: false,
  referrerPolicy: { policy: 'no-referrer' },
  xssFilter: true
};

// CORS configuration
const corsConfig = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) {
      return callback(null, true);
    }

    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000'
    ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400 // 24 hours
};

module.exports = {
  generateSecureKey,
  generateJWTSecret,
  validateSecurityConfig,
  rateLimitConfig,
  sanitizeEmail,
  sanitizeString,
  securityHeaders,
  corsConfig
};
