import { useCallback, useMemo, useRef, useState } from "react";

export default function useFormValidation(initialValues, rules, options = {}) {
  // Handle both old and new parameter formats for backward compatibility
  const actualInitialValues = initialValues?.initialValues || initialValues || {};
  const actualRules = initialValues?.rules || rules || {};
  const actualOptions = initialValues?.options || options || {};

  const [values, setValues] = useState(actualInitialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rulesRef = useRef(actualRules);
  rulesRef.current = actualRules;

  const validateField = useCallback((fieldName, value, allValues = values) => {
    const fieldRules = rulesRef.current[fieldName];
    if (!fieldRules || !Array.isArray(fieldRules)) {
      return null;
    }

    for (const rule of fieldRules) {
      try {
        const error = rule(value, allValues);
        if (error) {
          return error;
        }
      } catch (err) {
        console.error(`Validation error for field ${fieldName}:`, err);
        return "Validation error occurred";
      }
    }
    return null;
  }, [values]);

  const validate = useCallback(() => {
    const newErrors = {};
    let valid = true;

    Object.keys(rulesRef.current).forEach(fieldName => {
      const error = validateField(fieldName, values[fieldName], values);
      if (error) {
        newErrors[fieldName] = error;
        valid = false;
      }
    });

    setErrors(newErrors);
    return { valid, errors: newErrors };
  }, [values, validateField]);

  const handleChange = useCallback((e) => {
    if (!e || !e.target) {
      console.error('handleChange called with invalid event:', e);
      return;
    }

    const { name, value } = e.target;
    if (!name) {
      console.error('handleChange called with event missing name:', e.target);
      return;
    }

    const newValues = { ...values, [name]: value };
    setValues(newValues);

    // Validate touched field on change if enabled
    if (actualOptions.validateOnChange && touched[name]) {
      const error = validateField(name, value, newValues);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  }, [values, touched, validateField, actualOptions.validateOnChange]);

  const handleBlur = useCallback((e) => {
    if (!e || !e.target) {
      console.error('handleBlur called with invalid event:', e);
      return;
    }

    const { name, value } = e.target;
    if (!name) {
      console.error('handleBlur called with event missing name:', e.target);
      return;
    }

    setTouched(prev => ({ ...prev, [name]: true }));

    // Validate on blur if enabled
    if (actualOptions.validateOnBlur !== false) {
      const error = validateField(name, value, values);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  }, [values, validateField, actualOptions.validateOnBlur]);

  const setValue = useCallback((name, value) => {
    const newValues = { ...values, [name]: value };
    setValues(newValues);

    if (touched[name]) {
      const error = validateField(name, value, newValues);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  }, [values, touched, validateField]);

  // Add setValues function for bulk updates (needed by RegisterForm)
  const setValuesMultiple = useCallback((newValues) => {
    if (typeof newValues === 'function') {
      setValues(prev => {
        const updated = newValues(prev);
        return updated;
      });
    } else {
      setValues(prev => ({ ...prev, ...newValues }));
    }
  }, []);

  // Add handleSubmit function (needed by RegisterForm)
  const handleSubmit = useCallback((submitHandler, event) => {
    if (event) {
      event.preventDefault();
    }

    setIsSubmitting(true);

    // Validate all fields
    const { valid } = validate();

    if (valid && submitHandler) {
      try {
        const result = submitHandler(values);

        // Handle both sync and async submit handlers
        if (result && typeof result.then === 'function') {
          return result.finally(() => setIsSubmitting(false));
        } else {
          setIsSubmitting(false);
          return result;
        }
      } catch (error) {
        setIsSubmitting(false);
        throw error;
      }
    } else {
      setIsSubmitting(false);
      return false;
    }
  }, [values, validate]);

  const reset = useCallback(() => {
    setValues(actualInitialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [actualInitialValues]);

  const isValid = useMemo(() => {
    return Object.keys(errors).every(key => !errors[key]);
  }, [errors]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    setValue,
    setValues: setValuesMultiple,
    validate,
    isValid,
    reset
  };
}
