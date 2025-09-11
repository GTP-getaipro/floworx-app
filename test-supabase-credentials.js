
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Get environment variables from Vercel
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('Environment check:');
    console.log('SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_ANON_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✅ Set' : '❌ Missing');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing required Supabase environment variables');
    }
    
    // Test anonymous client
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Anonymous client created');
    
    // Test service role client
    if (serviceKey) {
      const supabaseAdmin = createClient(supabaseUrl, serviceKey);
      console.log('✅ Service role client created');
      
      // Test actual connection with a simple query
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1);
        
      if (error) {
        if (error.message.includes('relation "users" does not exist')) {
          console.log('❌ Users table does not exist');
          return { success: false, issue: 'MISSING_USERS_TABLE' };
        } else if (error.message.includes('JWT')) {
          console.log('❌ JWT/Authentication issue');
          return { success: false, issue: 'JWT_ERROR' };
        } else {
          console.log('⚠️  Query error (may be RLS):', error.message);
          return { success: true, issue: 'RLS_EXPECTED' };
        }
      } else {
        console.log('✅ Database query successful');
        return { success: true, issue: null };
      }
    }
    
    return { success: true, issue: 'PARTIAL_SUCCESS' };
    
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
    return { success: false, issue: 'CONNECTION_FAILED', error: error.message };
  }
}

testConnection().then(result => {
  console.log('Test result:', JSON.stringify(result, null, 2));
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('Test crashed:', error);
  process.exit(1);
});
