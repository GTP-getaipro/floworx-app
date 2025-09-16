/**
 * Debug the specific email verification endpoint issue
 */

require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

async function debugVerificationEndpoint() {
  console.log('🔍 DEBUGGING EMAIL VERIFICATION ENDPOINT');
  console.log('=' .repeat(45));
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const baseURL = 'https://app.floworx-iq.com/api';
  const testUser = {
    firstName: 'Debug',
    lastName: 'User',
    email: `debug-endpoint-${Date.now()}@example.com`,
    password: 'DebugPass123!',
    businessName: 'Debug Company'
  };
  
  let userId = null;
  let verificationToken = null;
  
  try {
    // Step 1: Register user
    console.log('📝 Step 1: Register user');
    const registerResponse = await axios.post(`${baseURL}/auth/register`, testUser, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
      validateStatus: () => true
    });
    
    if (registerResponse.status !== 201) {
      console.log('❌ Registration failed:', registerResponse.data);
      return;
    }
    
    userId = registerResponse.data.user?.id;
    console.log('✅ User registered:', userId);
    
    // Step 2: Generate verification token
    console.log('\n🔗 Step 2: Generate verification token');
    const tokenResponse = await axios.get(
      `${baseURL}/auth/generate-verification-link/${encodeURIComponent(testUser.email)}`,
      { timeout: 10000, validateStatus: () => true }
    );
    
    if (tokenResponse.status !== 200) {
      console.log('❌ Token generation failed:', tokenResponse.data);
      return;
    }
    
    verificationToken = tokenResponse.data.token;
    console.log('✅ Token generated:', verificationToken.substring(0, 20) + '...');
    
    // Step 3: Check user status before verification
    console.log('\n👤 Step 3: Check user status BEFORE verification');
    const { data: userBefore, error: userBeforeError } = await supabase
      .from('users')
      .select('email_verified')
      .eq('id', userId)
      .single();
    
    if (userBeforeError) {
      console.log('❌ User lookup error:', userBeforeError.message);
    } else {
      console.log('📊 Email verified before:', userBefore.email_verified);
    }
    
    // Step 4: Test the verification endpoint with detailed logging
    console.log('\n🔍 Step 4: Test verification endpoint');
    console.log('Calling POST /api/auth/verify-email with token:', verificationToken.substring(0, 20) + '...');
    
    const verifyResponse = await axios.post(`${baseURL}/auth/verify-email`, {
      token: verificationToken
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
      validateStatus: () => true
    });
    
    console.log('📥 Verification response status:', verifyResponse.status);
    console.log('📊 Verification response data:', JSON.stringify(verifyResponse.data, null, 2));
    
    // Step 5: Check user status after verification attempt
    console.log('\n👤 Step 5: Check user status AFTER verification attempt');
    const { data: userAfter, error: userAfterError } = await supabase
      .from('users')
      .select('email_verified')
      .eq('id', userId)
      .single();
    
    if (userAfterError) {
      console.log('❌ User lookup error:', userAfterError.message);
    } else {
      console.log('📊 Email verified after:', userAfter.email_verified);
    }
    
    // Step 6: Check if token was marked as used
    console.log('\n🔗 Step 6: Check token status');
    const { data: tokenData, error: tokenError } = await supabase
      .from('email_verification_tokens')
      .select('*')
      .eq('token', verificationToken)
      .single();
    
    if (tokenError) {
      console.log('❌ Token lookup error:', tokenError.message);
    } else {
      console.log('📊 Token status:');
      console.log('  - Used at:', tokenData.used_at);
      console.log('  - Expires at:', tokenData.expires_at);
      console.log('  - User ID:', tokenData.user_id);
    }
    
    // Step 7: Try manual database update to test if the issue is with the endpoint or database
    console.log('\n🔧 Step 7: Test manual database update');
    const { data: manualUpdate, error: manualError } = await supabase
      .from('users')
      .update({ email_verified: true })
      .eq('id', userId)
      .select()
      .single();
    
    if (manualError) {
      console.log('❌ Manual update error:', manualError.message);
    } else {
      console.log('✅ Manual update successful');
      console.log('📊 Updated user:', {
        id: manualUpdate.id,
        email: manualUpdate.email,
        email_verified: manualUpdate.email_verified
      });
    }
    
    // Final verification
    console.log('\n✅ Step 8: Final verification check');
    const { data: finalUser, error: finalError } = await supabase
      .from('users')
      .select('email_verified')
      .eq('id', userId)
      .single();
    
    if (finalError) {
      console.log('❌ Final lookup error:', finalError.message);
    } else {
      console.log('📊 Final email verified status:', finalUser.email_verified);
    }
    
  } catch (error) {
    console.log('❌ Debug error:', error.message);
  } finally {
    // Cleanup
    console.log('\n🧹 Cleanup');
    if (userId) {
      await supabase.from('users').delete().eq('id', userId);
      console.log('✅ Test user deleted');
    }
    if (verificationToken) {
      await supabase.from('email_verification_tokens').delete().eq('token', verificationToken);
      console.log('✅ Test token deleted');
    }
  }
}

debugVerificationEndpoint().catch(console.error);
