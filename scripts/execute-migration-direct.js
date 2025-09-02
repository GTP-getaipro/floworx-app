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

async function executeMigration() {
  console.log('🚀 Starting direct database migration...');
  console.log(`   📍 Database: ${supabaseUrl}`);
  
  try {
    // Step 1: Add role column to users table
    console.log('   🔧 Adding role column to users table...');
    const { error: roleError } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                           WHERE table_name = 'users' AND column_name = 'role') THEN
                ALTER TABLE users ADD COLUMN role VARCHAR(50) DEFAULT 'user';
            END IF;
        END $$;
      `
    });
    
    if (roleError) {
      console.log('   ⚠️  RPC approach failed, trying direct query...');
      // Try direct approach
      const { error: directError } = await supabase
        .from('users')
        .select('role')
        .limit(1);
      
      if (directError && directError.message.includes('column "role" does not exist')) {
        console.log('   ℹ️  Role column confirmed missing, will create via SQL editor');
      }
    } else {
      console.log('   ✅ Role column added successfully');
    }

    // Step 2: Create workflow_executions table
    console.log('   🔧 Creating workflow_executions table...');
    const { error: workflowExecError } = await supabase
      .from('workflow_executions')
      .select('id')
      .limit(1);
    
    if (workflowExecError) {
      console.log('   ℹ️  workflow_executions table does not exist');
    } else {
      console.log('   ✅ workflow_executions table exists');
    }

    // Step 3: Create workflows table
    console.log('   🔧 Creating workflows table...');
    const { error: workflowsError } = await supabase
      .from('workflows')
      .select('id')
      .limit(1);
    
    if (workflowsError) {
      console.log('   ℹ️  workflows table does not exist');
    } else {
      console.log('   ✅ workflows table exists');
    }

    // Step 4: Test basic table creation with a simple approach
    console.log('   🔧 Testing table creation capabilities...');
    
    // Create a simple test table to verify permissions
    const testTableSQL = `
      CREATE TABLE IF NOT EXISTS test_migration_table (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        test_field VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    const { error: testError } = await supabase.rpc('exec_sql', { sql: testTableSQL });
    
    if (testError) {
      console.log('   ❌ Cannot create tables via RPC, manual SQL execution required');
      console.log('   📝 Please execute the migration SQL manually in Supabase SQL Editor');
      
      // Output the SQL that needs to be executed manually
      const migrationPath = path.join(__dirname, '../database/migrations/add-missing-test-tables.sql');
      if (fs.existsSync(migrationPath)) {
        console.log('   📄 Migration SQL file location:', migrationPath);
        console.log('   🔗 Supabase SQL Editor: https://supabase.com/dashboard/project/[your-project]/sql');
      }
    } else {
      console.log('   ✅ Table creation successful, cleaning up test table...');
      await supabase.rpc('exec_sql', { sql: 'DROP TABLE IF EXISTS test_migration_table;' });
    }

    // Step 5: Verify current database state
    console.log('   🔍 Verifying current database state...');
    
    const tablesToCheck = [
      'users',
      'workflow_executions', 
      'workflows',
      'performance_metrics',
      'notifications'
    ];
    
    const tableStatus = {};
    
    for (const table of tablesToCheck) {
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        tableStatus[table] = error ? '❌ Missing' : '✅ Exists';
      } catch (err) {
        tableStatus[table] = '❌ Missing';
      }
    }
    
    console.log('   📊 Database Table Status:');
    Object.entries(tableStatus).forEach(([table, status]) => {
      console.log(`      ${status} ${table}`);
    });
    
    console.log('🎉 Migration analysis completed!');
    
    // Provide next steps
    if (Object.values(tableStatus).some(status => status.includes('❌'))) {
      console.log('\n📝 Next Steps Required:');
      console.log('   1. Open Supabase SQL Editor');
      console.log('   2. Execute the migration SQL manually');
      console.log('   3. Run this script again to verify');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
executeMigration().catch(console.error);
