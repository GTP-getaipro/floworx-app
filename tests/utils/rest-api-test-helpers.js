/**
 * REST API Test Helpers
 * Provides utilities for testing with Supabase REST API instead of direct SQL
 */

const { databaseOperations } = require('../../backend/database/database-operations');
const { v4: uuidv4 } = require('uuid');

// Try to require bcrypt, fallback to a mock if not available
let bcrypt;
try {
  bcrypt = require('bcrypt');
} catch (error) {
  // Mock bcrypt for testing environments where it's not available
  bcrypt = {
    hash: async (password, rounds) => `hashed_${password}_${rounds}`,
    compare: async (password, hash) => hash.includes(password)
  };
}

class RestApiTestHelpers {
  constructor() {
    this.dbOps = databaseOperations;
    this.testUsers = new Set();
    this.testData = new Map();
  }

  /**
   * Create a test user using REST API
   */
  async createTestUser(userData = {}) {
    const defaultUser = {
      id: uuidv4(),
      email: userData.email || `test-${uuidv4()}@floworx-test.com`,
      password_hash: userData.password_hash || await bcrypt.hash('TestPassword123!', 10),
      first_name: userData.first_name || 'Test',
      last_name: userData.last_name || 'User',
      company_name: userData.company_name || 'Test Company',
      email_verified: userData.email_verified !== undefined ? userData.email_verified : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await this.dbOps.createUser(defaultUser);
    
    if (!result.error && result.data) {
      this.testUsers.add(result.data.id);
      this.testData.set(`user_${result.data.id}`, result.data);
      return result.data;
    }
    
    throw new Error(`Failed to create test user: ${result.error?.message || 'Unknown error'}`);
  }

  /**
   * Get test user by email using REST API
   */
  async getTestUserByEmail(email) {
    const result = await this.dbOps.getUserByEmail(email);
    
    if (!result.error && result.data) {
      return result.data;
    }
    
    return null;
  }

  /**
   * Get test user by ID using REST API
   */
  async getTestUserById(userId) {
    const result = await this.dbOps.getUserById(userId);
    
    if (!result.error && result.data) {
      return result.data;
    }
    
    return null;
  }

  /**
   * Update test user using REST API
   */
  async updateTestUser(userId, updates) {
    const result = await this.dbOps.updateUser(userId, {
      ...updates,
      updated_at: new Date().toISOString()
    });
    
    if (!result.error && result.data) {
      this.testData.set(`user_${userId}`, result.data);
      return result.data;
    }
    
    throw new Error(`Failed to update test user: ${result.error?.message || 'Unknown error'}`);
  }

  /**
   * Delete test user using REST API
   */
  async deleteTestUser(userId) {
    const result = await this.dbOps.deleteUser(userId);
    
    if (!result.error) {
      this.testUsers.delete(userId);
      this.testData.delete(`user_${userId}`);
      return true;
    }
    
    return false;
  }

  /**
   * Create test business type data
   */
  async createTestBusinessType(businessTypeData = {}) {
    const defaultBusinessType = {
      id: uuidv4(),
      name: businessTypeData.name || 'Test Business Type',
      description: businessTypeData.description || 'Test business type for integration testing',
      slug: businessTypeData.slug || `test-business-${uuidv4()}`,
      default_categories: businessTypeData.default_categories || [
        { name: 'Service Calls', priority: 'high', description: 'Emergency repairs' },
        { name: 'Sales Inquiries', priority: 'medium', description: 'New customer quotes' }
      ],
      workflow_template_id: businessTypeData.workflow_template_id || 'test-template-v1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await this.dbOps.createBusinessType(defaultBusinessType);
    
    if (!result.error && result.data) {
      this.testData.set(`business_type_${result.data.id}`, result.data);
      return result.data;
    }
    
    throw new Error(`Failed to create test business type: ${result.error?.message || 'Unknown error'}`);
  }

  /**
   * Clean up all test data
   */
  async cleanup() {
    const cleanupPromises = [];

    // Clean up test users
    for (const userId of this.testUsers) {
      cleanupPromises.push(this.deleteTestUser(userId));
    }

    // Clean up other test data
    for (const [key, data] of this.testData) {
      if (key.startsWith('business_type_')) {
        cleanupPromises.push(this.dbOps.deleteBusinessType(data.id));
      }
    }

    await Promise.allSettled(cleanupPromises);
    
    this.testUsers.clear();
    this.testData.clear();
  }

  /**
   * Verify database connection
   */
  async verifyConnection() {
    try {
      const { type, client } = await this.dbOps.getClient();
      
      if (type === 'REST_API') {
        // Test with a simple query
        const result = await client.getAdminClient()
          .from('users')
          .select('count')
          .limit(1);
        
        return { connected: true, type: 'REST_API', error: null };
      } else {
        // Test PostgreSQL connection
        const result = await client.query('SELECT 1 as test');
        return { connected: true, type: 'POSTGRESQL', error: null };
      }
    } catch (error) {
      return { connected: false, type: null, error: error.message };
    }
  }

  /**
   * Wait for database operations to complete
   */
  async waitForOperation(operation, maxRetries = 5, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await operation();
        if (result) return result;
      } catch (error) {
        if (i === maxRetries - 1) throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    throw new Error('Operation timed out after maximum retries');
  }

  /**
   * Generate test data for various scenarios
   */
  generateTestData(type, overrides = {}) {
    const generators = {
      user: () => ({
        email: `test-${uuidv4()}@floworx-test.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
        companyName: 'Test Company',
        ...overrides
      }),
      
      businessType: () => ({
        name: 'Test Business Type',
        description: 'Test business type for integration testing',
        slug: `test-business-${uuidv4()}`,
        default_categories: [
          { name: 'Service Calls', priority: 'high', description: 'Emergency repairs' }
        ],
        ...overrides
      }),
      
      credentials: () => ({
        service_name: 'gmail',
        encrypted_credentials: 'test-encrypted-data',
        expiry_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        ...overrides
      })
    };

    return generators[type] ? generators[type]() : {};
  }
}

// Export singleton instance
const restApiTestHelpers = new RestApiTestHelpers();

module.exports = {
  RestApiTestHelpers,
  restApiTestHelpers
};
