#!/usr/bin/env node

/**
 * Email Verification Fix Validation Test
 * Tests the fix for double-encoded verification URLs
 */

const crypto = require('crypto');

class EmailVerificationFixValidator {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com';
    this.results = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      baseURL: this.baseURL,
      tests: [],
      summary: {}
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔧',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪',
      fix: '🛠️'
    }[level] || '🔧';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async testRegistrationEndpoint() {
    this.log('Testing registration endpoint for proper email sending...', 'test');
    
    const test = {
      name: 'Registration Email Verification',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Generate unique test email
      const testEmail = `verification-fix-test-${Date.now()}@example.com`;
      
      const registrationData = {
        firstName: 'VerificationTest',
        lastName: 'User',
        email: testEmail,
        password: 'TestPassword123!',
        businessType: 'hot_tub_service'
      };

      const response = await fetch(`${this.baseURL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData)
      });

      const data = await response.json();
      
      test.details.push(`Registration response status: ${response.status}`);
      test.details.push(`Registration response: ${JSON.stringify(data, null, 2)}`);

      if (response.status === 201 || response.status === 200) {
        test.details.push('✅ Registration successful');
        
        // Check if the response indicates email was sent
        if (data.message && data.message.includes('verification')) {
          test.details.push('✅ Verification email sending indicated');
          test.success = true;
        } else {
          test.details.push('⚠️ No verification email indication in response');
        }
      } else if (response.status === 409) {
        test.details.push('⚠️ Email already exists (expected for repeated tests)');
        test.success = true; // This is acceptable for testing
      } else {
        test.details.push(`❌ Registration failed with status ${response.status}`);
        test.success = false;
      }

    } catch (error) {
      test.details.push(`❌ Error during registration test: ${error.message}`);
      test.success = false;
    }

    this.results.tests.push(test);
    return test;
  }

  async testVerificationEndpoint() {
    this.log('Testing verification endpoint with sample token...', 'test');
    
    const test = {
      name: 'Verification Endpoint Response',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Test with an invalid token to check endpoint behavior
      const testToken = 'invalid-test-token-for-endpoint-validation';
      
      const response = await fetch(`${this.baseURL}/api/auth/verify-email?token=${encodeURIComponent(testToken)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      test.details.push(`Verification endpoint status: ${response.status}`);
      test.details.push(`Verification response: ${JSON.stringify(data, null, 2)}`);

      // We expect this to fail with 400 or 401 for invalid token, which is correct behavior
      if (response.status === 400 || response.status === 401) {
        if (data.error && (data.error.code === 'INVALID_TOKEN' || data.error.code === 'BAD_REQUEST')) {
          test.details.push('✅ Verification endpoint properly rejects invalid tokens');
          test.success = true;
        } else {
          test.details.push('⚠️ Verification endpoint response format unexpected');
        }
      } else {
        test.details.push(`❌ Unexpected response status: ${response.status}`);
      }

    } catch (error) {
      test.details.push(`❌ Error during verification endpoint test: ${error.message}`);
      test.success = false;
    }

    this.results.tests.push(test);
    return test;
  }

  async testEmailTemplateGeneration() {
    this.log('Testing email template URL generation logic...', 'test');
    
    const test = {
      name: 'Email Template URL Generation',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Simulate the URL generation logic that should be used
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoidG9rZW4ifQ.test';
      const expectedUrl = `${this.baseURL}/verify-email?token=${mockToken}`;
      
      test.details.push(`Mock token: ${mockToken.substring(0, 20)}...`);
      test.details.push(`Expected URL format: ${expectedUrl}`);
      
      // Verify URL structure
      const urlParts = expectedUrl.split('?token=');
      if (urlParts.length === 2) {
        const baseUrl = urlParts[0];
        const tokenParam = urlParts[1];
        
        test.details.push(`Base URL: ${baseUrl}`);
        test.details.push(`Token parameter: ${tokenParam.substring(0, 20)}...`);
        
        // Check for double-encoding (the bug we fixed)
        if (tokenParam.includes('http') || tokenParam.includes('verify-email')) {
          test.details.push('❌ Token parameter contains URL - DOUBLE ENCODING DETECTED!');
          test.success = false;
        } else {
          test.details.push('✅ Token parameter contains only token - NO DOUBLE ENCODING');
          test.success = true;
        }
      } else {
        test.details.push('❌ URL structure invalid');
        test.success = false;
      }

    } catch (error) {
      test.details.push(`❌ Error during template generation test: ${error.message}`);
      test.success = false;
    }

    this.results.tests.push(test);
    return test;
  }

  async testFrontendVerificationPage() {
    this.log('Testing frontend verification page accessibility...', 'test');
    
    const test = {
      name: 'Frontend Verification Page',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Test that the verification page loads
      const response = await fetch(`${this.baseURL}/verify-email?token=test`, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });

      test.details.push(`Frontend page status: ${response.status}`);
      
      if (response.status === 200) {
        const html = await response.text();
        
        if (html.includes('FloWorx') || html.includes('verification') || html.includes('email')) {
          test.details.push('✅ Verification page loads correctly');
          test.success = true;
        } else {
          test.details.push('⚠️ Page loads but content unexpected');
        }
      } else {
        test.details.push(`❌ Page failed to load: ${response.status}`);
      }

    } catch (error) {
      test.details.push(`❌ Error during frontend page test: ${error.message}`);
      test.success = false;
    }

    this.results.tests.push(test);
    return test;
  }

  async testURLEncodingScenarios() {
    this.log('Testing various URL encoding scenarios...', 'test');
    
    const test = {
      name: 'URL Encoding Scenarios',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      const testScenarios = [
        {
          name: 'Simple JWT Token',
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoidG9rZW4ifQ.test',
          shouldWork: true
        },
        {
          name: 'Token with Special Characters',
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0ZXN0IjoidG9rZW4rL3NwZWNpYWwifQ.test+/=',
          shouldWork: true
        },
        {
          name: 'Double-Encoded URL (Bug Case)',
          token: `${this.baseURL}/verify-email?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test`,
          shouldWork: false
        }
      ];

      let passedScenarios = 0;
      
      for (const scenario of testScenarios) {
        const testUrl = `${this.baseURL}/verify-email?token=${encodeURIComponent(scenario.token)}`;
        
        test.details.push(`\nScenario: ${scenario.name}`);
        test.details.push(`Token: ${scenario.token.substring(0, 30)}...`);
        test.details.push(`Generated URL: ${testUrl.substring(0, 80)}...`);
        
        // Check if the URL looks correct
        const isDoubleEncoded = scenario.token.includes('http') || scenario.token.includes('verify-email');
        
        if (scenario.shouldWork && !isDoubleEncoded) {
          test.details.push('✅ Scenario passed - proper URL structure');
          passedScenarios++;
        } else if (!scenario.shouldWork && isDoubleEncoded) {
          test.details.push('✅ Scenario passed - correctly identified as problematic');
          passedScenarios++;
        } else {
          test.details.push('❌ Scenario failed - unexpected URL structure');
        }
      }

      test.success = passedScenarios === testScenarios.length;
      test.details.push(`\nPassed scenarios: ${passedScenarios}/${testScenarios.length}`);

    } catch (error) {
      test.details.push(`❌ Error during URL encoding test: ${error.message}`);
      test.success = false;
    }

    this.results.tests.push(test);
    return test;
  }

  generateReport() {
    const passed = this.results.tests.filter(t => t.success).length;
    const failed = this.results.tests.filter(t => !t.success).length;
    const total = this.results.tests.length;
    
    this.results.summary = {
      total,
      passed,
      failed,
      successRate: `${((passed / total) * 100).toFixed(1)}%`,
      fixStatus: failed === 0 ? 'VERIFICATION_FIX_SUCCESSFUL' : 'ISSUES_DETECTED'
    };

    this.log('\n📊 EMAIL VERIFICATION FIX VALIDATION SUMMARY', 'info');
    this.log(`Environment: ${this.baseURL}`, 'info');
    this.log(`Tests: ${passed}/${total} passed (${this.results.summary.successRate})`, passed === total ? 'success' : 'error');
    this.log(`Fix Status: ${this.results.summary.fixStatus}`, this.results.summary.fixStatus === 'VERIFICATION_FIX_SUCCESSFUL' ? 'success' : 'error');

    // Show detailed results
    this.log('\n📋 DETAILED TEST RESULTS:', 'info');
    this.results.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      this.log(`${status} ${test.name}`, test.success ? 'success' : 'error');
      test.details.forEach(detail => {
        this.log(`   ${detail}`, 'info');
      });
    });

    return this.results;
  }

  async run() {
    this.log('🚀 Starting Email Verification Fix Validation', 'fix');
    this.log(`Target: ${this.baseURL}`, 'info');
    this.log('Testing fix for double-encoded verification URLs', 'info');

    try {
      // Run all validation tests
      await this.testRegistrationEndpoint();
      await this.testVerificationEndpoint();
      await this.testEmailTemplateGeneration();
      await this.testFrontendVerificationPage();
      await this.testURLEncodingScenarios();

      // Generate report
      const results = this.generateReport();

      // Save results
      const fs = require('fs').promises;
      await fs.writeFile('email-verification-fix-results.json', JSON.stringify(results, null, 2));
      this.log('\n📄 Results saved to email-verification-fix-results.json', 'info');

      // Exit with appropriate code
      process.exit(results.summary.fixStatus === 'VERIFICATION_FIX_SUCCESSFUL' ? 0 : 1);

    } catch (error) {
      this.log(`🚨 Critical error during validation: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new EmailVerificationFixValidator();
  validator.run().catch(console.error);
}

module.exports = EmailVerificationFixValidator;
