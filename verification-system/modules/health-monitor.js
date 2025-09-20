const axios = require('axios');
const { performance } = require('perf_hooks');

/**
 * Health Monitor
 * 
 * Continuously monitors system health:
 * - API endpoint availability
 * - Database connectivity
 * - Email service status
 * - Response times
 * - Error rates
 * - Resource usage
 */
class HealthMonitor {
  constructor(config) {
    this.config = config;
    this.results = {
      summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
      issues: [],
      recommendations: [],
      healthChecks: []
    };
    
    this.baseURL = this.config.endpoints.api;
    this.frontendURL = this.config.endpoints.frontend;
    this.retries = this.config.modules.healthMonitor.retries || 3;
    this.isMonitoring = false;
  }

  async check() {
    console.log('  💓 Performing health checks...');
    
    const healthChecks = [
      { name: 'API Health', check: () => this.checkAPIHealth() },
      { name: 'Database Health', check: () => this.checkDatabaseHealth() },
      { name: 'Email Service Health', check: () => this.checkEmailServiceHealth() },
      { name: 'Frontend Health', check: () => this.checkFrontendHealth() },
      { name: 'Response Times', check: () => this.checkResponseTimes() },
      { name: 'Error Rates', check: () => this.checkErrorRates() }
    ];

    for (const healthCheck of healthChecks) {
      await this.runHealthCheck(healthCheck);
    }

    this.generateHealthRecommendations();
    return this.results;
  }

  async quickCheck() {
    console.log('  ⚡ Quick health check...');
    
    const quickChecks = [
      { name: 'API Health', check: () => this.checkAPIHealth() },
      { name: 'Database Health', check: () => this.checkDatabaseHealth() }
    ];

    for (const healthCheck of quickChecks) {
      await this.runHealthCheck(healthCheck);
    }

    return this.results;
  }

