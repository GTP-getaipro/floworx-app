const axios = require('axios');

// Test the deployed application
async function testDeployment() {
  const baseUrl = 'https://floworx-app.vercel.app';
  
  console.log('🚀 Testing Floworx Deployment...\n');
  
  // Test 1: Frontend loads
  try {
    console.log('1. Testing frontend...');
    const frontendResponse = await axios.get(baseUrl, { timeout: 10000 });
    console.log('✅ Frontend loads successfully');
    console.log(`   Status: ${frontendResponse.status}`);
  } catch (error) {
    console.log('❌ Frontend failed to load');
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 2: API Health Check
  try {
    console.log('\n2. Testing API health...');
    const apiResponse = await axios.get(`${baseUrl}/api/health`, { timeout: 10000 });
    console.log('✅ API is responding');
    console.log(`   Status: ${apiResponse.status}`);
    console.log(`   Response: ${JSON.stringify(apiResponse.data)}`);
  } catch (error) {
    console.log('❌ API health check failed');
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 3: Database Connection
  try {
    console.log('\n3. Testing database connection...');
    const dbResponse = await axios.get(`${baseUrl}/api/test-db`, { timeout: 15000 });
    console.log('✅ Database connection successful');
    console.log(`   Status: ${dbResponse.status}`);
    console.log(`   Response: ${JSON.stringify(dbResponse.data)}`);
  } catch (error) {
    console.log('❌ Database connection failed');
    console.log(`   Error: ${error.message}`);
  }
  
  // Test 4: User Registration Endpoint
  try {
    console.log('\n4. Testing user registration endpoint...');
    const regResponse = await axios.post(`${baseUrl}/api/auth/register`, {
      email: 'test@example.com',
      password: 'testpassword123',
      name: 'Test User'
    }, { 
      timeout: 15000,
      validateStatus: function (status) {
        return status < 500; // Accept any status less than 500
      }
    });
    console.log('✅ Registration endpoint is responding');
    console.log(`   Status: ${regResponse.status}`);
    console.log(`   Response: ${JSON.stringify(regResponse.data)}`);
  } catch (error) {
    console.log('❌ Registration endpoint failed');
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n🏁 Deployment test completed!');
}

testDeployment().catch(console.error);
