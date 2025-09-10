/**
 * Authentication Validation Schemas
 * Schemas for login, registration, password reset, and OAuth flows
 */

const Joi = require('joi');

const { email, password, name, _optionalName, phone, uuid } = require('./common');

// Registration schema
const registerSchema = Joi.object({
  firstName: name,
  lastName: name,
  email: email,
  password: password,
  phone: phone,
  businessName: Joi.string().trim().min(1).max(200).optional().messages({
    'string.min': 'Business name must be at least 1 character',
    'string.max': 'Business name must be less than 200 characters'
  }),
  agreeToTerms: Joi.boolean().valid(true).required().messages({
    'any.only': 'You must agree to the terms and conditions',
    'any.required': 'You must agree to the terms and conditions'
  }),
  marketingConsent: Joi.boolean().default(false).optional()
}).options({ stripUnknown: true });

// Login schema
const loginSchema = Joi.object({
  email: email,
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
    'any.required': 'Password is required'
  }),
  rememberMe: Joi.boolean().default(false).optional()
}).options({ stripUnknown: true });

// Password reset request schema
const passwordResetRequestSchema = Joi.object({
  email: email
}).options({ stripUnknown: true });

// Password reset confirmation schema
const passwordResetConfirmSchema = Joi.object({
  token: Joi.string().required().messages({
    'string.empty': 'Reset token is required',
    'any.required': 'Reset token is required'
  }),
  newPassword: password,
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
    'string.empty': 'Password confirmation is required',
    'any.required': 'Password confirmation is required'
  })
}).options({ stripUnknown: true });

// Change password schema
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'string.empty': 'Current password is required',
    'any.required': 'Current password is required'
  }),
  newPassword: password,
  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Passwords do not match',
    'string.empty': 'Password confirmation is required',
    'any.required': 'Password confirmation is required'
  })
}).options({ stripUnknown: true });

// OAuth callback schema
const oauthCallbackSchema = Joi.object({
  code: Joi.string().required().messages({
    'string.empty': 'Authorization code is required',
    'any.required': 'Authorization code is required'
  }),
  state: Joi.string().optional(),
  error: Joi.string().optional(),
  error_description: Joi.string().optional()
}).options({ stripUnknown: true });

// OAuth state schema
const oauthStateSchema = Joi.object({
  provider: Joi.string().valid('google', 'microsoft', 'github').required().messages({
    'any.only': 'Provider must be one of: google, microsoft, github',
    'any.required': 'OAuth provider is required'
  }),
  redirectUrl: Joi.string().uri().optional().messages({
    'string.uri': 'Redirect URL must be a valid URL'
  })
}).options({ stripUnknown: true });

// Token refresh schema
const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'string.empty': 'Refresh token is required',
    'any.required': 'Refresh token is required'
  })
}).options({ stripUnknown: true });

// Email verification schema
const emailVerificationSchema = Joi.object({
  token: Joi.string().required().messages({
    'string.empty': 'Verification token is required',
    'any.required': 'Verification token is required'
  })
}).options({ stripUnknown: true });

// Resend verification email schema
const resendVerificationSchema = Joi.object({
  email: email
}).options({ stripUnknown: true });

// Two-factor authentication setup schema
const twoFactorSetupSchema = Joi.object({
  secret: Joi.string().required().messages({
    'string.empty': '2FA secret is required',
    'any.required': '2FA secret is required'
  }),
  token: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.length': '2FA token must be 6 digits',
      'string.pattern.base': '2FA token must contain only digits',
      'string.empty': '2FA token is required',
      'any.required': '2FA token is required'
    })
}).options({ stripUnknown: true });

// Two-factor authentication verify schema
const twoFactorVerifySchema = Joi.object({
  token: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.length': '2FA token must be 6 digits',
      'string.pattern.base': '2FA token must contain only digits',
      'string.empty': '2FA token is required',
      'any.required': '2FA token is required'
    })
}).options({ stripUnknown: true });

// Account lockout check schema
const accountLockoutSchema = Joi.object({
  email: email
}).options({ stripUnknown: true });

// Session validation schema
const sessionValidationSchema = Joi.object({
  sessionId: uuid,
  userId: uuid
}).options({ stripUnknown: true });

module.exports = {
  registerSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetConfirmSchema,
  changePasswordSchema,
  oauthCallbackSchema,
  oauthStateSchema,
  refreshTokenSchema,
  emailVerificationSchema,
  resendVerificationSchema,
  twoFactorSetupSchema,
  twoFactorVerifySchema,
  accountLockoutSchema,
  sessionValidationSchema
};
