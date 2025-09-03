/**
 * Test Utilities
 * Common helper functions for regression testing
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const testDataFactory = require('./testDataFactory');

class TestUtils {
  constructor() {
    this.app = null;
    this.testDatabase = null;
    this.cleanupTasks = [];
  }

  /**
   * Initialize test utilities with app instance
   */
  initialize(app, database = null) {
    this.app = app;
    this.testDatabase = database;
  }

  /**
   * Create authenticated request with JWT token
   */
  authenticatedRequest(method, endpoint, userData = null) {
    if (!this.app) {
      throw new Error('Test app not initialized. Call initialize() first.');
    }

    const user = userData || testDataFactory.createUser();
    const token = testDataFactory.generateJWTToken({
      userId: user.id,
      email: user.email
    });

    return request(this.app)
      [method.toLowerCase()](endpoint)
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json');
  }

  /**
   * Create unauthenticated request
   */
  unauthenticatedRequest(method, endpoint) {
    if (!this.app) {
      throw new Error('Test app not initialized. Call initialize() first.');
    }

    return request(this.app)
      [method.toLowerCase()](endpoint)
      .set('Content-Type', 'application/json');
  }

  /**
   * Wait for specified duration
   */
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Retry operation with exponential backoff
   */
  async retry(operation, maxAttempts = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          break;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await this.wait(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Assert response structure
   */
  assertResponseStructure(response, expectedStructure) {
    expect(response).toBeDefined();
    expect(response.body).toBeDefined();
    
    if (expectedStructure.success !== undefined) {
      expect(response.body.success).toBe(expectedStructure.success);
    }
    
    if (expectedStructure.data !== undefined) {
      expect(response.body.data).toBeDefined();
      
      if (typeof expectedStructure.data === 'object') {
        Object.keys(expectedStructure.data).forEach(key => {
          expect(response.body.data).toHaveProperty(key);
        });
      }
    }
    
    if (expectedStructure.error !== undefined) {
      expect(response.body.error).toBeDefined();
    }
    
    if (expectedStructure.message !== undefined) {
      expect(response.body.message).toBeDefined();
    }
  }

  /**
   * Assert API error response
   */
  assertErrorResponse(response, expectedStatus, expectedMessage = null) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBeDefined();
    
    if (expectedMessage) {
      expect(response.body.error.message).toContain(expectedMessage);
    }
  }

  /**
   * Assert API success response
   */
  assertSuccessResponse(response, expectedStatus = 200, expectedData = null) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body.success).toBe(true);
    
    if (expectedData) {
      expect(response.body.data).toMatchObject(expectedData);
    }
  }

  /**
   * Mock database query
   */
  mockDatabaseQuery(queryResult, error = null) {
    const mockQuery = jest.fn();
    
    if (error) {
      mockQuery.mockRejectedValue(error);
    } else {
      mockQuery.mockResolvedValue(queryResult);
    }
    
    return mockQuery;
  }

  /**
   * Mock external service
   */
  mockExternalService(serviceName, methods = {}) {
    const mockService = {};
    
    Object.keys(methods).forEach(methodName => {
      mockService[methodName] = jest.fn();
      
      if (methods[methodName].resolves) {
        mockService[methodName].mockResolvedValue(methods[methodName].resolves);
      } else if (methods[methodName].rejects) {
        mockService[methodName].mockRejectedValue(methods[methodName].rejects);
      } else {
        mockService[methodName].mockReturnValue(methods[methodName]);
      }
    });
    
    return mockService;
  }

  /**
   * Create test database transaction
   */
  async createTestTransaction() {
    if (!this.testDatabase) {
      throw new Error('Test database not configured');
    }
    
    // This would create a database transaction for isolated testing
    // Implementation depends on your database setup
    return {
      query: this.mockDatabaseQuery({ rows: [], rowCount: 0 }),
      commit: jest.fn(),
      rollback: jest.fn()
    };
  }

  /**
   * Setup test data in database
   */
  async setupTestData(dataType, data) {
    // This would insert test data into the database
    // For now, we'll simulate it
    const testData = Array.isArray(data) ? data : [data];
    
    this.cleanupTasks.push({
      type: 'database',
      dataType,
      ids: testData.map(item => item.id)
    });
    
    return testData;
  }

  /**
   * Cleanup test data
   */
  async cleanup() {
    for (const task of this.cleanupTasks) {
      try {
        if (task.type === 'database') {
          // This would clean up database test data
          console.log(`Cleaning up ${task.dataType} test data:`, task.ids);
        }
      } catch (error) {
        console.warn(`Cleanup failed for ${task.type}:`, error.message);
      }
    }
    
    this.cleanupTasks = [];
  }

  /**
   * Generate test performance data
   */
  generatePerformanceData(count = 100) {
    const data = [];
    const startTime = Date.now() - (count * 1000); // Spread over last 'count' seconds
    
    for (let i = 0; i < count; i++) {
      data.push({
        timestamp: new Date(startTime + (i * 1000)),
        responseTime: Math.floor(Math.random() * 1000) + 100,
        memoryUsage: Math.floor(Math.random() * 100) + 50,
        cpuUsage: Math.random() * 0.8 + 0.1,
        activeConnections: Math.floor(Math.random() * 20) + 1,
        queryCount: Math.floor(Math.random() * 50) + 10
      });
    }
    
    return data;
  }

  /**
   * Simulate load testing
   */
  async simulateLoad(endpoint, options = {}) {
    const {
      concurrency = 10,
      requests = 100,
      method = 'GET',
      authenticated = true,
      payload = null
    } = options;

    const results = {
      totalRequests: requests,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      responseTimes: []
    };

    const requestPromises = [];
    
    for (let i = 0; i < requests; i++) {
      const requestPromise = this.executeLoadTestRequest(
        endpoint,
        method,
        authenticated,
        payload
      );
      
      requestPromises.push(requestPromise);
      
      // Control concurrency
      if (requestPromises.length >= concurrency) {
        const batchResults = await Promise.allSettled(requestPromises.splice(0, concurrency));
        this.processLoadTestResults(batchResults, results);
      }
    }
    
    // Process remaining requests
    if (requestPromises.length > 0) {
      const batchResults = await Promise.allSettled(requestPromises);
      this.processLoadTestResults(batchResults, results);
    }
    
    // Calculate final statistics
    results.averageResponseTime = results.responseTimes.reduce((sum, time) => sum + time, 0) / results.responseTimes.length;
    results.minResponseTime = Math.min(...results.responseTimes);
    results.maxResponseTime = Math.max(...results.responseTimes);
    
    return results;
  }

  /**
   * Execute single load test request
   */
  async executeLoadTestRequest(endpoint, method, authenticated, payload) {
    const startTime = Date.now();
    
    try {
      let req;
      if (authenticated) {
        req = this.authenticatedRequest(method, endpoint);
      } else {
        req = this.unauthenticatedRequest(method, endpoint);
      }
      
      if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        req = req.send(payload);
      }
      
      const response = await req;
      const responseTime = Date.now() - startTime;
      
      return {
        success: response.status < 400,
        responseTime,
        status: response.status
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        success: false,
        responseTime,
        error: error.message
      };
    }
  }

  /**
   * Process load test results
   */
  processLoadTestResults(batchResults, results) {
    batchResults.forEach(result => {
      if (result.status === 'fulfilled' && result.value.success) {
        results.successfulRequests++;
        results.responseTimes.push(result.value.responseTime);
      } else {
        results.failedRequests++;
      }
    });
  }

  /**
   * Validate JWT token
   */
  validateJWTToken(token, secret = 'test-jwt-secret') {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      throw new Error(`Invalid JWT token: ${error.message}`);
    }
  }

  /**
   * Create mock request object
   */
  createMockRequest(overrides = {}) {
    return {
      method: 'GET',
      url: '/api/test',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer test-token'
      },
      body: {},
      query: {},
      params: {},
      user: testDataFactory.createUser(),
      ...overrides
    };
  }

  /**
   * Create mock response object
   */
  createMockResponse() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
      locals: {}
    };
    
    return res;
  }

  /**
   * Create mock next function
   */
  createMockNext() {
    return jest.fn();
  }

  /**
   * Assert middleware behavior
   */
  async assertMiddleware(middleware, req, res, next, expectedBehavior) {
    await middleware(req, res, next);
    
    if (expectedBehavior.callsNext) {
      expect(next).toHaveBeenCalled();
    }
    
    if (expectedBehavior.setsStatus) {
      expect(res.status).toHaveBeenCalledWith(expectedBehavior.setsStatus);
    }
    
    if (expectedBehavior.sendsResponse) {
      expect(res.json).toHaveBeenCalled();
    }
    
    if (expectedBehavior.modifiesRequest) {
      Object.keys(expectedBehavior.modifiesRequest).forEach(key => {
        expect(req[key]).toEqual(expectedBehavior.modifiesRequest[key]);
      });
    }
  }

  /**
   * Generate test report data
   */
  generateTestReport(testResults) {
    const totalTests = Object.values(testResults).reduce((sum, suite) => sum + (suite.totalTests || 0), 0);
    const passedTests = Object.values(testResults).reduce((sum, suite) => sum + (suite.passedTests || 0), 0);
    const failedTests = Object.values(testResults).reduce((sum, suite) => sum + (suite.failedTests || 0), 0);
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalSuites: Object.keys(testResults).length,
        totalTests,
        passedTests,
        failedTests,
        successRate: totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : '0.00'
      },
      suites: testResults,
      recommendations: this.generateTestRecommendations(testResults)
    };
  }

  /**
   * Generate test recommendations
   */
  generateTestRecommendations(testResults) {
    const recommendations = [];
    
    Object.entries(testResults).forEach(([suiteName, results]) => {
      if (results.failedTests > 0) {
        recommendations.push({
          type: 'failed_tests',
          suite: suiteName,
          message: `${results.failedTests} tests failed in ${suiteName}`,
          priority: 'high'
        });
      }
      
      if (results.coverage && results.coverage < 90) {
        recommendations.push({
          type: 'low_coverage',
          suite: suiteName,
          message: `Coverage is ${results.coverage}% in ${suiteName}`,
          priority: 'medium'
        });
      }
    });
    
    return recommendations;
  }
}

// Export singleton instance
module.exports = new TestUtils();
