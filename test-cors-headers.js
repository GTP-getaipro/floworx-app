const https = require('https');

console.log('🔍 TESTING CORS HEADERS ON app.floworx-iq.com');
console.log('================================================\n');

// Test CORS preflight request
const testCORS = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'app.floworx-iq.com',
      port: 443,
      path: '/api/user/status',
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://app.floworx-iq.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
      }
    };

    const req = https.request(options, (res) => {
      console.log('📋 CORS Preflight Response:');
      console.log(`   Status: ${res.statusCode}`);
      console.log('   Headers:');
      
      const corsHeaders = [
        'access-control-allow-origin',
        'access-control-allow-methods', 
        'access-control-allow-headers',
        'access-control-allow-credentials',
        'access-control-max-age'
      ];

      corsHeaders.forEach(header => {
        const value = res.headers[header];
        console.log(`   ${header}: ${value || 'NOT SET'}`);
      });

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, data });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
};

// Test actual request with CORS
const testActualRequest = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'app.floworx-iq.com',
      port: 443,
      path: '/api/health',
      method: 'GET',
      headers: {
        'Origin': 'https://app.floworx-iq.com',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      console.log('\n📋 Actual Request Response:');
      console.log(`   Status: ${res.statusCode}`);
      console.log('   CORS Headers:');
      
      const corsHeaders = [
        'access-control-allow-origin',
        'access-control-allow-methods', 
        'access-control-allow-headers',
        'access-control-allow-credentials'
      ];

      corsHeaders.forEach(header => {
        const value = res.headers[header];
        console.log(`   ${header}: ${value || 'NOT SET'}`);
      });

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({ statusCode: res.statusCode, headers: res.headers, data });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
};

// Run tests
async function runTests() {
  try {
    console.log('1️⃣ Testing CORS Preflight (OPTIONS request)...');
    await testCORS();
    
    console.log('\n2️⃣ Testing Actual Request with CORS headers...');
    await testActualRequest();
    
    console.log('\n✅ CORS tests completed!');
    console.log('\n💡 If you see proper CORS headers above, the browser CORS error should be resolved.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTests();
