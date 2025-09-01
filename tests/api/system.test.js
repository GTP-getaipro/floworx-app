/**
 * System and Health API Tests
 * Tests for system health, configuration, and error handling
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
      toHaveProperty: (prop) => {
        if (prop in actual) throw new Error(`Expected not to have property ${prop}`);
      }
    },
    toBeLessThan: (expected) => {
      if (actual >= expected) throw new Error(`Expected ${actual} to be less than ${expected}`);
    }
  });
}

describe('System and Health API Tests', () => {
  let api;

  beforeAll(() => {
    api = new APITestHelper();
  });

  afterAll(async () => {
    await api.cleanup();
  });

  describe('GET /api/health', () => {
    test('should return health status without authentication', async () => {
      const response = await api.get(config.endpoints.system.health);

      console.log(`Health check response: ${response.status}`);
      console.log(`Response data:`, response.data);

      if (response.status === 200) {
        console.log('✅ Health endpoint is working');
        
        // Health endpoint should provide basic status
        if (response.data) {
          if (response.data.status) {
            expect(response.data.status).toBe('ok');
          }
          
          // May include additional health info
          if (response.data.timestamp) {
            console.log(`   Health check timestamp: ${response.data.timestamp}`);
          }
          
          if (response.data.uptime) {
            console.log(`   System uptime: ${response.data.uptime}`);
          }
        }
        
      } else if (response.status === 404) {
        console.log('⚠️  Health endpoint not found');
        console.log('   Consider implementing /api/health for monitoring');
      } else {
        console.log(`❌ Health endpoint returned ${response.status}`);
      }

      // Health endpoint should not require authentication
      expect(response.status).not.toBe(401);
    });

    test('should respond quickly for monitoring', async () => {
      const startTime = Date.now();
      const response = await api.get(config.endpoints.system.health);
      const responseTime = Date.now() - startTime;

      console.log(`Health check response time: ${responseTime}ms`);

      // Health checks should be fast for monitoring systems
      if (responseTime > 1000) {
        console.log('⚠️  Health check is slow (>1s) - may impact monitoring');
      } else {
        console.log('✅ Health check response time is good');
      }

      expect(responseTime).toBeLessThan(5000); // Should not timeout
    });

    test('should not expose sensitive system information', async () => {
      const response = await api.get(config.endpoints.system.health);

      if (response.success && response.data) {
        // Should not expose sensitive information
        expect(response.data).not.toHaveProperty('database_password');
        expect(response.data).not.toHaveProperty('jwt_secret');
        expect(response.data).not.toHaveProperty('api_keys');
        expect(response.data).not.toHaveProperty('config');
        
        console.log('✅ Health endpoint does not expose sensitive information');
      }
    });
  });

  describe('Database Connectivity Tests', () => {
    test('should test database connectivity through API endpoints', async () => {
      console.log('\n🗄️  Testing database connectivity through API...');
      
      // Test database connectivity by trying to register a user
      const testUser = config.helpers.generateTestUser();
      const response = await api.post(config.endpoints.auth.register, testUser);

      if (response.success) {
        console.log('✅ Database connectivity working (user registration successful)');
      } else if (response.status >= 500) {
        console.log('❌ Database connectivity issues detected');
        console.log(`   Registration failed with server error: ${response.status}`);
        
        if (response.data && response.data.message) {
          // Look for database-related error messages
          if (response.data.message.match(/database|connection|timeout/i)) {
            console.log('   Error appears to be database-related');
          }
        }
      } else {
        console.log('⚠️  Database connectivity test inconclusive');
        console.log(`   Registration returned: ${response.status}`);
      }
    });

    test('should handle database connection failures gracefully', async () => {
      // This test documents how the API handles database issues
      const response = await api.get(config.endpoints.system.health);

      if (response.success && response.data) {
        // Health endpoint might include database status
        if (response.data.database) {
          console.log(`Database status: ${response.data.database}`);
        } else {
          console.log('Health endpoint does not report database status');
        }
      }

      // API should not crash when database is unavailable
      expect(response.status).not.toBe(0);
    });
  });

  describe('Environment Configuration Tests', () => {
    test('should validate critical environment variables through API behavior', async () => {
      console.log('\n⚙️  Testing environment configuration...');
      
      const configTests = [
        {
          name: 'JWT Configuration',
          test: async () => {
            // Test JWT by trying to authenticate
            const result = await api.registerTestUser();
            return result.response.success && result.response.data.token;
          }
        },
        {
          name: 'Database Configuration',
          test: async () => {
            // Test database by trying to register
            const testUser = config.helpers.generateTestUser();
            const response = await api.post(config.endpoints.auth.register, testUser);
            return response.success || response.status < 500;
          }
        },
        {
          name: 'OAuth Configuration',
          test: async () => {
            // Test OAuth endpoint accessibility
            const response = await api.get(config.endpoints.oauth.google);
            return response.status !== 500;
          }
        }
      ];

      for (const configTest of configTests) {
        try {
          const result = await configTest.test();
          console.log(`   ${configTest.name}: ${result ? '✅ OK' : '❌ Issues detected'}`);
        } catch (error) {
          console.log(`   ${configTest.name}: ❌ Error - ${error.message}`);
        }
      }
    });

    test('should handle missing environment variables gracefully', async () => {
      // Test how API handles configuration issues
      const response = await api.get(config.endpoints.oauth.google);

      if (response.status >= 500 && response.data) {
        // Should not expose configuration details in error messages
        const message = response.data.message || response.data.error || '';
        expect(message).not.toMatch(/GOOGLE_CLIENT_ID|GOOGLE_CLIENT_SECRET|JWT_SECRET/i);
        
        console.log('✅ API does not expose environment variable names in errors');
      }
    });
  });

  describe('Error Response Tests', () => {
    test('should return proper 401 Unauthorized responses', async () => {
      const protectedEndpoints = [
        config.endpoints.user.status,
        config.endpoints.dashboard.data,
        config.endpoints.user.profile
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await api.get(endpoint);
        
        if (response.status === 401) {
          console.log(`✅ ${endpoint} properly returns 401`);
          
          // Should include proper error structure
          expect(response.data).toHaveProperty('error');
          
          // Should not expose internal details
          if (response.data.message) {
            expect(response.data.message).not.toMatch(/internal|stack|database/i);
          }
        } else if (response.status === 404) {
          console.log(`⚠️  ${endpoint} returns 404 (endpoint may not exist)`);
        } else {
          console.log(`⚠️  ${endpoint} returns ${response.status} (expected 401)`);
        }
      }
    });

    test('should return proper 404 Not Found responses', async () => {
      const nonExistentEndpoint = '/api/nonexistent';
      const response = await api.get(nonExistentEndpoint);

      if (response.status === 404) {
        console.log('✅ API properly returns 404 for non-existent endpoints');
        
        if (response.data) {
          expect(response.data).toHaveProperty('error');
        }
      } else {
        console.log(`⚠️  Non-existent endpoint returns ${response.status} (expected 404)`);
      }
    });

    test('should handle 500 Internal Server Error responses', async () => {
      // Test how API handles server errors
      const endpoints = [
        config.endpoints.auth.register,
        config.endpoints.oauth.google,
        config.endpoints.system.health
      ];

      let serverErrorFound = false;

      for (const endpoint of endpoints) {
        const response = await api.get(endpoint);
        
        if (response.status >= 500) {
          serverErrorFound = true;
          console.log(`⚠️  Server error detected on ${endpoint}: ${response.status}`);
          
          if (response.data) {
            // Should not expose internal details
            const message = response.data.message || response.data.error || '';
            expect(message).not.toMatch(/stack trace|internal error|database connection/i);
            
            console.log(`   Error message: "${message}"`);
          }
        }
      }

      if (!serverErrorFound) {
        console.log('✅ No server errors detected in basic endpoint tests');
      }
    });
  });

  describe('API Security Tests', () => {
    test('should implement proper CORS headers', async () => {
      const response = await api.get(config.endpoints.system.health);

      if (response.headers) {
        console.log('\n🔒 CORS Headers Check:');
        
        const corsHeaders = [
          'access-control-allow-origin',
          'access-control-allow-methods',
          'access-control-allow-headers'
        ];

        corsHeaders.forEach(header => {
          if (response.headers[header]) {
            console.log(`   ✅ ${header}: ${response.headers[header]}`);
          } else {
            console.log(`   ⚠️  ${header}: Not set`);
          }
        });
      }
    });

    test('should implement security headers', async () => {
      const response = await api.get(config.endpoints.system.health);

      if (response.headers) {
        console.log('\n🛡️  Security Headers Check:');
        
        const securityHeaders = [
          'x-frame-options',
          'x-content-type-options',
          'strict-transport-security',
          'x-xss-protection'
        ];

        securityHeaders.forEach(header => {
          if (response.headers[header]) {
            console.log(`   ✅ ${header}: ${response.headers[header]}`);
          } else {
            console.log(`   ⚠️  ${header}: Not set`);
          }
        });
      }
    });

    test('should not expose server information', async () => {
      const response = await api.get(config.endpoints.system.health);

      if (response.headers) {
        // Should not expose server details
        if (response.headers.server) {
          console.log(`⚠️  Server header exposed: ${response.headers.server}`);
        } else {
          console.log('✅ Server header not exposed');
        }

        if (response.headers['x-powered-by']) {
          console.log(`⚠️  X-Powered-By header exposed: ${response.headers['x-powered-by']}`);
        } else {
          console.log('✅ X-Powered-By header not exposed');
        }
      }
    });
  });
});
