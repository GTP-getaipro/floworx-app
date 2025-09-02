#!/usr/bin/env node

/**
 * Test Database Cleanup Script
 * Cleans up test data after test execution
 */

const { createClient } = require('@supabase/supabase-js');
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

async function cleanupTestDatabase() {
  console.log('🧹 Cleaning up test database...');
  
  try {
    // Clean up test users
    const testEmailPatterns = [
      'test@floworx-test.com',
      'user-with-business@floworx-test.com',
      'unverified@floworx-test.com',
      '%@floworx-test.com',
      '%@floworx-e2e.com'
    ];
    
    for (const pattern of testEmailPatterns) {
      if (pattern.includes('%')) {
        // Use LIKE for pattern matching
        const { error } = await supabase
          .from('users')
          .delete()
          .like('email', pattern);
      } else {
        // Exact match
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('email', pattern);
      }
      
      // Ignore errors - records might not exist
    }
    
    // Clean up test password reset tokens
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .delete()
      .like('token', 'test-%');
    
    // Clean up test onboarding progress
    const { error: progressError } = await supabase
      .from('onboarding_progress')
      .delete()
      .in('user_id', []); // Will be empty since we deleted test users
    
    console.log('✅ Test database cleanup completed');
    
  } catch (error) {
    console.error('❌ Test database cleanup failed:', error.message);
    // Don't exit with error - cleanup failures shouldn't break the build
  }
}

if (require.main === module) {
  cleanupTestDatabase();
}

module.exports = { cleanupTestDatabase };
