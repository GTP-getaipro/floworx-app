/**
 * User Management Validation Schemas
 * Schemas for user profile, preferences, and account management
 */

const Joi = require('joi');
const { email, name, optionalName, phone, uuid, optionalUuid, url, paginationQuery } = require('./common');

// User profile update schema
const updateProfileSchema = Joi.object({
  firstName: optionalName,
  lastName: optionalName,
  phone: phone,
  businessName: Joi.string().trim().min(1).max(200).optional().messages({
    'string.min': 'Business name must be at least 1 character',
    'string.max': 'Business name must be less than 200 characters'
  }),
  timezone: Joi.string().optional().messages({
    'string.base': 'Timezone must be a valid timezone string'
  }),
  avatar: url
}).options({ stripUnknown: true });

// User preferences schema
const userPreferencesSchema = Joi.object({
  emailNotifications: Joi.object({
    marketing: Joi.boolean().default(false),
    security: Joi.boolean().default(true),
    workflow: Joi.boolean().default(true),
    system: Joi.boolean().default(true)
  }).default({}),

  smsNotifications: Joi.object({
    security: Joi.boolean().default(false),
    workflow: Joi.boolean().default(false),
    emergency: Joi.boolean().default(true)
  }).default({}),

  workflowPreferences: Joi.object({
    autoStart: Joi.boolean().default(false),
    pauseOnError: Joi.boolean().default(true),
    maxRetries: Joi.number().integer().min(0).max(10).default(3),
    retryDelay: Joi.number().integer().min(1).max(3600).default(60) // seconds
  }).default({}),

  uiPreferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'auto').default('light'),
    language: Joi.string().valid('en', 'es', 'fr', 'de').default('en'),
    dateFormat: Joi.string().valid('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD').default('MM/DD/YYYY'),
    timeFormat: Joi.string().valid('12h', '24h').default('12h')
  }).default({})
}).options({ stripUnknown: true });

// Email change request schema
const emailChangeRequestSchema = Joi.object({
  newEmail: email,
  password: Joi.string().required().messages({
    'string.empty': 'Password is required to change email',
    'any.required': 'Password is required to change email'
  })
}).options({ stripUnknown: true });

// Email change confirmation schema
const emailChangeConfirmSchema = Joi.object({
  token: Joi.string().required().messages({
    'string.empty': 'Confirmation token is required',
    'any.required': 'Confirmation token is required'
  })
}).options({ stripUnknown: true });

// Account deactivation schema
const accountDeactivationSchema = Joi.object({
  password: Joi.string().required().messages({
    'string.empty': 'Password is required to deactivate account',
    'any.required': 'Password is required to deactivate account'
  }),
  reason: Joi.string()
    .valid(
      'temporary_break',
      'switching_service',
      'privacy_concerns',
      'too_expensive',
      'not_useful',
      'technical_issues',
      'other'
    )
    .optional()
    .messages({
      'any.only': 'Please select a valid reason for deactivation'
    }),
  feedback: Joi.string().max(1000).optional().messages({
    'string.max': 'Feedback must be less than 1000 characters'
  })
}).options({ stripUnknown: true });

// Account deletion schema
const accountDeletionSchema = Joi.object({
  password: Joi.string().required().messages({
    'string.empty': 'Password is required to delete account',
    'any.required': 'Password is required to delete account'
  }),
  confirmDeletion: Joi.string().valid('DELETE').required().messages({
    'any.only': 'You must type "DELETE" to confirm account deletion',
    'any.required': 'Deletion confirmation is required'
  }),
  reason: Joi.string()
    .valid('privacy_concerns', 'switching_service', 'not_useful', 'too_expensive', 'technical_issues', 'other')
    .optional()
    .messages({
      'any.only': 'Please select a valid reason for deletion'
    }),
  feedback: Joi.string().max(1000).optional().messages({
    'string.max': 'Feedback must be less than 1000 characters'
  })
}).options({ stripUnknown: true });

// User search schema
const userSearchSchema = Joi.object({
  ...paginationQuery.describe().keys,
  role: Joi.string().valid('user', 'admin', 'moderator').optional().messages({
    'any.only': 'Role must be one of: user, admin, moderator'
  }),
  status: Joi.string().valid('active', 'inactive', 'suspended', 'pending').optional().messages({
    'any.only': 'Status must be one of: active, inactive, suspended, pending'
  }),
  verified: Joi.boolean().optional(),
  createdAfter: Joi.date().iso().optional().messages({
    'date.format': 'Created after date must be in ISO format'
  }),
  createdBefore: Joi.date().iso().optional().messages({
    'date.format': 'Created before date must be in ISO format'
  })
}).options({ stripUnknown: true });

// Admin user update schema
const adminUserUpdateSchema = Joi.object({
  firstName: optionalName,
  lastName: optionalName,
  email: email.optional(),
  phone: phone,
  role: Joi.string().valid('user', 'admin', 'moderator').optional().messages({
    'any.only': 'Role must be one of: user, admin, moderator'
  }),
  status: Joi.string().valid('active', 'inactive', 'suspended').optional().messages({
    'any.only': 'Status must be one of: active, inactive, suspended'
  }),
  verified: Joi.boolean().optional(),
  notes: Joi.string().max(1000).optional().messages({
    'string.max': 'Notes must be less than 1000 characters'
  })
}).options({ stripUnknown: true });

// User activity log schema
const userActivityLogSchema = Joi.object({
  userId: uuid,
  action: Joi.string().required().messages({
    'string.empty': 'Action is required',
    'any.required': 'Action is required'
  }),
  details: Joi.object().optional(),
  ipAddress: Joi.string().ip().optional().messages({
    'string.ip': 'IP address must be valid'
  }),
  userAgent: Joi.string().optional()
}).options({ stripUnknown: true });

module.exports = {
  updateProfileSchema,
  userPreferencesSchema,
  emailChangeRequestSchema,
  emailChangeConfirmSchema,
  accountDeactivationSchema,
  accountDeletionSchema,
  userSearchSchema,
  adminUserUpdateSchema,
  userActivityLogSchema
};
