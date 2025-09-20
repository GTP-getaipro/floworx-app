const xss = require('xss');
const { body, param, query, validationResult } = require('express-validator');

const {
  VALIDATION_RULES: _VALIDATION_RULES,
  validateFields: _validateFields
} = require('../../shared/utils/validation');

const { handleValidationErrors } = require('./errorHandler');

// XSS protection configuration
const xssOptions = {
  whiteList: {}, // No HTML tags allowed
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script']
};

// Sanitize input to prevent XSS attacks
const sanitizeInput = value => {
  if (typeof value !== 'string') {
    return value;
  }
  return xss(value, xssOptions);
};

// Custom validation middleware - now uses centralized error handler
const createValidationMiddleware = validations => {
  return async (req, res, next) => {
    try {
      // Run all validations
      await Promise.all(validations.map(validation => validation.run(req)));

      // Use centralized validation error handler
      handleValidationErrors(req, res, next);
    } catch (error) {
      next(error);
    }

    // Sanitize all string inputs to prevent XSS
    const sanitizeObject = obj => {
      if (obj && typeof obj === 'object') {
        for (const key in obj) {
          if (typeof obj[key] === 'string') {
            obj[key] = sanitizeInput(obj[key]);
          } else if (typeof obj[key] === 'object') {
            sanitizeObject(obj[key]);
          }
        }
      }
    };

    sanitizeObject(req.body);
    sanitizeObject(req.query);
    sanitizeObject(req.params);

    next();
  };
};

