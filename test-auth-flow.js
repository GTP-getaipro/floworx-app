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
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
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

async function testAuthFlow() {
  console.log('🔍 TESTING COMPLETE AUTH FLOW');
  console.log('🌐 Target:', API_BASE);
  console.log('');

  try {
    // Step 1: Register a test user
    console.log('📝 Step 1: Registering test user...');
    const testEmail = `authtest.${Math.random().toString(36).substring(7)}@example.com`;
    
    const registerResponse = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'TestPassword123!',
        firstName: 'Auth',
        lastName: 'Test',
        businessName: 'Auth Test Company',
        agreeToTerms: true
      }
    });

    console.log('Registration Status:', registerResponse.status);
    console.log('Registration Response:', JSON.stringify(registerResponse.data, null, 2));
    
    if (registerResponse.status !== 201) {
      console.log('❌ Registration failed, stopping test');
      return;
    }

    const token = registerResponse.data.token;
    const userId = registerResponse.data.user.id;
    console.log('✅ Registration successful');
    console.log('User ID:', userId);
    console.log('Token (first 50 chars):', token.substring(0, 50) + '...');
    console.log('');

    // Step 2: Test token verification
    console.log('🔐 Step 2: Testing token verification...');
    const verifyResponse = await makeRequest('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Verify Status:', verifyResponse.status);
    console.log('Verify Response:', JSON.stringify(verifyResponse.data, null, 2));
    
    if (verifyResponse.status !== 200) {
      console.log('❌ Token verification failed, stopping test');
      return;
    }
    console.log('✅ Token verification successful');
    console.log('');

    // Step 3: Test user status with detailed error info
    console.log('👤 Step 3: Testing /api/user/status...');
    const userStatusResponse = await makeRequest('/api/user/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('User Status Status:', userStatusResponse.status);
    console.log('User Status Response:', JSON.stringify(userStatusResponse.data, null, 2));
    
    if (userStatusResponse.status === 500) {
      console.log('❌ User status failed with 500 error');
      console.log('This suggests an internal server error in the user status endpoint');
    } else if (userStatusResponse.status === 403) {
      console.log('❌ User status failed with 403 error');
      console.log('This suggests an authentication/authorization issue');
    } else if (userStatusResponse.status === 200) {
      console.log('✅ User status successful');
    }
    console.log('');

    // Step 4: Test dashboard endpoint
    console.log('📊 Step 4: Testing /api/dashboard...');
    const dashboardResponse = await makeRequest('/api/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Dashboard Status:', dashboardResponse.status);
    console.log('Dashboard Response:', JSON.stringify(dashboardResponse.data, null, 2));
    
    if (dashboardResponse.status === 404) {
      console.log('❌ Dashboard failed with 404 error');
      console.log('This suggests the endpoint is not found or not properly routed');
    } else if (dashboardResponse.status === 500) {
      console.log('❌ Dashboard failed with 500 error');
      console.log('This suggests an internal server error in the dashboard endpoint');
    } else if (dashboardResponse.status === 200) {
      console.log('✅ Dashboard successful');
    }
    console.log('');

    // Step 5: Test a few more endpoints to see routing patterns
    console.log('🔍 Step 5: Testing other endpoints for routing patterns...');
    
    const endpoints = [
      '/api/health',
      '/api/health/db',
      '/api/user/profile',
      '/api/auth/password-requirements'
    ];

    for (const endpoint of endpoints) {
      const response = await makeRequest(endpoint, {
        headers: endpoint.startsWith('/api/user') ? { 'Authorization': `Bearer ${token}` } : {}
      });
      console.log(`${endpoint}: ${response.status}`);
    }

    console.log('');
    console.log('🔍 AUTH FLOW TEST COMPLETE');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuthFlow();
