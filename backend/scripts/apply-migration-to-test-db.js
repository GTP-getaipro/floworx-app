#!/usr/bin/env node

/**
 * Apply Email Provider Migration to Test Database
 * 
 * This script applies the email provider database migration to the test database
 * to ensure all tests can run properly.
 */

const fs = require('fs');
const path = require('path');
const { databaseOperations } = require('../database/database-operations');

async function applyMigration() {
  console.log('🔄 Applying email provider migration to test database...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', '..', 'database-migration-email-provider.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Migration file not found:', migrationPath);
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded');
    
    // Get database client
    const { type, client } = await databaseOperations.getClient();
    
    if (type === 'REST_API') {
      console.log('⚠️  Using REST API - cannot execute raw SQL migration');
      console.log('📝 Please apply the migration manually in Supabase Dashboard:');
      console.log('   1. Go to Supabase Dashboard > SQL Editor');
      console.log('   2. Run the contents of database-migration-email-provider.sql');
      console.log('   3. Verify the migration was applied successfully');
      return;
    }
    
    // Split migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        await client.query(statement);
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists)`);
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('🎉 Migration applied successfully!');
    
    // Verify the migration
    console.log('🔍 Verifying migration...');
    
    try {
      // Check if email_provider column exists in users table
      const userCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email_provider'
      `);
      
      if (userCheck.rows.length > 0) {
        console.log('✅ email_provider column exists in users table');
      } else {
        console.log('❌ email_provider column NOT found in users table');
      }
      
      // Check if user_configurations table exists
      const configCheck = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_name = 'user_configurations'
      `);
      
      if (configCheck.rows.length > 0) {
        console.log('✅ user_configurations table exists');
      } else {
        console.log('❌ user_configurations table NOT found');
      }
      
    } catch (verifyError) {
      console.error('⚠️  Verification failed:', verifyError.message);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  applyMigration()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { applyMigration };
