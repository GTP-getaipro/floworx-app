/**
 * Simple Database Connectivity Test
 * Tests basic connection to Supabase without complex operations
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

describe('Database Connectivity Test', () => {
  let supabase;

  beforeAll(() => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('⚠️ Skipping database tests - missing configuration');
      return;
    }

    supabase = createClient(supabaseUrl, supabaseServiceKey);
  });

  test('Can connect to Supabase', async () => {
    if (!supabase) {
      console.log('⚠️ Skipping test - no Supabase client');
      return;
    }

    // Simple query to test connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    // Should either succeed or fail with "relation does not exist" (which is fine)
    if (error) {
      expect(error.code).toBe('PGRST116'); // Relation does not exist is acceptable
    } else {
      expect(data).toBeDefined();
    }
  }, 10000); // 10 second timeout

  test('Can check business_types table', async () => {
    if (!supabase) {
      console.log('⚠️ Skipping test - no Supabase client');
      return;
    }

    const { data, error } = await supabase
      .from('business_types')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('Business types table not found:', error.message);
      expect(error.code).toBe('PGRST116'); // Expected if migration not run
    } else {
      console.log('✅ Business types table exists');
      expect(data).toBeDefined();
    }
  }, 10000);
});
