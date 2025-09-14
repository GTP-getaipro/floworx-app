/**
 * Performance and Load Testing Suite for FloWorx
 * Tests system performance under various load conditions
 */

const axios = require('axios');
const crypto = require('crypto');

class LoadTester {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.results = {
      authentication: [],
      emailProvider: [],
      businessTypes: [],
      database: [],
      overall: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        maxResponseTime: 0,
        minResponseTime: Infinity
      }
    };
  }

  /**
   * Run comprehensive load testing
   */
  async runLoadTests() {
    console.log('🚀 Starting FloWorx Performance Load Testing');
    console.log(`🎯 Target: ${this.baseUrl}`);
    console.log('=' * 60);

    try {
      // Test 1: Authentication endpoint load testing
      await this.testAuthenticationLoad();
      
      // Test 2: Email provider selection load testing
      await this.testEmailProviderLoad();
      
      // Test 3: Business types endpoint load testing
      await this.testBusinessTypesLoad();
      
      // Test 4: Database query performance
      await this.testDatabasePerformance();
      
      // Test 5: Concurrent user simulation
      await this.testConcurrentUsers();
      
      // Generate performance report
      this.generatePerformanceReport();
      
      return this.results;
    } catch (error) {
      console.error('❌ Load testing failed:', error.message);
      throw error;
    }
  }

  /**
   * Test authentication endpoint under load
   */
  async testAuthenticationLoad() {
    console.log('\n🔐 Testing Authentication Endpoint Load...');
    
    const concurrentUsers = 10;
    const requestsPerUser = 5;
    const testPromises = [];

    for (let user = 0; user < concurrentUsers; user++) {
      testPromises.push(this.simulateAuthenticationUser(user, requestsPerUser));
    }

    const results = await Promise.allSettled(testPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Authentication Load Test: ${successful}/${concurrentUsers} users successful`);
    console.log(`📊 Success Rate: ${((successful / concurrentUsers) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log(`⚠️ Failed Users: ${failed}`);
    }
  }

  /**
   * Simulate authentication requests for a single user
   */
  async simulateAuthenticationUser(userId, requestCount) {
    const userResults = [];
    
    for (let i = 0; i < requestCount; i++) {
      const testEmail = `load-test-${userId}-${i}-${Date.now()}@example.com`;
      const startTime = Date.now();
      
      try {
        const response = await axios.post(`${this.baseUrl}/api/auth/test-register`, {
          email: testEmail,
          password: 'LoadTest123!',
          firstName: 'Load',
          lastName: `Test${userId}`
        }, { timeout: 10000 });
        
        const responseTime = Date.now() - startTime;
        
        userResults.push({
          success: true,
          responseTime,
          statusCode: response.status
        });
        
        this.updateOverallStats(responseTime, true);
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        userResults.push({
          success: false,
          responseTime,
          statusCode: error.response?.status || 0,
          error: error.message
        });
        
        this.updateOverallStats(responseTime, false);
      }
      
      // Small delay between requests
      await this.sleep(100);
    }
    
    this.results.authentication.push(...userResults);
    return userResults;
  }

  /**
   * Test email provider selection under load
   */
  async testEmailProviderLoad() {
    console.log('\n📧 Testing Email Provider Selection Load...');
    
    // First, create some authenticated users
    const authTokens = await this.createTestUsers(5);
    
    const testPromises = [];
    
    for (const token of authTokens) {
      testPromises.push(this.simulateEmailProviderRequests(token, 10));
    }
    
    const results = await Promise.allSettled(testPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Email Provider Load Test: ${successful}/${authTokens.length} users successful`);
    console.log(`📊 Success Rate: ${((successful / authTokens.length) * 100).toFixed(1)}%`);
  }

  /**
   * Simulate email provider selection requests
   */
  async simulateEmailProviderRequests(token, requestCount) {
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    const providers = ['gmail', 'outlook'];
    const userResults = [];
    
    for (let i = 0; i < requestCount; i++) {
      const provider = providers[i % providers.length];
      const startTime = Date.now();
      
      try {
        const response = await axios.post(`${this.baseUrl}/api/onboarding/email-provider`, 
          { provider }, { headers, timeout: 5000 });
        
        const responseTime = Date.now() - startTime;
        
        userResults.push({
          success: true,
          responseTime,
          statusCode: response.status,
          provider
        });
        
        this.updateOverallStats(responseTime, true);
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        
        userResults.push({
          success: false,
          responseTime,
          statusCode: error.response?.status || 0,
          error: error.message,
          provider
        });
        
        this.updateOverallStats(responseTime, false);
      }
      
      await this.sleep(50);
    }
    
    this.results.emailProvider.push(...userResults);
    return userResults;
  }

  /**
   * Test business types endpoint under load
   */
  async testBusinessTypesLoad() {
    console.log('\n🏢 Testing Business Types Endpoint Load...');
    
    const authTokens = await this.createTestUsers(3);
    const concurrentRequests = 20;
    const testPromises = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
      const token = authTokens[i % authTokens.length];
      testPromises.push(this.testBusinessTypesRequest(token));
    }
    
    const results = await Promise.allSettled(testPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Business Types Load Test: ${successful}/${concurrentRequests} requests successful`);
    console.log(`📊 Success Rate: ${((successful / concurrentRequests) * 100).toFixed(1)}%`);
  }

  /**
   * Test single business types request
   */
  async testBusinessTypesRequest(token) {
    const headers = { 'Authorization': `Bearer ${token}` };
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/onboarding/business-types`, 
        { headers, timeout: 5000 });
      
      const responseTime = Date.now() - startTime;
      
      const result = {
        success: true,
        responseTime,
        statusCode: response.status,
        businessTypesCount: response.data.data?.businessTypes?.length || 0
      };
      
      this.results.businessTypes.push(result);
      this.updateOverallStats(responseTime, true);
      
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const result = {
        success: false,
        responseTime,
        statusCode: error.response?.status || 0,
        error: error.message
      };
      
      this.results.businessTypes.push(result);
      this.updateOverallStats(responseTime, false);
      
      throw error;
    }
  }

  /**
   * Test database performance
   */
  async testDatabasePerformance() {
    console.log('\n🗄️ Testing Database Performance...');
    
    // Test health endpoint which likely queries database
    const concurrentRequests = 15;
    const testPromises = [];
    
    for (let i = 0; i < concurrentRequests; i++) {
      testPromises.push(this.testDatabaseQuery());
    }
    
    const results = await Promise.allSettled(testPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Database Performance Test: ${successful}/${concurrentRequests} queries successful`);
    console.log(`📊 Success Rate: ${((successful / concurrentRequests) * 100).toFixed(1)}%`);
  }

  /**
   * Test database query performance
   */
  async testDatabaseQuery() {
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/health`, { timeout: 5000 });
      
      const responseTime = Date.now() - startTime;
      
      const result = {
        success: true,
        responseTime,
        statusCode: response.status
      };
      
      this.results.database.push(result);
      this.updateOverallStats(responseTime, true);
      
      return result;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      const result = {
        success: false,
        responseTime,
        statusCode: error.response?.status || 0,
        error: error.message
      };
      
      this.results.database.push(result);
      this.updateOverallStats(responseTime, false);
      
      throw error;
    }
  }

  /**
   * Test concurrent users simulation
   */
  async testConcurrentUsers() {
    console.log('\n👥 Testing Concurrent Users Simulation...');
    
    const concurrentUsers = 8;
    const actionsPerUser = 3;
    const testPromises = [];
    
    for (let user = 0; user < concurrentUsers; user++) {
      testPromises.push(this.simulateUserSession(user, actionsPerUser));
    }
    
    const results = await Promise.allSettled(testPromises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`✅ Concurrent Users Test: ${successful}/${concurrentUsers} user sessions successful`);
    console.log(`📊 Success Rate: ${((successful / concurrentUsers) * 100).toFixed(1)}%`);
  }

  /**
   * Simulate complete user session
   */
  async simulateUserSession(userId, actionCount) {
    const sessionEmail = `session-${userId}-${Date.now()}@example.com`;
    
    try {
      // Step 1: Register
      const regResponse = await axios.post(`${this.baseUrl}/api/auth/test-register`, {
        email: sessionEmail,
        password: 'SessionTest123!',
        firstName: 'Session',
        lastName: `User${userId}`
      });
      
      const token = regResponse.data.data.token;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Step 2: Select email provider
      await axios.post(`${this.baseUrl}/api/onboarding/email-provider`, 
        { provider: 'gmail' }, { headers });
      
      // Step 3: Get business types
      await axios.get(`${this.baseUrl}/api/onboarding/business-types`, { headers });
      
      return { userId, success: true, actions: 3 };
    } catch (error) {
      return { userId, success: false, error: error.message };
    }
  }

  /**
   * Create test users for load testing
   */
  async createTestUsers(count) {
    const tokens = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const testEmail = `load-user-${i}-${Date.now()}@example.com`;
        const response = await axios.post(`${this.baseUrl}/api/auth/test-register`, {
          email: testEmail,
          password: 'LoadUser123!',
          firstName: 'Load',
          lastName: `User${i}`
        });
        
        tokens.push(response.data.data.token);
      } catch (error) {
        console.warn(`Failed to create test user ${i}:`, error.message);
      }
    }
    
    return tokens;
  }

  /**
   * Update overall statistics
   */
  updateOverallStats(responseTime, success) {
    this.results.overall.totalRequests++;
    
    if (success) {
      this.results.overall.successfulRequests++;
    } else {
      this.results.overall.failedRequests++;
    }
    
    this.results.overall.maxResponseTime = Math.max(this.results.overall.maxResponseTime, responseTime);
    this.results.overall.minResponseTime = Math.min(this.results.overall.minResponseTime, responseTime);
    
    // Calculate running average
    const totalTime = this.results.overall.averageResponseTime * (this.results.overall.totalRequests - 1) + responseTime;
    this.results.overall.averageResponseTime = totalTime / this.results.overall.totalRequests;
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport() {
    console.log('\n' + '=' * 60);
    console.log('📊 PERFORMANCE LOAD TESTING REPORT');
    console.log('=' * 60);
    
    const overall = this.results.overall;
    
    console.log('\n🎯 OVERALL PERFORMANCE:');
    console.log(`Total Requests: ${overall.totalRequests}`);
    console.log(`Successful Requests: ${overall.successfulRequests}`);
    console.log(`Failed Requests: ${overall.failedRequests}`);
    console.log(`Success Rate: ${((overall.successfulRequests / overall.totalRequests) * 100).toFixed(1)}%`);
    console.log(`Average Response Time: ${overall.averageResponseTime.toFixed(0)}ms`);
    console.log(`Min Response Time: ${overall.minResponseTime}ms`);
    console.log(`Max Response Time: ${overall.maxResponseTime}ms`);
    
    // Endpoint-specific reports
    this.generateEndpointReport('Authentication', this.results.authentication);
    this.generateEndpointReport('Email Provider', this.results.emailProvider);
    this.generateEndpointReport('Business Types', this.results.businessTypes);
    this.generateEndpointReport('Database', this.results.database);
    
    // Performance assessment
    console.log('\n🏆 PERFORMANCE ASSESSMENT:');
    
    if (overall.averageResponseTime < 500) {
      console.log('✅ Excellent response times (< 500ms average)');
    } else if (overall.averageResponseTime < 1000) {
      console.log('✅ Good response times (< 1000ms average)');
    } else if (overall.averageResponseTime < 2000) {
      console.log('⚠️ Acceptable response times (< 2000ms average)');
    } else {
      console.log('❌ Poor response times (> 2000ms average)');
    }
    
    if ((overall.successfulRequests / overall.totalRequests) > 0.95) {
      console.log('✅ Excellent reliability (> 95% success rate)');
    } else if ((overall.successfulRequests / overall.totalRequests) > 0.90) {
      console.log('✅ Good reliability (> 90% success rate)');
    } else {
      console.log('⚠️ Reliability needs improvement (< 90% success rate)');
    }
    
    console.log('\n' + '=' * 60);
  }

  /**
   * Generate endpoint-specific report
   */
  generateEndpointReport(name, results) {
    if (results.length === 0) return;
    
    const successful = results.filter(r => r.success).length;
    const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
    const maxResponseTime = Math.max(...results.map(r => r.responseTime));
    const minResponseTime = Math.min(...results.map(r => r.responseTime));
    
    console.log(`\n📈 ${name.toUpperCase()} ENDPOINT:`);
    console.log(`  Requests: ${results.length}`);
    console.log(`  Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);
    console.log(`  Avg Response: ${avgResponseTime.toFixed(0)}ms`);
    console.log(`  Min Response: ${minResponseTime}ms`);
    console.log(`  Max Response: ${maxResponseTime}ms`);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export for use in tests
module.exports = LoadTester;

// Run if called directly
if (require.main === module) {
  const tester = new LoadTester();
  tester.runLoadTests()
    .then(results => {
      console.log('\n🎉 Load testing completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Load testing failed:', error);
      process.exit(1);
    });
}
