/**
 * Test Registration Endpoint
 * Tests both local and production registration endpoints
 */

const axios = require('axios');

async function testRegistrationEndpoint(baseUrl, label) {
  console.log(`\n🧪 Testing ${label} Registration Endpoint`);
  console.log('=' * 60);
  
  const testUser = {
    firstName: 'Test',
    lastName: 'User',
    companyName: 'Test Company',
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    agreeToTerms: true
  };
  
  try {
    console.log('📤 Sending registration request...');
    console.log('URL:', `${baseUrl}/api/auth/register`);
    console.log('Data:', JSON.stringify(testUser, null, 2));
    
    const response = await axios.post(`${baseUrl}/api/auth/register`, testUser, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 15000,
      validateStatus: () => true // Accept any status code
    });
    
    console.log('\n📥 Response received:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    
    if (typeof response.data === 'string') {
      console.log('Response Data (string):', response.data);
    } else {
      console.log('Response Data (object):', JSON.stringify(response.data, null, 2));
    }
    
    // Analyze the response
    if (response.status === 201) {
      console.log('✅ SUCCESS: Registration completed successfully');
      if (response.data.token) {
        console.log('   JWT Token received:', response.data.token.substring(0, 20) + '...');
      }
      if (response.data.user) {
        console.log('   User created:', response.data.user.email);
      }
    } else if (response.status === 409) {
      console.log('⚠️ EXPECTED: User already exists');
    } else if (response.status === 400) {
      console.log('❌ VALIDATION ERROR: Bad request');
      if (response.data.error) {
        console.log('   Error:', response.data.error);
      }
      if (response.data.message) {
        console.log('   Message:', response.data.message);
      }
    } else if (response.status === 500) {
      console.log('❌ SERVER ERROR: Internal server error');
      if (response.data.error) {
        console.log('   Error:', response.data.error);
      }
    } else if (response.status === 502) {
      console.log('❌ BAD GATEWAY: Server is not responding properly');
      console.log('   This usually means the backend server is down or crashing');
    } else {
      console.log(`❌ UNEXPECTED STATUS: ${response.status}`);
    }
    
    return {
      success: response.status === 201 || response.status === 409,
      status: response.status,
      data: response.data
    };
    
  } catch (error) {
    console.error('\n❌ Request failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Connection refused - server is not running');
    } else if (error.code === 'ENOTFOUND') {
      console.error('   DNS resolution failed');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('   Request timed out');
    } else if (error.response) {
      console.error('   HTTP Error Status:', error.response.status);
      console.error('   HTTP Error Data:', error.response.data);
    }
    
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

async function runTests() {
  console.log('🔐 REGISTRATION ENDPOINT TESTING');
  console.log('=' * 60);
  
  // Test local endpoint first
  const localResult = await testRegistrationEndpoint('http://localhost:5001', 'LOCAL');
  
  // Test production endpoint
  const prodResult = await testRegistrationEndpoint('https://app.floworx-iq.com', 'PRODUCTION');
  
  console.log('\n' + '=' * 60);
  console.log('📊 TEST SUMMARY');
  console.log('=' * 60);
  
  console.log('Local Endpoint:', localResult.success ? '✅ WORKING' : '❌ FAILED');
  if (!localResult.success) {
    console.log('  Error:', localResult.error || 'Unknown error');
  }
  
  console.log('Production Endpoint:', prodResult.success ? '✅ WORKING' : '❌ FAILED');
  if (!prodResult.success) {
    console.log('  Error:', prodResult.error || 'Unknown error');
    console.log('  Status:', prodResult.status || 'No status');
  }
  
  // Recommendations
  console.log('\n🔧 RECOMMENDATIONS:');
  if (!localResult.success && localResult.code === 'ECONNREFUSED') {
    console.log('- Start the local development server: npm start');
  }
  
  if (!prodResult.success && prodResult.status === 502) {
    console.log('- Production server is experiencing issues');
    console.log('- Check Coolify deployment logs');
    console.log('- Verify backend server is running properly');
    console.log('- Check for any syntax errors or crashes in the auth routes');
  }
  
  if (!prodResult.success && prodResult.status === 500) {
    console.log('- Check backend server logs for errors');
    console.log('- Verify database connection');
    console.log('- Check environment variables');
  }
}

// Run the tests
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('\n🏁 Testing completed');
    })
    .catch(error => {
      console.error('Test execution failed:', error);
    });
}

module.exports = { testRegistrationEndpoint, runTests };
