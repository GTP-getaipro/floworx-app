/**
 * Constants for FloWorx SaaS
 * Shared constants used across frontend and backend
 */

/**
 * Application constants
 */
const APP = {
  NAME: 'FloWorx',
  VERSION: '1.0.0',
  DESCRIPTION: 'Intelligent Email Workflow Automation for Service Businesses',
  COMPANY: 'FloWorx IQ',
  WEBSITE: 'https://www.floworx-iq.com',
  SUPPORT_EMAIL: 'support@floworx-iq.com'
};

/**
 * Environment constants
 */
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test'
};

/**
 * User roles and permissions
 */
const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  VIEWER: 'viewer'
};

const PERMISSIONS = {
  // User management
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  
  // Workflow management
  WORKFLOW_CREATE: 'workflow:create',
  WORKFLOW_READ: 'workflow:read',
  WORKFLOW_UPDATE: 'workflow:update',
  WORKFLOW_DELETE: 'workflow:delete',
  WORKFLOW_EXECUTE: 'workflow:execute',
  
  // Analytics
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_EXPORT: 'analytics:export',
  
  // System administration
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_MONITOR: 'system:monitor'
};

/**
 * Business types
 */
const BUSINESS_TYPES = {
  HOT_TUB: 'hot_tub',
  POOL: 'pool',
  SPA: 'spa',
  WELLNESS: 'wellness',
  HOSPITALITY: 'hospitality',
  OTHER: 'other'
};

const BUSINESS_TYPE_LABELS = {
  [BUSINESS_TYPES.HOT_TUB]: 'Hot Tub Services',
  [BUSINESS_TYPES.POOL]: 'Pool Services',
  [BUSINESS_TYPES.SPA]: 'Spa Services',
  [BUSINESS_TYPES.WELLNESS]: 'Wellness Services',
  [BUSINESS_TYPES.HOSPITALITY]: 'Hospitality',
  [BUSINESS_TYPES.OTHER]: 'Other'
};

/**
 * Workflow statuses
 */
const WORKFLOW_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ERROR: 'error',
  ARCHIVED: 'archived'
};

const WORKFLOW_STATUS_LABELS = {
  [WORKFLOW_STATUS.DRAFT]: 'Draft',
  [WORKFLOW_STATUS.ACTIVE]: 'Active',
  [WORKFLOW_STATUS.INACTIVE]: 'Inactive',
  [WORKFLOW_STATUS.ERROR]: 'Error',
  [WORKFLOW_STATUS.ARCHIVED]: 'Archived'
};

/**
 * Workflow execution statuses
 */
const EXECUTION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
  CANCELLED: 'cancelled',
  TIMEOUT: 'timeout'
};

const EXECUTION_STATUS_LABELS = {
  [EXECUTION_STATUS.PENDING]: 'Pending',
  [EXECUTION_STATUS.RUNNING]: 'Running',
  [EXECUTION_STATUS.SUCCESS]: 'Success',
  [EXECUTION_STATUS.ERROR]: 'Error',
  [EXECUTION_STATUS.CANCELLED]: 'Cancelled',
  [EXECUTION_STATUS.TIMEOUT]: 'Timeout'
};

/**
 * Onboarding steps
 */
const ONBOARDING_STEPS = {
  BUSINESS_INFO: 'business_info',
  GMAIL_CONNECTION: 'gmail_connection',
  LABEL_MAPPING: 'label_mapping',
  TEAM_NOTIFICATIONS: 'team_notifications',
  WORKFLOW_PREFERENCES: 'workflow_preferences',
  REVIEW: 'review',
  COMPLETED: 'completed'
};

const ONBOARDING_STEP_LABELS = {
  [ONBOARDING_STEPS.BUSINESS_INFO]: 'Business Information',
  [ONBOARDING_STEPS.GMAIL_CONNECTION]: 'Gmail Connection',
  [ONBOARDING_STEPS.LABEL_MAPPING]: 'Label Mapping',
  [ONBOARDING_STEPS.TEAM_NOTIFICATIONS]: 'Team Notifications',
  [ONBOARDING_STEPS.WORKFLOW_PREFERENCES]: 'Workflow Preferences',
  [ONBOARDING_STEPS.REVIEW]: 'Review & Confirm',
  [ONBOARDING_STEPS.COMPLETED]: 'Completed'
};

/**
 * Email triggers
 */
const EMAIL_TRIGGERS = {
  NEW_CUSTOMER: 'new_customer',
  SERVICE_REQUEST: 'service_request',
  COMPLAINT: 'complaint',
  INQUIRY: 'inquiry',
  BOOKING: 'booking',
  FOLLOW_UP: 'follow_up',
  OTHER: 'other'
};

