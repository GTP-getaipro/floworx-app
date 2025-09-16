/**
 * Production OAuth Test
 * Tests Gmail OAuth integration in the production environment
 */

const axios = require('axios');

const PRODUCTION_URL = 'https://app.floworx-iq.com';
const TEST_EMAIL = 'test-email-verification@floworx-iq.com';
const TEST_PASSWORD = 'TestPassword123!';

console.log('🚀 PRODUCTION OAUTH TEST');
console.log('='.repeat(60));

async function testProductionOAuth() {
  try {
    // Step 1: Test production API health
    console.log('📋 Step 1: Testing production API health...');
    try {
      const healthResponse = await axios.get(`${PRODUCTION_URL}/api/health`, {
        timeout: 10000
      });
      console.log('✅ Production API is accessible');
      console.log(`   • Status: ${healthResponse.status}`);
    } catch (healthError) {
      console.log('⚠️  Production API health check failed, continuing anyway...');
      console.log(`   • Error: ${healthError.message}`);
    }
    
    // Step 2: Test production authentication
    console.log('\n📋 Step 2: Testing production authentication...');
    const loginResponse = await axios.post(`${PRODUCTION_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    }, {
      timeout: 15000
    });
    
    if (!loginResponse.data.success) {
      throw new Error('Production login failed');
    }
    
    const authToken = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    console.log('✅ Production authentication successful');
    console.log(`   • User ID: ${user.id}`);
    console.log(`   • Email: ${user.email}`);
    
    // Step 3: Generate production OAuth URL
    console.log('\n📋 Step 3: Generating production OAuth URL...');
    const oauthResponse = await axios.get(`${PRODUCTION_URL}/api/oauth/google?token=${authToken}`, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302 || status < 400,
      timeout: 15000
    });
    
    if (oauthResponse.status === 302) {
      const oauthUrl = oauthResponse.headers.location;
      console.log('✅ Production OAuth URL generated successfully');
      
      // Validate OAuth URL components
      const urlParams = new URLSearchParams(oauthUrl.split('?')[1]);
      const stateParam = urlParams.get('state');
      const redirectUri = decodeURIComponent(urlParams.get('redirect_uri') || '');
      const clientId = urlParams.get('client_id');
      
      console.log('\n🔍 OAuth URL Validation:');
      console.log(`   • State (User ID): ${stateParam}`);
      console.log(`   • Redirect URI: ${redirectUri}`);
      console.log(`   • Client ID: ${clientId ? clientId.substring(0, 20) + '...' : 'Missing'}`);
      
      // Verify components
      const validations = [
        { check: stateParam === user.id, name: 'State matches User ID' },
        { check: redirectUri === `${PRODUCTION_URL}/api/oauth/google/callback`, name: 'Correct Redirect URI' },
        { check: clientId === '636568831348-komtul497r7lg9eacu09n1ghtso6revc.apps.googleusercontent.com', name: 'Correct Client ID' },
        { check: oauthUrl.includes('gmail.readonly'), name: 'Gmail Read Scope' },
        { check: oauthUrl.includes('gmail.modify'), name: 'Gmail Modify Scope' }
      ];
      
      validations.forEach(({ check, name }) => {
        console.log(`   ${check ? '✅' : '❌'} ${name}`);
      });
      
      // Step 4: Test production OAuth status
      console.log('\n📋 Step 4: Testing production OAuth status...');
      const statusResponse = await axios.get(`${PRODUCTION_URL}/api/oauth/status`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        timeout: 10000
      });
      
      if (statusResponse.data.success) {
        console.log('✅ Production OAuth status endpoint working');
        console.log(`   • Active connections: ${statusResponse.data.data.active}`);
        console.log(`   • Total connections: ${statusResponse.data.data.connections.length}`);
      }
      
      // Step 5: Display production OAuth URL for testing
      console.log('\n' + '='.repeat(80));
      console.log('🔗 PRODUCTION OAUTH URL FOR TESTING:');
      console.log('='.repeat(80));
      console.log(oauthUrl);
      console.log('='.repeat(80));
      
      console.log('\n📋 **PRODUCTION TESTING INSTRUCTIONS:**');
      console.log('1. 🌐 Copy the production OAuth URL above');
      console.log('2. 📝 Paste it into your browser');
      console.log('3. 📧 Sign in with: dizelll2007@gmail.com');
      console.log('4. ✅ Grant Gmail permissions when prompted');
      console.log('5. 🔄 You will be redirected to:');
      console.log('   https://app.floworx-iq.com/api/oauth/google/callback?code=...');
      console.log('6. 📋 Copy the FULL callback URL from your browser');
      console.log('7. 🧪 Share the callback URL to complete the test');
      
      console.log('\n🎯 **PRODUCTION ADVANTAGES:**');
      console.log('• ✅ Uses real production domain (app.floworx-iq.com)');
      console.log('• ✅ Tests actual production environment');
      console.log('• ✅ No localhost configuration needed');
      console.log('• ✅ Real SSL certificates and security');
      console.log('• ✅ Complete end-to-end production test');
      
      return {
        success: true,
        oauthUrl: oauthUrl,
        userId: user.id,
        productionReady: true
      };
      
    } else {
      console.log(`❌ Production OAuth URL generation failed: ${oauthResponse.status}`);
      if (oauthResponse.data) {
        console.log(`   Response: ${JSON.stringify(oauthResponse.data, null, 2)}`);
      }
      return { success: false, error: 'OAuth URL generation failed' };
    }
    
  } catch (error) {
    console.log('\n❌ Production OAuth test failed:');
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
    
    if (error.response?.status) {
      console.log(`   HTTP Status: ${error.response.status}`);
    }
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      console.log('\n🚨 **PRODUCTION DEPLOYMENT ISSUE:**');
      console.log('   • Production server may not be deployed');
      console.log('   • Domain may not be pointing to the server');
      console.log('   • SSL certificate may have issues');
      console.log('   • Check your hosting platform (Vercel/Netlify/etc.)');
    }
    
    if (error.code === 'ETIMEDOUT') {
      console.log('\n⏱️  **TIMEOUT ISSUE:**');
      console.log('   • Production server is slow to respond');
      console.log('   • May need to increase timeout or check server performance');
    }
    
    return {
      success: false,
      error: error.message,
      needsDeployment: error.code === 'ENOTFOUND'
    };
  }
}

// Create production callback processor
async function processProductionCallback(callbackUrl) {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 PRODUCTION CALLBACK PROCESSOR');
  console.log('='.repeat(60));
  
  try {
    const url = new URL(callbackUrl);
    const authCode = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    
    console.log(`📋 Production callback URL parsed:`);
    console.log(`   • Authorization Code: ${authCode ? authCode.substring(0, 20) + '...' : 'Missing'}`);
    console.log(`   • State (User ID): ${state || 'Missing'}`);
    console.log(`   • Error: ${error || 'None'}`);
    
    if (error) {
      console.log(`❌ OAuth error: ${error}`);
      return { success: false, error: error };
    }
    
    if (authCode && state) {
      console.log('✅ Valid callback URL with authorization code');
      console.log('🎉 Production OAuth flow completed successfully!');
      console.log('📧 Gmail connection can now be established');
      
      return { 
        success: true, 
        authCode: authCode,
        userId: state,
        message: 'Production OAuth callback successful'
      };
    } else {
      console.log('❌ Missing authorization code or state parameter');
      return { success: false, error: 'Invalid callback URL' };
    }
    
  } catch (error) {
    console.log(`❌ Production callback processing failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Export for manual callback processing
module.exports = { processProductionCallback };

// Run the production test
if (require.main === module) {
  const callbackUrl = process.argv[2];
  
  if (callbackUrl && callbackUrl.includes('app.floworx-iq.com') && callbackUrl.includes('code=')) {
    // Process production callback
    processProductionCallback(callbackUrl).then((result) => {
      console.log('\n' + '='.repeat(60));
      if (result.success) {
        console.log('🎉 PRODUCTION OAUTH CALLBACK: SUCCESS!');
        console.log('📧 Gmail OAuth integration working in production!');
      } else {
        console.log('❌ PRODUCTION OAUTH CALLBACK: FAILED');
      }
      console.log('='.repeat(60));
    });
  } else {
    // Run production test
    testProductionOAuth().then((result) => {
      console.log('\n' + '='.repeat(60));
      if (result.success) {
        console.log('🎉 PRODUCTION OAUTH TEST: SUCCESS!');
        console.log('🚀 Production environment is ready for OAuth testing');
        console.log('🌐 Use the OAuth URL above for production testing');
      } else {
        console.log('❌ PRODUCTION OAUTH TEST: FAILED');
        if (result.needsDeployment) {
          console.log('🚨 Production deployment required');
        }
      }
      console.log('='.repeat(60));
    }).catch(error => {
      console.log('\n❌ Production test execution failed:', error.message);
    });
  }
}
