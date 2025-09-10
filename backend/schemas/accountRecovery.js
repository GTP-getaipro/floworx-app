/**
 * Account Recovery Validation Schemas
 * Schemas for password reset, account recovery, and security operations
 */

const Joi = require('joi');

const { email, password, uuid, phone, paginationQuery } = require('./common');

// Password reset request schema
const passwordResetRequestSchema = Joi.object({
  email: email,
  captcha: Joi.string().optional().messages({
    'string.base': 'Captcha must be a string'
  })
}).options({ stripUnknown: true });

// Password reset verification schema
const passwordResetVerifySchema = Joi.object({
  token: Joi.string().required().messages({
    'string.empty': 'Reset token is required',
    'any.required': 'Reset token is required'
  }),
  email: email
}).options({ stripUnknown: true });

// Password reset completion schema
const passwordResetCompleteSchema = Joi.object({
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

// Account lockout check schema
const accountLockoutCheckSchema = Joi.object({
  email: email
}).options({ stripUnknown: true });

// Account unlock request schema
const accountUnlockRequestSchema = Joi.object({
  email: email,
  reason: Joi.string().max(500).optional().messages({
    'string.max': 'Reason must be less than 500 characters'
  })
}).options({ stripUnknown: true });

// Emergency access request schema
const emergencyAccessRequestSchema = Joi.object({
  email: email,
  phone: phone.required().messages({
    'any.required': 'Phone number is required for emergency access'
  }),
  emergencyType: Joi.string()
    .valid('account_locked', 'forgot_password', 'compromised_account', 'lost_2fa', 'other')
    .required()
    .messages({
      'any.only':
        'Emergency type must be one of: account_locked, forgot_password, compromised_account, lost_2fa, other',
      'any.required': 'Emergency type is required'
    }),
  description: Joi.string().min(10).max(1000).required().messages({
    'string.min': 'Description must be at least 10 characters',
    'string.max': 'Description must be less than 1000 characters',
    'string.empty': 'Description is required',
    'any.required': 'Description is required'
  }),
  verificationMethod: Joi.string().valid('sms', 'email', 'phone_call').default('sms').messages({
    'any.only': 'Verification method must be one of: sms, email, phone_call'
  })
}).options({ stripUnknown: true });

// Emergency access verification schema
const emergencyAccessVerifySchema = Joi.object({
  requestId: uuid,
  verificationCode: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.length': 'Verification code must be 6 digits',
      'string.pattern.base': 'Verification code must contain only digits',
      'string.empty': 'Verification code is required',
      'any.required': 'Verification code is required'
    })
}).options({ stripUnknown: true });

// Security question setup schema
const securityQuestionSetupSchema = Joi.object({
  questions: Joi.array()
    .items(
      Joi.object({
        question: Joi.string().min(5).max(200).required().messages({
          'string.min': 'Security question must be at least 5 characters',
          'string.max': 'Security question must be less than 200 characters',
          'string.empty': 'Security question is required',
          'any.required': 'Security question is required'
        }),
        answer: Joi.string().min(2).max(100).required().messages({
          'string.min': 'Security answer must be at least 2 characters',
          'string.max': 'Security answer must be less than 100 characters',
          'string.empty': 'Security answer is required',
          'any.required': 'Security answer is required'
        })
      }).required()
    )
    .min(2)
    .max(5)
    .required()
    .messages({
      'array.min': 'At least 2 security questions are required',
      'array.max': 'Maximum 5 security questions allowed',
      'any.required': 'Security questions are required'
    })
}).options({ stripUnknown: true });

// Security question verification schema
const securityQuestionVerifySchema = Joi.object({
  answers: Joi.array()
    .items(
      Joi.object({
        questionId: uuid,
        answer: Joi.string().required().messages({
          'string.empty': 'Security answer is required',
          'any.required': 'Security answer is required'
        })
      }).required()
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one security answer is required',
      'any.required': 'Security answers are required'
    })
}).options({ stripUnknown: true });

