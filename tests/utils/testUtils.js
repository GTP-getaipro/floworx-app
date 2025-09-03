const supertest = require('supertest');
const jwt = require('jsonwebtoken');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

/**
 * Test utilities for API and integration testing
 */
class TestUtils {
  constructor() {
    this.mongoServer = null;
    this.testTokens = new Map();
  }

  /**
   * Initialize test environment
   */
  async init() {
    // Start in-memory MongoDB server
    this.mongoServer = await MongoMemoryServer.create();
    const mongoUri = this.mongoServer.getUri();
    
    // Connect to in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  }

  /**
   * Clean up test environment
   */
  async cleanup() {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (this.mongoServer) {
      await this.mongoServer.stop();
    }
  }

  /**
   * Generate test JWT token
   */
  generateTestToken(payload = {}) {
    const token = jwt.sign(
      { ...payload, iat: Math.floor(Date.now() / 1000) },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    this.testTokens.set(token, payload);
    return token;
  }

  /**
   * Create supertest agent with authentication
   */
  createAuthenticatedAgent(app, userPayload = {}) {
    const agent = supertest.agent(app);
    const token = this.generateTestToken(userPayload);
    agent.set('Authorization', `Bearer ${token}`);
    return agent;
  }

  /**
   * Generate test data
   */
  generateTestData(type, count = 1) {
    const generators = {
      user: (i) => ({
        email: `test${i}@example.com`,
        password: 'TestPassword123!',
        firstName: `Test${i}`,
        lastName: `User${i}`,
        role: 'user'
      }),
      company: (i) => ({
        name: `Test Company ${i}`,
        type: 'business',
        address: `${i} Test Street`,
        phone: `+1555000${i.toString().padStart(4, '0')}`
      }),
      // Add more generators as needed
    };

    const generator = generators[type];
    if (!generator) {
      throw new Error(`No test data generator for type: ${type}`);
    }

    return Array.from({ length: count }, (_, i) => generator(i + 1));
  }

  /**
   * Create test database fixtures
   */
  async createFixtures(fixtures) {
    const results = {};
    for (const [model, data] of Object.entries(fixtures)) {
      if (!mongoose.models[model]) {
        throw new Error(`Model not found: ${model}`);
      }
      results[model] = await mongoose.models[model].create(data);
    }
    return results;
  }

  /**
   * Clear test database
   */
  async clearDatabase() {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
  }

  /**
   * Mock external services
   */
  mockExternalServices() {
    // Example: Mock email service
    jest.mock('../services/EmailService', () => ({
      sendEmail: jest.fn().mockResolvedValue(true)
    }));

    // Example: Mock payment service
    jest.mock('../services/PaymentService', () => ({
      processPayment: jest.fn().mockResolvedValue({ success: true })
    }));
  }

  /**
   * Create test middleware
   */
  createTestMiddleware(options = {}) {
    return (req, res, next) => {
      // Add test-specific properties to request
      req.testId = Math.random().toString(36).substring(7);
      req.testStartTime = Date.now();

      // Add test-specific methods to response
      res.getTestDuration = () => Date.now() - req.testStartTime;

      if (options.authenticate) {
        req.user = this.generateTestData('user', 1)[0];
      }

      next();
    };
  }

  /**
   * Assert API response format
   */
  assertApiResponse(response, options = {}) {
    const { status = 200, success = true } = options;

    expect(response.status).toBe(status);
    expect(response.body).toHaveProperty('success', success);
    expect(response.body).toHaveProperty('timestamp');

    if (success) {
      expect(response.body).toHaveProperty('data');
    } else {
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('code');
    }
  }

  /**
   * Create test logger
   */
  createTestLogger() {
    return {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn()
    };
  }
}

module.exports = new TestUtils();
