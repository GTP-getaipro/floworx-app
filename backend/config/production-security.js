/**
 * Production Security Configuration
 * Enhanced security settings for production environment
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const helmet = require('helmet');
const cors = require('cors');

class ProductionSecurityConfig {
  constructor() {
    this.config = {
      // CORS configuration
      cors: {
        origin: this.getAllowedOrigins(),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
          'Origin',
          'X-Requested-With',
          'Content-Type',
          'Accept',
          'Authorization',
          'X-API-Key',
          'X-Request-ID'
        ],
        exposedHeaders: ['X-Request-ID', 'X-Rate-Limit-Remaining'],
        maxAge: 86400 // 24 hours
      },

      // Helmet security headers
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", "https://api.floworx-iq.com", "wss://api.floworx-iq.com"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            manifestSrc: ["'self'"]
          }
        },
        crossOriginEmbedderPolicy: false, // Disable for OAuth compatibility
        hsts: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true
        },
        noSniff: true,
        frameguard: { action: 'deny' },
        xssFilter: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
      },

      // Rate limiting configurations
      rateLimits: {
        // Global API rate limit
        global: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 1000, // requests per window
          message: {
            error: 'Too many requests',
            message: 'Global rate limit exceeded',
            retryAfter: '15 minutes'
          },
          standardHeaders: true,
          legacyHeaders: false
        },

        // Authentication endpoints
        auth: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 10, // Very restrictive for auth
          skipSuccessfulRequests: true,
          message: {
            error: 'Too many authentication attempts',
            message: 'Please wait before trying again',
            retryAfter: '15 minutes'
          },
          standardHeaders: true,
          legacyHeaders: false
        },

        // Registration endpoint
        registration: {
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 5, // Very restrictive for registration
          message: {
            error: 'Too many registration attempts',
            message: 'Registration limit exceeded',
            retryAfter: '1 hour'
          },
          standardHeaders: true,
          legacyHeaders: false
        },

        // Password reset
        passwordReset: {
          windowMs: 60 * 60 * 1000, // 1 hour
          max: 3, // Very restrictive
          message: {
            error: 'Too many password reset attempts',
            message: 'Password reset limit exceeded',
            retryAfter: '1 hour'
          },
          standardHeaders: true,
          legacyHeaders: false
        },

        // OAuth endpoints
        oauth: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 20, // Moderate for OAuth flows
          message: {
            error: 'Too many OAuth attempts',
            message: 'OAuth rate limit exceeded',
            retryAfter: '15 minutes'
          },
          standardHeaders: true,
          legacyHeaders: false
        },

        // API endpoints
        api: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 500, // Generous for API usage
          message: {
            error: 'API rate limit exceeded',
            message: 'Too many API requests',
            retryAfter: '15 minutes'
          },
          standardHeaders: true,
          legacyHeaders: false
        }
      },

      // Slow down configurations
      slowDown: {
        auth: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          delayAfter: 3, // Allow 3 requests per window at full speed
          delayMs: 500, // Add 500ms delay per request after delayAfter
          maxDelayMs: 10000, // Maximum delay of 10 seconds
          skipSuccessfulRequests: true
        }
      }
    };
  }

  /**
   * Get allowed origins for CORS
   */
  getAllowedOrigins() {
    const origins = [
      'https://app.floworx-iq.com',
      'https://www.floworx-iq.com',
      'https://floworx-iq.com'
    ];

    // Add development origins in non-production
    if (process.env.NODE_ENV !== 'production') {
      origins.push(
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5001',
        'http://127.0.0.1:3000'
      );
    }

    // Add custom origins from environment
    if (process.env.CORS_ORIGIN) {
      const customOrigins = process.env.CORS_ORIGIN.split(',').map(o => o.trim());
      origins.push(...customOrigins);
    }

    return origins;
  }

  /**
   * Create CORS middleware
   */
  createCorsMiddleware() {
    return cors(this.config.cors);
  }

  /**
   * Create Helmet middleware
   */
  createHelmetMiddleware() {
    return helmet(this.config.helmet);
  }

  /**
   * Create rate limiting middlewares
   */
  createRateLimitMiddlewares() {
    const middlewares = {};

    for (const [name, config] of Object.entries(this.config.rateLimits)) {
      middlewares[name] = rateLimit({
        ...config,
        handler: (req, res) => {
          res.status(429).json({
            success: false,
            error: {
              message: config.message.error,
              details: config.message.message,
              code: 'RATE_LIMIT_EXCEEDED',
              statusCode: 429,
              retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
              limit: req.rateLimit.limit,
              remaining: req.rateLimit.remaining
            }
          });
        }
      });
    }

    return middlewares;
  }

  /**
   * Create slow down middlewares
   */
  createSlowDownMiddlewares() {
    const middlewares = {};

    for (const [name, config] of Object.entries(this.config.slowDown)) {
      middlewares[name] = slowDown(config);
    }

    return middlewares;
  }

  /**
   * Create comprehensive security middleware stack
   */
  createSecurityMiddlewareStack() {
    const rateLimiters = this.createRateLimitMiddlewares();
    const slowDowns = this.createSlowDownMiddlewares();

    return {
      // Core security
      cors: this.createCorsMiddleware(),
      helmet: this.createHelmetMiddleware(),

      // Rate limiting
      rateLimits: rateLimiters,
      slowDown: slowDowns,

      // Combined middleware for different endpoint types
      authSecurity: [
        rateLimiters.auth,
        slowDowns.auth
      ],

      registrationSecurity: [
        rateLimiters.registration
      ],

      apiSecurity: [
        rateLimiters.api
      ],

      oauthSecurity: [
        rateLimiters.oauth
      ],

      passwordResetSecurity: [
        rateLimiters.passwordReset
      ],

      // Global security (apply to all routes)
      globalSecurity: [
        this.createCorsMiddleware(),
        this.createHelmetMiddleware(),
        rateLimiters.global
      ]
    };
  }

  /**
   * Additional security headers middleware
   */
  createAdditionalSecurityHeaders() {
    return (req, res, next) => {
      // Custom security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

      // Remove server information
      res.removeHeader('X-Powered-By');
      res.removeHeader('Server');

      // Add request ID for tracking
      if (!req.headers['x-request-id']) {
        req.headers['x-request-id'] = require('crypto').randomUUID();
      }
      res.setHeader('X-Request-ID', req.headers['x-request-id']);

      next();
    };
  }

  /**
   * Input sanitization middleware
   */
  createInputSanitizationMiddleware() {
    return (req, res, next) => {
      // Sanitize function
      const sanitize = (obj) => {
        if (typeof obj === 'string') {
          return obj
            .replace(/[<>]/g, '') // Remove potential HTML tags
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .replace(/data:text\/html/gi, '') // Remove data URLs
            .trim();
        }
        if (typeof obj === 'object' && obj !== null) {
          for (const key in obj) {
            obj[key] = sanitize(obj[key]);
          }
        }
        return obj;
      };

      // Sanitize request data
      if (req.body) req.body = sanitize(req.body);
      if (req.query) req.query = sanitize(req.query);
      if (req.params) req.params = sanitize(req.params);

      next();
    };
  }

  /**
   * Get complete production security configuration
   */
  getProductionSecurityConfig() {
    const middlewareStack = this.createSecurityMiddlewareStack();
    
    return {
      config: this.config,
      middlewares: {
        ...middlewareStack,
        additionalHeaders: this.createAdditionalSecurityHeaders(),
        inputSanitization: this.createInputSanitizationMiddleware()
      },
      
      // Convenience methods
      applyGlobalSecurity: (app) => {
        app.use(middlewareStack.globalSecurity);
        app.use(this.createAdditionalSecurityHeaders());
        app.use(this.createInputSanitizationMiddleware());
      },

      applyAuthSecurity: (router) => {
        router.use(middlewareStack.authSecurity);
      },

      applyApiSecurity: (router) => {
        router.use(middlewareStack.apiSecurity);
      }
    };
  }
}

module.exports = ProductionSecurityConfig;
