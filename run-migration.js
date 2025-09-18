#!/usr/bin/env node

/**
 * Email Verification Migration Runner
 * 
 * Runs the database migration to add email verification fields
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
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

async function runMigration() {
  try {
    // Load environment variables
    loadEnvFile();
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      console.log('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
      console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Set' : 'Missing');
      process.exit(1);
    }

    console.log('🔄 Connecting to Supabase...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('📄 Loading migration file...');
    const migrationPath = path.join(__dirname, 'backend/database/migrations/add_email_verification_fields.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔄 Running email verification migration...');
    
    // Execute the migration as raw SQL
    const { data, error } = await supabase
      .from('_migrations')
      .select('*')
      .limit(1);
    
    // If _migrations table doesn't exist, we'll run the SQL directly
    console.log('🔄 Executing migration SQL...');
    
    // Split migration into individual statements and execute them
    const statements = migration
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        console.log(`🔄 Executing statement ${i + 1}/${statements.length}...`);
        console.log(`   ${statement.substring(0, 60)}${statement.length > 60 ? '...' : ''}`);
        
        try {
          // Use PostgreSQL client for direct SQL execution
          const { Client } = require('pg');

          const client = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
          });

          await client.connect();

          const result = await client.query(statement);
          await client.end();

          console.log(`   ✅ Statement ${i + 1} completed`);

        } catch (err) {
          console.error(`❌ Error executing statement ${i + 1}:`, err.message);

          // Continue if column/index already exists
          if (err.message.includes('already exists') ||
              err.message.includes('duplicate key') ||
              err.message.includes('relation') && err.message.includes('already exists')) {
            console.log('   ⚠️  Already exists, continuing...');
          } else {
            console.error('Statement:', statement);
            process.exit(1);
          }
        }
      }
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('📋 Changes applied:');
    console.log('   • Added verification_token column');
    console.log('   • Added verification_token_expires_at column');
    console.log('   • Added performance indexes');
    console.log('   • Updated email_verified constraints');
    console.log('\n🎉 Email verification system is ready!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
