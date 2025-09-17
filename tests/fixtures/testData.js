/**
 * Test Data Fixtures
 * Centralized test data for all test files
 */

const businessTypes = {
  hotTubSpa: {
    id: 1,
    name: 'Hot Tub & Spa',
    slug: 'hot-tub-spa',
    description: 'Hot tub and spa service businesses',
    is_active: true,
    default_categories: [
      { name: 'Service Calls', priority: 'high', description: 'Emergency repairs and maintenance' },
      { name: 'Sales Inquiries', priority: 'medium', description: 'New customer quotes and consultations' },
      { name: 'Parts Orders', priority: 'low', description: 'Replacement parts and supplies' }
    ],
    workflow_template_id: 'hot-tub-template-v1',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  },
  electrician: {
    id: 2,
    name: 'Electrician',
    slug: 'electrician',
    description: 'Electrical service businesses',
    is_active: true,
    default_categories: [
      { name: 'Emergency Calls', priority: 'high', description: 'Urgent electrical issues' },
      { name: 'Installations', priority: 'medium', description: 'New electrical installations' },
      { name: 'Inspections', priority: 'low', description: 'Electrical safety inspections' }
    ],
    workflow_template_id: 'electrician-template-v1',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  },
  plumber: {
    id: 3,
    name: 'Plumber',
    slug: 'plumber',
    description: 'Plumbing service businesses',
    is_active: true,
    default_categories: [
      { name: 'Emergency Repairs', priority: 'high', description: 'Urgent plumbing repairs' },
      { name: 'Installations', priority: 'medium', description: 'New plumbing installations' },
      { name: 'Maintenance', priority: 'low', description: 'Routine plumbing maintenance' }
    ],
    workflow_template_id: 'plumber-template-v1',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  }
};

const users = {
  validUser: {
    id: 'test-user-1',
    email: 'test@floworx-test.com',
    firstName: 'Test',
    lastName: 'User',
    password: 'TestPassword123!',
    businessName: 'Test Hot Tub Services',
    businessType: 'hot_tub',
    email_verified: true,
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  },
  unverifiedUser: {
    id: 'test-user-2',
    email: 'unverified@floworx-test.com',
    firstName: 'Unverified',
    lastName: 'User',
    password: 'TestPassword123!',
    businessName: 'Unverified Business',
    businessType: 'electrician',
    email_verified: false,
    is_active: true,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z'
  }
};

const passwordResetTokens = {
  validToken: {
    id: 'reset-token-1',
    user_id: 'test-user-1',
    token: 'valid-reset-token-123',
    expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    used: false,
    created_at: '2024-01-01T00:00:00.000Z'
  },
  expiredToken: {
    id: 'reset-token-2',
    user_id: 'test-user-1',
    token: 'expired-reset-token-456',
    expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    used: false,
    created_at: '2024-01-01T00:00:00.000Z'
  }
};

const apiResponses = {
  businessTypesSuccess: {
    success: true,
    data: [businessTypes.hotTubSpa, businessTypes.electrician, businessTypes.plumber],
    message: 'Business types retrieved successfully'
  },
  businessTypesError: {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Failed to retrieve business types'
    }
  },
  loginSuccess: {
    success: true,
    data: {
      userId: 'test-user-1',
      token: 'jwt-token-123'
    },
    message: 'Login successful'
  },
  loginInvalidCredentials: {
    success: false,
    error: {
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password'
    }
  },
  loginUnverified: {
    success: false,
    error: {
      code: 'UNVERIFIED',
      message: 'Email not verified'
    },
    resendUrl: '/api/auth/resend'
  }
};

module.exports = {
  businessTypes,
  users,
  passwordResetTokens,
  apiResponses
};
