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

async function debugEndpoints() {
  console.log('🔍 DEBUGGING ENDPOINT ISSUES');
  console.log('🌐 Target:', API_BASE);
  console.log('');

  try {
    // Step 1: Register a test user
    console.log('📝 Step 1: Registering test user...');
    const testEmail = `debug.${Math.random().toString(36).substring(7)}@example.com`;
    
    const registerResponse = await makeRequest('/api/auth/register', {
      method: 'POST',
      body: {
        email: testEmail,
        password: 'TestPassword123!',
        firstName: 'Debug',
        lastName: 'User',
        businessName: 'Debug Company',
        agreeToTerms: true
      }
    });

    console.log('Registration Status:', registerResponse.status);
    if (registerResponse.status !== 201) {
      console.log('Registration failed:', registerResponse.data);
      return;
    }

    const token = registerResponse.data.token;
    console.log('✅ Registration successful, token received');
    console.log('');

    // Step 2: Test user status endpoint
    console.log('👤 Step 2: Testing /api/user/status...');
    const userStatusResponse = await makeRequest('/api/user/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('User Status Response:');
    console.log('Status:', userStatusResponse.status);
    console.log('Data:', JSON.stringify(userStatusResponse.data, null, 2));
    console.log('');

    // Step 3: Test dashboard endpoint
    console.log('📊 Step 3: Testing /api/dashboard...');
    const dashboardResponse = await makeRequest('/api/dashboard', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Dashboard Response:');
    console.log('Status:', dashboardResponse.status);
    console.log('Data:', JSON.stringify(dashboardResponse.data, null, 2));
    console.log('');

    // Step 4: Test token validation
    console.log('🔐 Step 4: Testing token validation...');
    const verifyResponse = await makeRequest('/api/auth/verify', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    console.log('Token Verification:');
    console.log('Status:', verifyResponse.status);
    console.log('Data:', JSON.stringify(verifyResponse.data, null, 2));
    console.log('');

    // Step 5: Test health endpoints
    console.log('🏥 Step 5: Testing health endpoints...');
    const healthResponse = await makeRequest('/api/health');
    const dbHealthResponse = await makeRequest('/api/health/db');

    console.log('Health Response:', healthResponse.status);
    console.log('DB Health Response:', dbHealthResponse.status);
    console.log('');

    console.log('🔍 DEBUGGING COMPLETE');

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugEndpoints();
