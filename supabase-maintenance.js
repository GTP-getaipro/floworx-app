/**
 * Supabase Maintenance Script
 * Regular maintenance tasks for FloWorx Supabase database
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Database health check and statistics
 */
async function databaseHealthCheck() {
  console.log('🏥 DATABASE HEALTH CHECK');
  console.log('=' .repeat(40));
  
  try {
    // Check authentication users
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.log('❌ Auth check failed:', authError.message);
    } else {
      console.log(`👥 Total Users: ${users.length}`);
      
      // Categorize users
      const realUsers = users.filter(user => {
        const email = user.email?.toLowerCase() || '';
        return !email.includes('test-') && 
               !email.includes('@example.com') && 
               !email.includes('@floworx-test.com');
      });
      
      const testUsers = users.filter(user => {
        const email = user.email?.toLowerCase() || '';
        return email.includes('test-') || 
               email.includes('@example.com') || 
               email.includes('@floworx-test.com');
      });
      
      console.log(`   - Real users: ${realUsers.length}`);
      console.log(`   - Test users: ${testUsers.length}`);
      
      if (testUsers.length > 0) {
        console.log('⚠️  Test users found:');
        testUsers.forEach(user => {
          console.log(`     - ${user.email}`);
        });
      }
    }
    
    // Check database tables
    console.log('');
    console.log('📊 TABLE STATISTICS:');
    
    const tables = [
      'business_configs',
      'workflow_deployments', 
      'user_onboarding_progress',
      'oauth_credentials'
    ];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`   - ${table}: Error (${error.message})`);
        } else {
          console.log(`   - ${table}: ${count || 0} records`);
        }
      } catch (tableError) {
        console.log(`   - ${table}: Not accessible`);
      }
    }
    
    console.log('');
    console.log('✅ Health check completed');
    
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
  }
}

/**
 * Clean up expired or orphaned data
 */
async function cleanupExpiredData() {
  console.log('🧹 CLEANING EXPIRED DATA');
  console.log('=' .repeat(30));
  
  try {
    let cleanedCount = 0;
    
    // Clean up expired OAuth tokens (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: expiredTokens, error: tokenError } = await supabase
      .from('oauth_credentials')
      .delete()
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select();
    
    if (!tokenError && expiredTokens) {
      console.log(`🗑️  Cleaned ${expiredTokens.length} expired OAuth tokens`);
      cleanedCount += expiredTokens.length;
    }
    
    // Clean up incomplete onboarding (older than 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { data: incompleteOnboarding, error: onboardingError } = await supabase
      .from('user_onboarding_progress')
      .delete()
      .lt('created_at', sevenDaysAgo.toISOString())
      .eq('workflow_deployed', false)
      .select();
    
    if (!onboardingError && incompleteOnboarding) {
      console.log(`🗑️  Cleaned ${incompleteOnboarding.length} incomplete onboarding records`);
      cleanedCount += incompleteOnboarding.length;
    }
    
    console.log(`✅ Cleanup completed: ${cleanedCount} records cleaned`);
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

/**
 * Generate database report
 */
async function generateReport() {
  console.log('📋 DATABASE REPORT');
  console.log('=' .repeat(25));
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log('');
  
  await databaseHealthCheck();
  console.log('');
  await cleanupExpiredData();
  
  console.log('');
  console.log('🔧 MAINTENANCE RECOMMENDATIONS:');
  console.log('   - Run this script weekly for optimal performance');
  console.log('   - Monitor test user accumulation');
  console.log('   - Clean expired tokens regularly');
  console.log('   - Review incomplete onboarding flows');
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--health')) {
    await databaseHealthCheck();
  } else if (args.includes('--cleanup')) {
    await cleanupExpiredData();
  } else if (args.includes('--report')) {
    await generateReport();
  } else {
    console.log('🛠️  SUPABASE MAINTENANCE TOOLS');
    console.log('');
    console.log('Usage:');
    console.log('  node supabase-maintenance.js --health   # Health check');
    console.log('  node supabase-maintenance.js --cleanup  # Clean expired data');
    console.log('  node supabase-maintenance.js --report   # Full report');
    console.log('');
    console.log('Running health check by default...');
    console.log('');
    await databaseHealthCheck();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  databaseHealthCheck,
  cleanupExpiredData,
  generateReport
};
