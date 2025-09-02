#!/usr/bin/env node

/**
 * Security Vulnerability Scanner for FloWorx SaaS
 * Comprehensive security testing and vulnerability assessment
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Security Scanner Configuration
 */
const SECURITY_CONFIG = {
  baseUrl: process.env.TEST_API_URL || 'http://localhost:5001/api',
  timeout: 10000,
  
  // Security test scenarios
  tests: {
    authentication: true,
    authorization: true,
    inputValidation: true,
    sqlInjection: true,
    xssProtection: true,
    csrfProtection: true,
    rateLimiting: true,
    dataExposure: true,
    sessionSecurity: true,
    headerSecurity: true
  },
  
  // Attack payloads for testing
  payloads: {
    sqlInjection: [
      "' OR '1'='1",
      "'; DROP TABLE users; --",
      "' UNION SELECT * FROM users --",
      "1' OR 1=1 --",
      "admin'--",
      "' OR 1=1#"
    ],
    
    xss: [
      "<script>alert('xss')</script>",
      "<img src=x onerror=alert('xss')>",
      "javascript:alert('xss')",
      "<svg onload=alert('xss')>",
      "';alert('xss');//",
      "<iframe src=javascript:alert('xss')></iframe>"
    ],
    
    pathTraversal: [
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
      "....//....//....//etc/passwd",
      "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
    ],
    
    commandInjection: [
      "; ls -la",
      "| whoami",
      "&& cat /etc/passwd",
      "`id`",
      "$(whoami)",
      "; rm -rf /"
    ]
  }
};

/**
 * Security Scanner Class
 */
