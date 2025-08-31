const { exec } = require('child_process');
const os = require('os');

/**
 * Open Google Cloud Console OAuth Settings
 * Automatically opens the OAuth credentials page for verification
 */

function openGoogleConsole() {
  console.log('🔐 Opening Google Cloud Console OAuth Settings...\n');
  
  const consoleUrl = 'https://console.cloud.google.com/apis/credentials';
  
  console.log('📍 Opening URL:', consoleUrl);
  console.log('');
  console.log('🔍 What to verify in Google Cloud Console:');
  console.log('');
  console.log('1. **Find your OAuth 2.0 Client ID:**');
  console.log('   - Look for client ID ending in: ...komtul497r7lg9eacu09n1ghtso6revc.apps.googleusercontent.com');
  console.log('   - Click on it to edit settings');
  console.log('');
  console.log('2. **Verify Authorized Redirect URIs:**');
  console.log('   ✅ Development: http://localhost:5001/api/oauth/google/callback');
  console.log('   ✅ Production: https://floworx-app-git-main-floworxdevelopers-projects.vercel.app/api/oauth/google/callback');
  console.log('   ⚪ Custom Domain: https://app.floworx-iq.com/api/oauth/google/callback (add when ready)');
  console.log('');
  console.log('3. **Check OAuth Consent Screen:**');
  console.log('   - Ensure app is configured for external users');
  console.log('   - Verify required scopes are added:');
  console.log('     • https://www.googleapis.com/auth/gmail.readonly');
  console.log('     • https://www.googleapis.com/auth/gmail.modify');
  console.log('     • https://www.googleapis.com/auth/userinfo.email');
  console.log('     • https://www.googleapis.com/auth/userinfo.profile');
  console.log('');
  console.log('4. **Security Settings:**');
  console.log('   - Ensure "Web application" is selected as application type');
  console.log('   - Verify authorized JavaScript origins if needed');
  console.log('');
  
  // Determine the command based on the operating system
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
      console.log('❌ Unsupported operating system. Please open this URL manually:');
      console.log(consoleUrl);
      return;
  }
  
  // Execute the command to open the browser
  exec(command, (error) => {
    if (error) {
      console.log('❌ Could not open browser automatically. Please open this URL manually:');
      console.log(consoleUrl);
    } else {
      console.log('✅ Browser opened successfully!');
      console.log('');
      console.log('📋 After verifying settings in Google Cloud Console:');
      console.log('   1. Test OAuth flow: npm run dev (in backend directory)');
      console.log('   2. Visit: http://localhost:5001/api/oauth/google');
      console.log('   3. Complete the OAuth flow');
      console.log('   4. Verify tokens are stored correctly');
      console.log('   5. Proceed to production deployment preparation');
    }
  });
}

// Run if called directly
if (require.main === module) {
  openGoogleConsole();
}

module.exports = { openGoogleConsole };
