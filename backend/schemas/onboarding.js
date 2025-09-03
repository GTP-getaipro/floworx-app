/**
 * Onboarding Validation Schemas
 * Schemas for the multi-step onboarding process
 */

const Joi = require('joi');
const { uuid, optionalUuid, name, email, phone } = require('./common');

// Onboarding session creation schema
const createOnboardingSessionSchema = Joi.object({
  userId: uuid,
  businessType: Joi.string().valid('hot_tub', 'pool', 'spa', 'wellness', 'hospitality', 'other').required().messages({
    'any.only': 'Business type must be one of: hot_tub, pool, spa, wellness, hospitality, other',
    'any.required': 'Business type is required'
  }),
  businessName: Joi.string().trim().min(1).max(200).required().messages({
    'string.min': 'Business name must be at least 1 character',
    'string.max': 'Business name must be less than 200 characters',
    'string.empty': 'Business name is required',
    'any.required': 'Business name is required'
  }),
  expectedVolume: Joi.string().valid('low', 'medium', 'high', 'enterprise').optional().messages({
    'any.only': 'Expected volume must be one of: low, medium, high, enterprise'
  })
}).options({ stripUnknown: true });

// Business information step schema
const businessInfoSchema = Joi.object({
  businessName: Joi.string().trim().min(1).max(200).required().messages({
    'string.min': 'Business name must be at least 1 character',
    'string.max': 'Business name must be less than 200 characters',
    'string.empty': 'Business name is required',
    'any.required': 'Business name is required'
  }),
  businessType: Joi.string().valid('hot_tub', 'pool', 'spa', 'wellness', 'hospitality', 'other').required().messages({
    'any.only': 'Business type must be one of: hot_tub, pool, spa, wellness, hospitality, other',
    'any.required': 'Business type is required'
  }),
  businessDescription: Joi.string().trim().max(500).optional().messages({
    'string.max': 'Business description must be less than 500 characters'
  }),
  website: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional()
    .messages({
      'string.uri': 'Website must be a valid URL'
    }),
  address: Joi.object({
    street: Joi.string().trim().max(200).optional(),
    city: Joi.string().trim().max(100).optional(),
    state: Joi.string().trim().max(100).optional(),
    zipCode: Joi.string().trim().max(20).optional(),
    country: Joi.string().trim().max(100).optional()
  }).optional(),
  expectedVolume: Joi.string().valid('low', 'medium', 'high', 'enterprise').optional().messages({
    'any.only': 'Expected volume must be one of: low, medium, high, enterprise'
  })
}).options({ stripUnknown: true });

// Gmail connection step schema
const gmailConnectionSchema = Joi.object({
  authorizationCode: Joi.string().required().messages({
    'string.empty': 'Gmail authorization code is required',
    'any.required': 'Gmail authorization code is required'
  }),
  scope: Joi.string().optional(),
  state: Joi.string().optional()
}).options({ stripUnknown: true });

// Gmail label mapping schema
const gmailLabelMappingSchema = Joi.object({
  labelMappings: Joi.array()
    .items(
      Joi.object({
        gmailLabel: Joi.string().required().messages({
          'string.empty': 'Gmail label is required',
          'any.required': 'Gmail label is required'
        }),
        workflowTrigger: Joi.string()
          .valid('new_customer', 'service_request', 'complaint', 'inquiry', 'booking', 'other')
          .required()
          .messages({
            'any.only':
              'Workflow trigger must be one of: new_customer, service_request, complaint, inquiry, booking, other',
            'any.required': 'Workflow trigger is required'
          }),
        priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium').messages({
          'any.only': 'Priority must be one of: low, medium, high, urgent'
        }),
        enabled: Joi.boolean().default(true)
      }).required()
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one label mapping is required',
      'any.required': 'Label mappings are required'
    })
}).options({ stripUnknown: true });

// Team notifications setup schema
const teamNotificationsSchema = Joi.object({
  notifications: Joi.array()
    .items(
      Joi.object({
        type: Joi.string().valid('email', 'sms', 'slack', 'webhook').required().messages({
          'any.only': 'Notification type must be one of: email, sms, slack, webhook',
          'any.required': 'Notification type is required'
        }),
        recipient: Joi.string().required().messages({
          'string.empty': 'Recipient is required',
          'any.required': 'Recipient is required'
        }),
        triggers: Joi.array()
          .items(
            Joi.string().valid(
              'workflow_started',
              'workflow_completed',
              'workflow_failed',
              'high_priority_email',
              'customer_response_needed',
              'system_error'
            )
          )
          .min(1)
          .required()
          .messages({
            'array.min': 'At least one trigger must be selected',
            'any.required': 'Triggers are required'
          }),
        enabled: Joi.boolean().default(true)
      }).required()
    )
    .optional()
    .default([])
}).options({ stripUnknown: true });

