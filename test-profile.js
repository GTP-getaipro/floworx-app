const https = require('https');

const API_BASE = 'https://app.floworx-iq.com';

async function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${path}`;
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testProfile() {
  console.log('🔍 TESTING USER PROFILE ENDPOINT');
  console.log('🌐 Target:', API_BASE);
  console.log('');

  try {
    // Step 1: Register a test user
    console.log('📝 Step 1: Registering test user...');
    const testEmail = `profile.test.${Math.random().toString(36).substring(7)}@example.com`;
    
    const registerResponse = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'TestPassword123!',
        firstName: 'Profile',
        lastName: 'Test',
        businessName: 'Profile Test Company',
        agreeToTerms: true
      }
    });

    console.log('Registration Status:', registerResponse.status);
    
    if (registerResponse.status !== 201) {
      console.log('❌ Registration failed, stopping test');
      return;
    }

    const token = registerResponse.data.token;
    console.log('✅ Registration successful');
    console.log('');

    // Step 2: Test user profile endpoint
    console.log('👤 Step 2: Testing /api/user/profile...');
    const profileResponse = await makeRequest('/api/user/profile', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Profile Status:', profileResponse.status);
    console.log('Profile Response:', JSON.stringify(profileResponse.data, null, 2));
    
    if (profileResponse.status === 200) {
      console.log('✅ User profile endpoint working!');
    } else if (profileResponse.status === 404) {
      console.log('❌ User profile endpoint not found - deployment may still be propagating');
    } else {
      console.log('❌ User profile endpoint failed with status:', profileResponse.status);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testProfile();
