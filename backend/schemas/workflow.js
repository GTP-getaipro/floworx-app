/**
 * Workflow Validation Schemas
 * Schemas for n8n workflow management and automation
 */

const Joi = require('joi');
const { uuid, optionalUuid, name, url, paginationQuery } = require('./common');

// Workflow creation schema
const createWorkflowSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required().messages({
    'string.min': 'Workflow name must be at least 1 character',
    'string.max': 'Workflow name must be less than 200 characters',
    'string.empty': 'Workflow name is required',
    'any.required': 'Workflow name is required'
  }),
  description: Joi.string().trim().max(1000).optional().messages({
    'string.max': 'Workflow description must be less than 1000 characters'
  }),
  templateId: optionalUuid,
  businessType: Joi.string().valid('hot_tub', 'pool', 'spa', 'wellness', 'hospitality', 'other').required().messages({
    'any.only': 'Business type must be one of: hot_tub, pool, spa, wellness, hospitality, other',
    'any.required': 'Business type is required'
  }),
  triggers: Joi.array()
    .items(
      Joi.object({
        type: Joi.string().valid('email', 'webhook', 'schedule', 'manual').required().messages({
          'any.only': 'Trigger type must be one of: email, webhook, schedule, manual',
          'any.required': 'Trigger type is required'
        }),
        config: Joi.object().required().messages({
          'any.required': 'Trigger configuration is required'
        })
      }).required()
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one trigger is required',
      'any.required': 'Triggers are required'
    }),
  active: Joi.boolean().default(false)
}).options({ stripUnknown: true });

// Workflow update schema
const updateWorkflowSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).optional().messages({
    'string.min': 'Workflow name must be at least 1 character',
    'string.max': 'Workflow name must be less than 200 characters'
  }),
  description: Joi.string().trim().max(1000).optional().messages({
    'string.max': 'Workflow description must be less than 1000 characters'
  }),
  active: Joi.boolean().optional(),
  settings: Joi.object({
    maxRetries: Joi.number().integer().min(0).max(10).optional(),
    retryDelay: Joi.number().integer().min(1).max(3600).optional(),
    timeout: Joi.number().integer().min(1).max(86400).optional()
  }).optional()
}).options({ stripUnknown: true });

// Workflow execution schema
const executeWorkflowSchema = Joi.object({
  workflowId: uuid,
  inputData: Joi.object().optional().default({}),
  waitForCompletion: Joi.boolean().default(false),
  timeout: Joi.number().integer().min(1).max(3600).default(300).messages({
    'number.base': 'Timeout must be a number',
    'number.integer': 'Timeout must be an integer',
    'number.min': 'Timeout must be at least 1 second',
    'number.max': 'Timeout cannot exceed 3600 seconds'
  })
}).options({ stripUnknown: true });

// Workflow template schema
const workflowTemplateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required().messages({
    'string.min': 'Template name must be at least 1 character',
    'string.max': 'Template name must be less than 200 characters',
    'string.empty': 'Template name is required',
    'any.required': 'Template name is required'
  }),
  description: Joi.string().trim().max(1000).optional().messages({
    'string.max': 'Template description must be less than 1000 characters'
  }),
  category: Joi.string()
    .valid('customer_service', 'marketing', 'operations', 'maintenance', 'booking', 'general')
    .required()
    .messages({
      'any.only': 'Category must be one of: customer_service, marketing, operations, maintenance, booking, general',
      'any.required': 'Category is required'
    }),
  businessTypes: Joi.array()
    .items(Joi.string().valid('hot_tub', 'pool', 'spa', 'wellness', 'hospitality', 'other'))
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one business type is required',
      'any.required': 'Business types are required'
    }),
  workflowDefinition: Joi.object().required().messages({
    'any.required': 'Workflow definition is required'
  }),
  configurationSchema: Joi.object().optional(),
  tags: Joi.array().items(Joi.string().trim().max(50)).max(10).optional().messages({
    'array.max': 'Maximum 10 tags allowed'
  }),
  isPublic: Joi.boolean().default(false)
}).options({ stripUnknown: true });

