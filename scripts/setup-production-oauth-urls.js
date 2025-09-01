require('dotenv').config();

/**
 * Setup Production OAuth URLs
 * Configures clean, professional OAuth redirect URIs for production
 */

async function setupProductionOAuthUrls() {
  console.log('🎯 Setting up Production OAuth URLs...\n');

  const currentRedirectUri = process.env.GOOGLE_REDIRECT_URI;
  console.log('📊 Current Configuration:');
  console.log(`   Current GOOGLE_REDIRECT_URI: ${currentRedirectUri}`);
  console.log(`   Current FRONTEND_URL: ${process.env.FRONTEND_URL}`);

  // =====================================================
  // OPTION ANALYSIS
  // =====================================================
  console.log('\n🔍 OAuth URL Options Analysis:');
  console.log('   ============================');

  const options = [
    {
      name: 'Previous (Git Branch URL)',
      url: 'https://floworx-app-git-main-floworxdevelopers-projects.vercel.app',
      redirectUri: 'https://floworx-app-git-main-floworxdevelopers-projects.vercel.app/api/oauth/google/callback',
      pros: ['Previously working'],
      cons: ['Exposes Git branch structure', 'Unprofessional', 'Changes with branch names'],
      recommended: false
    },
    {
      name: 'Current (Clean Vercel Domain)',
      url: 'https://floworx-app.vercel.app',
      redirectUri: 'https://floworx-app.vercel.app/api/oauth/google/callback',
      pros: ['Clean URL', 'Professional', 'Stable', 'Easy to implement', 'Currently deployed'],
      cons: ['Still shows "vercel.app"', 'Not fully branded'],
      recommended: true
    },
    {
      name: 'Custom Domain',
      url: 'https://app.floworx-iq.com',
      redirectUri: 'https://app.floworx-iq.com/api/oauth/google/callback',
      pros: ['Fully branded', 'Most professional', 'Custom domain', 'Best user experience'],
      cons: ['Requires DNS setup', 'Additional configuration'],
      recommended: true
    }
  ];

  options.forEach((option, index) => {
    const status = option.recommended ? '⭐ RECOMMENDED' : '❌ NOT RECOMMENDED';
    console.log(`\n   ${index + 1}. ${option.name} ${status}`);
    console.log(`      URL: ${option.url}`);
    console.log(`      OAuth URI: ${option.redirectUri}`);
    console.log(`      Pros: ${option.pros.join(', ')}`);
    console.log(`      Cons: ${option.cons.join(', ')}`);
  });

  // =====================================================
  // RECOMMENDED CONFIGURATION
  // =====================================================
  console.log('\n🎯 Recommended Configuration:');
  console.log('   ===========================');

  const recommendedOption = options.find(opt => opt.name === 'Custom Domain');
  console.log(`   Primary: ${recommendedOption.redirectUri}`);
  console.log(`   Fallback: ${options.find(opt => opt.name === 'Clean Vercel Domain').redirectUri}`);

  // =====================================================
  // STEP-BY-STEP IMPLEMENTATION
  // =====================================================
  console.log('\n📋 Step-by-Step Implementation:');
  console.log('   ==============================');

  console.log('\n   🚀 OPTION A: Quick Fix (Clean Vercel Domain)');
  console.log('   ============================================');
  console.log('   Time required: ~10 minutes');
  console.log('');
  console.log('   1️⃣ Verify Current Environment Variables:');
  console.log('   ```bash');
  console.log('   vercel env ls');
  console.log('   # Should show: GOOGLE_REDIRECT_URI=https://floworx-app.vercel.app/api/oauth/google/callback');
  console.log('   # Should show: FRONTEND_URL=https://floworx-app.vercel.app');
  console.log('');
  console.log('   # If not set, add them:');
  console.log('   vercel env add GOOGLE_REDIRECT_URI production');
  console.log('   vercel env add FRONTEND_URL production');
  console.log('   vercel --prod');
  console.log('   ```');
  console.log('');
  console.log('   2️⃣ Update Google Cloud Console:');
  console.log('   - Go to: https://console.cloud.google.com/apis/credentials');
  console.log('   - Replace redirect URI with: https://floworx-app.vercel.app/api/oauth/google/callback');
  console.log('   - Save changes');

  console.log('\n   ⭐ OPTION B: Professional Setup (Custom Domain)');
  console.log('   ===============================================');
  console.log('   Time required: ~30 minutes');
  console.log('');
  console.log('   1️⃣ Add Custom Domain to Vercel:');
  console.log('   ```bash');
  console.log('   vercel domains add app.floworx-iq.com');
  console.log('   ```');
  console.log('');
  console.log('   2️⃣ Configure DNS (at your domain provider):');
  console.log('   ```dns');
  console.log('   Type: CNAME');
  console.log('   Name: app');
  console.log('   Value: cname.vercel-dns.com');
  console.log('   TTL: 300');
  console.log('   ```');
  console.log('');
  console.log('   3️⃣ Update Environment Variables:');
  console.log('   ```bash');
  console.log('   vercel env add GOOGLE_REDIRECT_URI production');
  console.log('   # Enter: https://app.floworx-iq.com/api/oauth/google/callback');
  console.log('');
  console.log('   vercel env add FRONTEND_URL production');
  console.log('   # Enter: https://app.floworx-iq.com');
  console.log('');
  console.log('   vercel --prod');
  console.log('   ```');
  console.log('');
  console.log('   4️⃣ Update Google Cloud Console:');
  console.log('   - Go to: https://console.cloud.google.com/apis/credentials');
  console.log('   - Replace redirect URI with: https://app.floworx-iq.com/api/oauth/google/callback');
  console.log('   - Save changes');

  // =====================================================
  // VALIDATION COMMANDS
  // =====================================================
  console.log('\n🧪 Validation Commands:');
  console.log('   =====================');

  console.log('\n   After making changes, run these tests:');
  console.log('');
  console.log('   1️⃣ Check Environment Variables:');
  console.log('   ```bash');
  console.log('   vercel env ls');
  console.log('   ```');
  console.log('');
  console.log('   2️⃣ Test OAuth Flow:');
  console.log('   ```bash');
  console.log('   # For Clean Vercel Domain:');
  console.log('   curl -I https://floworx-app.vercel.app/api/oauth/google');
  console.log('');
  console.log('   # For Custom Domain:');
  console.log('   curl -I https://app.floworx-iq.com/api/oauth/google');
  console.log('   ```');
  console.log('');
  console.log('   3️⃣ Manual Testing:');
  console.log('   - Go to your production URL');
  console.log('   - Register/login to dashboard');
  console.log('   - Click "Connect Your Google Account"');
  console.log('   - Should redirect to Google OAuth (no errors)');

  // =====================================================
  // TROUBLESHOOTING
  // =====================================================
  console.log('\n🔧 Troubleshooting:');
  console.log('   =================');

  console.log('\n   Common Issues and Solutions:');
  console.log('');
  console.log('   ❌ "Domain not found" error:');
  console.log('   ✅ Wait 5-10 minutes for DNS propagation');
  console.log('   ✅ Verify DNS records are correct');
  console.log('');
  console.log('   ❌ "OAuth error" after changes:');
  console.log('   ✅ Clear browser cache and cookies');
  console.log('   ✅ Verify Google Cloud Console URLs match exactly');
  console.log('');
  console.log('   ❌ "Access token required" still appears:');
  console.log('   ✅ Check that API endpoints don\'t require auth for OAuth initiation');
  console.log('   ✅ Verify environment variables are deployed');

  // =====================================================
  // SECURITY CONSIDERATIONS
  // =====================================================
  console.log('\n🔒 Security Considerations:');
  console.log('   =========================');

  console.log('\n   ✅ Best Practices:');
  console.log('   - Use HTTPS for all OAuth redirect URIs');
  console.log('   - Keep redirect URIs as specific as possible');
  console.log('   - Don\'t use wildcard domains in production');
  console.log('   - Regularly review and clean up old redirect URIs');
  console.log('');
  console.log('   ✅ Google Cloud Console Security:');
  console.log('   - Remove old/unused redirect URIs');
  console.log('   - Use the principle of least privilege');
  console.log('   - Monitor OAuth usage in Google Cloud Console');

  // =====================================================
  // FINAL RECOMMENDATIONS
  // =====================================================
  console.log('\n🎯 Final Recommendations:');
  console.log('   ========================');

  console.log('\n   🚀 For Immediate Fix (Today):');
  console.log('   Use Clean Vercel Domain: https://floworx-app.vercel.app');
  console.log('   - Quick to implement');
  console.log('   - Professional appearance');
  console.log('   - Stable and reliable');
  console.log('');
  console.log('   ⭐ For Long-term Success (This Week):');
  console.log('   Use Custom Domain: https://app.floworx-iq.com');
  console.log('   - Fully branded experience');
  console.log('   - Most professional');
  console.log('   - Better for marketing and trust');
  console.log('');
  console.log('   📈 Migration Strategy:');
  console.log('   1. Implement Clean Vercel Domain first (quick fix)');
  console.log('   2. Set up Custom Domain in parallel');
  console.log('   3. Test Custom Domain thoroughly');
  console.log('   4. Switch to Custom Domain when ready');
  console.log('   5. Keep Clean Vercel Domain as backup');

  console.log('\n✅ Ready to implement? Choose your preferred option and follow the steps above!');

  return {
    currentUri: currentRedirectUri,
    recommendedOptions: [
      'https://floworx-app.vercel.app/api/oauth/google/callback',
      'https://app.floworx-iq.com/api/oauth/google/callback'
    ],
    implementationTime: {
      cleanVercel: '10 minutes',
      customDomain: '30 minutes'
    }
  };
}

// Run setup if called directly
if (require.main === module) {
  setupProductionOAuthUrls()
    .then(results => {
      console.log('\n🎯 OAuth URL setup guide complete.');
      console.log('   Choose your preferred option and follow the implementation steps.');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Setup guide failed:', err);
      process.exit(1);
    });
}

module.exports = { setupProductionOAuthUrls };
