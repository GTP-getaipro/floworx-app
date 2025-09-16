/**
 * FloWorx API and Middleware Test Runner
 * Comprehensive testing orchestrator for all API endpoints and middleware
 */

const { FloWorxAPITester, MiddlewareValidator } = require('./test-api-middleware-comprehensive');
const fs = require('fs').promises;

class TestOrchestrator {
  constructor() {
    this.baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5000';
    this.results = {
      apiTests: null,
      middlewareValidation: null,
      summary: {
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        startTime: new Date(),
        endTime: null,
        duration: null
      }
    };
  }

  /**
   * Run all tests and validations
   */
  async runAllTests() {
    console.log('🚀 Starting Comprehensive FloWorx API & Middleware Testing');
    console.log(`🎯 Target: ${this.baseUrl}`);
    console.log('=' * 80);

    try {
      // Check if server is accessible
      await this.checkServerAccessibility();

      // Phase 1: Run comprehensive API tests
      console.log('\n📋 Phase 1: Comprehensive API Testing');
      const apiTester = new FloWorxAPITester();
      apiTester.baseUrl = this.baseUrl;
      this.results.apiTests = await apiTester.runAllTests();

      // Phase 2: Run middleware validation
      console.log('\n🔧 Phase 2: Middleware Validation');
      const middlewareValidator = new MiddlewareValidator(this.baseUrl);
      this.results.middlewareValidation = await middlewareValidator.validateMiddlewareStack();

      // Phase 3: Generate consolidated report
      await this.generateConsolidatedReport();

      return this.results;

    } catch (error) {
      console.error('❌ Test orchestration failed:', error.message);
      throw error;
    }
  }

