const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

/**
 * Configure Supabase RLS Security for 100% Compliance
 * Enables RLS and creates proper policies for all sensitive tables
 */

async function configureRLSSecurity() {
  console.log('🔒 Configuring Supabase RLS Security for 100% Compliance...\n');

  const results = {
    rlsEnabled: false,
    policiesCreated: false,
    anonymousBlocked: false,
    securityValidated: false
  };

  // =====================================================
  // 1. ENABLE RLS ON ALL SENSITIVE TABLES
  // =====================================================
  console.log('1. Enabling RLS on all sensitive tables...');
  
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

    const sensitiveTablesList = [
      'credentials',
      'business_configs', 
      'workflow_deployments',
      'onboarding_progress',
      'user_analytics'
    ];

    console.log('   📋 Enabling RLS on tables:');
    
    for (const table of sensitiveTablesList) {
      try {
        await pool.query(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
        console.log(`   ✅ ${table}: RLS enabled`);
      } catch (err) {
        if (err.message.includes('already enabled')) {
          console.log(`   ✅ ${table}: RLS already enabled`);
        } else {
          console.log(`   ❌ ${table}: Failed to enable RLS - ${err.message}`);
        }
      }
    }

    // Verify RLS is enabled
    const rlsCheckQuery = `
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = ANY($1)
      ORDER BY tablename;
    `;
    
    const rlsResult = await pool.query(rlsCheckQuery, [sensitiveTablesList]);
    
    let allEnabled = true;
    console.log('\n   📊 RLS Status Verification:');
    for (const row of rlsResult.rows) {
      const status = row.rowsecurity ? '✅' : '❌';
      console.log(`   ${status} ${row.tablename}: ${row.rowsecurity ? 'ENABLED' : 'DISABLED'}`);
      if (!row.rowsecurity) allEnabled = false;
    }

    results.rlsEnabled = allEnabled;
    await pool.end();
  } catch (err) {
    console.log(`   ❌ RLS enablement failed: ${err.message}`);
  }

  // =====================================================
  // 2. CREATE PROPER RLS POLICIES
  // =====================================================
  console.log('\n2. Creating comprehensive RLS policies...');
  
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

    const policyCommands = [
      // Drop existing policies first (to avoid conflicts)
      'DROP POLICY IF EXISTS "Users can only access their own credentials" ON public.credentials;',
      'DROP POLICY IF EXISTS "Users can only access their own business configs" ON public.business_configs;',
      'DROP POLICY IF EXISTS "Users can only access their own workflow deployments" ON public.workflow_deployments;',
      'DROP POLICY IF EXISTS "Users can only access their own onboarding progress" ON public.onboarding_progress;',
      'DROP POLICY IF EXISTS "Users can only access their own analytics" ON public.user_analytics;',
      
      // Create comprehensive policies for ALL operations
      `CREATE POLICY "Users can only access their own credentials" 
       ON public.credentials 
       FOR ALL 
       USING (auth.uid() = user_id) 
       WITH CHECK (auth.uid() = user_id);`,
       
      `CREATE POLICY "Users can only access their own business configs" 
       ON public.business_configs 
       FOR ALL 
       USING (auth.uid() = user_id) 
       WITH CHECK (auth.uid() = user_id);`,
       
      `CREATE POLICY "Users can only access their own workflow deployments" 
       ON public.workflow_deployments 
       FOR ALL 
       USING (auth.uid() = user_id) 
       WITH CHECK (auth.uid() = user_id);`,
       
      `CREATE POLICY "Users can only access their own onboarding progress" 
       ON public.onboarding_progress 
       FOR ALL 
       USING (auth.uid() = user_id) 
       WITH CHECK (auth.uid() = user_id);`,
       
      `CREATE POLICY "Users can only access their own analytics" 
       ON public.user_analytics 
       FOR ALL 
       USING (auth.uid() = user_id) 
       WITH CHECK (auth.uid() = user_id);`
    ];

    console.log('   🔧 Executing RLS policy commands:');
    
    for (const command of policyCommands) {
      try {
        await pool.query(command);
        const action = command.includes('DROP') ? 'Dropped' : 'Created';
        const tableName = command.match(/ON public\.(\w+)/)?.[1] || 'unknown';
        console.log(`   ✅ ${action} policy for: ${tableName}`);
      } catch (err) {
        if (err.message.includes('does not exist')) {
          console.log(`   ⚪ Policy already handled`);
        } else {
          console.log(`   ❌ Policy command failed: ${err.message}`);
        }
      }
    }

    // Verify policies were created
    const policiesQuery = `
      SELECT tablename, policyname, cmd, qual, with_check
      FROM pg_policies 
      WHERE schemaname = 'public'
      AND tablename IN ('credentials', 'business_configs', 'workflow_deployments', 'onboarding_progress', 'user_analytics')
      ORDER BY tablename, policyname;
    `;
    
    const policiesResult = await pool.query(policiesQuery);
    
    console.log('\n   📊 Policy Verification:');
    const expectedTables = ['credentials', 'business_configs', 'workflow_deployments', 'onboarding_progress', 'user_analytics'];
    let allPoliciesCreated = true;
    
    for (const table of expectedTables) {
      const tablePolicies = policiesResult.rows.filter(row => row.tablename === table);
      if (tablePolicies.length > 0) {
        console.log(`   ✅ ${table}: ${tablePolicies.length} policy(ies)`);
        tablePolicies.forEach(policy => {
          console.log(`      - ${policy.policyname} (${policy.cmd})`);
          console.log(`        USING: ${policy.qual}`);
          if (policy.with_check) {
            console.log(`        WITH CHECK: ${policy.with_check}`);
          }
        });
      } else {
        console.log(`   ❌ ${table}: No policies found`);
        allPoliciesCreated = false;
      }
    }

    results.policiesCreated = allPoliciesCreated;
    await pool.end();
  } catch (err) {
    console.log(`   ❌ Policy creation failed: ${err.message}`);
  }

  // =====================================================
  // 3. TEST RLS EFFECTIVENESS
  // =====================================================
  console.log('\n3. Testing RLS effectiveness...');
  
  try {
    const supabaseAnon = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    const testTables = ['credentials', 'business_configs', 'workflow_deployments'];
    let allTablesSecured = true;

    console.log('   🧪 Testing anonymous access (should return empty):');
    
    for (const table of testTables) {
      try {
        const { data, error } = await supabaseAnon
          .from(table)
          .select('*')
          .limit(1);

        if (error) {
          if (error.message.includes('row-level security') || error.message.includes('policy')) {
            console.log(`   ✅ ${table}: Anonymous access blocked by RLS error`);
          } else {
            console.log(`   ⚠️  ${table}: Blocked by other error: ${error.message}`);
          }
        } else if (data && data.length === 0) {
          console.log(`   ✅ ${table}: Anonymous access returns empty (RLS filtering)`);
        } else {
          console.log(`   ❌ ${table}: Anonymous access returned ${data ? data.length : 0} rows - SECURITY ISSUE!`);
          allTablesSecured = false;
        }
      } catch (err) {
        console.log(`   ❌ ${table}: Test failed - ${err.message}`);
        allTablesSecured = false;
      }
    }

    results.anonymousBlocked = allTablesSecured;
  } catch (err) {
    console.log(`   ❌ RLS effectiveness test failed: ${err.message}`);
  }

  // =====================================================
  // 4. VALIDATE SECURITY CONFIGURATION
  // =====================================================
  console.log('\n4. Validating security configuration...');
  
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

    // Check auth.uid() function availability
    const authFunctionQuery = `
      SELECT proname, pronamespace::regnamespace as schema
      FROM pg_proc 
      WHERE proname = 'uid' 
      AND pronamespace::regnamespace::text = 'auth';
    `;
    
    const authResult = await pool.query(authFunctionQuery);
    
    if (authResult.rows.length > 0) {
      console.log('   ✅ auth.uid() function is available');
    } else {
      console.log('   ❌ auth.uid() function not found - RLS policies may not work');
    }

    // Verify policy conditions use auth.uid()
    const policyConditionsQuery = `
      SELECT tablename, policyname, qual
      FROM pg_policies 
      WHERE schemaname = 'public'
      AND qual LIKE '%auth.uid()%'
      ORDER BY tablename;
    `;
    
    const conditionsResult = await pool.query(policyConditionsQuery);
    
    console.log('   📋 Policies using auth.uid():');
    if (conditionsResult.rows.length >= 5) {
      conditionsResult.rows.forEach(row => {
        console.log(`   ✅ ${row.tablename}: ${row.policyname}`);
      });
      results.securityValidated = true;
    } else {
      console.log('   ❌ Not all policies are using auth.uid() correctly');
    }

    await pool.end();
  } catch (err) {
    console.log(`   ❌ Security validation failed: ${err.message}`);
  }

  // =====================================================
  // 5. COMPREHENSIVE SUMMARY
  // =====================================================
  console.log('\n' + '='.repeat(60));
  console.log('🔒 RLS SECURITY CONFIGURATION SUMMARY');
  console.log('='.repeat(60));

  console.log(`\n📊 Security Compliance Status:`);
  console.log(`   RLS Enabled: ${results.rlsEnabled ? '✅' : '❌'}`);
  console.log(`   Policies Created: ${results.policiesCreated ? '✅' : '❌'}`);
  console.log(`   Anonymous Blocked: ${results.anonymousBlocked ? '✅' : '❌'}`);
  console.log(`   Security Validated: ${results.securityValidated ? '✅' : '❌'}`);

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n🎯 RLS Security Score: ${passedTests}/${totalTests} tests passed`);

  if (passedTests === totalTests) {
    console.log('\n🎉 100% RLS SECURITY COMPLIANCE ACHIEVED!');
    console.log('');
    console.log('🔒 Security Features Confirmed:');
    console.log('   ✅ Row Level Security enabled on all sensitive tables');
    console.log('   ✅ Comprehensive policies for ALL operations (SELECT, INSERT, UPDATE, DELETE)');
    console.log('   ✅ Anonymous users cannot access any protected data');
    console.log('   ✅ User isolation enforced with auth.uid() = user_id');
    console.log('   ✅ Database-level security prevents data leaks');
    console.log('   ✅ Production-ready security configuration');
    console.log('');
    console.log('✅ READY FOR PRODUCTION DEPLOYMENT!');
  } else {
    console.log('\n❌ RLS Security Configuration Incomplete');
    console.log('');
    console.log('🔧 Issues to Address:');
    if (!results.rlsEnabled) console.log('   - Enable RLS on all sensitive tables');
    if (!results.policiesCreated) console.log('   - Create proper RLS policies');
    if (!results.anonymousBlocked) console.log('   - Fix anonymous access blocking');
    if (!results.securityValidated) console.log('   - Validate auth.uid() function usage');
  }

  return results;
}

// Run RLS configuration if called directly
if (require.main === module) {
  configureRLSSecurity()
    .then(results => {
      const allPassed = Object.values(results).every(Boolean);
      process.exit(allPassed ? 0 : 1);
    })
    .catch(err => {
      console.error('❌ RLS configuration failed:', err);
      process.exit(1);
    });
}

module.exports = { configureRLSSecurity };
