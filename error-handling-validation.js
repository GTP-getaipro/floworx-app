#!/usr/bin/env node

/**
 * Error Handling and Logging Validation
 * Tests error scenarios and validates unified JSON error envelope format
 */

const axios = require('axios');
const fs = require('fs').promises;

class ErrorHandlingValidator {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com';
    this.results = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      baseURL: this.baseURL,
      errorTests: [],
      summary: {}
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔍',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪'
    }[level] || '🔍';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async testErrorScenario(testCase) {
    try {
      this.log(`Testing ${testCase.name}...`, 'test');
      
      const response = await axios({
        method: testCase.method || 'POST',
        url: `${this.baseURL}${testCase.endpoint}`,
        data: testCase.data,
        headers: {
          'Content-Type': 'application/json',
          ...testCase.headers
        },
        withCredentials: true,
        validateStatus: () => true // Don't throw on error status codes
      });

      const test = {
        name: testCase.name,
        endpoint: testCase.endpoint,
        method: testCase.method || 'POST',
        expectedStatus: testCase.expectedStatus,
        actualStatus: response.status,
        statusMatch: Array.isArray(testCase.expectedStatus) 
          ? testCase.expectedStatus.includes(response.status)
          : response.status === testCase.expectedStatus,
        data: response.data,
        hasUnifiedErrorFormat: this.validateErrorFormat(response.data),
        timestamp: new Date().toISOString()
      };

      // Additional validations
      if (testCase.expectedErrorCode) {
        test.expectedErrorCode = testCase.expectedErrorCode;
        test.errorCodeMatch = response.data?.error?.code === testCase.expectedErrorCode;
      }

      if (testCase.shouldHaveMessage) {
        test.hasMessage = !!response.data?.message || !!response.data?.error?.message;
      }

      test.success = test.statusMatch && test.hasUnifiedErrorFormat && 
                    (test.errorCodeMatch !== false) && 
                    (test.hasMessage !== false);

      this.results.errorTests.push(test);

      if (test.success) {
        this.log(`✅ ${testCase.name} - Status: ${response.status}`, 'success');
      } else {
        this.log(`❌ ${testCase.name} - Issues detected`, 'error');
        if (!test.statusMatch) {
          this.log(`   Expected status: ${testCase.expectedStatus}, got: ${response.status}`, 'error');
        }
        if (!test.hasUnifiedErrorFormat) {
          this.log(`   Missing unified error format`, 'error');
        }
      }

      return test;
    } catch (error) {
      this.log(`❌ Error testing ${testCase.name}: ${error.message}`, 'error');
      const test = {
        name: testCase.name,
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      };
      this.results.errorTests.push(test);
      return test;
    }
  }

  validateErrorFormat(data) {
    // Check for unified error envelope format
    if (!data) return false;
    
    // Success responses don't need error format
    if (data.success === true || data.message) return true;
    
    // Error responses should have error object with code and message
    if (data.error && typeof data.error === 'object') {
      return !!(data.error.code && data.error.message);
    }
    
    return false;
  }

  async runErrorTests() {
    const errorTestCases = [
      {
        name: 'Invalid Email Format - Password Reset',
        endpoint: '/api/auth/password/request',
        data: { email: 'invalid-email-format' },
        expectedStatus: 400,
        expectedErrorCode: 'VALIDATION_ERROR',
        shouldHaveMessage: true
      },
      {
        name: 'Missing Email - Password Reset',
        endpoint: '/api/auth/password/request',
        data: {},
        expectedStatus: 400,
        expectedErrorCode: 'VALIDATION_ERROR',
        shouldHaveMessage: true
      },
      {
        name: 'Invalid Token - Email Verification',
        endpoint: '/api/auth/verify-email',
        data: { token: 'invalid-token-12345' },
        expectedStatus: [400, 401, 404],
        shouldHaveMessage: true
      },
      {
        name: 'Missing Token - Email Verification',
        endpoint: '/api/auth/verify-email',
        data: {},
        expectedStatus: 400,
        expectedErrorCode: 'VALIDATION_ERROR',
        shouldHaveMessage: true
      },
      {
        name: 'Invalid Token - Password Reset',
        endpoint: '/api/auth/reset-password',
        data: { 
          token: 'invalid-token-12345',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!'
        },
        expectedStatus: [400, 401, 404],
        shouldHaveMessage: true
      },
      {
        name: 'Weak Password - Password Reset',
        endpoint: '/api/auth/reset-password',
        data: { 
          token: 'valid-token-format',
          newPassword: '123',
          confirmPassword: '123'
        },
        expectedStatus: 400,
        expectedErrorCode: 'VALIDATION_ERROR',
        shouldHaveMessage: true
      },
      {
        name: 'Password Mismatch - Password Reset',
        endpoint: '/api/auth/reset-password',
        data: { 
          token: 'valid-token-format',
          newPassword: 'Password123!',
          confirmPassword: 'DifferentPassword123!'
        },
        expectedStatus: 400,
        expectedErrorCode: 'VALIDATION_ERROR',
        shouldHaveMessage: true
      },
      {
        name: 'Invalid Email - Registration',
        endpoint: '/api/auth/register',
        data: {
          firstName: 'Test',
          lastName: 'User',
          email: 'invalid-email',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        },
        expectedStatus: 400,
        expectedErrorCode: 'VALIDATION_ERROR',
        shouldHaveMessage: true
      },
      {
        name: 'Missing Required Fields - Registration',
        endpoint: '/api/auth/register',
        data: {
          email: 'test@example.com'
        },
        expectedStatus: 400,
        expectedErrorCode: 'VALIDATION_ERROR',
        shouldHaveMessage: true
      },
      {
        name: 'Invalid Credentials - Login',
        endpoint: '/api/auth/login',
        data: {
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!'
        },
        expectedStatus: 401,
        expectedErrorCode: 'INVALID_CREDENTIALS',
        shouldHaveMessage: true
      }
    ];

    for (const testCase of errorTestCases) {
      await this.testErrorScenario(testCase);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  async testRateLimitingErrors() {
    this.log('Testing rate limiting error handling...', 'test');
    
    const rapidRequests = [];
    const testEmail = 'rate-limit-test@example.com';
    
    // Make 5 rapid requests to trigger rate limiting
    for (let i = 0; i < 5; i++) {
      rapidRequests.push(
        axios.post(`${this.baseURL}/api/auth/password/request`, {
          email: testEmail
        }, {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
          validateStatus: () => true
        })
      );
    }

    try {
      const responses = await Promise.all(rapidRequests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      const test = {
        name: 'Rate Limiting Error Format',
        endpoint: '/api/auth/password/request',
        method: 'POST',
        totalRequests: responses.length,
        rateLimitedCount: rateLimitedResponses.length,
        success: rateLimitedResponses.length > 0,
        hasUnifiedErrorFormat: rateLimitedResponses.every(r => this.validateErrorFormat(r.data)),
        timestamp: new Date().toISOString()
      };

      if (rateLimitedResponses.length > 0) {
        test.sampleRateLimitResponse = rateLimitedResponses[0].data;
      }

      this.results.errorTests.push(test);

      if (test.success && test.hasUnifiedErrorFormat) {
        this.log(`✅ Rate limiting working with proper error format`, 'success');
      } else if (test.success) {
        this.log(`⚠️ Rate limiting working but error format needs improvement`, 'warning');
      } else {
        this.log(`❌ Rate limiting not triggered`, 'error');
      }

    } catch (error) {
      this.log(`❌ Error testing rate limiting: ${error.message}`, 'error');
    }
  }

  generateReport() {
    const passed = this.results.errorTests.filter(t => t.success).length;
    const failed = this.results.errorTests.filter(t => !t.success).length;
    const total = this.results.errorTests.length;
    
    // Analyze error format consistency
    const testsWithErrorFormat = this.results.errorTests.filter(t => 
      t.hasUnifiedErrorFormat !== undefined
    );
    const properErrorFormat = testsWithErrorFormat.filter(t => 
      t.hasUnifiedErrorFormat === true
    ).length;
    
    this.results.summary = {
      total,
      passed,
      failed,
      successRate: `${((passed / total) * 100).toFixed(1)}%`,
      errorFormatConsistency: testsWithErrorFormat.length > 0 
        ? `${((properErrorFormat / testsWithErrorFormat.length) * 100).toFixed(1)}%`
        : 'N/A',
      overallStatus: failed === 0 ? 'ALL_ERROR_HANDLING_WORKING' : 'ISSUES_DETECTED'
    };

    this.log('\n📊 ERROR HANDLING VALIDATION SUMMARY', 'info');
    this.log(`Environment: ${this.baseURL}`, 'info');
    this.log(`Tests: ${passed}/${total} passed (${this.results.summary.successRate})`, passed === total ? 'success' : 'error');
    this.log(`Error Format Consistency: ${this.results.summary.errorFormatConsistency}`, 'info');

    // Show detailed results
    this.log('\n📋 DETAILED ERROR TEST RESULTS:', 'info');
    this.results.errorTests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      this.log(`${status} ${test.name}`, test.success ? 'success' : 'error');
      
      if (test.actualStatus) {
        this.log(`   Status: ${test.actualStatus}`, 'info');
      }
      
      if (test.hasUnifiedErrorFormat === false) {
        this.log(`   ⚠️ Missing unified error format`, 'warning');
      }
      
      if (test.error) {
        this.log(`   Error: ${test.error}`, 'error');
      }
    });

    return this.results;
  }

  async run() {
    this.log('🚀 Starting Error Handling Validation', 'info');
    this.log(`Target: ${this.baseURL}`, 'info');

    try {
      await this.runErrorTests();
      await this.testRateLimitingErrors();

      const results = this.generateReport();

      // Save results
      await fs.writeFile('error-handling-validation-results.json', JSON.stringify(results, null, 2));
      this.log('\n📄 Results saved to error-handling-validation-results.json', 'info');

      // Exit with appropriate code
      process.exit(results.summary.overallStatus === 'ALL_ERROR_HANDLING_WORKING' ? 0 : 1);

    } catch (error) {
      this.log(`🚨 Critical error during validation: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ErrorHandlingValidator();
  validator.run().catch(console.error);
}

module.exports = ErrorHandlingValidator;
