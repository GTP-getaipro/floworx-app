#!/usr/bin/env node

/**
 * Performance Load Testing for FloWorx SaaS
 * Tests application performance under various load conditions
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Load Test Configuration
 */
const LOAD_TEST_CONFIG = {
  baseUrl: process.env.TEST_API_URL || 'http://localhost:5001/api',
  
  // Test scenarios
  scenarios: {
    authentication: {
      name: 'Authentication Load Test',
      endpoint: '/auth/login',
      method: 'POST',
      data: {
        email: 'test@floworx-test.com',
        password: 'TestPass123!'
      },
      concurrent: 10,
      requests: 100,
      timeout: 5000
    },
    
    workflows: {
      name: 'Workflows API Load Test',
      endpoint: '/workflows',
      method: 'GET',
      headers: { Authorization: 'Bearer test-token' },
      concurrent: 20,
      requests: 200,
      timeout: 10000
    },
    
    analytics: {
      name: 'Analytics Dashboard Load Test',
      endpoint: '/analytics/dashboard',
      method: 'GET',
      params: { period: 'week' },
      headers: { Authorization: 'Bearer test-token' },
      concurrent: 15,
      requests: 150,
      timeout: 15000
    },
    
    workflowExecution: {
      name: 'Workflow Execution Load Test',
      endpoint: '/workflows/test-workflow-id/execute',
      method: 'POST',
      data: {
        inputData: {
          emailId: 'load-test-email',
          from: 'loadtest@example.com',
          subject: 'Load test email',
          body: 'This is a load test email'
        }
      },
      headers: { Authorization: 'Bearer test-token' },
      concurrent: 5,
      requests: 50,
      timeout: 30000
    }
  },
  
  // Performance thresholds
  thresholds: {
    responseTime: {
      p50: 500,   // 50th percentile < 500ms
      p95: 2000,  // 95th percentile < 2s
      p99: 5000   // 99th percentile < 5s
    },
    errorRate: 0.01, // < 1% error rate
    throughput: 100  // > 100 requests/second
  }
};

/**
 * Performance Load Tester Class
 */
