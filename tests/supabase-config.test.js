/**
 * Supabase Configuration Test
 * Tests Supabase configuration and connectivity
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

describe('Supabase Configuration Test', () => {
  test('Environment variables are loaded', () => {
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Not set');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
    
    expect(process.env.SUPABASE_URL).toBeDefined();
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined();
    
    // Check URL format (can be local or remote)
    const url = process.env.SUPABASE_URL;
    const isValidUrl = url.startsWith('http://localhost:') || url.match(/^https:\/\/.+\.supabase\.co$/);
    expect(isValidUrl).toBeTruthy();
  });

  test('Can create Supabase client without errors', () => {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    expect(() => {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      expect(supabase).toBeDefined();
    }).not.toThrow();
  });

  test('Supabase client has expected methods', () => {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    expect(supabase.from).toBeDefined();
    expect(supabase.rpc).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });
});
