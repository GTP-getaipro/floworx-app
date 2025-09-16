/**
 * Complete Email Verification Debug Script
 * Tests every component of the email verification system
 */

require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

class EmailVerificationDebugger {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com/api';
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    this.testUser = {
      firstName: 'Debug',
      lastName: 'User',
      email: `debug-${Date.now()}@example.com`,
      password: 'DebugPass123!',
      businessName: 'Debug Company'
    };
    this.userId = null;
    this.verificationToken = null;
  }

  async debugStep(stepName, testFunction) {
    console.log(`\n🔍 ${stepName}`);
    console.log('=' .repeat(stepName.length + 3));
    
    try {
      const result = await testFunction();
      if (result) {
        console.log('✅ PASS');
        return true;
      } else {
        console.log('❌ FAIL');
        return false;
      }
    } catch (error) {
      console.log('❌ ERROR:', error.message);
      return false;
    }
  }

  async step1_TestDatabaseConnection() {
    return await this.debugStep('STEP 1: Test Database Connection', async () => {
      // Test Supabase connection
      const { data, error } = await this.supabase
        .from('users')
        .select('count')
        .limit(1);
      
      if (error) {
        console.log('Database connection error:', error.message);
        return false;
      }
      
      console.log('Database connection: OK');
      return true;
    });
  }

  async step2_TestEmailVerificationTable() {
    return await this.debugStep('STEP 2: Test Email Verification Table', async () => {
      // Check if email_verification_tokens table exists and get schema
      const { data, error } = await this.supabase
        .from('email_verification_tokens')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log('Table access error:', error.message);
        return false;
      }
      
      console.log('Email verification tokens table: OK');
      
      // Show table schema if data exists
      if (data && data.length > 0) {
        console.log('Table columns:', Object.keys(data[0]).join(', '));
      }
      
      return true;
    });
  }

  async step3_TestUserRegistration() {
    return await this.debugStep('STEP 3: Test User Registration', async () => {
      console.log(`Registering user: ${this.testUser.email}`);
      
      const response = await axios.post(`${this.baseURL}/auth/register`, this.testUser, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
        validateStatus: () => true
      });
      
      console.log(`Registration response: ${response.status}`);
      
      if (response.status === 201) {
        this.userId = response.data.user?.id;
        console.log(`User ID: ${this.userId}`);
        console.log(`Token provided: ${response.data.token ? 'Yes' : 'No'}`);
        return true;
      } else {
        console.log('Registration failed:', response.data);
        return false;
      }
    });
  }

  async step4_TestTokenGeneration() {
    return await this.debugStep('STEP 4: Test Token Generation', async () => {
      if (!this.userId) {
        console.log('No user ID available');
        return false;
      }
      
      console.log('Generating verification token...');
      
      const response = await axios.get(
        `${this.baseURL}/auth/generate-verification-link/${encodeURIComponent(this.testUser.email)}`,
        { timeout: 10000, validateStatus: () => true }
      );
      
      console.log(`Token generation response: ${response.status}`);
      
      if (response.status === 200) {
        this.verificationToken = response.data.token;
        console.log(`Token: ${this.verificationToken.substring(0, 20)}...`);
        console.log(`Link: ${response.data.verificationLink}`);
        return true;
      } else {
        console.log('Token generation failed:', response.data);
        return false;
      }
    });
  }

  async step5_TestTokenStorage() {
    return await this.debugStep('STEP 5: Test Token Storage in Database', async () => {
      if (!this.verificationToken) {
        console.log('No verification token available');
        return false;
      }
      
      console.log('Checking token in database...');
      
      const { data, error } = await this.supabase
        .from('email_verification_tokens')
        .select('*')
        .eq('token', this.verificationToken)
        .single();
      
      if (error) {
        console.log('Token lookup error:', error.message);
        return false;
      }
      
      if (data) {
        console.log('Token found in database:');
        console.log(`  User ID: ${data.user_id}`);
        console.log(`  Email: ${data.email}`);
        console.log(`  Expires: ${data.expires_at}`);
        console.log(`  Used: ${data.used_at ? 'Yes' : 'No'}`);
        return true;
      } else {
        console.log('Token not found in database');
        return false;
      }
    });
  }

  async step6_TestTokenRetrieval() {
    return await this.debugStep('STEP 6: Test Token Retrieval via API', async () => {
      if (!this.verificationToken) {
        console.log('No verification token available');
        return false;
      }
      
      console.log('Testing database operations token retrieval...');
      
      try {
        const { databaseOperations } = require('./backend/database/database-operations');
        const result = await databaseOperations.getVerificationToken(this.verificationToken);
        
        console.log('Database operations result:', result);
        
        if (result.success && result.data) {
          console.log('Token retrieved successfully via database operations');
          return true;
        } else {
          console.log('Token retrieval failed via database operations');
          return false;
        }
      } catch (error) {
        console.log('Database operations error:', error.message);
        return false;
      }
    });
  }

  async step7_TestEmailVerificationEndpoint() {
    return await this.debugStep('STEP 7: Test Email Verification Endpoint', async () => {
      if (!this.verificationToken) {
        console.log('No verification token available');
        return false;
      }
      
      console.log('Testing POST /api/auth/verify-email...');
      
      const response = await axios.post(`${this.baseURL}/auth/verify-email`, {
        token: this.verificationToken
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
        validateStatus: () => true
      });
      
      console.log(`Verification response: ${response.status}`);
      console.log('Response data:', response.data);
      
      if (response.status === 200) {
        console.log('Email verification successful');
        return true;
      } else {
        console.log('Email verification failed');
        return false;
      }
    });
  }

  async step8_TestUserVerificationStatus() {
    return await this.debugStep('STEP 8: Test User Verification Status', async () => {
      if (!this.userId) {
        console.log('No user ID available');
        return false;
      }
      
      console.log('Checking user verification status in database...');
      
      const { data, error } = await this.supabase
        .from('users')
        .select('email_verified')
        .eq('id', this.userId)
        .single();

      if (error) {
        console.log('User lookup error:', error.message);
        return false;
      }

      console.log(`Email verified: ${data.email_verified}`);

      return data.email_verified === true;
    });
  }

  async step9_TestLoginWithVerifiedAccount() {
    return await this.debugStep('STEP 9: Test Login with Verified Account', async () => {
      console.log('Testing login with verified account...');
      
      const response = await axios.post(`${this.baseURL}/auth/login`, {
        email: this.testUser.email,
        password: this.testUser.password
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
        validateStatus: () => true
      });
      
      console.log(`Login response: ${response.status}`);
      
      if (response.status === 200) {
        console.log('Login successful');
        console.log(`Token provided: ${response.data.token ? 'Yes' : 'No'}`);
        console.log(`User data: ${response.data.user ? 'Yes' : 'No'}`);
        return true;
      } else {
        console.log('Login failed:', response.data);
        return false;
      }
    });
  }

  async cleanup() {
    console.log('\n🧹 CLEANUP');
    console.log('=' .repeat(10));
    
    try {
      // Delete test user
      if (this.userId) {
        await this.supabase
          .from('users')
          .delete()
          .eq('id', this.userId);
        console.log('Test user deleted');
      }
      
      // Delete test tokens
      if (this.verificationToken) {
        await this.supabase
          .from('email_verification_tokens')
          .delete()
          .eq('token', this.verificationToken);
        console.log('Test token deleted');
      }
      
    } catch (error) {
      console.log('Cleanup error:', error.message);
    }
  }

  async runCompleteDebug() {
    console.log('🔍 COMPLETE EMAIL VERIFICATION DEBUG');
    console.log('=' .repeat(40));
    console.log(`Started at: ${new Date().toLocaleString()}`);
    
    const results = [];
    
    results.push(await this.step1_TestDatabaseConnection());
    results.push(await this.step2_TestEmailVerificationTable());
    results.push(await this.step3_TestUserRegistration());
    results.push(await this.step4_TestTokenGeneration());
    results.push(await this.step5_TestTokenStorage());
    results.push(await this.step6_TestTokenRetrieval());
    results.push(await this.step7_TestEmailVerificationEndpoint());
    results.push(await this.step8_TestUserVerificationStatus());
    results.push(await this.step9_TestLoginWithVerifiedAccount());
    
    await this.cleanup();
    
    const passCount = results.filter(r => r).length;
    const totalCount = results.length;
    
    console.log('\n📊 DEBUG SUMMARY');
    console.log('=' .repeat(20));
    console.log(`Passed: ${passCount}/${totalCount} tests`);
    
    if (passCount === totalCount) {
      console.log('🎉 ALL TESTS PASSED - Email verification is working!');
    } else {
      console.log('⚠️  Some tests failed - issues identified above');
    }
    
    return passCount === totalCount;
  }
}

// Run debug if called directly
if (require.main === module) {
  const debugTool = new EmailVerificationDebugger();
  debugTool.runCompleteDebug().catch(console.error);
}

module.exports = EmailVerificationDebugger;
