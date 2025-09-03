import { validationRules } from '../../../shared/utils/validation/rules';
import { validateValue, validateObject } from '../../../shared/utils/validation/utils';

/**
 * Form validation service for frontend components
 */
class ValidationService {
  /**
   * Validate a single field
   * @param {string} field - Field name
   * @param {*} value - Field value
   * @returns {Object} - { isValid, errors }
   */
  static validateField(field, value) {
    const rules = validationRules[field];
    if (!rules) {
      console.warn(`No validation rules found for field: ${field}`);
      return { isValid: true, errors: [] };
    }
    return validateValue(value, rules);
  }

  /**
   * Validate multiple fields
   * @param {Object} values - Object containing field values
   * @returns {Object} - { isValid, errors }
   */
  static validateForm(values) {
    const fieldsToValidate = {};
    Object.keys(values).forEach(field => {
      if (validationRules[field]) {
        fieldsToValidate[field] = validationRules[field];
      }
    });
    return validateObject(values, fieldsToValidate);
  }

  /**
   * Create custom validation rules
   * @param {Object} customRules - Custom validation rules
   * @returns {Object} - Validation rules object
   */
  static createCustomRules(customRules) {
    return Object.entries(customRules).reduce((acc, [field, rules]) => {
      acc[field] = {
        ...(validationRules[field] || {}),
        ...rules,
      };
      return acc;
    }, {});
  }
}

export default ValidationService;
