#!/usr/bin/env node

/**
 * Complete Auth Flow Test Suite
 * Tests all authentication endpoints with new response schemas
 */

const axios = require('axios');

const BASE_URL = 'https://app.floworx-iq.com';
const API_URL = `${BASE_URL}/api`;

class CompleteAuthFlowTester {
  constructor() {
    this.results = [];
    this.testUser = {
      email: `auth-test-${Date.now()}@floworx-test.com`,
      password: 'TestPassword123!',
      firstName: 'Auth',
      lastName: 'Test',
      businessName: 'Auth Test Business'
    };
  }

  log(test, success, message, data = null) {
    const result = { test, success, message, data, timestamp: new Date().toISOString() };
    this.results.push(result);
    
    const status = success ? '✅' : '❌';
    console.log(`${status} ${test}: ${message}`);
    if (data) {
      console.log(`   Data:`, JSON.stringify(data, null, 2));
    }
  }

  async testRegistrationFlow() {
    console.log('\n🔐 TESTING REGISTRATION FLOW');
    console.log('============================');

    try {
      const response = await axios.post(`${API_URL}/auth/register`, this.testUser);
      
      const data = response.data;
      const hasCorrectSchema = (
        data.success === true &&
        data.user &&
        data.user.id &&
        data.user.email &&
        data.meta &&
        typeof data.meta.remoteAddr !== 'undefined'
      );

      this.log(
        'Registration',
        hasCorrectSchema && response.status === 201,
        hasCorrectSchema ? 'Registration successful with correct schema' : 'Schema validation failed',
        {
          status: response.status,
          success: data.success,
          hasUser: !!data.user,
          hasRemoteAddr: typeof data.meta?.remoteAddr,
          requiresVerification: data.meta?.requiresVerification
        }
      );

      return { success: hasCorrectSchema, user: data.user };

    } catch (error) {
      this.log(
        'Registration',
        false,
        `Registration failed: ${error.response?.data?.error?.message || error.message}`,
        {
          status: error.response?.status,
          errorCode: error.response?.data?.error?.code
        }
      );
      return { success: false };
    }
  }

