#!/usr/bin/env node

/**
 * Test the current user's session to debug the "Failed to load user status" error
 */

const https = require('https');

const PRODUCTION_URL = 'https://app.floworx-iq.com';

console.log('🔍 TESTING CURRENT USER SESSION');
console.log('===============================');
console.log('This will test with the actual user: dizell2007@gmail.com');
console.log('');

// Test with the actual user credentials
async function testUserSession() {
  console.log('1️⃣ Testing login with actual user credentials...');
  
  const loginData = {
    email: 'dizell2007@gmail.com',
    password: 'Dizell2007!' // You'll need to confirm this is correct
  };
  
  return new Promise((resolve) => {
    const postData = JSON.stringify(loginData);
    
    const options = {
      hostname: 'app.floworx-iq.com',
      port: 443,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const req = https.request(options, (res) => {
      console.log(`   Login Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200 && response.token) {
            console.log('   ✅ Login successful!');
            console.log(`   🎫 Token received: ${response.token.substring(0, 30)}...`);
            
            // Now test user status with this token
            testUserStatus(response.token);
            resolve(true);
          } else {
            console.log('   ❌ Login failed');
            console.log(`   📄 Response: ${JSON.stringify(response, null, 2)}`);
            resolve(false);
          }
        } catch (e) {
          console.log(`   ❌ Invalid JSON response: ${data}`);
          resolve(false);
        }
      });
    });
    
    req.on('error', (err) => {
      console.log(`   ❌ Login request failed: ${err.message}`);
      resolve(false);
    });
    
    req.write(postData);
    req.end();
  });
}

function testUserStatus(token) {
  console.log('\n2️⃣ Testing user status with token...');
  
  const options = {
    hostname: 'app.floworx-iq.com',
    port: 443,
    path: '/api/user/status',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  const req = https.request(options, (res) => {
    console.log(`   User Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        
        if (res.statusCode === 200) {
          console.log('   ✅ User status loaded successfully!');
          console.log(`   👤 User: ${response.email}`);
          console.log(`   🔗 Google Connected: ${response.has_google_connection}`);
          console.log('   📊 This means the API is working correctly');
          console.log('   🔍 The issue is likely in the frontend token handling');
        } else {
          console.log('   ❌ User status failed');
          console.log(`   📄 Response: ${JSON.stringify(response, null, 2)}`);
        }
      } catch (e) {
        console.log(`   ❌ Invalid JSON response: ${data}`);
      }
    });
  });
  
  req.on('error', (err) => {
    console.log(`   ❌ User status request failed: ${err.message}`);
  });
  
  req.end();
}

// Test onboarding status as well
function testOnboardingStatus(token) {
  console.log('\n3️⃣ Testing onboarding status...');
  
  const options = {
    hostname: 'app.floworx-iq.com',
    port: 443,
    path: '/api/onboarding/status',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
  
  const req = https.request(options, (res) => {
    console.log(`   Onboarding Status: ${res.statusCode}`);
    
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        console.log(`   📄 Response: ${JSON.stringify(response, null, 2)}`);
      } catch (e) {
        console.log(`   📄 Raw response: ${data}`);
      }
    });
  });
  
  req.on('error', (err) => {
    console.log(`   ❌ Onboarding status request failed: ${err.message}`);
  });
  
  req.end();
}

console.log('🚨 IMPORTANT: This test uses hardcoded credentials');
console.log('   If the password is wrong, the test will fail');
console.log('   Please confirm the password is: Dizell2007!');
console.log('');

// Run the test
testUserSession().then(success => {
  if (!success) {
    console.log('\n❌ Could not test with user credentials');
    console.log('🔧 Please check:');
    console.log('   1. Is the password correct?');
    console.log('   2. Is the user account active?');
    console.log('   3. Try logging in manually first');
  }
});
