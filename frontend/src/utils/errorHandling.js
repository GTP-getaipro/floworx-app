// Simple error handling utilities
export const ERROR_MESSAGES = {
  CONTACT_SUPPORT: 'If this problem persists, please contact our support team.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  AUTHENTICATION_ERROR: 'Authentication failed. Please check your credentials.',
  EMAIL_ALREADY_EXISTS: 'This email is already registered. Please sign in or use a different email address.',
  REGISTRATION_FAILED: 'Registration failed. Please try again.',
  CONFLICT_ERROR: 'There was a conflict with your request. Please try again.'
};

export const parseError = (error) => {
  if (typeof error === 'string') {
    return {
      type: 'UNKNOWN_ERROR',
      message: error
    };
  }

  if (error?.response) {
    // HTTP error response
    const status = error.response.status;
    const data = error.response.data;
    
    if (status === 400) {
      return {
        type: 'VALIDATION_ERROR',
        message: data?.message || 'Invalid input provided',
        fieldErrors: data?.errors || {}
      };
    }
    
    if (status === 401) {
      return {
        type: 'AUTHENTICATION_ERROR',
        message: data?.message || 'Authentication failed'
      };
    }

    if (status === 409) {
      // Handle conflict errors (e.g., duplicate email)
      const errorMessage = data?.error?.message || data?.message || 'Resource conflict';
      return {
        type: 'CONFLICT_ERROR',
        message: errorMessage,
        suggestLogin: errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('already'),
        userFriendlyMessage: errorMessage.toLowerCase().includes('email already registered')
          ? 'This email is already registered. Please sign in or use a different email address.'
          : errorMessage
      };
    }

    if (status >= 500) {
      return {
        type: 'SERVER_ERROR',
        message: data?.message || 'Server error occurred'
      };
    }

    return {
      type: 'HTTP_ERROR',
      message: data?.message || `HTTP ${status} error`
    };
  }

  if (error?.message) {
    if (error.message.includes('Network')) {
      return {
        type: 'NETWORK_ERROR',
        message: ERROR_MESSAGES.NETWORK_ERROR
      };
    }
    
    return {
      type: 'UNKNOWN_ERROR',
      message: error.message
    };
  }

  return {
    type: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred'
  };
};

export const logError = (error, context = '') => {
  console.error(`Error ${context ? `in ${context}` : ''}:`, error);
  
  // In production, you might want to send this to a logging service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to logging service
    // logToService({ error, context, timestamp: new Date().toISOString() });
  }
};

export default {
  ERROR_MESSAGES,
  parseError,
  logError
};
