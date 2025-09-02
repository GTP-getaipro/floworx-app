/**
 * Enhanced Security Middleware for FloWorx SaaS
 * Comprehensive security hardening including Helmet, rate limiting, and input sanitization
 */

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { body, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Enhanced Helmet configuration for production security
 */
const helmetConfig = {
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", // Required for some UI frameworks
        "https://fonts.googleapis.com",
        "https://cdn.jsdelivr.net"
      ],
      scriptSrc: [
        "'self'",
        "https://apis.google.com", // Google OAuth
        "https://accounts.google.com"
      ],
      imgSrc: [
        "'self'", 
        "data:", 
        "https:",
        "https://lh3.googleusercontent.com" // Google profile images
      ],
      fontSrc: [
        "'self'",
        "https://fonts.gstatic.com"
      ],
      connectSrc: [
        "'self'",
        "https://api.floworx-iq.com",
        "https://accounts.google.com",
        "https://oauth2.googleapis.com"
      ],
      frameSrc: [
        "https://accounts.google.com" // Google OAuth iframe
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'"]
    },
    reportOnly: process.env.NODE_ENV === 'development'
  },

  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // Disabled for OAuth compatibility

  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },

  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: "cross-origin" },

  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },

  // Expect Certificate Transparency
  expectCt: {
    maxAge: 86400,
    enforce: process.env.NODE_ENV === 'production'
  },

  // Feature Policy / Permissions Policy
  permissionsPolicy: {
    camera: [],
    microphone: [],
    geolocation: [],
    payment: [],
    usb: [],
    magnetometer: [],
    gyroscope: [],
    accelerometer: []
  },

  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },

  // IE No Open
  ieNoOpen: true,

  // No Sniff
  noSniff: true,

  // Origin Agent Cluster
  originAgentCluster: true,

  // Referrer Policy
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },

  // X-Frame-Options
  frameguard: { action: 'deny' },

  // X-Powered-By removal
  hidePoweredBy: true,

  // X-XSS-Protection
  xssFilter: true
};

/**
 * Enhanced rate limiting configurations
 */
const rateLimitConfigs = {
  // General API rate limiting
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 100 : 1000,
    message: {
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        error: {
          message: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          statusCode: 429,
          retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
          limit: req.rateLimit.limit,
          remaining: req.rateLimit.remaining
        }
      });
    }
  }),

  // Authentication endpoints (stricter)
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 5 : 50,
    skipSuccessfulRequests: true,
    message: {
      error: 'Too many authentication attempts',
      message: 'Please wait before trying again.',
      retryAfter: '15 minutes'
    }
  }),

  // Registration (very strict)
  registration: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'production' ? 3 : 10,
    message: {
      error: 'Too many registration attempts',
      message: 'Maximum registrations per hour exceeded.',
      retryAfter: '1 hour'
    }
  }),

  // Password reset (strict)
  passwordReset: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: process.env.NODE_ENV === 'production' ? 3 : 10,
    message: {
      error: 'Too many password reset attempts',
      message: 'Please wait before requesting another password reset.',
      retryAfter: '1 hour'
    }
  }),

  // OAuth callbacks
  oauth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === 'production' ? 10 : 50,
    message: {
      error: 'Too many OAuth attempts',
      message: 'Please wait before trying OAuth again.',
      retryAfter: '15 minutes'
    }
  })
};

/**
 * Slow down configurations for progressive delays
 */
const slowDownConfigs = {
  auth: slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 2, // Allow 2 requests per windowMs without delay
    delayMs: () => 500, // Add 500ms delay per request after delayAfter
    maxDelayMs: 20000, // Maximum delay of 20 seconds
    skipSuccessfulRequests: true
  })
};

/**
 * Input sanitization middleware
 */
const sanitizeInput = (req, res, next) => {
  // Sanitize common dangerous patterns
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Remove potential XSS patterns
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .replace(/data:text\/html/gi, '');
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          if (typeof obj[key] === 'object') {
            sanitizeObject(obj[key]);
          } else {
            obj[key] = sanitizeValue(obj[key]);
          }
        }
      }
    }
  };

  // Sanitize request body, query, and params
  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);

  next();
};

/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
  // Additional custom security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Remove server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  next();
};

/**
 * Request validation error handler
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationError = new ValidationError('Request validation failed');
    validationError.details = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    return next(validationError);
  }
  next();
};

module.exports = {
  helmet: helmet(helmetConfig),
  rateLimits: rateLimitConfigs,
  slowDown: slowDownConfigs,
  sanitizeInput,
  securityHeaders,
  handleValidationErrors,
  
  // Convenience exports
  apiRateLimit: rateLimitConfigs.api,
  authRateLimit: rateLimitConfigs.auth,
  registrationRateLimit: rateLimitConfigs.registration,
  passwordResetRateLimit: rateLimitConfigs.passwordReset,
  oauthRateLimit: rateLimitConfigs.oauth,
  authSlowDown: slowDownConfigs.auth,
  accountLockoutLimiter: rateLimitConfigs.auth // Use auth rate limiter for account lockout
};
