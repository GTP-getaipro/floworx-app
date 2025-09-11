#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'https://app.floworx-iq.com';
const API_URL = `${BASE_URL}/api`;

async function createTestUser() {
  console.log('🔧 CREATING TEST USER FOR AUTOMATED TESTING');
  console.log('===========================================');
  
  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    email: 'test.automation@floworx-iq.com',
    password: 'TestPassword123!',
    businessName: 'Test Automation Company',
    phone: '+1234567890',
    agreeToTerms: true,
    marketingConsent: false
  };

  try {
    console.log(`📧 Creating test user: ${testUser.email}`);
    
    const response = await axios.post(`${API_URL}/auth/register`, testUser, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`✅ Test user created successfully!`);
    console.log(`📊 Response: ${JSON.stringify(response.data)}`);
    
    // Now try to login with the test user
    console.log('\n🔐 TESTING LOGIN WITH NEW USER');
    console.log('==============================');
    
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    }, {
      timeout: 15000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`✅ Login test successful!`);
    console.log(`📊 Login Response: ${JSON.stringify(loginResponse.data)}`);
    
    console.log('\n🎯 TEST USER READY FOR AUTOMATION');
    console.log('==================================');
    console.log(`Email: ${testUser.email}`);
    console.log(`Password: ${testUser.password}`);
    console.log('✅ This user can now be used in automated tests');
    
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('ℹ️  Test user already exists, trying to login...');
      
      try {
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
          email: testUser.email,
          password: testUser.password
        }, {
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        });
        
        console.log(`✅ Existing test user login successful!`);
        console.log(`📊 Login Response: ${JSON.stringify(loginResponse.data)}`);
        
        console.log('\n🎯 EXISTING TEST USER CONFIRMED');
        console.log('===============================');
        console.log(`Email: ${testUser.email}`);
        console.log(`Password: ${testUser.password}`);
        console.log('✅ This user is ready for automated tests');
        
      } catch (loginError) {
        console.error(`❌ Login failed for existing user: ${loginError.response?.data?.error || loginError.message}`);
        console.log('\n🔧 RECOMMENDATION:');
        console.log('==================');
        console.log('The test user exists but login failed. This could mean:');
        console.log('1. Password is incorrect');
        console.log('2. Account needs verification');
        console.log('3. Account is locked');
        console.log('\nConsider using a different test user or checking the database.');
      }
    } else {
      console.error(`❌ Test user creation failed: ${error.response?.data?.error || error.message}`);
      console.log('\n🔧 RECOMMENDATION:');
      console.log('==================');
      console.log('Test user creation failed. Check:');
      console.log('1. API endpoint is accessible');
      console.log('2. Database connection is working');
      console.log('3. Registration validation rules');
    }
  }
}

// Run the test user creation
if (require.main === module) {
  createTestUser().catch(console.error);
}

module.exports = { createTestUser };