  async testLoginFlow() {
    console.log('\n🔑 TESTING LOGIN FLOW');
    console.log('=====================');

    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        email: this.testUser.email,
        password: this.testUser.password
      });
      
      const data = response.data;
      const hasCorrectSchema = (
        data.success === true &&
        data.user &&
        data.user.id &&
        data.user.email &&
        data.meta &&
        typeof data.meta.remoteAddr !== 'undefined'
      );

      this.log(
        'Login',
        hasCorrectSchema && response.status === 200,
        hasCorrectSchema ? 'Login successful with correct schema' : 'Schema validation failed',
        {
          status: response.status,
          success: data.success,
          hasUser: !!data.user,
          hasRemoteAddr: typeof data.meta?.remoteAddr,
          sessionTtl: data.meta?.sessionTtl
        }
      );

      return { success: hasCorrectSchema, cookies: response.headers['set-cookie'] };

    } catch (error) {
      // Expected if email not verified
      if (error.response?.status === 403 && error.response?.data?.error?.code === 'EMAIL_NOT_VERIFIED') {
        this.log(
          'Login (Unverified)',
          true,
          'Correctly blocked unverified email login',
          {
            status: error.response.status,
            errorCode: error.response.data.error.code,
            hasResendUrl: !!error.response.data.meta?.resendUrl
          }
        );
        return { success: true, needsVerification: true };
      }

      this.log(
        'Login',
        false,
        `Login failed: ${error.response?.data?.error?.message || error.message}`,
        {
          status: error.response?.status,
          errorCode: error.response?.data?.error?.code
        }
      );
      return { success: false };
    }
  }

  async testAuthVerifyEndpoint() {
    console.log('\n🔍 TESTING AUTH VERIFY ENDPOINT');
    console.log('===============================');

    try {
      const response = await axios.get(`${API_URL}/auth/verify`);
      
      const data = response.data;
      const hasCorrectSchema = (
        data.success === true &&
        data.user &&
        data.user.id &&
        data.user.email &&
        data.meta &&
        typeof data.meta.remoteAddr !== 'undefined'
      );

      this.log(
        'Auth Verify (Authenticated)',
        hasCorrectSchema && response.status === 200,
        hasCorrectSchema ? 'Auth verify successful with correct schema' : 'Schema validation failed',
        {
          status: response.status,
          success: data.success,
          hasUser: !!data.user,
          hasRemoteAddr: typeof data.meta?.remoteAddr
        }
      );

    } catch (error) {
      // Expected if not authenticated
      if (error.response?.status === 401) {
        this.log(
          'Auth Verify (Unauthenticated)',
          true,
          'Correctly returns 401 for unauthenticated request',
          {
            status: error.response.status,
            errorCode: error.response.data?.error?.code
          }
        );
      } else {
        this.log(
          'Auth Verify',
          false,
          `Auth verify failed: ${error.response?.data?.error?.message || error.message}`,
          {
            status: error.response?.status,
            errorCode: error.response?.data?.error?.code
          }
        );
      }
    }
  }

  async testPasswordResetFlow() {
    console.log('\n🔄 TESTING PASSWORD RESET FLOW');
    console.log('==============================');

    try {
      const response = await axios.post(`${API_URL}/password-reset/request`, {
        email: this.testUser.email
      });

      const data = response.data;
      const hasCorrectSchema = (
        data.success === true &&
        data.message &&
        data.meta &&
        typeof data.meta.remoteAddr !== 'undefined'
      );

      this.log(
        'Password Reset Request',
        hasCorrectSchema && response.status === 200,
        hasCorrectSchema ? 'Password reset request successful with correct schema' : 'Schema validation failed',
        {
          status: response.status,
          success: data.success,
          hasMessage: !!data.message,
          hasRemoteAddr: typeof data.meta?.remoteAddr,
          requestTime: data.meta?.requestTime
        }
      );

    } catch (error) {
      this.log(
        'Password Reset Request',
        false,
        `Password reset failed: ${error.response?.data?.error?.message || error.message}`,
        {
          status: error.response?.status,
          errorCode: error.response?.data?.error?.code
        }
      );
    }
  }

  async testValidationErrors() {
    console.log('\n❌ TESTING VALIDATION ERRORS');
    console.log('=============================');

    const invalidRequests = [
      {
        name: 'Login - Missing Email',
        endpoint: '/auth/login',
        data: { password: 'TestPassword123!' }
      },
      {
        name: 'Login - Missing Password',
        endpoint: '/auth/login',
        data: { email: 'test@example.com' }
      },
      {
        name: 'Registration - Missing Names',
        endpoint: '/auth/register',
        data: { email: 'test@example.com', password: 'TestPassword123!' }
      }
    ];

    for (const testCase of invalidRequests) {
      try {
        await axios.post(`${API_URL}${testCase.endpoint}`, testCase.data);
        this.log(testCase.name, false, 'Should have failed with validation error');
        
      } catch (error) {
        const data = error.response?.data;
        const hasCorrectErrorSchema = (
          data.success === false &&
          data.error &&
          data.error.code === 'VALIDATION_ERROR' &&
          data.error.message &&
          typeof data.meta?.remoteAddr !== 'undefined'
        );

        this.log(
          testCase.name,
          hasCorrectErrorSchema && error.response?.status === 400,
          hasCorrectErrorSchema ? 'Correct validation error schema' : 'Validation error schema failed',
          {
            status: error.response?.status,
            errorCode: data?.error?.code,
            hasRemoteAddr: typeof data?.meta?.remoteAddr
          }
        );
      }
    }
  }

  async runAllTests() {
    console.log('🚀 Starting Complete Auth Flow Tests...\n');

    // Test registration
    const registrationResult = await this.testRegistrationFlow();
    
    // Test login (will fail if email not verified)
    await this.testLoginFlow();
    
    // Test auth verify endpoint
    await this.testAuthVerifyEndpoint();
    
    // Test password reset
    await this.testPasswordResetFlow();
    
    // Test validation errors
    await this.testValidationErrors();

    // Summary
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    console.log(`\n📊 Test Summary: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All auth flow tests passed! Authentication system is working correctly.');
    } else {
      console.log('❌ Some tests failed. Check the output above for details.');
      process.exit(1);
    }
  }
}

// Run tests
const tester = new CompleteAuthFlowTester();
tester.runAllTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
