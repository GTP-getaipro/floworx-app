const axios = require('axios');

async function testProductionURLs() {
  console.log('🧪 Testing Production URLs After Migration...\n');
  
  const baseUrl = 'https://floworx-app.vercel.app';
  
  try {
    // Test 1: Frontend loads
    console.log('1. Testing clean production URL...');
    const frontendResponse = await axios.get(baseUrl, { 
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    console.log('✅ Frontend loads successfully');
    console.log(`   Status: ${frontendResponse.status}`);
    console.log(`   URL: ${baseUrl}`);
    
    // Test 2: API Health Check
    console.log('\n2. Testing API health endpoint...');
    try {
      const healthResponse = await axios.get(`${baseUrl}/api/health`, { 
        timeout: 10000,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      console.log('✅ API health check successful');
      console.log(`   Status: ${healthResponse.status}`);
      console.log(`   Response:`, JSON.stringify(healthResponse.data, null, 2));
    } catch (apiError) {
      console.log('⚠️  API health check failed');
      console.log(`   Error: ${apiError.message}`);
      console.log(`   This might be expected if the API is not deployed`);
    }
    
    // Test 3: Check for old URLs in response
    console.log('\n3. Checking for old URLs in response...');
    const responseText = frontendResponse.data;
    const hasOldUrls = responseText.includes('floworx-app-git-main-floworxdevelopers-projects.vercel.app');
    
    if (hasOldUrls) {
      console.log('⚠️  Old URLs still found in response');
      console.log('   This indicates caching or incomplete migration');
    } else {
      console.log('✅ No old URLs found in response');
      console.log('   URL migration appears successful');
    }
    
    // Test 4: OAuth redirect URL test
    console.log('\n4. Testing OAuth redirect configuration...');
    try {
      const oauthResponse = await axios.get(`${baseUrl}/api/oauth/google`, { 
        timeout: 5000,
        maxRedirects: 0,
        validateStatus: function (status) {
          return status >= 200 && status < 400; // Accept redirects
        }
      });
      console.log('✅ OAuth endpoint accessible');
      console.log(`   Status: ${oauthResponse.status}`);
    } catch (oauthError) {
      if (oauthError.response && oauthError.response.status === 302) {
        console.log('✅ OAuth endpoint redirecting (expected behavior)');
        console.log(`   Redirect location: ${oauthError.response.headers.location || 'Not specified'}`);
      } else {
        console.log('⚠️  OAuth endpoint issue');
        console.log(`   Error: ${oauthError.message}`);
      }
    }
    
  } catch (error) {
    console.log('❌ Frontend failed to load');
    console.log(`   Error: ${error.message}`);
    console.log(`   This indicates a deployment or configuration issue`);
  }
  
  console.log('\n🎯 Test Summary:');
  console.log(`   Clean Production URL: ${baseUrl}`);
  console.log(`   Expected OAuth Callback: ${baseUrl}/api/oauth/google/callback`);
  console.log('\n📋 Next Steps:');
  console.log('   1. Update Google Cloud Console with clean OAuth callback URL');
  console.log('   2. Test complete OAuth flow');
  console.log('   3. Verify all functionality works with clean URLs');
}

testProductionURLs().catch(console.error);