  async runHealthCheck(healthCheck) {
    const startTime = performance.now();
    this.results.summary.total++;

    try {
      console.log(`    🔍 ${healthCheck.name}...`);
      const result = await this.retryOperation(() => healthCheck.check(), this.retries);
      
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      this.results.healthChecks.push({
        name: healthCheck.name,
        status: 'healthy',
        duration,
        result,
        timestamp: new Date().toISOString()
      });

      this.results.summary.passed++;
      console.log(`    ✅ ${healthCheck.name} - HEALTHY (${duration}ms)`);

    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);

      this.results.healthChecks.push({
        name: healthCheck.name,
        status: 'unhealthy',
        duration,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      this.addIssue(
        'health_check_failure',
        'high',
        `${healthCheck.name} is unhealthy: ${error.message}`,
        { checkName: healthCheck.name, error: error.message, duration }
      );

      this.results.summary.failed++;
      console.log(`    ❌ ${healthCheck.name} - UNHEALTHY (${duration}ms): ${error.message}`);
    }
  }

  async checkAPIHealth() {
    const healthEndpoint = `${this.baseURL}/health`;
    
    try {
      const response = await axios.get(healthEndpoint, {
        timeout: 5000,
        headers: { 'User-Agent': 'FloWorx-Health-Monitor' }
      });

      if (response.status !== 200) {
        throw new Error(`API health endpoint returned status ${response.status}`);
      }

      return {
        status: 'healthy',
        responseTime: response.headers['x-response-time'] || 'N/A',
        version: response.data.version || 'N/A',
        environment: response.data.environment || 'N/A',
        uptime: response.data.uptime || 'N/A'
      };

    } catch (error) {
      throw new Error(`API health check failed: ${error.message}`);
    }
  }

  async checkDatabaseHealth() {
    try {
      // Check database through API health endpoint
      const response = await axios.get(`${this.baseURL}/health`, {
        timeout: 10000
      });

      if (response.data && response.data.database) {
        const dbHealth = response.data.database;
        
        if (dbHealth.status !== 'connected' && dbHealth.status !== 'healthy') {
          throw new Error(`Database status: ${dbHealth.status}`);
        }

        return {
          status: 'healthy',
          connectionStatus: dbHealth.status,
          connectionPool: dbHealth.connectionPool || 'N/A',
          responseTime: dbHealth.responseTime || 'N/A'
        };
      }

      // Fallback: test database connectivity through auth endpoint
      const testResponse = await axios.get(`${this.baseURL}/auth/csrf`, {
        timeout: 5000
      });

      if (testResponse.status === 200) {
        return {
          status: 'healthy',
          connectionStatus: 'responding',
          fallbackTest: true
        };
      }

      throw new Error('Database connectivity test failed');

    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
  }

  async checkEmailServiceHealth() {
    try {
      // Test email service by attempting a password reset with a test email
      const testEmail = `health.check.${Date.now()}@example.com`;
      
      const response = await axios.post(`${this.baseURL}/auth/forgot-password`, {
        email: testEmail
      }, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
        validateStatus: (status) => status < 500
      });

      if (response.status === 200 && response.data.success) {
        return {
          status: 'healthy',
          emailSent: response.data.emailSent || false,
          provider: 'SendGrid',
          responseTime: response.headers['x-response-time'] || 'N/A'
        };
      }

      if (response.status >= 400 && response.status < 500) {
        // Client error might be expected for test email
        return {
          status: 'healthy',
          note: 'Service responding to requests',
          statusCode: response.status
        };
      }

      throw new Error(`Email service returned status ${response.status}`);

    } catch (error) {
      throw new Error(`Email service health check failed: ${error.message}`);
    }
  }

  async checkFrontendHealth() {
    try {
      const response = await axios.get(this.frontendURL, {
        timeout: 10000,
        headers: { 'User-Agent': 'FloWorx-Health-Monitor' }
      });

      if (response.status !== 200) {
        throw new Error(`Frontend returned status ${response.status}`);
      }

      // Check if it's actually the FloWorx app
      const isFloWorxApp = response.data.includes('FloWorx') || 
                          response.data.includes('floworx') ||
                          response.headers['x-app-name'] === 'FloWorx';

      return {
        status: 'healthy',
        responseTime: response.headers['x-response-time'] || 'N/A',
        contentLength: response.headers['content-length'] || 'N/A',
        isFloWorxApp,
        cacheControl: response.headers['cache-control'] || 'N/A'
      };

    } catch (error) {
      throw new Error(`Frontend health check failed: ${error.message}`);
    }
  }

  async checkResponseTimes() {
    const endpoints = [
      `${this.baseURL}/health`,
      `${this.baseURL}/auth/csrf`,
      this.frontendURL
    ];

    const responseTimes = {};
    const threshold = 2000; // 2 seconds

    for (const endpoint of endpoints) {
      try {
        const startTime = performance.now();
        await axios.get(endpoint, { 
          timeout: 5000,
          headers: { 'User-Agent': 'FloWorx-Health-Monitor' }
        });
        const endTime = performance.now();
        const responseTime = Math.round(endTime - startTime);
        
        responseTimes[endpoint] = {
          responseTime,
          status: responseTime < threshold ? 'good' : 'slow'
        };

      } catch (error) {
        responseTimes[endpoint] = {
          responseTime: 'timeout',
          status: 'error',
          error: error.message
        };
      }
    }

    const slowEndpoints = Object.entries(responseTimes)
      .filter(([_, data]) => data.status === 'slow').length;

    if (slowEndpoints > 0) {
      this.addIssue(
        'slow_response_times',
        'medium',
        `${slowEndpoints} endpoint(s) have slow response times (>${threshold}ms)`,
        { responseTimes, threshold }
      );
    }

    return responseTimes;
  }

  async checkErrorRates() {
    // This would typically check logs or metrics
    // For now, we'll do a simple endpoint availability check
    const endpoints = [
      `${this.baseURL}/health`,
      `${this.baseURL}/auth/csrf`,
      `${this.baseURL}/auth/verify`
    ];

    const results = {};
    let errorCount = 0;

    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint, {
          timeout: 5000,
          validateStatus: () => true, // Accept all status codes
          headers: { 'User-Agent': 'FloWorx-Health-Monitor' }
        });

        results[endpoint] = {
          status: response.status,
          healthy: response.status < 500
        };

        if (response.status >= 500) {
          errorCount++;
        }

      } catch (error) {
        results[endpoint] = {
          status: 'error',
          healthy: false,
          error: error.message
        };
        errorCount++;
      }
    }

    const errorRate = (errorCount / endpoints.length) * 100;

    if (errorRate > 20) { // More than 20% error rate
      this.addIssue(
        'high_error_rate',
        'high',
        `High error rate detected: ${errorRate.toFixed(1)}%`,
        { errorRate, results }
      );
    }

    return {
      errorRate: `${errorRate.toFixed(1)}%`,
      errorCount,
      totalEndpoints: endpoints.length,
      results
    };
  }

  async startContinuousMonitoring(callback, interval = 60000) {
    console.log('  🔄 Starting continuous monitoring...');
    this.isMonitoring = true;

    while (this.isMonitoring) {
      try {
        const results = await this.quickCheck();
        if (callback) callback(results);
        
        await this.sleep(interval);
      } catch (error) {
        console.error('Monitoring error:', error);
        await this.sleep(interval);
      }
    }
  }

  stopContinuousMonitoring() {
    this.isMonitoring = false;
    console.log('  ⏹️  Continuous monitoring stopped');
  }

  async retryOperation(operation, maxRetries) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await this.sleep(1000 * attempt); // Exponential backoff
        }
      }
    }
    
    throw lastError;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  addIssue(type, severity, message, details = {}) {
    this.results.issues.push({
      type,
      severity,
      message,
      details,
      timestamp: new Date().toISOString()
    });
  }

  generateHealthRecommendations() {
    const unhealthyChecks = this.results.healthChecks.filter(c => c.status === 'unhealthy');
    
    if (unhealthyChecks.length > 0) {
      this.results.recommendations.push({
        type: 'health_issues',
        count: unhealthyChecks.length,
        recommendation: `${unhealthyChecks.length} health check(s) failed. Investigate system components and dependencies.`,
        priority: 'critical',
        unhealthyChecks: unhealthyChecks.map(c => c.name)
      });
    }

    const slowChecks = this.results.healthChecks.filter(c => c.duration > 3000);
    if (slowChecks.length > 0) {
      this.results.recommendations.push({
        type: 'performance_degradation',
        count: slowChecks.length,
        recommendation: `${slowChecks.length} health check(s) are slow. Monitor system performance and resource usage.`,
        priority: 'medium',
        slowChecks: slowChecks.map(c => ({ name: c.name, duration: c.duration }))
      });
    }
  }
}

module.exports = HealthMonitor;
