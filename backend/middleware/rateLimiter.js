const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Rate limiting configuration for different endpoint types
const rateLimitConfig = {
  // Strict rate limiting for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
      error: 'Too many authentication attempts',
      message: 'Please try again in 15 minutes',
      retryAfter: 15 * 60 // seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests
    skipSuccessfulRequests: true,
    // IPv6 compatible key generator
    keyGenerator: (req) => {
      return req.ip || req.connection?.remoteAddress || 'unknown';
    }
  },

  // Moderate rate limiting for password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset requests per hour
    message: {
      error: 'Too many password reset attempts',
      message: 'Please try again in 1 hour',
      retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    // IPv6 compatible key generator for password reset
    keyGenerator: (req) => {
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      return `password-reset-${ip}`;
    }
  },

  // General API rate limiting
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests',
      message: 'Please try again later',
      retryAfter: 15 * 60
    },
    standardHeaders: true,
    legacyHeaders: false,
    // IPv6 compatible key generator
    keyGenerator: (req) => {
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      return `api-${ip}`;
    }
  },

  // Strict rate limiting for registration
  registration: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 registration attempts per hour
    message: {
      error: 'Too many registration attempts',
      message: 'Please try again in 1 hour',
      retryAfter: 60 * 60
    },
    standardHeaders: true,
    legacyHeaders: false
  }
};

// Progressive delay for repeated requests (additional security layer)
const slowDownConfig = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    delayAfter: 2, // Allow 2 requests per windowMs without delay
    delayMs: () => 500, // Add 500ms delay per request after delayAfter
    maxDelayMs: 20000, // Maximum delay of 20 seconds
    skipSuccessfulRequests: true,
    validate: { delayMs: false } // Disable delayMs validation warning
  }
};

// Create rate limiters
const authRateLimit = rateLimit(rateLimitConfig.auth);
const passwordResetRateLimit = rateLimit(rateLimitConfig.passwordReset);
const apiRateLimit = rateLimit(rateLimitConfig.api);
const registrationRateLimit = rateLimit(rateLimitConfig.registration);

// Create slow down middleware
const authSlowDown = slowDown(slowDownConfig.auth);

// Enhanced rate limiter with account lockout tracking
const createAccountLockoutLimiter = (_options = {}) => {
  const lockoutMap = new Map(); // In production, use Redis

  return (req, res, next) => {
    const identifier = req.body?.email?.toLowerCase() || req.ip;
    const now = Date.now();

    // Clean up old entries (older than 24 hours)
    for (const [key, data] of lockoutMap.entries()) {
      if (now - data.firstAttempt > 24 * 60 * 60 * 1000) {
        lockoutMap.delete(key);
      }
    }

    const lockoutData = lockoutMap.get(identifier) || {
      attempts: 0,
      firstAttempt: now,
      lockedUntil: null
    };

    // Check if account is currently locked
    if (lockoutData.lockedUntil && now < lockoutData.lockedUntil) {
      const remainingTime = Math.ceil((lockoutData.lockedUntil - now) / 1000 / 60);
      return res.status(429).json({
        error: 'Account temporarily locked',
        message: `Too many failed attempts. Try again in ${remainingTime} minutes.`,
        lockedUntil: new Date(lockoutData.lockedUntil).toISOString(),
        attemptsRemaining: 0
      });
    }

    // Reset lockout if time window has passed
    if (lockoutData.lockedUntil && now >= lockoutData.lockedUntil) {
      lockoutData.attempts = 0;
      lockoutData.lockedUntil = null;
      lockoutData.firstAttempt = now;
    }

    // Add attempt tracking to request
    req.lockoutData = lockoutData;
    req.updateLockoutData = (failed = false) => {
      if (failed) {
        lockoutData.attempts += 1;

        // Progressive lockout: 5 attempts = 15 min, 10 attempts = 1 hour, 15+ attempts = 24 hours
        if (lockoutData.attempts >= 15) {
          lockoutData.lockedUntil = now + 24 * 60 * 60 * 1000; // 24 hours
        } else if (lockoutData.attempts >= 10) {
          lockoutData.lockedUntil = now + 60 * 60 * 1000; // 1 hour
        } else if (lockoutData.attempts >= 5) {
          lockoutData.lockedUntil = now + 15 * 60 * 1000; // 15 minutes
        }
      } else {
        // Successful login - reset attempts
        lockoutData.attempts = 0;
        lockoutData.lockedUntil = null;
      }

      lockoutMap.set(identifier, lockoutData);
    };

    next();
  };
};

// Account lockout limiter instance
const accountLockoutLimiter = createAccountLockoutLimiter();

module.exports = {
  authRateLimit,
  passwordResetRateLimit,
  apiRateLimit,
  registrationRateLimit,
  authSlowDown,
  accountLockoutLimiter,
  rateLimitConfig
};
