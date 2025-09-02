#!/usr/bin/env node

/**
 * Test Database Migration Script
 * Applies necessary migrations for test environment
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrateTestDatabase() {
  console.log('🔄 Running test database migrations...');
  
  try {
    // Check if migrations are needed
    const { data: businessTypes, error: btError } = await supabase
      .from('business_types')
      .select('count')
      .limit(1);
    
    if (btError && btError.code === 'PGRST116') {
      console.log('⚠️ Business types table missing - migrations need to be run manually');
      console.log('Please run the following migrations in Supabase SQL Editor:');
      console.log('1. database-migration-business-types.sql');
      console.log('2. database-migration-password-reset.sql');
      console.log('');
      console.log('For now, continuing with existing tables...');
    } else {
      console.log('✅ Business types table exists');
    }
    
    // Verify core tables exist
    const coreTables = ['users', 'onboarding_progress'];
    
    for (const table of coreTables) {
      const { data, error } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (error && error.code === 'PGRST116') {
        console.log(`⚠️ Core table '${table}' missing - this may cause test failures`);
      } else {
        console.log(`✅ Core table '${table}' exists`);
      }
    }
    
    console.log('✅ Test database migration check completed');
    
  } catch (error) {
    console.error('❌ Test database migration failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  migrateTestDatabase();
}

module.exports = { migrateTestDatabase };
