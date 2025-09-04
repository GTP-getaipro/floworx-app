import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook for form validation and management
 * @param {Object} initialValues - Initial form values
 * @param {Object} validationRules - Validation rules for each field
 * @param {Object} options - Additional options
 * @param {boolean} options.validateOnChange - Whether to validate on change
 * @param {boolean} options.validateOnBlur - Whether to validate on blur
 * @param {Function} options.onValidationComplete - Callback when validation completes
 */
const useFormValidation = (initialValues, validationRules, options = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Keep track of previous values for comparison
  const previousValues = useRef(initialValues);

  // Options with defaults
  const {
    validateOnChange = false,
    validateOnBlur = true,
    onValidationComplete = () => {},
  } = options;

  // Track if form has been submitted
  const hasSubmitted = useRef(false);

  // Effect to detect form changes
  useEffect(() => {
    if (JSON.stringify(values) !== JSON.stringify(previousValues.current)) {
      setIsDirty(true);
      previousValues.current = values;
    }
  }, [values]);

  /**
   * Validates a single field
   * @param {string} name - Field name
   * @param {any} value - Field value
   * @param {Object} allValues - All form values
   * @returns {string} Error message or empty string
   */
  const validateField = useCallback(
    (name, value, allValues = values) => {
      if (!validationRules[name]) return '';

      const rules = validationRules[name];
      let errorMessage = '';

      // Handle both array and single validation rules
      const ruleArray = Array.isArray(rules) ? rules : [rules];

      for (const rule of ruleArray) {
        try {
          const error = rule(value, allValues);
          if (error) {
            errorMessage = error;
            console.log(`🔍 Validation error for ${name}:`, errorMessage);
            break;
          }
        } catch (error) {
          console.error(`Validation error for field ${name}:`, error);
          errorMessage = 'Validation failed';
          break;
        }
      }

      return errorMessage;
    },
    [validationRules, values]
  );

  /**
   * Handles form field changes
   * @param {Event|string} eventOrName - Event object or field name
   * @param {any} [value] - Field value (if name provided directly)
   */
  const handleChange = useCallback(
    (eventOrName, value) => {
      const isEvent = eventOrName?.target && typeof eventOrName.target === 'object';
      const name = isEvent ? eventOrName.target.name : eventOrName;
      const newValue = isEvent ? eventOrName.target.value : value;

      setValues(prev => {
        const updated = { ...prev, [name]: newValue };

        // Validate on change if enabled
        if (validateOnChange || (hasSubmitted.current && touched[name])) {
          const error = validateField(name, newValue, updated);
          setErrors(prev => ({ ...prev, [name]: error }));
        }

        return updated;
      });

      // Mark field as touched
      if (!touched[name]) {
        setTouched(prev => ({ ...prev, [name]: true }));
      }
    },
    [validateOnChange, touched, validateField]
  );

  /**
   * Handles form field blur events
   * @param {Event|string} eventOrName - Event object or field name
   */
  const handleBlur = useCallback(
    eventOrName => {
      const name = eventOrName?.target?.name ?? eventOrName;
      const value = values[name];

      console.log(`🔍 handleBlur called for ${name} with value:`, value);

      setTouched(prev => ({ ...prev, [name]: true }));

      if (validateOnBlur || hasSubmitted.current) {
        const error = validateField(name, value);
        console.log(`🔍 Setting error for ${name}:`, error);
        setErrors(prev => ({ ...prev, [name]: error }));
      }
    },
    [validateOnBlur, values, validateField]
  );

  /**
   * Validates the entire form
   * @param {boolean} setTouchedFields - Whether to mark all fields as touched
   * @returns {Promise<boolean>} Whether the form is valid
   */
  const validateForm = useCallback(
    async (setTouchedFields = true) => {
      const newErrors = {};
      let isValid = true;

      // Mark all fields as touched if requested
      if (setTouchedFields) {
        const touchedFields = Object.keys(values).reduce(
          (acc, key) => ({ ...acc, [key]: true }),
          {}
        );
        setTouched(touchedFields);
      }

      // Validate each field
      for (const name of Object.keys(values)) {
        const error = validateField(name, values[name]);
        if (error) {
          newErrors[name] = error;
          isValid = false;
        }
      }

      setErrors(newErrors);
      onValidationComplete(isValid, newErrors);
      return isValid;
    },
    [validateField, values, onValidationComplete]
  );

  /**
   * Resets the form to its initial state
   * @param {Object} [newInitialValues] - Optional new initial values
   */
  const resetForm = useCallback(
    (newInitialValues = initialValues) => {
      setValues(newInitialValues);
      setErrors({});
      setTouched({});
      setIsSubmitting(false);
      setIsDirty(false);
      hasSubmitted.current = false;
      previousValues.current = newInitialValues;
    },
    [initialValues]
  );

  /**
   * Handles form submission
   * @param {Function} onSubmit - Submission handler function
   * @param {Event} [e] - Optional event object
   */
  const handleSubmit = useCallback(
    async (onSubmit, e) => {
      console.log('🚀 DEBUG: useFormValidation handleSubmit called');
      console.log('🚀 DEBUG: onSubmit function:', typeof onSubmit);
      console.log('🚀 DEBUG: event object:', e);

      if (e?.preventDefault) {
        e.preventDefault();
        console.log('🚀 DEBUG: preventDefault called');
      }

      hasSubmitted.current = true;
      setIsSubmitting(true);
      console.log('🚀 DEBUG: isSubmitting set to true');

      try {
        const isValid = await validateForm(true);

        if (isValid) {
          const result = await onSubmit(values);
          if (result?.success) {
            resetForm();
          }
          return result;
        }

        // Focus first invalid field
        const firstError = Object.keys(errors)[0];
        if (firstError) {
          const element = document.querySelector(`[name="${firstError}"]`);
          element?.focus();
        }

        return { success: false, errors };
      } catch (error) {
        console.error('Form submission error:', error);
        setErrors(prev => ({
          ...prev,
          submit: error.message || 'An error occurred during submission',
        }));
        throw error;
      } finally {
        setIsSubmitting(false);
      }
    },
    [validateForm, values, errors, resetForm]
  );

  /**
   * Sets multiple form values at once
   * @param {Object} newValues - New values to set
   * @param {boolean} [validate] - Whether to validate the new values
   */
  const setMultipleValues = useCallback(
    async (newValues, validate = false) => {
      setValues(prev => ({ ...prev, ...newValues }));
      if (validate) {
        await validateForm(false);
      }
    },
    [validateForm]
  );

  return {
    // Form state
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,

    // Event handlers
    handleChange,
    handleBlur,
    handleSubmit,

    // Form actions
    resetForm,
    setValues,
    setMultipleValues,
    validateForm,
    validateField,

    // Utilities
    setErrors,
    setTouched,
  };
};

export default useFormValidation;

// Export commonly used validation rules
export const commonValidationRules = {
  required: value => (!value ? 'This field is required' : ''),
  email: value => (!/\S+@\S+\.\S+/.test(value) ? 'Invalid email format' : ''),
  minLength: min => value =>
    value && value.length < min ? `Must be at least ${min} characters` : '',
  maxLength: max => value =>
    value && value.length > max ? `Must be at most ${max} characters` : '',
  pattern: (pattern, message) => value => (value && !pattern.test(value) ? message : ''),
  match: (field, message) => (value, allValues) => (value !== allValues[field] ? message : ''),
};
