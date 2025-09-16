/**
 * Simple Token Generator
 * Replacement for the deleted tokenGenerator utility
 */

const crypto = require('crypto');

/**
 * Generate a secure random token
 * @param {number} length - Token length in bytes (default: 32)
 * @returns {string} Hex-encoded token
 */
function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a numeric verification code
 * @param {number} digits - Number of digits (default: 6)
 * @returns {string} Numeric code
 */
function generateVerificationCode(digits = 6) {
  const min = Math.pow(10, digits - 1);
  const max = Math.pow(10, digits) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

/**
 * Generate a password reset token
 * @returns {string} Password reset token
 */
function generatePasswordResetToken() {
  return generateSecureToken(32);
}

/**
 * Generate an email verification token
 * @returns {string} Email verification token
 */
function generateEmailVerificationToken() {
  return generateSecureToken(32);
}

/**
 * Generate a session token
 * @returns {string} Session token
 */
function generateSessionToken() {
  return generateSecureToken(48);
}

/**
 * Generate an API key
 * @returns {string} API key
 */
function generateApiKey() {
  const prefix = 'fwx_';
  const token = generateSecureToken(24);
  return prefix + token;
}

/**
 * Generate a UUID v4
 * @returns {string} UUID v4
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Generate a short ID (URL-safe)
 * @param {number} length - Length of the ID (default: 8)
 * @returns {string} Short ID
 */
function generateShortId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate a token with expiration
 * @param {number} expiresInMinutes - Expiration time in minutes (default: 60)
 * @returns {Object} Token object with token and expiration
 */
function generateTokenWithExpiration(expiresInMinutes = 60) {
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + (expiresInMinutes * 60 * 1000));
  
  return {
    token,
    expiresAt,
    isExpired: () => new Date() > expiresAt
  };
}

module.exports = {
  generateSecureToken,
  generateVerificationCode,
  generatePasswordResetToken,
  generateEmailVerificationToken,
  generateSessionToken,
  generateApiKey,
  generateUUID,
  generateShortId,
  generateTokenWithExpiration
};
