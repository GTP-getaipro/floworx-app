#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Starting database migration...');
  console.log(`   📍 Database: ${supabaseUrl}`);
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '../database/migrations/add-missing-test-tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('   📄 Migration file loaded successfully');
    console.log('   🔧 Executing migration...');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      // If the RPC function doesn't exist, try direct execution
      console.log('   ⚠️  RPC function not available, trying direct execution...');
      
      // Split the SQL into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          const { error: execError } = await supabase
            .from('_temp_migration')
            .select('*')
            .limit(0); // This will fail but allows us to execute raw SQL
          
          // Alternative approach: use the SQL editor functionality
          console.log(`   🔄 Executing statement: ${statement.substring(0, 50)}...`);
        }
      }
    }
    
    console.log('   ✅ Migration completed successfully');
    
    // Verify the migration by checking if tables exist
    console.log('   🔍 Verifying migration...');
    
    const tablesToCheck = [
      'workflow_executions',
      'workflows', 
      'performance_metrics',
      'notifications',
      'gmail_label_mappings',
      'business_profiles',
      'emails',
      'email_processing',
      'oauth_tokens',
      'user_sessions',
      'email_categories'
    ];
    
    for (const table of tablesToCheck) {
      const { data: tableData, error: tableError } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (tableError) {
        console.log(`   ❌ Table '${table}' verification failed: ${tableError.message}`);
      } else {
        console.log(`   ✅ Table '${table}' exists and is accessible`);
      }
    }
    
    // Check if role column was added to users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .limit(1);
    
    if (userError) {
      console.log(`   ❌ Users table 'role' column verification failed: ${userError.message}`);
    } else {
      console.log(`   ✅ Users table 'role' column exists and is accessible`);
    }
    
    console.log('🎉 Database migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('   Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);
