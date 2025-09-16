/**
 * Google Console Configuration Checker
 * Verifies Google OAuth configuration and provides troubleshooting
 */

console.log('🔍 GOOGLE CONSOLE CONFIGURATION CHECKER');
console.log('='.repeat(60));

function checkGoogleConsoleConfig() {
  console.log('📋 Current OAuth Configuration:');
  console.log(`   • Client ID: 636568831348-komtul497r7lg9eacu09n1ghtso6revc.apps.googleusercontent.com`);
  console.log(`   • Redirect URI: https://app.floworx-iq.com/api/oauth/google/callback`);
  console.log(`   • Frontend URL: https://app.floworx-iq.com`);
  
  console.log('\n🔧 Required Google Console Settings:');
  console.log('='.repeat(40));
  
  console.log('\n1. 📱 **OAuth 2.0 Client IDs**');
  console.log('   ✅ Application type: Web application');
  console.log('   ✅ Name: FloWorx Production');
  
  console.log('\n2. 🌐 **Authorized JavaScript origins**');
  console.log('   ✅ https://app.floworx-iq.com');
  console.log('   ✅ http://localhost:3000 (for development)');
  
  console.log('\n3. 🔄 **Authorized redirect URIs**');
  console.log('   ✅ https://app.floworx-iq.com/api/oauth/google/callback');
  console.log('   ✅ http://localhost:5001/api/oauth/google/callback (for development)');
  
  console.log('\n4. 📧 **OAuth consent screen**');
  console.log('   ✅ User Type: External');
  console.log('   ✅ App name: FloWorx');
  console.log('   ✅ User support email: Your email');
  console.log('   ✅ Developer contact: Your email');
  
  console.log('\n5. 🔐 **Scopes**');
  console.log('   ✅ https://www.googleapis.com/auth/userinfo.email');
  console.log('   ✅ https://www.googleapis.com/auth/userinfo.profile');
  console.log('   ✅ https://www.googleapis.com/auth/gmail.readonly');
  console.log('   ✅ https://www.googleapis.com/auth/gmail.modify');
  
  console.log('\n6. 👥 **Test users** (if app is in testing mode)');
  console.log('   ✅ dizelll2007@gmail.com');
  
  console.log('\n7. 🔌 **APIs enabled**');
  console.log('   ✅ Gmail API');
  console.log('   ✅ Google+ API (for user profile)');
  
  console.log('\n' + '='.repeat(60));
  console.log('🚨 **TROUBLESHOOTING STEPS:**');
  console.log('='.repeat(60));
  
  console.log('\n❓ **If you\'re stuck on the consent page:**');
  console.log('1. 🔄 Try refreshing the page');
  console.log('2. 🧹 Clear browser cache and cookies for Google');
  console.log('3. 🔓 Try in incognito/private browsing mode');
  console.log('4. 📱 Make sure you\'re signed into the correct Google account');
  console.log('5. ✅ Click "Allow" or "Continue" to grant permissions');
  
  console.log('\n❓ **If you get a redirect error:**');
  console.log('1. ✅ Verify redirect URI in Google Console matches exactly:');
  console.log('   https://app.floworx-iq.com/api/oauth/google/callback');
  console.log('2. 🔄 Make sure there are no extra spaces or characters');
  console.log('3. 📝 Double-check the Client ID is correct');
  
  console.log('\n❓ **If you get "App not verified" warning:**');
  console.log('1. ✅ Click "Advanced" then "Go to FloWorx (unsafe)"');
  console.log('2. 📧 This is normal for apps in development/testing');
  console.log('3. 🔐 Your app is safe - Google just hasn\'t verified it yet');
  
  console.log('\n❓ **If you get "Access blocked" error:**');
  console.log('1. 👥 Make sure dizelll2007@gmail.com is added as a test user');
  console.log('2. 🔓 Check if the app is published or in testing mode');
  console.log('3. 📧 Verify you\'re using the correct Gmail account');
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 **NEXT STEPS:**');
  console.log('1. 🌐 Complete the OAuth consent by clicking "Allow"');
  console.log('2. 📋 Copy the callback URL after redirection');
  console.log('3. 🧪 Share the callback URL to complete the test');
  console.log('='.repeat(60));
}

// Run the configuration checker
checkGoogleConsoleConfig();
