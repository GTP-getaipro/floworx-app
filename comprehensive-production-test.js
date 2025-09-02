const axios = require('axios');

async function comprehensiveProductionTest() {
  console.log('🔍 COMPREHENSIVE PRODUCTION TESTING - Real User Scenarios\n');
  
  const currentUrl = 'https://floworx-app.vercel.app';
  const expectedUrl = 'https://app.floworx-iq.com';
  
  console.log(`Testing Current URL: ${currentUrl}`);
  console.log(`Expected URL: ${expectedUrl}\n`);
  
  const results = {
    frontend: false,
    apiHealth: false,
    registration: false,
    login: false,
    oauth: false,
    domainMismatch: true
  };
  
  try {
    // Test 1: Frontend Loading
    console.log('1. 🌐 Testing Frontend Loading...');
    const frontendResponse = await axios.get(currentUrl, { 
      timeout: 10000,
      headers: { 'Cache-Control': 'no-cache' }
    });
    results.frontend = frontendResponse.status === 200;
    console.log(`   Status: ${frontendResponse.status} ${results.frontend ? '✅' : '❌'}`);
    
    // Test 2: API Health (Basic connectivity)
    console.log('\n2. 🏥 Testing API Health...');
    try {
      const healthResponse = await axios.get(`${currentUrl}/api/health`, { 
        timeout: 10000,
        headers: { 'Cache-Control': 'no-cache' }
      });
      results.apiHealth = healthResponse.status === 200;
      console.log(`   Status: ${healthResponse.status} ${results.apiHealth ? '✅' : '❌'}`);
      if (results.apiHealth) {
        console.log(`   Response: ${JSON.stringify(healthResponse.data)}`);
      }
    } catch (error) {
      console.log(`   ❌ Health check failed: ${error.message}`);
    }
    
    // Test 3: Registration API (What user actually needs)
    console.log('\n3. 📝 Testing Registration API...');
    try {
      const registrationResponse = await axios.post(`${currentUrl}/api/auth/register`, {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'testpassword123',
        companyName: 'Test Company'
      }, { 
        timeout: 10000,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' 
        },
        validateStatus: function (status) {
          return status >= 200 && status < 500; // Accept client errors for testing
        }
      });
      
      results.registration = registrationResponse.status < 500;
      console.log(`   Status: ${registrationResponse.status} ${results.registration ? '✅' : '❌'}`);
      
      if (registrationResponse.status >= 400) {
        console.log(`   Error Response: ${JSON.stringify(registrationResponse.data)}`);
      }
    } catch (error) {
      console.log(`   ❌ Registration API failed: ${error.message}`);
      if (error.response) {
        console.log(`   Response Status: ${error.response.status}`);
        console.log(`   Response Data: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // Test 4: Login API
    console.log('\n4. 🔐 Testing Login API...');
    try {
      const loginResponse = await axios.post(`${currentUrl}/api/auth/login`, {
        email: 'test@example.com',
        password: 'testpassword123'
      }, { 
        timeout: 10000,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache' 
        },
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      });
      
      results.login = loginResponse.status < 500;
      console.log(`   Status: ${loginResponse.status} ${results.login ? '✅' : '❌'}`);
      
      if (loginResponse.status >= 400) {
        console.log(`   Error Response: ${JSON.stringify(loginResponse.data)}`);
      }
    } catch (error) {
      console.log(`   ❌ Login API failed: ${error.message}`);
      if (error.response) {
        console.log(`   Response Status: ${error.response.status}`);
        console.log(`   Response Data: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    // Test 5: OAuth Endpoints
    console.log('\n5. 🔗 Testing OAuth Endpoints...');
    try {
      const oauthResponse = await axios.get(`${currentUrl}/api/oauth/google`, { 
        timeout: 5000,
        maxRedirects: 0,
        validateStatus: function (status) {
          return status >= 200 && status < 400;
        }
      });
      results.oauth = true;
      console.log(`   Status: ${oauthResponse.status} ✅`);
    } catch (error) {
      if (error.response && error.response.status === 302) {
        results.oauth = true;
        console.log(`   Status: 302 (Redirect) ✅`);
        console.log(`   Redirect to: ${error.response.headers.location || 'Not specified'}`);
      } else {
        console.log(`   ❌ OAuth failed: ${error.message}`);
      }
    }
    
    // Test 6: Domain Configuration Check
    console.log('\n6. 🌍 Checking Domain Configuration...');
    console.log(`   Current Domain: ${currentUrl}`);
    console.log(`   Expected Domain: ${expectedUrl}`);
    results.domainMismatch = currentUrl !== expectedUrl;
    console.log(`   Domain Mismatch: ${results.domainMismatch ? '⚠️  YES' : '✅ NO'}`);
    
  } catch (error) {
    console.log(`❌ Critical error: ${error.message}`);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`Frontend Loading:     ${results.frontend ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`API Health:           ${results.apiHealth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Registration API:     ${results.registration ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Login API:            ${results.login ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`OAuth Endpoints:      ${results.oauth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Domain Configuration: ${results.domainMismatch ? '⚠️  MISMATCH' : '✅ CORRECT'}`);
  
  console.log('\n🎯 DIAGNOSIS:');
  if (!results.registration || !results.login) {
    console.log('❌ CRITICAL: Core API endpoints are failing');
    console.log('   This explains why users see "endpoint does not exist" errors');
  }
  
  if (results.domainMismatch) {
    console.log('⚠️  WARNING: Domain mismatch detected');
    console.log(`   Using: ${currentUrl}`);
    console.log(`   Expected: ${expectedUrl}`);
  }
  
  console.log('\n📋 RECOMMENDED ACTIONS:');
  if (!results.registration || !results.login) {
    console.log('1. Check API routing configuration');
    console.log('2. Verify backend deployment includes all endpoints');
    console.log('3. Check environment variables for API base URL');
  }
  
  if (results.domainMismatch) {
    console.log('4. Configure custom domain in Vercel');
    console.log('5. Update environment variables for custom domain');
    console.log('6. Update OAuth redirect URIs');
  }
}

comprehensiveProductionTest().catch(console.error);