class LoadTester {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      scenarios: {},
      summary: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        throughput: 0,
        errorRate: 0
      },
      performance: {
        memory: {
          initial: process.memoryUsage(),
          peak: process.memoryUsage(),
          final: null
        },
        cpu: {
          initial: process.cpuUsage(),
          final: null
        }
      }
    };
  }

  /**
   * Run all load test scenarios
   */
  async runLoadTests() {
    console.log('⚡ Starting Performance Load Tests');
    console.log('=================================\n');

    try {
      // Run each scenario
      for (const [scenarioName, config] of Object.entries(LOAD_TEST_CONFIG.scenarios)) {
        console.log(`🚀 Running ${config.name}...`);
        
        const scenarioResult = await this.runScenario(scenarioName, config);
        this.results.scenarios[scenarioName] = scenarioResult;
        
        // Update memory peak
        const currentMemory = process.memoryUsage();
        if (currentMemory.heapUsed > this.results.performance.memory.peak.heapUsed) {
          this.results.performance.memory.peak = currentMemory;
        }
        
        console.log(`✅ ${config.name} completed`);
        console.log(`   Requests: ${scenarioResult.totalRequests}`);
        console.log(`   Success Rate: ${(scenarioResult.successRate * 100).toFixed(2)}%`);
        console.log(`   Avg Response Time: ${scenarioResult.averageResponseTime.toFixed(2)}ms`);
        console.log(`   Throughput: ${scenarioResult.throughput.toFixed(2)} req/s\n`);
        
        // Brief pause between scenarios
        await this.sleep(2000);
      }

      // Calculate overall summary
      this.calculateSummary();

      // Generate performance report
      await this.generatePerformanceReport();

      // Analyze results against thresholds
      this.analyzePerformance();

      this.results.endTime = new Date();
      console.log('\n✅ Load testing completed successfully');
      
      return this.results;

    } catch (error) {
      console.error('\n❌ Load testing failed:', error);
      throw error;
    } finally {
      this.results.performance.memory.final = process.memoryUsage();
      this.results.performance.cpu.final = process.cpuUsage(this.results.performance.cpu.initial);
    }
  }

  /**
   * Run individual load test scenario
   */
  async runScenario(scenarioName, config) {
    const startTime = Date.now();
    const results = {
      name: config.name,
      startTime: new Date(startTime),
      endTime: null,
      totalRequests: config.requests,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      throughput: 0,
      successRate: 0,
      averageResponseTime: 0,
      percentiles: {}
    };

    // Create API client for this scenario
    const apiClient = axios.create({
      baseURL: LOAD_TEST_CONFIG.baseUrl,
      timeout: config.timeout,
      validateStatus: () => true // Don't throw on HTTP errors
    });

    // Execute requests in batches to control concurrency
    const batchSize = config.concurrent;
    const totalBatches = Math.ceil(config.requests / batchSize);
    
    for (let batch = 0; batch < totalBatches; batch++) {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, config.requests);
      const batchRequests = [];

      // Create batch of concurrent requests
      for (let i = batchStart; i < batchEnd; i++) {
        batchRequests.push(this.executeRequest(apiClient, config, results));
      }

      // Execute batch concurrently
      await Promise.all(batchRequests);
      
      // Progress indicator
      const progress = ((batch + 1) / totalBatches * 100).toFixed(1);
      process.stdout.write(`\r   Progress: ${progress}%`);
    }
    
    console.log(); // New line after progress

    const endTime = Date.now();
    results.endTime = new Date(endTime);
    
    // Calculate metrics
    const duration = (endTime - startTime) / 1000; // seconds
    results.throughput = results.totalRequests / duration;
    results.successRate = results.successfulRequests / results.totalRequests;
    results.averageResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
    results.percentiles = this.calculatePercentiles(results.responseTimes);

    return results;
  }

  /**
   * Execute individual request
   */
  async executeRequest(apiClient, config, results) {
    const requestStart = Date.now();
    
    try {
      const requestConfig = {
        method: config.method,
        url: config.endpoint,
        headers: config.headers || {},
        params: config.params || {},
        data: config.data || {}
      };

      const response = await apiClient.request(requestConfig);
      const responseTime = Date.now() - requestStart;
      
      results.responseTimes.push(responseTime);
      
      if (response.status >= 200 && response.status < 400) {
        results.successfulRequests++;
      } else {
        results.failedRequests++;
        results.errors.push({
          status: response.status,
          message: response.data?.error?.message || 'Unknown error',
          responseTime
        });
      }

    } catch (error) {
      const responseTime = Date.now() - requestStart;
      results.failedRequests++;
      results.responseTimes.push(responseTime);
      results.errors.push({
        status: 'NETWORK_ERROR',
        message: error.message,
        responseTime
      });
    }
  }

  /**
   * Calculate response time percentiles
   */
  calculatePercentiles(responseTimes) {
    if (responseTimes.length === 0) return {};
    
    const sorted = [...responseTimes].sort((a, b) => a - b);
    
    return {
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p75: sorted[Math.floor(sorted.length * 0.75)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      min: sorted[0],
      max: sorted[sorted.length - 1]
    };
  }

  /**
   * Calculate overall summary
   */
  calculateSummary() {
    let totalRequests = 0;
    let successfulRequests = 0;
    let failedRequests = 0;
    let totalResponseTime = 0;
    let totalDuration = 0;

    Object.values(this.results.scenarios).forEach(scenario => {
      totalRequests += scenario.totalRequests;
      successfulRequests += scenario.successfulRequests;
      failedRequests += scenario.failedRequests;
      totalResponseTime += scenario.averageResponseTime * scenario.totalRequests;
      
      const scenarioDuration = (scenario.endTime - scenario.startTime) / 1000;
      totalDuration = Math.max(totalDuration, scenarioDuration);
    });

    this.results.summary = {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: totalResponseTime / totalRequests,
      throughput: totalRequests / totalDuration,
      errorRate: failedRequests / totalRequests
    };
  }

  /**
   * Analyze performance against thresholds
   */
  analyzePerformance() {
    console.log('\n📊 Performance Analysis');
    console.log('======================');

    const issues = [];
    const thresholds = LOAD_TEST_CONFIG.thresholds;

    // Check response time thresholds
    Object.values(this.results.scenarios).forEach(scenario => {
      if (scenario.percentiles.p50 > thresholds.responseTime.p50) {
        issues.push(`${scenario.name}: P50 response time (${scenario.percentiles.p50}ms) exceeds threshold (${thresholds.responseTime.p50}ms)`);
      }
      
      if (scenario.percentiles.p95 > thresholds.responseTime.p95) {
        issues.push(`${scenario.name}: P95 response time (${scenario.percentiles.p95}ms) exceeds threshold (${thresholds.responseTime.p95}ms)`);
      }
      
      if (scenario.percentiles.p99 > thresholds.responseTime.p99) {
        issues.push(`${scenario.name}: P99 response time (${scenario.percentiles.p99}ms) exceeds threshold (${thresholds.responseTime.p99}ms)`);
      }
    });

    // Check error rate threshold
    if (this.results.summary.errorRate > thresholds.errorRate) {
      issues.push(`Overall error rate (${(this.results.summary.errorRate * 100).toFixed(2)}%) exceeds threshold (${(thresholds.errorRate * 100).toFixed(2)}%)`);
    }

    // Check throughput threshold
    if (this.results.summary.throughput < thresholds.throughput) {
      issues.push(`Overall throughput (${this.results.summary.throughput.toFixed(2)} req/s) below threshold (${thresholds.throughput} req/s)`);
    }

    if (issues.length > 0) {
      console.log('⚠️  Performance Issues Detected:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('✅ All performance thresholds met');
    }

    // Memory analysis
    const memoryIncrease = this.results.performance.memory.peak.heapUsed - this.results.performance.memory.initial.heapUsed;
    const memoryIncreasePercent = (memoryIncrease / this.results.performance.memory.initial.heapUsed * 100).toFixed(2);
    
    console.log(`\n💾 Memory Usage:`);
    console.log(`   Initial: ${Math.round(this.results.performance.memory.initial.heapUsed / 1024 / 1024)}MB`);
    console.log(`   Peak: ${Math.round(this.results.performance.memory.peak.heapUsed / 1024 / 1024)}MB`);
    console.log(`   Increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB (${memoryIncreasePercent}%)`);

    if (memoryIncrease > 100 * 1024 * 1024) { // 100MB increase
      console.log('⚠️  Significant memory increase detected - check for memory leaks');
    }
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport() {
    console.log('\n📈 Generating performance report...');

    const reportDir = path.join(__dirname, '../../reports/performance');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      timestamp: new Date(),
      summary: this.results.summary,
      scenarios: this.results.scenarios,
      performance: this.results.performance,
      thresholds: LOAD_TEST_CONFIG.thresholds,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    const reportPath = path.join(reportDir, `load-test-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Generate CSV for easy analysis
    const csvData = this.generateCsvReport();
    const csvPath = path.join(reportDir, `load-test-${Date.now()}.csv`);
    fs.writeFileSync(csvPath, csvData);

    console.log(`✅ Performance reports generated:`);
    console.log(`   JSON: ${reportPath}`);
    console.log(`   CSV: ${csvPath}`);
  }

  /**
   * Generate CSV report
   */
  generateCsvReport() {
    const headers = [
      'Scenario',
      'Total Requests',
      'Successful',
      'Failed',
      'Success Rate (%)',
      'Avg Response Time (ms)',
      'P50 (ms)',
      'P95 (ms)',
      'P99 (ms)',
      'Throughput (req/s)'
    ];

    const rows = Object.values(this.results.scenarios).map(scenario => [
      scenario.name,
      scenario.totalRequests,
      scenario.successfulRequests,
      scenario.failedRequests,
      (scenario.successRate * 100).toFixed(2),
      scenario.averageResponseTime.toFixed(2),
      scenario.percentiles.p50,
      scenario.percentiles.p95,
      scenario.percentiles.p99,
      scenario.throughput.toFixed(2)
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run load tests if called directly
if (require.main === module) {
  const loadTester = new LoadTester();
  
  loadTester.runLoadTests()
    .then((results) => {
      const hasIssues = results.summary.errorRate > LOAD_TEST_CONFIG.thresholds.errorRate;
      process.exit(hasIssues ? 1 : 0);
    })
    .catch((error) => {
      console.error('Load testing failed:', error);
      process.exit(1);
    });
}

module.exports = { LoadTester, LOAD_TEST_CONFIG };
