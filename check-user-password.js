#!/usr/bin/env node

/**
 * Check if the user has a password set and fix if needed
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndFixUserPassword() {
  console.log('🔍 CHECKING USER PASSWORD');
  console.log('=========================');
  
  const correctEmail = 'dizelll2007@gmail.com';
  
  try {
    // Check user details
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', correctEmail)
      .single();
    
    if (error || !user) {
      console.error('❌ User not found:', correctEmail);
      return;
    }
    
    console.log('✅ User found:', user.email);
    console.log('   Name:', user.first_name, user.last_name);
    console.log('   Company:', user.company_name);
    console.log('   Email Verified:', user.email_verified ? '✅' : '❌');
    console.log('   Password Hash:', user.password_hash ? 'Set' : '❌ MISSING');
    console.log('   Created:', new Date(user.created_at).toLocaleString());
    
    if (!user.password_hash) {
      console.log('\n⚠️  PASSWORD MISSING!');
      console.log('   This user account has no password set');
      console.log('   This often happens with OAuth-only accounts');
      
      console.log('\n🔧 Setting default password: Dizell2007!');
      
      // Hash the password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash('Dizell2007!', saltRounds);
      
      // Update user with password
      const { data: updateData, error: updateError } = await supabase
        .from('users')
        .update({ password_hash: hashedPassword })
        .eq('email', correctEmail)
        .select();
      
      if (updateError) {
        console.error('❌ Failed to set password:', updateError.message);
      } else {
        console.log('✅ Password set successfully!');
        console.log('   User can now log in with:');
        console.log('   📧 Email: dizelll2007@gmail.com');
        console.log('   🔑 Password: Dizell2007!');
      }
    } else {
      console.log('\n✅ Password is already set');
      console.log('   Try logging in with: dizelll2007@gmail.com');
      
      // Test if the password works
      console.log('\n🔍 Testing password: Dizell2007!');
      const passwordMatch = await bcrypt.compare('Dizell2007!', user.password_hash);
      console.log('   Password match:', passwordMatch ? '✅ Yes' : '❌ No');
      
      if (!passwordMatch) {
        console.log('\n🔧 Password doesn\'t match. Setting new password...');
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash('Dizell2007!', saltRounds);
        
        const { data: updateData, error: updateError } = await supabase
          .from('users')
          .update({ password_hash: hashedPassword })
          .eq('email', correctEmail)
          .select();
        
        if (updateError) {
          console.error('❌ Failed to update password:', updateError.message);
        } else {
          console.log('✅ Password updated successfully!');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAndFixUserPassword();
