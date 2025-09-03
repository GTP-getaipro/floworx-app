/**
 * Common Validation Schemas
 * Reusable validation patterns used across multiple endpoints
 */

const Joi = require('joi');

// Common field patterns
const commonPatterns = {
  // Email validation with comprehensive rules
  email: Joi.string()
    .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'edu', 'gov', 'mil', 'int', 'co', 'io'] } })
    .lowercase()
    .trim()
    .max(254)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.empty': 'Email is required',
      'string.max': 'Email must be less than 254 characters',
      'any.required': 'Email is required'
    }),

  // Password validation with security requirements
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must be less than 128 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.empty': 'Password is required',
      'any.required': 'Password is required'
    }),

  // UUID validation
  uuid: Joi.string().uuid({ version: 'uuidv4' }).required().messages({
    'string.guid': 'Must be a valid UUID',
    'any.required': 'ID is required'
  }),

  // Optional UUID
  optionalUuid: Joi.string().uuid({ version: 'uuidv4' }).optional().messages({
    'string.guid': 'Must be a valid UUID'
  }),

  // Name validation
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      'string.min': 'Name must be at least 1 character',
      'string.max': 'Name must be less than 100 characters',
      'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes',
      'string.empty': 'Name is required',
      'any.required': 'Name is required'
    }),

  // Optional name
  optionalName: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .optional()
    .messages({
      'string.min': 'Name must be at least 1 character',
      'string.max': 'Name must be less than 100 characters',
      'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes'
    }),

  // Phone number validation
  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),

  // URL validation
  url: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .optional()
    .messages({
      'string.uri': 'Must be a valid URL'
    }),

  // Date validation
  date: Joi.date().iso().optional().messages({
    'date.format': 'Date must be in ISO format'
  }),

  // Pagination parameters
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100'
  }),

  offset: Joi.number().integer().min(0).default(0).messages({
    'number.base': 'Offset must be a number',
    'number.integer': 'Offset must be an integer',
    'number.min': 'Offset cannot be negative'
  }),

  // Search query
  search: Joi.string().trim().min(1).max(100).optional().messages({
    'string.min': 'Search query must be at least 1 character',
    'string.max': 'Search query must be less than 100 characters'
  }),

  // Sort parameters
  sortBy: Joi.string().valid('createdAt', 'updatedAt', 'name', 'email', 'status').default('createdAt').messages({
    'any.only': 'Sort field must be one of: createdAt, updatedAt, name, email, status'
  }),

  sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
    'any.only': 'Sort order must be either asc or desc'
  })
};

// Common schema combinations
const commonSchemas = {
  // Pagination query schema
  paginationQuery: Joi.object({
    limit: commonPatterns.limit,
    offset: commonPatterns.offset,
    search: commonPatterns.search,
    sortBy: commonPatterns.sortBy,
    sortOrder: commonPatterns.sortOrder
  }),

  // ID parameter schema
  idParam: Joi.object({
    id: commonPatterns.uuid
  }),

  // User ID parameter schema
  userIdParam: Joi.object({
    userId: commonPatterns.uuid
  }),

  // Basic contact info schema
  contactInfo: Joi.object({
    firstName: commonPatterns.name,
    lastName: commonPatterns.name,
    email: commonPatterns.email,
    phone: commonPatterns.phone
  }),

  // Optional contact info schema
  optionalContactInfo: Joi.object({
    firstName: commonPatterns.optionalName,
    lastName: commonPatterns.optionalName,
    email: commonPatterns.email.optional(),
    phone: commonPatterns.phone
  }),

  // Timestamp schema
  timestamps: Joi.object({
    createdAt: commonPatterns.date,
    updatedAt: commonPatterns.date
  })
};

module.exports = {
  patterns: commonPatterns,
  schemas: commonSchemas,

  // Export individual patterns for direct use
  email: commonPatterns.email,
  password: commonPatterns.password,
  uuid: commonPatterns.uuid,
  optionalUuid: commonPatterns.optionalUuid,
  name: commonPatterns.name,
  optionalName: commonPatterns.optionalName,
  phone: commonPatterns.phone,
  url: commonPatterns.url,
  date: commonPatterns.date,
  limit: commonPatterns.limit,
  offset: commonPatterns.offset,
  search: commonPatterns.search,
  sortBy: commonPatterns.sortBy,
  sortOrder: commonPatterns.sortOrder,

  // Export common schemas
  paginationQuery: commonSchemas.paginationQuery,
  idParam: commonSchemas.idParam,
  userIdParam: commonSchemas.userIdParam,
  contactInfo: commonSchemas.contactInfo,
  optionalContactInfo: commonSchemas.optionalContactInfo,
  timestamps: commonSchemas.timestamps
};
