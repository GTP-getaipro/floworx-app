#!/usr/bin/env node

/**
 * Manual Email Verification Test
 * Helps verify a user account manually for testing
 */

const axios = require('axios');

const BASE_URL = 'https://app.floworx-iq.com';
const API_URL = `${BASE_URL}/api`;

async function manuallyVerifyUser(email) {
  console.log(`🔧 Manually verifying user: ${email}`);
  
  try {
    const response = await axios.post(`${API_URL}/auth/manual-verify-email`, {
      email: email
    });
    
    console.log('✅ Manual verification successful:', response.data);
    return true;
    
  } catch (error) {
    console.log('❌ Manual verification failed:', error.response?.data || error.message);
    return false;
  }
}

async function testLoginAfterVerification(email, password) {
  console.log(`🔑 Testing login after verification: ${email}`);
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: email,
      password: password
    });
    
    console.log('✅ Login successful after verification:', {
      status: response.status,
      success: response.data.success,
      hasUser: !!response.data.user,
      userEmail: response.data.user?.email
    });
    return true;
    
  } catch (error) {
    console.log('❌ Login failed:', {
      status: error.response?.status,
      errorCode: error.response?.data?.error?.code,
      message: error.response?.data?.error?.message
    });
    return false;
  }
}

async function main() {
  console.log('🧪 MANUAL EMAIL VERIFICATION TEST');
  console.log('==================================');
  
  // Use the test user from our previous registration
  const testEmail = `auth-test-${Date.now()}@floworx-test.com`;
  const testPassword = 'TestPassword123!';
  
  console.log(`📧 Test Email: ${testEmail}`);
  console.log(`🔐 Test Password: ${testPassword}`);
  
  // Step 1: Register a new user
  console.log('\n1. Registering new user...');
  try {
    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      email: testEmail,
      password: testPassword,
      firstName: 'Manual',
      lastName: 'Test',
      businessName: 'Manual Test Business'
    });
    
    console.log('✅ Registration successful:', {
      status: registerResponse.status,
      success: registerResponse.data.success,
      requiresVerification: registerResponse.data.meta?.requiresVerification
    });
    
  } catch (error) {
    console.log('❌ Registration failed:', error.response?.data || error.message);
    return;
  }
  
  // Step 2: Try login (should fail - unverified)
  console.log('\n2. Testing login before verification (should fail)...');
  await testLoginAfterVerification(testEmail, testPassword);
  
  // Step 3: Manually verify the user
  console.log('\n3. Manually verifying user...');
  const verificationSuccess = await manuallyVerifyUser(testEmail);
  
  if (!verificationSuccess) {
    console.log('❌ Manual verification failed, cannot continue test');
    return;
  }
  
  // Step 4: Try login again (should succeed)
  console.log('\n4. Testing login after verification (should succeed)...');
  const loginSuccess = await testLoginAfterVerification(testEmail, testPassword);
  
  // Summary
  console.log('\n📊 MANUAL VERIFICATION TEST SUMMARY');
  console.log('====================================');
  console.log(`✅ Registration: Success`);
  console.log(`✅ Manual Verification: ${verificationSuccess ? 'Success' : 'Failed'}`);
  console.log(`✅ Login After Verification: ${loginSuccess ? 'Success' : 'Failed'}`);
  
  if (verificationSuccess && loginSuccess) {
    console.log('\n🎉 Complete auth flow working! Users can register, get verified, and login.');
  } else {
    console.log('\n❌ Auth flow has issues that need to be resolved.');
  }
}

// Run the test
main().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
