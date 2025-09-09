#!/usr/bin/env node

/**
 * Supabase Connection Test
 * Tests the Supabase connection and identifies specific issues
 */

const axios = require('axios');

class SupabaseConnectionTester {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com';
    this.issues = [];
    this.recommendations = [];
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 15000
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return {
        success: true,
        status: response.status,
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      return {
        success: false,
        status: error.response?.status || 0,
        data: error.response?.data || error.message,
        headers: error.response?.headers || {},
        error: error.message
      };
    }
  }

  async testSupabaseConnection() {
    this.log('\n🔌 TESTING SUPABASE CONNECTION', 'info');
    
    // Test health endpoint to see database status
    const healthResult = await this.makeRequest('GET', '/api/health');
    
    if (healthResult.success) {
      const dbStatus = healthResult.data.database;
      this.log(`Database Provider: ${dbStatus.provider}`, 'info');
      this.log(`Database Connected: ${dbStatus.connected}`, dbStatus.connected ? 'success' : 'error');
      
      if (!dbStatus.connected) {
        this.issues.push({
          category: 'DATABASE_CONNECTION',
          severity: 'CRITICAL',
          issue: 'Supabase database connection failed',
          details: dbStatus.error || 'Connection test failed',
          possibleCauses: [
            'Invalid SUPABASE_URL environment variable',
            'Invalid SUPABASE_ANON_KEY environment variable',
            'Invalid SUPABASE_SERVICE_ROLE_KEY environment variable',
            'Supabase project is paused or deleted',
            'Network connectivity issues',
            'Row Level Security blocking connection test'
          ]
        });
      }
    } else {
      this.log(`❌ Health endpoint failed: ${healthResult.status}`, 'error');
    }
  }

  async testSupabaseAuth() {
    this.log('\n🔐 TESTING SUPABASE AUTH INTEGRATION', 'info');
    
    // Test registration with detailed logging
    const testUser = {
      firstName: 'Test',
      lastName: 'User',
      email: `test.${Date.now()}@example.com`,
      password: 'TestPassword123!',
      businessName: 'Test Company',
      agreeToTerms: true
    };

    this.log(`📧 Testing with email: ${testUser.email}`, 'info');
    
    const regResult = await this.makeRequest('POST', '/api/auth/register', testUser);
    
    this.log(`Registration Status: ${regResult.status}`, regResult.success ? 'success' : 'error');
    
    if (!regResult.success) {
      if (regResult.status === 500) {
        this.issues.push({
          category: 'SUPABASE_AUTH',
          severity: 'CRITICAL',
          issue: 'Supabase Auth registration failing',
          details: regResult.data,
          possibleCauses: [
            'Supabase Auth not properly configured',
            'Users table does not exist or has wrong schema',
            'Row Level Security policies blocking inserts',
            'Service role key lacks necessary permissions',
            'JWT secret mismatch between app and Supabase'
          ]
        });
        
        this.log(`❌ Registration failed with 500 error`, 'error');
        this.log(`Error details: ${JSON.stringify(regResult.data, null, 2)}`, 'error');
      } else if (regResult.status === 400) {
        this.log(`⚠️  Registration failed with 400 - may be validation issue`, 'warning');
        this.log(`Error details: ${JSON.stringify(regResult.data, null, 2)}`, 'warning');
      }
    } else {
      this.log(`✅ Registration successful!`, 'success');
      
      // Test login with the same user
      const loginResult = await this.makeRequest('POST', '/api/auth/login', {
        email: testUser.email,
        password: testUser.password
      });
      
      if (loginResult.success) {
        this.log(`✅ Login successful!`, 'success');
      } else {
        this.log(`❌ Login failed: ${loginResult.status}`, 'error');
        this.issues.push({
          category: 'SUPABASE_AUTH',
          severity: 'HIGH',
          issue: 'Login failing after successful registration',
          details: loginResult.data
        });
      }
    }
  }

  async testSupabaseSchema() {
    this.log('\n📋 TESTING SUPABASE SCHEMA', 'info');
    
    // Try to access user status endpoint to test if users table exists
    const statusResult = await this.makeRequest('GET', '/api/user/status', null, {
      'Authorization': 'Bearer fake-token-for-schema-test'
    });
    
    if (statusResult.status === 401) {
      this.log(`✅ User status endpoint exists (returns 401 as expected)`, 'success');
    } else if (statusResult.status === 404) {
      this.issues.push({
        category: 'API_ROUTING',
        severity: 'HIGH',
        issue: 'User status endpoint not found',
        details: 'GET /api/user/status returns 404'
      });
    } else if (statusResult.status === 500) {
      this.issues.push({
        category: 'SUPABASE_SCHEMA',
        severity: 'CRITICAL',
        issue: 'User status endpoint failing with server error',
        details: 'May indicate users table or schema issues'
      });
    }
  }

  async testPasswordResetEndpoint() {
    this.log('\n🔄 TESTING PASSWORD RESET ENDPOINT', 'info');
    
    const resetResult = await this.makeRequest('POST', '/api/auth/forgot-password', {
      email: 'test@example.com'
    });
    
    if (resetResult.status === 404) {
      this.issues.push({
        category: 'API_ROUTING',
        severity: 'CRITICAL',
        issue: 'Password reset endpoint not found',
        details: 'POST /api/auth/forgot-password returns 404',
        impact: 'Users cannot reset their passwords'
      });
      
      this.recommendations.push({
        priority: 'HIGH',
        action: 'Implement password reset endpoint',
        details: [
          'Create /api/auth/forgot-password endpoint',
          'Integrate with Supabase Auth password reset',
          'Configure email templates in Supabase',
          'Set up proper redirect URLs'
        ]
      });
    } else {
      this.log(`Password reset endpoint status: ${resetResult.status}`, 'info');
    }
  }

  async runSupabaseTests() {
    this.log('🧪 STARTING SUPABASE CONNECTION TESTS', 'info');
    this.log(`🌐 Target: ${this.baseURL}`, 'info');
    this.log('=' * 60, 'info');

    try {
      await this.testSupabaseConnection();
      await this.testSupabaseAuth();
      await this.testSupabaseSchema();
      await this.testPasswordResetEndpoint();
      
      this.generateSupabaseReport();
      
    } catch (error) {
      this.log(`💥 Supabase tests failed: ${error.message}`, 'error');
    }
  }

  generateSupabaseReport() {
    this.log('\n📊 SUPABASE CONNECTION TEST RESULTS', 'info');
    this.log('=' * 60, 'info');
    
    const critical = this.issues.filter(i => i.severity === 'CRITICAL');
    const high = this.issues.filter(i => i.severity === 'HIGH');
    
    if (critical.length === 0 && high.length === 0) {
      this.log('🎉 SUPABASE CONNECTION: HEALTHY', 'success');
      this.log('All Supabase tests passed successfully!', 'success');
    } else {
      this.log(`🚨 CRITICAL SUPABASE ISSUES: ${critical.length}`, 'error');
      critical.forEach((issue, index) => {
        this.log(`\n${index + 1}. [${issue.category}] ${issue.issue}`, 'error');
        this.log(`   Details: ${JSON.stringify(issue.details)}`, 'error');
        if (issue.possibleCauses) {
          this.log(`   Possible Causes:`, 'error');
          issue.possibleCauses.forEach(cause => {
            this.log(`   • ${cause}`, 'error');
          });
        }
      });
      
      if (high.length > 0) {
        this.log(`\n⚠️  HIGH PRIORITY ISSUES: ${high.length}`, 'warning');
        high.forEach((issue, index) => {
          this.log(`${index + 1}. [${issue.category}] ${issue.issue}`, 'warning');
        });
      }
    }
    
    if (this.recommendations.length > 0) {
      this.log('\n🎯 RECOMMENDED ACTIONS:', 'info');
      this.recommendations.forEach((rec, index) => {
        this.log(`\n${index + 1}. [${rec.priority}] ${rec.action}`, 'info');
        rec.details.forEach(detail => {
          this.log(`   • ${detail}`, 'info');
        });
      });
    }
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      baseURL: this.baseURL,
      summary: {
        totalIssues: this.issues.length,
        critical: critical.length,
        high: high.length
      },
      issues: this.issues,
      recommendations: this.recommendations
    };
    
    require('fs').writeFileSync('./supabase-test-report.json', JSON.stringify(report, null, 2));
    this.log('\n📄 Detailed Supabase report saved to: ./supabase-test-report.json', 'info');
  }
}

// Run the Supabase tests
if (require.main === module) {
  const tester = new SupabaseConnectionTester();
  tester.runSupabaseTests().catch(error => {
    console.error('❌ Supabase test error:', error);
    process.exit(1);
  });
}

module.exports = SupabaseConnectionTester;
