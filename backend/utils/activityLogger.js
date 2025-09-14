/**
 * User Activity Logging System
 * Tracks user activities for security and analytics
 */

const { databaseOperations } = require('../database/database-operations');
const { logger } = require('./logger');

/**
 * Log user activity to database
 * @param {string} userId - User ID
 * @param {string} activityType - Type of activity
 * @param {Object} details - Activity details
 * @param {Object} req - Express request object or object with IP
 * @returns {Promise<boolean>} Success status
 */
async function logUserActivity(userId, activityType, details = {}, req = {}) {
  try {
    const ip = req.ip || req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'] || null;
    const userAgent = req.headers?.['user-agent'] || null;
    
    // Use database operations to log activity
    const result = await databaseOperations.logUserActivity(
      userId,
      activityType,
      details,
      ip,
      userAgent
    );
    
    if (result.error) {
      logger.error('Failed to log user activity to database', {
        error: result.error,
        userId,
        activityType
      });
      return false;
    }
    
    logger.debug('User activity logged', {
      userId,
      activityType,
      details,
      ip,
      userAgent
    });
    
    return true;
  } catch (error) {
    logger.error('Failed to log user activity', {
      error: error.message,
      stack: error.stack,
      userId,
      activityType
    });
    
    return false;
  }
}

/**
 * Get user activity history
 * @param {string} userId - User ID
 * @param {number} limit - Maximum number of records to return
 * @param {number} offset - Number of records to skip
 * @returns {Promise<Object>} Result object with activity data
 */
async function getUserActivityHistory(userId, limit = 50, offset = 0) {
  try {
    const result = await databaseOperations.getUserActivityHistory(userId, limit, offset);
    
    if (result.error) {
      logger.error('Failed to get user activity history', {
        error: result.error,
        userId
      });
      return {
        success: false,
        error: result.error
      };
    }
    
    return {
      success: true,
      data: result.data
    };
  } catch (error) {
    logger.error('Failed to get user activity history', {
      error: error.message,
      stack: error.stack,
      userId
    });
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Log authentication events
 * @param {string} userId - User ID
 * @param {string} event - Authentication event type
 * @param {Object} details - Event details
 * @param {Object} req - Express request object
 * @returns {Promise<boolean>} Success status
 */
async function logAuthEvent(userId, event, details = {}, req = {}) {
  const authEvents = {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILED: 'LOGIN_FAILED',
    LOGOUT: 'LOGOUT',
    REGISTER: 'REGISTER',
    EMAIL_VERIFIED: 'EMAIL_VERIFIED',
    PASSWORD_RESET_REQUEST: 'PASSWORD_RESET_REQUEST',
    PASSWORD_RESET_COMPLETE: 'PASSWORD_RESET_COMPLETE',
    PASSWORD_CHANGED: 'PASSWORD_CHANGED',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED'
  };
  
  if (!authEvents[event]) {
    logger.warn('Unknown authentication event type', { event, userId });
    return false;
  }
  
  return await logUserActivity(userId, event, details, req);
}

/**
 * Log security events
 * @param {string} userId - User ID (optional for some events)
 * @param {string} event - Security event type
 * @param {Object} details - Event details
 * @param {Object} req - Express request object
 * @returns {Promise<boolean>} Success status
 */
async function logSecurityEvent(userId, event, details = {}, req = {}) {
  const securityEvents = {
    SUSPICIOUS_LOGIN: 'SUSPICIOUS_LOGIN',
    MULTIPLE_FAILED_LOGINS: 'MULTIPLE_FAILED_LOGINS',
    IP_BLOCKED: 'IP_BLOCKED',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    INVALID_TOKEN: 'INVALID_TOKEN',
    EXPIRED_TOKEN: 'EXPIRED_TOKEN',
    UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS'
  };
  
  if (!securityEvents[event]) {
    logger.warn('Unknown security event type', { event, userId });
    return false;
  }
  
  // Log security events with higher priority
  logger.warn('Security event detected', {
    userId,
    event,
    details,
    ip: req.ip || req.headers?.['x-forwarded-for'],
    userAgent: req.headers?.['user-agent']
  });
  
  return await logUserActivity(userId, event, details, req);
}

/**
 * Log business events
 * @param {string} userId - User ID
 * @param {string} event - Business event type
 * @param {Object} details - Event details
 * @param {Object} req - Express request object
 * @returns {Promise<boolean>} Success status
 */
async function logBusinessEvent(userId, event, details = {}, req = {}) {
  const businessEvents = {
    WORKFLOW_CREATED: 'WORKFLOW_CREATED',
    WORKFLOW_EXECUTED: 'WORKFLOW_EXECUTED',
    INTEGRATION_CONNECTED: 'INTEGRATION_CONNECTED',
    INTEGRATION_DISCONNECTED: 'INTEGRATION_DISCONNECTED',
    SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
    SUBSCRIPTION_CANCELLED: 'SUBSCRIPTION_CANCELLED',
    PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
    PAYMENT_FAILED: 'PAYMENT_FAILED'
  };
  
  if (!businessEvents[event]) {
    logger.warn('Unknown business event type', { event, userId });
    return false;
  }
  
  return await logUserActivity(userId, event, details, req);
}

module.exports = {
  logUserActivity,
  getUserActivityHistory,
  logAuthEvent,
  logSecurityEvent,
  logBusinessEvent
};
