#!/usr/bin/env node

/**
 * Production Issue Diagnostic Tool
 * Comprehensive analysis of https://app.floworx-iq.com issues
 */

const axios = require('axios');

class ProductionDiagnostic {
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
        timeout: 10000
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

  async diagnoseDatabase() {
    this.log('\n🗄️  DIAGNOSING DATABASE CONNECTIVITY', 'info');
    
    const healthResult = await this.makeRequest('GET', '/api/health');
    
    if (healthResult.success && healthResult.data.database) {
      const dbStatus = healthResult.data.database;
      
      if (!dbStatus.connected) {
        this.issues.push({
          category: 'DATABASE',
          severity: 'CRITICAL',
          issue: 'Database not connected',
          details: `Provider: ${dbStatus.provider}, Connected: ${dbStatus.connected}`,
          impact: 'All user operations (registration, login, data storage) will fail'
        });
        
        this.recommendations.push({
          priority: 'HIGH',
          action: 'Check Supabase connection configuration',
          details: [
            'Verify SUPABASE_URL environment variable',
            'Verify SUPABASE_ANON_KEY environment variable', 
            'Check Supabase project status',
            'Verify database connection string',
            'Check network connectivity to Supabase'
          ]
        });
      } else {
        this.log('✅ Database connectivity appears normal', 'success');
      }
    }
  }

  async diagnoseAPIEndpoints() {
    this.log('\n🔌 DIAGNOSING API ENDPOINTS', 'info');
    
    const endpoints = [
      { path: '/api/auth/register', method: 'POST', critical: true },
      { path: '/api/auth/login', method: 'POST', critical: true },
      { path: '/api/auth/forgot-password', method: 'POST', critical: true },
      { path: '/api/user/status', method: 'GET', critical: true },
      { path: '/api/dashboard', method: 'GET', critical: true },
      { path: '/api/oauth/google', method: 'GET', critical: false }
    ];

    for (const endpoint of endpoints) {
      const testData = endpoint.method === 'POST' ? { test: 'data' } : null;
      const result = await this.makeRequest(endpoint.method, endpoint.path, testData);
      
      if (result.status === 404) {
        this.issues.push({
          category: 'API_ROUTING',
          severity: endpoint.critical ? 'CRITICAL' : 'MEDIUM',
          issue: `Endpoint not found: ${endpoint.path}`,
          details: `${endpoint.method} ${endpoint.path} returns 404`,
          impact: endpoint.critical ? 'Core functionality broken' : 'Feature unavailable'
        });
      } else if (result.status === 500) {
        this.issues.push({
          category: 'SERVER_ERROR',
          severity: 'CRITICAL',
          issue: `Server error on: ${endpoint.path}`,
          details: `${endpoint.method} ${endpoint.path} returns 500`,
          impact: 'Endpoint failing due to server-side issues'
        });
      }
      
      this.log(`${endpoint.method} ${endpoint.path}: ${result.status}`, 
               result.status < 400 ? 'success' : 'error');
    }
  }

  async diagnoseEnvironmentConfig() {
    this.log('\n⚙️  DIAGNOSING ENVIRONMENT CONFIGURATION', 'info');
    
    // Check if we can infer environment issues from API responses
    const healthResult = await this.makeRequest('GET', '/api/health');
    
    if (healthResult.success) {
      const env = healthResult.data.environment;
      this.log(`Environment: ${env}`, 'info');
      
      if (env !== 'production') {
        this.issues.push({
          category: 'ENVIRONMENT',
          severity: 'MEDIUM',
          issue: 'Environment not set to production',
          details: `Current environment: ${env}`,
          impact: 'May cause configuration mismatches'
        });
      }
    }
  }

  async diagnoseAuthentication() {
    this.log('\n🔐 DIAGNOSING AUTHENTICATION SYSTEM', 'info');
    
    // Test registration with minimal data
    const regResult = await this.makeRequest('POST', '/api/auth/register', {
      email: 'test@example.com',
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'User'
    });
    
    if (regResult.status === 500) {
      this.issues.push({
        category: 'AUTHENTICATION',
        severity: 'CRITICAL',
        issue: 'User registration failing with server error',
        details: 'Registration endpoint returns 500 error',
        impact: 'New users cannot sign up'
      });
      
      this.recommendations.push({
        priority: 'HIGH',
        action: 'Fix user registration endpoint',
        details: [
          'Check database connection in registration handler',
          'Verify Supabase Auth configuration',
          'Check password hashing implementation',
          'Verify user table schema and permissions',
          'Check for missing environment variables'
        ]
      });
    }
    
    // Test login
    const loginResult = await this.makeRequest('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'TestPass123!'
    });
    
