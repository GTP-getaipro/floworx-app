#!/usr/bin/env node

/**
 * Test which API endpoints are actually available on the production server
 */

const https = require('https');

async function testEndpoint(path, token = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'app.floworx-iq.com',
      port: 443,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        path,
        status: 'ERROR',
        error: err.message
      });
    });
    
    req.setTimeout(10000, () => {
      req.destroy();
      resolve({
        path,
        status: 'TIMEOUT',
        error: 'Request timeout'
      });
    });
    
    req.end();
  });
}

async function testAllEndpoints() {
  console.log('🔍 TESTING API ENDPOINTS ON app.floworx-iq.com');
  console.log('================================================');
  
  // Test basic endpoints first (no auth required)
  const basicEndpoints = [
    '/api/health',
    '/api/auth/login',
    '/api/auth/register',
    '/api/user/status',
    '/api/onboarding/status'
  ];
  
  console.log('\n1️⃣ Testing basic endpoints (no auth):');
  for (const endpoint of basicEndpoints) {
    const result = await testEndpoint(endpoint);
    console.log(`   ${endpoint}: ${result.status} ${result.error ? `(${result.error})` : ''}`);
    
    if (result.status === 200 && result.body) {
      try {
        const parsed = JSON.parse(result.body);
        console.log(`      Response: ${JSON.stringify(parsed).substring(0, 100)}...`);
      } catch (e) {
        console.log(`      Response: ${result.body.substring(0, 100)}...`);
      }
    }
  }
  
  // Now test with authentication
  console.log('\n2️⃣ Getting authentication token...');
  
  const loginData = JSON.stringify({
    email: 'dizelll2007@gmail.com',
    password: 'Dizell2007!'
  });
  
  const loginResult = await new Promise((resolve) => {
    const options = {
      hostname: 'app.floworx-iq.com',
      port: 443,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        status: 'ERROR',
        error: err.message
      });
    });
    
    req.write(loginData);
    req.end();
  });
  
  if (loginResult.status === 200) {
    try {
      const loginResponse = JSON.parse(loginResult.body);
      const token = loginResponse.token;
      console.log(`   ✅ Login successful! Token: ${token.substring(0, 30)}...`);
      
      console.log('\n3️⃣ Testing authenticated endpoints:');
      const authEndpoints = [
        '/api/user/status',
        '/api/onboarding/status',
        '/api/dashboard',
        '/api/user/profile'
      ];
      
      for (const endpoint of authEndpoints) {
        const result = await testEndpoint(endpoint, token);
        console.log(`   ${endpoint}: ${result.status} ${result.error ? `(${result.error})` : ''}`);
        
        if (result.status === 200 && result.body) {
          try {
            const parsed = JSON.parse(result.body);
            console.log(`      ✅ Success: ${JSON.stringify(parsed).substring(0, 150)}...`);
          } catch (e) {
            console.log(`      Response: ${result.body.substring(0, 100)}...`);
          }
        } else if (result.body) {
          try {
            const parsed = JSON.parse(result.body);
            console.log(`      ❌ Error: ${parsed.error || parsed.message || 'Unknown error'}`);
          } catch (e) {
            console.log(`      ❌ Raw error: ${result.body.substring(0, 100)}...`);
          }
        }
      }
      
    } catch (e) {
      console.log(`   ❌ Login failed: ${loginResult.body}`);
    }
  } else {
    console.log(`   ❌ Login failed with status: ${loginResult.status}`);
    console.log(`   Response: ${loginResult.body}`);
  }
  
  console.log('\n4️⃣ Testing route variations:');
  const routeVariations = [
    '/api/user/status',
    '/user/status',
    '/api/auth/user/status',
    '/auth/user/status'
  ];
  
  for (const route of routeVariations) {
    const result = await testEndpoint(route);
    console.log(`   ${route}: ${result.status}`);
  }
}

testAllEndpoints().catch(console.error);