// Common validation rules - extend shared rules
const commonValidationRules = {
  // Email validation
  email: body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email address is too long'),

  // Password validation
  password: body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),

  // Name validation
  firstName: body('firstName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  lastName: body('lastName')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  // Company name validation
  companyName: body('companyName')
    .optional()
    .isLength({ min: 1, max: 255 })
    .withMessage('Company name must be between 1 and 255 characters')
    .matches(/^[a-zA-Z0-9\s&.,'-]+$/)
    .withMessage('Company name contains invalid characters'),

  // UUID validation
  uuid: param('id').isUUID().withMessage('Invalid ID format'),

  // Token validation
  token: body('token')
    .isLength({ min: 32, max: 512 })
    .withMessage('Invalid token format')
    .matches(/^[a-zA-Z0-9+/=]+$/)
    .withMessage('Token contains invalid characters'),

  // Business type validation
  businessType: body('businessType')
    .optional()
    .isIn(['hot_tub_dealer', 'pool_service', 'spa_service', 'other'])
    .withMessage('Invalid business type'),

  // Phone validation
  phone: body('phone')
    .optional()
    .isMobilePhone('any', { strictMode: false })
    .withMessage('Please provide a valid phone number'),

  // URL validation
  url: body('url')
    .optional()
    .isURL({ protocols: ['http', 'https'], require_protocol: true })
    .withMessage('Please provide a valid URL'),

  // JSON validation
  jsonData: body('data')
    .optional()
    .custom(value => {
      try {
        if (typeof value === 'string') {
          JSON.parse(value);
        }
        return true;
      } catch (_error) {
        throw new Error('Invalid JSON format');
      }
    }),

  // Pagination validation
  page: query('page').optional().isInt({ min: 1, max: 1000 }).withMessage('Page must be a number between 1 and 1000'),

  limit: query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be a number between 1 and 100'),

  // Search query validation
  search: query('search')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .matches(/^[a-zA-Z0-9\s@.-]+$/)
    .withMessage('Search query contains invalid characters')
};

// Pre-defined validation middleware for common endpoints
const validationMiddleware = {
  // User registration validation
  register: createValidationMiddleware([
    commonValidationRules.email,
    commonValidationRules.password,
    commonValidationRules.firstName,
    commonValidationRules.lastName,
    commonValidationRules.companyName,
    commonValidationRules.businessType,
    commonValidationRules.phone
  ]),

  // User login validation
  login: createValidationMiddleware([
    commonValidationRules.email,
    body('password')
      .notEmpty()
      .withMessage('Password is required')
      .isLength({ max: 128 })
      .withMessage('Password is too long')
  ]),

  // Password reset request validation
  passwordResetRequest: createValidationMiddleware([commonValidationRules.email]),

  // Password reset validation
  passwordReset: createValidationMiddleware([commonValidationRules.token, commonValidationRules.password]),

  // Token validation
  tokenValidation: createValidationMiddleware([commonValidationRules.token]),

  // UUID parameter validation
  uuidParam: createValidationMiddleware([commonValidationRules.uuid]),

  // Pagination validation
  pagination: createValidationMiddleware([commonValidationRules.page, commonValidationRules.limit]),

  // Search validation
  search: createValidationMiddleware([
    commonValidationRules.search,
    commonValidationRules.page,
    commonValidationRules.limit
  ])
};

// SQL injection prevention helper
const sanitizeForSQL = value => {
  if (typeof value !== 'string') {
    return value;
  }

  // Remove or escape potentially dangerous SQL characters
  return value
    .replace(/'/g, "''") // Escape single quotes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove SQL block comments start
    .replace(/\*\//g, '') // Remove SQL block comments end
    .replace(/xp_/gi, '') // Remove extended stored procedures
    .replace(/sp_/gi, '') // Remove stored procedures
    .trim();
};

// =====================================================
// COMPREHENSIVE VALIDATION SCHEMAS FOR SECURITY
// =====================================================

// Enhanced email validation with security checks
const validateEmailSecure = () => [
  body('email')
    .isEmail()
    .withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 254 })
    .withMessage('Email must be less than 254 characters')
    .custom(value => {
      // Block disposable email domains (basic check)
      const disposableDomains = ['tempmail.org', '10minutemail.com', 'guerrillamail.com'];
      const domain = value.split('@')[1];
      if (disposableDomains.includes(domain)) {
        throw new Error('Disposable email addresses are not allowed');
      }
      return true;
    })
];

// Enhanced password validation with strength requirements
const validatePasswordSecure = () => [
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    )
];

// UUID validation for IDs
const validateUUID = (field = 'id') => [param(field).isUUID(4).withMessage(`${field} must be a valid UUID`)];

// Business type validation
const validateBusinessType = () => [
  body('businessTypeId').isInt({ min: 1 }).withMessage('Business type ID must be a positive integer')
];

// =====================================================
// ROUTE-SPECIFIC VALIDATION COMBINATIONS
// =====================================================

// User registration validation
const validateRegistration = createValidationMiddleware([
  ...validateEmailSecure(),
  ...validatePasswordSecure(),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s\-'.]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s\-'.]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, apostrophes, and periods'),
  body('companyName')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Company name must be between 2 and 200 characters')
]);

// User login validation
const validateLoginSecure = createValidationMiddleware([
  ...validateEmailSecure(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ max: 128 })
    .withMessage('Password too long')
]);

// Password reset request validation
const validatePasswordResetRequest = createValidationMiddleware([...validateEmailSecure()]);

// Password reset validation
const validatePasswordReset = createValidationMiddleware([
  body('token').isLength({ min: 32, max: 255 }).withMessage('Invalid reset token format'),
  ...validatePasswordSecure()
]);

// Business type selection validation
const validateBusinessTypeSelection = createValidationMiddleware([...validateBusinessType()]);

// OAuth callback validation
const validateOAuthCallback = createValidationMiddleware([
  body('code')
    .notEmpty()
    .withMessage('Authorization code is required')
    .isLength({ max: 512 })
    .withMessage('Authorization code too long'),
  body('state').optional().isLength({ max: 255 }).withMessage('State parameter too long')
]);

module.exports = {
  createValidationMiddleware,
  commonValidationRules,
  validationMiddleware,
  sanitizeInput,
  sanitizeForSQL,

  // Enhanced security validators
  validateEmailSecure,
  validatePasswordSecure,
  validateUUID,
  validateBusinessType,

  // Route-specific combinations
  validateRegistration,
  validateLoginSecure,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateBusinessTypeSelection,
  validateOAuthCallback
};
