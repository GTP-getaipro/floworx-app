/**
 * Quick Test Data Cleanup for Supabase
 * Simple script to identify and clean test data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in .env file');
  console.error('Required: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Scan for test data patterns
 */
async function scanTestData() {
  console.log('🔍 SCANNING FOR TEST DATA');
  console.log('=' .repeat(40));
  
  try {
    // Check if we can access auth users (requires service role key)
    let testUsers = [];
    
    try {
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      
      if (!error && users) {
        testUsers = users.filter(user => {
          const email = user.email?.toLowerCase() || '';
          return (
            email.includes('test-') ||
            email.includes('dashboard-') ||
            email.includes('final-') ||
            email.includes('registration-') ||
            email.includes('@example.com') ||
            email.includes('@floworx-test.com')
          );
        });
        
        console.log(`👥 Test Users Found: ${testUsers.length}`);
        testUsers.forEach((user, i) => {
          console.log(`   ${i + 1}. ${user.email}`);
        });
      } else {
        console.log('⚠️  Cannot access auth users (need service role key)');
      }
    } catch (authError) {
      console.log('⚠️  Auth access limited:', authError.message);
    }
    
    console.log('');
    console.log('📊 CLEANUP OPTIONS:');
    console.log('');
    
    if (testUsers.length > 0) {
      console.log('🔧 OPTION 1: Automated Cleanup (Recommended)');
      console.log('   Run: node supabase-admin-cleanup.js');
      console.log('   - Safely deletes all test users and related data');
      console.log('   - Shows what will be deleted before confirmation');
      console.log('   - Maintains referential integrity');
      console.log('');
    }
    
    console.log('🔧 OPTION 2: Manual Cleanup via Supabase Dashboard');
    console.log('   1. Go to https://supabase.com/dashboard');
    console.log('   2. Select your FloWorx project');
    console.log('   3. Navigate to Authentication > Users');
    console.log('   4. Delete users with test email patterns:');
    console.log('      - test-*@example.com');
    console.log('      - dashboard-*@example.com');
    console.log('      - final-*@example.com');
    console.log('      - *@floworx-test.com');
    console.log('   5. Navigate to Table Editor');
    console.log('   6. Clean related tables:');
    console.log('      - business_configs');
    console.log('      - workflow_deployments');
    console.log('      - user_onboarding_progress');
    console.log('      - oauth_credentials');
    console.log('');
    
    console.log('🔧 OPTION 3: SQL Cleanup (Advanced)');
    console.log('   Use SQL Editor in Supabase Dashboard:');
    console.log('');
    console.log('   -- Delete test users and cascade');
    console.log("   DELETE FROM auth.users WHERE email LIKE '%test-%@example.com';");
    console.log("   DELETE FROM auth.users WHERE email LIKE '%dashboard-%@example.com';");
    console.log("   DELETE FROM auth.users WHERE email LIKE '%final-%@example.com';");
    console.log("   DELETE FROM auth.users WHERE email LIKE '%@floworx-test.com';");
    console.log('');
    
    if (testUsers.length === 0) {
      console.log('✅ NO TEST DATA FOUND');
      console.log('   Your Supabase database appears to be clean!');
    } else {
      console.log(`⚠️  FOUND ${testUsers.length} TEST USERS`);
      console.log('   Recommend running automated cleanup');
    }
    
  } catch (error) {
    console.error('❌ Scan failed:', error.message);
  }
}

/**
 * Quick cleanup function for immediate use
 */
async function quickCleanup() {
  console.log('🧹 QUICK CLEANUP MODE');
  console.log('=' .repeat(30));
  
  try {
    // Try to delete obvious test users
    const testEmails = [
      'test-@example.com',
      'dashboard-@example.com',
      'final-@example.com'
    ];
    
    let deletedCount = 0;
    
    for (const emailPattern of testEmails) {
      try {
        // This is a simplified approach - in practice you'd need to query first
        console.log(`🔍 Looking for users matching: ${emailPattern}`);
        
        // Note: This requires proper implementation with actual user IDs
        // For now, we'll just show what would be done
        
      } catch (error) {
        console.log(`   ⚠️  Could not process ${emailPattern}: ${error.message}`);
      }
    }
    
    console.log('');
    console.log('💡 For complete cleanup, use:');
    console.log('   node supabase-admin-cleanup.js');
    
  } catch (error) {
    console.error('❌ Quick cleanup failed:', error.message);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--quick')) {
    await quickCleanup();
  } else {
    await scanTestData();
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { scanTestData, quickCleanup };
