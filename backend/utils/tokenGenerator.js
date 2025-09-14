/**
 * Token Generation Utility
 * Provides secure token generation for email verification and password reset
 */

const crypto = require('crypto');

/**
 * Generates a cryptographically secure random token
 * @param {number} bytes - Number of bytes for token generation (default: 32)
 * @returns {string} Hexadecimal token string
 */
function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generates a verification token for email verification
 * @returns {string} Verification token
 */
function generateVerificationToken() {
  return generateSecureToken(32);
}

/**
 * Generates a password reset token
 * @returns {string} Password reset token
 */
function generatePasswordResetToken() {
  return generateSecureToken(32);
}

/**
 * Generates a session token
 * @returns {string} Session token
 */
function generateSessionToken() {
  return generateSecureToken(24);
}

/**
 * Generates an API key
 * @returns {string} API key
 */
function generateApiKey() {
  return generateSecureToken(48);
}

module.exports = {
  generateSecureToken,
  generateVerificationToken,
  generatePasswordResetToken,
  generateSessionToken,
  generateApiKey
};
