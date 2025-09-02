/**
 * Comprehensive Validation Schemas for FloWorx SaaS
 * Centralized validation for all API endpoints
 */

const Joi = require('joi');

/**
 * Common validation patterns
 */
const commonPatterns = {
  email: Joi.string().email().lowercase().trim().max(255),
  password: Joi.string().min(8).max(128).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  uuid: Joi.string().uuid(),
  name: Joi.string().trim().min(1).max(100),
  businessName: Joi.string().trim().min(1).max(200),
  phone: Joi.string().pattern(/^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/),
  url: Joi.string().uri(),
  businessType: Joi.string().valid('hot_tub', 'pool', 'spa', 'wellness', 'hospitality', 'other'),
  workflowStatus: Joi.string().valid('draft', 'active', 'inactive', 'error', 'archived'),
  executionStatus: Joi.string().valid('pending', 'running', 'success', 'error', 'cancelled', 'timeout'),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }
};

/**
 * Authentication schemas
 */
const authSchemas = {
  register: Joi.object({
    firstName: commonPatterns.name.required(),
    lastName: commonPatterns.name.required(),
    email: commonPatterns.email.required(),
    password: commonPatterns.password.required(),
    businessName: commonPatterns.businessName.required(),
    businessType: commonPatterns.businessType.required(),
    phone: commonPatterns.phone.optional(),
    acceptTerms: Joi.boolean().valid(true).required(),
    marketingConsent: Joi.boolean().default(false)
  }),

  login: Joi.object({
    email: commonPatterns.email.required(),
    password: Joi.string().required(),
    rememberMe: Joi.boolean().default(false)
  }),

  passwordResetRequest: Joi.object({
    email: commonPatterns.email.required()
  }),

  passwordResetConfirm: Joi.object({
    token: Joi.string().required(),
    password: commonPatterns.password.required()
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonPatterns.password.required()
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  })
};

/**
 * Onboarding schemas
 */
const onboardingSchemas = {
  businessInfo: Joi.object({
    businessName: commonPatterns.businessName.required(),
    businessType: commonPatterns.businessType.required(),
    businessDescription: Joi.string().trim().max(500).optional(),
    website: commonPatterns.url.optional(),
    phone: commonPatterns.phone.optional(),
    address: Joi.object({
      street: Joi.string().trim().max(200).optional(),
      city: Joi.string().trim().max(100).optional(),
      state: Joi.string().trim().max(50).optional(),
      zipCode: Joi.string().trim().max(20).optional(),
      country: Joi.string().trim().max(50).default('US')
    }).optional()
  }),

  gmailConnection: Joi.object({
    authorizationCode: Joi.string().required(),
    redirectUri: commonPatterns.url.required()
  }),

  labelMapping: Joi.object({
    mappings: Joi.array().items(
      Joi.object({
        gmailLabel: Joi.string().required(),
        triggerType: Joi.string().valid(
          'new_customer', 'service_request', 'complaint', 
          'inquiry', 'booking', 'follow_up', 'other'
        ).required(),
        priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
        autoRespond: Joi.boolean().default(false),
        responseTemplate: Joi.string().when('autoRespond', {
          is: true,
          then: Joi.required(),
          otherwise: Joi.optional()
        })
      })
    ).min(1).required()
  }),

  teamNotifications: Joi.object({
    notifications: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('email', 'sms', 'slack', 'webhook').required(),
        recipient: Joi.string().required(),
        triggers: Joi.array().items(Joi.string()).min(1).required(),
        enabled: Joi.boolean().default(true)
      })
    ).optional(),
    defaultNotifications: Joi.boolean().default(true)
  }),

  workflowPreferences: Joi.object({
    autoStart: Joi.boolean().default(true),
    businessHours: Joi.object({
      enabled: Joi.boolean().default(false),
      timezone: Joi.string().default('America/New_York'),
      schedule: Joi.object({
        monday: Joi.object({ start: Joi.string(), end: Joi.string() }).optional(),
        tuesday: Joi.object({ start: Joi.string(), end: Joi.string() }).optional(),
        wednesday: Joi.object({ start: Joi.string(), end: Joi.string() }).optional(),
        thursday: Joi.object({ start: Joi.string(), end: Joi.string() }).optional(),
        friday: Joi.object({ start: Joi.string(), end: Joi.string() }).optional(),
        saturday: Joi.object({ start: Joi.string(), end: Joi.string() }).optional(),
        sunday: Joi.object({ start: Joi.string(), end: Joi.string() }).optional()
      }).optional()
    }).optional(),
    responseDelay: Joi.number().integer().min(0).max(3600).default(0), // seconds
    escalationRules: Joi.array().items(
      Joi.object({
        condition: Joi.string().required(),
        action: Joi.string().required(),
        delay: Joi.number().integer().min(0).required()
      })
    ).optional()
  })
};