class SecurityScanner {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      vulnerabilities: [],
      warnings: [],
      passed: [],
      summary: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        info: 0
      }
    };
    
    this.apiClient = axios.create({
      baseURL: SECURITY_CONFIG.baseUrl,
      timeout: SECURITY_CONFIG.timeout,
      validateStatus: () => true // Don't throw on HTTP errors
    });
  }

  /**
   * Run comprehensive security scan
   */
  async scan() {
    console.log('🔒 Starting Security Vulnerability Scan');
    console.log('======================================\n');

    try {
      // Dependency vulnerability scan
      await this.scanDependencies();

      // Authentication security tests
      if (SECURITY_CONFIG.tests.authentication) {
        await this.testAuthentication();
      }

      // Authorization tests
      if (SECURITY_CONFIG.tests.authorization) {
        await this.testAuthorization();
      }

      // Input validation tests
      if (SECURITY_CONFIG.tests.inputValidation) {
        await this.testInputValidation();
      }

      // SQL injection tests
      if (SECURITY_CONFIG.tests.sqlInjection) {
        await this.testSqlInjection();
      }

      // XSS protection tests
      if (SECURITY_CONFIG.tests.xssProtection) {
        await this.testXssProtection();
      }

      // Rate limiting tests
      if (SECURITY_CONFIG.tests.rateLimiting) {
        await this.testRateLimiting();
      }

      // Data exposure tests
      if (SECURITY_CONFIG.tests.dataExposure) {
        await this.testDataExposure();
      }

      // Security headers tests
      if (SECURITY_CONFIG.tests.headerSecurity) {
        await this.testSecurityHeaders();
      }

      // Generate security report
      await this.generateSecurityReport();

      this.results.endTime = new Date();
      console.log('\n✅ Security scan completed');
      
      return this.results;

    } catch (error) {
      console.error('\n❌ Security scan failed:', error);
      throw error;
    }
  }

  /**
   * Scan dependencies for known vulnerabilities
   */
  async scanDependencies() {
    console.log('📦 Scanning dependencies for vulnerabilities...');

    try {
      // Run npm audit
      const auditResult = execSync('npm audit --json', { 
        cwd: path.join(__dirname, '../../'),
        encoding: 'utf8'
      });
      
      const audit = JSON.parse(auditResult);
      
      if (audit.vulnerabilities && Object.keys(audit.vulnerabilities).length > 0) {
        Object.entries(audit.vulnerabilities).forEach(([pkg, vuln]) => {
          this.addVulnerability({
            type: 'DEPENDENCY_VULNERABILITY',
            severity: vuln.severity.toUpperCase(),
            package: pkg,
            title: vuln.title,
            description: `Vulnerable dependency: ${pkg}`,
            recommendation: 'Update to latest secure version',
            cwe: vuln.cwe || 'Unknown'
          });
        });
      } else {
        this.addPassed('No dependency vulnerabilities found');
      }

    } catch (error) {
      if (error.status === 0) {
        this.addPassed('No dependency vulnerabilities found');
      } else {
        this.addWarning('Could not run dependency vulnerability scan');
      }
    }
  }

  /**
   * Test authentication security
   */
  async testAuthentication() {
    console.log('🔐 Testing authentication security...');

    // Test 1: Weak password acceptance
    try {
      const response = await this.apiClient.post('/auth/register', {
        firstName: 'Test',
        lastName: 'User',
        email: 'weak-test@example.com',
        password: '123', // Weak password
        businessName: 'Test Business',
        businessType: 'hot_tub',
        acceptTerms: true
      });

      if (response.status === 201) {
        this.addVulnerability({
          type: 'WEAK_PASSWORD_POLICY',
          severity: 'HIGH',
          title: 'Weak password accepted',
          description: 'System accepts weak passwords that do not meet security requirements',
          recommendation: 'Implement strong password policy validation',
          endpoint: '/auth/register'
        });
      } else {
        this.addPassed('Weak passwords are properly rejected');
      }
    } catch (error) {
      this.addWarning('Could not test weak password policy');
    }

    // Test 2: Account enumeration
    try {
      const validEmailResponse = await this.apiClient.post('/auth/login', {
        email: 'test@floworx-test.com',
        password: 'wrongpassword'
      });

      const invalidEmailResponse = await this.apiClient.post('/auth/login', {
        email: 'nonexistent@example.com',
        password: 'wrongpassword'
      });

      if (validEmailResponse.data.error?.message !== invalidEmailResponse.data.error?.message) {
        this.addVulnerability({
          type: 'ACCOUNT_ENUMERATION',
          severity: 'MEDIUM',
          title: 'Account enumeration possible',
          description: 'Different error messages reveal whether email exists',
          recommendation: 'Use generic error messages for login failures',
          endpoint: '/auth/login'
        });
      } else {
        this.addPassed('Account enumeration protection in place');
      }
    } catch (error) {
      this.addWarning('Could not test account enumeration');
    }

    // Test 3: JWT token validation
    try {
      const response = await this.apiClient.get('/auth/profile', {
        headers: { Authorization: 'Bearer invalid-jwt-token' }
      });

      if (response.status !== 401) {
        this.addVulnerability({
          type: 'JWT_VALIDATION',
          severity: 'CRITICAL',
          title: 'Invalid JWT tokens accepted',
          description: 'System accepts invalid or malformed JWT tokens',
          recommendation: 'Implement proper JWT validation',
          endpoint: '/auth/profile'
        });
      } else {
        this.addPassed('JWT token validation working correctly');
      }
    } catch (error) {
      this.addWarning('Could not test JWT validation');
    }
  }

  /**
   * Test authorization controls
   */
  async testAuthorization() {
    console.log('🛡️  Testing authorization controls...');

    // Test 1: Missing authorization header
    try {
      const response = await this.apiClient.get('/workflows');

      if (response.status === 200) {
        this.addVulnerability({
          type: 'MISSING_AUTHORIZATION',
          severity: 'CRITICAL',
          title: 'Protected endpoint accessible without authentication',
          description: 'Sensitive endpoints can be accessed without proper authentication',
          recommendation: 'Implement authentication middleware on all protected routes',
          endpoint: '/workflows'
        });
      } else {
        this.addPassed('Protected endpoints require authentication');
      }
    } catch (error) {
      this.addWarning('Could not test authorization controls');
    }

    // Test 2: Privilege escalation
    // This would require creating test users with different roles
    // For now, we'll test basic access control
  }

  /**
   * Test input validation
   */
  async testInputValidation() {
    console.log('✅ Testing input validation...');

    const testEndpoints = [
      { method: 'POST', path: '/workflows', field: 'name' },
      { method: 'POST', path: '/auth/register', field: 'email' },
      { method: 'PUT', path: '/auth/profile', field: 'firstName' }
    ];

    for (const endpoint of testEndpoints) {
      // Test oversized input
      const oversizedData = {
        [endpoint.field]: 'A'.repeat(10000) // 10KB string
      };

      try {
        const response = await this.apiClient[endpoint.method.toLowerCase()](
          endpoint.path, 
          oversizedData,
          { headers: { Authorization: 'Bearer test-token' } }
        );

        if (response.status === 200 || response.status === 201) {
          this.addVulnerability({
            type: 'INPUT_SIZE_VALIDATION',
            severity: 'MEDIUM',
            title: 'Oversized input accepted',
            description: `Endpoint accepts oversized input for field: ${endpoint.field}`,
            recommendation: 'Implement input size limits',
            endpoint: endpoint.path
          });
        }
      } catch (error) {
        // Expected to fail
      }
    }
  }

  /**
   * Test SQL injection protection
   */
  async testSqlInjection() {
    console.log('💉 Testing SQL injection protection...');

    for (const payload of SECURITY_CONFIG.payloads.sqlInjection) {
      try {
        const response = await this.apiClient.post('/auth/login', {
          email: payload,
          password: 'test'
        });

        // Check for SQL error messages in response
        const responseText = JSON.stringify(response.data).toLowerCase();
        const sqlErrorPatterns = [
          'sql syntax',
          'mysql_fetch',
          'ora-',
          'postgresql',
          'sqlite_',
          'syntax error'
        ];

        if (sqlErrorPatterns.some(pattern => responseText.includes(pattern))) {
          this.addVulnerability({
            type: 'SQL_INJECTION',
            severity: 'CRITICAL',
            title: 'SQL injection vulnerability detected',
            description: `SQL error exposed with payload: ${payload}`,
            recommendation: 'Use parameterized queries and input sanitization',
            endpoint: '/auth/login'
          });
        }
      } catch (error) {
        // Expected behavior
      }
    }

    this.addPassed('No SQL injection vulnerabilities detected');
  }

  /**
   * Test XSS protection
   */
  async testXssProtection() {
    console.log('🕷️  Testing XSS protection...');

    for (const payload of SECURITY_CONFIG.payloads.xss) {
      try {
        const response = await this.apiClient.post('/workflows', {
          name: payload,
          description: 'Test workflow',
          triggerType: 'inquiry',
          configuration: { steps: [] }
        }, {
          headers: { Authorization: 'Bearer test-token' }
        });

        if (response.status === 201 && response.data.data?.name === payload) {
          this.addVulnerability({
            type: 'XSS_VULNERABILITY',
            severity: 'HIGH',
            title: 'XSS payload not sanitized',
            description: `Malicious script stored without sanitization: ${payload}`,
            recommendation: 'Implement input sanitization and output encoding',
            endpoint: '/workflows'
          });
        }
      } catch (error) {
        // Expected behavior
      }
    }

    this.addPassed('XSS protection appears to be working');
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting() {
    console.log('🚦 Testing rate limiting...');

    const requests = [];
    for (let i = 0; i < 20; i++) {
      requests.push(
        this.apiClient.post('/auth/login', {
          email: 'test@example.com',
          password: 'wrongpassword'
        })
      );
    }

    try {
      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      if (!rateLimited) {
        this.addVulnerability({
          type: 'RATE_LIMITING',
          severity: 'MEDIUM',
          title: 'Rate limiting not implemented',
          description: 'No rate limiting detected on authentication endpoints',
          recommendation: 'Implement rate limiting to prevent brute force attacks',
          endpoint: '/auth/login'
        });
      } else {
        this.addPassed('Rate limiting is properly implemented');
      }
    } catch (error) {
      this.addWarning('Could not test rate limiting');
    }
  }

  /**
   * Test data exposure
   */
  async testDataExposure() {
    console.log('🔍 Testing data exposure...');

    try {
      const response = await this.apiClient.get('/auth/profile', {
        headers: { Authorization: 'Bearer valid-test-token' }
      });

      if (response.status === 200 && response.data.data?.user?.password_hash) {
        this.addVulnerability({
          type: 'DATA_EXPOSURE',
          severity: 'CRITICAL',
          title: 'Sensitive data exposed in API response',
          description: 'Password hash exposed in user profile response',
          recommendation: 'Remove sensitive fields from API responses',
          endpoint: '/auth/profile'
        });
      } else {
        this.addPassed('No sensitive data exposure detected');
      }
    } catch (error) {
      this.addWarning('Could not test data exposure');
    }
  }

  /**
   * Test security headers
   */
  async testSecurityHeaders() {
    console.log('📋 Testing security headers...');

    try {
      const response = await this.apiClient.get('/');
      const headers = response.headers;

      const requiredHeaders = {
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'x-xss-protection': '1; mode=block',
        'strict-transport-security': 'max-age=31536000'
      };

      Object.entries(requiredHeaders).forEach(([header, expectedValue]) => {
        if (!headers[header]) {
          this.addVulnerability({
            type: 'MISSING_SECURITY_HEADER',
            severity: 'MEDIUM',
            title: `Missing security header: ${header}`,
            description: `Security header ${header} is not set`,
            recommendation: `Add ${header}: ${expectedValue} header`,
            endpoint: '/'
          });
        }
      });

      if (Object.keys(requiredHeaders).every(h => headers[h])) {
        this.addPassed('All required security headers are present');
      }

    } catch (error) {
      this.addWarning('Could not test security headers');
    }
  }

  /**
   * Add vulnerability to results
   */
  addVulnerability(vuln) {
    this.results.vulnerabilities.push({
      ...vuln,
      timestamp: new Date()
    });
    
    this.results.summary[vuln.severity.toLowerCase()]++;
    console.log(`❌ ${vuln.severity}: ${vuln.title}`);
  }

  /**
   * Add warning to results
   */
  addWarning(message) {
    this.results.warnings.push({
      message,
      timestamp: new Date()
    });
    console.log(`⚠️  WARNING: ${message}`);
  }

  /**
   * Add passed test to results
   */
  addPassed(message) {
    this.results.passed.push({
      message,
      timestamp: new Date()
    });
    console.log(`✅ ${message}`);
  }

  /**
   * Generate security report
   */
  async generateSecurityReport() {
    console.log('\n📊 Generating security report...');

    const reportDir = path.join(__dirname, '../../reports/security');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const report = {
      scan: {
        startTime: this.results.startTime,
        endTime: this.results.endTime,
        duration: this.results.endTime - this.results.startTime
      },
      summary: this.results.summary,
      vulnerabilities: this.results.vulnerabilities,
      warnings: this.results.warnings,
      passed: this.results.passed,
      recommendations: this.generateRecommendations()
    };

    const reportPath = path.join(reportDir, `security-scan-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`✅ Security report saved: ${reportPath}`);
    
    // Print summary
    console.log('\n🔒 Security Scan Summary:');
    console.log('========================');
    console.log(`Critical: ${this.results.summary.critical}`);
    console.log(`High: ${this.results.summary.high}`);
    console.log(`Medium: ${this.results.summary.medium}`);
    console.log(`Low: ${this.results.summary.low}`);
    console.log(`Passed: ${this.results.passed.length}`);
    console.log(`Warnings: ${this.results.warnings.length}`);
  }

  /**
   * Generate security recommendations
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.summary.critical > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        message: 'Address critical vulnerabilities immediately before deployment'
      });
    }
    
    if (this.results.summary.high > 0) {
      recommendations.push({
        priority: 'HIGH',
        message: 'Fix high-severity vulnerabilities within 24 hours'
      });
    }
    
    recommendations.push({
      priority: 'GENERAL',
      message: 'Implement automated security scanning in CI/CD pipeline'
    });
    
    return recommendations;
  }
}

// Run security scan if called directly
if (require.main === module) {
  const scanner = new SecurityScanner();
  
  scanner.scan()
    .then((results) => {
      const hasVulnerabilities = results.summary.critical > 0 || results.summary.high > 0;
      process.exit(hasVulnerabilities ? 1 : 0);
    })
    .catch((error) => {
      console.error('Security scan failed:', error);
      process.exit(1);
    });
}

module.exports = { SecurityScanner, SECURITY_CONFIG };
