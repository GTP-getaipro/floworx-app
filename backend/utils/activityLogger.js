/**
 * Simple Activity Logger
 * Replacement for the deleted activityLogger utility
 */

const { logger } = require('./logger');

/**
 * Log user activity
 * @param {string} userId - User ID
 * @param {string} action - Action performed
 * @param {Object} details - Additional details
 * @param {Object} req - Express request object (optional)
 */
function logActivity(userId, action, details = {}, req = null) {
  const activityData = {
    userId,
    action,
    details,
    timestamp: new Date().toISOString(),
    ip: req?.ip || req?.connection?.remoteAddress || 'unknown',
    userAgent: req?.get('User-Agent') || 'unknown'
  };

  logger.info(`User activity: ${action}`, activityData);
}

/**
 * Log authentication activity
 * @param {string} userId - User ID
 * @param {string} action - Auth action (login, logout, register, etc.)
 * @param {boolean} success - Whether the action was successful
 * @param {Object} details - Additional details
 * @param {Object} req - Express request object
 */
function logAuthActivity(userId, action, success, details = {}, req = null) {
  const activityData = {
    userId,
    action,
    success,
    details,
    timestamp: new Date().toISOString(),
    ip: req?.ip || req?.connection?.remoteAddress || 'unknown',
    userAgent: req?.get('User-Agent') || 'unknown'
  };

  const logLevel = success ? 'info' : 'warn';
  logger[logLevel](`Auth activity: ${action} ${success ? 'succeeded' : 'failed'}`, activityData);
}

/**
 * Log password reset activity
 * @param {string} email - User email
 * @param {string} action - Password reset action
 * @param {boolean} success - Whether the action was successful
 * @param {Object} details - Additional details
 * @param {Object} req - Express request object
 */
function logPasswordResetActivity(email, action, success, details = {}, req = null) {
  const activityData = {
    email,
    action,
    success,
    details,
    timestamp: new Date().toISOString(),
    ip: req?.ip || req?.connection?.remoteAddress || 'unknown',
    userAgent: req?.get('User-Agent') || 'unknown'
  };

  const logLevel = success ? 'info' : 'warn';
  logger[logLevel](`Password reset activity: ${action} ${success ? 'succeeded' : 'failed'}`, activityData);
}

/**
 * Log security event
 * @param {string} event - Security event type
 * @param {string} severity - Event severity (low, medium, high, critical)
 * @param {Object} details - Event details
 * @param {Object} req - Express request object
 */
function logSecurityEvent(event, severity = 'medium', details = {}, req = null) {
  const eventData = {
    event,
    severity,
    details,
    timestamp: new Date().toISOString(),
    ip: req?.ip || req?.connection?.remoteAddress || 'unknown',
    userAgent: req?.get('User-Agent') || 'unknown'
  };

  const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 'warn';
  logger[logLevel](`Security event: ${event}`, eventData);
}

/**
 * Log API access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} duration - Request duration in ms
 */
function logApiAccess(req, res, duration) {
  const accessData = {
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    duration,
    ip: req.ip || req.connection?.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent') || 'unknown',
    userId: req.user?.id || 'anonymous',
    timestamp: new Date().toISOString()
  };

  const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
  logger[logLevel](`API access: ${req.method} ${req.originalUrl}`, accessData);
}

module.exports = {
  logActivity,
  logAuthActivity,
  logPasswordResetActivity,
  logSecurityEvent,
  logApiAccess
};
