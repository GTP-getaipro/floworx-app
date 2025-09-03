/**
 * Test Data Factory
 * Provides consistent test data generation for regression testing
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class TestDataFactory {
  constructor() {
    this.sequenceCounters = {};
  }

  /**
   * Generate unique sequence number for entity type
   */
  getSequence(entityType) {
    if (!this.sequenceCounters[entityType]) {
      this.sequenceCounters[entityType] = 1;
    }
    return this.sequenceCounters[entityType]++;
  }

  /**
   * Generate test user data
   */
  createUser(overrides = {}) {
    const sequence = this.getSequence('user');
    return {
      id: overrides.id || `test-user-${sequence}`,
      email: overrides.email || `testuser${sequence}@floworx-test.com`,
      password: overrides.password || 'TestPassword123!',
      hashedPassword: overrides.hashedPassword || bcrypt.hashSync('TestPassword123!', 10),
      firstName: overrides.firstName || `TestUser${sequence}`,
      lastName: overrides.lastName || `LastName${sequence}`,
      businessType: overrides.businessType || 'hot_tub_service',
      isEmailVerified: overrides.isEmailVerified !== undefined ? overrides.isEmailVerified : true,
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides
    };
  }

  /**
   * Generate test credential data
   */
  createCredential(overrides = {}) {
    const sequence = this.getSequence('credential');
    return {
      id: overrides.id || `test-credential-${sequence}`,
      userId: overrides.userId || `test-user-${sequence}`,
      serviceName: overrides.serviceName || 'google',
      accessToken: overrides.accessToken || this.generateToken(),
      refreshToken: overrides.refreshToken || this.generateToken(),
      expiryDate: overrides.expiryDate || new Date(Date.now() + 3600000), // 1 hour from now
      scope: overrides.scope || 'https://www.googleapis.com/auth/gmail.readonly',
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides
    };
  }

  /**
   * Generate test workflow deployment data
   */
  createWorkflowDeployment(overrides = {}) {
    const sequence = this.getSequence('workflow');
    return {
      id: overrides.id || `test-workflow-${sequence}`,
      userId: overrides.userId || `test-user-${sequence}`,
      workflowId: overrides.workflowId || `n8n-workflow-${sequence}`,
      status: overrides.status || 'active',
      businessType: overrides.businessType || 'hot_tub_service',
      configuration: overrides.configuration || {
        emailLabels: ['Hot Tub Service', 'Customer Inquiry'],
        notificationSettings: {
          slack: true,
          email: true,
          webhookUrl: 'https://hooks.slack.com/test'
        }
      },
      deployedAt: overrides.deployedAt || new Date(),
      lastExecuted: overrides.lastExecuted || new Date(),
      executionCount: overrides.executionCount || 0,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides
    };
  }

  /**
   * Generate test onboarding session data
   */
  createOnboardingSession(overrides = {}) {
    const sequence = this.getSequence('onboarding');
    return {
      id: overrides.id || `test-session-${sequence}`,
      userId: overrides.userId || `test-user-${sequence}`,
      currentStep: overrides.currentStep || 'business_type',
      completedSteps: overrides.completedSteps || ['business_type'],
      sessionData: overrides.sessionData || {
        businessType: 'hot_tub_service',
        selectedLabels: [],
        notificationPreferences: {}
      },
      isCompleted: overrides.isCompleted !== undefined ? overrides.isCompleted : false,
      expiresAt: overrides.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides
    };
  }

  /**
   * Generate test error tracking data
   */
  createErrorLog(overrides = {}) {
    const sequence = this.getSequence('error');
    return {
      id: overrides.id || `test-error-${sequence}`,
      message: overrides.message || `Test error message ${sequence}`,
      stack: overrides.stack || `Error: Test error message ${sequence}\n    at testFunction (test.js:1:1)`,
      category: overrides.category || 'application',
      severity: overrides.severity || 'medium',
      url: overrides.url || `/api/test/endpoint/${sequence}`,
      userAgent: overrides.userAgent || 'Test User Agent',
      userId: overrides.userId || null,
      metadata: overrides.metadata || {
        testType: 'regression',
        sequence: sequence
      },
      count: overrides.count || 1,
      firstOccurred: overrides.firstOccurred || new Date(),
      lastOccurred: overrides.lastOccurred || new Date(),
      resolved: overrides.resolved !== undefined ? overrides.resolved : false,
      ...overrides
    };
  }

  /**
   * Generate test monitoring data
   */
  createMonitoringData(overrides = {}) {
    const sequence = this.getSequence('monitoring');
    return {
      id: overrides.id || `test-monitoring-${sequence}`,
      timestamp: overrides.timestamp || new Date(),
      queryText: overrides.queryText || `SELECT * FROM test_table WHERE id = ${sequence}`,
      duration: overrides.duration || Math.floor(Math.random() * 1000) + 100,
      success: overrides.success !== undefined ? overrides.success : true,
      error: overrides.error || null,
      endpoint: overrides.endpoint || `/api/test/${sequence}`,
      method: overrides.method || 'GET',
      statusCode: overrides.statusCode || 200,
      responseTime: overrides.responseTime || Math.floor(Math.random() * 500) + 50,
      memoryUsage: overrides.memoryUsage || Math.floor(Math.random() * 100) + 50,
      cpuUsage: overrides.cpuUsage || Math.random() * 0.5 + 0.1,
      ...overrides
    };
  }

  /**
   * Generate test business type data
   */
  createBusinessType(overrides = {}) {
    const sequence = this.getSequence('businessType');
    const businessTypes = [
      'hot_tub_service',
      'pool_maintenance',
      'spa_service',
      'water_treatment',
      'equipment_repair'
    ];
    
    return {
      id: overrides.id || businessTypes[sequence % businessTypes.length],
      name: overrides.name || `Business Type ${sequence}`,
      description: overrides.description || `Description for business type ${sequence}`,
      emailLabels: overrides.emailLabels || [
        `Service ${sequence}`,
        `Customer ${sequence}`,
        `Inquiry ${sequence}`
      ],
      workflowTemplate: overrides.workflowTemplate || {
        triggers: ['email_received'],
        actions: ['parse_email', 'create_ticket', 'notify_team'],
        configuration: {
          priority: 'medium',
          autoAssign: true
        }
      },
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
      createdAt: overrides.createdAt || new Date(),
      updatedAt: overrides.updatedAt || new Date(),
      ...overrides
    };
  }

  /**
   * Generate test JWT token
   */
  generateJWTToken(payload = {}, secret = 'test-jwt-secret') {
    const jwt = require('jsonwebtoken');
    const defaultPayload = {
      userId: payload.userId || 'test-user-1',
      email: payload.email || 'testuser@floworx-test.com',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    };
    
    return jwt.sign({ ...defaultPayload, ...payload }, secret);
  }

  /**
   * Generate random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate test API request data
   */
  createAPIRequest(overrides = {}) {
    const sequence = this.getSequence('apiRequest');
    return {
      method: overrides.method || 'GET',
      url: overrides.url || `/api/test/${sequence}`,
      headers: overrides.headers || {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.generateJWTToken()}`
      },
      body: overrides.body || null,
      query: overrides.query || {},
      params: overrides.params || {},
      user: overrides.user || this.createUser(),
      ...overrides
    };
  }

  /**
   * Generate test database query data
   */
  createDatabaseQuery(overrides = {}) {
    const sequence = this.getSequence('dbQuery');
    const queries = [
      'SELECT * FROM users WHERE id = $1',
      'INSERT INTO credentials (user_id, service_name) VALUES ($1, $2)',
      'UPDATE workflow_deployments SET status = $1 WHERE id = $2',
      'DELETE FROM onboarding_sessions WHERE expires_at < NOW()'
    ];
    
    return {
      text: overrides.text || queries[sequence % queries.length],
      values: overrides.values || [`param${sequence}`],
      duration: overrides.duration || Math.floor(Math.random() * 100) + 10,
      rowCount: overrides.rowCount || Math.floor(Math.random() * 10) + 1,
      success: overrides.success !== undefined ? overrides.success : true,
      error: overrides.error || null,
      timestamp: overrides.timestamp || new Date(),
      ...overrides
    };
  }

  /**
   * Generate test performance metrics
   */
  createPerformanceMetrics(overrides = {}) {
    return {
      timestamp: overrides.timestamp || new Date(),
      responseTime: overrides.responseTime || Math.floor(Math.random() * 1000) + 100,
      memoryUsage: overrides.memoryUsage || {
        rss: Math.floor(Math.random() * 100) * 1024 * 1024,
        heapTotal: Math.floor(Math.random() * 50) * 1024 * 1024,
        heapUsed: Math.floor(Math.random() * 30) * 1024 * 1024,
        external: Math.floor(Math.random() * 10) * 1024 * 1024
      },
      cpuUsage: overrides.cpuUsage || {
        user: Math.random() * 1000000,
        system: Math.random() * 500000
      },
      activeConnections: overrides.activeConnections || Math.floor(Math.random() * 20) + 1,
      queryCount: overrides.queryCount || Math.floor(Math.random() * 100) + 10,
      errorCount: overrides.errorCount || Math.floor(Math.random() * 5),
      ...overrides
    };
  }

  /**
   * Create batch of test data
   */
  createBatch(entityType, count = 10, overrides = {}) {
    const batch = [];
    for (let i = 0; i < count; i++) {
      switch (entityType) {
        case 'users':
          batch.push(this.createUser(overrides));
          break;
        case 'credentials':
          batch.push(this.createCredential(overrides));
          break;
        case 'workflows':
          batch.push(this.createWorkflowDeployment(overrides));
          break;
        case 'onboardingSessions':
          batch.push(this.createOnboardingSession(overrides));
          break;
        case 'errors':
          batch.push(this.createErrorLog(overrides));
          break;
        case 'monitoring':
          batch.push(this.createMonitoringData(overrides));
          break;
        case 'businessTypes':
          batch.push(this.createBusinessType(overrides));
          break;
        default:
          throw new Error(`Unknown entity type: ${entityType}`);
      }
    }
    return batch;
  }

  /**
   * Reset sequence counters
   */
  resetSequences() {
    this.sequenceCounters = {};
  }

  /**
   * Create complete test scenario data
   */
  createTestScenario(scenarioName) {
    switch (scenarioName) {
      case 'complete_onboarding':
        return this.createCompleteOnboardingScenario();
      case 'oauth_flow':
        return this.createOAuthFlowScenario();
      case 'workflow_deployment':
        return this.createWorkflowDeploymentScenario();
      case 'error_tracking':
        return this.createErrorTrackingScenario();
      case 'performance_monitoring':
        return this.createPerformanceMonitoringScenario();
      default:
        throw new Error(`Unknown test scenario: ${scenarioName}`);
    }
  }

  /**
   * Create complete onboarding scenario
   */
  createCompleteOnboardingScenario() {
    const user = this.createUser();
    const session = this.createOnboardingSession({
      userId: user.id,
      isCompleted: true,
      completedSteps: ['business_type', 'oauth_connection', 'label_mapping', 'notifications', 'review']
    });
    const credential = this.createCredential({ userId: user.id });
    const workflow = this.createWorkflowDeployment({ userId: user.id });

    return { user, session, credential, workflow };
  }

  /**
   * Create OAuth flow scenario
   */
  createOAuthFlowScenario() {
    const user = this.createUser();
    const credential = this.createCredential({
      userId: user.id,
      accessToken: this.generateToken(),
      refreshToken: this.generateToken()
    });

    return { user, credential };
  }

  /**
   * Create workflow deployment scenario
   */
  createWorkflowDeploymentScenario() {
    const user = this.createUser();
    const workflow = this.createWorkflowDeployment({
      userId: user.id,
      status: 'active',
      executionCount: 25
    });

    return { user, workflow };
  }

  /**
   * Create error tracking scenario
   */
  createErrorTrackingScenario() {
    const errors = [
      this.createErrorLog({ severity: 'critical', count: 5 }),
      this.createErrorLog({ severity: 'high', count: 12 }),
      this.createErrorLog({ severity: 'medium', count: 8 }),
      this.createErrorLog({ severity: 'low', count: 3 })
    ];

    return { errors };
  }

  /**
   * Create performance monitoring scenario
   */
  createPerformanceMonitoringScenario() {
    const metrics = this.createBatch('monitoring', 50);
    const queries = [];
    
    for (let i = 0; i < 20; i++) {
      queries.push(this.createDatabaseQuery());
    }

    return { metrics, queries };
  }
}

// Export singleton instance
module.exports = new TestDataFactory();
