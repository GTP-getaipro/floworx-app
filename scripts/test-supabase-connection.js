#!/usr/bin/env node

/**
 * Supabase Connection Diagnostic Tool
 * Tests all aspects of Supabase integration
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');

console.log('🔍 SUPABASE CONNECTION DIAGNOSTIC');
console.log('=================================\n');

// Environment variables check
console.log('📋 Environment Variables:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing');
console.log('DB_HOST:', process.env.DB_HOST ? '✅ Set' : '❌ Missing');
console.log('DB_PORT:', process.env.DB_PORT ? '✅ Set' : '❌ Missing');
console.log('DB_USER:', process.env.DB_USER ? '✅ Set' : '❌ Missing');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '✅ Set' : '❌ Missing');
console.log('DB_NAME:', process.env.DB_NAME ? '✅ Set' : '❌ Missing');
console.log('');

async function testSupabaseClient() {
  console.log('🔌 Testing Supabase Client Connection...');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.log('❌ Supabase Client Error:', error.message);
      return false;
    }

    console.log('✅ Supabase Client Connection: SUCCESS');
    return true;
  } catch (error) {
    console.log('❌ Supabase Client Exception:', error.message);
    return false;
  }
}

async function testServiceRoleClient() {
  console.log('🔑 Testing Service Role Client...');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test service role access
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Service Role Error:', error.message);
      return false;
    }

    console.log('✅ Service Role Client: SUCCESS');
    return true;
  } catch (error) {
    console.log('❌ Service Role Exception:', error.message);
    return false;
  }
}

async function testDirectDatabaseConnection() {
  console.log('🗄️  Testing Direct Database Connection...');
  
  try {
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as current_time');
    
    console.log('✅ Direct Database Connection: SUCCESS');
    console.log('   Current Time:', result.rows[0].current_time);
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.log('❌ Direct Database Error:', error.message);
    return false;
  }
}

async function testTableStructure() {
  console.log('📊 Testing Table Structure...');
  
  try {
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    
    // Check if required tables exist
    const tables = ['users', 'credentials', 'business_configs', 'workflow_deployments'];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      const exists = result.rows[0].exists;
      console.log(`   Table '${table}':`, exists ? '✅ EXISTS' : '❌ MISSING');
    }
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.log('❌ Table Structure Error:', error.message);
    return false;
  }
}

async function testRLSPolicies() {
  console.log('🔒 Testing RLS Policies...');
  
  try {
    const pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    
    // Check RLS status for each table
    const tables = ['users', 'credentials', 'business_configs', 'workflow_deployments'];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = $1;
      `, [table]);
      
      if (result.rows.length > 0) {
        const rlsEnabled = result.rows[0].relrowsecurity;
        console.log(`   RLS on '${table}':`, rlsEnabled ? '✅ ENABLED' : '⚠️  DISABLED');
      } else {
        console.log(`   Table '${table}':`, '❌ NOT FOUND');
      }
    }
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.log('❌ RLS Policy Error:', error.message);
    return false;
  }
}

async function runDiagnostics() {
  console.log('Starting comprehensive Supabase diagnostics...\n');
  
  const results = {
    supabaseClient: await testSupabaseClient(),
    serviceRole: await testServiceRoleClient(),
    directDatabase: await testDirectDatabaseConnection(),
    tableStructure: await testTableStructure(),
    rlsPolicies: await testRLSPolicies()
  };
  
  console.log('\n📊 DIAGNOSTIC SUMMARY:');
  console.log('======================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${test}:`, passed ? '✅ PASS' : '❌ FAIL');
  });
  
  const allPassed = Object.values(results).every(result => result);
  console.log('\nOverall Status:', allPassed ? '✅ ALL TESTS PASSED' : '❌ ISSUES DETECTED');
  
  if (!allPassed) {
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    if (!results.supabaseClient) console.log('- Check SUPABASE_URL and SUPABASE_ANON_KEY');
    if (!results.serviceRole) console.log('- Check SUPABASE_SERVICE_ROLE_KEY');
    if (!results.directDatabase) console.log('- Check database connection parameters');
    if (!results.tableStructure) console.log('- Run database migrations');
    if (!results.rlsPolicies) console.log('- Configure RLS policies');
  }
}

// Run diagnostics
runDiagnostics().catch(console.error);
