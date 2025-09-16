/**
 * Debug Token Storage and Retrieval Flow
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function debugTokenFlow() {
  console.log('🔍 DEBUGGING TOKEN STORAGE AND RETRIEVAL');
  console.log('=' .repeat(50));
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  try {
    const testUserId = 'aeb9d774-0a50-4bef-abbe-bc02c10ae050';
    const testToken = 'debug-token-' + Date.now();
    const testEmail = 'debug@example.com';
    
    console.log('📝 Step 1: Store verification token');
    console.log('User ID:', testUserId);
    console.log('Token:', testToken.substring(0, 20) + '...');
    console.log('Email:', testEmail);
    console.log('');
    
    // Delete existing tokens first
    console.log('🧹 Cleaning existing tokens for user...');
    await supabase
      .from('email_verification_tokens')
      .delete()
      .eq('user_id', testUserId);
    
    // Store token
    const { data: storeData, error: storeError } = await supabase
      .from('email_verification_tokens')
      .insert({
        user_id: testUserId,
        token: testToken,
        email: testEmail,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single();
    
    if (storeError) {
      console.log('❌ Store error:', storeError.message);
      return;
    }
    
    console.log('✅ Token stored successfully');
    console.log('📊 Stored data:', {
      id: storeData.id,
      user_id: storeData.user_id,
      token: storeData.token.substring(0, 20) + '...',
      email: storeData.email,
      used: storeData.used,
      expires_at: storeData.expires_at
    });
    
    console.log('');
    console.log('🔍 Step 2: Retrieve verification token');
    
    // Retrieve token exactly as the API does
    const { data: retrieveData, error: retrieveError } = await supabase
      .from('email_verification_tokens')
      .select('user_id, expires_at, email')
      .eq('token', testToken)
      .eq('used', false)
      .single();
    
    if (retrieveError) {
      console.log('❌ Retrieve error:', retrieveError.message);
      console.log('Error code:', retrieveError.code);
      
      // Check if token exists without the used filter
      const { data: checkData, error: checkError } = await supabase
        .from('email_verification_tokens')
        .select('*')
        .eq('token', testToken);
      
      if (checkError) {
        console.log('❌ Check error:', checkError.message);
      } else {
        console.log('📊 Token exists:', checkData.length > 0);
        if (checkData.length > 0) {
          console.log('Token data:', checkData[0]);
        }
      }
    } else {
      console.log('✅ Token retrieved successfully');
      console.log('📊 Retrieved data:', retrieveData);
    }
    
    console.log('');
    console.log('🧪 Step 3: Test the actual API endpoint');
    
    // Test the actual verification endpoint
    const axios = require('axios');
    
    try {
      const response = await axios.post('https://app.floworx-iq.com/api/auth/verify-email', {
        token: testToken
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
        validateStatus: () => true
      });
      
      console.log('📥 API Response:', response.status);
      console.log('📊 API Data:', response.data);
      
    } catch (apiError) {
      console.log('❌ API Error:', apiError.message);
    }
    
    // Clean up
    await supabase
      .from('email_verification_tokens')
      .delete()
      .eq('token', testToken);
    
    console.log('');
    console.log('🧹 Test token cleaned up');
    
  } catch (error) {
    console.log('❌ Debug error:', error.message);
    console.log('Stack:', error.stack);
  }
}

debugTokenFlow();
