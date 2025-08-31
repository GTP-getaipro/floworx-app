const { exec } = require('child_process');
const os = require('os');

/**
 * Open Supabase Dashboard API Keys Page
 * Automatically opens the correct Supabase project API settings page
 */

function openSupabaseDashboard() {
  console.log('🚀 Opening Supabase Dashboard...\n');
  
  // Your Supabase project ID from the database connection
  const projectId = 'enamhufwobytrfydarsz';
  const dashboardUrl = `https://supabase.com/dashboard/project/${projectId}/settings/api`;
  
  console.log('📍 Opening URL:', dashboardUrl);
  console.log('');
  console.log('🔑 What to look for:');
  console.log('   1. Find "Project API keys" section');
  console.log('   2. Copy "anon public" key → SUPABASE_ANON_KEY');
  console.log('   3. Copy "service_role" key → SUPABASE_SERVICE_ROLE_KEY');
  console.log('   4. Verify Project URL: https://enamhufwobytrfydarsz.supabase.co');
  console.log('');
  
  // Determine the command based on the operating system
  let command;
  const platform = os.platform();
  
  switch (platform) {
    case 'darwin': // macOS
      command = `open "${dashboardUrl}"`;
      break;
    case 'win32': // Windows
      command = `start "" "${dashboardUrl}"`;
      break;
    case 'linux': // Linux
      command = `xdg-open "${dashboardUrl}"`;
      break;
    default:
      console.log('❌ Unsupported operating system. Please open this URL manually:');
      console.log(dashboardUrl);
      return;
  }
  
  // Execute the command to open the browser
  exec(command, (error) => {
    if (error) {
      console.log('❌ Could not open browser automatically. Please open this URL manually:');
      console.log(dashboardUrl);
    } else {
      console.log('✅ Browser opened successfully!');
      console.log('');
      console.log('📋 Next steps after getting the keys:');
      console.log('   1. Update .env files with the keys');
      console.log('   2. Run: node scripts/validate-environment.js');
      console.log('   3. Run: node scripts/test-supabase-integration.js');
    }
  });
}

// Run if called directly
if (require.main === module) {
  openSupabaseDashboard();
}

module.exports = { openSupabaseDashboard };
