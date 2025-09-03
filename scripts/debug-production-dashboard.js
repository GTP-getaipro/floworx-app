#!/usr/bin/env node

/**
 * Debug Production Dashboard Issue
 * Tests the exact dashboard flow that's failing
 */

const https = require('https');

const PRODUCTION_URL = 'https://floworx-gxl5ke7q0-floworxdevelopers-projects.vercel.app';

console.log('🔍 PRODUCTION DASHBOARD DEBUG');
console.log('=============================');
console.log('Testing URL:', PRODUCTION_URL);
console.log('');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FloWorx-Dashboard-Debug/1.0',
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

async function debugDashboardFlow() {
  console.log('🚀 Starting Dashboard Debug Flow...\n');
  
  // Generate unique test user
  const timestamp = Date.now();
  const testUser = {
    email: `dashboard-debug-${timestamp}@floworx-test.com`,
    password: 'TestPassword123!',
    firstName: 'Dashboard',
    lastName: 'Debug'
  };
  
  let authToken = null;
  
  try {
    // Step 1: Register user
    console.log('1️⃣ Registering new user...');
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
      throw new Error(`Registration failed: ${registerResponse.data.error}`);
    }
    
    console.log('   ✅ Registration successful\n');
    
    // Step 2: Login to get token
    console.log('2️⃣ Logging in to get token...');
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
      throw new Error(`Login failed: ${loginResponse.data.error}`);
    }
    
    if (loginResponse.data.token) {
      authToken = loginResponse.data.token;
      console.log('   ✅ Login successful, token received');
      console.log(`   Token length: ${authToken.length} characters`);
      
      // Decode token to see what's inside (just for debugging)
      const tokenParts = authToken.split('.');
      if (tokenParts.length === 3) {
        try {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          console.log(`   Token userId: ${payload.userId}`);
          console.log(`   Token email: ${payload.email}`);
          console.log(`   Token expires: ${new Date(payload.exp * 1000).toISOString()}`);
        } catch (decodeError) {
          console.log(`   Token decode error: ${decodeError.message}`);
        }
      }
    } else {
      throw new Error('No token received from login');
    }
    
    console.log('');
    
    // Step 3: Test user status endpoint first
    console.log('3️⃣ Testing user status endpoint...');
    const statusResponse = await makeRequest(`${PRODUCTION_URL}/api/user/status`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    console.log(`   Status: ${statusResponse.statusCode}`);
    if (statusResponse.data.message) {
      console.log(`   Message: ${statusResponse.data.message}`);
    }
    if (statusResponse.data.error) {
      console.log(`   Error: ${statusResponse.data.error}`);
    }
    if (statusResponse.data.user) {
      console.log(`   User found: ${statusResponse.data.user.email}`);
      console.log(`   User ID: ${statusResponse.data.user.id}`);
    }
    
    console.log('');
    
    // Step 4: Test dashboard endpoint
    console.log('4️⃣ Testing dashboard endpoint...');
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
    if (dashboardResponse.data.user) {
      console.log(`   Dashboard user: ${dashboardResponse.data.user.email}`);
      console.log(`   Dashboard user ID: ${dashboardResponse.data.user.id}`);
    }
    
    // If dashboard failed, let's try to understand why
    if (dashboardResponse.statusCode !== 200) {
      console.log('\n🔍 Dashboard failed, investigating...');
      
      // Check if it's an authentication issue
      if (dashboardResponse.statusCode === 401) {
        console.log('   Issue: Authentication failed');
        console.log('   Possible causes:');
        console.log('   - JWT secret mismatch between registration and dashboard');
        console.log('   - Token expired');
        console.log('   - Token format issue');
      } else if (dashboardResponse.statusCode === 404) {
        console.log('   Issue: User not found in database');
        console.log('   Possible causes:');
        console.log('   - User ID mismatch between JWT and database');
        console.log('   - User was not properly saved during registration');
        console.log('   - Database connection issue');
      }
    }
    
    console.log('\n🎉 Dashboard Debug Flow Completed!');
    
    return {
      success: dashboardResponse.statusCode === 200,
      registrationStatus: registerResponse.statusCode,
      loginStatus: loginResponse.statusCode,
      statusEndpointStatus: statusResponse.statusCode,
      dashboardStatus: dashboardResponse.statusCode,
      testUser: testUser.email,
      tokenReceived: !!authToken
    };
    
  } catch (error) {
    console.log(`\n❌ Dashboard Debug Failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the debug
debugDashboardFlow().then(result => {
  console.log('\n📊 DEBUG SUMMARY:');
  console.log('==================');
  console.log('Overall Success:', result.success ? '✅ YES' : '❌ NO');
  if (result.registrationStatus) {
    console.log('Registration:', result.registrationStatus === 201 ? '✅ SUCCESS' : `❌ FAILED (${result.registrationStatus})`);
  }
  if (result.loginStatus) {
    console.log('Login:', result.loginStatus === 200 ? '✅ SUCCESS' : `❌ FAILED (${result.loginStatus})`);
  }
  if (result.statusEndpointStatus) {
    console.log('User Status:', result.statusEndpointStatus === 200 ? '✅ SUCCESS' : `❌ FAILED (${result.statusEndpointStatus})`);
  }
  if (result.dashboardStatus) {
    console.log('Dashboard:', result.dashboardStatus === 200 ? '✅ SUCCESS' : `❌ FAILED (${result.dashboardStatus})`);
  }
  if (result.testUser) {
    console.log('Test User:', result.testUser);
  }
  if (result.tokenReceived !== undefined) {
    console.log('Token Received:', result.tokenReceived ? '✅ YES' : '❌ NO');
  }
  if (result.error) {
    console.log('Error:', result.error);
  }
}).catch(console.error);
