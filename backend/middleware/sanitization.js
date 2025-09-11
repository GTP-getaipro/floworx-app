const xss = require('xss');

const createError = require('./errorHandler').createError;

/**
 * Sanitize individual value
 */
const sanitizeValue = value => {
  if (typeof value === 'string') {
    // XSS prevention
    value = xss(value, {
      whiteList: {}, // No HTML allowed
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script', 'style', 'xml']
    });

    // SQL injection prevention
    value = value
      .replace(/['"`]/g, '') // Remove quotes
      .replace(/;/g, '') // Remove semicolons
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove block comment start
      .replace(/\*\//g, '') // Remove block comment end
      .replace(/union/gi, '') // Remove UNION keyword
      .replace(/select/gi, '') // Remove SELECT keyword
      .replace(/drop/gi, '') // Remove DROP keyword
      .replace(/truncate/gi, '') // Remove TRUNCATE keyword
      .trim();

    // NoSQL injection prevention
    value = value
      .replace(/\$/g, '') // Remove MongoDB operators
      .replace(/\{/g, '') // Remove object literals
      .replace(/\}/g, '')
      .replace(/\[/g, '') // Remove array literals
      .replace(/\]/g, '');

    // Command injection prevention
    value = value
      .replace(/[&|;`$]/g, '') // Remove shell operators
      .replace(/\(\)/g, '') // Remove function execution
      .replace(/\\\\/g, '') // Remove backslashes
      .replace(/>/g, '') // Remove redirection
      .replace(/</g, '');
  }
  return value;
};

/**
 * Recursively sanitize objects
 */
const sanitizeObject = obj => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip internal/protected keys
    if (key.startsWith('_') || key === 'password') {
      sanitized[key] = value;
      continue;
    }

    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = sanitizeValue(value);
    }
  }
  return sanitized;
};

/**
 * Request validation middleware
 */
const validateRequest = schema => {
  return (req, res, next) => {
    try {
      if (schema.params) {
        const { error } = schema.params.validate(req.params);
        if (error) {
          throw createError(400, 'Invalid URL parameters', error.details);
        }
      }

      if (schema.query) {
        const { error } = schema.query.validate(req.query);
        if (error) {
          throw createError(400, 'Invalid query parameters', error.details);
        }
      }

      if (schema.body) {
        const { error } = schema.body.validate(req.body);
        if (error) {
          throw createError(400, 'Invalid request body', error.details);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Request sanitization middleware
 */
const sanitizeRequest = (req, res, next) => {
  try {
    // Sanitize URL parameters
    if (Object.keys(req.params).length > 0) {
      req.params = sanitizeObject(req.params);
    }

    // Sanitize query parameters
    if (Object.keys(req.query).length > 0) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitize request body
    if (Object.keys(req.body).length > 0) {
      req.body = sanitizeObject(req.body);
    }

    // Store original IP for security logs
    req.originalIp = req.ip;

    // Sanitize headers (except essential ones)
    const sanitizedHeaders = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (!['authorization', 'content-type', 'content-length'].includes(key.toLowerCase())) {
        sanitizedHeaders[key] = sanitizeValue(value);
      } else {
        sanitizedHeaders[key] = value;
      }
    }
    req.headers = sanitizedHeaders;

    next();
  } catch (_error) {
    next(createError(400, 'Invalid request data'));
  }
};

/**
 * Response sanitization middleware
 */
const sanitizeResponse = (req, res, next) => {
  const originalJson = res.json;
  res.json = function (body) {
    if (body && typeof body === 'object') {
      body = sanitizeObject(body);
    }
    return originalJson.call(this, body);
  };
  next();
};

module.exports = {
  validateRequest,
  sanitizeRequest,
  sanitizeResponse,
  sanitizeObject,
  sanitizeValue
};
