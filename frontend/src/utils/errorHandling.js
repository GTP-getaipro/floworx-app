/**
 * Comprehensive Error Handling Utilities for FloWorx
 * Provides user-friendly error messages for all scenarios
 */

export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTH_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  SERVER: 'SERVER_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  MAINTENANCE: 'MAINTENANCE_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

export const ERROR_MESSAGES = {
  // Network Errors
  NETWORK_OFFLINE: 'You appear to be offline. Please check your internet connection and try again.',
  NETWORK_TIMEOUT: 'The request took too long to complete. Please try again.',
  NETWORK_GENERAL: 'Network error occurred. Please check your connection and try again.',
  
  // Authentication Errors
  AUTH_INVALID_CREDENTIALS: 'Invalid email or password. Please check your credentials and try again.',
  AUTH_ACCOUNT_LOCKED: 'Your account has been temporarily locked for security. Please try again later or contact support.',
  AUTH_EMAIL_NOT_VERIFIED: 'Please verify your email address before logging in. Check your inbox for the verification link.',
  AUTH_SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  AUTH_ACCOUNT_NOT_FOUND: 'No account found with this email address. Please check your email or create a new account.',
  
  // Registration Errors
  REG_EMAIL_EXISTS: 'An account with this email already exists. Please try logging in instead.',
  REG_WEAK_PASSWORD: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character.',
  REG_INVALID_EMAIL: 'Please enter a valid email address.',
  REG_MISSING_FIELDS: 'Please fill in all required fields.',
  REG_TERMS_NOT_ACCEPTED: 'Please accept the terms and conditions to continue.',
  
  // Server Errors
  SERVER_MAINTENANCE: 'FloWorx is currently undergoing maintenance. Please try again in a few minutes.',
  SERVER_OVERLOADED: 'Our servers are experiencing high traffic. Please try again in a moment.',
  SERVER_GENERAL: 'A server error occurred. Our team has been notified. Please try again later.',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment before trying again.',
  
  // Validation Errors
  VALIDATION_REQUIRED_FIELD: 'This field is required.',
  VALIDATION_INVALID_FORMAT: 'Please enter a valid format.',
  VALIDATION_TOO_SHORT: 'This field is too short.',
  VALIDATION_TOO_LONG: 'This field is too long.',
  
  // Default Messages
  DEFAULT_ERROR: 'Something went wrong. Please try again or contact support if the problem persists.',
  CONTACT_SUPPORT: 'If this problem continues, please contact our support team at support@floworx-iq.com'
};

/**
 * Parse error response and return user-friendly message
 */
