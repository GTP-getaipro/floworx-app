/**
 * API Test Suite Integration Tests
 * Validates that all API test files are properly configured and executable
 */

const path = require('path');
const fs = require('fs');
const axios = require('axios');

// Test configuration
const config = require('./setup/test-config');

describe('API Test Suite Integration', () => {
  let apiClient;
  let testResults;

  beforeAll(async () => {
    // Setup API client for testing
    apiClient = axios.create({
      baseURL: config.current.baseURL,
      timeout: 10000,
      validateStatus: () => true
    });

    testResults = {
      startTime: new Date(),
      environment: config.current.name,
      baseURL: config.current.baseURL,
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        errors: []
      }
    };
  }, 30000);

  describe('API Test Files Validation', () => {
    const testFiles = [
      './system.test.js',      // Run system tests first
      './auth.test.js',        // Authentication tests
      './oauth.test.js',       // OAuth tests
      './user.test.js',        // User management tests
      './dashboard.test.js',   // Dashboard tests
      './integration.test.js'  // Integration tests last
    ];

    test.each(testFiles)('should have valid test file: %s', (testFile) => {
      const fullPath = path.join(__dirname, testFile);
      expect(fs.existsSync(fullPath)).toBe(true);

      // Validate file can be required without syntax errors
      expect(() => {
        require(fullPath);
      }).not.toThrow();
    });

    test('should have all required test files present', () => {
      const missingFiles = testFiles.filter(file => {
        const fullPath = path.join(__dirname, file);
        return !fs.existsSync(fullPath);
      });

      expect(missingFiles).toHaveLength(0);
    });
  });

  describe('API Endpoint Connectivity', () => {
    test('should connect to API base URL', async () => {
      const response = await apiClient.get('/health');
      expect([200, 404]).toContain(response.status); // 404 is acceptable if health endpoint doesn't exist
    });

    test('should handle API authentication endpoints', async () => {
      const response = await apiClient.post('/auth/login', {
        email: 'test@example.com',
        password: 'invalid'
      });
      expect([400, 401, 422]).toContain(response.status); // Should reject invalid credentials
    });

    test('should validate API response format', async () => {
      const response = await apiClient.get('/auth/profile');
      expect(response.data).toBeDefined();

      if (response.status === 200) {
        expect(response.data).toHaveProperty('success');
      }
    });
  });

  describe('Test Configuration Validation', () => {
    test('should have valid test configuration', () => {
      expect(config).toBeDefined();
      expect(config.current).toBeDefined();
      expect(config.current.baseURL).toBeDefined();
      expect(config.current.name).toBeDefined();
    });

    test('should have test data configuration', () => {
      expect(config.current.testData).toBeDefined();
    });
  });

  afterAll(async () => {
    testResults.endTime = new Date();
    const duration = testResults.endTime - testResults.startTime;

    console.log('\n📊 API Test Suite Integration Results');
    console.log(`Environment: ${testResults.environment}`);
    console.log(`Base URL: ${testResults.baseURL}`);
    console.log(`Duration: ${duration}ms`);
  });
});


