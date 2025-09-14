#!/usr/bin/env node

/**
 * FloWorx Supabase Deployment Verification Script
 * Comprehensive test of Supabase integration after Coolify deployment
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

console.log('🔍 FloWorx Supabase Deployment Verification');
console.log('===========================================\n');

const results = {
  environmentVariables: { passed: 0, total: 0, issues: [] },
  supabaseConnection: { passed: 0, total: 0, issues: [] },
  authentication: { passed: 0, total: 0, issues: [] },
  databaseOperations: { passed: 0, total: 0, issues: [] },
  applicationEndpoints: { passed: 0, total: 0, issues: [] }
};

// Test configuration
const PRODUCTION_URL = 'https://app.floworx-iq.com';
const TEST_EMAIL = `test-${Date.now()}@floworx-verification.com`;
const TEST_PASSWORD = 'TestPassword123!';

async function verifyEnvironmentVariables() {
  );
  console.log('   ===================================');

  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'ENCRYPTION_KEY'
  ];

  results.environmentVariables.total = requiredVars.length;

  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      );
      results.environmentVariables.passed++;
    } else {
      console.log(`   ❌ ${varName}: Missing`);
      results.environmentVariables.issues.push(`${varName} environment variable is missing`);
    }
  });

  // Validate Supabase URL format
  if (process.env.SUPABASE_URL) {
    const urlPattern = /^https:\/\/[a-z0-9]+\.supabase\.co$/;
    if (urlPattern.test(process.env.SUPABASE_URL)) {
      );
    } else {
      );
      results.environmentVariables.issues.push('SUPABASE_URL format validation failed');
    }
  }

  );
}

async function testSupabaseConnection() {
  console.log('2. 🔌 Testing Supabase Connection');
  console.log('   ===============================');

  results.supabaseConnection.total = 4;

  // Test anonymous client creation
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    console.log('   ✅ Anonymous Supabase client created successfully');
    results.supabaseConnection.passed++;

    // Test basic query
    const { data, error } = await supabase
      .from('credentials')
      .select('count')
      .limit(1);

    if (error) {
      console.log(`   ❌ Anonymous client query failed: ${error.message}`);
      results.supabaseConnection.issues.push(`Anonymous query error: ${error.message}`);
    } else {
      console.log('   ✅ Anonymous client can query database');
      results.supabaseConnection.passed++;
    }
  } catch (err) {
    console.log(`   ❌ Anonymous client creation failed: ${err.message}`);
    results.supabaseConnection.issues.push(`Anonymous client error: ${err.message}`);
  }

  // Test service role client
  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    console.log('   ✅ Service role Supabase client created successfully');
    results.supabaseConnection.passed++;

    // Test admin query
    const { data, error } = await supabaseAdmin
      .from('credentials')
      .select('*')
      .limit(1);

    if (error) {
      console.log(`   ❌ Service role client query failed: ${error.message}`);
      results.supabaseConnection.issues.push(`Service role query error: ${error.message}`);
    } else {
      console.log('   ✅ Service role client can query database');
      results.supabaseConnection.passed++;
    }
  } catch (err) {
    console.log(`   ❌ Service role client creation failed: ${err.message}`);
    results.supabaseConnection.issues.push(`Service role client error: ${err.message}`);
  }

  console.log(`   📊 Supabase Connection: ${results.supabaseConnection.passed}/${results.supabaseConnection.total} passed\n`);
}

async function testAuthentication() {
  console.log('3. 🔐 Testing Authentication System');
  console.log('   =================================');

  results.authentication.total = 3;

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Test user registration
    console.log('   🧪 Testing user registration...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (signUpError) {
      console.log(`   ❌ User registration failed: ${signUpError.message}`);
      results.authentication.issues.push(`Registration error: ${signUpError.message}`);
    } else {
      console.log('   ✅ User registration successful');
      results.authentication.passed++;

      // Test user login
      console.log('   🧪 Testing user login...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });

      if (signInError) {
        console.log(`   ❌ User login failed: ${signInError.message}`);
        results.authentication.issues.push(`Login error: ${signInError.message}`);
      } else {
        console.log('   ✅ User login successful');
        results.authentication.passed++;

        // Test token validation
        if (signInData.session && signInData.session.access_token) {
          console.log('   ✅ JWT token generated successfully');
          results.authentication.passed++;
        } else {
          console.log('   ❌ JWT token not generated');
          results.authentication.issues.push('JWT token not generated during login');
        }
      }
    }
  } catch (err) {
    console.log(`   ❌ Authentication test failed: ${err.message}`);
    results.authentication.issues.push(`Authentication error: ${err.message}`);
  }

  console.log(`   📊 Authentication: ${results.authentication.passed}/${results.authentication.total} passed\n`);
}

async function testDatabaseOperations() {
  console.log('4. 🗄️  Testing Database Operations');
  console.log('   ===============================');

  results.databaseOperations.total = 5;

  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test table existence
    console.log('   🧪 Checking required tables...');
    const expectedTables = ['credentials', 'business_configs', 'workflow_deployments', 'onboarding_progress'];

    for (const table of expectedTables) {
      const { data, error } = await supabaseAdmin
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`   ❌ Table '${table}' not accessible: ${error.message}`);
        results.databaseOperations.issues.push(`Table ${table} error: ${error.message}`);
      } else {
        console.log(`   ✅ Table '${table}' accessible`);
        results.databaseOperations.passed++;
      }
    }

    // Test RLS policies
    console.log('   🧪 Testing Row Level Security...');
    const { data: rlsData, error: rlsError } = await supabaseAdmin
      .rpc('check_rls_enabled', { table_name: 'credentials' });

    if (rlsError) {
      console.log(`   ⚠️  Could not verify RLS status: ${rlsError.message}`);
    } else {
      console.log('   ✅ RLS policies are configured');
      results.databaseOperations.passed++;
    }

  } catch (err) {
    console.log(`   ❌ Database operations test failed: ${err.message}`);
    results.databaseOperations.issues.push(`Database error: ${err.message}`);
  }

  console.log(`   📊 Database Operations: ${results.databaseOperations.passed}/${results.databaseOperations.total} passed\n`);
}

async function testApplicationEndpoints() {
  console.log('5. 🌐 Testing Application Endpoints');
  console.log('   =================================');

  results.applicationEndpoints.total = 3;

  // Test application availability
  try {
    console.log(`   🧪 Testing application availability at ${PRODUCTION_URL}...`);
    const response = await axios.get(PRODUCTION_URL, { timeout: 10000 });

    if (response.status === 200) {
      console.log('   ✅ Application is accessible');
      results.applicationEndpoints.passed++;
    } else {
      console.log(`   ❌ Application returned status: ${response.status}`);
      results.applicationEndpoints.issues.push(`Application status: ${response.status}`);
    }
  } catch (err) {
    console.log(`   ❌ Application not accessible: ${err.message}`);
    results.applicationEndpoints.issues.push(`Application access error: ${err.message}`);
  }

  // Test API health endpoint
  try {
    console.log('   🧪 Testing API health endpoint...');
    const healthResponse = await axios.get(`${PRODUCTION_URL}/api/health`, { timeout: 5000 });

    if (healthResponse.status === 200) {
      console.log('   ✅ API health endpoint responding');
      results.applicationEndpoints.passed++;
    } else {
      console.log(`   ❌ API health endpoint status: ${healthResponse.status}`);
      results.applicationEndpoints.issues.push(`API health status: ${healthResponse.status}`);
    }
  } catch (err) {
    console.log(`   ❌ API health endpoint failed: ${err.message}`);
    results.applicationEndpoints.issues.push(`API health error: ${err.message}`);
  }

  // Test registration endpoint
  try {
    console.log('   🧪 Testing registration endpoint...');
    const regResponse = await axios.post(`${PRODUCTION_URL}/api/auth/register`, {
      email: `endpoint-test-${Date.now()}@floworx.com`,
      password: 'TestPassword123!',
      company_name: 'Test Company',
      phone: '+1234567890'
    }, { timeout: 10000 });

    if (regResponse.status === 201) {
      console.log('   ✅ Registration endpoint working');
      results.applicationEndpoints.passed++;
    } else {
      console.log(`   ❌ Registration endpoint status: ${regResponse.status}`);
      results.applicationEndpoints.issues.push(`Registration status: ${regResponse.status}`);
    }
  } catch (err) {
    if (err.response && err.response.status === 409) {
      console.log('   ✅ Registration endpoint working (user already exists)');
      results.applicationEndpoints.passed++;
    } else {
      console.log(`   ❌ Registration endpoint failed: ${err.message}`);
      results.applicationEndpoints.issues.push(`Registration error: ${err.message}`);
    }
  }

  console.log(`   📊 Application Endpoints: ${results.applicationEndpoints.passed}/${results.applicationEndpoints.total} passed\n`);
}

async function generateReport() {
  console.log('📋 SUPABASE DEPLOYMENT VERIFICATION REPORT');
  console.log('==========================================\n');

  const totalPassed = Object.values(results).reduce((sum, category) => sum + category.passed, 0);
  const totalTests = Object.values(results).reduce((sum, category) => sum + category.total, 0);
  const overallPassRate = Math.round((totalPassed / totalTests) * 100);

  console.log(`📊 Overall Results: ${totalPassed}/${totalTests} tests passed (${overallPassRate}%)\n`);

  // Category breakdown
  Object.entries(results).forEach(([category, result]) => {
    const passRate = Math.round((result.passed / result.total) * 100);
    const status = passRate === 100 ? '✅' : passRate >= 75 ? '⚠️' : '❌';

    console.log(`${status} ${category.replace(/([A-Z])/g, ' $1').toUpperCase()}: ${result.passed}/${result.total} (${passRate}%)`);

    if (result.issues.length > 0) {
      result.issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }
  });

  console.log('\n🎯 NEXT STEPS:');
  );
  console.log('If issues persist:');
  );
  console.log('2. Verify Supabase project is active');
  );
  console.log('4. Run: node database/initialize-supabase.js (if database issues)');
}

// Main execution
async function main() {
  try {
    await verifyEnvironmentVariables();
    await testSupabaseConnection();
    await testAuthentication();
    await testDatabaseOperations();
    await testApplicationEndpoints();
    await generateReport();
  } catch (error) {
    console.error('❌ Verification script failed:', error.message);
    process.exit(1);
  }
}

// Run the verification
if (require.main === module) {
  main();
}

module.exports = { main };
