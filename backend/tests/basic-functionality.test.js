/**
 * Basic Functionality Tests
 * Simple tests to verify the test environment is working
 */

const testDataFactory = require('./helpers/testDataFactory');
const testUtils = require('./helpers/testUtils');

describe('Basic Functionality Tests', () => {
  describe('Test Environment', () => {
    test('should have correct environment variables set', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.ENCRYPTION_KEY).toBeDefined();
    });

    test('should have test utilities available', () => {
      expect(testDataFactory).toBeDefined();
      expect(testUtils).toBeDefined();
      expect(typeof testDataFactory.createUser).toBe('function');
    });
  });

  describe('Test Data Factory', () => {
    test('should create valid user data', () => {
      const user = testDataFactory.createUser();
      
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('password');
      expect(user).toHaveProperty('firstName');
      expect(user).toHaveProperty('lastName');
      expect(user.email).toContain('@');
      expect(user.email).toContain('floworx-test.com');
    });

    test('should create user with custom overrides', () => {
      const customEmail = 'custom@test.com';
      const user = testDataFactory.createUser({ email: customEmail });
      
      expect(user.email).toBe(customEmail);
      expect(user).toHaveProperty('firstName');
      expect(user).toHaveProperty('lastName');
    });

    test('should create credential data', () => {
      const credential = testDataFactory.createCredential();
      
      expect(credential).toHaveProperty('id');
      expect(credential).toHaveProperty('userId');
      expect(credential).toHaveProperty('serviceName');
      expect(credential).toHaveProperty('accessToken');
      expect(credential).toHaveProperty('refreshToken');
      expect(credential.serviceName).toBe('google');
    });

    test('should create workflow deployment data', () => {
      const workflow = testDataFactory.createWorkflowDeployment();
      
      expect(workflow).toHaveProperty('id');
      expect(workflow).toHaveProperty('userId');
      expect(workflow).toHaveProperty('workflowId');
      expect(workflow).toHaveProperty('status');
      expect(workflow).toHaveProperty('configuration');
      expect(workflow.status).toBe('active');
    });

    test('should create batch data', () => {
      const users = testDataFactory.createBatch('users', 5);
      
      expect(Array.isArray(users)).toBe(true);
      expect(users).toHaveLength(5);
      users.forEach(user => {
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('firstName');
      });
    });

    test('should create test scenarios', () => {
      const scenario = testDataFactory.createTestScenario('complete_onboarding');
      
      expect(scenario).toHaveProperty('user');
      expect(scenario).toHaveProperty('session');
      expect(scenario).toHaveProperty('credential');
      expect(scenario).toHaveProperty('workflow');
      expect(scenario.session.isCompleted).toBe(true);
    });
  });

  describe('Test Utilities', () => {
    test('should generate JWT tokens', () => {
      const token = testDataFactory.generateJWTToken();
      
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    test('should validate JWT tokens', () => {
      const payload = { userId: 'test-123', email: 'test@example.com' };
      const token = testDataFactory.generateJWTToken(payload);
      
      const decoded = testUtils.validateJWTToken(token);
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
    });

    test('should create mock request objects', () => {
      const req = testUtils.createMockRequest({
        method: 'POST',
        url: '/api/test',
        body: { test: 'data' }
      });
      
      expect(req.method).toBe('POST');
      expect(req.url).toBe('/api/test');
      expect(req.body.test).toBe('data');
      expect(req).toHaveProperty('headers');
      expect(req).toHaveProperty('user');
    });

    test('should create mock response objects', () => {
      const res = testUtils.createMockResponse();
      
      expect(typeof res.status).toBe('function');
      expect(typeof res.json).toBe('function');
      expect(typeof res.send).toBe('function');
      expect(res.status).toHaveBeenCalledTimes(0);
    });

    test('should generate performance data', () => {
      const performanceData = testUtils.generatePerformanceData(10);
      
      expect(Array.isArray(performanceData)).toBe(true);
      expect(performanceData).toHaveLength(10);
      performanceData.forEach(data => {
        expect(data).toHaveProperty('timestamp');
        expect(data).toHaveProperty('responseTime');
        expect(data).toHaveProperty('memoryUsage');
        expect(data).toHaveProperty('cpuUsage');
        expect(typeof data.responseTime).toBe('number');
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid JWT tokens', () => {
      expect(() => {
        testUtils.validateJWTToken('invalid-token');
      }).toThrow('Invalid JWT token');
    });

    test('should handle unknown test scenarios', () => {
      expect(() => {
        testDataFactory.createTestScenario('unknown-scenario');
      }).toThrow('Unknown test scenario');
    });

    test('should handle unknown entity types in batch creation', () => {
      expect(() => {
        testDataFactory.createBatch('unknown-entity', 5);
      }).toThrow('Unknown entity type');
    });
  });

  describe('Data Consistency', () => {
    test('should generate unique IDs for different entities', () => {
      const user1 = testDataFactory.createUser();
      const user2 = testDataFactory.createUser();
      
      expect(user1.id).not.toBe(user2.id);
      expect(user1.email).not.toBe(user2.email);
    });

    test('should maintain sequence counters', () => {
      // Reset sequences to ensure clean state
      testDataFactory.resetSequences();
      
      const user1 = testDataFactory.createUser();
      const user2 = testDataFactory.createUser();
      
      expect(user1.id).toBe('test-user-1');
      expect(user2.id).toBe('test-user-2');
    });

    test('should create related entities with consistent IDs', () => {
      const user = testDataFactory.createUser();
      const credential = testDataFactory.createCredential({ userId: user.id });
      const workflow = testDataFactory.createWorkflowDeployment({ userId: user.id });
      
      expect(credential.userId).toBe(user.id);
      expect(workflow.userId).toBe(user.id);
    });
  });

  describe('Performance', () => {
    test('should create test data efficiently', () => {
      const startTime = Date.now();
      
      // Create a large batch of test data
      const users = testDataFactory.createBatch('users', 100);
      
      const duration = Date.now() - startTime;
      
      expect(users).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle concurrent test data creation', async () => {
      const promises = Array(10).fill().map(() => 
        Promise.resolve(testDataFactory.createUser())
      );
      
      const users = await Promise.all(promises);
      
      expect(users).toHaveLength(10);
      
      // All users should have unique IDs
      const ids = users.map(user => user.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds).toHaveLength(10);
    });
  });
});
