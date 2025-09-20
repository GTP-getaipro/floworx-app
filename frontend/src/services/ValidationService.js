import { validationRules } from '../utils/validationRules';

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
  static validateField(field, value, allValues = {}) {
    const validator = validationRules[field];
    if (!validator) {
      // No validation rules found for field - assume valid
      return { isValid: true, error: null };
    }

    const error = validator(value, allValues);
    return {
      isValid: !error,
      error: error || null
    };
  }

  /**
   * Validate multiple fields
   * @param {Object} values - Object containing field values
   * @returns {Object} - { isValid, errors }
   */
  static validateForm(values, fields = null) {
    const fieldsToValidate = fields || Object.keys(values);
    const errors = {};
    let isValid = true;

    fieldsToValidate.forEach(field => {
      if (validationRules[field]) {
        const result = this.validateField(field, values[field], values);
        if (!result.isValid) {
          errors[field] = result.error;
          isValid = false;
        }
      }
    });

    return { isValid, errors };
  }

  /**
   * Create custom validation rules
   * @param {Object} customRules - Custom validation rules
   * @returns {Object} - Validation rules object
   */
  static getAvailableRules() {
    return Object.keys(validationRules);
  }
}

export default ValidationService;
