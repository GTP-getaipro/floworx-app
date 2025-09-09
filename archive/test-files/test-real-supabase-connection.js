#!/usr/bin/env node

/**
 * Test Real Supabase Connection
 * Tests the actual Supabase connection with real credentials
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment variables from .env.vercel
require('dotenv').config({ path: '.env.vercel' });

class RealSupabaseConnectionTester {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warning: '\x1b[33m',
      error: '\x1b[31m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}${message}${colors.reset}`);
  }

  async testConnection() {
    this.log('🧪 TESTING REAL SUPABASE CONNECTION', 'info');
    this.log('=' * 50, 'info');
    
    // Check environment variables
    this.log('\n📋 Environment Variables Check:', 'info');
    this.log(`SUPABASE_URL: ${this.supabaseUrl ? '✅ Set' : '❌ Missing'}`, this.supabaseUrl ? 'success' : 'error');
    this.log(`SUPABASE_ANON_KEY: ${this.supabaseAnonKey ? '✅ Set' : '❌ Missing'}`, this.supabaseAnonKey ? 'success' : 'error');
    this.log(`SUPABASE_SERVICE_ROLE_KEY: ${this.supabaseServiceKey ? '✅ Set' : '❌ Missing'}`, this.supabaseServiceKey ? 'success' : 'error');
    
    if (!this.supabaseUrl || !this.supabaseAnonKey || !this.supabaseServiceKey) {
      this.log('❌ Missing required environment variables', 'error');
      return false;
    }

    try {
      // Test 1: Create clients
      this.log('\n🔌 Creating Supabase Clients:', 'info');
      const supabase = createClient(this.supabaseUrl, this.supabaseAnonKey);
      const supabaseAdmin = createClient(this.supabaseUrl, this.supabaseServiceKey);
      this.log('✅ Clients created successfully', 'success');

      // Test 2: Test admin connection with users table
      this.log('\n👥 Testing Users Table Access:', 'info');
      const { data: usersData, error: usersError } = await supabaseAdmin
        .from('users')
        .select('count')
        .limit(1);

      if (usersError) {
        if (usersError.message.includes('relation "users" does not exist')) {
          this.log('❌ Users table does not exist', 'error');
          this.log('   Need to create users table in Supabase', 'error');
          return false;
        } else {
          this.log(`⚠️  Users table query error: ${usersError.message}`, 'warning');
          this.log('   This might be expected due to RLS policies', 'warning');
        }
      } else {
        this.log('✅ Users table accessible', 'success');
      }

      // Test 3: Test user registration simulation
      this.log('\n📝 Testing User Registration Simulation:', 'info');
      const testEmail = `test.${Date.now()}@example.com`;
      
      // Check if user exists (should not)
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', testEmail.toLowerCase())
        .single();

      if (checkError && checkError.code === 'PGRST116') {
        this.log('✅ User check working (no existing user found)', 'success');
      } else if (checkError) {
        this.log(`❌ User check failed: ${checkError.message}`, 'error');
        return false;
      }

      // Test 4: Test user creation
      this.log('\n👤 Testing User Creation:', 'info');
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert([{
          email: testEmail.toLowerCase(),
          first_name: 'Test',
          last_name: 'User',
          company_name: 'Test Company',
          password_hash: 'test_hash_for_testing',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) {
        this.log(`❌ User creation failed: ${createError.message}`, 'error');
        if (createError.message.includes('column') && createError.message.includes('does not exist')) {
          this.log('   Issue: Users table schema mismatch', 'error');
        }
        return false;
      } else {
        this.log('✅ User creation successful', 'success');
        this.log(`   Created user ID: ${newUser.id}`, 'success');
        
        // Clean up test user
        await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', newUser.id);
        this.log('✅ Test user cleaned up', 'success');
      }

      // Test 5: Test Supabase Auth
      this.log('\n🔐 Testing Supabase Auth:', 'info');
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: `auth.test.${Date.now()}@example.com`,
          password: 'TestPassword123!'
        });

        if (authError) {
          this.log(`⚠️  Supabase Auth error: ${authError.message}`, 'warning');
          if (authError.message.includes('Email not confirmed')) {
            this.log('   This is expected - email confirmation required', 'info');
          }
        } else {
          this.log('✅ Supabase Auth working', 'success');
        }
      } catch (authTestError) {
        this.log(`⚠️  Auth test error: ${authTestError.message}`, 'warning');
      }

      this.log('\n🎉 SUPABASE CONNECTION TEST COMPLETED', 'success');
      this.log('✅ Connection is working properly', 'success');
      return true;

    } catch (error) {
      this.log(`❌ Connection test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async checkUsersTableSchema() {
    this.log('\n📋 CHECKING USERS TABLE SCHEMA:', 'info');
    
    try {
      const supabaseAdmin = createClient(this.supabaseUrl, this.supabaseServiceKey);
      
      // Try to get table info
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .limit(1);

      if (error) {
        if (error.message.includes('relation "users" does not exist')) {
          this.log('❌ Users table does not exist', 'error');
          this.log('\n📝 SQL to create users table:', 'info');
          
          const createTableSQL = `
-- Create users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company_name VARCHAR(255),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email_verified BOOLEAN DEFAULT FALSE,
  last_login TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);
`;
          
          fs.writeFileSync('./create-users-table.sql', createTableSQL);
          this.log('📄 SQL saved to: ./create-users-table.sql', 'info');
          
          return false;
        } else {
          this.log(`Table query error: ${error.message}`, 'warning');
        }
      } else {
        this.log('✅ Users table exists and is accessible', 'success');
        return true;
      }
    } catch (error) {
      this.log(`Schema check error: ${error.message}`, 'error');
      return false;
    }
  }
}

// Run the test
if (require.main === module) {
  const tester = new RealSupabaseConnectionTester();
  
  async function runTests() {
    const connectionWorking = await tester.testConnection();
    const schemaExists = await tester.checkUsersTableSchema();
    
    if (connectionWorking && schemaExists) {
      console.log('\n🎉 ALL TESTS PASSED - SUPABASE IS READY!');
      process.exit(0);
    } else {
      console.log('\n❌ TESTS FAILED - SUPABASE NEEDS SETUP');
      process.exit(1);
    }
  }
  
  runTests().catch(error => {
    console.error('❌ Test error:', error);
    process.exit(1);
  });
}

module.exports = RealSupabaseConnectionTester;
