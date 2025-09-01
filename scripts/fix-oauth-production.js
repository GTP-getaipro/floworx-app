require('dotenv').config();

/**
 * Fix OAuth Production Configuration
 * Addresses the "Access token required" error and OAuth redirect issues
 */

async function fixOAuthProduction() {
  console.log('🔧 Fixing OAuth Production Configuration...\n');

  const results = {
    configurationChecks: [],
    requiredActions: [],
    vercelUpdates: [],
    googleCloudUpdates: []
  };

  // =====================================================
  // 1. DIAGNOSE CURRENT OAUTH CONFIGURATION
  // =====================================================
  console.log('1. 🔍 Diagnosing Current OAuth Configuration');
  console.log('   ==========================================');

  // Check current environment variables
  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'FRONTEND_URL'
  ];

  console.log('   📋 Current Environment Variables:');
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      console.log(`   ✅ ${varName}: ${value.substring(0, 20)}...`);
      results.configurationChecks.push(`✅ ${varName} configured`);
    } else {
      console.log(`   ❌ ${varName}: Missing`);
      results.configurationChecks.push(`❌ ${varName} missing`);
    }
  }

  // Check redirect URI configuration
  const currentRedirectUri = process.env.GOOGLE_REDIRECT_URI;
  const frontendUrl = process.env.FRONTEND_URL;
  
  console.log('\n   🔗 OAuth Redirect URI Analysis:');
  console.log(`   Current GOOGLE_REDIRECT_URI: ${currentRedirectUri}`);
  console.log(`   Current FRONTEND_URL: ${frontendUrl}`);
  
  // Determine production URLs
  const productionDomain = 'floworx-app.vercel.app'; // From screenshot
  const expectedRedirectUri = `https://${productionDomain}/api/oauth/google/callback`;
  
  console.log(`   Expected production redirect URI: ${expectedRedirectUri}`);
  
  if (currentRedirectUri !== expectedRedirectUri) {
    console.log('   ❌ Redirect URI mismatch - this is causing the OAuth error');
    results.requiredActions.push('Update GOOGLE_REDIRECT_URI for production');
  } else {
    console.log('   ✅ Redirect URI correctly configured');
  }

  // =====================================================
  // 2. GOOGLE CLOUD CONSOLE UPDATES REQUIRED
  // =====================================================
  console.log('\n2. 🌐 Google Cloud Console Updates Required');
  console.log('   =========================================');

  console.log('   📋 Steps to fix Google Cloud Console configuration:');
  console.log('   1. Go to: https://console.cloud.google.com/apis/credentials');
  console.log('   2. Select your FloWorx project');
  console.log('   3. Click on your OAuth 2.0 Client ID');
  console.log('   4. In "Authorized redirect URIs", add:');
  console.log(`      ${expectedRedirectUri}`);
  console.log('   5. Save the changes');
  console.log('');
  console.log('   📋 Additional production URIs to add:');
  console.log(`   - https://${productionDomain}/api/oauth/google/callback`);
  console.log(`   - https://${productionDomain}/auth/callback`);
  console.log(`   - https://${productionDomain}/oauth/callback`);

  results.googleCloudUpdates.push('Add production redirect URIs');
  results.googleCloudUpdates.push('Verify OAuth consent screen settings');

  // =====================================================
  // 3. VERCEL ENVIRONMENT VARIABLES UPDATES
  // =====================================================
  console.log('\n3. ⚡ Vercel Environment Variables Updates');
  console.log('   =======================================');

  console.log('   📋 Required Vercel environment variable updates:');
  console.log('   Run these commands in your terminal:');
  console.log('');
  console.log('   # Update production environment variables');
  console.log(`   vercel env add GOOGLE_REDIRECT_URI production`);
  console.log(`   # Enter: ${expectedRedirectUri}`);
  console.log('');
  console.log(`   vercel env add FRONTEND_URL production`);
  console.log(`   # Enter: https://${productionDomain}`);
  console.log('');
  console.log('   # Verify other OAuth variables are set');
  console.log('   vercel env ls');

  results.vercelUpdates.push('Update GOOGLE_REDIRECT_URI');
  results.vercelUpdates.push('Update FRONTEND_URL');
  results.vercelUpdates.push('Verify all OAuth environment variables');

  // =====================================================
  // 4. API ENDPOINT FIXES
  // =====================================================
  console.log('\n4. 🔧 API Endpoint Fixes Required');
  console.log('   ===============================');

  console.log('   📋 OAuth API endpoint issues to fix:');
  console.log('   1. /api/oauth/google endpoint returns "Access token required"');
  console.log('   2. This suggests the endpoint expects authentication when it shouldn\'t');
  console.log('   3. OAuth initiation endpoints should NOT require authentication');
  console.log('');
  console.log('   🔧 Required code fixes:');
  console.log('   - Remove authentication middleware from OAuth initiation routes');
  console.log('   - Ensure /api/oauth/google redirects to Google without requiring tokens');
  console.log('   - Fix callback handling in /api/oauth/google/callback');

  results.requiredActions.push('Fix OAuth API endpoints');
  results.requiredActions.push('Remove auth middleware from OAuth routes');

  // =====================================================
  // 5. USER STATUS API FIX
  // =====================================================
  console.log('\n5. 👤 User Status API Fix');
  console.log('   ======================');

  console.log('   📊 Issue: "Failed to load user status" on dashboard');
  console.log('   🔧 Root cause: /api/user/status endpoint authentication failure');
  console.log('');
  console.log('   📋 Required fixes:');
  console.log('   1. Ensure /api/user/status endpoint exists and works');
  console.log('   2. Fix JWT token validation in the endpoint');
  console.log('   3. Return proper user data or handle unauthenticated state');
  console.log('   4. Add graceful error handling for missing/invalid tokens');

  results.requiredActions.push('Fix /api/user/status endpoint');
  results.requiredActions.push('Improve JWT token validation');

  // =====================================================
  // 6. FRONTEND ERROR HANDLING IMPROVEMENTS
  // =====================================================
  console.log('\n6. 🎨 Frontend Error Handling Improvements');
  console.log('   ========================================');

  console.log('   📋 Frontend improvements needed:');
  console.log('   1. Replace raw error messages with user-friendly ones');
  console.log('   2. Add loading states during OAuth flow');
  console.log('   3. Handle OAuth errors gracefully');
  console.log('   4. Show proper success messages after account creation');
  console.log('   5. Add retry mechanisms for failed API calls');

  results.requiredActions.push('Improve frontend error handling');
  results.requiredActions.push('Add user-friendly error messages');

  // =====================================================
  // 7. TESTING AND VALIDATION
  // =====================================================
  console.log('\n7. 🧪 Testing and Validation Steps');
  console.log('   ================================');

  console.log('   📋 After making the fixes, test these flows:');
  console.log('   1. Register new account → Success modal → Dashboard redirect');
  console.log('   2. Dashboard loads → User status displays correctly');
  console.log('   3. Click "Connect Google Account" → Redirects to Google OAuth');
  console.log('   4. Complete OAuth → Returns to dashboard with success message');
  console.log('   5. Test error scenarios → Proper error messages display');

  // =====================================================
  // 8. IMMEDIATE ACTION PLAN
  // =====================================================
  console.log('\n📋 IMMEDIATE ACTION PLAN');
  console.log('   ======================');

  console.log('\n   🚨 CRITICAL (Do First - 15 minutes):');
  console.log('   1. Update Google Cloud Console OAuth redirect URIs');
  console.log('   2. Update Vercel environment variables');
  console.log('   3. Redeploy the application');

  console.log('\n   ⚡ HIGH PRIORITY (Do Next - 30 minutes):');
  console.log('   1. Fix /api/oauth/google endpoint (remove auth requirement)');
  console.log('   2. Fix /api/user/status endpoint authentication');
  console.log('   3. Test OAuth flow end-to-end');

  console.log('\n   📈 MEDIUM PRIORITY (Do Soon - 1 hour):');
  console.log('   1. Implement improved error handling');
  console.log('   2. Add success modals and loading states');
  console.log('   3. Run comprehensive end-to-end tests');

  // =====================================================
  // 9. STEP-BY-STEP COMMANDS
  // =====================================================
  console.log('\n📋 STEP-BY-STEP COMMANDS TO RUN');
  console.log('   ==============================');

  console.log('\n   1️⃣ Update Vercel Environment Variables:');
  console.log('   ```bash');
  console.log('   # Set production redirect URI');
  console.log(`   vercel env add GOOGLE_REDIRECT_URI production`);
  console.log(`   # When prompted, enter: ${expectedRedirectUri}`);
  console.log('');
  console.log('   # Set production frontend URL');
  console.log(`   vercel env add FRONTEND_URL production`);
  console.log(`   # When prompted, enter: https://${productionDomain}`);
  console.log('');
  console.log('   # Redeploy with new environment variables');
  console.log('   vercel --prod');
  console.log('   ```');

  console.log('\n   2️⃣ Test the fixes:');
  console.log('   ```bash');
  console.log('   # Run end-to-end tests');
  console.log('   npm run test:e2e');
  console.log('');
  console.log('   # Or test manually:');
  console.log(`   # 1. Go to https://${productionDomain}/register`);
  console.log('   # 2. Create account and verify success flow');
  console.log('   # 3. Go to dashboard and test Google OAuth');
  console.log('   ```');

  // =====================================================
  // 10. SUMMARY
  // =====================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 OAUTH PRODUCTION FIX SUMMARY');
  console.log('='.repeat(60));

  console.log('\n✅ Configuration Checks:');
  results.configurationChecks.forEach(check => console.log(`   ${check}`));

  console.log('\n🔧 Required Actions:');
  results.requiredActions.forEach(action => console.log(`   • ${action}`));

  console.log('\n🌐 Google Cloud Updates:');
  results.googleCloudUpdates.forEach(update => console.log(`   • ${update}`));

  console.log('\n⚡ Vercel Updates:');
  results.vercelUpdates.forEach(update => console.log(`   • ${update}`));

  console.log('\n🎯 SUCCESS CRITERIA:');
  console.log('   ✅ OAuth flow redirects to Google without errors');
  console.log('   ✅ User status loads correctly on dashboard');
  console.log('   ✅ Registration flow shows success modal');
  console.log('   ✅ All API endpoints respond appropriately');

  console.log('\n🚀 NEXT STEPS:');
  console.log('   1. Update Google Cloud Console (5 min)');
  console.log('   2. Update Vercel environment variables (5 min)');
  console.log('   3. Redeploy application (5 min)');
  console.log('   4. Test OAuth flow (10 min)');
  console.log('   5. Verify all user journeys work (15 min)');

  return {
    configurationChecks: results.configurationChecks,
    requiredActions: results.requiredActions,
    googleCloudUpdates: results.googleCloudUpdates,
    vercelUpdates: results.vercelUpdates,
    productionDomain,
    expectedRedirectUri
  };
}

// Run OAuth fixes if called directly
if (require.main === module) {
  fixOAuthProduction()
    .then(results => {
      console.log('\n🔧 OAuth production fix analysis complete.');
      console.log('   Follow the action plan above to resolve the issues.');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ OAuth fix analysis failed:', err);
      process.exit(1);
    });
}

module.exports = { fixOAuthProduction };
