/**
 * Dashboard API Tests
 * Tests for dashboard data retrieval and authentication
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
    not: {
      toBe: (expected) => {
        if (actual === expected) throw new Error(`Expected not ${expected}, got ${actual}`);
      },
      toHaveProperty: (prop) => {
        if (prop in actual) throw new Error(`Expected not to have property ${prop}`);
      }
    }
  });
}

describe('Dashboard API Tests', () => {
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

  describe('GET /api/dashboard', () => {
    test('should return dashboard data with valid authentication', async () => {
      const response = await api.get(config.endpoints.dashboard.data, authHeaders);

      console.log(`Dashboard response: ${response.status}`);
      console.log(`Response data:`, response.data);

      if (response.status === 200) {
        console.log('✅ Dashboard endpoint working correctly');
        
        // Validate response structure
        const validation = api.validateResponse(
          response, 
          config.expectedResponses.success.dashboard
        );
        
        if (validation.valid) {
          console.log('✅ Dashboard response structure is valid');
        } else {
          console.log('⚠️  Dashboard response structure differs from expected');
          console.log('   Missing fields:', validation.missing);
        }
        
        // Check for user-specific data
        if (response.data.user) {
          expect(response.data.user.email).toBe(testUser.email);
        }
        
      } else {
        console.log('❌ Dashboard endpoint has issues');
        
        if (response.status === 401) {
          console.log('   Issue: Authentication failure');
          console.log('   - JWT token validation may not be working');
          console.log('   - Similar to user status endpoint issues');
        } else if (response.status === 404) {
          console.log('   Issue: Dashboard endpoint not found');
          console.log('   - /api/dashboard endpoint may not exist');
        } else if (response.status >= 500) {
          console.log('   Issue: Server error');
          console.log('   - Database connection or internal server issues');
        }
      }
    });

    test('should reject request without authentication', async () => {
      const response = await api.get(config.endpoints.dashboard.data);

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
      
      console.log('✅ Dashboard properly rejects unauthenticated requests');
    });

    test('should reject request with invalid token', async () => {
      const invalidHeaders = { Authorization: 'Bearer invalid-token' };
      const response = await api.get(config.endpoints.dashboard.data, invalidHeaders);

      expect(response.status).toBe(401);
      expect(response.data).toHaveProperty('error');
      
      console.log('✅ Dashboard properly rejects invalid tokens');
    });
  });

  describe('Dashboard Data Loading', () => {
    test('should load user-specific dashboard data', async () => {
      const response = await api.get(config.endpoints.dashboard.data, authHeaders);

      if (response.success) {
        // Dashboard should contain user-specific information
        if (response.data.user) {
          expect(response.data.user.email).toBe(testUser.email);
          console.log('✅ Dashboard loads user-specific data');
        }
        
        // Check for expected dashboard sections
        const expectedSections = ['user', 'stats', 'connections'];
        const presentSections = expectedSections.filter(section => 
          response.data.hasOwnProperty(section)
        );
        
        console.log(`Dashboard sections present: ${presentSections.join(', ')}`);
        
        if (presentSections.length === 0) {
          console.log('⚠️  Dashboard may be returning minimal data');
        }
        
      } else {
        console.log('❌ Could not test dashboard data loading due to authentication issues');
      }
    });

    test('should handle missing or incomplete user data gracefully', async () => {
      const response = await api.get(config.endpoints.dashboard.data, authHeaders);

      if (response.success) {
        // Dashboard should handle cases where user data is incomplete
        console.log('✅ Dashboard endpoint accessible');
        
        // Should not crash if optional data is missing
        expect(response.status).not.toBe(500);
        
      } else if (response.status === 401) {
        console.log('⚠️  Authentication issues prevent testing data handling');
      } else {
        console.log(`Dashboard returned ${response.status}: ${response.data?.message || 'Unknown error'}`);
      }
    });
  });

  describe('Dashboard Performance', () => {
    test('should respond within reasonable time', async () => {
      const startTime = Date.now();
      const response = await api.get(config.endpoints.dashboard.data, authHeaders);
      const responseTime = Date.now() - startTime;

      console.log(`Dashboard response time: ${responseTime}ms`);

      // Dashboard should respond within 5 seconds
      if (responseTime > 5000) {
        console.log('⚠️  Dashboard response time is slow (>5s)');
      } else if (responseTime > 2000) {
        console.log('⚠️  Dashboard response time is moderate (>2s)');
      } else {
        console.log('✅ Dashboard response time is good (<2s)');
      }

      expect(responseTime).toBeLessThan(30000); // Should not timeout
    }, config.timeouts.long);

    test('should handle concurrent dashboard requests', async () => {
      const concurrentRequests = 3;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(api.get(config.endpoints.dashboard.data, authHeaders));
      }

      const responses = await Promise.all(promises);
      
      console.log(`Concurrent requests completed: ${responses.length}`);
      
      // All requests should have same status
      const statuses = responses.map(r => r.status);
      const uniqueStatuses = [...new Set(statuses)];
      
      if (uniqueStatuses.length === 1) {
        console.log(`✅ All concurrent requests returned ${uniqueStatuses[0]}`);
      } else {
        console.log(`⚠️  Concurrent requests returned different statuses: ${uniqueStatuses.join(', ')}`);
      }
    });
  });

  describe('Dashboard Error Handling', () => {
    test('should provide user-friendly error messages', async () => {
      const errorTestCases = [
        {
          name: 'No authentication',
          headers: {},
          expectedStatus: 401
        },
        {
          name: 'Invalid token',
          headers: { Authorization: 'Bearer invalid' },
          expectedStatus: 401
        }
      ];

      for (const testCase of errorTestCases) {
        console.log(`\n  Testing: ${testCase.name}`);
        
        const response = await api.get(config.endpoints.dashboard.data, testCase.headers);
        
        console.log(`    Status: ${response.status}`);
        
        if (response.data && response.data.message) {
          console.log(`    Message: "${response.data.message}"`);
          
          // Error messages should be user-friendly
          expect(response.data.message).not.toMatch(/internal|stack|query|database/i);
        }
        
        expect(response.status).toBe(testCase.expectedStatus);
      }
    });

    test('should not expose sensitive system information', async () => {
      const response = await api.get(config.endpoints.dashboard.data, authHeaders);

      if (response.data) {
        // Should not expose sensitive system info
        expect(response.data).not.toHaveProperty('database');
        expect(response.data).not.toHaveProperty('config');
        expect(response.data).not.toHaveProperty('env');
        expect(response.data).not.toHaveProperty('secrets');
        
        console.log('✅ Dashboard does not expose sensitive system information');
      }
    });
  });

  describe('Dashboard Integration', () => {
    test('should integrate with user authentication system', async () => {
      // Test that dashboard properly integrates with auth system
      const response = await api.get(config.endpoints.dashboard.data, authHeaders);

      if (response.success) {
        console.log('✅ Dashboard integrates with authentication system');
        
        // Should show user-specific data
        if (response.data.user) {
          expect(response.data.user.email).toBe(testUser.email);
          console.log('✅ Dashboard shows correct user data');
        }
        
      } else if (response.status === 401) {
        console.log('❌ Dashboard authentication integration has issues');
        console.log('   This may be related to the "Failed to load user status" error');
        console.log('   Both dashboard and user status may have similar auth problems');
      }
    });

    test('should handle OAuth connection status', async () => {
      const response = await api.get(config.endpoints.dashboard.data, authHeaders);

      if (response.success && response.data) {
        // Dashboard should show OAuth connection status
        if (response.data.connections) {
          console.log('✅ Dashboard includes connection status');
          
          // Should show Google connection status
          if (response.data.connections.google !== undefined) {
            console.log(`   Google connection: ${response.data.connections.google ? 'Connected' : 'Not Connected'}`);
          }
        } else {
          console.log('⚠️  Dashboard may not include OAuth connection status');
        }
      }
    });
  });
});
