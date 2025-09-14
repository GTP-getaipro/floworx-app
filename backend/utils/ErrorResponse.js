/**
 * Standardized Error Response System for FloworxInvite SaaS
 * Provides consistent error formatting, logging, and response structure
 */

const logger = require('./logger');

/**
 * Standardized Error Codes
 */
const ERROR_CODES = {
  // Client Errors (4xx)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  
  // Server Errors (5xx)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  
  // Business Logic Errors
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
  OAUTH_ERROR: 'OAUTH_ERROR',
  EMAIL_ERROR: 'EMAIL_ERROR',
  WORKFLOW_ERROR: 'WORKFLOW_ERROR'
};

/**
 * HTTP Status Code Mapping
 */
const STATUS_CODE_MAP = {
  [ERROR_CODES.VALIDATION_ERROR]: 400,
  [ERROR_CODES.AUTHENTICATION_ERROR]: 401,
  [ERROR_CODES.AUTHORIZATION_ERROR]: 403,
  [ERROR_CODES.NOT_FOUND_ERROR]: 404,
  [ERROR_CODES.CONFLICT_ERROR]: 409,
  [ERROR_CODES.PAYLOAD_TOO_LARGE]: 413,
  [ERROR_CODES.BUSINESS_LOGIC_ERROR]: 422,
  [ERROR_CODES.RATE_LIMIT_ERROR]: 429,
  [ERROR_CODES.INTERNAL_ERROR]: 500,
  [ERROR_CODES.DATABASE_ERROR]: 500,
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 502,
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
  [ERROR_CODES.TIMEOUT_ERROR]: 504,
  [ERROR_CODES.OAUTH_ERROR]: 400,
  [ERROR_CODES.EMAIL_ERROR]: 500,
  [ERROR_CODES.WORKFLOW_ERROR]: 422
};

/**
 * Production-Safe Error Messages
 */
