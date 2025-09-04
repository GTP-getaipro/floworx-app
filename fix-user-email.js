#!/usr/bin/env node

/**
 * Fix the user email verification for the correct email
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUserEmail() {
  console.log('🔧 FIXING USER EMAIL VERIFICATION');
  console.log('==================================');
  
  // The correct email with 3 L's
  const correctEmail = 'dizelll2007@gmail.com';
  
  try {
    // First, verify the user exists
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', correctEmail)
      .single();
    
    if (findError || !user) {
      console.error('❌ User not found:', correctEmail);
      return;
    }
    
    console.log('✅ User found:', user.email);
    console.log('   Name:', user.first_name, user.last_name);
    console.log('   Company:', user.company_name);
    console.log('   Email Verified:', user.email_verified ? '✅' : '❌');
    
    if (!user.email_verified) {
      console.log('\n🔧 Updating email verification status...');
      
      const { data, error } = await supabase
        .from('users')
        .update({ email_verified: true })
        .eq('email', correctEmail)
        .select();
      
      if (error) {
        console.error('❌ Failed to update email verification:', error.message);
      } else {
        console.log('✅ Email verification status updated successfully!');
        console.log('   User can now log in with:', correctEmail);
      }
    } else {
      console.log('✅ Email is already verified');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixUserEmail();
