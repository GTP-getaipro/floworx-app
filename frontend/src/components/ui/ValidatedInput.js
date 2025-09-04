import React, { useState, useEffect } from 'react';
import Input from './Input';

const ValidatedInput = ({
  name,
  value,
  onChange,
  onBlur,
  error,
  validationRules = {},
  realTimeValidation = true,
  ...props
}) => {
  const [localError, setLocalError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [hasBeenTouched, setHasBeenTouched] = useState(false);

  // Real-time validation function
  const validateField = fieldValue => {
    if (!realTimeValidation) return '';

    // Email validation
    if (name === 'email' && fieldValue) {
      if (!fieldValue.includes('@')) {
        return 'Please enter a valid email address';
      }
      if (!fieldValue.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        return 'Please enter a valid email format';
      }
    }

    // Password validation
    if (name === 'password' && fieldValue) {
      if (fieldValue.length < 8) {
        return 'Password must be at least 8 characters long';
      }
      if (!/(?=.*[a-z])/.test(fieldValue)) {
        return 'Password must contain at least one lowercase letter';
      }
      if (!/(?=.*[A-Z])/.test(fieldValue)) {
        return 'Password must contain at least one uppercase letter';
      }
      if (!/(?=.*\d)/.test(fieldValue)) {
        return 'Password must contain at least one number';
      }
      if (!/(?=.*[!@#$%^&*])/.test(fieldValue)) {
        return 'Password must contain at least one special character';
      }
    }

    // Required field validation (only check if field has been touched)
    if (validationRules.required && !fieldValue && hasBeenTouched) {
      return `${props.label || name} is required`;
    }

    // Minimum length validation
    if (validationRules.minLength && fieldValue && fieldValue.length < validationRules.minLength) {
      return `${props.label || name} must be at least ${validationRules.minLength} characters`;
    }

    // Maximum length validation
    if (validationRules.maxLength && fieldValue && fieldValue.length > validationRules.maxLength) {
      return `${props.label || name} must be no more than ${validationRules.maxLength} characters`;
    }

    return '';
  };

  // Handle input change with real-time validation
  const handleChange = e => {
    const newValue = e.target.value;

    if (hasBeenTouched && realTimeValidation) {
      setIsValidating(true);

      // Debounce validation for better performance
      setTimeout(() => {
        const validationError = validateField(newValue);
        setLocalError(validationError);
        setIsValidating(false);
      }, 300);
    }

    onChange(e);
  };

  // Handle input blur
  const handleBlur = e => {
    setHasBeenTouched(true);

    if (realTimeValidation) {
      const validationError = validateField(e.target.value);
      setLocalError(validationError);
    }

    // Always call the form's onBlur handler for form-level validation
    onBlur(e);
  };

  // Clear local error when external error changes
  useEffect(() => {
    if (error) {
      setLocalError('');
    }
  }, [error]);

  // Determine which error to show - prioritize form validation error
  const displayError = error || localError;

  return (
    <div className='relative'>
      <Input
        {...props}
        name={name}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        error={displayError}
      />

      {/* Real-time validation indicator */}
      {isValidating && (
        <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
          <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500' />
        </div>
      )}

      {/* Success indicator */}
      {hasBeenTouched && !displayError && !isValidating && value && (
        <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
          <svg className='w-4 h-4 text-green-500' fill='currentColor' viewBox='0 0 20 20'>
            <path
              fillRule='evenodd'
              d='M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z'
              clipRule='evenodd'
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default ValidatedInput;
