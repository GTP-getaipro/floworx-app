const { createClient } = require('@supabase/supabase-js');
const SupabaseClient = require('../backend/database/supabase-client');
require('dotenv').config();

/**
 * Test Supabase Integration
 * Verifies both direct Supabase client and custom SupabaseClient work correctly
 */

async function testSupabaseIntegration() {
  console.log('🧪 Testing Supabase Integration...\n');

  const results = {
    environmentCheck: false,
    supabaseClientConnection: false,
    customClientConnection: false,
    authTest: false,
    databaseTest: false,
    rlsTest: false
  };

  // =====================================================
  // 1. ENVIRONMENT VARIABLES CHECK
  // =====================================================
  console.log('1. Checking environment variables...');
  
  const requiredVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missingVars = [];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
      console.log(`   ❌ ${varName}: Missing`);
    } else if (process.env[varName].includes('your_')) {
      missingVars.push(varName);
      console.log(`   ❌ ${varName}: Still has placeholder value`);
    } else {
      console.log(`   ✅ ${varName}: Configured`);
    }
  }

  if (missingVars.length > 0) {
    console.log(`\n❌ Missing environment variables: ${missingVars.join(', ')}`);
    console.log('📖 See: scripts/get-supabase-keys-guide.md\n');
    return results;
  }

  results.environmentCheck = true;
  console.log('   ✅ All environment variables configured\n');

  // =====================================================
  // 2. SUPABASE CLIENT CONNECTION TEST
  // =====================================================
  console.log('2. Testing Supabase client connection...');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Test basic connection
    const { data, error } = await supabase
      .from('credentials')
      .select('count')
      .limit(1);

    if (error) {
      console.log(`   ❌ Supabase client error: ${error.message}`);
    } else {
      console.log('   ✅ Supabase client connection successful');
      results.supabaseClientConnection = true;
    }
  } catch (err) {
    console.log(`   ❌ Supabase client connection failed: ${err.message}`);
  }

  // =====================================================
  // 3. CUSTOM SUPABASE CLIENT TEST
  // =====================================================
  console.log('\n3. Testing custom SupabaseClient...');
  
  try {
    const customClient = new SupabaseClient();
    
    // Test database connection through custom client
    const testQuery = await customClient.pool.query('SELECT NOW() as current_time');
    console.log('   ✅ Custom SupabaseClient connection successful');
    console.log(`   📅 Database time: ${testQuery.rows[0].current_time}`);
    results.customClientConnection = true;
  } catch (err) {
    console.log(`   ❌ Custom SupabaseClient failed: ${err.message}`);
  }

  // =====================================================
  // 4. AUTH INTEGRATION TEST
  // =====================================================
  console.log('\n4. Testing Supabase Auth integration...');
  
  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test auth admin functions
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.log(`   ❌ Auth test error: ${error.message}`);
    } else {
      console.log(`   ✅ Auth integration working`);
      console.log(`   👥 Total users in system: ${users.users.length}`);
      results.authTest = true;
    }
  } catch (err) {
    console.log(`   ❌ Auth integration failed: ${err.message}`);
  }

  // =====================================================
  // 5. DATABASE SCHEMA TEST
  // =====================================================
  console.log('\n5. Testing database schema...');
  
  try {
    const customClient = new SupabaseClient();
    
    // Check if all required tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('credentials', 'business_configs', 'workflow_deployments', 'onboarding_progress', 'user_analytics')
      ORDER BY table_name
    `;
    
    const tablesResult = await customClient.pool.query(tablesQuery);
    const expectedTables = ['credentials', 'business_configs', 'workflow_deployments', 'onboarding_progress', 'user_analytics'];
    const existingTables = tablesResult.rows.map(row => row.table_name);
    
    if (existingTables.length === expectedTables.length) {
      console.log('   ✅ All required tables exist:');
      existingTables.forEach(table => console.log(`      - ${table}`));
      results.databaseTest = true;
    } else {
      const missingTables = expectedTables.filter(table => !existingTables.includes(table));
      console.log(`   ❌ Missing tables: ${missingTables.join(', ')}`);
      console.log('   🔧 Run: node database/initialize-supabase.js');
    }
  } catch (err) {
    console.log(`   ❌ Database schema test failed: ${err.message}`);
  }

  // =====================================================
  // 6. ROW LEVEL SECURITY TEST
  // =====================================================
  console.log('\n6. Testing Row Level Security (RLS)...');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Test RLS is enabled on credentials table
    const { data, error } = await supabase
      .from('credentials')
      .select('*')
      .limit(1);

    // This should fail with RLS error since we're not authenticated
    if (error && error.message.includes('row-level security')) {
      console.log('   ✅ Row Level Security is properly configured');
      console.log('   🔒 Anonymous access correctly blocked');
      results.rlsTest = true;
    } else if (error) {
      console.log(`   ⚠️  RLS test inconclusive: ${error.message}`);
    } else {
      console.log('   ⚠️  RLS may not be properly configured (anonymous access allowed)');
    }
  } catch (err) {
    console.log(`   ❌ RLS test failed: ${err.message}`);
  }

  // =====================================================
  // 7. SUMMARY
  // =====================================================
  console.log('\n📊 Integration Test Summary:');
  console.log(`   Environment Check: ${results.environmentCheck ? '✅' : '❌'}`);
  console.log(`   Supabase Client: ${results.supabaseClientConnection ? '✅' : '❌'}`);
  console.log(`   Custom Client: ${results.customClientConnection ? '✅' : '❌'}`);
  console.log(`   Auth Integration: ${results.authTest ? '✅' : '❌'}`);
  console.log(`   Database Schema: ${results.databaseTest ? '✅' : '❌'}`);
  console.log(`   Row Level Security: ${results.rlsTest ? '✅' : '❌'}`);

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n🎯 Overall Score: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('🎉 All Supabase integration tests passed! Ready for production.');
  } else if (passedTests >= 4) {
    console.log('✅ Core functionality working. Address remaining issues before production.');
  } else {
    console.log('❌ Critical issues found. Fix these before proceeding.');
  }

  // =====================================================
  // 8. NEXT STEPS
  // =====================================================
  console.log('\n📋 Next Steps:');
  
  if (!results.environmentCheck) {
    console.log('   1. ⚠️  Get Supabase keys from dashboard (see scripts/get-supabase-keys-guide.md)');
  }
  
  if (!results.databaseTest) {
    console.log('   2. ⚠️  Initialize database schema: node database/initialize-supabase.js');
  }
  
  if (results.environmentCheck && results.customClientConnection) {
    console.log('   3. ✅ Configure email service (next task)');
    console.log('   4. ✅ Verify Google OAuth settings');
    console.log('   5. ✅ Deploy to production');
  }

  return results;
}

// Run test if called directly
if (require.main === module) {
  testSupabaseIntegration()
    .then(results => {
      const allPassed = Object.values(results).every(Boolean);
      process.exit(allPassed ? 0 : 1);
    })
    .catch(err => {
      console.error('❌ Test execution failed:', err);
      process.exit(1);
    });
}

module.exports = { testSupabaseIntegration };
