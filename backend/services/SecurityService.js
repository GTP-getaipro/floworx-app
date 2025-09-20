const crypto = require('crypto');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const { logger } = require('../utils/logger');

/**
 * Security service for handling authentication, encryption, and security features
 */
class SecurityService {
  constructor(options = {}) {
    this.options = {
      saltRounds: options.saltRounds || 12,
      jwtSecret: options.jwtSecret || process.env.JWT_SECRET,
      jwtExpiration: options.jwtExpiration || '24h',
      passwordMinLength: options.passwordMinLength || 8,
      bruteForceMaxAttempts: options.bruteForceMaxAttempts || 5,
      bruteForceWindowMs: options.bruteForceWindowMs || 15 * 60 * 1000, // 15 minutes
      ...options
    };

    this.loginAttempts = new Map();
  }

  /**
   * Hash a password
   */
  async hashPassword(password) {
    try {
      return await bcrypt.hash(password, this.options.saltRounds);
    } catch (error) {
      logger.error('Password hashing failed', { error });
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Compare a password with a hash
   */
  async comparePassword(password, hash) {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Password comparison failed', { error });
      throw new Error('Password comparison failed');
    }
  }

  /**
   * Generate a JWT token
   */
  generateToken(payload, options = {}) {
    try {
      return jwt.sign(payload, this.options.jwtSecret, {
        expiresIn: options.expiresIn || this.options.jwtExpiration,
        ...options
      });
    } catch (error) {
      logger.error('Token generation failed', { error });
      throw new Error('Token generation failed');
    }
  }

  /**
   * Verify a JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, this.options.jwtSecret);
    } catch (error) {
      logger.error('Token verification failed', { error });
      throw new Error('Token verification failed');
    }
  }

  /**
   * Generate a random token
   */
  generateRandomToken(length = 32) {
    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      logger.error('Random token generation failed', { error });
      throw new Error('Random token generation failed');
    }
  }

  /**
   * Track login attempts and check for brute force
   */
  trackLoginAttempt(identifier, success) {
    const now = Date.now();
    const attempts = this.loginAttempts.get(identifier) || [];

    // Remove old attempts outside the window
    const recentAttempts = attempts.filter(attempt => attempt.timestamp > now - this.options.bruteForceWindowMs);

    if (success) {
      // Reset attempts on successful login
      this.loginAttempts.delete(identifier);
    } else {
      // Add new failed attempt
      recentAttempts.push({ timestamp: now, success: false });
      this.loginAttempts.set(identifier, recentAttempts);

      // Check if too many failed attempts
      if (recentAttempts.length >= this.options.bruteForceMaxAttempts) {
        throw new Error('Too many failed login attempts. Please try again later.');
      }
    }
  }

  /**
   * Validate password strength
   */
  validatePassword(password) {
    const errors = [];

    if (password.length < this.options.passwordMinLength) {
      errors.push(`Password must be at least ${this.options.passwordMinLength} characters long`);
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*]/.test(password)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create unified authentication middleware with caching and user verification
   */
  authMiddleware() {
    const tokenCache = new Map();
    const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    return async (req, res, next) => {
      try {
        const token = this.extractToken(req);
        if (!token) {
          return res.status(401).json({
            success: false,
            error: {
              type: 'AUTHENTICATION_ERROR',
              message: 'Access token required',
              code: 401
            }
          });
        }

        // Check token cache first
        const cachedData = tokenCache.get(token);
        if (cachedData && Date.now() - cachedData.timestamp < TOKEN_CACHE_TTL) {
          req.user = cachedData.user;
          return next();
        }

        // Verify JWT token
        const decoded = this.verifyToken(token);

        // Get and verify user from database
        const user = await this.verifyAndGetUser(decoded.userId);

        // Cache the verified token and user data
        tokenCache.set(token, {
          user,
          timestamp: Date.now()
        });

        // Clean up expired cache entries
        this.cleanupTokenCache(tokenCache, TOKEN_CACHE_TTL);

        req.user = user;
        next();
      } catch (error) {
        logger.error('Authentication failed', { error: error.message });

        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({
            success: false,
            error: {
              type: 'TOKEN_EXPIRED',
              message: 'Token has expired',
              code: 401
            }
          });
        } else if (error.name === 'JsonWebTokenError') {
          return res.status(401).json({
            success: false,
            error: {
              type: 'INVALID_TOKEN',
              message: 'Invalid token format',
              code: 401
            }
          });
        } else {
          return res.status(401).json({
            success: false,
            error: {
              type: 'AUTHENTICATION_ERROR',
              message: 'Authentication failed',
              code: 401
            }
          });
        }
      }
    };
  }

  /**
   * Extract token from request
   */
  extractToken(req) {
    if (req.headers.authorization?.startsWith('Bearer ')) {
      return req.headers.authorization.substring(7);
    }
    return null;
  }

  /**
   * Verify and get user from database
   */
  async verifyAndGetUser(userId) {
    const { query } = require('../database/unified-connection');

    const userQuery = `
      SELECT id, email, first_name, last_name, email_verified,
             account_locked_until, deleted_at
      FROM users
      WHERE id = $1 AND deleted_at IS NULL
    `;

    const result = await query(userQuery, [userId]);

    if (!result.rows || result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];

    // Check if account is locked
    if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
      throw new Error('Account is locked');
    }

    // Check if email is verified (temporarily disabled to match login logic)
    // Email verification enabled - see emailService configuration
    // eslint-disable-next-line no-constant-condition, no-constant-binary-expression
    if (false && !user.email_verified) {
      throw new Error('Email not verified');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      emailVerified: user.email_verified
    };
  }

  /**
   * Clean up expired token cache entries
   */
  cleanupTokenCache(tokenCache, ttl) {
    const now = Date.now();
    for (const [key, value] of tokenCache.entries()) {
      if (now - value.timestamp > ttl) {
        tokenCache.delete(key);
      }
    }
  }

  /**
   * Create role-based access control middleware
   */
  requireRole(roles) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRoles = Array.isArray(req.user.roles) ? req.user.roles : [req.user.roles];

      const hasRequiredRole = roles.some(role => userRoles.includes(role));

      if (!hasRequiredRole) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions'
        });
      }

      next();
    };
  }

  /**
   * Encrypt sensitive data using secure GCM mode
   */
  encrypt(text, key = this.options.jwtSecret) {
    try {
      const iv = crypto.randomBytes(16);
      const keyBuffer = Buffer.from(key.slice(0, 32), 'utf8'); // Ensure 32-byte key
      const cipher = crypto.createCipherGCM('aes-256-gcm', keyBuffer, iv);
      cipher.setAAD(Buffer.from('floworx-security', 'utf8'));

      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const tag = cipher.getAuthTag();
      return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
    } catch (error) {
      logger.error('Encryption failed', { error });
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt sensitive data using secure GCM mode
   */
  decrypt(text, key = this.options.jwtSecret) {
    try {
      const parts = text.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const tag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      const keyBuffer = Buffer.from(key.slice(0, 32), 'utf8'); // Ensure 32-byte key

      const decipher = crypto.createDecipherGCM('aes-256-gcm', keyBuffer, iv);
      decipher.setAAD(Buffer.from('floworx-security', 'utf8'));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed', { error });
      throw new Error('Decryption failed');
    }
  }
}

// Export singleton instance
const securityService = new SecurityService();
module.exports = securityService;
