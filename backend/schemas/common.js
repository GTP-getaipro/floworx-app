/**
 * Common Validation Schemas
 * Replacement for the deleted common schemas
 */

const Joi = require('joi');

/**
 * Common validation patterns
 */
const commonPatterns = {
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .max(255)
    .lowercase()
    .trim(),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),

  name: Joi.string()
    .min(1)
    .max(100)
    .trim()
    .pattern(/^[a-zA-Z\s'-]+$/)
    .message('Name can only contain letters, spaces, hyphens, and apostrophes'),

  businessName: Joi.string()
    .min(1)
    .max(200)
    .trim(),

  phone: Joi.string()
    .pattern(/^\+?[\d\s\-\(\)]+$/)
    .min(10)
    .max(20)
    .optional(),

  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .max(500)
    .optional(),

  uuid: Joi.string()
    .uuid()
    .required(),

  id: Joi.alternatives().try(
    Joi.string().uuid(),
    Joi.number().integer().positive()
  ),

  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  },

  dateRange: {
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional()
  }
};

/**
 * Common response schemas
 */
const responseSchemas = {
  success: Joi.object({
    success: Joi.boolean().valid(true).required(),
    data: Joi.any(),
    message: Joi.string().optional()
  }),

  error: Joi.object({
    success: Joi.boolean().valid(false).required(),
    error: Joi.object({
      message: Joi.string().required(),
      code: Joi.string().optional(),
      details: Joi.any().optional()
    }).required()
  }),

  paginated: Joi.object({
    success: Joi.boolean().valid(true).required(),
    data: Joi.array().required(),
    pagination: Joi.object({
      currentPage: Joi.number().integer().min(1).required(),
      itemsPerPage: Joi.number().integer().min(1).required(),
      totalPages: Joi.number().integer().min(0).required(),
      totalCount: Joi.number().integer().min(0).required(),
      hasNextPage: Joi.boolean().required(),
      hasPreviousPage: Joi.boolean().required(),
      nextPage: Joi.number().integer().min(1).allow(null).required(),
      previousPage: Joi.number().integer().min(1).allow(null).required()
    }).required()
  })
};

/**
 * Common validation middleware
 */
const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details
        }
      });
    }

    req[property] = value;
    next();
  };
};

module.exports = {
  commonPatterns,
  responseSchemas,
  validateRequest
};
