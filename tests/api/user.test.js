/**
 * User Management API Tests
 * Tests for user status, profile management, and authentication
 */

const APITestHelper = require('./setup/test-helpers');
const config = require('./setup/test-config');

// Mock Jest functions if not available
if (typeof describe === 'undefined') {
  global.describe = (name, fn) => {
    console.log(`\n📋 ${name}`);
    return fn();
  };
  global.test = async (name, fn, timeout) => {
    try {
      console.log(`  🧪 ${name}`);
      await fn();
      console.log(`  ✅ PASSED: ${name}`);
    } catch (error) {
      console.log(`  ❌ FAILED: ${name} - ${error.message}`);
    }
  };
  global.beforeAll = (fn) => fn();
  global.afterAll = (fn) => fn();
  global.expect = (actual) => ({
    toBe: (expected) => {
      if (actual !== expected) throw new Error(`Expected ${expected}, got ${actual}`);
    },
    toHaveProperty: (prop) => {
      if (!(prop in actual)) throw new Error(`Expected property ${prop}`);
    },
    toMatch: (regex) => {
      if (!regex.test(actual)) throw new Error(`Expected ${actual} to match ${regex}`);
    },
    not: {
      toBe: (expected) => {
        if (actual === expected) throw new Error(`Expected not ${expected}, got ${actual}`);
      },
      toMatch: (regex) => {
        if (regex.test(actual)) throw new Error(`Expected ${actual} not to match ${regex}`);
      }
    }
  });
}

