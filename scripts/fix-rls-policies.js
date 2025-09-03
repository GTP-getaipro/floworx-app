#!/usr/bin/env node

/**
 * Fix RLS Policies for Supabase Tables
 * Ensures proper Row Level Security is configured
 */

require('dotenv').config();
const { Pool } = require('pg');

console.log('🔒 FIXING RLS POLICIES');
console.log('======================\n');

async function fixRLSPolicies() {
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
    
    console.log('📋 Current RLS Status:');
    
    // Check current RLS status
    const tables = ['users', 'credentials', 'business_configs', 'workflow_deployments'];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = $1;
      `, [table]);
      
      if (result.rows.length > 0) {
        const rlsEnabled = result.rows[0].relrowsecurity;
        console.log(`   ${table}: ${rlsEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
      }
    }
    
    console.log('\n🔧 Fixing RLS Policies...\n');
    
    // Enable RLS on users table
    console.log('1. Enabling RLS on users table...');
    await client.query('ALTER TABLE users ENABLE ROW LEVEL SECURITY;');
    console.log('   ✅ RLS enabled on users table');
    
    // Create RLS policy for users table
    console.log('2. Creating RLS policy for users table...');
    
    // Drop existing policy if it exists
    try {
      await client.query('DROP POLICY IF EXISTS "Users can view and edit their own profile" ON users;');
    } catch (error) {
      // Policy might not exist, that's okay
    }
    
    // Create new policy
    await client.query(`
      CREATE POLICY "Users can view and edit their own profile" ON users
      FOR ALL USING (auth.uid() = id);
    `);
    console.log('   ✅ RLS policy created for users table');
    
    // Verify other table policies exist
    console.log('3. Verifying other table policies...');
    
    // Check credentials table policy
    try {
      await client.query('DROP POLICY IF EXISTS "Users can manage their own credentials" ON credentials;');
      await client.query(`
        CREATE POLICY "Users can manage their own credentials" ON credentials
        FOR ALL USING (auth.uid() = user_id);
      `);
      console.log('   ✅ Credentials table policy updated');
    } catch (error) {
      console.log('   ⚠️  Credentials policy error:', error.message);
    }
    
    // Check business_configs table policy
    try {
      await client.query('DROP POLICY IF EXISTS "Users can manage their own business config" ON business_configs;');
      await client.query(`
        CREATE POLICY "Users can manage their own business config" ON business_configs
        FOR ALL USING (auth.uid() = user_id);
      `);
      console.log('   ✅ Business configs table policy updated');
    } catch (error) {
      console.log('   ⚠️  Business configs policy error:', error.message);
    }
    
    // Check workflow_deployments table policy
    try {
      await client.query('DROP POLICY IF EXISTS "Users can manage their own workflow deployments" ON workflow_deployments;');
      await client.query(`
        CREATE POLICY "Users can manage their own workflow deployments" ON workflow_deployments
        FOR ALL USING (auth.uid() = user_id);
      `);
      console.log('   ✅ Workflow deployments table policy updated');
    } catch (error) {
      console.log('   ⚠️  Workflow deployments policy error:', error.message);
    }
    
    console.log('\n📋 Final RLS Status:');
    
    // Check final RLS status
    for (const table of tables) {
      const result = await client.query(`
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = $1;
      `, [table]);
      
      if (result.rows.length > 0) {
        const rlsEnabled = result.rows[0].relrowsecurity;
        console.log(`   ${table}: ${rlsEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
      }
    }
    
    // List all policies
    console.log('\n📜 Active RLS Policies:');
    const policiesResult = await client.query(`
      SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);
    
    if (policiesResult.rows.length > 0) {
      policiesResult.rows.forEach(policy => {
        console.log(`   ${policy.tablename}: ${policy.policyname}`);
      });
    } else {
      console.log('   No policies found');
    }
    
    client.release();
    await pool.end();
    
    console.log('\n✅ RLS POLICIES FIXED SUCCESSFULLY!');
    
  } catch (error) {
    console.error('❌ Error fixing RLS policies:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixRLSPolicies().catch(console.error);