const EMAIL_TRIGGER_LABELS = {
  [EMAIL_TRIGGERS.NEW_CUSTOMER]: 'New Customer',
  [EMAIL_TRIGGERS.SERVICE_REQUEST]: 'Service Request',
  [EMAIL_TRIGGERS.COMPLAINT]: 'Complaint',
  [EMAIL_TRIGGERS.INQUIRY]: 'General Inquiry',
  [EMAIL_TRIGGERS.BOOKING]: 'Booking Request',
  [EMAIL_TRIGGERS.FOLLOW_UP]: 'Follow-up',
  [EMAIL_TRIGGERS.OTHER]: 'Other'
};

/**
 * Priority levels
 */
const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

const PRIORITY_LABELS = {
  [PRIORITY_LEVELS.LOW]: 'Low',
  [PRIORITY_LEVELS.MEDIUM]: 'Medium',
  [PRIORITY_LEVELS.HIGH]: 'High',
  [PRIORITY_LEVELS.URGENT]: 'Urgent'
};

/**
 * Notification types
 */
const NOTIFICATION_TYPES = {
  EMAIL: 'email',
  SMS: 'sms',
  SLACK: 'slack',
  WEBHOOK: 'webhook',
  IN_APP: 'in_app'
};

const NOTIFICATION_TYPE_LABELS = {
  [NOTIFICATION_TYPES.EMAIL]: 'Email',
  [NOTIFICATION_TYPES.SMS]: 'SMS',
  [NOTIFICATION_TYPES.SLACK]: 'Slack',
  [NOTIFICATION_TYPES.WEBHOOK]: 'Webhook',
  [NOTIFICATION_TYPES.IN_APP]: 'In-App'
};

/**
 * OAuth providers
 */
const OAUTH_PROVIDERS = {
  GOOGLE: 'google',
  MICROSOFT: 'microsoft',
  GITHUB: 'github'
};

const OAUTH_PROVIDER_LABELS = {
  [OAUTH_PROVIDERS.GOOGLE]: 'Google',
  [OAUTH_PROVIDERS.MICROSOFT]: 'Microsoft',
  [OAUTH_PROVIDERS.GITHUB]: 'GitHub'
};

/**
 * File types and limits
 */
const FILE_TYPES = {
  IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  DOCUMENT: ['pdf', 'doc', 'docx', 'txt'],
  SPREADSHEET: ['xls', 'xlsx', 'csv'],
  ARCHIVE: ['zip', 'rar', '7z']
};

const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES: 5,
  ALLOWED_TYPES: [
    ...FILE_TYPES.IMAGE,
    ...FILE_TYPES.DOCUMENT,
    ...FILE_TYPES.SPREADSHEET,
    ...FILE_TYPES.ARCHIVE
  ]
};

/**
 * API limits and timeouts
 */
const API_LIMITS = {
  REQUEST_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  RATE_LIMIT: {
    GENERAL: 100, // requests per 15 minutes
    AUTH: 5, // requests per 15 minutes
    REGISTRATION: 3, // requests per hour
    PASSWORD_RESET: 3 // requests per hour
  }
};

/**
 * Cache TTL values (in seconds)
 */
const CACHE_TTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  VERY_LONG: 86400, // 24 hours
  USER_DATA: 300, // 5 minutes
  BUSINESS_TYPES: 3600, // 1 hour
  WORKFLOW_TEMPLATES: 1800, // 30 minutes
  ANALYTICS: 600 // 10 minutes
};

/**
 * Pagination defaults
 */
const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_PAGE: 1
};

/**
 * Date/time formats
 */
const DATE_FORMATS = {
  ISO: 'YYYY-MM-DDTHH:mm:ss.sssZ',
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH:mm:ss',
  DISPLAY: 'MMM DD, YYYY',
  DISPLAY_WITH_TIME: 'MMM DD, YYYY at HH:mm'
};

/**
 * Regular expressions
 */
const REGEX = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  PHONE: /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
};

/**
 * Error codes
 */
const ERROR_CODES = {
  // Authentication
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  
  // Business logic
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  NOT_FOUND: 'NOT_FOUND',
  OPERATION_FAILED: 'OPERATION_FAILED',
  
  // System
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED'
};

module.exports = {
  APP,
  ENVIRONMENTS,
  USER_ROLES,
  PERMISSIONS,
  BUSINESS_TYPES,
  BUSINESS_TYPE_LABELS,
  WORKFLOW_STATUS,
  WORKFLOW_STATUS_LABELS,
  EXECUTION_STATUS,
  EXECUTION_STATUS_LABELS,
  ONBOARDING_STEPS,
  ONBOARDING_STEP_LABELS,
  EMAIL_TRIGGERS,
  EMAIL_TRIGGER_LABELS,
  PRIORITY_LEVELS,
  PRIORITY_LABELS,
  NOTIFICATION_TYPES,
  NOTIFICATION_TYPE_LABELS,
  OAUTH_PROVIDERS,
  OAUTH_PROVIDER_LABELS,
  FILE_TYPES,
  FILE_LIMITS,
  API_LIMITS,
  CACHE_TTL,
  PAGINATION,
  DATE_FORMATS,
  REGEX,
  ERROR_CODES
};
