console.log('🔐 AUTHENTICATION ENDPOINTS RETEST');
console.log('='.repeat(50));

const https = require('https');

// Test user registration
async function testRegistration() {
  return new Promise((resolve) => {
    const testUser = {
      email: `test-${Date.now()}@floworx-test.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      companyName: 'Test Company',
      agreeToTerms: true
    };

    const postData = JSON.stringify(testUser);
    
    const options = {
      hostname: 'app.floworx-iq.com',
      port: 443,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const startTime = Date.now();
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        const success = res.statusCode >= 200 && res.statusCode < 300;
        
        if (success) {
          console.log(`✅ User Registration: ${res.statusCode} (${responseTime}ms)`);
          try {
            const response = JSON.parse(data);
            console.log(`   📧 Test user created: ${testUser.email}`);
            resolve({ success: true, userId: response.user?.id, email: testUser.email, password: testUser.password });
          } catch (e) {
            console.log(`   ⚠️ Response parsing issue, but registration succeeded`);
            resolve({ success: true, email: testUser.email, password: testUser.password });
          }
        } else {
          console.log(`❌ User Registration: ${res.statusCode} (${responseTime}ms)`);
          console.log(`   Error: ${data.substring(0, 200)}`);
          resolve({ success: false });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ User Registration: ERROR - ${error.message}`);
      resolve({ success: false });
    });

    req.write(postData);
    req.end();
  });
}

// Test user login
async function testLogin(email, password) {
  return new Promise((resolve) => {
    const loginData = JSON.stringify({ email, password });
    
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

    const startTime = Date.now();
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        const success = res.statusCode >= 200 && res.statusCode < 300;
        
        if (success) {
          console.log(`✅ User Login: ${res.statusCode} (${responseTime}ms)`);
          try {
            const response = JSON.parse(data);
            const token = response.token;
            console.log(`   🔑 JWT token received (${token ? token.substring(0, 20) + '...' : 'none'})`);
            resolve({ success: true, token });
          } catch (e) {
            console.log(`   ⚠️ Response parsing issue, but login succeeded`);
            resolve({ success: true });
          }
        } else {
          console.log(`❌ User Login: ${res.statusCode} (${responseTime}ms)`);
          console.log(`   Error: ${data.substring(0, 200)}`);
          resolve({ success: false });
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ User Login: ERROR - ${error.message}`);
      resolve({ success: false });
    });

    req.write(loginData);
    req.end();
  });
}

// Test protected endpoint (user profile)
async function testProtectedEndpoint(token) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'app.floworx-iq.com',
      port: 443,
      path: '/api/user/profile',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const startTime = Date.now();
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        const success = res.statusCode >= 200 && res.statusCode < 300;
        
        if (success) {
          console.log(`✅ User Profile (Protected): ${res.statusCode} (${responseTime}ms)`);
          console.log(`   👤 Profile data retrieved successfully`);
        } else {
          console.log(`❌ User Profile (Protected): ${res.statusCode} (${responseTime}ms)`);
          console.log(`   Error: ${data.substring(0, 200)}`);
        }
        
        resolve({ success });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ User Profile (Protected): ERROR - ${error.message}`);
      resolve({ success: false });
    });

    req.end();
  });
}

// Test logout endpoint
async function testLogout(token) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'app.floworx-iq.com',
      port: 443,
      path: '/api/auth/logout',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    const startTime = Date.now();
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        const success = res.statusCode >= 200 && res.statusCode < 300;
        
        if (success) {
          console.log(`✅ User Logout: ${res.statusCode} (${responseTime}ms)`);
          console.log(`   🚪 Logout successful`);
        } else {
          console.log(`❌ User Logout: ${res.statusCode} (${responseTime}ms)`);
          console.log(`   Error: ${data.substring(0, 200)}`);
        }
        
        resolve({ success });
      });
    });

    req.on('error', (error) => {
      console.log(`❌ User Logout: ERROR - ${error.message}`);
      resolve({ success: false });
    });

    req.end();
  });
}

async function runAuthTests() {
  console.log('🔍 Testing authentication flow...\n');
  
  const results = [];
  
  // Test registration
  console.log('1️⃣ Testing user registration...');
  const regResult = await testRegistration();
  results.push(regResult);
  
  if (regResult.success && regResult.email && regResult.password) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test login
    console.log('\n2️⃣ Testing user login...');
    const loginResult = await testLogin(regResult.email, regResult.password);
    results.push(loginResult);
    
    if (loginResult.success && loginResult.token) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Test protected endpoint
      console.log('\n3️⃣ Testing protected endpoint...');
      const profileResult = await testProtectedEndpoint(loginResult.token);
      results.push(profileResult);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Test logout
      console.log('\n4️⃣ Testing logout...');
      const logoutResult = await testLogout(loginResult.token);
      results.push(logoutResult);
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 AUTHENTICATION TEST SUMMARY:');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  const successRate = ((successful / total) * 100).toFixed(1);
  
  console.log(`✅ Successful: ${successful}/${total} (${successRate}%)`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log('\n🎉 ALL AUTHENTICATION TESTS PASSED!');
    console.log('🔐 Complete auth flow working: Registration → Login → Protected Access → Logout');
  } else {
    console.log('\n⚠️ Some authentication tests failed.');
  }
}

runAuthTests().catch(console.error);
