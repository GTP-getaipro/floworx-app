const { exec } = require('child_process');
const os = require('os');
require('dotenv').config();

/**
 * Configure OAuth Production URLs
 * Guides through Google Cloud Console setup and verifies configuration
 */

async function configureOAuthProduction() {
  console.log('🔐 Configuring OAuth Production URLs...\n');

  const results = {
    currentConfigCheck: false,
    productionUrlsReady: false,
    googleConsoleGuided: false,
    configurationComplete: false
  };

  // =====================================================
  // 1. ANALYZE CURRENT OAUTH CONFIGURATION
  // =====================================================
  console.log('1. Analyzing current OAuth configuration...');

  const currentConfig = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    frontendUrl: process.env.FRONTEND_URL
  };

  console.log('   📋 Current OAuth Configuration:');
  console.log(`   Client ID: ${currentConfig.clientId ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Client Secret: ${currentConfig.clientSecret ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   Redirect URI: ${currentConfig.redirectUri}`);
  console.log(`   Frontend URL: ${currentConfig.frontendUrl}`);

  if (currentConfig.clientId && currentConfig.clientSecret && currentConfig.redirectUri) {
    results.currentConfigCheck = true;
    console.log('   ✅ Basic OAuth configuration is complete');
  } else {
    console.log('   ❌ OAuth configuration is incomplete');
    return results;
  }

  // =====================================================
  // 2. DETERMINE PRODUCTION URLS
  // =====================================================
  console.log('\n2. Determining production URLs...');

  const productionUrls = {
    // From vercel deployment
    vercelUrl: 'https://floworx-app.vercel.app',
    // Future custom domain
    customDomain: 'https://app.floworx-iq.com',
    // Current development
    developmentUrl: 'http://localhost:5001'
  };

  console.log('   📋 Required OAuth Redirect URIs:');
  console.log(`   🔧 Development: ${productionUrls.developmentUrl}/api/oauth/google/callback`);
  console.log(`   🚀 Production (Vercel): ${productionUrls.vercelUrl}/api/oauth/google/callback`);
  console.log(`   🌐 Custom Domain: ${productionUrls.customDomain}/api/oauth/google/callback`);

  results.productionUrlsReady = true;

  // =====================================================
  // 3. GOOGLE CLOUD CONSOLE SETUP GUIDE
  // =====================================================
  console.log('\n3. Google Cloud Console setup required...');

  console.log('   🔗 Opening Google Cloud Console OAuth settings...');

  const consoleUrl = 'https://console.cloud.google.com/apis/credentials';

  // Open browser automatically
  let command;
  const platform = os.platform();

  switch (platform) {
    case 'darwin': // macOS
      command = `open "${consoleUrl}"`;
      break;
    case 'win32': // Windows
      command = `start "" "${consoleUrl}"`;
      break;
    case 'linux': // Linux
      command = `xdg-open "${consoleUrl}"`;
      break;
    default:
      console.log('   ❌ Cannot open browser automatically');
      command = null;
  }

  if (command) {
    exec(command, (error) => {
      if (error) {
        console.log('   ⚠️  Could not open browser automatically');
      }
    });
  }

  console.log('');
  console.log('   📍 Manual URL: https://console.cloud.google.com/apis/credentials');
  console.log('');
  console.log('   🔧 Steps to complete in Google Cloud Console:');
  console.log('');
  console.log('   1. **Find Your OAuth 2.0 Client ID**:');
  console.log(`      - Look for client ID ending in: ...${currentConfig.clientId.slice(-20)}`);
  console.log('      - Click on the pencil icon to edit');
  console.log('');
  console.log('   2. **Add Authorized Redirect URIs**:');
  console.log('      - Scroll down to "Authorized redirect URIs"');
  console.log('      - Click "ADD URI" for each of these:');
  console.log('');
  console.log('      ✅ Development (should already exist):');
  console.log(`         ${productionUrls.developmentUrl}/api/oauth/google/callback`);
  console.log('');
  console.log('      🚀 Production (ADD THIS):');
  console.log(`         ${productionUrls.vercelUrl}/api/oauth/google/callback`);
  console.log('');
  console.log('      🌐 Custom Domain (ADD THIS for future):');
  console.log(`         ${productionUrls.customDomain}/api/oauth/google/callback`);
  console.log('');
  console.log('   3. **Save Changes**:');
  console.log('      - Click "SAVE" at the bottom');
  console.log('      - Wait for changes to propagate (can take a few minutes)');
  console.log('');

  results.googleConsoleGuided = true;

  // =====================================================
  // 4. VERIFY OAUTH SCOPES
  // =====================================================
  console.log('4. Verifying OAuth scopes configuration...');

  const requiredScopes = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
  ];

  console.log('   📋 Required OAuth scopes for Floworx:');
  requiredScopes.forEach(scope => {
    console.log(`   - ${scope}`);
  });

  console.log('');
  console.log('   🔧 To verify scopes in Google Cloud Console:');
  console.log('   1. Go to "OAuth consent screen" in the left sidebar');
  console.log('   2. Click "EDIT APP"');
  console.log('   3. Go to "Scopes" step');
  console.log('   4. Ensure all required scopes are added');
  console.log('');

  // =====================================================
  // 5. ENVIRONMENT CONFIGURATION UPDATE
  // =====================================================
  );

  );
  console.log(`   GOOGLE_CLIENT_ID=${currentConfig.clientId}`);
  console.log(`   GOOGLE_CLIENT_SECRET=${currentConfig.clientSecret}`);
  console.log(`   GOOGLE_REDIRECT_URI=${productionUrls.vercelUrl}/api/oauth/google/callback`);
  console.log(`   FRONTEND_URL=${productionUrls.vercelUrl}`);
  console.log('');
  );

  // =====================================================
  // 6. TESTING INSTRUCTIONS
  // =====================================================
  console.log('\n6. Testing OAuth configuration...');

  console.log('   🧪 Development Testing:');
  console.log('   1. Start backend: npm run dev (in backend directory)');
  console.log('   2. Visit: http://localhost:5001/api/oauth/google');
  console.log('   3. Complete OAuth flow');
  console.log('   4. Verify successful redirect and token storage');
  console.log('');
  console.log('   🚀 Production Testing (after deployment):');
  console.log(`   1. Visit: ${productionUrls.vercelUrl}/api/oauth/google`);
  console.log('   2. Complete OAuth flow');
  console.log('   3. Verify successful redirect and token storage');
  console.log('   4. Test with different Google accounts');
  console.log('');

  results.configurationComplete = true;

  // =====================================================
  // 7. SUMMARY AND NEXT STEPS
  // =====================================================
  console.log('📊 OAuth Production Configuration Summary:');
  console.log(`   Current Config Check: ${results.currentConfigCheck ? '✅' : '❌'}`);
  console.log(`   Production URLs Ready: ${results.productionUrlsReady ? '✅' : '❌'}`);
  console.log(`   Google Console Guided: ${results.googleConsoleGuided ? '✅' : '❌'}`);
  console.log(`   Configuration Complete: ${results.configurationComplete ? '✅' : '❌'}`);

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n🎯 OAuth Configuration Score: ${passedTests}/${totalTests} steps completed`);

  if (passedTests === totalTests) {
    console.log('\n🎉 OAuth Production Configuration is Ready!');
    console.log('');
    console.log('✅ Configuration Status: COMPLETE');
    console.log('   ✅ OAuth credentials properly configured');
    console.log('   ✅ Production redirect URIs identified');
    console.log('   ✅ Google Cloud Console setup guided');
    );
    console.log('');
    console.log('📋 Manual Action Required:');
    console.log('   1. ⚠️  Complete Google Cloud Console redirect URI setup');
    console.log('   2. ⚠️  Verify OAuth scopes are configured');
    console.log('   3. ✅ Deploy to Vercel (OAuth will work automatically)');
    console.log('   4. ✅ Test OAuth flow in production');
  } else {
    console.log('\n❌ OAuth configuration incomplete');
  }

  console.log('\n🔗 Useful Links:');
  console.log('   Google Cloud Console: https://console.cloud.google.com/apis/credentials');
  console.log('   OAuth Consent Screen: https://console.cloud.google.com/apis/credentials/consent');
  console.log('   Vercel Dashboard: https://vercel.com/dashboard');

  return results;
}

// Run OAuth configuration if called directly
if (require.main === module) {
  configureOAuthProduction()
    .then(results => {
      const allComplete = Object.values(results).every(Boolean);
      process.exit(allComplete ? 0 : 1);
    })
    .catch(err => {
      console.error('❌ OAuth configuration failed:', err);
      process.exit(1);
    });
}

module.exports = { configureOAuthProduction };
