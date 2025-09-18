#!/usr/bin/env node

/**
 * Direct Database Migration Runner
 * 
 * Runs the email verification migration directly using PostgreSQL client
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
function loadEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    envContent.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key] = value;
        }
      }
    });
  } catch (error) {
    console.error('Warning: Could not load .env file:', error.message);
  }
}

async function runMigrationDirectly() {
  try {
    loadEnvFile();

    console.log('🔄 Running migration step by step...');

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('✅ Connected to database');

    // Step 1: Add verification_token column
    console.log('🔄 Step 1: Adding verification_token column...');
    try {
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(500)');
      console.log('✅ verification_token column added');
    } catch (error) {
      console.log('⚠️  verification_token column might already exist:', error.message);
    }

    // Step 2: Add verification_token_expires_at column
    console.log('🔄 Step 2: Adding verification_token_expires_at column...');
    try {
      await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires_at TIMESTAMP WITH TIME ZONE');
      console.log('✅ verification_token_expires_at column added');
    } catch (error) {
      console.log('⚠️  verification_token_expires_at column might already exist:', error.message);
    }

    // Step 3: Update existing users
    console.log('🔄 Step 3: Updating existing users...');
    const updateResult = await client.query('UPDATE users SET email_verified = false WHERE email_verified IS NULL');
    console.log('✅ Updated ' + updateResult.rowCount + ' users');

    // Step 4: Set default for email_verified
    console.log('🔄 Step 4: Setting default for email_verified...');
    await client.query('ALTER TABLE users ALTER COLUMN email_verified SET DEFAULT false');
    console.log('✅ Default set for email_verified');

    // Step 5: Make email_verified NOT NULL
    console.log('🔄 Step 5: Making email_verified NOT NULL...');
    try {
      await client.query('ALTER TABLE users ALTER COLUMN email_verified SET NOT NULL');
      console.log('✅ email_verified set to NOT NULL');
    } catch (error) {
      console.log('⚠️  email_verified might already be NOT NULL:', error.message);
    }

    // Step 6: Add indexes
    console.log('🔄 Step 6: Adding indexes...');

    await client.query('CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(verification_token) WHERE verification_token IS NOT NULL');
    console.log('✅ Index on verification_token added');

    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified)');
    console.log('✅ Index on email_verified added');

    await client.query('CREATE INDEX IF NOT EXISTS idx_users_verification_expires ON users(verification_token_expires_at) WHERE verification_token_expires_at IS NOT NULL');
    console.log('✅ Index on verification_token_expires_at added');

    // Final verification
    console.log('🔍 Final verification...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      AND column_name IN ('verification_token', 'verification_token_expires_at', 'email_verified')
      ORDER BY column_name
    `);

    console.log('📊 Current schema:');
    result.rows.forEach(row => {
      console.log('   • ' + row.column_name + ': ' + row.data_type + ' (nullable: ' + row.is_nullable + ')');
    });

    await client.end();
    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  runMigrationDirectly();
}

module.exports = { runMigrationDirectly };
