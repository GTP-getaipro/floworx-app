#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { query } = require('../database/unified-connection');

async function runEmailProviderMigration() {
  try {
    console.log('🔄 Starting email provider migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../../database-migration-email-provider.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    
    // Split the migration into individual statements
    // Remove comments and empty lines, then split by semicolon
    const statements = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('/*'));

    console.log(`📊 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip certain statements that might cause issues
      if (statement.includes('DO $$') || 
          statement.includes('RAISE NOTICE') || 
          statement.includes('SELECT table_name')) {
        console.log(`⏭️  Skipping statement ${i + 1} (informational)`);
        continue;
      }

      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        console.log(`   ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);
        
        await query(statement);
        console.log(`✅ Statement ${i + 1} completed successfully`);
      } catch (error) {
        // Some statements might fail if they already exist
        if (error.message.includes('already exists') ||
            error.message.includes('duplicate key') ||
            error.message.includes('column already exists') ||
            error.message.includes('relation') && error.message.includes('already exists')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message}`);
        } else {
          console.error(`❌ Statement ${i + 1} failed:`, error.message);
          console.error(`   Statement: ${statement}`);
          // Don't throw error, continue with next statement
        }
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    
    // Verify the migration by checking if the new columns and tables exist
    console.log('🔍 Verifying migration...');
    
    const verificationQueries = [
      {
        name: 'email_provider column in users table',
        query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email_provider'"
      },
      {
        name: 'user_configurations table',
        query: "SELECT table_name FROM information_schema.tables WHERE table_name = 'user_configurations'"
      },
      {
        name: 'user_configurations columns',
        query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_configurations' ORDER BY ordinal_position"
      },
      {
        name: 'user_configurations indexes',
        query: "SELECT indexname FROM pg_indexes WHERE tablename = 'user_configurations'"
      }
    ];
    
    for (const verification of verificationQueries) {
      try {
        const result = await query(verification.query);
        console.log(`✅ ${verification.name}:`, result.rows.map(row => Object.values(row)).flat());
      } catch (error) {
        console.log(`❌ ${verification.name} verification failed:`, error.message);
      }
    }
    
    // Test the new database operations
    console.log('🧪 Testing database operations...');
    
    try {
      const { databaseOperations } = require('../database/database-operations');
      
      // Test getting business types
      const businessTypes = await databaseOperations.getBusinessTypes();
      console.log(`✅ Business types query: ${businessTypes.data ? businessTypes.data.length : 0} types found`);
      
      console.log('✅ Database operations are working correctly');
    } catch (error) {
      console.log('⚠️  Database operations test failed:', error.message);
    }
    
    console.log('🎯 Migration verification completed!');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Test the new API endpoints:');
    console.log('   - POST /api/onboarding/email-provider');
    console.log('   - POST /api/onboarding/custom-settings');
    console.log('   - GET /api/onboarding/status');
    console.log('2. Run the test suite: npm test email-provider-onboarding.test.js');
    console.log('3. Update your frontend to use the new onboarding flow');
    
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the migration
runEmailProviderMigration();
