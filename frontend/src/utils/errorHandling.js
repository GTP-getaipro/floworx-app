// Error message constants
export const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TIMEOUT_ERROR: 'Request timed out. Please try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  
  // Authentication errors
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  ACCOUNT_LOCKED: 'Your account has been locked. Please contact support.',
  
  // Validation errors
  REQUIRED_FIELD: 'This field is required.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_PASSWORD: 'Password must be at least 8 characters long.',
  PASSWORDS_DONT_MATCH: 'Passwords do not match.',
  
  // Registration errors
  EMAIL_ALREADY_EXISTS: 'An account with this email already exists.',
  REGISTRATION_FAILED: 'Registration failed. Please try again.',
  EMAIL_VERIFICATION_REQUIRED: 'Please verify your email address.',
  
  // OAuth errors
  OAUTH_ERROR: 'OAuth authentication failed.',
  OAUTH_CANCELLED: 'OAuth authentication was cancelled.',
  OAUTH_CONFIGURATION_ERROR: 'OAuth configuration error.',
  
  // Generic errors
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  FORM_VALIDATION_ERROR: 'Please correct the errors in the form.',
  OPERATION_FAILED: 'Operation failed. Please try again.'
};

// Error types for categorization
export const ERROR_TYPES = {
  NETWORK: 'network',
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  SERVER: 'server',
  CLIENT: 'client',
  OAUTH: 'oauth',
  UNKNOWN: 'unknown'
};

// Parse error from various sources
export const parseError = (error) => {
  // Handle null/undefined errors
  if (!error) {
    return {
      message: ERROR_MESSAGES.UNKNOWN_ERROR,
      type: ERROR_TYPES.UNKNOWN,
      code: null,
      details: null
    };
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      type: ERROR_TYPES.UNKNOWN,
      code: null,
      details: null
    };
  }

  // Handle axios errors
  if (error.response) {
    const { status, data } = error.response;
    
    // Server responded with error status
    let message = ERROR_MESSAGES.SERVER_ERROR;
    let type = ERROR_TYPES.SERVER;
    let code = status;
    
    if (data) {
      if (data.message) {
        message = data.message;
      } else if (data.error) {
        message = typeof data.error === 'string' ? data.error : data.error.message || ERROR_MESSAGES.SERVER_ERROR;
      }
      
      // Determine error type based on status code
      if (status === 400) {
        type = ERROR_TYPES.VALIDATION;
        message = data.message || ERROR_MESSAGES.FORM_VALIDATION_ERROR;
      } else if (status === 401) {
        type = ERROR_TYPES.AUTHENTICATION;
        message = data.message || ERROR_MESSAGES.UNAUTHORIZED;
      } else if (status === 403) {
        type = ERROR_TYPES.AUTHORIZATION;
        message = data.message || ERROR_MESSAGES.UNAUTHORIZED;
      } else if (status === 409) {
        type = ERROR_TYPES.VALIDATION;
        message = data.message || ERROR_MESSAGES.EMAIL_ALREADY_EXISTS;
      } else if (status >= 500) {
        type = ERROR_TYPES.SERVER;
        message = data.message || ERROR_MESSAGES.SERVER_ERROR;
      }
    }
    
    return {
      message,
      type,
      code,
      details: data
    };
  }

  // Handle network errors
  if (error.request) {
    return {
      message: ERROR_MESSAGES.NETWORK_ERROR,
      type: ERROR_TYPES.NETWORK,
      code: null,
      details: error.request
    };
  }

  // Handle timeout errors
  if (error.code === 'ECONNABORTED') {
    return {
      message: ERROR_MESSAGES.TIMEOUT_ERROR,
      type: ERROR_TYPES.NETWORK,
      code: 'TIMEOUT',
      details: error
    };
  }

  // Handle validation errors from forms
  if (error.name === 'ValidationError' || error.type === 'validation') {
    return {
      message: error.message || ERROR_MESSAGES.FORM_VALIDATION_ERROR,
      type: ERROR_TYPES.VALIDATION,
      code: 'VALIDATION_ERROR',
      details: error.details || error.errors
    };
  }

  // Handle OAuth errors
  if (error.type === 'oauth' || error.message?.includes('OAuth')) {
    return {
      message: error.message || ERROR_MESSAGES.OAUTH_ERROR,
      type: ERROR_TYPES.OAUTH,
      code: error.code || 'OAUTH_ERROR',
      details: error
    };
  }

  // Handle generic Error objects
  if (error instanceof Error) {
    return {
      message: error.message || ERROR_MESSAGES.UNKNOWN_ERROR,
      type: ERROR_TYPES.UNKNOWN,
      code: error.code || null,
      details: error
    };
  }

  // Handle objects with error properties
  if (error.error || error.message) {
    return {
      message: error.message || error.error || ERROR_MESSAGES.UNKNOWN_ERROR,
      type: error.type || ERROR_TYPES.UNKNOWN,
      code: error.code || null,
      details: error
    };
  }

  // Fallback for unknown error formats
  return {
    message: ERROR_MESSAGES.UNKNOWN_ERROR,
    type: ERROR_TYPES.UNKNOWN,
    code: null,
    details: error
  };
};

