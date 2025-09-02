/**
 * Validation Utilities for FloWorx SaaS
 * Common validation functions and patterns
 */

/**
 * Email validation regex
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Phone number validation regex (US format)
 */
const PHONE_REGEX = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;

/**
 * Password validation regex (8+ chars, mixed case, number, special char)
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * URL validation regex
 */
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;

/**
 * UUID validation regex
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate email address
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim().toLowerCase());
};

/**
 * Validate phone number
 */
const isValidPhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false;
  return PHONE_REGEX.test(phone.replace(/\s/g, ''));
};

/**
 * Validate password strength
 */
const isValidPassword = (password) => {
  if (!password || typeof password !== 'string') return false;
  return PASSWORD_REGEX.test(password);
};

/**
 * Validate URL
 */
const isValidUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return URL_REGEX.test(url);
};

/**
 * Validate UUID
 */
const isValidUuid = (uuid) => {
  if (!uuid || typeof uuid !== 'string') return false;
  return UUID_REGEX.test(uuid);
};

/**
 * Validate required field
 */
const isRequired = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
};

/**
 * Validate string length
 */
const isValidLength = (value, min = 0, max = Infinity) => {
  if (!value || typeof value !== 'string') return false;
  const length = value.trim().length;
  return length >= min && length <= max;
};

/**
 * Validate number range
 */
const isInRange = (value, min = -Infinity, max = Infinity) => {
  const num = Number(value);
  if (isNaN(num)) return false;
  return num >= min && num <= max;
};

/**
 * Validate date
 */
const isValidDate = (date) => {
  if (!date) return false;
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
};

/**
 * Validate business name
 */
const isValidBusinessName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 200;
};

/**
 * Validate name (first/last)
 */
const isValidName = (name) => {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 100 && /^[a-zA-Z\s'-]+$/.test(trimmed);
};

/**
 * Validate array of items
 */
const isValidArray = (array, validator = null, minLength = 0, maxLength = Infinity) => {
  if (!Array.isArray(array)) return false;
  if (array.length < minLength || array.length > maxLength) return false;
  
  if (validator && typeof validator === 'function') {
    return array.every(validator);
  }
  
  return true;
};

/**
 * Validate object structure
 */
const isValidObject = (obj, requiredFields = [], optionalFields = []) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  
  // Check required fields
  for (const field of requiredFields) {
    if (!(field in obj) || !isRequired(obj[field])) {
      return false;
    }
  }
  
  // Check for unexpected fields
  const allowedFields = [...requiredFields, ...optionalFields];
  for (const field in obj) {
    if (!allowedFields.includes(field)) {
      return false;
    }
  }
  
  return true;
};

/**
 * Sanitize string input
 */
const sanitizeString = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
};

/**
 * Sanitize email
 */
const sanitizeEmail = (email) => {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
};

/**
 * Sanitize phone number
 */
const sanitizePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return '';
  return phone.replace(/\D/g, ''); // Keep only digits
};

/**
 * Create validation result
 */
const createValidationResult = (isValid, errors = []) => {
  return {
    isValid,
    errors: Array.isArray(errors) ? errors : [errors]
  };
};

/**
 * Validate multiple fields
 */
const validateFields = (data, validationRules) => {
  const errors = [];
  
  Object.entries(validationRules).forEach(([field, rules]) => {
    const value = data[field];
    
    for (const rule of rules) {
      const { validator, message, required = false } = rule;
      
      // Skip validation if field is not required and empty
      if (!required && !isRequired(value)) {
        continue;
      }
      
      // Check if validator passes
      if (!validator(value)) {
        errors.push({
          field,
          message: message || `Invalid ${field}`,
          value
        });
        break; // Stop at first error for this field
      }
    }
  });
  
  return createValidationResult(errors.length === 0, errors);
};

/**
 * Common validation rule sets
 */
const VALIDATION_RULES = {
  email: [
    { validator: isRequired, message: 'Email is required', required: true },
    { validator: isValidEmail, message: 'Please enter a valid email address' }
  ],
  
  password: [
    { validator: isRequired, message: 'Password is required', required: true },
    { validator: isValidPassword, message: 'Password must be at least 8 characters with uppercase, lowercase, number, and special character' }
  ],
  
  name: [
    { validator: isRequired, message: 'Name is required', required: true },
    { validator: isValidName, message: 'Name must contain only letters, spaces, hyphens, and apostrophes' }
  ],
  
  businessName: [
    { validator: isRequired, message: 'Business name is required', required: true },
    { validator: isValidBusinessName, message: 'Business name must be between 1 and 200 characters' }
  ],
  
  phone: [
    { validator: isValidPhone, message: 'Please enter a valid phone number' }
  ],
  
  url: [
    { validator: isValidUrl, message: 'Please enter a valid URL' }
  ]
};

module.exports = {
  // Regex patterns
  EMAIL_REGEX,
  PHONE_REGEX,
  PASSWORD_REGEX,
  URL_REGEX,
  UUID_REGEX,
  
  // Validation functions
  isValidEmail,
  isValidPhone,
  isValidPassword,
  isValidUrl,
  isValidUuid,
  isRequired,
  isValidLength,
  isInRange,
  isValidDate,
  isValidBusinessName,
  isValidName,
  isValidArray,
  isValidObject,
  
  // Sanitization functions
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  
  // Validation helpers
  createValidationResult,
  validateFields,
  VALIDATION_RULES
};
