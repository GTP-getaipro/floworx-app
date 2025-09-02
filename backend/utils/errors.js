/**
 * Enhanced Custom Error Classes for FloWorx SaaS
 * Provides consistent error handling across the application with detailed context
 */

// Base application error class
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = null, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON for logging/API responses
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      details: this.details,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

// Validation errors (400)
class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }

  /**
   * Create ValidationError from Joi validation result
   */
  static fromJoi(joiError) {
    const details = joiError.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value
    }));

    return new ValidationError('Request validation failed', details);
  }
}

// Authentication errors (401)
class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', details = null) {
    super(message, 401, 'AUTHENTICATION_ERROR', details);
  }
}

// Authorization errors (403)
class AuthorizationError extends AppError {
  constructor(message = 'Access denied', details = null) {
    super(message, 403, 'AUTHORIZATION_ERROR', details);
  }
}

// Not found errors (404)
class NotFoundError extends AppError {
  constructor(message = 'Resource not found', details = null) {
    super(message, 404, 'NOT_FOUND_ERROR', details);
  }
}

// Conflict errors (409)
class ConflictError extends AppError {
  constructor(message = 'Resource conflict', details = null) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

// Rate limit errors (429)
class RateLimitError extends AppError {
  constructor(message = 'Too many requests', details = null) {
    super(message, 429, 'RATE_LIMIT_ERROR', details);
  }
}

// Database errors (500)
class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details = null) {
    super(message, 500, 'DATABASE_ERROR', details);
  }

  /**
   * Create DatabaseError from database-specific errors
   */
  static fromDatabaseError(dbError) {
    let message = 'Database operation failed';
    let details = null;

    // Handle specific database error types
    if (dbError.code === '23505') { // PostgreSQL unique violation
      message = 'Resource already exists';
      details = { constraint: dbError.constraint };
      return new ConflictError(message, details);
    } else if (dbError.code === '23503') { // PostgreSQL foreign key violation
      message = 'Referenced resource not found';
      details = { constraint: dbError.constraint };
      return new ValidationError(message, details);
    } else if (dbError.code === '23502') { // PostgreSQL not null violation
      message = 'Required field missing';
      details = { column: dbError.column };
      return new ValidationError(message, details);
    }

    return new DatabaseError(message, { originalError: dbError.message });
  }
}

// External service errors (502)
class ExternalServiceError extends AppError {
  constructor(message = 'External service unavailable', details = null) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', details);
  }
}

// Business logic errors (422)
class BusinessLogicError extends AppError {
  constructor(message = 'Business rule violation', details = null) {
    super(message, 422, 'BUSINESS_LOGIC_ERROR', details);
  }
}

// Timeout errors (408)
class TimeoutError extends AppError {
  constructor(message = 'Request timeout', details = null) {
    super(message, 408, 'TIMEOUT_ERROR', details);
  }
}

// Service unavailable errors (503)
class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable', details = null) {
    super(message, 503, 'SERVICE_UNAVAILABLE_ERROR', details);
  }
}

/**
 * Error factory for creating appropriate error types
 */
class ErrorFactory {
  /**
   * Create error from HTTP status code
   */
  static fromStatusCode(statusCode, message, details = null) {
    switch (statusCode) {
      case 400:
        return new ValidationError(message, details);
      case 401:
        return new AuthenticationError(message, details);
      case 403:
        return new AuthorizationError(message, details);
      case 404:
        return new NotFoundError(message, details);
      case 409:
        return new ConflictError(message, details);
      case 422:
        return new BusinessLogicError(message, details);
      case 429:
        return new RateLimitError(message, details);
      case 500:
        return new AppError(message, statusCode, 'INTERNAL_ERROR', details);
      case 502:
        return new ExternalServiceError(message, details);
      case 503:
        return new ServiceUnavailableError(message, details);
      default:
        return new AppError(message, statusCode, 'UNKNOWN_ERROR', details);
    }
  }

  /**
   * Create error from external API response
   */
  static fromApiResponse(response, serviceName = 'External Service') {
    const message = `${serviceName} error: ${response.statusText || 'Unknown error'}`;
    const details = {
      service: serviceName,
      status: response.status,
      statusText: response.statusText,
      data: response.data
    };

    if (response.status >= 500) {
      return new ExternalServiceError(message, details);
    } else if (response.status >= 400) {
      return ErrorFactory.fromStatusCode(response.status, message, details);
    }

    return new AppError(message, response.status, 'API_ERROR', details);
  }
}

/**
 * Error utilities
 */
const ErrorUtils = {
  /**
   * Check if error is operational (expected) vs programming error
   */
  isOperational: (error) => {
    return error.isOperational === true;
  },

  /**
   * Get safe error message for client (hides sensitive info in production)
   */
  getSafeMessage: (error) => {
    if (process.env.NODE_ENV === 'development') {
      return error.message;
    }

    // In production, return generic messages for server errors
    if (error.statusCode >= 500) {
      return 'Internal server error';
    }

    return error.message;
  },

  /**
   * Format error for API response
   */
  formatForApi: (error) => {
    return {
      success: false,
      error: {
        message: ErrorUtils.getSafeMessage(error),
        code: error.errorCode || 'UNKNOWN_ERROR',
        statusCode: error.statusCode || 500,
        details: process.env.NODE_ENV === 'development' ? error.details : undefined,
        timestamp: error.timestamp || new Date().toISOString()
      }
    };
  },

  /**
   * Log error with appropriate level
   */
  logError: (error, context = {}) => {
    const logData = {
      ...error.toJSON?.() || {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context
    };

    if (error.statusCode >= 500) {
      console.error('🚨 Server Error:', JSON.stringify(logData, null, 2));
    } else if (error.statusCode >= 400) {
      console.warn('⚠️  Client Error:', JSON.stringify(logData, null, 2));
    } else {
      console.info('ℹ️  Error Info:', JSON.stringify(logData, null, 2));
    }
  }
};

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  BusinessLogicError,
  TimeoutError,
  ServiceUnavailableError,
  ErrorFactory,
  ErrorUtils
};
