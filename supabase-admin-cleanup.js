/**
 * Supabase Admin Cleanup Script
 * Uses Supabase Admin API to clean test data
 * 
 * REQUIRES: SUPABASE_SERVICE_ROLE_KEY environment variable
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askConfirmation(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

// Test data patterns
const TEST_EMAIL_PATTERNS = [
  'test-%@example.com',
  'dashboard-%@example.com',
  'final-%@example.com',
  'registration-%@example.com',
  '%@floworx-test.com',
  'testuser%@floworx-test.com'
];

/**
 * Find test users using admin API
 */
async function findTestUsers() {
  try {
    console.log('🔍 Scanning for test users...');
    
    // Get all users from Supabase Auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw new Error(`Failed to list users: ${error.message}`);
    }
    
    // Filter test users
    const testUsers = users.filter(user => {
      const email = user.email?.toLowerCase() || '';
      return (
        email.includes('test-') ||
        email.includes('dashboard-') ||
        email.includes('final-') ||
        email.includes('registration-') ||
        email.includes('@example.com') ||
        email.includes('@floworx-test.com') ||
        email.startsWith('testuser')
      );
    });
    
    console.log(`✅ Found ${testUsers.length} test users out of ${users.length} total users`);
    
    return testUsers;
  } catch (error) {
    console.error('❌ Error finding test users:', error.message);
    return [];
  }
}

/**
 * Find test data in database tables
 */
async function findTestData(testUserIds) {
  const testData = {
    businessConfigs: [],
    workflowDeployments: [],
    onboardingProgress: [],
    oauthCredentials: []
  };
  
  try {
    if (testUserIds.length === 0) return testData;
    
    console.log('🔍 Scanning for related test data...');
    
    // Find business configs for test users
    const { data: businessConfigs } = await supabase
      .from('business_configs')
      .select('*')
      .in('user_id', testUserIds);
    
    if (businessConfigs) {
      testData.businessConfigs = businessConfigs;
      console.log(`   - Business configs: ${businessConfigs.length}`);
    }
    
    // Find workflow deployments for test users
    const { data: workflowDeployments } = await supabase
      .from('workflow_deployments')
      .select('*')
      .in('user_id', testUserIds);
    
    if (workflowDeployments) {
      testData.workflowDeployments = workflowDeployments;
      console.log(`   - Workflow deployments: ${workflowDeployments.length}`);
    }
    
    // Find onboarding progress for test users
    const { data: onboardingProgress } = await supabase
      .from('user_onboarding_progress')
      .select('*')
      .in('user_id', testUserIds);
    
    if (onboardingProgress) {
      testData.onboardingProgress = onboardingProgress;
      console.log(`   - Onboarding progress: ${onboardingProgress.length}`);
    }
    
    // Find OAuth credentials for test users
    const { data: oauthCredentials } = await supabase
      .from('oauth_credentials')
      .select('*')
      .in('user_id', testUserIds);
    
    if (oauthCredentials) {
      testData.oauthCredentials = oauthCredentials;
      console.log(`   - OAuth credentials: ${oauthCredentials.length}`);
    }
    
  } catch (error) {
    console.error('⚠️  Error finding test data:', error.message);
  }
  
  return testData;
}

/**
 * Delete test data from database tables
 */
