/**
 * Request Validation Utility
 * Middleware for validating request data using Joi schemas
 */

const Joi = require('joi');
const { ValidationError } = require('./errors');

/**
 * Creates validation middleware for request data
 * @param {Object} schemas - Validation schemas
 * @param {Object} schemas.body - Body validation schema
 * @param {Object} schemas.params - Params validation schema
 * @param {Object} schemas.query - Query validation schema
 * @param {Object} schemas.headers - Headers validation schema
 * @param {Object} options - Validation options
 * @param {boolean} options.abortEarly - Stop validation on first error (default: false)
 * @param {boolean} options.stripUnknown - Remove unknown fields (default: true)
 * @param {boolean} options.allowUnknown - Allow unknown fields (default: false)
 * @returns {Function} - Express middleware function
 */
const validateRequest = (schemas, options = {}) => {
  const {
    abortEarly = false,
    stripUnknown = true,
    allowUnknown = false
  } = options;

  const validationOptions = {
    abortEarly,
    stripUnknown,
    allowUnknown,
    errors: {
      wrap: {
        label: ''
      }
    }
  };

  return (req, res, next) => {
    const errors = [];

    // Validate request body
    if (schemas.body) {
      const { error, value } = schemas.body.validate(req.body, validationOptions);
      if (error) {
        errors.push({
          location: 'body',
          details: error.details
        });
      } else {
        req.body = value;
      }
    }

    // Validate request parameters
    if (schemas.params) {
      const { error, value } = schemas.params.validate(req.params, validationOptions);
      if (error) {
        errors.push({
          location: 'params',
          details: error.details
        });
      } else {
        req.params = value;
      }
    }

    // Validate query parameters
    if (schemas.query) {
      const { error, value } = schemas.query.validate(req.query, validationOptions);
      if (error) {
        errors.push({
          location: 'query',
          details: error.details
        });
      } else {
        req.query = value;
      }
    }

    // Validate headers
    if (schemas.headers) {
      const { error, value } = schemas.headers.validate(req.headers, validationOptions);
      if (error) {
        errors.push({
          location: 'headers',
          details: error.details
        });
      } else {
        // Don't override headers, just validate
      }
    }

    // If there are validation errors, throw ValidationError
    if (errors.length > 0) {
      const validationError = new ValidationError('Request validation failed');
      validationError.details = errors;
      validationError.statusCode = 400;
      return next(validationError);
    }

    next();
  };
};

/**
 * Validates a single value against a schema
 * @param {any} value - Value to validate
 * @param {Object} schema - Joi schema
 * @param {Object} options - Validation options
 * @returns {Object} - Validation result { error, value }
 */
const validateValue = (value, schema, options = {}) => {
  const validationOptions = {
    abortEarly: false,
    stripUnknown: true,
    allowUnknown: false,
    ...options
  };

  return schema.validate(value, validationOptions);
};

/**
 * Validates request body only
 * @param {Object} schema - Joi schema for body validation
 * @param {Object} options - Validation options
 * @returns {Function} - Express middleware function
 */
const validateBody = (schema, options = {}) => {
  return validateRequest({ body: schema }, options);
};

/**
 * Validates request parameters only
 * @param {Object} schema - Joi schema for params validation
 * @param {Object} options - Validation options
 * @returns {Function} - Express middleware function
 */
const validateParams = (schema, options = {}) => {
  return validateRequest({ params: schema }, options);
};

/**
 * Validates query parameters only
 * @param {Object} schema - Joi schema for query validation
 * @param {Object} options - Validation options
 * @returns {Function} - Express middleware function
 */
const validateQuery = (schema, options = {}) => {
  return validateRequest({ query: schema }, options);
};

/**
 * Creates a validation middleware that validates against multiple possible schemas
 * Useful for endpoints that accept different request formats
 * @param {Array} schemas - Array of schema objects to try
 * @param {Object} options - Validation options
 * @returns {Function} - Express middleware function
 */
const validateOneOf = (schemas, options = {}) => {
  return (req, res, next) => {
    let lastError = null;
    
    // Try each schema until one passes
    for (const schema of schemas) {
      try {
        const middleware = validateRequest(schema, options);
        const mockNext = (error) => {
          if (error) {
            lastError = error;
            return;
          }
          // If no error, validation passed
          return next();
        };
        
        middleware(req, res, mockNext);
        
        // If we get here without error, validation passed
        if (!lastError) {
          return;
        }
      } catch (error) {
        lastError = error;
      }
    }
    
    // If we get here, all schemas failed
    if (lastError) {
      return next(lastError);
    }
    
    // Fallback error
    const validationError = new ValidationError('Request does not match any expected format');
    validationError.statusCode = 400;
    next(validationError);
  };
};

/**
 * Sanitizes request data by removing potentially dangerous fields
 * @param {Array} dangerousFields - Array of field names to remove
 * @returns {Function} - Express middleware function
 */
const sanitizeRequest = (dangerousFields = ['__proto__', 'constructor', 'prototype']) => {
  const removeDangerousFields = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    const sanitized = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (!dangerousFields.includes(key)) {
        sanitized[key] = removeDangerousFields(value);
      }
    }
    
    return sanitized;
  };

  return (req, res, next) => {
    req.body = removeDangerousFields(req.body);
    req.query = removeDangerousFields(req.query);
    req.params = removeDangerousFields(req.params);
    next();
  };
};

/**
 * Creates a custom validation function
 * @param {Function} validationFn - Custom validation function
 * @param {string} errorMessage - Error message if validation fails
 * @returns {Function} - Joi custom validation function
 */
const createCustomValidation = (validationFn, errorMessage = 'Custom validation failed') => {
  return (value, helpers) => {
    try {
      const isValid = validationFn(value);
      if (!isValid) {
        return helpers.error('custom.invalid', { message: errorMessage });
      }
      return value;
    } catch (error) {
      return helpers.error('custom.error', { message: error.message });
    }
  };
};

module.exports = {
  validateRequest,
  validateValue,
  validateBody,
  validateParams,
  validateQuery,
  validateOneOf,
  sanitizeRequest,
  createCustomValidation
};
