/**
 * Frontend Utilities Index for FloWorx SaaS
 * Consolidates shared utilities with frontend-specific extensions
 */

// Frontend-specific utilities
import apiClient from './apiClient';
// Note: Other utilities will be added as they are created
// import storage from './storage';
// import navigation from './navigation';
// import validation from './validation';
// import hooks from './hooks';

// Export consolidated utilities
export {
  // Frontend-specific utilities
  apiClient,
  // storage,
  // navigation,
  // validation,
  hooks,

  // Convenience aliases for commonly used functions
  formatDate,
  formatCurrency,
  formatNumber,
  formatDuration,
  formatFileSize,
  formatPhoneNumber,
  formatAddress,
  formatName,
  formatBusinessName,
  formatStatus,
  formatErrorMessage,

  // Date utilities
  parseDate,
  isValidDate,
  getRelativeTime,
  getDateRange,
  addTime,
  getTimeDifference,

  // String utilities
  generateUuid,
  generateSlug,
  toCamelCase,
  toPascalCase,
  toSnakeCase,
  toKebabCase,
  capitalize,
  truncateText,
  maskEmail,
  maskPhone,

  // Object utilities
  deepClone,
  deepMerge,
  isEmpty,
  isObject,
  get,
  set,
  pick,
  omit,
  mapKeys,
  mapValues,

  // Array utilities
  unique,
  chunk,
  flatten,
  compact,
  sortBy,
  groupBy,
  filterBy,
  paginate,
  shuffle,
  sample,

  // Validation utilities
  isValidEmail,
  isValidPhone,
  isValidPassword,
  isValidUrl,
  isValidUuid,
  isRequired,
  validateFields,

  // Type checking
  isString,
  isNumber,
  isBoolean,
  isArray,
  isFunction,
  getType,

  // API utilities
  createSuccessResponse,
  createErrorResponse,
  parseQueryParams,
  buildQueryString,
  extractErrorMessage,
  isNetworkError,
  isAuthError,
  isValidationError,

  // Security utilities
  sanitizeString,
  sanitizeHtml,
  escapeHtml,
  sanitizeEmail,
  generateSecureToken,
  validatePasswordStrength,
  maskSensitiveData,

  // Constants
  HTTP_STATUS,
  API_STATUS,
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
  WORKFLOW_STATUS,
  WORKFLOW_STATUS_LABELS,
  ONBOARDING_STEPS,
  ONBOARDING_STEP_LABELS,
  EMAIL_TRIGGERS,
  EMAIL_TRIGGER_LABELS,
  PRIORITY_LEVELS,
  PRIORITY_LABELS,
  ERROR_CODES,
  DATE_FORMATS,
  REGEX,
} from '../../../shared/utils';

// Re-export for CommonJS compatibility
module.exports = {
  ...sharedUtils,
  apiClient,
  storage,
  navigation,
  validation,
  hooks,
};
