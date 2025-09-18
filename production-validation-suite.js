#!/usr/bin/env node

/**
 * Production Validation Suite
 * Comprehensive post-deployment validation for Client Config, Mailbox, n8n Integration
 */

const axios = require('axios');
const fs = require('fs');

class ProductionValidator {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com';
    this.results = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      deployment: 'Client Config, Mailbox Provisioning & n8n Integration v1.0',
      totalTests: 0,
      passed: 0,
      failed: 0,
      errors: [],
      details: {},
      criticalIssues: [],
      warnings: []
    };
    
    this.testUser = {
      email: 'test@floworx-test.com',
      password: 'TestPass123!'
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      critical: '🚨'
    }[level] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runTest(testName, testFunction, critical = false) {
    this.results.totalTests++;
    this.log(`Running: ${testName}`);
    
    try {
      const result = await testFunction();
      this.results.passed++;
      this.results.details[testName] = { status: 'PASS', result, critical };
      this.log(`✅ PASS: ${testName}`, 'success');
      return result;
    } catch (error) {
      this.results.failed++;
      this.results.errors.push({ test: testName, error: error.message, critical });
      this.results.details[testName] = { status: 'FAIL', error: error.message, critical };
      
      if (critical) {
        this.results.criticalIssues.push({ test: testName, error: error.message });
        this.log(`🚨 CRITICAL FAIL: ${testName} - ${error.message}`, 'critical');
      } else {
        this.log(`❌ FAIL: ${testName} - ${error.message}`, 'error');
      }
      
      if (critical) {
        throw error; // Stop execution on critical failures
      }
      return null;
    }
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    const config = {
      method,
      url: `${this.baseURL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      withCredentials: true,
      timeout: 30000
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response;
    } catch (error) {
      if (error.response) {
        throw new Error(`HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  // ==================== CRITICAL SYSTEM HEALTH TESTS ====================

  async testSystemHealth() {
    this.log('\n🏥 CRITICAL SYSTEM HEALTH TESTS', 'info');
    
    // Test 1: Application Accessibility
    await this.runTest('Application Accessibility', async () => {
      const response = await this.makeRequest('GET', '/');
      return { status: response.status, accessible: response.status === 200 };
    }, true);

    // Test 2: API Health Check
    await this.runTest('API Health Check', async () => {
      const response = await this.makeRequest('GET', '/api/health');
      return { status: response.status, healthy: response.status === 200 };
    }, true);

    // Test 3: Database Connectivity
    await this.runTest('Database Connectivity', async () => {
      // Test with a simple authenticated endpoint that requires DB
      const loginResponse = await this.makeRequest('POST', '/api/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password
      });
      return { status: loginResponse.status, dbConnected: loginResponse.status === 200 };
    }, true);
  }

  // ==================== AUTHENTICATION VALIDATION ====================

  async testAuthentication() {
    this.log('\n🔐 AUTHENTICATION VALIDATION', 'info');
    
    // Test 1: User Login
    await this.runTest('User Login', async () => {
      const response = await this.makeRequest('POST', '/api/auth/login', {
        email: this.testUser.email,
        password: this.testUser.password
      });
      return { status: response.status, loginSuccessful: response.status === 200 };
    }, true);

    // Test 2: Registration Flow
    await this.runTest('Registration Flow', async () => {
      try {
        const response = await this.makeRequest('POST', '/api/auth/register', {
          email: 'newtest@floworx-test.com',
          password: 'TestPass123!',
          firstName: 'New',
          lastName: 'User',
          businessName: 'Test Business',
          phone: '+1234567890',
          agreeToTerms: true,
          marketingConsent: false
        });
        return { status: response.status, registrationWorking: true };
      } catch (error) {
        if (error.message.includes('409') || error.message.includes('already registered')) {
          return { status: 'existing', registrationWorking: true, message: 'User already exists' };
        }
        throw error;
      }
    });

    // Test 3: Password Reset
    await this.runTest('Password Reset', async () => {
      const response = await this.makeRequest('POST', '/api/auth/forgot-password', {
        email: this.testUser.email
      });
      return { status: response.status, resetWorking: response.status === 200 };
    });
  }

  // ==================== CLIENT CONFIG VALIDATION ====================

  async testClientConfig() {
    this.log('\n🔧 CLIENT CONFIG VALIDATION', 'info');
    
    // Test 1: Config Retrieval
    await this.runTest('Config Retrieval', async () => {
      const response = await this.makeRequest('GET', '/api/clients/1/config');
      return { 
        status: response.status, 
        hasConfig: !!response.data,
        version: response.data?.version 
      };
    });

    // Test 2: Config Update
    await this.runTest('Config Update', async () => {
      const configUpdate = {
        client: {
          name: "Production Test Company",
          timezone: "America/New_York"
        },
        channels: {
          email: {
            provider: "gmail",
            label_map: {
              "Sales": "Sales",
              "Support": "Support"
            }
          }
        },
        people: {
          managers: [
            { name: "Test Manager", email: "manager@test.com" }
          ]
        }
      };

      const response = await this.makeRequest('PUT', '/api/clients/1/config', configUpdate);
      return { 
        status: response.status, 
        updateSuccessful: response.status === 200,
        newVersion: response.data?.version 
      };
    });
  }

  // ==================== MAILBOX PROVISIONING VALIDATION ====================

  async testMailboxProvisioning() {
    this.log('\n📧 MAILBOX PROVISIONING VALIDATION', 'info');
    
    // Test 1: Mailbox Discovery
    await this.runTest('Mailbox Discovery', async () => {
      const response = await this.makeRequest('GET', '/api/mailbox/discover?provider=gmail');
      return { 
        status: response.status, 
        hasLabels: !!response.data?.labels,
        hasTaxonomy: !!response.data?.taxonomy 
      };
    });

    // Test 2: Mailbox Mapping
    await this.runTest('Mailbox Mapping', async () => {
      const mappingData = {
        provider: 'gmail',
        mapping: {
          'Sales': 'SALES',
          'Support': 'SUPPORT'
        }
      };

      const response = await this.makeRequest('PUT', '/api/mailbox/mapping', mappingData);
      return { 
        status: response.status, 
        mappingSuccessful: response.status === 200 
      };
    });
  }

  // ==================== UI VALIDATION ====================

  async testUIComponents() {
    this.log('\n🎨 UI COMPONENT VALIDATION', 'info');
    
    // Test 1: Frontend Bundle Loading
    await this.runTest('Frontend Bundle Loading', async () => {
      const response = await this.makeRequest('GET', '/static/js/main.9e1334d4.js');
      return { 
        status: response.status, 
        bundleLoaded: response.status === 200,
        size: response.headers['content-length'] 
      };
    });

    // Test 2: CSS Loading
    await this.runTest('CSS Loading', async () => {
      const response = await this.makeRequest('GET', '/static/css/main.f855e6bc.css');
      return { 
        status: response.status, 
        cssLoaded: response.status === 200 
      };
    });
  }

  // ==================== MAIN EXECUTION ====================

  async run() {
    this.log('🚀 Starting Production Validation Suite', 'info');
    this.log(`Environment: ${this.baseURL}`, 'info');
    this.log(`Deployment: ${this.results.deployment}`, 'info');
    
    try {
      // Phase 1: Critical System Health (must pass)
      await this.testSystemHealth();
      
      // Phase 2: Authentication (critical)
      await this.testAuthentication();
      
      // Phase 3: Client Config Features
      await this.testClientConfig();
      
      // Phase 4: Mailbox Provisioning Features
      await this.testMailboxProvisioning();
      
      // Phase 5: UI Components
      await this.testUIComponents();
      
      // Generate final report
      this.generateReport();
      
    } catch (error) {
      this.log(`🚨 CRITICAL ERROR: ${error.message}`, 'critical');
      this.results.criticalError = error.message;
      this.generateReport();
      process.exit(1);
    }
  }

  generateReport() {
    const reportPath = 'PRODUCTION-VALIDATION-REPORT.json';
    
    this.results.summary = {
      totalTests: this.results.totalTests,
      passed: this.results.passed,
      failed: this.results.failed,
      successRate: `${((this.results.passed / this.results.totalTests) * 100).toFixed(1)}%`,
      criticalIssues: this.results.criticalIssues.length,
      status: this.results.criticalIssues.length === 0 ? 
        (this.results.failed === 0 ? 'PRODUCTION_HEALTHY' : 'PRODUCTION_STABLE_WITH_WARNINGS') : 
        'PRODUCTION_CRITICAL_ISSUES'
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    this.log('\n📊 PRODUCTION VALIDATION SUMMARY', 'info');
    this.log(`Total Tests: ${this.results.totalTests}`, 'info');
    this.log(`Passed: ${this.results.passed}`, 'success');
    this.log(`Failed: ${this.results.failed}`, this.results.failed > 0 ? 'error' : 'info');
    this.log(`Critical Issues: ${this.results.criticalIssues.length}`, 
      this.results.criticalIssues.length > 0 ? 'critical' : 'success');
    this.log(`Success Rate: ${this.results.summary.successRate}`, 'info');
    this.log(`Report saved: ${reportPath}`, 'info');
    
    if (this.results.criticalIssues.length === 0) {
      if (this.results.failed === 0) {
        this.log('🎉 PRODUCTION DEPLOYMENT SUCCESSFUL - ALL SYSTEMS OPERATIONAL!', 'success');
      } else {
        this.log('✅ PRODUCTION DEPLOYMENT STABLE - Minor issues detected but not critical', 'warning');
      }
    } else {
      this.log('🚨 PRODUCTION DEPLOYMENT HAS CRITICAL ISSUES - IMMEDIATE ATTENTION REQUIRED!', 'critical');
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ProductionValidator();
  validator.run().catch(console.error);
}

module.exports = ProductionValidator;