/**
 * Workflow schemas
 */
const workflowSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(1).max(200).required(),
    description: Joi.string().trim().max(1000).optional(),
    triggerType: Joi.string().valid(
      'new_customer', 'service_request', 'complaint', 
      'inquiry', 'booking', 'follow_up', 'other'
    ).required(),
    configuration: Joi.object().required(),
    isActive: Joi.boolean().default(true)
  }),

  update: Joi.object({
    name: Joi.string().trim().min(1).max(200).optional(),
    description: Joi.string().trim().max(1000).optional(),
    configuration: Joi.object().optional(),
    isActive: Joi.boolean().optional()
  }),

  execute: Joi.object({
    inputData: Joi.object().required(),
    context: Joi.object().optional()
  }),

  query: Joi.object({
    ...commonPatterns.pagination,
    status: commonPatterns.workflowStatus.optional(),
    triggerType: Joi.string().optional(),
    search: Joi.string().trim().max(100).optional(),
    sortBy: Joi.string().valid('name', 'created_at', 'updated_at', 'status').default('updated_at'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Analytics schemas
 */
const analyticsSchemas = {
  trackEvent: Joi.object({
    eventType: Joi.string().valid(
      'workflow_executed', 'email_processed', 'user_action', 
      'system_event', 'error_occurred', 'performance_metric'
    ).required(),
    eventData: Joi.object().required(),
    metadata: Joi.object().optional()
  }),

  query: Joi.object({
    ...commonPatterns.pagination,
    eventType: Joi.string().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
    userId: commonPatterns.uuid.optional(),
    workflowId: commonPatterns.uuid.optional()
  }),

  dashboard: Joi.object({
    period: Joi.string().valid('day', 'week', 'month', 'quarter', 'year').default('week'),
    metrics: Joi.array().items(
      Joi.string().valid(
        'workflow_executions', 'email_volume', 'response_times',
        'error_rates', 'user_activity', 'system_performance'
      )
    ).optional()
  })
};

/**
 * Business configuration schemas
 */
const businessSchemas = {
  update: Joi.object({
    businessName: commonPatterns.businessName.optional(),
    businessType: commonPatterns.businessType.optional(),
    businessDescription: Joi.string().trim().max(500).optional(),
    website: commonPatterns.url.optional(),
    phone: commonPatterns.phone.optional(),
    address: Joi.object({
      street: Joi.string().trim().max(200).optional(),
      city: Joi.string().trim().max(100).optional(),
      state: Joi.string().trim().max(50).optional(),
      zipCode: Joi.string().trim().max(20).optional(),
      country: Joi.string().trim().max(50).optional()
    }).optional(),
    settings: Joi.object().optional()
  }),

  query: Joi.object({
    type: commonPatterns.businessType.optional(),
    active: Joi.boolean().optional()
  })
};

/**
 * Recovery schemas
 */
const recoverySchemas = {
  reportError: Joi.object({
    error: Joi.object({
      message: Joi.string().required(),
      stack: Joi.string().optional(),
      name: Joi.string().optional()
    }).required(),
    context: Joi.object().optional(),
    errorInfo: Joi.object().optional()
  }),

  recoverSession: Joi.object({
    sessionId: Joi.string().required(),
    step: Joi.string().optional()
  })
};

/**
 * Export all schemas
 */
module.exports = {
  auth: authSchemas,
  onboarding: onboardingSchemas,
  workflows: workflowSchemas,
  analytics: analyticsSchemas,
  business: businessSchemas,
  recovery: recoverySchemas,
  common: commonPatterns
};
