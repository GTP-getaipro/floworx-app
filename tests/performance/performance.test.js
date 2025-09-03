const autocannon = require('autocannon');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

/**
 * Performance test suite for API endpoints
 */
class PerformanceTest {
  constructor(options = {}) {
    this.options = {
      url: options.url || 'http://localhost:5001',
      duration: options.duration || 30,
      connections: options.connections || 100,
      pipelining: options.pipelining || 10,
      timeout: options.timeout || 10,
      ...options
    };

    this.results = new Map();
  }

  /**
   * Run performance tests
   */
  async runTests() {
    console.log('\nStarting performance tests...\n');
    
    // Define test scenarios
    const scenarios = [
      {
        name: 'Health Check',
        path: '/health',
        method: 'GET'
      },
      {
        name: 'Authentication',
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      },
      {
        name: 'User Profile',
        path: '/api/users/profile',
        method: 'GET',
        setupRequest: async () => ({
          headers: {
            'Authorization': `Bearer ${await this.getTestToken()}`
          }
        })
      },
      {
        name: 'Company Data',
        path: '/api/companies',
        method: 'GET',
        setupRequest: async () => ({
          headers: {
            'Authorization': `Bearer ${await this.getTestToken()}`
          }
        })
      }
    ];

    // Run each scenario
    for (const scenario of scenarios) {
      const result = await this.runScenario(scenario);
      this.results.set(scenario.name, result);
    }

    // Generate report
    await this.generateReport();
  }

  /**
   * Run a single test scenario
   */
  async runScenario(scenario) {
    console.log(`Running scenario: ${scenario.name}`);

    // Set up request configuration
    const requestConfig = scenario.setupRequest
      ? await scenario.setupRequest()
      : {};

    const config = {
      ...this.options,
      title: scenario.name,
      url: this.options.url + scenario.path,
      method: scenario.method,
      headers: {
        ...requestConfig.headers,
        ...scenario.headers
      },
      body: scenario.body
    };

    // Run test
    const result = await promisify(autocannon)(config);

    console.log(`Completed scenario: ${scenario.name}\n`);
    return result;
  }

  /**
   * Get test authentication token
   */
  async getTestToken() {
    const response = await fetch(this.options.url + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    const data = await response.json();
    return data.token;
  }

  /**
   * Generate performance report
   */
  async generateReport() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = path.join(process.cwd(), 'test-results', 'performance');
    
    // Create report directory
    await fs.mkdir(reportDir, { recursive: true });

    // Generate report data
    const report = {
      timestamp,
      summary: {},
      scenarios: {}
    };

    let totalRequests = 0;
    let totalLatency = 0;
    let totalErrors = 0;

    // Process each scenario result
    for (const [name, result] of this.results.entries()) {
      const scenarioData = {
        requests: {
          total: result.requests.total,
          average: result.requests.average,
          sent: result.requests.sent
        },
        latency: {
          average: result.latency.average,
          min: result.latency.min,
          max: result.latency.max,
          p99: result.latency.p99
        },
        throughput: {
          average: result.throughput.average,
          min: result.throughput.min,
          max: result.throughput.max
        },
        errors: result.errors,
        timeouts: result.timeouts,
        duration: result.duration,
        start: result.start,
        finish: result.finish
      };

      report.scenarios[name] = scenarioData;

      // Update totals
      totalRequests += result.requests.total;
      totalLatency += result.latency.average;
      totalErrors += result.errors;
    }

    // Calculate summary
    report.summary = {
      totalScenarios: this.results.size,
      totalRequests,
      averageLatency: totalLatency / this.results.size,
      totalErrors,
      duration: this.options.duration,
      connections: this.options.connections,
      pipelining: this.options.pipelining
    };

    // Write report to file
    const reportPath = path.join(reportDir, `report-${timestamp}.json`);
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHtmlReport(report);
    const htmlPath = path.join(reportDir, `report-${timestamp}.html`);
    await fs.writeFile(htmlPath, htmlReport);

    console.log(`\nPerformance test results saved to: ${reportPath}`);
    console.log(`HTML report saved to: ${htmlPath}\n`);

    // Print summary to console
    this.printSummary(report);
  }

  /**
   * Generate HTML report
   */
  generateHtmlReport(report) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Performance Test Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1, h2 { color: #333; }
            .summary { background: #f5f5f5; padding: 20px; border-radius: 5px; }
            .scenario { margin: 20px 0; padding: 20px; border: 1px solid #ddd; }
            .metric { margin: 10px 0; }
            .error { color: #ff0000; }
          </style>
        </head>
        <body>
          <h1>Performance Test Report</h1>
          <div class="summary">
            <h2>Summary</h2>
            <div class="metric">Total Scenarios: ${report.summary.totalScenarios}</div>
            <div class="metric">Total Requests: ${report.summary.totalRequests}</div>
            <div class="metric">Average Latency: ${report.summary.averageLatency.toFixed(2)}ms</div>
            <div class="metric">Total Errors: ${report.summary.totalErrors}</div>
            <div class="metric">Duration: ${report.summary.duration}s</div>
            <div class="metric">Connections: ${report.summary.connections}</div>
          </div>
          
          <h2>Scenario Results</h2>
          ${Object.entries(report.scenarios)
            .map(([name, data]) => `
              <div class="scenario">
                <h3>${name}</h3>
                <div class="metric">Total Requests: ${data.requests.total}</div>
                <div class="metric">Average RPS: ${data.requests.average.toFixed(2)}</div>
                <div class="metric">Average Latency: ${data.latency.average.toFixed(2)}ms</div>
                <div class="metric">P99 Latency: ${data.latency.p99.toFixed(2)}ms</div>
                <div class="metric">Average Throughput: ${(data.throughput.average / 1024 / 1024).toFixed(2)}MB/s</div>
                ${data.errors ? `<div class="error">Errors: ${data.errors}</div>` : ''}
              </div>
            `).join('')}
        </body>
      </html>
    `;
  }

  /**
   * Print summary to console
   */
  printSummary(report) {
    console.log('\nPerformance Test Summary');
    console.log('=======================');
    console.log(`Total Scenarios: ${report.summary.totalScenarios}`);
    console.log(`Total Requests: ${report.summary.totalRequests}`);
    console.log(`Average Latency: ${report.summary.averageLatency.toFixed(2)}ms`);
    console.log(`Total Errors: ${report.summary.totalErrors}`);
    console.log(`Duration: ${report.summary.duration}s`);
    console.log('\nScenario Results:');
    
    Object.entries(report.scenarios).forEach(([name, data]) => {
      console.log(`\n${name}`);
      console.log(`  Requests: ${data.requests.total}`);
      console.log(`  Avg RPS: ${data.requests.average.toFixed(2)}`);
      console.log(`  Avg Latency: ${data.latency.average.toFixed(2)}ms`);
      console.log(`  P99 Latency: ${data.latency.p99.toFixed(2)}ms`);
      if (data.errors) {
        console.log(`  Errors: ${data.errors}`);
      }
    });
  }
}

// Run tests if called directly
if (require.main === module) {
  const test = new PerformanceTest();
  test.runTests().catch(console.error);
}

module.exports = PerformanceTest;
