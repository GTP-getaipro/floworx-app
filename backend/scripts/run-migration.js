#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const { query } = require('../database/unified-connection');

async function runMigration() {
  try {
    console.log('🔄 Starting database migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/001_add_missing_auth_tables.sql');
    const _migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    
    // Define individual statements to execute
    const statements = [
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP WITH TIME ZONE",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name VARCHAR(255)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'",

      `CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      )`,

      `CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        resource VARCHAR(100),
        resource_id UUID,
        ip_address INET,
        user_agent TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    console.log(`📊 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
        await query(statement);
        console.log(`✅ Statement ${i + 1} completed successfully`);
      } catch (error) {
        // Some statements might fail if they already exist (IF NOT EXISTS)
        if (error.message.includes('already exists') ||
            error.message.includes('duplicate key') ||
            error.message.includes('column already exists')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message}`);
        } else {
          console.error(`❌ Statement ${i + 1} failed:`, error.message);
          throw error;
        }
      }
    }
    
    console.log('🎉 Migration completed successfully!');
    
    // Verify the migration by checking if the tables exist
    console.log('🔍 Verifying migration...');
    
    const verificationQueries = [
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('failed_login_attempts', 'account_locked_until', 'two_factor_enabled', 'last_login_at')",
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'email_verification_tokens'",
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'password_reset_tokens'"
    ];
    
    for (const verifyQuery of verificationQueries) {
      const result = await query(verifyQuery);
      console.log(`✅ Verification query result:`, result.rows);
    }
    
    console.log('🎯 Migration verification completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