// Workflow search schema
const workflowSearchSchema = Joi.object({
  ...paginationQuery.describe().keys,
  status: Joi.string().valid('active', 'inactive', 'draft', 'error').optional().messages({
    'any.only': 'Status must be one of: active, inactive, draft, error'
  }),
  businessType: Joi.string().valid('hot_tub', 'pool', 'spa', 'wellness', 'hospitality', 'other').optional().messages({
    'any.only': 'Business type must be one of: hot_tub, pool, spa, wellness, hospitality, other'
  }),
  category: Joi.string()
    .valid('customer_service', 'marketing', 'operations', 'maintenance', 'booking', 'general')
    .optional()
    .messages({
      'any.only': 'Category must be one of: customer_service, marketing, operations, maintenance, booking, general'
    }),
  tags: Joi.array().items(Joi.string().trim()).optional(),
  createdAfter: Joi.date().iso().optional().messages({
    'date.format': 'Created after date must be in ISO format'
  }),
  createdBefore: Joi.date().iso().optional().messages({
    'date.format': 'Created before date must be in ISO format'
  })
}).options({ stripUnknown: true });

// Workflow execution history schema
const workflowExecutionHistorySchema = Joi.object({
  ...paginationQuery.describe().keys,
  workflowId: uuid.optional(),
  status: Joi.string().valid('running', 'success', 'error', 'waiting', 'canceled').optional().messages({
    'any.only': 'Status must be one of: running, success, error, waiting, canceled'
  }),
  startedAfter: Joi.date().iso().optional().messages({
    'date.format': 'Started after date must be in ISO format'
  }),
  startedBefore: Joi.date().iso().optional().messages({
    'date.format': 'Started before date must be in ISO format'
  }),
  triggeredBy: Joi.string().valid('email', 'webhook', 'schedule', 'manual', 'api').optional().messages({
    'any.only': 'Triggered by must be one of: email, webhook, schedule, manual, api'
  })
}).options({ stripUnknown: true });

// Workflow webhook configuration schema
const webhookConfigSchema = Joi.object({
  workflowId: uuid,
  method: Joi.string().valid('GET', 'POST', 'PUT', 'PATCH', 'DELETE').default('POST').messages({
    'any.only': 'HTTP method must be one of: GET, POST, PUT, PATCH, DELETE'
  }),
  path: Joi.string()
    .pattern(/^\/[a-zA-Z0-9\-_\/]*$/)
    .required()
    .messages({
      'string.pattern.base':
        'Webhook path must start with / and contain only alphanumeric characters, hyphens, underscores, and forward slashes',
      'string.empty': 'Webhook path is required',
      'any.required': 'Webhook path is required'
    }),
  authentication: Joi.object({
    type: Joi.string().valid('none', 'basic', 'bearer', 'api_key', 'signature').default('none').messages({
      'any.only': 'Authentication type must be one of: none, basic, bearer, api_key, signature'
    }),
    config: Joi.object().when('type', {
      is: 'none',
      then: Joi.optional(),
      otherwise: Joi.required()
    })
  }).optional(),
  responseMode: Joi.string().valid('sync', 'async').default('async').messages({
    'any.only': 'Response mode must be either sync or async'
  }),
  enabled: Joi.boolean().default(true)
}).options({ stripUnknown: true });

// Workflow analytics schema
const workflowAnalyticsSchema = Joi.object({
  workflowId: uuid.optional(),
  timeRange: Joi.string().valid('1h', '24h', '7d', '30d', '90d', '1y').default('7d').messages({
    'any.only': 'Time range must be one of: 1h, 24h, 7d, 30d, 90d, 1y'
  }),
  metrics: Joi.array()
    .items(
      Joi.string().valid(
        'executions',
        'success_rate',
        'error_rate',
        'avg_duration',
        'total_duration',
        'trigger_frequency'
      )
    )
    .default(['executions', 'success_rate', 'avg_duration'])
    .messages({
      'any.only': 'Metrics must be valid metric names'
    }),
  groupBy: Joi.string().valid('hour', 'day', 'week', 'month').default('day').messages({
    'any.only': 'Group by must be one of: hour, day, week, month'
  })
}).options({ stripUnknown: true });

// Workflow import/export schema
const workflowImportSchema = Joi.object({
  workflowData: Joi.object().required().messages({
    'any.required': 'Workflow data is required'
  }),
  name: Joi.string().trim().min(1).max(200).optional().messages({
    'string.min': 'Workflow name must be at least 1 character',
    'string.max': 'Workflow name must be less than 200 characters'
  }),
  overwriteExisting: Joi.boolean().default(false),
  validateOnly: Joi.boolean().default(false)
}).options({ stripUnknown: true });

module.exports = {
  createWorkflowSchema,
  updateWorkflowSchema,
  executeWorkflowSchema,
  workflowTemplateSchema,
  workflowSearchSchema,
  workflowExecutionHistorySchema,
  webhookConfigSchema,
  workflowAnalyticsSchema,
  workflowImportSchema
};