  /**
   * Check if server is accessible before running tests
   */
  async checkServerAccessibility() {
    console.log('\n🔍 Checking server accessibility...');
    
    try {
      const axios = require('axios');
      const response = await axios.get(`${this.baseUrl}/api/health`, { timeout: 10000 });
      
      if (response.status === 200) {
        console.log('✅ Server is accessible and responding');
        return true;
      } else {
        throw new Error(`Server returned status ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.error('❌ Server is not running or not accessible');
        console.error('   Please ensure the FloWorx backend server is running on', this.baseUrl);
      } else if (error.code === 'ENOTFOUND') {
        console.error('❌ Server hostname could not be resolved');
        console.error('   Please check the server URL:', this.baseUrl);
      } else {
        console.error('❌ Server accessibility check failed:', error.message);
      }
      throw error;
    }
  }

  /**
   * Generate consolidated test report
   */
  async generateConsolidatedReport() {
    console.log('\n📊 Generating Consolidated Test Report...');

    this.results.summary.endTime = new Date();
    this.results.summary.duration = this.results.summary.endTime - this.results.summary.startTime;

    // Calculate totals from API tests
    if (this.results.apiTests?.overall) {
      this.results.summary.totalTests += this.results.apiTests.overall.totalTests;
      this.results.summary.passedTests += this.results.apiTests.overall.passedTests;
      this.results.summary.failedTests += this.results.apiTests.overall.failedTests;
    }

    // Calculate totals from middleware validation
    if (this.results.middlewareValidation) {
      const middlewareTests = Object.values(this.results.middlewareValidation);
      this.results.summary.totalTests += middlewareTests.length;
      this.results.summary.passedTests += middlewareTests.filter(t => t.status === 'PASSED').length;
      this.results.summary.failedTests += middlewareTests.filter(t => t.status === 'FAILED').length;
    }

    const successRate = this.results.summary.totalTests > 0 
      ? Math.round((this.results.summary.passedTests / this.results.summary.totalTests) * 100)
      : 0;

    // Display consolidated summary
    this.displayConsolidatedSummary(successRate);

    // Save detailed report
    const reportPath = `floworx-comprehensive-test-report-${Date.now()}.json`;
    await fs.writeFile(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`📄 Comprehensive report saved: ${reportPath}`);

    // Generate HTML report
    await this.generateHTMLReport(successRate);

    return this.results;
  }

  /**
   * Display consolidated summary
   */
  displayConsolidatedSummary(successRate) {
    console.log('\n' + '=' * 80);
    console.log('📊 FLOWORX COMPREHENSIVE TEST REPORT');
    console.log('=' * 80);

    console.log(`\n🎯 OVERALL RESULTS:`);
    console.log(`Total Tests: ${this.results.summary.totalTests}`);
    console.log(`Passed: ${this.results.summary.passedTests}`);
    console.log(`Failed: ${this.results.summary.failedTests}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Duration: ${Math.round(this.results.summary.duration / 1000)}s`);

    // API Test Summary
    if (this.results.apiTests) {
      console.log(`\n🌐 API TEST SUMMARY:`);
      console.log(`  Middleware Tests: ${Object.keys(this.results.apiTests.middleware).length}`);
      console.log(`  Security Tests: ${Object.keys(this.results.apiTests.security).length}`);
      console.log(`  Endpoint Tests: ${Object.keys(this.results.apiTests.endpoints).length}`);
      console.log(`  Performance Tests: ${Object.keys(this.results.apiTests.performance).length}`);
    }

    // Middleware Validation Summary
    if (this.results.middlewareValidation) {
      console.log(`\n🔧 MIDDLEWARE VALIDATION SUMMARY:`);
      Object.entries(this.results.middlewareValidation).forEach(([test, result]) => {
        const status = result.status === 'PASSED' ? '✅' : '❌';
        console.log(`  ${status} ${test}`);
      });
    }

    // Critical Issues
    const criticalIssues = this.identifyCriticalIssues();
    if (criticalIssues.length > 0) {
      console.log(`\n🚨 CRITICAL ISSUES IDENTIFIED:`);
      criticalIssues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }

    // Recommendations
    const recommendations = this.generateRecommendations(successRate);
    if (recommendations.length > 0) {
      console.log(`\n💡 RECOMMENDATIONS:`);
      recommendations.forEach((rec, index) => {
        console.log(`  ${index + 1}. ${rec}`);
      });
    }

    console.log('\n' + '=' * 80);
  }

  /**
   * Identify critical issues from test results
   */
  identifyCriticalIssues() {
    const issues = [];

    // Check API test results for critical failures
    if (this.results.apiTests) {
      // Check security test failures
      Object.entries(this.results.apiTests.security || {}).forEach(([test, result]) => {
        if (result.status === 'FAILED') {
          issues.push(`Security vulnerability: ${test} failed`);
        }
      });

      // Check authentication failures
      if (this.results.apiTests.middleware?.['Authentication']?.status === 'FAILED') {
        issues.push('Authentication middleware not working properly');
      }

      // Check error handling failures
      if (this.results.apiTests.middleware?.['Error Handling']?.status === 'FAILED') {
        issues.push('Error handling middleware not configured correctly');
      }
    }

    // Check middleware validation for critical failures
    if (this.results.middlewareValidation) {
      Object.entries(this.results.middlewareValidation).forEach(([test, result]) => {
        if (result.status === 'FAILED') {
          if (test.includes('Security') || test.includes('Authentication')) {
            issues.push(`Critical middleware failure: ${test}`);
          }
        }
      });
    }

    return issues;
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations(successRate) {
    const recommendations = [];

    if (successRate < 80) {
      recommendations.push('Overall success rate is below 80% - review and fix failing tests');
    }

    if (successRate < 60) {
      recommendations.push('Critical: Success rate is below 60% - immediate attention required');
    }

    // Check for specific issues
    if (this.results.apiTests?.security) {
      const securityFailures = Object.values(this.results.apiTests.security)
        .filter(test => test.status === 'FAILED').length;
      
      if (securityFailures > 0) {
        recommendations.push(`${securityFailures} security tests failed - review security configuration`);
      }
    }

    if (this.results.apiTests?.performance) {
      const perfFailures = Object.values(this.results.apiTests.performance)
        .filter(test => test.status === 'FAILED').length;
      
      if (perfFailures > 0) {
        recommendations.push(`${perfFailures} performance tests failed - optimize response times`);
      }
    }

    // Middleware-specific recommendations
    if (this.results.middlewareValidation) {
      const middlewareFailures = Object.entries(this.results.middlewareValidation)
        .filter(([_, result]) => result.status === 'FAILED');
      
      middlewareFailures.forEach(([test, _]) => {
        recommendations.push(`Fix middleware configuration: ${test}`);
      });
    }

    if (recommendations.length === 0) {
      recommendations.push('All tests passed - system is functioning correctly');
      recommendations.push('Consider adding more comprehensive tests for edge cases');
      recommendations.push('Monitor performance metrics in production');
    }

    return recommendations;
  }

  /**
   * Generate HTML report for stakeholders
   */
  async generateHTMLReport(successRate) {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>FloWorx API & Middleware Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .summary { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .success { background: #d4edda; border-left: 4px solid #28a745; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; }
        .danger { background: #f8d7da; border-left: 4px solid #dc3545; }
        .test-section { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .pass { color: #28a745; font-weight: bold; }
        .fail { color: #dc3545; font-weight: bold; }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
        .metric:last-child { border-bottom: none; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .status-passed { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 FloWorx API & Middleware Test Report</h1>
        <p>Comprehensive testing results for all endpoints and middleware components</p>
        <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
    </div>

    <div class="summary ${successRate >= 80 ? 'success' : successRate >= 60 ? 'warning' : 'danger'}">
        <h2>📊 Test Summary</h2>
        <div class="metric">
            <span><strong>Overall Success Rate:</strong></span>
            <span class="${successRate >= 80 ? 'pass' : 'fail'}">${successRate}%</span>
        </div>
        <div class="metric">
            <span><strong>Total Tests:</strong></span>
            <span>${this.results.summary.totalTests}</span>
        </div>
        <div class="metric">
            <span><strong>Passed:</strong></span>
            <span class="pass">${this.results.summary.passedTests}</span>
        </div>
        <div class="metric">
            <span><strong>Failed:</strong></span>
            <span class="fail">${this.results.summary.failedTests}</span>
        </div>
        <div class="metric">
            <span><strong>Duration:</strong></span>
            <span>${Math.round(this.results.summary.duration / 1000)}s</span>
        </div>
    </div>

    ${this.results.middlewareValidation ? `
    <div class="test-section">
        <h3>🔧 Middleware Validation Results</h3>
        <table>
            <thead>
                <tr>
                    <th>Middleware Component</th>
                    <th>Status</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(this.results.middlewareValidation).map(([test, result]) => `
                    <tr>
                        <td>${test}</td>
                        <td class="status-${result.status.toLowerCase()}">${result.status}</td>
                        <td>${result.error || 'Validation passed'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    ${this.identifyCriticalIssues().length > 0 ? `
    <div class="test-section danger">
        <h3>🚨 Critical Issues</h3>
        <ul>
            ${this.identifyCriticalIssues().map(issue => `<li>${issue}</li>`).join('')}
        </ul>
    </div>
    ` : ''}

    <div class="test-section">
        <h3>💡 Recommendations</h3>
        <ul>
            ${this.generateRecommendations(successRate).map(rec => `<li>${rec}</li>`).join('')}
        </ul>
    </div>

    <div class="test-section">
        <h3>📋 Next Steps</h3>
        <ol>
            <li>Review and address any failed tests</li>
            <li>Fix critical security or authentication issues</li>
            <li>Optimize performance where needed</li>
            <li>Re-run tests to verify fixes</li>
            <li>Deploy to production once all tests pass</li>
        </ol>
    </div>
</body>
</html>`;

    const htmlPath = `floworx-test-report-${Date.now()}.html`;
    await fs.writeFile(htmlPath, htmlContent);
    console.log(`📄 HTML report saved: ${htmlPath}`);
  }
}

// Run tests if called directly
if (require.main === module) {
  const orchestrator = new TestOrchestrator();
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  if (args.includes('--url')) {
    const urlIndex = args.indexOf('--url');
    if (args[urlIndex + 1]) {
      orchestrator.baseUrl = args[urlIndex + 1];
    }
  }

  orchestrator.runAllTests()
    .then(results => {
      const successRate = results.summary.totalTests > 0 
        ? (results.summary.passedTests / results.summary.totalTests) * 100
        : 0;
      
      console.log(`\n🎉 Comprehensive testing completed!`);
      console.log(`📊 Final Success Rate: ${Math.round(successRate)}%`);
      
      if (successRate >= 80) {
        console.log('✅ System is ready for production deployment');
        process.exit(0);
      } else if (successRate >= 60) {
        console.log('⚠️ System has issues but may be deployable with fixes');
        process.exit(1);
      } else {
        console.log('❌ System has critical issues - deployment not recommended');
        process.exit(2);
      }
    })
    .catch(error => {
      console.error('\n💥 Comprehensive testing failed:', error.message);
      console.error('Please ensure the FloWorx backend server is running and accessible');
      process.exit(3);
    });
}

module.exports = TestOrchestrator;
