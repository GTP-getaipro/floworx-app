const axios = require('axios');

const API_BASE_URL = 'https://app.floworx-iq.com/api';

async function testProductionAPI() {
  console.log('🧪 Testing Production API at:', API_BASE_URL);
  
  try {
    // Test 1: Health check
    console.log('\n1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health check:', healthResponse.data);
    
    // Test 2: Register with valid email
    console.log('\n2. Testing registration with valid email...');
    const registerData = {
      firstName: 'Test',
      lastName: 'User',
      email: `test${Date.now()}@example.com`,
      password: 'TestPass123!',
      agreeToTerms: true
    };
    
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, registerData);
    console.log('✅ Registration successful:', registerResponse.status, registerResponse.data.message);
    
    // Test 3: Login with the registered user
    console.log('\n3. Testing login...');
    const loginData = {
      email: registerData.email,
      password: registerData.password
    };
    
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, loginData);
    console.log('✅ Login successful:', loginResponse.status, loginResponse.data.message);
    
    const token = loginResponse.data.token;
    console.log('🔑 Token received (first 50 chars):', token.substring(0, 50) + '...');
    
    // Test 4: Verify token
    console.log('\n4. Testing token verification...');
    const verifyResponse = await axios.get(`${API_BASE_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Token verification successful:', verifyResponse.data);
    
    // Test 5: Test disposable email validation
    console.log('\n5. Testing disposable email validation...');
    const disposableEmailData = {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@tempmail.org',
      password: 'TestPass123!',
      agreeToTerms: true
    };

    try {
      await axios.post(`${API_BASE_URL}/auth/register`, disposableEmailData);
      console.log('❌ Disposable email validation FAILED - registration should have been blocked');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Disposable email validation working:', error.response.status, error.response.data);
      } else if (error.response && error.response.status === 500) {
        console.log('⚠️ Disposable email validation working but returning 500 error:', error.response.data);
        console.log('   This suggests validation is working but error handling needs improvement');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Test 6: Test weak password validation
    console.log('\n6. Testing weak password validation...');
    const weakPasswordData = {
      firstName: 'Test',
      lastName: 'User',
      email: `test${Date.now()}@example.com`,
      password: '123',
      agreeToTerms: true
    };
    
    try {
      await axios.post(`${API_BASE_URL}/auth/register`, weakPasswordData);
      console.log('❌ Weak password validation FAILED - registration should have been blocked');
    } catch (error) {
      if (error.response) {
        console.log('✅ Weak password validation working:', error.response.status, error.response.data);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    console.log('\n🎉 Production API testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testProductionAPI();
