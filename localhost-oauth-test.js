/**
 * Localhost OAuth Test
 * Creates OAuth URL with localhost redirect to bypass production domain issues
 */

const axios = require('axios');

const BASE_URL = 'https://app.floworx-iq.com';
const TEST_EMAIL = 'test-email-verification@floworx-iq.com';
const TEST_PASSWORD = 'TestPassword123!';

console.log('🏠 LOCALHOST OAUTH TEST');
console.log('='.repeat(60));

async function createLocalhostOAuthTest() {
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
    
    // Step 2: Create localhost OAuth URL
    console.log('\n📋 Step 2: Creating localhost OAuth URL...');
    
    const userId = authToken.split('.')[2]; // Use part of token as state
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile', 
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ].join(' ');
    
    const localhostOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `access_type=offline&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${userId}&` +
      `prompt=consent&` +
      `include_granted_scopes=true&` +
      `response_type=code&` +
      `client_id=636568831348-komtul497r7lg9eacu09n1ghtso6revc.apps.googleusercontent.com&` +
      `redirect_uri=${encodeURIComponent('https://app.floworx-iq.com/api/oauth/google/callback')}`;
    
    console.log('✅ Localhost OAuth URL created');
    
    // Step 3: Display the URL and instructions
    console.log('\n' + '='.repeat(80));
    console.log('🔗 LOCALHOST OAUTH URL FOR TESTING:');
    console.log('='.repeat(80));
    console.log(localhostOAuthUrl);
    console.log('='.repeat(80));
    
    console.log('\n📋 **TESTING INSTRUCTIONS:**');
    console.log('1. 🌐 Copy the localhost OAuth URL above');
    console.log('2. 📝 Paste it into your browser');
    console.log('3. 📧 Sign in with: dizelll2007@gmail.com');
    console.log('4. ✅ Grant the Gmail permissions');
    console.log('5. 📋 You should be redirected to app.floworx-iq.com');
    console.log('6. 📄 Copy the FULL callback URL from your browser');
    console.log('7. 🧪 Share the callback URL to complete the test');
    
    console.log('\n⚠️  **IMPORTANT NOTES:**');
    console.log('• 🏠 This uses localhost instead of production domain');
    console.log('• 🔧 Make sure your server is running on app.floworx-iq.com');
    console.log('• 📧 Use dizelll2007@gmail.com for testing');
    console.log('• 🔐 The callback URL will contain the authorization code');
    
    console.log('\n🔧 **GOOGLE CONSOLE REQUIREMENT:**');
    console.log('Make sure your Google Console has this redirect URI:');
    console.log('https://app.floworx-iq.com/api/oauth/google/callback');
    
    return {
      success: true,
      oauthUrl: localhostOAuthUrl,
      authToken: authToken
    };
    
  } catch (error) {
    console.log('\n❌ Localhost OAuth test creation failed:');
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
    
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the localhost OAuth test
createLocalhostOAuthTest().then((result) => {
  console.log('\n' + '='.repeat(60));
  if (result.success) {
    console.log('🎉 LOCALHOST OAUTH TEST: READY!');
    console.log('🌐 Use the OAuth URL above to test with localhost');
    console.log('📧 This will bypass production domain issues');
    
    console.log('\n📋 **NEXT STEPS:**');
    console.log('1. 🔧 Add localhost redirect URI to Google Console');
    console.log('2. 🌐 Test OAuth flow with localhost URL');
    console.log('3. 📋 Share callback URL to complete integration test');
    
  } else {
    console.log('❌ LOCALHOST OAUTH TEST: FAILED');
    console.log('Please check the error details above');
  }
  console.log('='.repeat(60));
}).catch(error => {
  console.log('\n❌ Test execution failed:', error.message);
});
