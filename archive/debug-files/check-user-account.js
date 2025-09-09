#!/usr/bin/env node

/**
 * Check if the user account exists and is properly configured
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserAccount() {
  console.log('🔍 CHECKING USER ACCOUNT: dizell2007@gmail.com');
  console.log('===============================================');
  
  try {
    // Check if user exists
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'dizell2007@gmail.com');
    
    if (userError) {
      console.error('❌ Database error:', userError.message);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ USER NOT FOUND');
      console.log('   The email dizell2007@gmail.com is not registered');
      console.log('   Please register first at: https://app.floworx-iq.com/register');
      return;
    }
    
    const user = users[0];
    console.log('✅ USER FOUND');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.first_name, user.last_name);
    console.log('   Company:', user.company_name);
    console.log('   Created:', new Date(user.created_at).toLocaleString());
    console.log('   Last Login:', user.last_login ? new Date(user.last_login).toLocaleString() : 'Never');
    console.log('   Email Verified:', user.email_verified ? '✅ Yes' : '❌ No');
    console.log('   Password Hash:', user.password_hash ? 'Set' : 'Missing');
    
    if (!user.email_verified) {
      console.log('\n⚠️  EMAIL NOT VERIFIED');
      console.log('   This is likely why login is failing');
      console.log('   The backend requires email verification before login');
      
      // Check for verification tokens
      const { data: tokens, error: tokenError } = await supabase
        .from('email_verification_tokens')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!tokenError && tokens && tokens.length > 0) {
        const token = tokens[0];
        const isExpired = new Date(token.expires_at) < new Date();
        console.log('   Latest verification token:', isExpired ? 'Expired' : 'Active');
        console.log('   Token created:', new Date(token.created_at).toLocaleString());
        console.log('   Token expires:', new Date(token.expires_at).toLocaleString());
      } else {
        console.log('   No verification tokens found');
      }
      
      console.log('\n🔧 SOLUTIONS:');
      console.log('   1. Manually verify the email in database');
      console.log('   2. Resend verification email');
      console.log('   3. Temporarily disable email verification requirement');
    }
    
    if (!user.password_hash) {
      console.log('\n❌ PASSWORD HASH MISSING');
      console.log('   The user account exists but has no password');
      console.log('   This suggests the account was created via OAuth only');
    }
    
    // Check OAuth connections
    const { data: oauthTokens, error: oauthError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', user.id);
    
    if (!oauthError && oauthTokens && oauthTokens.length > 0) {
      console.log('\n🔗 OAUTH CONNECTIONS:');
      oauthTokens.forEach(token => {
        console.log(`   ${token.provider}: Connected on ${new Date(token.created_at).toLocaleString()}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking user account:', error.message);
  }
}

async function fixEmailVerification() {
  console.log('\n🔧 FIXING EMAIL VERIFICATION');
  console.log('==============================');
  
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ email_verified: true })
      .eq('email', 'dizell2007@gmail.com')
      .select();
    
    if (error) {
      console.error('❌ Failed to update email verification:', error.message);
    } else {
      console.log('✅ Email verification status updated');
      console.log('   User can now log in normally');
    }
  } catch (error) {
    console.error('❌ Error updating email verification:', error.message);
  }
}

// Run the checks
checkUserAccount().then(() => {
  console.log('\n❓ Would you like to fix email verification? (This will allow login)');
  console.log('   Run: node check-user-account.js --fix');
  
  if (process.argv.includes('--fix')) {
    fixEmailVerification();
  }
});
