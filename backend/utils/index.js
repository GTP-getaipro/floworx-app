/**
 * Backend Utilities Index for FloWorx SaaS
 * Consolidates shared utilities with backend-specific extensions
 */

// Import shared utilities
const sharedUtils = require('../../shared/utils');

// Import backend-specific utilities
const asyncWrapper = require('./asyncWrapper');
const encryption = require('./encryption');
const backendErrors = require('./errors');
const pagination = require('./pagination');
const security = require('./security');
const validateRequest = require('./validateRequest');

// Export consolidated utilities
module.exports = {
  // Shared utilities (available across frontend and backend)
  ...sharedUtils,
  
  // Backend-specific utilities
  asyncWrapper,
  encryption,
  pagination,
  security,
  validateRequest,
  
  // Override shared errors with backend-specific implementations where needed
  errors: {
    ...sharedUtils.errors,
    ...backendErrors
  },
  
  // Convenience aliases for commonly used functions
  formatDate: sharedUtils.formatDate,
  formatCurrency: sharedUtils.formatCurrency,
  formatNumber: sharedUtils.formatNumber,
  validateEmail: sharedUtils.isValidEmail,
  validatePhone: sharedUtils.isValidPhone,
  validatePassword: sharedUtils.isValidPassword,
  sanitizeString: sharedUtils.sanitizeString,
  sanitizeEmail: sharedUtils.sanitizeEmail,
  generateUuid: sharedUtils.generateUuid,
  generateSlug: sharedUtils.generateSlug,
  deepClone: sharedUtils.deepClone,
  deepMerge: sharedUtils.deepMerge,
  isEmpty: sharedUtils.isEmpty,
  isObject: sharedUtils.isObject,
  isArray: sharedUtils.isArray,
  unique: sharedUtils.unique,
  chunk: sharedUtils.chunk,
  sortBy: sharedUtils.sortBy,
  groupBy: sharedUtils.groupBy,
  
  // API utilities
  createSuccessResponse: sharedUtils.createSuccessResponse,
  createErrorResponse: sharedUtils.createErrorResponse,
  createPaginatedResponse: sharedUtils.createPaginatedResponse,
  parseQueryParams: sharedUtils.parseQueryParams,
  buildQueryString: sharedUtils.buildQueryString,
  
  // Constants
  HTTP_STATUS: sharedUtils.HTTP_STATUS,
  API_STATUS: sharedUtils.API_STATUS,
  BUSINESS_TYPES: sharedUtils.BUSINESS_TYPES,
  WORKFLOW_STATUS: sharedUtils.WORKFLOW_STATUS,
  ERROR_CODES: sharedUtils.ERROR_CODES,
  DATE_FORMATS: sharedUtils.DATE_FORMATS,
  CACHE_TTL: sharedUtils.CACHE_TTL
};
