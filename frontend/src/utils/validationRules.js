// Validation rules for forms
export const validationRules = {
  // Email validation
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Please enter a valid email address'
  },

  // Password validation
  password: {
    required: true,
    minLength: 8,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    message: 'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  },

  // Confirm password validation
  confirmPassword: {
    required: true,
    message: 'Please confirm your password'
  },

  // Name validation
  name: {
    required: true,
    minLength: 2,
    maxLength: 50,
    pattern: /^[a-zA-Z\s'-]+$/,
    message: 'Name must be 2-50 characters long and contain only letters, spaces, hyphens, and apostrophes'
  },

  // First name validation
  firstName: {
    required: true,
    minLength: 2,
    maxLength: 30,
    pattern: /^[a-zA-Z'-]+$/,
    message: 'First name must be 2-30 characters long and contain only letters, hyphens, and apostrophes'
  },

  // Last name validation
  lastName: {
    required: true,
    minLength: 2,
    maxLength: 30,
    pattern: /^[a-zA-Z'-]+$/,
    message: 'Last name must be 2-30 characters long and contain only letters, hyphens, and apostrophes'
  },

  // Phone validation
  phone: {
    required: false,
    pattern: /^\+?[\d\s\-\(\)]{10,}$/,
    message: 'Please enter a valid phone number'
  },

  // Company name validation
  companyName: {
    required: false,
    minLength: 2,
    maxLength: 100,
    message: 'Company name must be 2-100 characters long'
  },

  // Business type validation
  businessType: {
    required: true,
    message: 'Please select a business type'
  },

  // URL validation
  url: {
    required: false,
    pattern: /^https?:\/\/.+\..+/,
    message: 'Please enter a valid URL'
  },

  // Required field validation
  required: {
    required: true,
    message: 'This field is required'
  }
};

// Validation functions
export const validateField = (value, rules) => {
  if (!rules) return null;

  // Check required
  if (rules.required && (!value || value.toString().trim() === '')) {
    return rules.message || 'This field is required';
  }

  // If field is empty and not required, it's valid
  if (!value || value.toString().trim() === '') {
    return null;
  }

  // Check minimum length
  if (rules.minLength && value.length < rules.minLength) {
    return `Must be at least ${rules.minLength} characters long`;
  }

  // Check maximum length
  if (rules.maxLength && value.length > rules.maxLength) {
    return `Must be no more than ${rules.maxLength} characters long`;
  }

  // Check pattern
  if (rules.pattern && !rules.pattern.test(value)) {
    return rules.message || 'Invalid format';
  }

  return null;
};

// Validate multiple fields
export const validateFields = (values, fieldRules) => {
  const errors = {};
  let isValid = true;

  Object.keys(fieldRules).forEach(fieldName => {
    const error = validateField(values[fieldName], fieldRules[fieldName]);
    if (error) {
      errors[fieldName] = error;
      isValid = false;
    }
  });

  return { errors, isValid };
};

// Validate password confirmation
export const validatePasswordConfirmation = (password, confirmPassword) => {
  if (!confirmPassword) {
    return 'Please confirm your password';
  }
  
  if (password !== confirmPassword) {
    return 'Passwords do not match';
  }
  
  return null;
};

// Email validation function
export const isValidEmail = (email) => {
  return validationRules.email.pattern.test(email);
};

// Password validation function
export const isValidPassword = (password) => {
  return password && 
         password.length >= validationRules.password.minLength &&
         validationRules.password.pattern.test(password);
};

// Phone validation function
export const isValidPhone = (phone) => {
  return !phone || validationRules.phone.pattern.test(phone);
};

// URL validation function
export const isValidUrl = (url) => {
  return !url || validationRules.url.pattern.test(url);
};

// Get password strength
export const getPasswordStrength = (password) => {
  if (!password) return { score: 0, label: 'No password', color: 'gray' };

  let score = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    special: /[@$!%*?&]/.test(password)
  };

  score = Object.values(checks).filter(Boolean).length;

  const strength = {
    0: { label: 'Very Weak', color: 'red' },
    1: { label: 'Weak', color: 'red' },
    2: { label: 'Fair', color: 'orange' },
    3: { label: 'Good', color: 'yellow' },
    4: { label: 'Strong', color: 'green' },
    5: { label: 'Very Strong', color: 'green' }
  };

  return { score, ...strength[score], checks };
};

// Form validation presets
export const formValidationPresets = {
  login: {
    email: validationRules.email,
    password: { required: true, message: 'Password is required' }
  },

  register: {
    firstName: validationRules.firstName,
    lastName: validationRules.lastName,
    email: validationRules.email,
    password: validationRules.password,
    confirmPassword: validationRules.confirmPassword
  },

  profile: {
    firstName: validationRules.firstName,
    lastName: validationRules.lastName,
    email: validationRules.email,
    phone: validationRules.phone,
    companyName: validationRules.companyName
  },

  businessSetup: {
    businessType: validationRules.businessType,
    companyName: { ...validationRules.companyName, required: true }
  },

  forgotPassword: {
    email: validationRules.email
  },

  resetPassword: {
    password: validationRules.password,
    confirmPassword: validationRules.confirmPassword
  }
};

export default {
  validationRules,
  validateField,
  validateFields,
  validatePasswordConfirmation,
  isValidEmail,
  isValidPassword,
  isValidPhone,
  isValidUrl,
  getPasswordStrength,
  formValidationPresets
};
