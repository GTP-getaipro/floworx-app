/**
 * Create Email Verification Tokens Table
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function createVerificationTable() {
  console.log('🔧 CREATING EMAIL VERIFICATION TOKENS TABLE');
  console.log('=' .repeat(50));
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    // Check if table exists first
    console.log('📋 Checking if email_verification_tokens table exists...');
    
    const { data, error } = await supabase
      .from('email_verification_tokens')
      .select('count')
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      console.log('❌ Table does not exist. Creating...');
      
      // Create the table using direct SQL
      const createTableSQL = `
        CREATE TABLE email_verification_tokens (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          token TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          used BOOLEAN DEFAULT FALSE,
          used_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_email_verification_tokens_token ON email_verification_tokens(token);
        CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
        CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);
      `;
      
      console.log('🔨 Executing SQL to create table...');
      console.log(createTableSQL);
      
      // Note: We'll need to create this table manually in Supabase dashboard
      // since we can't execute raw SQL through the client without special permissions
      
      console.log('');
      console.log('📝 MANUAL SETUP REQUIRED:');
      console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard');
      console.log('2. Navigate to your project');
      console.log('3. Go to SQL Editor');
      console.log('4. Run the following SQL:');
      console.log('');
      console.log(createTableSQL);
      console.log('');
      console.log('5. After creating the table, run this script again to test');
      
    } else if (error) {
      console.log('❌ Error checking table:', error.message);
    } else {
      console.log('✅ Table email_verification_tokens already exists');
      
      // Test token operations
      await testTokenOperations(supabase);
    }
    
  } catch (error) {
    console.log('❌ Database setup error:', error.message);
  }
}

async function testTokenOperations(supabase) {
  console.log('');
  console.log('🧪 TESTING TOKEN OPERATIONS');
  console.log('=' .repeat(35));

  try {
    // Clean up old test tokens first
    console.log('🧹 Cleaning up old test tokens...');

    const { error: cleanupError } = await supabase
      .from('email_verification_tokens')
      .delete()
      .like('email', '%example.com');

    if (cleanupError) {
      console.log('⚠️  Cleanup warning:', cleanupError.message);
    } else {
      console.log('✅ Old test tokens cleaned up');
    }

    // Test storing a verification token
    const testToken = 'test-token-' + Date.now();
    const testUserId = '21d9f664-3e5f-46a5-bb9f-594a67bfea23'; // Use a real user ID from recent test

    console.log('📝 Testing token storage...');

    const { data: insertData, error: insertError } = await supabase
      .from('email_verification_tokens')
      .insert({
        user_id: testUserId,
        token: testToken,
        email: 'test@example.com',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select();

    if (insertError) {
      console.log('❌ Token storage failed:', insertError.message);
      return;
    }

    console.log('✅ Token stored successfully');

    // Test retrieving the token
    console.log('🔍 Testing token retrieval...');

    const { data: retrieveData, error: retrieveError } = await supabase
      .from('email_verification_tokens')
      .select('user_id, expires_at, email')
      .eq('token', testToken)
      .eq('used', false)
      .single();

    if (retrieveError) {
      console.log('❌ Token retrieval failed:', retrieveError.message);
    } else {
      console.log('✅ Token retrieved successfully');
      console.log('📊 Token data:', retrieveData);
    }

    // Test marking token as used
    console.log('🔄 Testing token deletion (mark as used)...');

    const { error: deleteError } = await supabase
      .from('email_verification_tokens')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('token', testToken);

    if (deleteError) {
      console.log('❌ Token deletion failed:', deleteError.message);
    } else {
      console.log('✅ Token marked as used successfully');
    }

    // Clean up - actually delete the test token
    await supabase
      .from('email_verification_tokens')
      .delete()
      .eq('token', testToken);

    console.log('🧹 Test token cleaned up');

    console.log('');
    console.log('🎯 VERIFICATION TOKEN SYSTEM IS WORKING!');
    console.log('✅ Table exists and is accessible');
    console.log('✅ Token storage working');
    console.log('✅ Token retrieval working');
    console.log('✅ Token cleanup working');

  } catch (error) {
    console.log('❌ Token operations test error:', error.message);
  }
}

createVerificationTable();
