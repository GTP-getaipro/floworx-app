#!/usr/bin/env node

const axios = require('axios');

async function testLoginFix() {
  console.log('🔧 TESTING LOGIN FIX');
  console.log('====================');
  
  const API_URL = 'https://app.floworx-iq.com/api';
  
  // Test with the user we created
  const testUser = {
    email: 'login.test@floworx-iq.com',
    password: 'LoginTest123!'
  };

  try {
    console.log(`🔐 Testing login for: ${testUser.email}`);
    
    const response = await axios.post(`${API_URL}/auth/login`, testUser, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(`✅ Login successful: ${response.status}`);
    console.log(`📊 Response: ${JSON.stringify(response.data, null, 2)}`);
    
    if (response.data.token) {
      console.log('🎉 JWT token received - login fix working!');
      return true;
    } else {
      console.log('⚠️  No token in response');
      return false;
    }

  } catch (error) {
    console.log(`❌ Login failed: ${error.response?.status} - ${error.response?.data?.error?.message || error.message}`);
    console.log(`📊 Full error: ${JSON.stringify(error.response?.data, null, 2)}`);
    
    if (error.response?.data?.error?.type === 'EMAIL_NOT_VERIFIED') {
      console.log('🔧 Email verification still being enforced - fix not deployed yet');
    }
    
    return false;
  }
}

testLoginFix().then(success => {
  console.log('\n🎯 LOGIN FIX TEST COMPLETE');
  console.log('===========================');
  console.log(success ? '✅ Login fix is working!' : '❌ Login fix needs more work');
  process.exit(success ? 0 : 1);
}).catch(console.error);
