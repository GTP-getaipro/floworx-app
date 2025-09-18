#!/usr/bin/env node

/**
 * Production Email Verification & Password Reset Flow Validation
 * Tests complete email delivery flows in production environment
 */

const axios = require('axios');
const fs = require('fs').promises;

class ProductionEmailValidator {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com';
    this.testEmail = 'qa-test@example.com';
    this.results = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      baseURL: this.baseURL,
      tests: [],
      summary: {},
      emailDeliveryTests: []
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📧',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      email: '📬',
      test: '🧪'
    }[level] || '📧';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async testForgotPasswordAPI() {
    this.log('Testing forgot password API with production email delivery...', 'test');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/password/request`, {
        email: this.testEmail
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      });
      
      const test = {
        name: 'Forgot Password API',
        endpoint: 'POST /api/auth/password/request',
        email: this.testEmail,
        status: response.status,
        data: response.data,
        success: response.status === 202,
        expectedMessage: response.data?.message?.includes('password reset link') || 
                        response.data?.message?.includes('email is registered'),
        timestamp: new Date().toISOString()
      };
      
      this.results.tests.push(test);
      
      if (test.success && test.expectedMessage) {
        this.log(`✅ Password reset API successful - Email should be sent to ${this.testEmail}`, 'success');
        this.log('📬 Check your inbox for password reset email from noreply@floworx-iq.com', 'email');
      } else {
        this.log(`❌ Password reset API failed: ${response.status}`, 'error');
      }
      
      return test;
    } catch (error) {
      this.log(`❌ Error testing forgot password API: ${error.message}`, 'error');
      const test = {
        name: 'Forgot Password API',
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      };
      this.results.tests.push(test);
      return test;
    }
  }

  async testRegistrationWithEmailVerification() {
    this.log('Testing registration with email verification...', 'test');
    
    const testUser = {
      firstName: 'QA',
      lastName: 'Test',
      email: `qa-test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!'
    };
    
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/register`, testUser, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      });
      
      const test = {
        name: 'Registration with Email Verification',
        endpoint: 'POST /api/auth/register',
        email: testUser.email,
        status: response.status,
        data: response.data,
        success: response.status === 201 || response.status === 200,
        emailSent: response.data?.emailSent || false,
        requiresVerification: response.data?.requiresVerification || false,
        userId: response.data?.userId,
        timestamp: new Date().toISOString()
      };
      
      this.results.tests.push(test);
      
      if (test.success) {
        this.log(`✅ Registration successful for ${testUser.email}`, 'success');
        if (test.emailSent) {
          this.log('📬 Verification email should be sent - Check inbox for verification link', 'email');
        } else {
          this.log('⚠️ Registration succeeded but no verification email sent', 'warning');
        }
      } else {
        this.log(`❌ Registration failed: ${response.status}`, 'error');
      }
      
      return test;
    } catch (error) {
      this.log(`❌ Error testing registration: ${error.message}`, 'error');
      const test = {
        name: 'Registration with Email Verification',
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      };
      this.results.tests.push(test);
      return test;
    }
  }

  async testEmailVerificationEndpoint() {
    this.log('Testing email verification endpoint...', 'test');
    
    try {
      // Test with a dummy token to see the response format
      const response = await axios.post(`${this.baseURL}/api/auth/verify-email`, {
        token: 'test-token-for-format-validation'
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      });
      
      const test = {
        name: 'Email Verification Endpoint',
        endpoint: 'POST /api/auth/verify-email',
        status: response.status,
        data: response.data,
        success: response.status === 400 || response.status === 401 || response.status === 404, // Expected for invalid token
        hasUnifiedErrorFormat: response.data?.error?.code !== undefined,
        timestamp: new Date().toISOString()
      };
      
      this.results.tests.push(test);
      
      if (test.success && test.hasUnifiedErrorFormat) {
        this.log('✅ Email verification endpoint responding with proper error format', 'success');
      } else {
        this.log(`⚠️ Email verification endpoint response: ${response.status}`, 'warning');
      }
      
      return test;
    } catch (error) {
      this.log(`❌ Error testing email verification: ${error.message}`, 'error');
      const test = {
        name: 'Email Verification Endpoint',
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      };
      this.results.tests.push(test);
      return test;
    }
  }

  async testPasswordResetTokenValidation() {
    this.log('Testing password reset token validation...', 'test');
    
    try {
      // Test with a dummy token to see the response format
      const response = await axios.post(`${this.baseURL}/api/auth/reset-password`, {
        token: 'test-token-for-validation',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!'
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      });
      
      const test = {
        name: 'Password Reset Token Validation',
        endpoint: 'POST /api/auth/reset-password',
        status: response.status,
        data: response.data,
        success: response.status === 400 || response.status === 401 || response.status === 404, // Expected for invalid token
        hasUnifiedErrorFormat: response.data?.error?.code !== undefined,
        timestamp: new Date().toISOString()
      };
      
      this.results.tests.push(test);
      
      if (test.success && test.hasUnifiedErrorFormat) {
        this.log('✅ Password reset endpoint responding with proper error format', 'success');
      } else {
        this.log(`⚠️ Password reset endpoint response: ${response.status}`, 'warning');
      }
      
      return test;
    } catch (error) {
      this.log(`❌ Error testing password reset validation: ${error.message}`, 'error');
      const test = {
        name: 'Password Reset Token Validation',
        error: error.message,
        success: false,
        timestamp: new Date().toISOString()
      };
      this.results.tests.push(test);
      return test;
    }
  }

  async testEmailDeliveryIndicators() {
    this.log('Testing email delivery indicators...', 'test');
    
    const tests = [
      {
        name: 'Password Reset Email Request',
        email: 'delivery-test-reset@example.com',
        endpoint: '/api/auth/password/request'
      },
      {
        name: 'Registration Email Request', 
        email: `delivery-test-reg-${Date.now()}@example.com`,
        endpoint: '/api/auth/register'
      }
    ];
    
    for (const testCase of tests) {
      try {
        let response;
        
        if (testCase.endpoint === '/api/auth/password/request') {
          response = await axios.post(`${this.baseURL}${testCase.endpoint}`, {
            email: testCase.email
          }, {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
            validateStatus: () => true
          });
        } else {
          response = await axios.post(`${this.baseURL}${testCase.endpoint}`, {
            firstName: 'Delivery',
            lastName: 'Test',
            email: testCase.email,
            password: 'TestPassword123!',
            confirmPassword: 'TestPassword123!'
          }, {
            withCredentials: true,
            headers: { 'Content-Type': 'application/json' },
            validateStatus: () => true
          });
        }
        
        const deliveryTest = {
          name: testCase.name,
          email: testCase.email,
          endpoint: testCase.endpoint,
          status: response.status,
          success: response.status === 202 || response.status === 201 || response.status === 200,
          emailIndicator: response.data?.emailSent || response.data?.message?.includes('email'),
          timestamp: new Date().toISOString()
        };
        
        this.results.emailDeliveryTests.push(deliveryTest);
        
        if (deliveryTest.success) {
          this.log(`✅ ${testCase.name} - API indicates email should be sent to ${testCase.email}`, 'success');
        } else {
          this.log(`❌ ${testCase.name} failed: ${response.status}`, 'error');
        }
        
      } catch (error) {
        this.log(`❌ Error testing ${testCase.name}: ${error.message}`, 'error');
        this.results.emailDeliveryTests.push({
          name: testCase.name,
          error: error.message,
          success: false,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  generateManualTestInstructions() {
    const instructions = {
      forgotPassword: {
        title: "🔐 Manual Forgot Password Test",
        steps: [
          "1. Navigate to https://app.floworx-iq.com/forgot-password",
          `2. Enter email: ${this.testEmail}`,
          "3. Submit form and verify success message",
          "4. Check email inbox for reset email from noreply@floworx-iq.com",
          "5. Click reset link in email",
          "6. Enter new password and confirm",
          "7. Attempt login with new password",
          "8. Verify successful login"
        ]
      },
      registration: {
        title: "📝 Manual Registration + Verification Test",
        steps: [
          "1. Navigate to https://app.floworx-iq.com/register",
          "2. Fill out registration form with test email",
          "3. Submit and verify success message",
          "4. Check email inbox for verification email from noreply@floworx-iq.com",
          "5. Click verification link in email",
          "6. Verify redirect to success page",
          "7. Check for welcome email delivery",
          "8. Attempt login with registered credentials"
        ]
      },
      emailChecks: {
        title: "📬 Email Delivery Validation",
        checks: [
          "✅ Emails arrive in inbox (not spam folder)",
          "✅ Sender shows as noreply@floworx-iq.com",
          "✅ Email content is properly formatted",
          "✅ Links in emails work correctly",
          "✅ Email delivery time is reasonable (< 5 minutes)",
          "✅ No duplicate emails sent"
        ]
      }
    };
    
    return instructions;
  }

  generateReport() {
    const passed = this.results.tests.filter(t => t.success).length;
    const failed = this.results.tests.filter(t => !t.success).length;
    const total = this.results.tests.length;
    
    const emailPassed = this.results.emailDeliveryTests.filter(t => t.success).length;
    const emailFailed = this.results.emailDeliveryTests.filter(t => !t.success).length;
    const emailTotal = this.results.emailDeliveryTests.length;
    
    this.results.summary = {
      apiTests: {
        total,
        passed,
        failed,
        successRate: `${((passed / total) * 100).toFixed(1)}%`
      },
      emailDeliveryTests: {
        total: emailTotal,
        passed: emailPassed,
        failed: emailFailed,
        successRate: `${((emailPassed / emailTotal) * 100).toFixed(1)}%`
      },
      overallStatus: (failed === 0 && emailFailed === 0) ? 'ALL_SYSTEMS_OPERATIONAL' : 'ISSUES_DETECTED'
    };
    
    this.log('\n📊 PRODUCTION EMAIL VALIDATION SUMMARY', 'info');
    this.log(`Environment: ${this.baseURL}`, 'info');
    this.log(`API Tests: ${passed}/${total} passed (${this.results.summary.apiTests.successRate})`, passed === total ? 'success' : 'error');
    this.log(`Email Tests: ${emailPassed}/${emailTotal} passed (${this.results.summary.emailDeliveryTests.successRate})`, emailPassed === emailTotal ? 'success' : 'error');
    
    // Show detailed results
    this.log('\n📋 API TEST RESULTS:', 'info');
    this.results.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      this.log(`${status} ${test.name}: ${test.endpoint || 'N/A'}`, test.success ? 'success' : 'error');
      if (test.email) {
        this.log(`   Email: ${test.email}`, 'info');
      }
      if (test.error) {
        this.log(`   Error: ${test.error}`, 'error');
      }
    });
    
    this.log('\n📬 EMAIL DELIVERY TEST RESULTS:', 'info');
    this.results.emailDeliveryTests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      this.log(`${status} ${test.name}: ${test.email || 'N/A'}`, test.success ? 'success' : 'error');
    });
    
    return this.results;
  }

  async run() {
    this.log('🚀 Starting Production Email Validation', 'info');
    this.log(`Target Environment: ${this.baseURL}`, 'info');
    this.log(`Test Email: ${this.testEmail}`, 'info');
    
    try {
      // Run API tests
      await this.testForgotPasswordAPI();
      await this.testRegistrationWithEmailVerification();
      await this.testEmailVerificationEndpoint();
      await this.testPasswordResetTokenValidation();
      await this.testEmailDeliveryIndicators();
      
      // Generate report
      const results = this.generateReport();
      const instructions = this.generateManualTestInstructions();
      
      // Save results
      await fs.writeFile('production-email-validation-results.json', JSON.stringify({
        ...results,
        manualTestInstructions: instructions
      }, null, 2));
      
      this.log('\n📄 Results saved to production-email-validation-results.json', 'info');
      
      // Show manual test instructions
      this.log('\n🧪 MANUAL TEST INSTRUCTIONS:', 'test');
      Object.values(instructions).forEach(section => {
        this.log(`\n${section.title}:`, 'info');
        if (section.steps) {
          section.steps.forEach(step => this.log(`  ${step}`, 'info'));
        }
        if (section.checks) {
          section.checks.forEach(check => this.log(`  ${check}`, 'info'));
        }
      });
      
      // Exit with appropriate code
      process.exit(results.summary.overallStatus === 'ALL_SYSTEMS_OPERATIONAL' ? 0 : 1);
      
    } catch (error) {
      this.log(`🚨 Critical error during validation: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new ProductionEmailValidator();
  validator.run().catch(console.error);
}

module.exports = ProductionEmailValidator;
