#!/usr/bin/env node

/**
 * Comprehensive User Registration Diagnostics
 * Tests all aspects of user registration functionality
 */

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const config = {
  apiUrl: process.env.API_URL || 'http://localhost:5001/api',
  frontendUrl: process.env.FRONTEND_URL || 'https://app.floworx-iq.com',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  testEmail: `test-registration-${Date.now()}@floworx-iq.com`,
  testPassword: 'TestPassword123!',
  testUser: {
    firstName: 'Test',
    lastName: 'User',
    businessName: 'Test Business',
    email: '',
    password: ''
  }
};

// Initialize Supabase client
let supabase;

class UserRegistrationTester {
  constructor() {
    this.results = {};
    this.testUser = null;
    this.createdUsers = [];
  }

  async initialize() {
    console.log('🚀 Starting User Registration Diagnostics...');
    console.log(`Test Email: ${config.testEmail}`);
    console.log(`API URL: ${config.apiUrl}`);
    console.log(`Frontend URL: ${config.frontendUrl}`);

    // Initialize Supabase
    if (!config.supabaseUrl || !config.supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
    console.log('✅ SUCCESS: Supabase client initialized');

    // Set up test user data
    config.testUser.email = config.testEmail;
    config.testUser.password = config.testPassword;
  }

  async testDatabaseSchema() {
    console.log('\n🗄️  Testing Database Schema...');
    
    try {
      // Test users table structure
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1);

      if (usersError) {
        throw new Error(`Users table error: ${usersError.message}`);
      }

      console.log('✅ SUCCESS: users table exists and accessible');

      // Test email_verification_tokens table
      const { data: tokensData, error: tokensError } = await supabase
        .from('email_verification_tokens')
        .select('*')
        .limit(1);

      if (tokensError) {
        console.log('⚠️  WARNING: email_verification_tokens table may not exist');
      } else {
        console.log('✅ SUCCESS: email_verification_tokens table exists and accessible');
      }

      return { success: true };
    } catch (error) {
      console.log(`❌ FAILED: Database schema test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async testUserRegistration() {
    console.log('\n🔐 Testing User Registration...');
    
    try {
      const registrationData = {
        firstName: config.testUser.firstName,
        lastName: config.testUser.lastName,
        email: config.testUser.email,
        password: config.testUser.password,
        businessName: config.testUser.businessName,
        agreeToTerms: true,
        marketingConsent: false
      };

      console.log('📝 Attempting registration with data:', {
        ...registrationData,
        password: '[REDACTED]'
      });

      const response = await axios.post(`${config.apiUrl}/auth/register`, registrationData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 201 || response.status === 200) {
        console.log('✅ SUCCESS: User registration successful');
        console.log('📋 Registration response:', response.data);
        
        this.testUser = response.data.user;
        this.createdUsers.push(config.testUser.email);
        
        return { success: true, data: response.data };
      } else {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      if (error.response) {
        console.log(`❌ FAILED: Registration failed with status ${error.response.status}`);
        console.log('📋 Error response:', error.response.data);
        return { success: false, error: error.response.data };
      } else {
        console.log(`❌ FAILED: Registration request failed: ${error.message}`);
        return { success: false, error: error.message };
      }
    }
  }

  async testDuplicateEmailHandling() {
    console.log('\n🔄 Testing Duplicate Email Handling...');
    
    try {
      const duplicateData = {
        firstName: 'Duplicate',
        lastName: 'User',
        email: config.testUser.email, // Same email as previous test
        password: 'AnotherPassword123!',
        businessName: 'Another Business',
        agreeToTerms: true
      };

      const response = await axios.post(`${config.apiUrl}/auth/register`, duplicateData, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      // Should not reach here - duplicate should be rejected
      console.log('❌ FAILED: Duplicate email was accepted (should be rejected)');
      return { success: false, error: 'Duplicate email was not rejected' };
      
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log('✅ SUCCESS: Duplicate email properly rejected');
        return { success: true };
      } else if (error.response) {
        console.log(`⚠️  WARNING: Unexpected error status for duplicate: ${error.response.status}`);
        console.log('📋 Error response:', error.response.data);
        return { success: false, error: error.response.data };
      } else {
        console.log(`❌ FAILED: Request failed: ${error.message}`);
        return { success: false, error: error.message };
      }
    }
  }

  async testInputValidation() {
    console.log('\n✅ Testing Input Validation...');
    
    const testCases = [
      {
        name: 'Missing email',
        data: { firstName: 'Test', lastName: 'User', password: 'Test123!', agreeToTerms: true },
        expectedStatus: 400
      },
      {
        name: 'Invalid email format',
        data: { firstName: 'Test', lastName: 'User', email: 'invalid-email', password: 'Test123!', agreeToTerms: true },
        expectedStatus: 400
      },
      {
        name: 'Weak password',
        data: { firstName: 'Test', lastName: 'User', email: 'test@example.com', password: '123', agreeToTerms: true },
        expectedStatus: 400
      },
      {
        name: 'Missing required fields',
        data: { email: 'test@example.com', password: 'Test123!' },
        expectedStatus: 400
      }
    ];

    let passedTests = 0;
    
    for (const testCase of testCases) {
      try {
        console.log(`🧪 Testing: ${testCase.name}`);
        
        const response = await axios.post(`${config.apiUrl}/auth/register`, testCase.data, {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });

        console.log(`❌ FAILED: ${testCase.name} - Expected error but got success`);
      } catch (error) {
        if (error.response && error.response.status === testCase.expectedStatus) {
          console.log(`✅ PASSED: ${testCase.name}`);
          passedTests++;
        } else {
          console.log(`❌ FAILED: ${testCase.name} - Expected ${testCase.expectedStatus}, got ${error.response?.status || 'network error'}`);
        }
      }
    }

    return { success: passedTests === testCases.length, passedTests, totalTests: testCases.length };
  }

  async testEmailVerification() {
    console.log('\n📧 Testing Email Verification...');
    
    if (!this.testUser) {
      console.log('⚠️  SKIPPED: No test user available for email verification test');
      return { success: false, error: 'No test user available' };
    }

    try {
      // Test manual email verification (development endpoint)
      const verifyResponse = await axios.post(`${config.apiUrl}/auth/manual-verify-email`, {
        email: config.testUser.email
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (verifyResponse.status === 200) {
        console.log('✅ SUCCESS: Email verification successful');
        return { success: true, data: verifyResponse.data };
      } else {
        throw new Error(`Unexpected status: ${verifyResponse.status}`);
      }
    } catch (error) {
      if (error.response) {
        console.log(`❌ FAILED: Email verification failed with status ${error.response.status}`);
        console.log('📋 Error response:', error.response.data);
        return { success: false, error: error.response.data };
      } else {
        console.log(`❌ FAILED: Email verification request failed: ${error.message}`);
        return { success: false, error: error.message };
      }
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    for (const email of this.createdUsers) {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('email', email);

        if (error) {
          console.log(`⚠️  WARNING: Failed to delete test user ${email}: ${error.message}`);
        } else {
          console.log(`✅ Deleted test user: ${email}`);
        }
      } catch (error) {
        console.log(`⚠️  WARNING: Error during cleanup for ${email}: ${error.message}`);
      }
    }

    console.log('✅ Cleanup completed');
  }

  async runAllTests() {
    const results = {};

    try {
      await this.initialize();
      
      results.databaseSchema = await this.testDatabaseSchema();
      results.userRegistration = await this.testUserRegistration();
      results.duplicateEmailHandling = await this.testDuplicateEmailHandling();
      results.inputValidation = await this.testInputValidation();
      results.emailVerification = await this.testEmailVerification();

    } catch (error) {
      console.error('❌ FATAL ERROR:', error.message);
      results.fatalError = error.message;
    } finally {
      await this.cleanup();
    }

    return results;
  }

  generateReport(results) {
    console.log('\n📊 DIAGNOSTIC REPORT');
    console.log('==================================================');
    
    const testResults = [];
    let passedCount = 0;
    let totalCount = 0;

    // Process results
    Object.entries(results).forEach(([testName, result]) => {
      if (testName === 'fatalError') return;
      
      totalCount++;
      const passed = result.success === true;
      if (passed) passedCount++;
      
      testResults.push({
        name: testName,
        status: passed ? '✅ PASS' : '❌ FAIL',
        details: result.error || result.message || ''
      });
    });

    console.log('\n🧪 Test Results:');
    testResults.forEach(test => {
      console.log(`  ${test.name}: ${test.status}`);
      if (test.details) {
        console.log(`    ${test.details}`);
      }
    });

    console.log('\n💡 Recommendations:');
    if (passedCount === totalCount) {
      console.log('  🎉 All tests passed! User registration system is working correctly.');
    } else {
      console.log(`  ⚠️  ${totalCount - passedCount} test(s) failed. Review the errors above.`);
      
      if (!results.databaseSchema?.success) {
        console.log('  🔧 Fix database schema issues first');
      }
      if (!results.userRegistration?.success) {
        console.log('  🔧 Fix user registration endpoint');
      }
      if (!results.duplicateEmailHandling?.success) {
        console.log('  🔧 Implement proper duplicate email validation');
      }
      if (!results.inputValidation?.success) {
        console.log('  🔧 Strengthen input validation');
      }
      if (!results.emailVerification?.success) {
        console.log('  🔧 Fix email verification system');
      }
    }

    console.log(`\n🎯 Overall Status: ${passedCount === totalCount ? '✅ HEALTHY' : '❌ NEEDS ATTENTION'}`);
    console.log(`📈 Summary: ${passedCount}/${totalCount} tests passed`);
  }
}

// Main execution
async function main() {
  const tester = new UserRegistrationTester();
  
  try {
    const results = await tester.runAllTests();
    tester.generateReport(results);
  } catch (error) {
    console.error('💥 CRITICAL ERROR:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { UserRegistrationTester, config };
