const { validationResult } = require('express-validator');
const errorTrackingService = require('../services/errorTrackingService');

/**
 * Centralized Error Handler Middleware for FloWorx SaaS
 * Implements consistent error responses, security-aware logging, and comprehensive error tracking
 */

// Error types and their corresponding HTTP status codes
const ERROR_TYPES = {
  VALIDATION_ERROR: 400,
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
  NOT_FOUND_ERROR: 404,
  CONFLICT_ERROR: 409,
  RATE_LIMIT_ERROR: 429,
  INTERNAL_ERROR: 500,
  DATABASE_ERROR: 500,
  EXTERNAL_SERVICE_ERROR: 502
};

// Security-sensitive error messages (don't expose internal details)
const SAFE_ERROR_MESSAGES = {
  AUTHENTICATION_ERROR: 'Authentication required',
  AUTHORIZATION_ERROR: 'Access denied',
  NOT_FOUND_ERROR: 'Resource not found',
  DATABASE_ERROR: 'Service temporarily unavailable',
  INTERNAL_ERROR: 'Internal server error',
  EXTERNAL_SERVICE_ERROR: 'External service unavailable'
};

/**
 * Custom Error Classes
 */
class AppError extends Error {
  constructor(message, statusCode, errorType = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
  }
}

class ConflictError extends AppError {
  constructor(message, details = null) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_ERROR');
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details = null) {
    super(message, 500, 'DATABASE_ERROR', details);
  }
}

/**
 * Express Validator Error Handler
 * Converts express-validator errors to consistent format
 */
const handleValidationErrors = (req, _res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return next(new ValidationError('Validation failed', validationErrors));
  }
  next();
};

/**
 * Async Route Handler Wrapper
 * Automatically catches async errors and forwards to error handler
 */
const asyncHandler = fn => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Database Error Parser
 * Converts database errors to user-friendly messages
 */
const parseDatabaseError = error => {
  // PostgreSQL error codes
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique violation
        return new ConflictError('Resource already exists', {
          constraint: error.constraint,
          detail: error.detail
        });
      case '23503': // Foreign key violation
        return new ValidationError('Referenced resource does not exist');
      case '23502': // Not null violation
        return new ValidationError('Required field is missing');
      case '22001': // String data too long
        return new ValidationError('Input data too long');
      case '08006': // Connection failure
      case '08001': // Unable to connect
        return new DatabaseError('Database connection failed');
      default:
        return new DatabaseError('Database operation failed');
    }
  }

  return new DatabaseError('Database operation failed');
};

/**
 * Main Error Handler Middleware
 */
const errorHandler = (error, req, res, _next) => {
  let err = error;

  // Convert non-operational errors to AppError
  if (!err.isOperational) {
    if (err.name === 'ValidationError') {
      err = new ValidationError(err.message);
    } else if (err.name === 'CastError') {
      err = new ValidationError('Invalid data format');
    } else if (err.code && err.code.startsWith('23')) {
      err = parseDatabaseError(err);
    } else if (err.name === 'JsonWebTokenError') {
      err = new AuthenticationError('Invalid token');
    } else if (err.name === 'TokenExpiredError') {
      err = new AuthenticationError('Token expired');
    } else {
      err = new AppError('Internal server error', 500, 'INTERNAL_ERROR');
    }
  }

  // Log error (exclude sensitive information in production)
  const isProduction = process.env.NODE_ENV === 'production';
  const logData = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    errorType: err.errorType,
    statusCode: err.statusCode,
    message: err.message
  };

  if (!isProduction) {
    logData.stack = err.stack;
    logData.details = err.details;
  }

  console.error('Error:', JSON.stringify(logData, null, 2));

  // Track error for monitoring and analytics
  errorTrackingService.trackError(err, {
    req,
    user: req.user,
    endpoint: req.route?.path || req.originalUrl,
    statusCode: err.statusCode,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  }).catch(trackingError => {
    console.error('Error tracking failed:', trackingError.message);
  });

  // Prepare response
  const response = {
    success: false,
    error: {
      type: err.errorType,
      message:
        isProduction && err.statusCode >= 500
          ? SAFE_ERROR_MESSAGES[err.errorType] || 'Internal server error'
          : err.message,
      code: err.statusCode
    }
  };

  // Add details for validation errors (safe to expose)
  if (err.errorType === 'VALIDATION_ERROR' && err.details) {
    response.error.details = err.details;
  }

  // Add request ID for tracking (if available)
  if (req.requestId) {
    response.error.requestId = req.requestId;
  }

  res.status(err.statusCode).json(response);
};

/**
 * 404 Handler for unmatched routes
 */
const notFoundHandler = (req, _res, next) => {
  const error = new NotFoundError(`Route ${req.originalUrl} not found`);
  next(error);
};

module.exports = {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,

  // Middleware functions
  errorHandler,
  notFoundHandler,
  handleValidationErrors,
  asyncHandler,

  // Utilities
  parseDatabaseError,
  ERROR_TYPES,
  SAFE_ERROR_MESSAGES
};
