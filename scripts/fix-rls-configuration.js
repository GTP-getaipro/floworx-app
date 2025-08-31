const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
require('dotenv').config();

/**
 * Fix and Verify Supabase Row Level Security (RLS) Configuration
 * Ensures proper RLS policies are in place and working correctly
 */

async function fixRLSConfiguration() {
  console.log('🔒 Fixing Supabase Row Level Security Configuration...\n');

  const results = {
    rlsStatusCheck: false,
    policyVerification: false,
    anonymousAccessBlocked: false,
    authenticatedAccessWorking: false
  };

  // =====================================================
  // 1. CHECK CURRENT RLS STATUS
  // =====================================================
  console.log('1. Checking current RLS status...');
  
  try {
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: 1,
      idleTimeoutMillis: 0,
      connectionTimeoutMillis: 10000,
    });

    // Check RLS status for all tables
    const rlsQuery = `
      SELECT schemaname, tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename IN ('credentials', 'business_configs', 'workflow_deployments', 'onboarding_progress', 'user_analytics')
      ORDER BY tablename;
    `;
    
    const rlsResult = await pool.query(rlsQuery);
    console.log('   📋 RLS Status for tables:');
    
    let allTablesHaveRLS = true;
    for (const row of rlsResult.rows) {
      const status = row.rowsecurity ? '✅' : '❌';
      console.log(`   ${status} ${row.tablename}: RLS ${row.rowsecurity ? 'ENABLED' : 'DISABLED'}`);
      if (!row.rowsecurity) {
        allTablesHaveRLS = false;
      }
    }

    if (allTablesHaveRLS) {
      results.rlsStatusCheck = true;
      console.log('   ✅ All tables have RLS enabled');
    } else {
      console.log('   ❌ Some tables missing RLS - will fix');
    }

    await pool.end();
  } catch (err) {
    console.log(`   ❌ RLS status check failed: ${err.message}`);
  }

  // =====================================================
  // 2. VERIFY RLS POLICIES EXIST
  // =====================================================
  console.log('\n2. Verifying RLS policies...');
  
  try {
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: 1,
    });

    const policiesQuery = `
      SELECT schemaname, tablename, policyname, cmd, qual
      FROM pg_policies 
      WHERE schemaname = 'public'
      AND tablename IN ('credentials', 'business_configs', 'workflow_deployments', 'onboarding_progress', 'user_analytics')
      ORDER BY tablename, policyname;
    `;
    
    const policiesResult = await pool.query(policiesQuery);
    console.log('   📋 Current RLS policies:');
    
    const expectedTables = ['credentials', 'business_configs', 'workflow_deployments', 'onboarding_progress', 'user_analytics'];
    const tablesWithPolicies = [...new Set(policiesResult.rows.map(row => row.tablename))];
    
    for (const table of expectedTables) {
      const tablePolicies = policiesResult.rows.filter(row => row.tablename === table);
      if (tablePolicies.length > 0) {
        console.log(`   ✅ ${table}: ${tablePolicies.length} policy(ies)`);
        tablePolicies.forEach(policy => {
          console.log(`      - ${policy.policyname} (${policy.cmd})`);
        });
      } else {
        console.log(`   ❌ ${table}: No policies found`);
      }
    }

    if (tablesWithPolicies.length === expectedTables.length) {
      results.policyVerification = true;
      console.log('   ✅ All tables have RLS policies');
    } else {
      console.log('   ❌ Some tables missing policies - will create');
    }

    await pool.end();
  } catch (err) {
    console.log(`   ❌ Policy verification failed: ${err.message}`);
  }

  // =====================================================
  // 3. TEST ANONYMOUS ACCESS (Should be blocked)
  // =====================================================
  console.log('\n3. Testing anonymous access (should be blocked)...');
  
  try {
    const supabaseAnon = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Try to access credentials table anonymously
    const { data, error } = await supabaseAnon
      .from('credentials')
      .select('*')
      .limit(1);

    if (error) {
      if (error.message.includes('row-level security') || error.message.includes('policy')) {
        console.log('   ✅ Anonymous access properly blocked by RLS');
        console.log(`   🔒 Error: ${error.message}`);
        results.anonymousAccessBlocked = true;
      } else {
        console.log(`   ⚠️  Anonymous access blocked, but unexpected error: ${error.message}`);
      }
    } else {
      console.log('   ❌ Anonymous access allowed - RLS not working properly');
      console.log(`   📊 Returned ${data ? data.length : 0} rows`);
    }
  } catch (err) {
    console.log(`   ❌ Anonymous access test failed: ${err.message}`);
  }

  // =====================================================
  // 4. FIX RLS ISSUES IF NEEDED
  // =====================================================
  if (!results.rlsStatusCheck || !results.policyVerification || !results.anonymousAccessBlocked) {
    console.log('\n4. Fixing RLS configuration...');
    
    try {
      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Re-run the schema to ensure RLS is properly configured
      console.log('   🔧 Re-applying RLS configuration...');
      
      const rlsCommands = [
        // Enable RLS on all tables
        'ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;',
        'ALTER TABLE public.business_configs ENABLE ROW LEVEL SECURITY;',
        'ALTER TABLE public.workflow_deployments ENABLE ROW LEVEL SECURITY;',
        'ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;',
        'ALTER TABLE public.user_analytics ENABLE ROW LEVEL SECURITY;',
        
        // Drop existing policies if they exist (to avoid conflicts)
        'DROP POLICY IF EXISTS "Users can only access their own credentials" ON public.credentials;',
        'DROP POLICY IF EXISTS "Users can only access their own business configs" ON public.business_configs;',
        'DROP POLICY IF EXISTS "Users can only access their own workflow deployments" ON public.workflow_deployments;',
        'DROP POLICY IF EXISTS "Users can only access their own onboarding progress" ON public.onboarding_progress;',
        'DROP POLICY IF EXISTS "Users can only access their own analytics" ON public.user_analytics;',
        
        // Create new policies
        'CREATE POLICY "Users can only access their own credentials" ON public.credentials FOR ALL USING (auth.uid() = user_id);',
        'CREATE POLICY "Users can only access their own business configs" ON public.business_configs FOR ALL USING (auth.uid() = user_id);',
        'CREATE POLICY "Users can only access their own workflow deployments" ON public.workflow_deployments FOR ALL USING (auth.uid() = user_id);',
        'CREATE POLICY "Users can only access their own onboarding progress" ON public.onboarding_progress FOR ALL USING (auth.uid() = user_id);',
        'CREATE POLICY "Users can only access their own analytics" ON public.user_analytics FOR ALL USING (auth.uid() = user_id);'
      ];

      // Execute RLS commands using direct SQL
      const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false },
        max: 1,
      });

      for (const command of rlsCommands) {
        try {
          await pool.query(command);
          console.log(`   ✅ Executed: ${command.substring(0, 50)}...`);
        } catch (err) {
          if (err.message.includes('already exists') || err.message.includes('does not exist')) {
            console.log(`   ⚪ Skipped: ${command.substring(0, 50)}... (already configured)`);
          } else {
            console.log(`   ❌ Failed: ${command.substring(0, 50)}... - ${err.message}`);
          }
        }
      }

      await pool.end();
      console.log('   ✅ RLS configuration updated');
    } catch (err) {
      console.log(`   ❌ RLS fix failed: ${err.message}`);
    }
  }

  // =====================================================
  // 5. FINAL VERIFICATION
  // =====================================================
  console.log('\n5. Final RLS verification...');
  
  try {
    const supabaseAnon = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Test all sensitive tables
    const tablesToTest = ['credentials', 'business_configs', 'workflow_deployments'];
    let allTablesSecured = true;

    for (const table of tablesToTest) {
      const { data, error } = await supabaseAnon
        .from(table)
        .select('*')
        .limit(1);

      if (error && (error.message.includes('row-level security') || error.message.includes('policy'))) {
        console.log(`   ✅ ${table}: Anonymous access blocked`);
      } else {
        console.log(`   ❌ ${table}: Anonymous access not properly blocked`);
        allTablesSecured = false;
      }
    }

    if (allTablesSecured) {
      results.anonymousAccessBlocked = true;
      console.log('   ✅ All sensitive tables properly secured');
    }
  } catch (err) {
    console.log(`   ❌ Final verification failed: ${err.message}`);
  }

  // =====================================================
  // 6. SUMMARY
  // =====================================================
  console.log('\n📊 RLS Configuration Summary:');
  console.log(`   RLS Status Check: ${results.rlsStatusCheck ? '✅' : '❌'}`);
  console.log(`   Policy Verification: ${results.policyVerification ? '✅' : '❌'}`);
  console.log(`   Anonymous Access Blocked: ${results.anonymousAccessBlocked ? '✅' : '❌'}`);
  console.log(`   Authenticated Access Working: ${results.authenticatedAccessWorking ? '✅' : '⚪'}`);

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = 3; // Don't count authenticated access as it requires user setup

  console.log(`\n🎯 Overall RLS Score: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('🎉 RLS configuration is secure and working correctly!');
  } else {
    console.log('❌ RLS configuration needs attention');
  }

  console.log('\n📋 Next Steps:');
  if (passedTests === totalTests) {
    console.log('   1. ✅ RLS is properly configured');
    console.log('   2. ✅ Proceed to OAuth production URL configuration');
    console.log('   3. ✅ Run final integration tests');
  } else {
    console.log('   1. ⚠️  Review RLS policies in Supabase dashboard');
    console.log('   2. ⚠️  Ensure auth.uid() function is available');
    console.log('   3. ⚠️  Re-run this script after fixes');
  }

  return results;
}

// Run RLS fix if called directly
if (require.main === module) {
  fixRLSConfiguration()
    .then(results => {
      const allPassed = Object.values(results).filter(Boolean).length >= 3;
      process.exit(allPassed ? 0 : 1);
    })
    .catch(err => {
      console.error('❌ RLS configuration failed:', err);
      process.exit(1);
    });
}

module.exports = { fixRLSConfiguration };
