#!/usr/bin/env node

/**
 * TEST REGISTRATION VALIDATION
 * ============================
 * Test registration with correct validation data
 */

const axios = require('axios');

async function testRegistrationWithCorrectData() {
  console.log('🧪 TESTING REGISTRATION WITH CORRECT DATA');
  console.log('=========================================');
  
  const baseUrl = 'https://app.floworx-iq.com/api';
  
  // Test data that matches the validation requirements
  const testCases = [
    {
      name: 'Complete Valid Registration',
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'test-' + Date.now() + '@example.com',
        password: 'TestPassword123!',
        businessName: 'Test Company LLC',
        businessType: 'hot_tub',
        phone: '+1234567890',
        agreeToTerms: true,
        marketingConsent: false
      }
    },
    {
      name: 'Minimal Valid Registration',
      data: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'test-minimal-' + Date.now() + '@example.com',
        password: 'TestPassword123!',
        businessName: 'Test Business',
        agreeToTerms: true
      }
    },
    {
      name: 'Registration Without Optional Fields',
      data: {
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'test-simple-' + Date.now() + '@example.com',
        password: 'SimplePass123!',
        agreeToTerms: true
      }
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    console.log('Data:', JSON.stringify(testCase.data, null, 2));
    
    try {
      const response = await axios.post(`${baseUrl}/auth/register`, testCase.data, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 15000,
        validateStatus: () => true
      });
      
      console.log(`Status: ${response.status}`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      
      if (response.status === 201) {
        console.log('✅ Registration successful!');
      } else if (response.status === 409) {
        console.log('✅ User already exists (expected for duplicate emails)');
      } else if (response.status === 400) {
        console.log('❌ Validation failed');
        if (response.data.message) {
          console.log(`   Error: ${response.data.message}`);
        }
        if (response.data.details) {
          console.log('   Details:', response.data.details);
        }
      } else {
        console.log(`⚠️  Unexpected status: ${response.status}`);
      }
      
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
  }
}

async function testRegistrationValidationErrors() {
  console.log('\n🧪 TESTING REGISTRATION VALIDATION ERRORS');
  console.log('==========================================');
  
  const baseUrl = 'https://app.floworx-iq.com/api';
  
  const invalidTestCases = [
    {
      name: 'Missing Required Fields',
      data: {
        email: 'test@example.com'
        // Missing password, firstName, lastName
      }
    },
    {
      name: 'Invalid Email Format',
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: 'TestPassword123!',
        agreeToTerms: true
      }
    },
    {
      name: 'Weak Password',
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'test-weak-' + Date.now() + '@example.com',
        password: '123',
        agreeToTerms: true
      }
    },
    {
      name: 'Missing Terms Agreement',
      data: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'test-terms-' + Date.now() + '@example.com',
        password: 'TestPassword123!'
        // Missing agreeToTerms
      }
    }
  ];
  
  for (const testCase of invalidTestCases) {
    console.log(`\n🧪 Testing: ${testCase.name}`);
    
    try {
      const response = await axios.post(`${baseUrl}/auth/register`, testCase.data, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        validateStatus: () => true
      });
      
      console.log(`Status: ${response.status}`);
      
      if (response.status === 400) {
        console.log('✅ Correctly rejected invalid data');
        console.log(`   Error: ${response.data.message || response.data.error}`);
      } else {
        console.log(`⚠️  Unexpected status: ${response.status}`);
        console.log('Response:', JSON.stringify(response.data, null, 2));
      }
      
    } catch (error) {
      console.log(`❌ Request failed: ${error.message}`);
    }
  }
}

async function identifyRegistrationIssue() {
  console.log('\n🔍 IDENTIFYING REGISTRATION ISSUE');
  console.log('=================================');
  
  const baseUrl = 'https://app.floworx-iq.com/api';
  
  // Test with the exact data format from our comprehensive test
  const originalTestData = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };
  
  console.log('🧪 Testing with original comprehensive test data:');
  console.log('Data:', JSON.stringify(originalTestData, null, 2));
  
  try {
    const response = await axios.post(`${baseUrl}/auth/register`, originalTestData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log(`Status: ${response.status}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 400) {
      console.log('\n💡 ANALYSIS:');
      console.log('The registration endpoint is rejecting the test data.');
      console.log('This suggests the validation requirements are stricter than expected.');
      
      if (response.data.message) {
        console.log(`Specific error: ${response.data.message}`);
      }
      
      console.log('\n🔧 POSSIBLE FIXES:');
      console.log('1. Add missing required fields (businessName, agreeToTerms)');
      console.log('2. Update comprehensive test to use correct data format');
      console.log('3. Relax validation requirements if too strict');
    }
    
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
  }
}

async function main() {
  console.log('🧪 TEST REGISTRATION VALIDATION');
  console.log('===============================');
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  
  await testRegistrationWithCorrectData();
  await testRegistrationValidationErrors();
  await identifyRegistrationIssue();
  
  console.log('\n📊 REGISTRATION VALIDATION TEST COMPLETE');
  console.log('========================================');
  console.log('Check the results above to understand why registration returns 400');
  console.log('and what data format is required for successful registration.');
}

main().catch(console.error);
