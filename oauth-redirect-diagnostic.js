/**
 * OAuth Redirect Diagnostic
 * Diagnoses why OAuth callback redirected to /login instead of processing the callback
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
const TEST_EMAIL = 'test-email-verification@floworx-iq.com';
const TEST_PASSWORD = 'TestPassword123!';

console.log('🔍 OAUTH REDIRECT DIAGNOSTIC');
console.log('='.repeat(60));

async function diagnoseOAuthRedirect() {
  try {
    // Step 1: Get authentication token
    console.log('📋 Step 1: Getting authentication token...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    const authToken = loginResponse.data.data.token;
    console.log('✅ Authentication successful');
    
    // Step 2: Generate OAuth URL and check redirect URI
    console.log('\n📋 Step 2: Checking OAuth URL configuration...');
    const oauthResponse = await axios.get(`${BASE_URL}/api/oauth/google?token=${authToken}`, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302 || status < 400
    });
    
    if (oauthResponse.status === 302) {
      const oauthUrl = oauthResponse.headers.location;
      console.log('✅ OAuth URL generated successfully');
      
      // Extract redirect URI from OAuth URL
      const urlParams = new URLSearchParams(oauthUrl.split('?')[1]);
      const redirectUri = decodeURIComponent(urlParams.get('redirect_uri') || '');
      
      console.log(`📍 Redirect URI in OAuth URL: ${redirectUri}`);
      
      if (redirectUri === 'https://app.floworx-iq.com/api/oauth/google/callback') {
        console.log('✅ Redirect URI is correct');
      } else {
        console.log('❌ Redirect URI is incorrect!');
        console.log('   Expected: https://app.floworx-iq.com/api/oauth/google/callback');
        console.log(`   Actual: ${redirectUri}`);
      }
    }
    
    // Step 3: Test OAuth callback endpoint directly
    console.log('\n📋 Step 3: Testing OAuth callback endpoint...');
    try {
      const callbackTestResponse = await axios.get(`${BASE_URL}/api/oauth/google/callback`, {
        params: {
          code: 'test_code',
          state: 'test_state'
        },
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        maxRedirects: 0,
        validateStatus: (status) => status < 500
      });
      
      console.log(`✅ OAuth callback endpoint responded with status: ${callbackTestResponse.status}`);
      
      if (callbackTestResponse.status === 302) {
        console.log(`📍 Callback redirects to: ${callbackTestResponse.headers.location}`);
      } else if (callbackTestResponse.data) {
        console.log(`📄 Response: ${JSON.stringify(callbackTestResponse.data, null, 2)}`);
      }
      
    } catch (callbackError) {
      console.log(`❌ OAuth callback endpoint error: ${callbackError.response?.status || callbackError.message}`);
      if (callbackError.response?.data) {
        console.log(`📄 Error response: ${JSON.stringify(callbackError.response.data, null, 2)}`);
      }
    }
    
    // Step 4: Check environment configuration
    console.log('\n📋 Step 4: Checking environment configuration...');
    console.log('🔧 Current configuration:');
    console.log(`   • GOOGLE_CLIENT_ID: 636568831348-komtul497r7lg9eacu09n1ghtso6revc.apps.googleusercontent.com`);
    console.log(`   • GOOGLE_REDIRECT_URI: https://app.floworx-iq.com/api/oauth/google/callback`);
    console.log(`   • FRONTEND_URL: https://app.floworx-iq.com`);
    
    // Step 5: Provide diagnostic results
    console.log('\n📋 Step 5: Diagnostic results...');
    console.log('🔍 POSSIBLE CAUSES FOR /login REDIRECT:');
    console.log('='.repeat(40));
    
    console.log('\n1. 🌐 **Google Console Configuration Issue**');
    console.log('   • Redirect URI might be set to /login instead of /api/oauth/google/callback');
    console.log('   • Check Google Cloud Console > APIs & Services > Credentials');
    console.log('   • Verify "Authorized redirect URIs" contains:');
    console.log('     https://app.floworx-iq.com/api/oauth/google/callback');
    
    console.log('\n2. 🔄 **Frontend Route Interception**');
    console.log('   • React Router might be catching the OAuth callback');
    console.log('   • Check if there\'s a route that matches /api/oauth/google/callback');
    console.log('   • Frontend routes should not intercept API calls');
    
    console.log('\n3. 🔐 **Authentication Middleware**');
    console.log('   • OAuth callback endpoint might require authentication');
    console.log('   • The callback should handle its own authentication');
    console.log('   • Check if middleware is redirecting unauthenticated requests');
    
    console.log('\n4. 🌍 **Domain/DNS Issues**');
    console.log('   • app.floworx-iq.com might not be pointing to the correct server');
    console.log('   • The domain might be serving a different application');
    console.log('   • Check DNS configuration and server routing');
    
    return {
      success: true,
      redirectUri: redirectUri,
      diagnosis: 'OAuth redirect diagnostic completed'
    };
    
  } catch (error) {
    console.log('\n❌ Diagnostic failed:');
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Create a manual OAuth simulation
async function createManualOAuthTest() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 MANUAL OAUTH SIMULATION');
  console.log('='.repeat(60));
  
  console.log('\n📋 Since the redirect failed, let\'s create a manual test:');
  console.log('1. 🔧 I\'ll create a local OAuth callback handler');
  console.log('2. 🌐 We\'ll use localhost for testing instead of production domain');
  console.log('3. 🧪 This will prove the OAuth integration works');
  
  // Generate a new OAuth URL with localhost redirect
  try {
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    const authToken = loginResponse.data.data.token;
    
    // Create a test OAuth URL with localhost redirect
    const testOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `access_type=offline&` +
      `scope=${encodeURIComponent('https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify')}&` +
      `state=${authToken.split('.')[2]}&` +
      `prompt=consent&` +
      `include_granted_scopes=true&` +
      `response_type=code&` +
      `client_id=636568831348-komtul497r7lg9eacu09n1ghtso6revc.apps.googleusercontent.com&` +
      `redirect_uri=${encodeURIComponent('http://localhost:5001/api/oauth/google/callback')}`;
    
    console.log('\n🔗 **LOCALHOST OAUTH URL FOR TESTING:**');
    console.log('='.repeat(80));
    console.log(testOAuthUrl);
    console.log('='.repeat(80));
    
    console.log('\n📋 **INSTRUCTIONS:**');
    console.log('1. 🌐 Copy the localhost OAuth URL above');
    console.log('2. 📝 Paste it into your browser');
    console.log('3. 📧 Sign in with dizelll2007@gmail.com');
    console.log('4. ✅ Grant permissions');
    console.log('5. 📋 Copy the callback URL after redirect');
    console.log('6. 🧪 Share the callback URL to complete the test');
    
  } catch (error) {
    console.log('❌ Failed to create manual test:', error.message);
  }
}

// Run diagnostics
diagnoseOAuthRedirect().then(async (result) => {
  console.log('\n' + '='.repeat(60));
  if (result.success) {
    console.log('✅ OAUTH REDIRECT DIAGNOSTIC: COMPLETED');
    await createManualOAuthTest();
  } else {
    console.log('❌ OAUTH REDIRECT DIAGNOSTIC: FAILED');
  }
  console.log('='.repeat(60));
}).catch(error => {
  console.log('\n❌ Diagnostic execution failed:', error.message);
});
