/**
 * Shared validation rules between frontend and backend
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const NAME_REGEX = /^[a-zA-Z\s'-]{1,100}$/;
const BUSINESS_NAME_REGEX = /^[\w\s&'-]{1,200}$/;
const PHONE_REGEX = /^\+?[\d\s-()]{10,20}$/;

const validationRules = {
  email: {
    required: true,
    pattern: EMAIL_REGEX,
    minLength: 5,
    maxLength: 255,
    messages: {
      required: 'Email is required',
      pattern: 'Please enter a valid email address',
      minLength: 'Email must be at least 5 characters',
      maxLength: 'Email cannot exceed 255 characters'
    }
  },
  password: {
    required: true,
    pattern: PASSWORD_REGEX,
    minLength: 8,
    maxLength: 128,
    messages: {
      required: 'Password is required',
      pattern: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      minLength: 'Password must be at least 8 characters',
      maxLength: 'Password cannot exceed 128 characters'
    }
  },
  name: {
    required: true,
    pattern: NAME_REGEX,
    minLength: 1,
    maxLength: 100,
    messages: {
      required: 'Name is required',
      pattern: 'Name can only contain letters, spaces, hyphens, and apostrophes',
      minLength: 'Name is required',
      maxLength: 'Name cannot exceed 100 characters'
    }
  },
  businessName: {
    required: true,
    pattern: BUSINESS_NAME_REGEX,
    minLength: 1,
    maxLength: 200,
    messages: {
      required: 'Business name is required',
      pattern: 'Business name can only contain letters, numbers, spaces, &, hyphens, and apostrophes',
      minLength: 'Business name is required',
      maxLength: 'Business name cannot exceed 200 characters'
    }
  },
  phone: {
    required: true,
    pattern: PHONE_REGEX,
    minLength: 10,
    maxLength: 20,
    messages: {
      required: 'Phone number is required',
      pattern: 'Please enter a valid phone number',
      minLength: 'Phone number must be at least 10 digits',
      maxLength: 'Phone number cannot exceed 20 characters'
    }
  }
};

module.exports = {
  validationRules,
  EMAIL_REGEX,
  PASSWORD_REGEX,
  NAME_REGEX,
  BUSINESS_NAME_REGEX,
  PHONE_REGEX
};