export const parseError = (error) => {
  // Network errors
  if (!error.response) {
    if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
      return {
        type: ERROR_TYPES.NETWORK,
        message: ERROR_MESSAGES.NETWORK_GENERAL,
        canRetry: true
      };
    }
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        type: ERROR_TYPES.NETWORK,
        message: ERROR_MESSAGES.NETWORK_TIMEOUT,
        canRetry: true
      };
    }
    
    return {
      type: ERROR_TYPES.NETWORK,
      message: ERROR_MESSAGES.NETWORK_GENERAL,
      canRetry: true
    };
  }

  const { status, data } = error.response;
  const serverMessage = data?.message || data?.error || '';

  // Authentication errors (401)
  if (status === 401) {
    if (serverMessage.toLowerCase().includes('invalid') || serverMessage.toLowerCase().includes('credentials')) {
      return {
        type: ERROR_TYPES.AUTHENTICATION,
        message: ERROR_MESSAGES.AUTH_INVALID_CREDENTIALS,
        canRetry: true
      };
    }
    
    if (serverMessage.toLowerCase().includes('expired')) {
      return {
        type: ERROR_TYPES.AUTHENTICATION,
        message: ERROR_MESSAGES.AUTH_SESSION_EXPIRED,
        canRetry: false,
        requiresLogin: true
      };
    }
    
    return {
      type: ERROR_TYPES.AUTHENTICATION,
      message: ERROR_MESSAGES.AUTH_INVALID_CREDENTIALS,
      canRetry: true
    };
  }

  // Authorization errors (403)
  if (status === 403) {
    return {
      type: ERROR_TYPES.AUTHORIZATION,
      message: 'You don\'t have permission to perform this action.',
      canRetry: false
    };
  }

  // Not found errors (404)
  if (status === 404) {
    return {
      type: ERROR_TYPES.UNKNOWN,
      message: 'The requested resource was not found.',
      canRetry: false
    };
  }

  // Conflict errors (409) - Usually duplicate email
  if (status === 409) {
    if (serverMessage.toLowerCase().includes('email') || serverMessage.toLowerCase().includes('exists')) {
      return {
        type: ERROR_TYPES.VALIDATION,
        message: ERROR_MESSAGES.REG_EMAIL_EXISTS,
        canRetry: false,
        suggestLogin: true
      };
    }
    
    return {
      type: ERROR_TYPES.VALIDATION,
      message: serverMessage || 'A conflict occurred. Please check your information.',
      canRetry: false
    };
  }

  // Validation errors (400)
  if (status === 400) {
    if (serverMessage.toLowerCase().includes('email')) {
      return {
        type: ERROR_TYPES.VALIDATION,
        message: ERROR_MESSAGES.REG_INVALID_EMAIL,
        canRetry: true
      };
    }
    
    if (serverMessage.toLowerCase().includes('password')) {
      return {
        type: ERROR_TYPES.VALIDATION,
        message: ERROR_MESSAGES.REG_WEAK_PASSWORD,
        canRetry: true
      };
    }
    
    if (serverMessage.toLowerCase().includes('required')) {
      return {
        type: ERROR_TYPES.VALIDATION,
        message: ERROR_MESSAGES.REG_MISSING_FIELDS,
        canRetry: true
      };
    }
    
    return {
      type: ERROR_TYPES.VALIDATION,
      message: serverMessage || 'Please check your information and try again.',
      canRetry: true
    };
  }

  // Rate limiting (429)
  if (status === 429) {
    return {
      type: ERROR_TYPES.RATE_LIMIT,
      message: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
      canRetry: true,
      retryAfter: data?.retryAfter || 60
    };
  }

  // Server errors (500+)
  if (status >= 500) {
    if (status === 503) {
      return {
        type: ERROR_TYPES.MAINTENANCE,
        message: ERROR_MESSAGES.SERVER_MAINTENANCE,
        canRetry: true,
        retryAfter: 300
      };
    }
    
    return {
      type: ERROR_TYPES.SERVER,
      message: ERROR_MESSAGES.SERVER_GENERAL,
      canRetry: true,
      retryAfter: 30
    };
  }

  // Default case
  return {
    type: ERROR_TYPES.UNKNOWN,
    message: serverMessage || ERROR_MESSAGES.DEFAULT_ERROR,
    canRetry: true
  };
};

/**
 * Format error for display with action buttons
 */
export const formatErrorForDisplay = (error) => {
  const parsedError = parseError(error);
  
  return {
    ...parsedError,
    title: getErrorTitle(parsedError.type),
    actions: getErrorActions(parsedError)
  };
};

/**
 * Get appropriate title for error type
 */
const getErrorTitle = (errorType) => {
  switch (errorType) {
    case ERROR_TYPES.NETWORK:
      return 'Connection Problem';
    case ERROR_TYPES.AUTHENTICATION:
      return 'Authentication Failed';
    case ERROR_TYPES.AUTHORIZATION:
      return 'Access Denied';
    case ERROR_TYPES.VALIDATION:
      return 'Invalid Information';
    case ERROR_TYPES.RATE_LIMIT:
      return 'Too Many Requests';
    case ERROR_TYPES.MAINTENANCE:
      return 'Maintenance Mode';
    case ERROR_TYPES.SERVER:
      return 'Server Error';
    default:
      return 'Error';
  }
};

/**
 * Get suggested actions for error type
 */
const getErrorActions = (parsedError) => {
  const actions = [];
  
  if (parsedError.canRetry) {
    actions.push({
      label: 'Try Again',
      action: 'retry',
      primary: true
    });
  }
  
  if (parsedError.requiresLogin) {
    actions.push({
      label: 'Log In',
      action: 'login',
      primary: true
    });
  }
  
  if (parsedError.suggestLogin) {
    actions.push({
      label: 'Log In Instead',
      action: 'login',
      primary: false
    });
  }
  
  if (parsedError.type === ERROR_TYPES.SERVER || parsedError.type === ERROR_TYPES.UNKNOWN) {
    actions.push({
      label: 'Contact Support',
      action: 'support',
      primary: false
    });
  }
  
  return actions;
};

/**
 * Log error for debugging (development only)
 */
export const logError = (error, context = '') => {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 FloWorx Error ${context ? `(${context})` : ''}`);
    console.error('Original Error:', error);
    console.error('Parsed Error:', parseError(error));
    console.groupEnd();
  }
};
