/**
 * Standardized Error Handler Middleware
 * Replaces the existing error handler with a more consistent approach
 */

const { ErrorResponse, ERROR_CODES } = require('../utils/ErrorResponse');
const errorTrackingService = require('../services/errorTrackingService');

/**
 * Request ID middleware - adds unique ID to each request for tracking
 */
const requestIdMiddleware = (req, res, next) => {
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

/**
 * Enhanced async wrapper that uses standardized error responses
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Database error parser - converts database errors to standardized format
 */
const parseDatabaseError = (error) => {
  if (error.code) {
    switch (error.code) {
      case '23505': // Unique violation
        return ErrorResponse.conflict('Resource already exists', {
          constraint: error.constraint,
          detail: error.detail
        });
      case '23503': // Foreign key violation
        return ErrorResponse.validation('Referenced resource does not exist');
      case '23502': // Not null violation
        return ErrorResponse.validation('Required field is missing');
      case '22001': // String data too long
        return ErrorResponse.validation('Input data too long');
      case '08006': // Connection failure
      case '08001': // Unable to connect
        return ErrorResponse.database('Database connection failed');
      default:
        return ErrorResponse.database('Database operation failed');
    }
  }
  return ErrorResponse.database('Database operation failed');
};

/**
 * Main standardized error handler
 */
const standardErrorHandler = async (error, req, res, next) => {
  let errorResponse;

  // Check if it's already a standardized ErrorResponse
  if (error instanceof ErrorResponse) {
    errorResponse = error;
  } else {
    // Convert various error types to standardized format
    if (error.name === 'ValidationError') {
      errorResponse = ErrorResponse.validation(error.message, error.details, req.requestId);
    } else if (error.name === 'CastError') {
      errorResponse = ErrorResponse.validation('Invalid data format', null, req.requestId);
    } else if (error.name === 'SyntaxError' && error.message.includes('JSON')) {
      errorResponse = ErrorResponse.validation('Invalid JSON format', null, req.requestId);
    } else if (error.code && error.code.startsWith('23')) {
      errorResponse = parseDatabaseError(error);
      errorResponse.requestId = req.requestId;
    } else if (error.name === 'JsonWebTokenError') {
      errorResponse = ErrorResponse.authentication('Invalid token', req.requestId);
    } else if (error.name === 'TokenExpiredError') {
      errorResponse = ErrorResponse.authentication('Token expired', req.requestId);
    } else if (error.name === 'MulterError') {
      if (error.code === 'LIMIT_FILE_SIZE') {
        errorResponse = new ErrorResponse(ERROR_CODES.PAYLOAD_TOO_LARGE, 'File too large', {
          requestId: req.requestId,
          details: { maxSize: error.limit }
        });
      } else {
        errorResponse = ErrorResponse.validation('File upload error', { code: error.code }, req.requestId);
      }
    } else if (error.type === 'entity.too.large') {
      errorResponse = new ErrorResponse(ERROR_CODES.PAYLOAD_TOO_LARGE, 'Request payload too large', {
        requestId: req.requestId
      });
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      errorResponse = ErrorResponse.external('External service unavailable', { code: error.code }, req.requestId);
    } else if (error.code === 'ETIMEDOUT') {
      errorResponse = new ErrorResponse(ERROR_CODES.TIMEOUT_ERROR, 'Request timeout', {
        requestId: req.requestId,
        context: { code: error.code }
      });
    } else {
      // Generic internal error
      errorResponse = ErrorResponse.internalError('An unexpected error occurred', {
        originalError: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        requestId: req.requestId
      });
    }
  }

  // Track error for monitoring (don't let tracking errors break the response)
  try {
    await errorTrackingService.trackError(error, {
      method: req.method,
      url: req.originalUrl,
      user: req.user,
      endpoint: req.route?.path || req.originalUrl,
      statusCode: errorResponse.statusCode,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      requestId: req.requestId,
      errorCode: errorResponse.code
    });
  } catch (trackingError) {
    // Log tracking failure but don't break the error response
    console.error('Error tracking failed:', trackingError.message);
  }

  // Send standardized error response
  errorResponse.send(res, req);
};

/**
 * 404 handler for unmatched routes
 */
const notFoundHandler = (req, res, next) => {
  const errorResponse = ErrorResponse.notFound(`Route ${req.method} ${req.originalUrl} not found`, req.requestId);
  errorResponse.send(res, req);
};

/**
 * Validation error handler for express-validator
 */
const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const details = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));
    
    const errorResponse = ErrorResponse.validation('Validation failed', details, req.requestId);
    return errorResponse.send(res, req);
  }
  
  next();
};

/**
 * Success response helper
 */
const successResponse = (res, data, message = null, statusCode = 200) => {
  const response = {
    success: true,
    data
  };
  
  if (message) {
    response.message = message;
  }
  
  res.status(statusCode).json(response);
};

/**
 * Paginated response helper
 */
const paginatedResponse = (res, data, pagination, message = null) => {
  const response = {
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1
    }
  };
  
  if (message) {
    response.message = message;
  }
  
  res.json(response);
};

/**
 * Debug logging middleware (only in development)
 */
const debugLogger = (req, res, next) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    if (req.user) {
      console.log(`  User: ${req.user.id} (${req.user.email})`);
    }
  }
  next();
};

module.exports = {
  requestIdMiddleware,
  asyncHandler,
  standardErrorHandler,
  notFoundHandler,
  handleValidationErrors,
  successResponse,
  paginatedResponse,
  debugLogger,
  parseDatabaseError
};
