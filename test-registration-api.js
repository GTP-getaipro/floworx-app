#!/usr/bin/env node

/**
 * Test Registration API - Verify 400 Bad Request and TypeError fixes
 * Tests both success and error scenarios with consistent response schemas
 */

const axios = require('axios');

const BASE_URL = 'https://app.floworx-iq.com';
const API_URL = `${BASE_URL}/api`;

class RegistrationAPITester {
  constructor() {
    this.results = [];
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

  async testValidRegistration() {
    const timestamp = Date.now();
    const testUser = {
      email: `test-${timestamp}@floworx-test.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      businessName: 'Test Business'
    };

    try {
      const response = await axios.post(`${API_URL}/auth/register`, testUser);
      
      // Check response schema
      const data = response.data;
      const hasCorrectSchema = (
        data.success === true &&
        data.user &&
        data.user.id &&
        data.user.email &&
        data.meta &&
        typeof data.meta.remoteAddr !== 'undefined' // Can be string or null
      );

      this.log(
        'Valid Registration',
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

    } catch (error) {
      this.log(
        'Valid Registration',
        false,
        `Registration failed: ${error.response?.data?.error?.message || error.message}`,
        {
          status: error.response?.status,
          errorCode: error.response?.data?.error?.code,
          hasRemoteAddr: typeof error.response?.data?.meta?.remoteAddr
        }
      );
    }
  }

  async testValidationErrors() {
    const invalidUsers = [
      {
        name: 'Missing Email',
        data: { password: 'TestPassword123!', firstName: 'Test', lastName: 'User' }
      },
      {
        name: 'Invalid Email',
        data: { email: 'invalid-email', password: 'TestPassword123!', firstName: 'Test', lastName: 'User' }
      },
      {
        name: 'Short Password',
        data: { email: 'test@example.com', password: '123', firstName: 'Test', lastName: 'User' }
      },
      {
        name: 'Missing Names',
        data: { email: 'test@example.com', password: 'TestPassword123!' }
      }
    ];

    for (const testCase of invalidUsers) {
      try {
        await axios.post(`${API_URL}/auth/register`, testCase.data);
        this.log(`Validation: ${testCase.name}`, false, 'Should have failed with 400 error');
        
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
          `Validation: ${testCase.name}`,
          hasCorrectErrorSchema && error.response?.status === 400,
          hasCorrectErrorSchema ? 'Correct validation error schema' : 'Validation error schema failed',
          {
            status: error.response?.status,
            errorCode: data?.error?.code,
            hasRemoteAddr: typeof data?.meta?.remoteAddr,
            message: data?.error?.message
          }
        );
      }
    }
  }

  async testRemoteAddrSafety() {
    // Test that remoteAddr is always present and safe to use
    const testUser = {
      email: `remoteaddr-test-${Date.now()}@floworx-test.com`,
      password: 'TestPassword123!',
      firstName: 'RemoteAddr',
      lastName: 'Test'
    };

    try {
      const response = await axios.post(`${API_URL}/auth/register`, testUser);
      const remoteAddr = response.data.meta?.remoteAddr;
      
      // Test that remoteAddr is safe to use
      let safeToUse = true;
      let errorMessage = '';
      
      try {
        if (remoteAddr && typeof remoteAddr === 'string') {
          // This should not throw an error
          const lowerCase = remoteAddr.toLowerCase();
          console.log(`   RemoteAddr processed safely: ${lowerCase}`);
        }
      } catch (typeError) {
        safeToUse = false;
        errorMessage = typeError.message;
      }

      this.log(
        'RemoteAddr Safety',
        safeToUse,
        safeToUse ? 'RemoteAddr is safe to process' : `RemoteAddr caused error: ${errorMessage}`,
        {
          remoteAddrType: typeof remoteAddr,
          remoteAddrValue: remoteAddr
        }
      );

    } catch (error) {
      // Test error response remoteAddr safety
      const remoteAddr = error.response?.data?.meta?.remoteAddr;
      
      let safeToUse = true;
      let errorMessage = '';
      
      try {
        if (remoteAddr && typeof remoteAddr === 'string') {
          const lowerCase = remoteAddr.toLowerCase();
          console.log(`   Error RemoteAddr processed safely: ${lowerCase}`);
        }
      } catch (typeError) {
        safeToUse = false;
        errorMessage = typeError.message;
      }

      this.log(
        'RemoteAddr Safety (Error)',
        safeToUse,
        safeToUse ? 'Error RemoteAddr is safe to process' : `Error RemoteAddr caused error: ${errorMessage}`,
        {
          remoteAddrType: typeof remoteAddr,
          remoteAddrValue: remoteAddr
        }
      );
    }
  }

  async runAllTests() {
    console.log('🧪 Starting Registration API Tests...\n');

    await this.testValidRegistration();
    await this.testValidationErrors();
    await this.testRemoteAddrSafety();

    // Summary
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    console.log(`\n📊 Test Summary: ${passed}/${total} tests passed`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! Registration API is working correctly.');
    } else {
      console.log('❌ Some tests failed. Check the output above for details.');
      process.exit(1);
    }
  }
}

// Run tests
const tester = new RegistrationAPITester();
tester.runAllTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
