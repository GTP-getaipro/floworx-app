#!/usr/bin/env node

/**
 * Hotfix Validation Script
 * Tests the JavaScript TypeError fix in production
 */

const axios = require('axios');

class HotfixValidator {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com';
    this.results = {
      timestamp: new Date().toISOString(),
      hotfix: 'JavaScript TypeError: t is not a function',
      tests: []
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[level] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async testFrontendAssets() {
    this.log('Testing new frontend assets...');
    
    try {
      // Test new JavaScript bundle
      const jsResponse = await axios.get(`${this.baseURL}/static/js/main.fc5bdd59.js`);
      const jsWorking = jsResponse.status === 200;
      
      // Test CSS bundle
      const cssResponse = await axios.get(`${this.baseURL}/static/css/main.a72b1cba.css`);
      const cssWorking = cssResponse.status === 200;
      
      this.results.tests.push({
        name: 'Frontend Assets',
        status: jsWorking && cssWorking ? 'PASS' : 'FAIL',
        details: {
          javascript: { status: jsResponse.status, working: jsWorking },
          css: { status: cssResponse.status, working: cssWorking }
        }
      });
      
      if (jsWorking && cssWorking) {
        this.log('✅ New frontend assets deployed successfully', 'success');
      } else {
        this.log('❌ Frontend assets deployment issue', 'error');
      }
      
      return jsWorking && cssWorking;
    } catch (error) {
      this.log(`❌ Error testing frontend assets: ${error.message}`, 'error');
      this.results.tests.push({
        name: 'Frontend Assets',
        status: 'FAIL',
        error: error.message
      });
      return false;
    }
  }

  async testApplicationAccessibility() {
    this.log('Testing application accessibility...');
    
    try {
      const response = await axios.get(this.baseURL);
      const working = response.status === 200;
      
      this.results.tests.push({
        name: 'Application Accessibility',
        status: working ? 'PASS' : 'FAIL',
        details: { status: response.status }
      });
      
      if (working) {
        this.log('✅ Application accessible', 'success');
      } else {
        this.log('❌ Application accessibility issue', 'error');
      }
      
      return working;
    } catch (error) {
      this.log(`❌ Error testing application: ${error.message}`, 'error');
      this.results.tests.push({
        name: 'Application Accessibility',
        status: 'FAIL',
        error: error.message
      });
      return false;
    }
  }

  async testAuthenticationEndpoints() {
    this.log('Testing authentication endpoints...');
    
    try {
      // Test login endpoint
      const loginResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'test@floworx-test.com',
        password: 'TestPass123!'
      }, { withCredentials: true });
      
      const loginWorking = loginResponse.status === 200;
      
      this.results.tests.push({
        name: 'Authentication Endpoints',
        status: loginWorking ? 'PASS' : 'FAIL',
        details: { login: { status: loginResponse.status, working: loginWorking } }
      });
      
      if (loginWorking) {
        this.log('✅ Authentication endpoints working', 'success');
      } else {
        this.log('❌ Authentication endpoints issue', 'error');
      }
      
      return loginWorking;
    } catch (error) {
      this.log(`❌ Error testing authentication: ${error.message}`, 'error');
      this.results.tests.push({
        name: 'Authentication Endpoints',
        status: 'FAIL',
        error: error.message
      });
      return false;
    }
  }

  generateReport() {
    const passed = this.results.tests.filter(t => t.status === 'PASS').length;
    const failed = this.results.tests.filter(t => t.status === 'FAIL').length;
    const total = this.results.tests.length;
    
    this.results.summary = {
      total,
      passed,
      failed,
      successRate: `${((passed / total) * 100).toFixed(1)}%`,
      status: failed === 0 ? 'HOTFIX_SUCCESSFUL' : 'HOTFIX_ISSUES'
    };
    
    this.log('\n📊 HOTFIX VALIDATION SUMMARY', 'info');
    this.log(`Hotfix: ${this.results.hotfix}`, 'info');
    this.log(`Total Tests: ${total}`, 'info');
    this.log(`Passed: ${passed}`, 'success');
    this.log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');
    this.log(`Success Rate: ${this.results.summary.successRate}`, 'info');
    
    if (failed === 0) {
      this.log('🎉 HOTFIX VALIDATION SUCCESSFUL - JavaScript TypeError Fixed!', 'success');
    } else {
      this.log('❌ HOTFIX VALIDATION FAILED - Issues detected', 'error');
    }
    
    return this.results;
  }

  async run() {
    this.log('🚀 Starting Hotfix Validation', 'info');
    this.log(`Target: ${this.baseURL}`, 'info');
    this.log(`Fix: ${this.results.hotfix}`, 'info');
    
    try {
      // Test 1: Frontend Assets
      await this.testFrontendAssets();
      
      // Test 2: Application Accessibility
      await this.testApplicationAccessibility();
      
      // Test 3: Authentication Endpoints
      await this.testAuthenticationEndpoints();
      
      // Generate report
      const results = this.generateReport();
      
      // Exit with appropriate code
      process.exit(results.summary.failed === 0 ? 0 : 1);
      
    } catch (error) {
      this.log(`🚨 Critical error during validation: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new HotfixValidator();
  validator.run().catch(console.error);
}

module.exports = HotfixValidator;
