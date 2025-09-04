/**
 * Frontend validation rules
 * Provides validation functions for form fields
 */

// Regex patterns
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const NAME_REGEX = /^[a-zA-Z\s'-]{1,100}$/;
const BUSINESS_NAME_REGEX = /^[\w\s&'-]{1,200}$/;
const PHONE_REGEX = /^\+?[\d\s-()]{10,20}$/;

/**
 * Basic validation functions
 */
const required = (value) => {
  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return 'This field is required';
  }
  return '';
};

const email = (value) => {
  if (value && !EMAIL_REGEX.test(value)) {
    return 'Please enter a valid email address';
  }
  return '';
};

const password = (value) => {
  if (value && !PASSWORD_REGEX.test(value)) {
    return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)';
  }
  return '';
};

const minLength = (min) => (value) => {
  if (value && value.length < min) {
    return `Must be at least ${min} characters`;
  }
  return '';
};

const maxLength = (max) => (value) => {
  if (value && value.length > max) {
    return `Must be at most ${max} characters`;
  }
  return '';
};

const pattern = (regex, message) => (value) => {
  if (value && !regex.test(value)) {
    return message;
  }
  return '';
};

const match = (field, message) => (value, allValues) => {
  if (value !== allValues[field]) {
    return message || `Must match ${field}`;
  }
  return '';
};

const name = (value) => {
  if (value && !NAME_REGEX.test(value)) {
    return 'Name must contain only letters, spaces, hyphens, and apostrophes';
  }
  return '';
};

const businessName = (value) => {
  if (value && !BUSINESS_NAME_REGEX.test(value)) {
    return 'Business name contains invalid characters';
  }
  return '';
};

const phone = (value) => {
  if (value && !PHONE_REGEX.test(value)) {
    return 'Please enter a valid phone number';
  }
  return '';
};

/**
 * Validation rules object
 */
export const validationRules = {
  required,
  email,
  password,
  minLength,
  maxLength,
  pattern,
  match,
  name,
  businessName,
  phone
};

export default validationRules;
