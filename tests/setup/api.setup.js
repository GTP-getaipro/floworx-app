/**
 * API Test Setup
 * Configures API testing environment and mocks
 */

const request = require('supertest');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

// Mock external services for API tests
jest.mock('../../backend/services/emailService', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
  sendVerificationEmail: jest.fn().mockResolvedValue(true),
  sendOnboardingReminder: jest.fn().mockResolvedValue(true)
}));

jest.mock('../../backend/services/n8nService', () => ({
  createWorkflowFromTemplate: jest.fn().mockResolvedValue({
    workflowId: 'test-workflow-123',
    webhookUrl: 'https://test-webhook.com/webhook'
  }),
  deployWorkflow: jest.fn().mockResolvedValue(true)
}));

// Mock Supabase client for API tests
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      limit: jest.fn().mockReturnThis()
    })),
    rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
    auth: {
      admin: {
        createUser: jest.fn().mockResolvedValue({ 
          data: { user: { id: 'test-user-id' } }, 
          error: null 
        }),
        deleteUser: jest.fn().mockResolvedValue({ error: null })
      }
    }
  }))
}));

// Global setup for API tests
beforeAll(() => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret';
  
  console.log('🔌 API test environment configured');
});

// Clean up after each API test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
});

// Export test utilities
module.exports = {
  request,
  testConfig: {
    apiUrl: process.env.API_URL || 'http://localhost:3001',
    jwtSecret: process.env.JWT_SECRET || 'test-jwt-secret'
  }
};
