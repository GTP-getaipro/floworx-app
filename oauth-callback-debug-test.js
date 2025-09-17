/**
 * OAuth Callback Debug Test
 * Tests the OAuth callback with proper user authentication and debugging
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
const TEST_EMAIL = 'test-email-verification@floworx-iq.com';
const TEST_PASSWORD = 'TestPassword123!';

console.log('🐛 OAUTH CALLBACK DEBUG TEST');
console.log('='.repeat(60));

async function debugOAuthCallback() {
  try {
    // Step 1: Get user authentication and extract user ID
    console.log('📋 Step 1: Getting user authentication...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    const authToken = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    console.log('✅ Authentication successful');
    console.log(`   • User ID: ${user.id}`);
    console.log(`   • Email: ${user.email}`);
    
    // Step 2: Generate OAuth URL with correct user ID as state
    console.log('\n📋 Step 2: Generating OAuth URL with user ID as state...');
    const oauthResponse = await axios.get(`${BASE_URL}/api/oauth/google?token=${authToken}`, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302 || status < 400
    });
    
    if (oauthResponse.status === 302) {
      const oauthUrl = oauthResponse.headers.location;
      console.log('✅ OAuth URL generated successfully');
      
      // Extract state parameter from OAuth URL
      const urlParams = new URLSearchParams(oauthUrl.split('?')[1]);
      const stateParam = urlParams.get('state');
      
      console.log(`   • State parameter: ${stateParam}`);
      console.log(`   • Expected user ID: ${user.id}`);
      
      if (stateParam === user.id) {
        console.log('✅ State parameter matches user ID');
      } else {
        console.log('❌ State parameter does not match user ID!');
      }
      
      // Step 3: Create a test OAuth callback URL
      console.log('\n📋 Step 3: Creating test OAuth callback...');
      const testCallbackUrl = `${BASE_URL}/api/oauth/google/callback?code=test_auth_code_123&state=${user.id}`;
      
      console.log('🧪 Testing OAuth callback endpoint...');
      const callbackResponse = await axios.get(testCallbackUrl, {
        maxRedirects: 0,
        validateStatus: (status) => status < 500
      });
      
      console.log(`✅ Callback endpoint responded with status: ${callbackResponse.status}`);
      
      if (callbackResponse.status === 302) {
        const redirectLocation = callbackResponse.headers.location;
        console.log(`📍 Redirects to: ${redirectLocation}`);
        
        if (redirectLocation.includes('dashboard')) {
          if (redirectLocation.includes('error=')) {
            const errorMatch = redirectLocation.match(/error=([^&]+)/);
            const errorType = errorMatch ? errorMatch[1] : 'unknown';
            console.log(`❌ Callback failed with error: ${errorType}`);
          } else if (redirectLocation.includes('connected=google')) {
            console.log('✅ Callback successful - would redirect to dashboard');
          }
        }
      }
      
      // Step 4: Create the actual OAuth URL for manual testing
      console.log('\n📋 Step 4: Creating OAuth URL for manual testing...');
      
      console.log('\n' + '='.repeat(80));
      console.log('🔗 OAUTH URL FOR MANUAL TESTING (with correct user ID):');
      console.log('='.repeat(80));
      console.log(oauthUrl);
      console.log('='.repeat(80));
      
      console.log('\n📋 **MANUAL TESTING INSTRUCTIONS:**');
      console.log('1. 🌐 Copy the OAuth URL above');
      console.log('2. 📝 Paste it into your browser');
      console.log('3. 📧 Sign in with: dizelll2007@gmail.com');
      console.log('4. ✅ Grant Gmail permissions');
      console.log('5. 📋 You should be redirected to localhost:5001');
      console.log('6. 📄 Copy the FULL callback URL from your browser');
      console.log('7. 🧪 Share the callback URL to complete the test');
      
      console.log('\n🔍 **DEBUG INFO:**');
      console.log(`   • User ID in state: ${stateParam}`);
      console.log(`   • Expected redirect: localhost:5001/api/oauth/google/callback`);
      console.log(`   • Server should be running on: ${BASE_URL}`);
      
      return {
        success: true,
        oauthUrl: oauthUrl,
        userId: user.id,
        stateParam: stateParam
      };
      
    } else {
      console.log(`❌ OAuth URL generation failed: ${oauthResponse.status}`);
      return { success: false, error: 'OAuth URL generation failed' };
    }
    
  } catch (error) {
    console.log('\n❌ Debug test failed:');
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
    
    if (error.response?.status) {
      console.log(`   HTTP Status: ${error.response.status}`);
    }
    
    if (error.response?.data) {
      console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Create a manual callback processor
async function processManualCallback(callbackUrl) {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 MANUAL CALLBACK PROCESSOR');
  console.log('='.repeat(60));
  
  try {
    const url = new URL(callbackUrl);
    const authCode = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    
    console.log(`📋 Callback URL parsed:`);
    console.log(`   • Authorization Code: ${authCode ? authCode.substring(0, 20) + '...' : 'Missing'}`);
    console.log(`   • State (User ID): ${state || 'Missing'}`);
    
    if (authCode && state) {
      // Test the callback endpoint directly
      const callbackResponse = await axios.get(`${BASE_URL}/api/oauth/google/callback`, {
        params: { code: authCode, state: state },
        maxRedirects: 0,
        validateStatus: (status) => status < 500
      });
      
      console.log(`✅ Callback processed with status: ${callbackResponse.status}`);
      
      if (callbackResponse.status === 302) {
        console.log(`📍 Redirected to: ${callbackResponse.headers.location}`);
      }
      
      return { success: true };
    } else {
      console.log('❌ Missing authorization code or state parameter');
      return { success: false };
    }
    
  } catch (error) {
    console.log(`❌ Manual callback processing failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Export for manual callback processing
module.exports = { processManualCallback };

// Run the debug test
if (require.main === module) {
  const callbackUrl = process.argv[2];
  
  if (callbackUrl && callbackUrl.includes('code=')) {
    // Process manual callback
    processManualCallback(callbackUrl).then((result) => {
      console.log('\n' + '='.repeat(60));
      if (result.success) {
        console.log('🎉 MANUAL CALLBACK PROCESSING: SUCCESS!');
      } else {
        console.log('❌ MANUAL CALLBACK PROCESSING: FAILED');
      }
      console.log('='.repeat(60));
    });
  } else {
    // Run debug test
    debugOAuthCallback().then((result) => {
      console.log('\n' + '='.repeat(60));
      if (result.success) {
        console.log('🎉 OAUTH CALLBACK DEBUG: SUCCESS!');
        console.log('🌐 Use the OAuth URL above for manual testing');
        console.log('📧 The state parameter contains the correct user ID');
      } else {
        console.log('❌ OAUTH CALLBACK DEBUG: FAILED');
        console.log('Please check the error details above');
      }
      console.log('='.repeat(60));
    }).catch(error => {
      console.log('\n❌ Debug test execution failed:', error.message);
    });
  }
}
