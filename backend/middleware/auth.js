const jwt = require('jsonwebtoken');
const { query } = require('../database/unified-connection');
const { createError } = require('./errorHandler');

// Cache of recently verified tokens and their user data
const tokenCache = new Map();
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Verify user exists and get their data
 * @param {string} userId - User ID from JWT token
 * @returns {Promise<Object>} User data
 */
const verifyAndGetUser = async userId => {
  const userQuery = 'SELECT id, email, first_name, last_name, email_verified, account_locked_until FROM users WHERE id = $1 AND deleted_at IS NULL';
  const userResult = await query(userQuery, [userId]);

  if (userResult.rows.length === 0) {
    throw createError('Unauthorized', 401, 'User no longer exists');
  }

  const user = userResult.rows[0];

  // Check if account is locked
  if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
    throw createError('Forbidden', 403, 'Account is locked');
  }

  // Check if email is verified
  if (!user.email_verified) {
    throw createError('Forbidden', 403, 'Email not verified');
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    emailVerified: user.email_verified
  };
};

/**
 * Middleware to verify JWT tokens
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw createError('Unauthorized', 401, 'Access token required');
    }

    // Check token cache first
    const cachedData = tokenCache.get(token);
    if (cachedData) {
      req.user = cachedData.user;
      return next();
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user data and verify status
    const user = await verifyAndGetUser(decoded.userId);

    // Cache the verified token and user data
    tokenCache.set(token, {
      user,
      timestamp: Date.now()
    });

    // Clean up expired cache entries
    const now = Date.now();
    for (const [key, value] of tokenCache.entries()) {
      if (now - value.timestamp > TOKEN_CACHE_TTL) {
        tokenCache.delete(key);
      }
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(createError('Unauthorized', 401, 'Token has expired'));
    } else if (error.name === 'JsonWebTokenError') {
      next(createError('Unauthorized', 401, 'Invalid token format'));
    } else {
      next(error);
    }
  }
};

/**
 * Middleware for optional authentication (doesn't fail if no token)
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    // Check token cache first
    const cachedData = tokenCache.get(token);
    if (cachedData) {
      req.user = cachedData.user;
      return next();
    }

    // Verify and get user data
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await verifyAndGetUser(decoded.userId).catch(() => null);

    if (user) {
      // Cache the verified token and user data
      tokenCache.set(token, {
        user,
        timestamp: Date.now()
      });
      req.user = user;
    } else {
      req.user = null;
    }
  } catch (_error) {
    req.user = null;
  }

  next();
};

/**
 * Middleware to check user roles
 * @param {string[]} roles - Array of required roles
 * @returns {function} Middleware function
 */
const requireRoles = roles => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw createError('Unauthorized', 401, 'Authentication required');
      }

      if (!roles.includes(req.user.role)) {
        throw createError('Forbidden', 403, 'Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRoles
};