// Workflow preferences schema
const workflowPreferencesSchema = Joi.object({
  autoStart: Joi.boolean().default(true).messages({
    'boolean.base': 'Auto start must be true or false'
  }),
  pauseOnError: Joi.boolean().default(true).messages({
    'boolean.base': 'Pause on error must be true or false'
  }),
  maxRetries: Joi.number().integer().min(0).max(10).default(3).messages({
    'number.base': 'Max retries must be a number',
    'number.integer': 'Max retries must be an integer',
    'number.min': 'Max retries cannot be negative',
    'number.max': 'Max retries cannot exceed 10'
  }),
  retryDelay: Joi.number().integer().min(1).max(3600).default(60).messages({
    'number.base': 'Retry delay must be a number',
    'number.integer': 'Retry delay must be an integer',
    'number.min': 'Retry delay must be at least 1 second',
    'number.max': 'Retry delay cannot exceed 3600 seconds'
  }),
  businessHours: Joi.object({
    enabled: Joi.boolean().default(false),
    timezone: Joi.string().optional(),
    schedule: Joi.object({
      monday: Joi.object({ start: Joi.string(), end: Joi.string() }).optional(),
      tuesday: Joi.object({ start: Joi.string(), end: Joi.string() }).optional(),
      wednesday: Joi.object({ start: Joi.string(), end: Joi.string() }).optional(),
      thursday: Joi.object({ start: Joi.string(), end: Joi.string() }).optional(),
      friday: Joi.object({ start: Joi.string(), end: Joi.string() }).optional(),
      saturday: Joi.object({ start: Joi.string(), end: Joi.string() }).optional(),
      sunday: Joi.object({ start: Joi.string(), end: Joi.string() }).optional()
    }).optional()
  }).optional()
}).options({ stripUnknown: true });

// Onboarding completion schema
const completeOnboardingSchema = Joi.object({
  sessionId: uuid,
  finalReview: Joi.object({
    businessInfoConfirmed: Joi.boolean().valid(true).required().messages({
      'any.only': 'Business information must be confirmed',
      'any.required': 'Business information confirmation is required'
    }),
    gmailConnectionConfirmed: Joi.boolean().valid(true).required().messages({
      'any.only': 'Gmail connection must be confirmed',
      'any.required': 'Gmail connection confirmation is required'
    }),
    labelMappingsConfirmed: Joi.boolean().valid(true).required().messages({
      'any.only': 'Label mappings must be confirmed',
      'any.required': 'Label mappings confirmation is required'
    }),
    notificationsConfirmed: Joi.boolean().valid(true).required().messages({
      'any.only': 'Notifications setup must be confirmed',
      'any.required': 'Notifications confirmation is required'
    })
  }).required(),
  agreedToTerms: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must agree to the terms of service',
    'any.required': 'Terms agreement is required'
  })
}).options({ stripUnknown: true });

// Onboarding session update schema
const updateOnboardingSessionSchema = Joi.object({
  currentStep: Joi.string()
    .valid(
      'business_info',
      'gmail_connection',
      'label_mapping',
      'team_notifications',
      'workflow_preferences',
      'review',
      'completed'
    )
    .optional()
    .messages({
      'any.only': 'Current step must be a valid onboarding step'
    }),
  stepData: Joi.object().optional(),
  completedSteps: Joi.array().items(Joi.string()).optional(),
  status: Joi.string().valid('in_progress', 'completed', 'abandoned', 'error').optional().messages({
    'any.only': 'Status must be one of: in_progress, completed, abandoned, error'
  })
}).options({ stripUnknown: true });

module.exports = {
  createOnboardingSessionSchema,
  businessInfoSchema,
  gmailConnectionSchema,
  gmailLabelMappingSchema,
  teamNotificationsSchema,
  workflowPreferencesSchema,
  completeOnboardingSchema,
  updateOnboardingSessionSchema
};
