const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    console.log('📍 URL:', process.env.SUPABASE_URL);
    
    // Test basic connection
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database error:', error.message);
      if (error.message.includes('relation "users" does not exist')) {
        console.log('📝 Users table does not exist - need to create it');
        return false;
      }
    } else {
      console.log('✅ Database connection successful');
      console.log('📊 Users table exists and accessible');
      return true;
    }
    
  } catch (err) {
    console.error('❌ Connection test failed:', err.message);
    return false;
  }
}

async function testRegistration() {
  try {
    console.log('\n🧪 Testing user registration...');
    
    const testUser = {
      email: `test.${Date.now()}@example.com`,
      password_hash: 'test_hash_123',
      first_name: 'Test',
      last_name: 'User',
      company_name: 'Test Company'
    };
    
    const { data, error } = await supabase
      .from('users')
      .insert([testUser])
      .select();
    
    if (error) {
      console.error('❌ Registration test failed:', error.message);
      return false;
    } else {
      console.log('✅ Registration test successful');
      console.log('👤 Created user:', data[0]);
      
      // Clean up test user
      await supabase
        .from('users')
        .delete()
        .eq('id', data[0].id);
      
      return true;
    }
    
  } catch (err) {
    console.error('❌ Registration test failed:', err.message);
    return false;
  }
}

async function main() {
  const connectionOk = await testConnection();
  
  if (connectionOk) {
    await testRegistration();
  }
}

main();
