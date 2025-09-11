#!/usr/bin/env node

const https = require('https');

console.log('🔧 CLEARING RATE LIMITS');
console.log('=======================');

async function testAfterRateLimitFix() {
  console.log('\n🧪 TESTING AUTHENTICATION AFTER RATE LIMIT FIX');
  console.log('===============================================');
  
  // Test with a simple registration attempt
  const testData = {
    email: 'testuser@example.com',
    password: 'SecurePass123!',
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User'
  };
  
  console.log('Testing registration with valid data...');
  console.log(`Email: ${testData.email}`);
  
  const result = await testEndpoint(
    'https://app.floworx-iq.com/api/auth/register',
    'POST',
    testData
  );
  
  if (result.success) {
    console.log(`✅ Status: ${result.status}`);
    
    if (result.status === 200 || result.status === 201) {
      console.log('🎉 Registration successful!');
    } else if (result.status === 400) {
      console.log('⚠️ Validation error (check response for details)');
    } else if (result.status === 409) {
      console.log('⚠️ User already exists (expected if testing multiple times)');
    } else if (result.status === 429) {
      console.log('❌ Still rate limited - need to wait or restart application');
    }
    
    if (result.body) {
      console.log('Response:', result.body.substring(0, 300));
    }
  } else {
    console.log(`❌ Error: ${result.error}`);
  }
}

async function testLogin() {
  console.log('\n🔐 TESTING LOGIN');
  console.log('================');
  
  const loginData = {
    email: 'testuser@example.com',
    password: 'SecurePass123!'
  };
  
  console.log('Testing login...');
  
  const result = await testEndpoint(
    'https://app.floworx-iq.com/api/auth/login',
    'POST',
    loginData
  );
  
  if (result.success) {
    console.log(`✅ Status: ${result.status}`);
    
    if (result.status === 200) {
      console.log('🎉 Login successful!');
    } else if (result.status === 401) {
      console.log('⚠️ Invalid credentials (expected if user doesn\'t exist yet)');
    } else if (result.status === 429) {
      console.log('❌ Still rate limited');
    }
    
    if (result.body) {
      console.log('Response:', result.body.substring(0, 300));
    }
  } else {
    console.log(`❌ Error: ${result.error}`);
  }
}

async function testPasswordReset() {
  console.log('\n🔄 TESTING PASSWORD RESET');
  console.log('=========================');
  
  const resetData = {
    email: 'testuser@example.com'
  };
  
  console.log('Testing forgot password...');
  
  const result = await testEndpoint(
    'https://app.floworx-iq.com/api/auth/forgot-password',
    'POST',
    resetData
  );
  
  if (result.success) {
    console.log(`✅ Status: ${result.status}`);
    
    if (result.status === 200) {
      console.log('🎉 Password reset email sent!');
    } else if (result.status === 404) {
      console.log('⚠️ User not found (expected if user doesn\'t exist)');
    } else if (result.status === 429) {
      console.log('❌ Still rate limited');
    }
    
    if (result.body) {
      console.log('Response:', result.body.substring(0, 300));
    }
  } else {
    console.log(`❌ Error: ${result.error}`);
  }
}

async function testEndpoint(url, method = 'GET', data = null) {
  return new Promise((resolve) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: method,
      timeout: 10000,
      headers: {
        'User-Agent': 'FloWorx-Test/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };
    
    if (data && method !== 'GET') {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }
    
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        resolve({
          success: true,
          status: res.statusCode,
          headers: res.headers,
          body: responseData
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        code: error.code
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout',
        code: 'TIMEOUT'
      });
    });
    
    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function runTests() {
  console.log('🚀 TESTING AUTHENTICATION AFTER RATE LIMIT ADJUSTMENTS');
  console.log('=======================================================');
  console.log('');
  console.log('📋 CHANGES MADE:');
  console.log('- Increased auth rate limit from 5 to 50 requests per 15 minutes');
  console.log('- Increased registration rate limit from 3 to 20 per hour');
  console.log('');
  console.log('⚠️ NOTE: If still rate limited, you need to:');
  console.log('1. Wait for current rate limit to expire, OR');
  console.log('2. Restart the application in Coolify to clear rate limit cache');
  console.log('');
  
  await testAfterRateLimitFix();
  await testLogin();
  await testPasswordReset();
  
  console.log('\n🎯 SUMMARY');
  console.log('==========');
  console.log('If you\'re still seeing 429 errors, the rate limit cache');
  console.log('needs to be cleared by restarting the application.');
  console.log('');
  console.log('📋 NEXT STEPS:');
  console.log('1. If still rate limited: Restart application in Coolify');
  console.log('2. If working: Test actual user registration/login flows');
  console.log('3. Check email service configuration for confirmations');
  console.log('4. Test password recovery functionality');
}

runTests().catch(console.error);
