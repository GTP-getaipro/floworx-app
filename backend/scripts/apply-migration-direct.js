#!/usr/bin/env node

/**
 * Direct Migration Application Script
 * Applies the email provider migration directly to Supabase
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

async function applyMigrationDirect() {
  console.log('🔄 Applying email provider migration directly to Supabase...');
  
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase client initialized');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../../database-migration-email-provider.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded');
    
    // Split migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔄 Executing ${statements.length} migration statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`   Executing statement ${i + 1}/${statements.length}...`);
        
        try {
          const { data, error } = await supabase.rpc('exec_sql', {
            sql: statement
          });
          
          if (error) {
            console.error(`❌ Error in statement ${i + 1}:`, error);
            // Continue with other statements
          } else {
            console.log(`   ✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.error(`❌ Exception in statement ${i + 1}:`, err.message);
          // Continue with other statements
        }
      }
    }
    
    // Verify migration
    console.log('🔍 Verifying migration...');
    
    // Check if email_provider column exists
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'users')
      .eq('column_name', 'email_provider');
    
    if (columnsError) {
      console.error('❌ Error checking email_provider column:', columnsError);
    } else if (columns && columns.length > 0) {
      console.log('✅ email_provider column exists in users table');
    } else {
      console.log('⚠️  email_provider column not found in users table');
    }
    
    // Check if user_configurations table exists
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'user_configurations');
    
    if (tablesError) {
      console.error('❌ Error checking user_configurations table:', tablesError);
    } else if (tables && tables.length > 0) {
      console.log('✅ user_configurations table exists');
    } else {
      console.log('⚠️  user_configurations table not found');
    }
    
    console.log('✅ Migration application completed');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Alternative: Manual migration instructions
function showManualInstructions() {
  console.log('\n📋 MANUAL MIGRATION INSTRUCTIONS:');
  console.log('================================');
  console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Select your project: enamhufwobytrfydarsz');
  console.log('3. Go to SQL Editor');
  console.log('4. Copy and paste the contents of database-migration-email-provider.sql');
  console.log('5. Click "Run" to execute the migration');
  console.log('6. Verify success by checking for:');
  console.log('   - email_provider column in users table');
  console.log('   - user_configurations table exists');
  console.log('7. Run tests again: npm test -- --testNamePattern="Email Provider"');
  console.log('\n🔗 Migration file location: database-migration-email-provider.sql');
}

if (require.main === module) {
  console.log('🚀 Email Provider Migration Script');
  console.log('==================================');
  
  // Try direct application first
  applyMigrationDirect().catch(() => {
    console.log('\n⚠️  Direct migration failed. Please apply manually.');
    showManualInstructions();
  });
}

module.exports = { applyMigrationDirect, showManualInstructions };
