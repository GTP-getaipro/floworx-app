/**
 * API Test Helpers
 * Utility functions for API testing
 */

const axios = require('axios');
const config = require('./test-config');

class APITestHelper {
  constructor() {
    this.baseURL = config.current.baseURL;
    this.testTokens = new Map(); // Store tokens for cleanup
    this.testUsers = new Set(); // Track created test users
  }

  /**
   * Make HTTP request with proper error handling
   */
  async makeRequest(method, endpoint, data = null, headers = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await axios({
        method,
        url,
        data,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: config.timeouts.medium,
        validateStatus: () => true // Don't throw on HTTP error status
      });

      return {
        status: response.status,
        data: response.data,
        headers: response.headers,
        success: response.status >= 200 && response.status < 300
      };
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to API at ${url}. Is the server running?`);
      }
      
      return {
        status: 0,
        data: { error: error.message },
        headers: {},
        success: false,
        networkError: true
      };
    }
  }

  /**
   * GET request
   */
  async get(endpoint, headers = {}) {
    return this.makeRequest('GET', endpoint, null, headers);
  }

  /**
   * POST request
   */
  async post(endpoint, data, headers = {}) {
    return this.makeRequest('POST', endpoint, data, headers);
  }

  /**
   * PUT request
   */
  async put(endpoint, data, headers = {}) {
    return this.makeRequest('PUT', endpoint, data, headers);
  }

  /**
   * DELETE request
   */
  async delete(endpoint, headers = {}) {
    return this.makeRequest('DELETE', endpoint, null, headers);
  }

  /**
   * Register a test user
   */
  async registerTestUser(userData = null) {
    const user = userData || config.helpers.generateTestUser();
    const response = await this.post(config.endpoints.auth.register, user);
    
    if (response.success && response.data.token) {
      this.testTokens.set(user.email, response.data.token);
      this.testUsers.add(user.email);
    }
    
    return { response, user };
  }

  /**
   * Login test user
   */
  async loginTestUser(email, password) {
    const response = await this.post(config.endpoints.auth.login, {
      email,
      password
    });
    
    if (response.success && response.data.token) {
      this.testTokens.set(email, response.data.token);
    }
    
    return response;
  }

  /**
   * Get authorization headers for test user
   */
  getAuthHeaders(email) {
    const token = this.testTokens.get(email);
    return token ? config.helpers.getAuthHeader(token) : {};
  }

  /**
   * Test API endpoint accessibility
   */
  async testEndpointAccessibility(endpoint, method = 'GET') {
    const response = await this.makeRequest(method, endpoint);
    
    return {
      accessible: !response.networkError,
      status: response.status,
      responseTime: response.headers['x-response-time'] || 'unknown'
    };
  }

  /**
   * Validate response structure
   */
  validateResponse(response, expectedFields) {
    if (!response.success) {
      return {
        valid: false,
        error: 'Request failed',
        status: response.status
      };
    }

    const validation = config.helpers.validateResponseStructure(
      response.data, 
      expectedFields
    );

    return {
      valid: validation.valid,
      missing: validation.missing,
      data: response.data
    };
  }

  /**
   * Test authentication requirement
   */
  async testAuthRequired(endpoint, method = 'GET', data = null) {
    // Test without authentication
    const unauthResponse = await this.makeRequest(method, endpoint, data);
    
    // Test with invalid token
    const invalidAuthResponse = await this.makeRequest(
      method, 
      endpoint, 
      data, 
      { Authorization: 'Bearer invalid-token' }
    );

    return {
      unauthenticated: {
        status: unauthResponse.status,
        requiresAuth: unauthResponse.status === 401
      },
      invalidToken: {
        status: invalidAuthResponse.status,
        rejectsInvalid: invalidAuthResponse.status === 401
      }
    };
  }

  /**
   * Test rate limiting
   */
  async testRateLimit(endpoint, requests = 10, timeWindow = 1000) {
    const results = [];
    const startTime = Date.now();

    for (let i = 0; i < requests; i++) {
      const response = await this.get(endpoint);
      results.push({
        request: i + 1,
        status: response.status,
        timestamp: Date.now() - startTime
      });

      // Small delay to avoid overwhelming
      await config.helpers.wait(timeWindow / requests);
    }

    const rateLimited = results.filter(r => r.status === 429);
    
    return {
      totalRequests: requests,
      rateLimitedRequests: rateLimited.length,
      rateLimitTriggered: rateLimited.length > 0,
      results
    };
  }

  /**
   * Clean up test data
   */
  async cleanup() {
    const cleanupResults = {
      tokensCleared: 0,
      usersTracked: 0,
      errors: []
    };

    try {
      // Clear stored tokens
      cleanupResults.tokensCleared = this.testTokens.size;
      this.testTokens.clear();

      // Track users for potential cleanup
      cleanupResults.usersTracked = this.testUsers.size;
      
      // Note: Actual user deletion would require admin API endpoints
      // For now, we just track them for manual cleanup if needed
      
      this.testUsers.clear();
      
    } catch (error) {
      cleanupResults.errors.push(error.message);
    }

    return cleanupResults;
  }

  /**
   * Generate test report data
   */
  generateReportData(testResults) {
    const summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    const processResults = (results) => {
      if (Array.isArray(results)) {
        results.forEach(processResults);
      } else if (results && typeof results === 'object') {
        if ('passed' in results) {
          summary.total++;
          if (results.passed) {
            summary.passed++;
          } else {
            summary.failed++;
            if (results.error) {
              summary.errors.push(results.error);
            }
          }
        }
        
        Object.values(results).forEach(processResults);
      }
    };

    processResults(testResults);

    return {
      summary,
      environment: config.current.name,
      baseURL: this.baseURL,
      timestamp: new Date().toISOString(),
      testUsers: Array.from(this.testUsers)
    };
  }
}

module.exports = APITestHelper;
