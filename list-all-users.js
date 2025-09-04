#!/usr/bin/env node

/**
 * List all users in the database to see what accounts exist
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listAllUsers() {
  console.log('👥 LISTING ALL REGISTERED USERS');
  console.log('================================');
  
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Database error:', error.message);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ NO USERS FOUND');
      console.log('   The database is empty - no users have registered yet');
      return;
    }
    
    console.log(`✅ FOUND ${users.length} USER(S):`);
    console.log('');
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Company: ${user.company_name || 'Not set'}`);
      console.log(`   Registered: ${new Date(user.created_at).toLocaleString()}`);
      console.log(`   Last Login: ${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}`);
      console.log(`   Email Verified: ${user.email_verified ? '✅' : '❌'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error listing users:', error.message);
  }
}

listAllUsers();
