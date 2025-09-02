/**
 * Database Test Setup
 * Configures database connection and test data for integration tests
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

// Test database configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Missing Supabase configuration for database tests');
}

// Create Supabase client for tests
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Global setup for database tests
beforeAll(async () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('⚠️ Skipping database tests - missing configuration');
    return;
  }

  try {
    // Test database connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
    
    console.log('✅ Database connection established for tests');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    throw error;
  }
});

// Cleanup after all database tests
afterAll(async () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    return;
  }

  try {
    // Clean up test data
    const testEmailPatterns = [
      'test@floworx-test.com',
      'user-with-business@floworx-test.com',
      'unverified@floworx-test.com'
    ];
    
    for (const email of testEmailPatterns) {
      await supabase
        .from('users')
        .delete()
        .eq('email', email);
    }
    
    console.log('🧹 Database test cleanup completed');
    
  } catch (error) {
    console.warn('⚠️ Database cleanup warning:', error.message);
  }
});

// Export for use in tests
module.exports = {
  supabase,
  supabaseUrl,
  supabaseServiceKey
};
