/**
 * Error Utilities for FloWorx SaaS
 * Common error handling and formatting functions
 */

const { ERROR_CODES } = require('./constants');

/**
 * Base application error class
 */
class AppError extends Error {
  constructor(message, code = ERROR_CODES.INTERNAL_ERROR, statusCode = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

/**
 * Validation error
 */
class ValidationError extends AppError {
  constructor(message = 'Validation failed', details = null) {
    super(message, ERROR_CODES.VALIDATION_ERROR, 400, details);
  }
}

/**
 * Authentication error
 */
class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, ERROR_CODES.UNAUTHORIZED, 401);
  }
}

/**
 * Authorization error
 */
class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, ERROR_CODES.UNAUTHORIZED, 403);
  }
}

/**
 * Not found error
 */
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, ERROR_CODES.NOT_FOUND, 404);
  }
}

/**
 * Conflict error
 */
class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, ERROR_CODES.DUPLICATE_ENTRY, 409);
  }
}

/**
 * Rate limit error
 */
class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded') {
    super(message, ERROR_CODES.RATE_LIMIT_EXCEEDED, 429);
  }
}

/**
 * Service unavailable error
 */
class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, ERROR_CODES.SERVICE_UNAVAILABLE, 503);
  }
}

/**
 * Extract error message from various error formats
 */
const extractErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  
  // API response error
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Standard error object
  if (error.error?.message) {
    return error.error.message;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

/**
 * Extract error code from various error formats
 */
const extractErrorCode = (error) => {
  if (error.code) return error.code;
  if (error.response?.data?.error?.code) return error.response.data.error.code;
  if (error.response?.data?.code) return error.response.data.code;
  return ERROR_CODES.INTERNAL_ERROR;
};

/**
 * Extract status code from error
 */
const extractStatusCode = (error) => {
  if (error.statusCode) return error.statusCode;
  if (error.response?.status) return error.response.status;
  if (error.status) return error.status;
  return 500;
};

/**
 * Check if error is operational (expected) vs programming error
 */
const isOperationalError = (error) => {
  return error.isOperational === true;
};

/**
 * Check if error is a network error
 */
const isNetworkError = (error) => {
  if (!error) return false;
  
  // Axios network errors
  if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
    return true;
  }
  
  // Fetch network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }
  
  // No response received
  if (error.request && !error.response) {
    return true;
  }
  
  return false;
};

/**
 * Check if error is authentication related
 */
const isAuthError = (error) => {
  const statusCode = extractStatusCode(error);
  return statusCode === 401 || statusCode === 403;
};

/**
 * Check if error is validation related
 */
const isValidationError = (error) => {
  const statusCode = extractStatusCode(error);
  return statusCode === 400 || statusCode === 422;
};

/**
 * Format error for API response
 */
const formatErrorForApi = (error) => {
  return {
    success: false,
    error: {
      message: extractErrorMessage(error),
      code: extractErrorCode(error),
      statusCode: extractStatusCode(error),
      details: error.details || null,
      timestamp: new Date().toISOString()
    }
  };
};

/**
 * Format error for display to user
 */
const formatErrorForDisplay = (error) => {
  const message = extractErrorMessage(error);
  const code = extractErrorCode(error);
  
  // User-friendly messages for common errors
  const friendlyMessages = {
    [ERROR_CODES.INVALID_CREDENTIALS]: 'Invalid email or password. Please try again.',
    [ERROR_CODES.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
    [ERROR_CODES.UNAUTHORIZED]: 'You are not authorized to perform this action.',
    [ERROR_CODES.VALIDATION_ERROR]: 'Please check your input and try again.',
    [ERROR_CODES.DUPLICATE_ENTRY]: 'This item already exists.',
    [ERROR_CODES.NOT_FOUND]: 'The requested item was not found.',
    [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment and try again.',
    [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable. Please try again later.'
  };
  
  return friendlyMessages[code] || message;
};

/**
 * Create error from HTTP response
 */
const createErrorFromResponse = (response) => {
  const statusCode = response.status;
  const message = response.data?.error?.message || response.statusText || 'Request failed';
  const code = response.data?.error?.code || ERROR_CODES.INTERNAL_ERROR;
  const details = response.data?.error?.details || null;
  
  switch (statusCode) {
    case 400:
      return new ValidationError(message, details);
    case 401:
      return new AuthenticationError(message);
    case 403:
      return new AuthorizationError(message);
    case 404:
      return new NotFoundError(message);
    case 409:
      return new ConflictError(message);
    case 429:
      return new RateLimitError(message);
    case 503:
      return new ServiceUnavailableError(message);
    default:
      return new AppError(message, code, statusCode, details);
  }
};

/**
 * Wrap async function with error handling
 */
const withErrorHandling = (fn) => {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      // Re-throw operational errors as-is
      if (isOperationalError(error)) {
        throw error;
      }
      
      // Wrap programming errors
      throw new AppError(
        error.message || 'An unexpected error occurred',
        ERROR_CODES.INTERNAL_ERROR,
        500,
        { originalError: error.message }
      );
    }
  };
};

/**
 * Log error with appropriate level
 */
const logError = (error, context = {}) => {
  const errorData = {
    message: extractErrorMessage(error),
    code: extractErrorCode(error),
    statusCode: extractStatusCode(error),
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  };
  
  const statusCode = extractStatusCode(error);
  
  if (statusCode >= 500) {
    console.error('🚨 Server Error:', JSON.stringify(errorData, null, 2));
  } else if (statusCode >= 400) {
    console.warn('⚠️  Client Error:', JSON.stringify(errorData, null, 2));
  } else {
    console.info('ℹ️  Error Info:', JSON.stringify(errorData, null, 2));
  }
};

/**
 * Create validation error from field errors
 */
const createValidationError = (fieldErrors) => {
  const details = Array.isArray(fieldErrors) ? fieldErrors : [fieldErrors];
  return new ValidationError('Validation failed', details);
};

/**
 * Aggregate multiple errors
 */
const aggregateErrors = (errors) => {
  if (!Array.isArray(errors) || errors.length === 0) {
    return null;
  }
  
  if (errors.length === 1) {
    return errors[0];
  }
  
  const messages = errors.map(error => extractErrorMessage(error));
  const details = errors.map(error => ({
    message: extractErrorMessage(error),
    code: extractErrorCode(error),
    statusCode: extractStatusCode(error)
  }));
  
  return new AppError(
    `Multiple errors occurred: ${messages.join('; ')}`,
    ERROR_CODES.INTERNAL_ERROR,
    500,
    details
  );
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
  ServiceUnavailableError,
  
  // Error utilities
  extractErrorMessage,
  extractErrorCode,
  extractStatusCode,
  isOperationalError,
  isNetworkError,
  isAuthError,
  isValidationError,
  formatErrorForApi,
  formatErrorForDisplay,
  createErrorFromResponse,
  withErrorHandling,
  logError,
  createValidationError,
  aggregateErrors
};
