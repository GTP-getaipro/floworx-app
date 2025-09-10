/**
 * Security Test Setup
 * Configures security testing environment
 */

// Mock security-related modules
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('salt')
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockReturnValue({ userId: 'test-user-id' }),
  decode: jest.fn().mockReturnValue({ userId: 'test-user-id' })
}));

// Global setup for security tests
beforeAll(() => {
  console.log('🔒 Security test environment configured');
});

// Clean up after each security test
afterEach(() => {
  jest.clearAllMocks();
});
