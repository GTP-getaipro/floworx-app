// Test Data Fixtures for Floworx Business Type & Password Reset Tests
const { v4: uuidv4 } = require('uuid');

// Business Type Test Data
const businessTypes = {
  hotTubSpa: {
    id: 1,
    name: 'Hot Tub & Spa',
    description: 'Email automation for hot tub dealers, service companies, and spa retailers specializing in sales, service calls, parts orders, and warranty claims',
    slug: 'hot-tub-spa',
    is_active: true,
    sort_order: 1,
    default_categories: [
      {
        name: 'Service Calls',
        description: 'Emergency repairs and maintenance requests',
        priority: 'high'
      },
      {
        name: 'Sales Inquiries',
        description: 'New customer quotes and product information',
        priority: 'medium'
      },
      {
        name: 'Parts Orders',
        description: 'Replacement parts and accessories',
        priority: 'medium'
      },
      {
        name: 'Warranty Claims',
        description: 'Product warranty and support issues',
        priority: 'high'
      },
      {
        name: 'General Support',
        description: 'General questions and customer support',
        priority: 'low'
      }
    ],
    workflow_template_id: 'floworx-hot-tub-automation-v1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  
  electrician: {
    id: 2,
    name: 'Electrician',
    description: 'Email automation for electrical contractors and service providers',
    slug: 'electrician',
    is_active: true,
    sort_order: 2,
    default_categories: [
      {
        name: 'Emergency Calls',
        description: 'Electrical emergencies and urgent repairs',
        priority: 'high'
      },
      {
        name: 'Estimates',
        description: 'Project estimates and quotes',
        priority: 'medium'
      },
      {
        name: 'Maintenance',
        description: 'Scheduled maintenance and inspections',
        priority: 'low'
      }
    ],
    workflow_template_id: 'floworx-electrician-automation-v1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  
  inactive: {
    id: 3,
    name: 'Inactive Business Type',
    description: 'This business type is inactive for testing',
    slug: 'inactive-business',
    is_active: false,
    sort_order: 999,
    default_categories: [],
    workflow_template_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
};

// Workflow Template Test Data
const workflowTemplates = {
  hotTubTemplate: {
    id: 1,
    business_type_id: 1,
    name: 'Hot Tub Email Automation',
    description: 'Comprehensive email automation for hot tub businesses',
    template_json: {
      name: 'Floworx Hot Tub Email Automation',
      nodes: [
        {
          parameters: {},
          name: 'Gmail Trigger',
          type: 'n8n-nodes-base.gmailTrigger',
          typeVersion: 1,
          position: [250, 300],
          webhookId: 'gmail-webhook',
          credentials: {
            gmailOAuth2: 'gmail_oauth'
          }
        },
        {
          parameters: {
            conditions: {
              string: [
                {
                  value1: '={{$json.subject.toLowerCase()}}',
                  operation: 'contains',
                  value2: 'service'
                },
                {
                  value1: '={{$json.subject.toLowerCase()}}',
                  operation: 'contains',
                  value2: 'repair'
                }
              ]
            }
          },
          name: 'Is Service Call?',
          type: 'n8n-nodes-base.if',
          typeVersion: 1,
          position: [450, 300]
        }
      ],
      connections: {
        'Gmail Trigger': {
          main: [
            [
              {
                node: 'Is Service Call?',
                type: 'main',
                index: 0
              }
            ]
          ]
        }
      },
      active: false,
      settings: {},
      staticData: {}
    },
    version: '1.0.0',
    is_active: true,
    features: {
      email_categorization: true,
      priority_routing: true,
      team_notifications: true,
      gmail_labeling: true,
      service_call_detection: true,
      sales_lead_routing: true,
      warranty_processing: true
    },
    requirements: {
      gmail_oauth: true,
      team_email_addresses: true,
      business_categories: ['Service Calls', 'Sales Inquiries', 'Parts Orders', 'Warranty Claims']
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
};

// User Test Data
const users = {
  testUser: {
    id: uuidv4(),
    email: 'test@floworx-test.com',
    password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.G', // 'TestPassword123!'
    first_name: 'Test',
    last_name: 'User',
    email_verified: true,
    business_type_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  
  userWithBusinessType: {
    id: uuidv4(),
    email: 'user-with-business@floworx-test.com',
    password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.G',
    first_name: 'Business',
    last_name: 'User',
    email_verified: true,
    business_type_id: 1, // Hot Tub & Spa
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  
  unverifiedUser: {
    id: uuidv4(),
    email: 'unverified@floworx-test.com',
    password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.G',
    first_name: 'Unverified',
    last_name: 'User',
    email_verified: false,
    business_type_id: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
};

// Password Reset Token Test Data
const passwordResetTokens = {
  validToken: {
    id: uuidv4(),
    user_id: users.testUser.id,
    token: 'a'.repeat(64), // 64-character hex string
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
    used: false,
    ip_address: '127.0.0.1',
    user_agent: 'Test Agent',
    created_at: new Date().toISOString()
  },
  
  expiredToken: {
    id: uuidv4(),
    user_id: users.testUser.id,
    token: 'b'.repeat(64),
    expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
    used: false,
    ip_address: '127.0.0.1',
    user_agent: 'Test Agent',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  
  usedToken: {
    id: uuidv4(),
    user_id: users.testUser.id,
    token: 'c'.repeat(64),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    used: true,
    ip_address: '127.0.0.1',
    user_agent: 'Test Agent',
    created_at: new Date().toISOString(),
    used_at: new Date().toISOString()
  }
};

// Onboarding Progress Test Data
const onboardingProgress = {
  welcomeCompleted: {
    user_id: users.testUser.id,
    current_step: 'business-type',
    completed_steps: ['welcome'],
    step_data: {
      welcome: {
        completedAt: '2024-01-01T00:00:00Z'
      }
    },
    google_connected: true,
    workflow_deployed: false,
    onboarding_completed: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  
  businessTypeCompleted: {
    user_id: users.userWithBusinessType.id,
    current_step: 'business-categories',
    completed_steps: ['welcome', 'business-type'],
    step_data: {
      welcome: {
        completedAt: '2024-01-01T00:00:00Z'
      },
      'business-type': {
        businessTypeId: 1,
        businessTypeName: 'Hot Tub & Spa',
        businessTypeSlug: 'hot-tub-spa',
        selectedAt: '2024-01-01T00:00:00Z'
      }
    },
    google_connected: true,
    workflow_deployed: false,
    onboarding_completed: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
};

// API Response Templates
const apiResponses = {
  businessTypes: {
    success: {
      success: true,
      data: [businessTypes.hotTubSpa, businessTypes.electrician]
    },
    
    empty: {
      success: true,
      data: []
    },
    
    error: {
      success: false,
      error: 'Failed to fetch business types',
      message: 'Unable to load available business types'
    }
  },
  
  businessTypeSelection: {
    success: {
      success: true,
      message: 'Business type selected successfully',
      data: {
        businessType: {
          id: 1,
          name: 'Hot Tub & Spa',
          slug: 'hot-tub-spa',
          defaultCategories: businessTypes.hotTubSpa.default_categories
        }
      }
    },
    
    invalidId: {
      success: false,
      error: 'Invalid business type',
      message: 'The selected business type is not available'
    },
    
    validationError: {
      success: false,
      error: 'Validation failed',
      details: [
        {
          msg: 'Valid business type ID is required',
          param: 'businessTypeId',
          location: 'body'
        }
      ]
    }
  },
  
  passwordReset: {
    requestSuccess: {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    },
    
    requestRateLimit: {
      error: 'Too many password reset requests',
      message: 'Please wait 15 minutes before requesting another password reset'
    },
    
    validateSuccess: {
      valid: true,
      message: 'Token is valid'
    },
    
    validateInvalid: {
      valid: false,
      message: 'Invalid or expired token'
    },
    
    resetSuccess: {
      success: true,
      message: 'Password has been reset successfully'
    },
    
    resetInvalidToken: {
      success: false,
      message: 'Invalid or expired token'
    }
  }
};

// Test Utilities
const testUtils = {
  // Generate random test data
  generateUser: (overrides = {}) => ({
    id: uuidv4(),
    email: `test-${Date.now()}@floworx-test.com`,
    password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.PZvO.G',
    first_name: 'Test',
    last_name: 'User',
    email_verified: true,
    business_type_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),
  
  generateBusinessType: (overrides = {}) => ({
    id: Math.floor(Math.random() * 1000) + 100,
    name: `Test Business Type ${Date.now()}`,
    description: 'Test business type for automated testing',
    slug: `test-business-${Date.now()}`,
    is_active: true,
    sort_order: 1,
    default_categories: [
      {
        name: 'Test Category',
        description: 'Test category description',
        priority: 'medium'
      }
    ],
    workflow_template_id: `test-template-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),
  
  generatePasswordResetToken: (userId, overrides = {}) => ({
    id: uuidv4(),
    user_id: userId,
    token: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    used: false,
    ip_address: '127.0.0.1',
    user_agent: 'Test Agent',
    created_at: new Date().toISOString(),
    ...overrides
  }),
  
  // Clean test data
  cleanEmail: (email) => email.trim().toLowerCase(),
  
  // Validate test data
  isValidBusinessType: (businessType) => {
    return businessType &&
           typeof businessType.name === 'string' &&
           typeof businessType.slug === 'string' &&
           Array.isArray(businessType.default_categories);
  },
  
  isValidUser: (user) => {
    return user &&
           typeof user.email === 'string' &&
           typeof user.first_name === 'string' &&
           typeof user.last_name === 'string';
  }
};

module.exports = {
  businessTypes,
  workflowTemplates,
  users,
  passwordResetTokens,
  onboardingProgress,
  apiResponses,
  testUtils
};
