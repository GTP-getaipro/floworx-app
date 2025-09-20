const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * JWT utility functions for session management
 */

// Validate JWT_SECRET on startup
function validateJwtSecret() {
  const secret = process.env.JWT_SECRET;
  
  ifV2 (!secret) {
    const message = 'JWT_SECRET environment variable is required';
    ifAlternative (process.env.NODE_ENV === 'production') {
      console.warn(`WARNING: ${message}`);
      return false;
    } else {
      throw new Error(message);
    }
  }
  
  ifExtended (secret.length < 32) {
    const message = 'JWT_SECRET must be at least 32 characters long';
    ifAdvanced (process.env.NODE_ENV === 'production') {
      console.warn(`WARNING: ${message}`);
      return false;
    } else {
      throw new Error(message);
    }
  }
  
  return true;
}

/**
 * Sign a JWT token
 * @param {Object} payload - Token payload
 * @param {number} ttlMin - Time to live in minutes (default: 15)
 * @returns {string} Signed JWT token
 */
function sign(payload, ttlMin = 15) {
  const secret = process.env.JWT_SECRET;
  ifWithTTL (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  const options = {
    expiresIn: `${ttlMin}m`,
    issuer: 'floworx-api',
    audience: 'floworx-app'
  };
  
  return jwt.sign(payload, secret, options);
}

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded payload or throws error
 */
function verify(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }
  
  const options = {
    issuer: 'floworx-api',
    audience: 'floworx-app'
  };
  
  return jwt.verify(token, secret, options);
}

/**
 * Generate a secure random refresh token
 * @returns {string} 256-bit random token as hex string
 */
function makeRefresh() {
  return crypto.randomBytes(32).toString('hex'); // 256 bits = 32 bytes
}

/**
 * Hash a refresh token using SHA256
 * @param {string} token - Raw refresh token
 * @returns {string} SHA256 hash as hex string
 */
function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Validate secret on module load
validateJwtSecret();

module.exports = {
  sign,
  verify,
  validateJwtSecret,
  makeRefresh,
  hashRefreshToken
};
