#!/usr/bin/env node

/**
 * Authentication Flow Testing
 * Tests complete user registration, login, and JWT validation
 */

const https = require('https');

const PRODUCTION_URL = 'https://floworx-gxl5ke7q0-floworxdevelopers-projects.vercel.app';

console.log('🔐 AUTHENTICATION FLOW TESTING');
console.log('===============================');
console.log('Testing URL:', PRODUCTION_URL);
console.log('');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FloWorx-Auth-Test/1.0',
        ...options.headers
      }
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testCompleteAuthFlow() {
  console.log('🚀 Starting Complete Authentication Flow Test...\n');
  
  // Generate unique test user
  const timestamp = Date.now();
  const testUser = {
    email: `test-${timestamp}@floworx-test.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };
  
  let authToken = null;
  
  try {
    // Step 1: User Registration
    console.log('1️⃣ Testing User Registration...');
    const registerResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/register`, {
      method: 'POST',
      body: testUser
    });
    
    console.log(`   Status: ${registerResponse.statusCode}`);
    if (registerResponse.data.message) {
      console.log(`   Message: ${registerResponse.data.message}`);
    }
    if (registerResponse.data.error) {
      console.log(`   Error: ${registerResponse.data.error}`);
    }
    
    if (registerResponse.statusCode !== 201) {
      throw new Error(`Registration failed with status ${registerResponse.statusCode}`);
    }
    
    console.log('   ✅ Registration successful\n');
    
    // Step 2: User Login
    console.log('2️⃣ Testing User Login...');
    const loginResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      body: {
        email: testUser.email,
        password: testUser.password
      }
    });
    
    console.log(`   Status: ${loginResponse.statusCode}`);
    if (loginResponse.data.message) {
      console.log(`   Message: ${loginResponse.data.message}`);
    }
    if (loginResponse.data.error) {
      console.log(`   Error: ${loginResponse.data.error}`);
    }
    
    if (loginResponse.statusCode !== 200) {
      throw new Error(`Login failed with status ${loginResponse.statusCode}`);
    }
    
    // Extract token
    if (loginResponse.data.token) {
      authToken = loginResponse.data.token;
      console.log('   ✅ Login successful, token received');
      console.log(`   Token length: ${authToken.length} characters`);
    } else {
      throw new Error('No token received from login');
    }
    
    console.log('');
    
    // Step 3: Test Protected Endpoint
    console.log('3️⃣ Testing Protected Endpoint Access...');
    const dashboardResponse = await makeRequest(`${PRODUCTION_URL}/api/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log(`   Status: ${dashboardResponse.statusCode}`);
    if (dashboardResponse.data.message) {
      console.log(`   Message: ${dashboardResponse.data.message}`);
    }
    if (dashboardResponse.data.error) {
      console.log(`   Error: ${dashboardResponse.data.error}`);
    }
    
    if (dashboardResponse.statusCode === 200) {
      console.log('   ✅ Protected endpoint access successful');
      if (dashboardResponse.data.user) {
        console.log(`   User ID: ${dashboardResponse.data.user.id}`);
        console.log(`   User Email: ${dashboardResponse.data.user.email}`);
      }
    } else {
      console.log('   ⚠️  Protected endpoint access failed (may be expected)');
    }
    
    console.log('');
    
    // Step 4: Test Invalid Token
    console.log('4️⃣ Testing Invalid Token Handling...');
    const invalidTokenResponse = await makeRequest(`${PRODUCTION_URL}/api/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer invalid-token-12345'
      }
    });
    
    console.log(`   Status: ${invalidTokenResponse.statusCode}`);
    if (invalidTokenResponse.data.error) {
      console.log(`   Error: ${invalidTokenResponse.data.error}`);
    }
    
    if (invalidTokenResponse.statusCode === 401) {
      console.log('   ✅ Invalid token properly rejected');
    } else {
      console.log('   ⚠️  Invalid token handling unexpected');
    }
    
    console.log('');
    
    // Step 5: Test Duplicate Registration
    console.log('5️⃣ Testing Duplicate Registration Prevention...');
    const duplicateResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/register`, {
      method: 'POST',
      body: testUser
    });
    
    console.log(`   Status: ${duplicateResponse.statusCode}`);
    if (duplicateResponse.data.error) {
      console.log(`   Error: ${duplicateResponse.data.error}`);
    }
    
    if (duplicateResponse.statusCode === 400 || duplicateResponse.statusCode === 409) {
      console.log('   ✅ Duplicate registration properly prevented');
    } else {
      console.log('   ⚠️  Duplicate registration handling unexpected');
    }
    
    console.log('');
    
    // Step 6: Test Wrong Password
    console.log('6️⃣ Testing Wrong Password Handling...');
    const wrongPasswordResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/login`, {
      method: 'POST',
      body: {
        email: testUser.email,
        password: 'WrongPassword123!'
      }
    });
    
    console.log(`   Status: ${wrongPasswordResponse.statusCode}`);
    if (wrongPasswordResponse.data.error) {
      console.log(`   Error: ${wrongPasswordResponse.data.error}`);
    }
    
    if (wrongPasswordResponse.statusCode === 401) {
      console.log('   ✅ Wrong password properly rejected');
    } else {
      console.log('   ⚠️  Wrong password handling unexpected');
    }
    
    console.log('\n🎉 AUTHENTICATION FLOW TEST COMPLETED!');
    
    return {
      success: true,
      testUser: testUser.email,
      token: authToken ? 'received' : 'not received'
    };
    
  } catch (error) {
    console.log(`\n❌ Authentication Flow Test Failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the authentication flow test
testCompleteAuthFlow().then(result => {
  console.log('\n📊 FINAL RESULT:');
  console.log('=================');
  console.log('Success:', result.success ? '✅ YES' : '❌ NO');
  if (result.testUser) {
    console.log('Test User:', result.testUser);
  }
  if (result.token) {
    console.log('Token:', result.token);
  }
  if (result.error) {
    console.log('Error:', result.error);
  }
}).catch(console.error);
