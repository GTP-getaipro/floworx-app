/**
 * Simple OAuth URL Generation Test
 * Generates the OAuth URL for manual testing with dizelll2007@gmail.com
 */

const axios = require('axios');

const BASE_URL = 'https://app.floworx-iq.com';
const TEST_EMAIL = 'test-email-verification@floworx-iq.com';
const TEST_PASSWORD = 'TestPassword123!';

console.log('🔗 SIMPLE OAUTH URL GENERATION TEST');
console.log('='.repeat(60));

async function generateOAuthUrl() {
  try {
    // Step 1: Login to get auth token
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
    
    // Step 2: Generate OAuth URL
    console.log('\n📋 Step 2: Generating OAuth URL...');
    const oauthResponse = await axios.get(`${BASE_URL}/api/oauth/google?token=${authToken}`, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302 || status < 400
    });
    
    if (oauthResponse.status === 302) {
      const oauthUrl = oauthResponse.headers.location;
      console.log('✅ OAuth URL generated successfully!');
      
      console.log('\n' + '='.repeat(80));
      console.log('🔗 OAUTH URL FOR MANUAL TESTING WITH dizelll2007@gmail.com');
      console.log('='.repeat(80));
      console.log(oauthUrl);
      console.log('='.repeat(80));
      
      console.log(`
📋 MANUAL TESTING INSTRUCTIONS:

1. 🌐 Copy the OAuth URL above
2. 📝 Paste it into your browser
3. 📧 Sign in with: dizelll2007@gmail.com
4. ✅ Grant the requested Gmail permissions:
   • Read your email messages and settings
   • Manage your email (create labels, drafts)
   • View your email address
   • View your basic profile info
5. 🔄 After granting permissions, you'll be redirected to:
   https://app.floworx-iq.com/api/oauth/google/callback
6. 📋 Copy the FULL callback URL from your browser
7. 🧪 Use the callback URL to test the complete OAuth flow

⚠️  IMPORTANT: 
   - The callback URL will contain an authorization code
   - This proves the OAuth flow is working correctly
   - You can then use this to test token storage and Gmail API access
`);
      
      // Validate OAuth URL components
      console.log('\n🔍 OAuth URL Validation:');
      const checks = [
        { check: 'accounts.google.com', name: 'Google OAuth Endpoint' },
        { check: 'client_id=636568831348', name: 'Client ID' },
        { check: 'scope=', name: 'Scopes' },
        { check: 'redirect_uri=', name: 'Redirect URI' },
        { check: 'response_type=code', name: 'Response Type' },
        { check: 'state=', name: 'State Parameter' }
      ];
      
      checks.forEach(({ check, name }) => {
        if (oauthUrl.includes(check)) {
          console.log(`   ✅ ${name}: PRESENT`);
        } else {
          console.log(`   ❌ ${name}: MISSING`);
        }
      });
      
      // Extract and display scopes
      const scopeMatch = oauthUrl.match(/scope=([^&]+)/);
      if (scopeMatch) {
        const scopes = decodeURIComponent(scopeMatch[1]).split(' ');
        console.log('\n📧 Gmail Scopes in OAuth URL:');
        scopes.forEach(scope => {
          console.log(`   • ${scope}`);
        });
      }
      
      return true;
    } else {
      console.log(`❌ Unexpected response status: ${oauthResponse.status}`);
      return false;
    }
    
  } catch (error) {
    console.log('❌ Error generating OAuth URL:');
    console.log(`   ${error.response?.data?.error || error.message}`);
    
    if (error.response?.status) {
      console.log(`   HTTP Status: ${error.response.status}`);
    }
    
    return false;
  }
}

// Run the test
generateOAuthUrl().then((success) => {
  console.log('\n' + '='.repeat(60));
  if (success) {
    console.log('🎉 OAuth URL generation: SUCCESS!');
    console.log('📧 Ready for manual testing with dizelll2007@gmail.com');
  } else {
    console.log('❌ OAuth URL generation: FAILED');
    console.log('Please check the server logs for more details');
  }
  console.log('='.repeat(60));
}).catch(error => {
  console.log('\n❌ Test failed:', error.message);
});