const SAFE_ERROR_MESSAGES = {
  [ERROR_CODES.AUTHENTICATION_ERROR]: 'Authentication required',
  [ERROR_CODES.AUTHORIZATION_ERROR]: 'Access denied',
  [ERROR_CODES.NOT_FOUND_ERROR]: 'Resource not found',
  [ERROR_CODES.DATABASE_ERROR]: 'Service temporarily unavailable',
  [ERROR_CODES.INTERNAL_ERROR]: 'Internal server error',
  [ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 'External service unavailable',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  [ERROR_CODES.TIMEOUT_ERROR]: 'Request timeout'
};

/**
 * Centralized Error Response Class
 */
class ErrorResponse {
  /**
   * Create standardized error response
   * @param {string} code - Error code from ERROR_CODES
   * @param {string} message - Error message
   * @param {Object} options - Additional options
   * @param {Object} options.details - Additional error details
   * @param {string} options.requestId - Request ID for tracking
   * @param {number} options.statusCode - Override status code
   * @param {Object} options.context - Additional context for logging
   */
  constructor(code, message, options = {}) {
    this.code = code;
    this.message = message;
    this.statusCode = options.statusCode || STATUS_CODE_MAP[code] || 500;
    this.details = options.details || null;
    this.requestId = options.requestId || null;
    this.context = options.context || {};
    this.timestamp = new Date().toISOString();
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Get standardized response object
   */
  toResponse() {
    const response = {
      success: false,
      error: {
        code: this.code,
        message: this.isProduction && this.statusCode >= 500 
          ? SAFE_ERROR_MESSAGES[this.code] || 'Internal server error'
          : this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp
      }
    };

    // Add details for client errors (safe to expose)
    if (this.details && this.statusCode < 500) {
      response.error.details = this.details;
    }

    // Add request ID for tracking
    if (this.requestId) {
      response.error.requestId = this.requestId;
    }

    return response;
  }

  /**
   * Send error response
   */
  send(res, req = null) {
    // Log error with structured data
    this.logError(req);
    
    // Send response
    res.status(this.statusCode).json(this.toResponse());
  }

  /**
   * Log error with structured data
   */
  logError(req = null) {
    const logData = {
      error: {
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        details: this.details,
        timestamp: this.timestamp
      },
      request: req ? {
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        userId: req.user?.id,
        headers: {
          'content-type': req.get('content-type'),
          'authorization': req.get('authorization') ? '[REDACTED]' : undefined
        }
      } : null,
      context: this.context
    };

    // Log with appropriate level
    if (this.statusCode >= 500) {
      logger.error('Server Error', logData);
    } else if (this.statusCode >= 400) {
      logger.warn('Client Error', logData);
    } else {
      logger.info('Error Info', logData);
    }
  }

  /**
   * Create from standard Error object
   */
  static fromError(error, req = null) {
    let code = ERROR_CODES.INTERNAL_ERROR;
    let message = error.message || 'An unexpected error occurred';
    let statusCode = 500;
    let details = null;

    // Map common error types
    if (error.name === 'ValidationError') {
      code = ERROR_CODES.VALIDATION_ERROR;
      statusCode = 400;
    } else if (error.name === 'JsonWebTokenError') {
      code = ERROR_CODES.AUTHENTICATION_ERROR;
      message = 'Invalid token';
      statusCode = 401;
    } else if (error.name === 'TokenExpiredError') {
      code = ERROR_CODES.AUTHENTICATION_ERROR;
      message = 'Token expired';
      statusCode = 401;
    } else if (error.code && error.code.startsWith('23')) {
      // PostgreSQL constraint errors
      code = ERROR_CODES.DATABASE_ERROR;
      message = 'Database constraint violation';
      statusCode = 500;
    }

    // Use existing error properties if available
    if (error.code && ERROR_CODES[error.code]) {
      code = error.code;
    }
    if (error.statusCode) {
      statusCode = error.statusCode;
    }
    if (error.details) {
      details = error.details;
    }

    return new ErrorResponse(code, message, {
      statusCode,
      details,
      requestId: req?.requestId,
      context: { originalError: error.name }
    });
  }
}

/**
 * Factory methods for common errors
 */
ErrorResponse.validation = (message, details = null, requestId = null) => {
  return new ErrorResponse(ERROR_CODES.VALIDATION_ERROR, message, { details, requestId });
};

ErrorResponse.authentication = (message = 'Authentication required', requestId = null) => {
  return new ErrorResponse(ERROR_CODES.AUTHENTICATION_ERROR, message, { requestId });
};

ErrorResponse.authorization = (message = 'Access denied', requestId = null) => {
  return new ErrorResponse(ERROR_CODES.AUTHORIZATION_ERROR, message, { requestId });
};

ErrorResponse.notFound = (message = 'Resource not found', requestId = null) => {
  return new ErrorResponse(ERROR_CODES.NOT_FOUND_ERROR, message, { requestId });
};

ErrorResponse.conflict = (message, details = null, requestId = null) => {
  return new ErrorResponse(ERROR_CODES.CONFLICT_ERROR, message, { details, requestId });
};

ErrorResponse.rateLimit = (message = 'Too many requests', requestId = null) => {
  return new ErrorResponse(ERROR_CODES.RATE_LIMIT_ERROR, message, { requestId });
};

ErrorResponse.internal = (message = 'Internal server error', context = {}, requestId = null) => {
  return new ErrorResponse(ERROR_CODES.INTERNAL_ERROR, message, { context, requestId });
};

ErrorResponse.database = (message = 'Database error', context = {}, requestId = null) => {
  return new ErrorResponse(ERROR_CODES.DATABASE_ERROR, message, { context, requestId });
};

ErrorResponse.external = (message = 'External service error', context = {}, requestId = null) => {
  return new ErrorResponse(ERROR_CODES.EXTERNAL_SERVICE_ERROR, message, { context, requestId });
};

ErrorResponse.oauth = (message, details = null, requestId = null) => {
  return new ErrorResponse(ERROR_CODES.OAUTH_ERROR, message, { details, requestId });
};

module.exports = {
  ErrorResponse,
  ERROR_CODES,
  STATUS_CODE_MAP,
  SAFE_ERROR_MESSAGES
};
