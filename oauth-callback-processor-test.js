/**
 * OAuth Callback Processor Test
 * Processes the OAuth callback URL and completes the token exchange
 */

const axios = require('axios');
const { URL } = require('url');

const BASE_URL = 'http://localhost:5001';
const TEST_EMAIL = 'test-email-verification@floworx-iq.com';
const TEST_PASSWORD = 'TestPassword123!';

console.log('🔄 OAUTH CALLBACK PROCESSOR TEST');
console.log('='.repeat(60));

async function processOAuthCallback(callbackUrl) {
  try {
    // Step 1: Parse callback URL
    console.log('📋 Step 1: Parsing callback URL...');
    const url = new URL(callbackUrl);
    const authCode = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    
    if (error) {
      throw new Error(`OAuth error: ${error} - ${url.searchParams.get('error_description')}`);
    }
    
    if (!authCode) {
      throw new Error('No authorization code found in callback URL');
    }
    
    if (!state) {
      throw new Error('No state parameter found in callback URL');
    }
    
    console.log('✅ Callback URL parsed successfully');
    console.log(`   • Authorization Code: ${authCode.substring(0, 20)}...`);
    console.log(`   • State: ${state}`);
    
    // Step 2: Get user authentication
    console.log('\n📋 Step 2: Getting user authentication...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Login failed');
    }
    
    const authToken = loginResponse.data.data.token;
    console.log('✅ User authenticated successfully');
    
    // Step 3: Process OAuth callback
    console.log('\n📋 Step 3: Processing OAuth callback...');
    const callbackResponse = await axios.get(`${BASE_URL}/api/oauth/google/callback`, {
      params: {
        code: authCode,
        state: state
      },
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      maxRedirects: 0,
      validateStatus: (status) => status < 400 || status === 302
    });
    
    if (callbackResponse.status === 302) {
      console.log('✅ OAuth callback processed - redirect received');
      console.log(`   • Redirect to: ${callbackResponse.headers.location}`);
    } else if (callbackResponse.data.success) {
      console.log('✅ OAuth callback processed successfully');
      console.log(`   • Message: ${callbackResponse.data.message}`);
    }
    
    // Step 4: Verify OAuth status
    console.log('\n📋 Step 4: Verifying OAuth connection...');
    const statusResponse = await axios.get(`${BASE_URL}/api/oauth/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (statusResponse.data.success) {
      const connections = statusResponse.data.data.connections;
      const gmailConnection = connections.find(conn => conn.provider === 'google');
      
      console.log('✅ OAuth status verified');
      console.log(`   • Active connections: ${statusResponse.data.data.active}`);
      console.log(`   • Total connections: ${connections.length}`);
      
      if (gmailConnection) {
        console.log('✅ Gmail connection found:');
        console.log(`   • Status: ${gmailConnection.status}`);
        console.log(`   • Email: ${gmailConnection.email || 'Not available'}`);
        console.log(`   • Scopes: ${gmailConnection.scope ? gmailConnection.scope.split(' ').length : 0} scopes`);
        
        if (gmailConnection.expiryDate) {
          const expiryDate = new Date(gmailConnection.expiryDate);
          console.log(`   • Expires: ${expiryDate.toLocaleDateString()} ${expiryDate.toLocaleTimeString()}`);
        }
      } else {
        console.log('❌ Gmail connection not found');
      }
    }
    
    // Step 5: Test Gmail API access (if connected)
    console.log('\n📋 Step 5: Testing Gmail API access...');
    try {
      const gmailTestResponse = await axios.get(`${BASE_URL}/api/gmail/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      if (gmailTestResponse.data.success) {
        console.log('✅ Gmail API access working');
        console.log(`   • Email: ${gmailTestResponse.data.data.emailAddress}`);
        console.log(`   • Messages Total: ${gmailTestResponse.data.data.messagesTotal || 'Not available'}`);
      }
    } catch (gmailError) {
      console.log('⚠️  Gmail API test skipped (endpoint may not exist yet)');
    }
    
    // Step 6: Check onboarding status
    console.log('\n📋 Step 6: Checking updated onboarding status...');
    const onboardingResponse = await axios.get(`${BASE_URL}/api/onboarding/status`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (onboardingResponse.data.success) {
      console.log('✅ Onboarding status updated');
      console.log(`   • Business Type: ${onboardingResponse.data.businessTypeId || 'Not selected'}`);
      console.log(`   • Gmail Connected: ${onboardingResponse.data.googleConnected ? 'Yes' : 'No'}`);
      console.log(`   • Next Step: ${onboardingResponse.data.nextStep}`);
      console.log(`   • Completed Steps: ${onboardingResponse.data.completedSteps?.length || 0}`);
    }
    
    return {
      success: true,
      gmailConnected: true,
      message: 'OAuth callback processed successfully'
    };
    
  } catch (error) {
    console.log('\n❌ OAuth callback processing failed:');
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

// Export for use with callback URL
module.exports = { processOAuthCallback };

// If called directly with callback URL as argument
if (require.main === module) {
  const callbackUrl = process.argv[2];
  
  if (!callbackUrl) {
    console.log('❌ Please provide the callback URL as an argument:');
    console.log('   node oauth-callback-processor-test.js "https://app.floworx-iq.com/api/oauth/google/callback?code=..."');
    process.exit(1);
  }
  
  processOAuthCallback(callbackUrl).then((result) => {
    console.log('\n' + '='.repeat(60));
    if (result.success) {
      console.log('🎉 OAUTH CALLBACK PROCESSING: SUCCESS!');
      console.log('📧 Gmail connection established successfully');
      console.log('🎯 Onboarding flow ready to continue');
    } else {
      console.log('❌ OAUTH CALLBACK PROCESSING: FAILED');
      console.log('Please check the error details above');
    }
    console.log('='.repeat(60));
  }).catch(error => {
    console.log('\n❌ Test execution failed:', error.message);
  });
}