async function deleteTestData(testUserIds, testData) {
  let deletedCount = 0;
  
  try {
    console.log('🗑️  Deleting test data from database tables...');
    
    // Delete OAuth credentials
    if (testData.oauthCredentials.length > 0) {
      const { error } = await supabase
        .from('oauth_credentials')
        .delete()
        .in('user_id', testUserIds);
      
      if (!error) {
        console.log(`   ✅ Deleted ${testData.oauthCredentials.length} OAuth credentials`);
        deletedCount += testData.oauthCredentials.length;
      } else {
        console.log(`   ⚠️  OAuth credentials deletion error: ${error.message}`);
      }
    }
    
    // Delete onboarding progress
    if (testData.onboardingProgress.length > 0) {
      const { error } = await supabase
        .from('user_onboarding_progress')
        .delete()
        .in('user_id', testUserIds);
      
      if (!error) {
        console.log(`   ✅ Deleted ${testData.onboardingProgress.length} onboarding records`);
        deletedCount += testData.onboardingProgress.length;
      } else {
        console.log(`   ⚠️  Onboarding progress deletion error: ${error.message}`);
      }
    }
    
    // Delete workflow deployments
    if (testData.workflowDeployments.length > 0) {
      const { error } = await supabase
        .from('workflow_deployments')
        .delete()
        .in('user_id', testUserIds);
      
      if (!error) {
        console.log(`   ✅ Deleted ${testData.workflowDeployments.length} workflow deployments`);
        deletedCount += testData.workflowDeployments.length;
      } else {
        console.log(`   ⚠️  Workflow deployments deletion error: ${error.message}`);
      }
    }
    
    // Delete business configs
    if (testData.businessConfigs.length > 0) {
      const { error } = await supabase
        .from('business_configs')
        .delete()
        .in('user_id', testUserIds);
      
      if (!error) {
        console.log(`   ✅ Deleted ${testData.businessConfigs.length} business configs`);
        deletedCount += testData.businessConfigs.length;
      } else {
        console.log(`   ⚠️  Business configs deletion error: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error deleting test data:', error.message);
  }
  
  return deletedCount;
}

/**
 * Delete test users from Supabase Auth
 */
async function deleteTestUsers(testUsers) {
  let deletedUsers = 0;
  
  try {
    console.log('🗑️  Deleting test users from authentication...');
    
    for (const user of testUsers) {
      const { error } = await supabase.auth.admin.deleteUser(user.id);
      
      if (!error) {
        console.log(`   ✅ Deleted user: ${user.email}`);
        deletedUsers++;
      } else {
        console.log(`   ❌ Failed to delete user ${user.email}: ${error.message}`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
  } catch (error) {
    console.error('❌ Error deleting test users:', error.message);
  }
  
  return deletedUsers;
}

/**
 * Main cleanup function
 */
async function performCleanup() {
  try {
    console.log('🧹 SUPABASE ADMIN CLEANUP');
    console.log('=' .repeat(50));
    console.log('⚠️  This will permanently delete test data from Supabase');
    console.log('');
    
    // Find test users
    const testUsers = await findTestUsers();
    
    if (testUsers.length === 0) {
      console.log('✅ No test users found. Database is clean!');
      return;
    }
    
    // Show test users that will be deleted
    console.log('👥 TEST USERS TO BE DELETED:');
    testUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.id})`);
    });
    console.log('');
    
    const testUserIds = testUsers.map(user => user.id);
    
    // Find related test data
    const testData = await findTestData(testUserIds);
    
    const totalRecords = testUsers.length + 
                        testData.businessConfigs.length + 
                        testData.workflowDeployments.length + 
                        testData.onboardingProgress.length + 
                        testData.oauthCredentials.length;
    
    console.log('📊 CLEANUP SUMMARY:');
    console.log(`   - Test users: ${testUsers.length}`);
    console.log(`   - Business configs: ${testData.businessConfigs.length}`);
    console.log(`   - Workflow deployments: ${testData.workflowDeployments.length}`);
    console.log(`   - Onboarding records: ${testData.onboardingProgress.length}`);
    console.log(`   - OAuth credentials: ${testData.oauthCredentials.length}`);
    console.log(`   - Total records: ${totalRecords}`);
    console.log('');
    
    // Ask for confirmation
    const confirmed = await askConfirmation(`❓ Delete ${totalRecords} test records? (y/N): `);
    
    if (!confirmed) {
      console.log('❌ Cleanup cancelled by user');
      return;
    }
    
    console.log('🚀 Starting cleanup...');
    
    // Delete test data first (to maintain referential integrity)
    const deletedData = await deleteTestData(testUserIds, testData);
    
    // Then delete test users
    const deletedUsers = await deleteTestUsers(testUsers);
    
    console.log('');
    console.log('✅ CLEANUP COMPLETED');
    console.log(`   - Users deleted: ${deletedUsers}`);
    console.log(`   - Data records deleted: ${deletedData}`);
    console.log(`   - Total deleted: ${deletedUsers + deletedData}`);
    
  } catch (error) {
    console.error('💥 Cleanup failed:', error.message);
  } finally {
    rl.close();
  }
}

// Run cleanup if called directly
if (require.main === module) {
  performCleanup().catch(console.error);
}

module.exports = { performCleanup };
