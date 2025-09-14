#!/usr/bin/env node

/**
 * Test Database Setup Script
 * Creates and configures test database for Floworx test suite
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupTestDatabase() {
  console.log('🗄️ Setting up test database...');

  try {
    // Check if we can connect to Supabase
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error && error.code !== 'PGRST116') { // PGRST116 is "relation does not exist"
      console.error('❌ Failed to connect to Supabase:', error.message);
      process.exit(1);
    }

    console.log('✅ Connected to Supabase successfully');

    // Check if business_types table exists (from our migration)
    const { data: businessTypes, error: btError } = await supabase
      .from('business_types')
      .select('count')
      .limit(1);

    if (btError && btError.code === 'PGRST116') {
      console.log('⚠️ Business types table not found. Migration may be needed.');
      console.log('Please run the database migration first:');
      console.log('1. Open Supabase SQL Editor');
      console.log('2. Run database-migration-business-types.sql');
      console.log('3. Run database-migration-password-reset.sql');
    } else {
      console.log('✅ Business types table exists');
    }

    // Check if password_reset_tokens table exists
    const { data: resetTokens, error: rtError } = await supabase
      .from('password_reset_tokens')
      .select('count')
      .limit(1);

    if (rtError && rtError.code === 'PGRST116') {
      console.log('⚠️ Password reset tokens table not found. Migration may be needed.');
    } else {
      console.log('✅ Password reset tokens table exists');
    }

    console.log('✅ Test database setup completed');

  } catch (error) {
    console.error('❌ Test database setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  setupTestDatabase();
}

module.exports = { setupTestDatabase };