// Account recovery method setup schema
const recoveryMethodSetupSchema = Joi.object({
  methods: Joi.array()
    .items(
      Joi.object({
        type: Joi.string()
          .valid('email', 'sms', 'security_questions', 'backup_codes', 'trusted_device')
          .required()
          .messages({
            'any.only':
              'Recovery method type must be one of: email, sms, security_questions, backup_codes, trusted_device',
            'any.required': 'Recovery method type is required'
          }),
        value: Joi.string()
          .when('type', {
            is: 'email',
            then: email.required(),
            otherwise: Joi.string().required()
          })
          .messages({
            'string.empty': 'Recovery method value is required',
            'any.required': 'Recovery method value is required'
          }),
        enabled: Joi.boolean().default(true),
        primary: Joi.boolean().default(false)
      }).required()
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one recovery method is required',
      'any.required': 'Recovery methods are required'
    })
}).options({ stripUnknown: true });

// Backup codes generation schema
const backupCodesGenerateSchema = Joi.object({
  regenerate: Joi.boolean().default(false).messages({
    'boolean.base': 'Regenerate must be true or false'
  })
}).options({ stripUnknown: true });

// Backup code verification schema
const backupCodeVerifySchema = Joi.object({
  code: Joi.string()
    .length(8)
    .pattern(/^[A-Z0-9]{8}$/)
    .required()
    .messages({
      'string.length': 'Backup code must be 8 characters',
      'string.pattern.base': 'Backup code must contain only uppercase letters and numbers',
      'string.empty': 'Backup code is required',
      'any.required': 'Backup code is required'
    })
}).options({ stripUnknown: true });

// Security audit log query schema
const securityAuditLogSchema = Joi.object({
  ...paginationQuery.describe().keys,
  userId: uuid.optional(),
  action: Joi.string()
    .valid(
      'login_attempt',
      'login_success',
      'login_failure',
      'password_reset_request',
      'password_reset_complete',
      'account_locked',
      'account_unlocked',
      'emergency_access_request',
      'security_question_setup',
      'recovery_method_added',
      'recovery_method_removed',
      'backup_codes_generated',
      'suspicious_activity'
    )
    .optional()
    .messages({
      'any.only': 'Action must be a valid security audit action'
    }),
  startDate: Joi.date().iso().optional().messages({
    'date.format': 'Start date must be in ISO format'
  }),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional().messages({
    'date.format': 'End date must be in ISO format',
    'date.min': 'End date must be after start date'
  }),
  ipAddress: Joi.string().ip().optional().messages({
    'string.ip': 'IP address must be valid'
  }),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').optional().messages({
    'any.only': 'Severity must be one of: low, medium, high, critical'
  })
}).options({ stripUnknown: true });

// Trusted device registration schema
const trustedDeviceRegisterSchema = Joi.object({
  deviceName: Joi.string().trim().min(1).max(100).required().messages({
    'string.min': 'Device name must be at least 1 character',
    'string.max': 'Device name must be less than 100 characters',
    'string.empty': 'Device name is required',
    'any.required': 'Device name is required'
  }),
  deviceFingerprint: Joi.string().required().messages({
    'string.empty': 'Device fingerprint is required',
    'any.required': 'Device fingerprint is required'
  }),
  trustDuration: Joi.number().integer().min(1).max(90).default(30).messages({
    'number.base': 'Trust duration must be a number',
    'number.integer': 'Trust duration must be an integer',
    'number.min': 'Trust duration must be at least 1 day',
    'number.max': 'Trust duration cannot exceed 90 days'
  })
}).options({ stripUnknown: true });

module.exports = {
  passwordResetRequestSchema,
  passwordResetVerifySchema,
  passwordResetCompleteSchema,
  accountLockoutCheckSchema,
  accountUnlockRequestSchema,
  emergencyAccessRequestSchema,
  emergencyAccessVerifySchema,
  securityQuestionSetupSchema,
  securityQuestionVerifySchema,
  recoveryMethodSetupSchema,
  backupCodesGenerateSchema,
  backupCodeVerifySchema,
  securityAuditLogSchema,
  trustedDeviceRegisterSchema
};