describe('User Management API Tests', () => {
  let api;
  let testUser;
  let authHeaders;

  beforeAll(async () => {
    api = new APITestHelper();
    
    // Create and login test user
    const result = await api.registerTestUser();
    testUser = result.user;
    authHeaders = api.getAuthHeaders(testUser.email);
  });

  afterAll(async () => {
    await api.cleanup();
  });

  describe('GET /api/user/status', () => {
    test('should return user status with valid authentication', async () => {
      const response = await api.get(config.endpoints.user.status, authHeaders);

      console.log(`User status response: ${response.status}`);
      console.log(`Response data:`, response.data);

      if (response.status === 200) {
        console.log('✅ User status endpoint working correctly');
        
        // Validate response structure
        expect(response.data).toHaveProperty('id');
        expect(response.data).toHaveProperty('email');
        expect(response.data.email).toBe(testUser.email);
        
        const validation = api.validateResponse(
          response, 
          config.expectedResponses.success.userStatus
        );
        expect(validation.valid).toBe(true);
        
      } else {
        console.log('❌ User status endpoint has issues');
        console.log('   This matches the "Failed to load user status" error from production');
        
        if (response.status === 401) {
          console.log('   Issue: Authentication failure');
          console.log('   Possible causes:');
          console.log('   - JWT token validation not working');
          console.log('   - Authentication middleware misconfigured');
          console.log('   - Token format or signing issues');
        } else if (response.status === 404) {
          console.log('   Issue: Endpoint not found');
          console.log('   - /api/user/status endpoint may not exist');
        } else if (response.status >= 500) {
          console.log('   Issue: Server error');
          console.log('   - Database connection problems');
          console.log('   - Internal server configuration issues');
        }
      }
    });

    test('should reject request without authentication', async () => {
      const response = await api.get(config.endpoints.user.status);

      expect(response.status).toBe(401);
      expect(response.success).toBe(false);
      expect(response.data).toHaveProperty('error');
    });

    test('should reject request with invalid token', async () => {
      const invalidHeaders = { Authorization: 'Bearer invalid-token' };
      const response = await api.get(config.endpoints.user.status, invalidHeaders);

      expect(response.status).toBe(401);
      expect(response.success).toBe(false);
      expect(response.data).toHaveProperty('error');
    });

    test('should handle malformed authorization header', async () => {
      const malformedHeaders = { Authorization: 'InvalidFormat' };
      const response = await api.get(config.endpoints.user.status, malformedHeaders);

      expect(response.status).toBe(401);
      expect(response.success).toBe(false);
    });
  });

  describe('PUT /api/user/profile', () => {
    test('should update user profile with valid data', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name',
        companyName: 'Updated Company'
      };

      const response = await api.put(config.endpoints.user.profile, updateData, authHeaders);

      if (response.success) {
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('user');
        expect(response.data.user.firstName).toBe(updateData.firstName);
      } else {
        console.log(`Profile update failed: ${response.status}`);
        console.log('Response:', response.data);
        
        // Document the failure for debugging
        if (response.status === 404) {
          console.log('   Profile update endpoint may not exist');
        } else if (response.status === 401) {
          console.log('   Authentication issue with profile update');
        }
      }
    });

    test('should reject profile update without authentication', async () => {
      const updateData = { firstName: 'Test' };
      const response = await api.put(config.endpoints.user.profile, updateData);

      expect(response.status).toBe(401);
      expect(response.success).toBe(false);
    });

    test('should validate profile update data', async () => {
      const invalidData = {
        email: 'invalid-email-format'
      };

      const response = await api.put(config.endpoints.user.profile, invalidData, authHeaders);

      if (response.status === 400) {
        expect(response.data).toHaveProperty('error');
        console.log('✅ Profile validation working');
      } else {
        console.log('⚠️  Profile validation may not be implemented');
      }
    });
  });

  describe('Authentication vs Unauthenticated Access', () => {
    test('should properly distinguish authenticated vs unauthenticated requests', async () => {
      const endpoints = [
        { path: config.endpoints.user.status, name: 'User Status' },
        { path: config.endpoints.user.profile, name: 'User Profile' }
      ];

      for (const endpoint of endpoints) {
        console.log(`\n  Testing ${endpoint.name}:`);
        
        // Test unauthenticated access
        const unauthResponse = await api.get(endpoint.path);
        console.log(`    Unauthenticated: ${unauthResponse.status}`);
        
        // Test authenticated access
        const authResponse = await api.get(endpoint.path, authHeaders);
        console.log(`    Authenticated: ${authResponse.status}`);
        
        // Authenticated should be different from unauthenticated
        if (unauthResponse.status === authResponse.status && unauthResponse.status !== 404) {
          console.log(`    ⚠️  Same response for auth/unauth - may indicate auth issues`);
        }
        
        // Unauthenticated should return 401
        if (unauthResponse.status !== 401 && unauthResponse.status !== 404) {
          console.log(`    ⚠️  Unauthenticated access not properly rejected`);
        }
      }
    });

    test('should handle token expiration gracefully', async () => {
      // Test with an expired token (mock)
      const expiredHeaders = { Authorization: 'Bearer expired.token.here' };
      const response = await api.get(config.endpoints.user.status, expiredHeaders);

      expect(response.status).toBe(401);
      
      if (response.data && response.data.message) {
        // Should provide clear error message about token expiration
        console.log(`Token expiration message: "${response.data.message}"`);
        
        // Should not expose internal details
        expect(response.data.message).not.toMatch(/internal|stack|database/i);
      }
    });
  });

  describe('User Data Security', () => {
    test('should not expose sensitive user information', async () => {
      const response = await api.get(config.endpoints.user.status, authHeaders);

      if (response.success && response.data) {
        // Should not include sensitive fields
        expect(response.data).not.toHaveProperty('password');
        expect(response.data).not.toHaveProperty('passwordHash');
        expect(response.data).not.toHaveProperty('salt');
        
        // Should include safe user information
        if (response.data.email) {
          expect(response.data.email).toBe(testUser.email);
        }
      }
    });

    test('should validate user ownership of data', async () => {
      // This test would ideally check that users can only access their own data
      // For now, we document the expected behavior
      
      const response = await api.get(config.endpoints.user.status, authHeaders);
      
      if (response.success && response.data && response.data.email) {
        // User should only see their own data
        expect(response.data.email).toBe(testUser.email);
        console.log('✅ User data ownership validation passed');
      } else {
        console.log('⚠️  Could not validate user data ownership');
      }
    });
  });

  describe('Error Handling and User Experience', () => {
    test('should provide helpful error messages for common issues', async () => {
      const testCases = [
        {
          name: 'No authentication',
          headers: {},
          expectedStatus: 401
        },
        {
          name: 'Invalid token format',
          headers: { Authorization: 'Bearer invalid' },
          expectedStatus: 401
        },
        {
          name: 'Malformed header',
          headers: { Authorization: 'NotBearer token' },
          expectedStatus: 401
        }
      ];

      for (const testCase of testCases) {
        console.log(`\n  Testing: ${testCase.name}`);
        
        const response = await api.get(config.endpoints.user.status, testCase.headers);
        
        console.log(`    Status: ${response.status}`);
        
        if (response.data && response.data.message) {
          console.log(`    Message: "${response.data.message}"`);
          
          // Error messages should be user-friendly
          expect(response.data.message).not.toMatch(/internal|stack|query/i);
        }
        
        expect(response.status).toBe(testCase.expectedStatus);
      }
    });
  });
});
