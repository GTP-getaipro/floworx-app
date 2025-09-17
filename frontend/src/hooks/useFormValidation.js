import { useState, useCallback } from 'react';

// Simple placeholder hook for form validation
export const commonValidationRules = {
  required: (value) => !value ? 'This field is required' : '',
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !emailRegex.test(value) ? 'Please enter a valid email address' : '';
  },
  minLength: (min) => (value) => {
    return value && value.length < min ? `Must be at least ${min} characters` : '';
  },
  match: (fieldName, message) => (value, allValues) => {
    return value !== allValues[fieldName] ? message : '';
  }
};

const useFormValidation = (initialValues, validationRules, options = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    
    if (options.validateOnBlur && validationRules[name]) {
      const rules = validationRules[name];
      let error = '';
      
      for (const rule of rules) {
        error = typeof rule === 'function' ? rule(value, values) : rule(value);
        if (error) break;
      }
      
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [validationRules, values, options.validateOnBlur]);

  const handleSubmit = useCallback((submitFn, e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Basic validation
    const newErrors = {};
    Object.keys(validationRules).forEach(field => {
      const rules = validationRules[field];
      let error = '';
      
      for (const rule of rules) {
        error = typeof rule === 'function' ? rule(values[field], values) : rule(values[field]);
        if (error) break;
      }
      
      if (error) newErrors[field] = error;
    });
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      return submitFn(values).finally(() => setIsSubmitting(false));
    } else {
      setIsSubmitting(false);
      return Promise.resolve({ success: false });
    }
  }, [validationRules, values]);

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setErrors,
    setValues
  };
};

export default useFormValidation;
