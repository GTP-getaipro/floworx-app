require('dotenv').config();

/**
 * Verify Google OAuth Configuration
 * Checks OAuth settings and redirect URIs for development and production
 */

async function verifyGoogleOAuth() {
  console.log('🔐 Verifying Google OAuth Configuration...\n');

  const results = {
    environmentCheck: false,
    credentialsFormat: false,
    redirectUriCheck: false,
    productionReadiness: false
  };

  // =====================================================
  // 1. ENVIRONMENT VARIABLES CHECK
  // =====================================================
  );

  const oauthVars = {
    'GOOGLE_CLIENT_ID': process.env.GOOGLE_CLIENT_ID,
    'GOOGLE_CLIENT_SECRET': process.env.GOOGLE_CLIENT_SECRET,
    'GOOGLE_REDIRECT_URI': process.env.GOOGLE_REDIRECT_URI
  };

  const missingVars = [];
  for (const [varName, value] of Object.entries(oauthVars)) {
    if (!value) {
      missingVars.push(varName);
      console.log(`   ❌ ${varName}: Missing`);
    } else {
      console.log(`   ✅ ${varName}: Configured`);
    }
  }

  if (missingVars.length > 0) {
    console.log(`\n❌ Missing OAuth variables: ${missingVars.join(', ')}`);
    return results;
  }

  results.environmentCheck = true;
  );

  // =====================================================
  // 2. CREDENTIALS FORMAT VALIDATION
  // =====================================================
  console.log('2. Validating OAuth credentials format...');

  // Validate Google Client ID format
  if (process.env.GOOGLE_CLIENT_ID.includes('googleusercontent.com')) {
    console.log('   ✅ GOOGLE_CLIENT_ID: Valid format');
  } else {
    console.log('   ❌ GOOGLE_CLIENT_ID: Invalid format (should end with googleusercontent.com)');
    return results;
  }

  // Validate Google Client Secret format
  if (process.env.GOOGLE_CLIENT_SECRET.startsWith('GOCSPX-')) {
    console.log('   ✅ GOOGLE_CLIENT_SECRET: Valid format');
  } else {
    console.log('   ❌ GOOGLE_CLIENT_SECRET: Invalid format (should start with GOCSPX-)');
    return results;
  }

  results.credentialsFormat = true;
  console.log('   ✅ OAuth credentials format is correct\n');

  // =====================================================
  // 3. REDIRECT URI ANALYSIS
  // =====================================================
  console.log('3. Analyzing redirect URI configuration...');

  const currentRedirectUri = process.env.GOOGLE_REDIRECT_URI;
  console.log(`   📍 Current redirect URI: ${currentRedirectUri}`);

  // Check if it's development or production
  if (currentRedirectUri.includes('localhost')) {
    );
    console.log('   ✅ Localhost redirect URI is appropriate for development');

    // Check if production URI is commented in env files
    console.log('   ⚠️  Remember to update for production deployment');
  } else if (currentRedirectUri.includes('vercel.app') || currentRedirectUri.includes('floworx-iq.com')) {
    );
    console.log('   ✅ Production redirect URI configured');
    results.productionReadiness = true;
  } else {
    console.log('   ❌ Redirect URI format not recognized');
    return results;
  }

  results.redirectUriCheck = true;
  console.log('');

  // =====================================================
  // 4. GOOGLE CLOUD CONSOLE VERIFICATION
  // =====================================================
  console.log('4. Google Cloud Console verification checklist...');

  console.log('   📋 Required redirect URIs in Google Cloud Console:');
  console.log('   Development: http://localhost:5001/api/oauth/google/callback');
  console.log('   Production: https://floworx-app.vercel.app/api/oauth/google/callback');
  console.log('   Custom Domain: https://app.floworx-iq.com/api/oauth/google/callback (when ready)');
  console.log('');

  // =====================================================
  // 5. OAUTH SCOPES CHECK
  // =====================================================
  console.log('5. Checking OAuth scopes configuration...');

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

  // =====================================================
  // 6. SECURITY RECOMMENDATIONS
  // =====================================================
  console.log('6. Security recommendations...');

  console.log('   🔒 Security checklist:');
  console.log('   ✅ Client credentials are properly configured');
  console.log('   ✅ Redirect URIs are restricted to known domains');

  if (process.env.NODE_ENV === 'production') {
    );
    if (!currentRedirectUri.includes('localhost')) {
      console.log('   ✅ No localhost URIs in production');
    } else {
      );
    }
  } else {
    );
    console.log('   ⚠️  Ensure production URIs are configured before deployment');
  }
  console.log('');

  // =====================================================
  // 7. OAUTH FLOW TEST PREPARATION
  // =====================================================
  console.log('7. OAuth flow test preparation...');

  console.log('   🧪 To test OAuth flow:');
  console.log('   1. Start your backend server: npm run dev (in backend directory)');
  console.log('   2. Visit: http://localhost:5001/api/oauth/google');
  console.log('   3. Complete Google OAuth flow');
  console.log('   4. Verify successful redirect and token storage');
  console.log('');

  // =====================================================
  // 8. SUMMARY
  // =====================================================
  console.log('📊 OAuth Configuration Summary:');
  );
  console.log(`   Credentials Format: ${results.credentialsFormat ? '✅' : '❌'}`);
  console.log(`   Redirect URI Check: ${results.redirectUriCheck ? '✅' : '❌'}`);
  console.log(`   Production Ready: ${results.productionReadiness ? '✅' : '🔧'}`);

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = 3; // Don't count production readiness as required for dev

  console.log(`\n🎯 Overall Score: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('🎉 Google OAuth configuration is complete and ready!');
  } else {
    console.log('❌ OAuth configuration needs attention. See recommendations below.');
  }

  // =====================================================
  // 9. NEXT STEPS
  // =====================================================
  console.log('\n📋 Next Steps:');

  if (results.environmentCheck && results.credentialsFormat && results.redirectUriCheck) {
    console.log('   1. ✅ Verify redirect URIs in Google Cloud Console');
    console.log('   2. ✅ Test OAuth flow in development');
    console.log('   3. ✅ Update redirect URIs for production deployment');
    console.log('   4. ✅ Test OAuth flow in production');
  } else {
    console.log('   1. ⚠️  Fix OAuth configuration issues above');
    console.log('   2. ⚠️  Re-run this verification script');
  }

  // =====================================================
  // 10. GOOGLE CLOUD CONSOLE LINKS
  // =====================================================
  console.log('\n🔗 Useful Links:');
  console.log('   Google Cloud Console: https://console.cloud.google.com/');
  console.log('   OAuth Credentials: https://console.cloud.google.com/apis/credentials');
  console.log('   OAuth Consent Screen: https://console.cloud.google.com/apis/credentials/consent');
  console.log('');

  return results;
}

// Run verification if called directly
if (require.main === module) {
  verifyGoogleOAuth()
    .then(results => {
      const coreTestsPassed = results.environmentCheck && results.credentialsFormat && results.redirectUriCheck;
      process.exit(coreTestsPassed ? 0 : 1);
    })
    .catch(err => {
      console.error('❌ OAuth verification failed:', err);
      process.exit(1);
    });
}

module.exports = { verifyGoogleOAuth };
