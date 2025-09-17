// Simple validation rules
export const validationRules = {
  required: (value) => !value || value.trim() === '' ? 'This field is required' : '',
  
  email: (value) => {
    if (!value) return '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !emailRegex.test(value) ? 'Please enter a valid email address' : '';
  },
  
  minLength: (min) => (value) => {
    if (!value) return '';
    return value.length < min ? `Must be at least ${min} characters` : '';
  },
  
  maxLength: (max) => (value) => {
    if (!value) return '';
    return value.length > max ? `Must be no more than ${max} characters` : '';
  },
  
  password: (value) => {
    if (!value) return '';
    if (value.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(value)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(value)) return 'Password must contain at least one lowercase letter';
    if (!/\d/.test(value)) return 'Password must contain at least one number';
    if (!/[@$!%*?&]/.test(value)) return 'Password must contain at least one special character';
    return '';
  },
  
  confirmPassword: (password) => (value, allValues) => {
    if (!value) return '';
    return value !== allValues[password] ? 'Passwords do not match' : '';
  }
};

export default validationRules;
