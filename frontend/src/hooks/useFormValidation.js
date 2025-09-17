import { useCallback, useMemo, useRef, useState } from "react";

export default function useFormValidation({ initialValues, rules }) {
  const [values, setValues] = useState(initialValues || {});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const rulesRef = useRef(rules);
  rulesRef.current = rules;

  const validateField = useCallback((fieldName, value, allValues = values) => {
    const fieldRules = rulesRef.current[fieldName];
    if (!fieldRules || !Array.isArray(fieldRules)) {
      return null;
    }

    for (const rule of fieldRules) {
      const error = rule(value, allValues);
      if (error) {
        return error;
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
    const { name, value } = e.target;
    const newValues = { ...values, [name]: value };
    setValues(newValues);

    // Validate touched field on change
    if (touched[name]) {
      const error = validateField(name, value, newValues);
      setErrors(prev => ({
        ...prev,
        [name]: error
      }));
    }
  }, [values, touched, validateField]);

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    const error = validateField(name, value, values);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, [values, validateField]);

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

  const reset = useCallback(() => {
    setValues(initialValues || {});
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const isValid = useMemo(() => {
    return Object.keys(errors).every(key => !errors[key]);
  }, [errors]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    setValue,
    validate,
    isValid,
    reset
  };
}
