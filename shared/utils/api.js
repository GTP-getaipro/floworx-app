/**
 * API Utilities for FloWorx SaaS
 * Common API handling, request/response utilities, and HTTP helpers
 */

/**
 * HTTP status codes
 */
const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  
  // Client Error
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Error
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

/**
 * API response status types
 */
const API_STATUS = {
  SUCCESS: 'success',
  ERROR: 'error',
  LOADING: 'loading',
  IDLE: 'idle'
};

/**
 * Create standardized API response
 */
const createApiResponse = (success, data = null, error = null, meta = {}) => {
  const response = {
    success,
    timestamp: new Date().toISOString()
  };

  if (success) {
    response.data = data;
    if (Object.keys(meta).length > 0) {
      response.meta = meta;
    }
  } else {
    response.error = {
      message: error?.message || 'An error occurred',
      code: error?.code || 'UNKNOWN_ERROR',
      details: error?.details || null,
      ...(error?.statusCode && { statusCode: error.statusCode })
    };
  }

  return response;
};

/**
 * Create success response
 */
const createSuccessResponse = (data, meta = {}) => {
  return createApiResponse(true, data, null, meta);
};

/**
 * Create error response
 */
const createErrorResponse = (error, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR) => {
  const errorObj = typeof error === 'string' ? { message: error } : error;
  return createApiResponse(false, null, { ...errorObj, statusCode });
};

/**
 * Create paginated response
 */
const createPaginatedResponse = (items, pagination, meta = {}) => {
  return createSuccessResponse(items, {
    pagination,
    ...meta
  });
};

/**
 * Parse query parameters with type conversion
 */
const parseQueryParams = (query, schema = {}) => {
  const parsed = {};
  
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    
    const schemaType = schema[key]?.type || 'string';
    
    try {
      switch (schemaType) {
        case 'number':
          parsed[key] = Number(value);
          break;
        case 'boolean':
          parsed[key] = value === 'true' || value === true;
          break;
        case 'array':
          parsed[key] = Array.isArray(value) ? value : [value];
          break;
        case 'json':
          parsed[key] = typeof value === 'string' ? JSON.parse(value) : value;
          break;
        case 'date':
          parsed[key] = new Date(value);
          break;
        default:
          parsed[key] = String(value);
      }
    } catch (error) {
      // If parsing fails, keep original value
      parsed[key] = value;
    }
  });
  
  return parsed;
};

/**
 * Build query string from object
 */
const buildQueryString = (params) => {
  if (!params || typeof params !== 'object') return '';
  
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => searchParams.append(key, String(item)));
      } else if (typeof value === 'object') {
        searchParams.append(key, JSON.stringify(value));
      } else {
        searchParams.append(key, String(value));
      }
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

/**
 * Extract error message from API response
 */
const extractErrorMessage = (error) => {
  if (typeof error === 'string') return error;
  
  // Axios error structure
  if (error.response?.data?.error?.message) {
    return error.response.data.error.message;
  }
  
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Fetch error structure
  if (error.error?.message) {
    return error.error.message;
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

/**
 * Check if error is network related
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
  if (!error) return false;
  
  const statusCode = error.response?.status || error.statusCode;
  return statusCode === HTTP_STATUS.UNAUTHORIZED || statusCode === HTTP_STATUS.FORBIDDEN;
};

/**
 * Check if error is validation related
 */
const isValidationError = (error) => {
  if (!error) return false;
  
  const statusCode = error.response?.status || error.statusCode;
  return statusCode === HTTP_STATUS.BAD_REQUEST || statusCode === HTTP_STATUS.UNPROCESSABLE_ENTITY;
};

/**
 * Retry configuration
 */
const DEFAULT_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,
  retryCondition: (error) => {
    // Retry on network errors or 5xx server errors
    return isNetworkError(error) || 
           (error.response?.status >= 500 && error.response?.status < 600);
  }
};

/**
 * Create retry wrapper for API calls
 */
const withRetry = async (apiCall, retryConfig = DEFAULT_RETRY_CONFIG) => {
  const { maxRetries, retryDelay, retryCondition } = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;
      
      // Don't retry if condition not met or max retries reached
      if (!retryCondition(error) || attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Create timeout wrapper for API calls
 */
const withTimeout = (apiCall, timeoutMs = 30000) => {
  return Promise.race([
    apiCall(),
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
};

/**
 * Validate API response structure
 */
const validateApiResponse = (response, expectedStructure = {}) => {
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid response: not an object');
  }
  
  // Check required fields
  const requiredFields = expectedStructure.required || ['success'];
  for (const field of requiredFields) {
    if (!(field in response)) {
      throw new Error(`Invalid response: missing required field '${field}'`);
    }
  }
  
  // Check success field
  if ('success' in response && typeof response.success !== 'boolean') {
    throw new Error('Invalid response: success field must be boolean');
  }
  
  // If success is false, check for error
  if (response.success === false && !response.error) {
    throw new Error('Invalid response: error field required when success is false');
  }
  
  return true;
};

/**
 * Create API client configuration
 */
const createApiConfig = (baseURL, options = {}) => {
  return {
    baseURL,
    timeout: options.timeout || 30000,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    withCredentials: options.withCredentials !== false,
    ...options
  };
};

/**
 * Format API endpoint URL
 */
const formatEndpoint = (endpoint, params = {}) => {
  let url = endpoint;
  
  // Replace path parameters
  Object.entries(params).forEach(([key, value]) => {
    url = url.replace(`:${key}`, encodeURIComponent(value));
  });
  
  return url;
};

/**
 * Create request headers with authentication
 */
const createAuthHeaders = (token, tokenType = 'Bearer') => {
  const headers = {};
  
  if (token) {
    headers.Authorization = `${tokenType} ${token}`;
  }
  
  return headers;
};

module.exports = {
  // Constants
  HTTP_STATUS,
  API_STATUS,
  DEFAULT_RETRY_CONFIG,
  
  // Response creators
  createApiResponse,
  createSuccessResponse,
  createErrorResponse,
  createPaginatedResponse,
  
  // Query handling
  parseQueryParams,
  buildQueryString,
  
  // Error handling
  extractErrorMessage,
  isNetworkError,
  isAuthError,
  isValidationError,
  
  // Request utilities
  withRetry,
  withTimeout,
  validateApiResponse,
  createApiConfig,
  formatEndpoint,
  createAuthHeaders
};
