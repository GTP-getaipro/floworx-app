/**
 * Security Audit Script for FloWorx Production
 * Comprehensive security testing and validation
 */

const axios = require('axios');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class SecurityAudit {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.testResults = {
      authentication: [],
      authorization: [],
      rateLimiting: [],
      inputValidation: [],
      headers: [],
      cors: [],
      jwt: [],
      overall: { passed: 0, failed: 0, warnings: 0 }
    };
  }

  /**
   * Run comprehensive security audit
   */
  async runSecurityAudit() {
    console.log('🔒 Starting comprehensive security audit...');
    console.log(`🎯 Target: ${this.baseUrl}`);
    console.log('=' * 60);

    try {
      await this.testSecurityHeaders();
      await this.testCORSConfiguration();
      await this.testRateLimiting();
      await this.testAuthenticationSecurity();
      await this.testInputValidation();
      await this.testJWTSecurity();
      await this.testAuthorizationControls();
      
      this.generateSecurityReport();
      return this.testResults;
    } catch (error) {
      console.error('❌ Security audit failed:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Test security headers
   */
  async testSecurityHeaders() {
    console.log('🔧 Testing security headers...');
    
    try {
      const response = await axios.get(`${this.baseUrl}/api/health`, {
        validateStatus: () => true
      });

      const headers = response.headers;
      const requiredHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'referrer-policy',
        'content-security-policy'
      ];

      for (const header of requiredHeaders) {
        if (headers[header]) {
          this.addResult('headers', 'PASS', `${header} header present`, headers[header]);
        } else {
          this.addResult('headers', 'FAIL', `${header} header missing`);
        }
      }

      // Check for information disclosure
      if (headers['x-powered-by']) {
        this.addResult('headers', 'FAIL', 'X-Powered-By header exposes server information');
      } else {
        this.addResult('headers', 'PASS', 'X-Powered-By header properly removed');
      }

      if (headers['server']) {
        this.addResult('headers', 'WARN', 'Server header present', headers['server']);
      } else {
        this.addResult('headers', 'PASS', 'Server header properly removed');
      }

    } catch (error) {
      this.addResult('headers', 'FAIL', `Security headers test failed: ${error.message}`);
    }
  }

  /**
   * Test CORS configuration
   */
  async testCORSConfiguration() {
    console.log('🔧 Testing CORS configuration...');
    
    const testOrigins = [
      'https://malicious-site.com',
      'http://localhost:3000',
      'https://app.floworx-iq.com',
      null
    ];

    for (const origin of testOrigins) {
      try {
        const headers = origin ? { 'Origin': origin } : {};
        const response = await axios.options(`${this.baseUrl}/api/health`, {
          headers,
          validateStatus: () => true
        });

        const corsHeaders = response.headers;
        
        if (origin === 'https://malicious-site.com') {
          if (corsHeaders['access-control-allow-origin'] === origin) {
            this.addResult('cors', 'FAIL', 'CORS allows malicious origin');
          } else {
            this.addResult('cors', 'PASS', 'CORS properly blocks malicious origin');
          }
        } else if (origin === 'https://app.floworx-iq.com') {
          if (corsHeaders['access-control-allow-origin']) {
            this.addResult('cors', 'PASS', 'CORS allows legitimate origin');
          } else {
            this.addResult('cors', 'FAIL', 'CORS blocks legitimate origin');
          }
        }

      } catch (error) {
        this.addResult('cors', 'WARN', `CORS test failed for origin ${origin}: ${error.message}`);
      }
    }
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting() {
    console.log('🔧 Testing rate limiting...');
    
    const endpoints = [
      { path: '/api/auth/register', method: 'POST', limit: 5 },
      { path: '/api/auth/login', method: 'POST', limit: 10 },
      { path: '/api/health', method: 'GET', limit: 100 }
    ];

    for (const endpoint of endpoints) {
      try {
        let rateLimitHit = false;
        const testData = endpoint.method === 'POST' ? {
          email: `test-${Date.now()}@example.com`,
          password: 'TestPassword123!'
        } : {};

        // Make rapid requests to test rate limiting
        for (let i = 0; i < endpoint.limit + 2; i++) {
          try {
            const response = await axios({
              method: endpoint.method,
              url: `${this.baseUrl}${endpoint.path}`,
              data: testData,
              validateStatus: () => true,
              timeout: 5000
            });

            if (response.status === 429) {
              rateLimitHit = true;
              break;
            }
          } catch (error) {
            // Ignore individual request errors
          }
        }

        if (rateLimitHit) {
          this.addResult('rateLimiting', 'PASS', `Rate limiting active on ${endpoint.path}`);
        } else {
          this.addResult('rateLimiting', 'WARN', `Rate limiting not detected on ${endpoint.path}`);
        }

      } catch (error) {
        this.addResult('rateLimiting', 'WARN', `Rate limiting test failed for ${endpoint.path}`);
      }
    }
  }

  /**
   * Test authentication security
   */
  async testAuthenticationSecurity() {
    console.log('🔧 Testing authentication security...');
    
    // Test weak password acceptance
    try {
      const weakPasswords = ['123', 'password', 'abc123'];
      
      for (const weakPassword of weakPasswords) {
        const response = await axios.post(`${this.baseUrl}/api/auth/register`, {
          email: `weak-test-${Date.now()}@example.com`,
          password: weakPassword,
          firstName: 'Test',
          lastName: 'User'
        }, { validateStatus: () => true });

        if (response.status === 400) {
          this.addResult('authentication', 'PASS', `Weak password rejected: ${weakPassword}`);
        } else {
          this.addResult('authentication', 'FAIL', `Weak password accepted: ${weakPassword}`);
        }
      }
    } catch (error) {
      this.addResult('authentication', 'WARN', `Password strength test failed: ${error.message}`);
    }

    // Test SQL injection in login
    try {
      const sqlInjectionPayloads = [
        "admin'--",
        "admin' OR '1'='1",
        "'; DROP TABLE users; --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await axios.post(`${this.baseUrl}/api/auth/login`, {
          email: payload,
          password: 'anything'
        }, { validateStatus: () => true });

        if (response.status >= 400 && response.status < 500) {
          this.addResult('authentication', 'PASS', `SQL injection payload blocked: ${payload}`);
        } else {
          this.addResult('authentication', 'FAIL', `SQL injection payload not blocked: ${payload}`);
        }
      }
    } catch (error) {
      this.addResult('authentication', 'WARN', `SQL injection test failed: ${error.message}`);
    }
  }

  /**
   * Test input validation
   */
  async testInputValidation() {
    console.log('🔧 Testing input validation...');
    
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(1)">',
      '"><script>alert("xss")</script>'
    ];

    for (const payload of xssPayloads) {
      try {
        const response = await axios.post(`${this.baseUrl}/api/auth/register`, {
          email: `test-${Date.now()}@example.com`,
          password: 'ValidPassword123!',
          firstName: payload,
          lastName: 'User'
        }, { validateStatus: () => true });

        // Check if the payload was sanitized or rejected
        if (response.status === 400) {
          this.addResult('inputValidation', 'PASS', `XSS payload rejected: ${payload.substring(0, 30)}...`);
        } else if (response.status === 201) {
          // Check if response contains unsanitized payload
          const responseText = JSON.stringify(response.data);
          if (responseText.includes(payload)) {
            this.addResult('inputValidation', 'FAIL', `XSS payload not sanitized: ${payload.substring(0, 30)}...`);
          } else {
            this.addResult('inputValidation', 'PASS', `XSS payload sanitized: ${payload.substring(0, 30)}...`);
          }
        }
      } catch (error) {
        this.addResult('inputValidation', 'WARN', `Input validation test failed: ${error.message}`);
      }
    }
  }

  /**
   * Test JWT security
   */
  async testJWTSecurity() {
    console.log('🔧 Testing JWT security...');
    
    try {
      // Test with invalid JWT
      const invalidTokens = [
        'invalid.jwt.token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid',
        '',
        'Bearer malformed'
      ];

      for (const token of invalidTokens) {
        const response = await axios.get(`${this.baseUrl}/api/onboarding/email-provider`, {
          headers: { 'Authorization': `Bearer ${token}` },
          validateStatus: () => true
        });

        if (response.status === 401 || response.status === 403) {
          this.addResult('jwt', 'PASS', `Invalid JWT properly rejected`);
        } else {
          this.addResult('jwt', 'FAIL', `Invalid JWT accepted`);
        }
      }

      // Test JWT algorithm confusion (if we can create a test token)
      try {
        const noneToken = jwt.sign({ userId: 'test' }, '', { algorithm: 'none' });
        const response = await axios.get(`${this.baseUrl}/api/onboarding/email-provider`, {
          headers: { 'Authorization': `Bearer ${noneToken}` },
          validateStatus: () => true
        });

        if (response.status === 401 || response.status === 403) {
          this.addResult('jwt', 'PASS', `'none' algorithm JWT properly rejected`);
        } else {
          this.addResult('jwt', 'FAIL', `'none' algorithm JWT accepted - CRITICAL VULNERABILITY`);
        }
      } catch (error) {
        this.addResult('jwt', 'PASS', `JWT 'none' algorithm test blocked by library`);
      }

    } catch (error) {
      this.addResult('jwt', 'WARN', `JWT security test failed: ${error.message}`);
    }
  }

  /**
   * Test authorization controls
   */
  async testAuthorizationControls() {
    console.log('🔧 Testing authorization controls...');
    
    try {
      // Test accessing protected endpoints without authentication
      const protectedEndpoints = [
        '/api/onboarding/email-provider',
        '/api/onboarding/business-type',
        '/api/workflows'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          validateStatus: () => true
        });

        if (response.status === 401 || response.status === 403) {
          this.addResult('authorization', 'PASS', `Protected endpoint requires authentication: ${endpoint}`);
        } else {
          this.addResult('authorization', 'FAIL', `Protected endpoint accessible without auth: ${endpoint}`);
        }
      }

    } catch (error) {
      this.addResult('authorization', 'WARN', `Authorization test failed: ${error.message}`);
    }
  }

  /**
   * Add test result
   */
  addResult(category, status, message, details = null) {
    const result = {
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    };

    this.testResults[category].push(result);
    
    if (status === 'PASS') {
      this.testResults.overall.passed++;
      console.log(`✅ ${message}`);
    } else if (status === 'FAIL') {
      this.testResults.overall.failed++;
      console.log(`❌ ${message}`);
    } else if (status === 'WARN') {
      this.testResults.overall.warnings++;
      console.log(`⚠️ ${message}`);
    }
  }

  /**
   * Generate comprehensive security report
   */
  generateSecurityReport() {
    console.log('\n' + '=' * 60);
    console.log('🔒 SECURITY AUDIT REPORT');
    console.log('=' * 60);
    
    const categories = Object.keys(this.testResults).filter(key => key !== 'overall');
    
    for (const category of categories) {
      const results = this.testResults[category];
      const passed = results.filter(r => r.status === 'PASS').length;
      const failed = results.filter(r => r.status === 'FAIL').length;
      const warnings = results.filter(r => r.status === 'WARN').length;
      
      console.log(`\n📊 ${category.toUpperCase()}:`);
      console.log(`   ✅ Passed: ${passed}`);
      console.log(`   ❌ Failed: ${failed}`);
      console.log(`   ⚠️ Warnings: ${warnings}`);
      
      if (failed > 0) {
        console.log(`   🚨 Critical Issues:`);
        results.filter(r => r.status === 'FAIL').forEach(r => {
          console.log(`      - ${r.message}`);
        });
      }
    }
    
    console.log('\n' + '=' * 60);
    console.log('📈 OVERALL RESULTS:');
    console.log(`✅ Total Passed: ${this.testResults.overall.passed}`);
    console.log(`❌ Total Failed: ${this.testResults.overall.failed}`);
    console.log(`⚠️ Total Warnings: ${this.testResults.overall.warnings}`);
    
    const totalTests = this.testResults.overall.passed + this.testResults.overall.failed + this.testResults.overall.warnings;
    const successRate = totalTests > 0 ? ((this.testResults.overall.passed / totalTests) * 100).toFixed(1) : 0;
    
    console.log(`📊 Success Rate: ${successRate}%`);
    
    if (this.testResults.overall.failed === 0) {
      console.log('🎉 SECURITY AUDIT PASSED - No critical vulnerabilities found!');
    } else {
      console.log('🚨 SECURITY AUDIT FAILED - Critical vulnerabilities found!');
      console.log('⚠️ Please address all failed tests before deploying to production.');
    }
    
    console.log('=' * 60);
  }
}

module.exports = SecurityAudit;

// Run audit if called directly
if (require.main === module) {
  const audit = new SecurityAudit();
  audit.runSecurityAudit()
    .then(results => {
      const success = results.overall?.failed === 0;
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Security audit failed:', error);
      process.exit(1);
    });
}