    if (loginResult.status === 401 && loginResult.data?.error) {
      this.log('Login endpoint responding with proper 401 (expected for invalid credentials)', 'success');
    } else if (loginResult.status === 500) {
      this.issues.push({
        category: 'AUTHENTICATION',
        severity: 'CRITICAL',
        issue: 'Login endpoint failing with server error',
        details: 'Login endpoint returns 500 error',
        impact: 'Users cannot log in'
      });
    }
  }

  async diagnoseOAuth() {
    this.log('\n🔗 DIAGNOSING OAUTH INTEGRATION', 'info');
    
    const oauthResult = await this.makeRequest('GET', '/api/oauth/google');
    
    if (oauthResult.status === 404) {
      this.issues.push({
        category: 'OAUTH',
        severity: 'HIGH',
        issue: 'OAuth endpoint not found',
        details: 'GET /api/oauth/google returns 404',
        impact: 'Google OAuth login unavailable'
      });
      
      this.recommendations.push({
        priority: 'MEDIUM',
        action: 'Implement OAuth endpoints',
        details: [
          'Create /api/oauth/google endpoint',
          'Create /api/oauth/google/callback endpoint',
          'Configure Google OAuth credentials',
          'Set up proper redirect URIs'
        ]
      });
    } else if (oauthResult.status === 400) {
      this.log('OAuth endpoint exists but returns 400 (may need proper parameters)', 'warning');
    }
  }

  async runComprehensiveDiagnosis() {
    this.log('🔍 STARTING COMPREHENSIVE PRODUCTION DIAGNOSIS', 'info');
    this.log(`🌐 Target: ${this.baseURL}`, 'info');
    this.log('=' * 70, 'info');

    try {
      await this.diagnoseDatabase();
      await this.diagnoseAPIEndpoints();
      await this.diagnoseEnvironmentConfig();
      await this.diagnoseAuthentication();
      await this.diagnoseOAuth();
      
      this.generateDiagnosticReport();
      
    } catch (error) {
      this.log(`💥 Diagnosis failed: ${error.message}`, 'error');
    }
  }

  generateDiagnosticReport() {
    this.log('\n📋 COMPREHENSIVE DIAGNOSTIC REPORT', 'info');
    this.log('=' * 70, 'info');
    
    // Categorize issues by severity
    const critical = this.issues.filter(i => i.severity === 'CRITICAL');
    const high = this.issues.filter(i => i.severity === 'HIGH');
    const medium = this.issues.filter(i => i.severity === 'MEDIUM');
    
    this.log(`🚨 CRITICAL ISSUES: ${critical.length}`, critical.length > 0 ? 'error' : 'success');
    critical.forEach((issue, index) => {
      this.log(`${index + 1}. [${issue.category}] ${issue.issue}`, 'error');
      this.log(`   Details: ${issue.details}`, 'error');
      this.log(`   Impact: ${issue.impact}`, 'error');
    });
    
    if (high.length > 0) {
      this.log(`\n⚠️  HIGH PRIORITY ISSUES: ${high.length}`, 'warning');
      high.forEach((issue, index) => {
        this.log(`${index + 1}. [${issue.category}] ${issue.issue}`, 'warning');
      });
    }
    
    if (medium.length > 0) {
      this.log(`\n📝 MEDIUM PRIORITY ISSUES: ${medium.length}`, 'info');
      medium.forEach((issue, index) => {
        this.log(`${index + 1}. [${issue.category}] ${issue.issue}`, 'info');
      });
    }
    
    // Recommendations
    if (this.recommendations.length > 0) {
      this.log('\n🎯 RECOMMENDED ACTIONS:', 'info');
      this.recommendations.forEach((rec, index) => {
        this.log(`\n${index + 1}. [${rec.priority}] ${rec.action}`, 'info');
        rec.details.forEach(detail => {
          this.log(`   • ${detail}`, 'info');
        });
      });
    }
    
    // Overall assessment
    const totalIssues = this.issues.length;
    if (critical.length > 0) {
      this.log('\n🚨 OVERALL STATUS: CRITICAL - IMMEDIATE ACTION REQUIRED', 'error');
      this.log('The application has critical issues preventing core functionality.', 'error');
    } else if (high.length > 0) {
      this.log('\n⚠️  OVERALL STATUS: NEEDS ATTENTION', 'warning');
      this.log('The application has significant issues that should be addressed.', 'warning');
    } else if (totalIssues > 0) {
      this.log('\n📝 OVERALL STATUS: MINOR ISSUES', 'info');
      this.log('The application is mostly functional with minor issues.', 'info');
    } else {
      this.log('\n🎉 OVERALL STATUS: HEALTHY', 'success');
      this.log('No significant issues detected.', 'success');
    }
    
    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      baseURL: this.baseURL,
      summary: {
        totalIssues: totalIssues,
        critical: critical.length,
        high: high.length,
        medium: medium.length
      },
      issues: this.issues,
      recommendations: this.recommendations
    };
    
    require('fs').writeFileSync('./diagnostic-report.json', JSON.stringify(report, null, 2));
    this.log('\n📄 Detailed diagnostic report saved to: ./diagnostic-report.json', 'info');
  }
}

// Run the diagnostic
if (require.main === module) {
  const diagnostic = new ProductionDiagnostic();
  diagnostic.runComprehensiveDiagnosis().catch(error => {
    console.error('❌ Diagnostic error:', error);
    process.exit(1);
  });
}

module.exports = ProductionDiagnostic;
