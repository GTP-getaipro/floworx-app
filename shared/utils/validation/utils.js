const { validationRules } = require('./rules');

/**
 * Validates a single value against a rule set
 * @param {string} value - The value to validate
 * @param {Object} rules - The validation rules to apply
 * @returns {Object} - { isValid, errors }
 */
const validateValue = (value, rules) => {
  const errors = [];

  // Required check
  if (rules.required && (!value || value.trim() === '')) {
    errors.push(rules.messages.required);
  }

  // Only continue validation if value exists
  if (value) {
    // Min length check
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(rules.messages.minLength);
    }

    // Max length check
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(rules.messages.maxLength);
    }

    // Pattern check
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(rules.messages.pattern);
    }

    // Custom validation
    if (rules.validate) {
      const customError = rules.validate(value);
      if (customError) {
        errors.push(customError);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates an object's values against corresponding rules
 * @param {Object} values - The values to validate
 * @param {Object} rules - The validation rules to apply
 * @returns {Object} - { isValid, errors }
 */
const validateObject = (values, rules) => {
  const errors = {};
  let isValid = true;

  Object.keys(rules).forEach(field => {
    const { isValid: fieldValid, errors: fieldErrors } = validateValue(values[field], rules[field]);
    if (!fieldValid) {
      errors[field] = fieldErrors;
      isValid = false;
    }
  });

  return { isValid, errors };
};

/**
 * Maps validation rules to express-validator middleware rules
 * @param {Object} rule - The validation rule to convert
 * @param {string} field - The field name
 * @returns {Array} - Array of express-validator rules
 */
const mapToExpressValidatorRules = (rule, field) => {
  const rules = [];

  if (rule.required) {
    rules.push(field.notEmpty().withMessage(rule.messages.required));
  }

  if (rule.minLength) {
    rules.push(field.isLength({ min: rule.minLength }).withMessage(rule.messages.minLength));
  }

  if (rule.maxLength) {
    rules.push(field.isLength({ max: rule.maxLength }).withMessage(rule.messages.maxLength));
  }

  if (rule.pattern) {
    rules.push(field.matches(rule.pattern).withMessage(rule.messages.pattern));
  }

  return rules;
};

/**
 * Maps validation rules to Joi schema rules
 * @param {Object} rule - The validation rule to convert
 * @returns {Object} - Joi schema rule
 */
const mapToJoiSchema = (rule) => {
  let schema = Joi.string();

  if (rule.required) {
    schema = schema.required().messages({
      'string.empty': rule.messages.required,
      'any.required': rule.messages.required
    });
  }

  if (rule.minLength) {
    schema = schema.min(rule.minLength).messages({
      'string.min': rule.messages.minLength
    });
  }

  if (rule.maxLength) {
    schema = schema.max(rule.maxLength).messages({
      'string.max': rule.messages.maxLength
    });
  }

  if (rule.pattern) {
    schema = schema.pattern(rule.pattern).messages({
      'string.pattern.base': rule.messages.pattern
    });
  }

  return schema;
};

module.exports = {
  validateValue,
  validateObject,
  mapToExpressValidatorRules,
  mapToJoiSchema
};