// Log error with context
export const logError = (error, context = {}) => {
  const parsedError = parseError(error);
  
  const logData = {
    timestamp: new Date().toISOString(),
    error: parsedError,
    context,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'Unknown'
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.group('🚨 Error Log');
    console.error('Message:', parsedError.message);
    console.error('Type:', parsedError.type);
    console.error('Code:', parsedError.code);
    console.error('Context:', context);
    console.error('Details:', parsedError.details);
    console.groupEnd();
  }

  // In production, you might want to send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to error tracking service
    // errorTrackingService.captureError(logData);
  }

  return logData;
};

// Get user-friendly error message
export const getUserFriendlyMessage = (error) => {
  const parsedError = parseError(error);
  
  // Map technical errors to user-friendly messages
  const friendlyMessages = {
    'Network Error': ERROR_MESSAGES.NETWORK_ERROR,
    'Request failed with status code 500': ERROR_MESSAGES.SERVER_ERROR,
    'Request failed with status code 401': ERROR_MESSAGES.SESSION_EXPIRED,
    'Request failed with status code 403': ERROR_MESSAGES.UNAUTHORIZED,
    'timeout': ERROR_MESSAGES.TIMEOUT_ERROR
  };

  return friendlyMessages[parsedError.message] || parsedError.message;
};

// Check if error is retryable
export const isRetryableError = (error) => {
  const parsedError = parseError(error);
  
  const retryableTypes = [ERROR_TYPES.NETWORK, ERROR_TYPES.SERVER];
  const retryableCodes = [500, 502, 503, 504, 'TIMEOUT', 'ECONNABORTED'];
  
  return retryableTypes.includes(parsedError.type) || 
         retryableCodes.includes(parsedError.code);
};

// Create error boundary error
export const createErrorBoundaryError = (error, errorInfo) => {
  return {
    message: 'Application error occurred',
    type: ERROR_TYPES.CLIENT,
    code: 'ERROR_BOUNDARY',
    details: {
      error: error.toString(),
      errorInfo,
      stack: error.stack
    }
  };
};

// Validation error helpers
export const createValidationError = (field, message) => {
  return {
    name: 'ValidationError',
    type: 'validation',
    field,
    message,
    details: { [field]: message }
  };
};

export const createValidationErrors = (errors) => {
  return {
    name: 'ValidationError',
    type: 'validation',
    message: ERROR_MESSAGES.FORM_VALIDATION_ERROR,
    details: errors
  };
};

export default {
  ERROR_MESSAGES,
  ERROR_TYPES,
  parseError,
  logError,
  getUserFriendlyMessage,
  isRetryableError,
  createErrorBoundaryError,
  createValidationError,
  createValidationErrors
};
