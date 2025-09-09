const axios = require('axios');

async function testRegistrationAPI() {
  try {
    console.log('🧪 Testing registration API endpoint...');
    
    const testData = {
      firstName: 'Test',
      lastName: 'User',
      companyName: 'Test Company',
      email: `test.${Date.now()}@example.com`,
      password: 'SecurePassword123!'
    };
    
    console.log('📤 Sending registration request:', {
      ...testData,
      password: '[HIDDEN]'
    });
    
    const response = await axios.post('https://app.floworx-iq.com/api/auth/register', testData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Registration successful!');
    console.log('📊 Response status:', response.status);
    console.log('📋 Response data:', response.data);
    
  } catch (error) {
    console.error('❌ Registration failed!');
    
    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📋 Response data:', error.response.data);
      console.error('📋 Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('📡 No response received:', error.request);
    } else {
      console.error('⚙️ Request setup error:', error.message);
    }
    
    console.error('🔍 Full error:', error.code, error.message);
  }
}

async function testLoginAPI() {
  try {
    console.log('\n🧪 Testing login API endpoint...');
    
    const loginData = {
      email: 'invalid@example.com',
      password: 'wrongpassword'
    };
    
    console.log('📤 Sending login request:', {
      ...loginData,
      password: '[HIDDEN]'
    });
    
    const response = await axios.post('https://app.floworx-iq.com/api/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Login response received');
    console.log('📊 Response status:', response.status);
    console.log('📋 Response data:', response.data);
    
  } catch (error) {
    console.log('📊 Login failed as expected (invalid credentials)');
    
    if (error.response) {
      console.log('📊 Status:', error.response.status);
      console.log('📋 Response data:', error.response.data);
    }
  }
}

async function main() {
  await testRegistrationAPI();
  await testLoginAPI();
}

main();
