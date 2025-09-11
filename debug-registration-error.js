#!/usr/bin/env node

/**
 * DEBUG REGISTRATION ERROR
 * ========================
 * Investigates the 500 error during registration
 */

const axios = require('axios');

class RegistrationDebugger {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.apiUrl = `${baseUrl}/api`;
    this.testEmail = 'dizelll2007@gmail.com';
  }

  async checkAPIHealth() {
    console.log('🏥 CHECKING API HEALTH');
    console.log('======================');

    try {
      const response = await axios.get(`${this.apiUrl}/health`, { timeout: 10000 });
      console.log(`✅ API Health: ${response.status} - ${response.data.status || 'OK'}`);
      return true;
    } catch (error) {
      console.log(`❌ API Health failed: ${error.response?.status || error.message}`);
      return false;
    }
  }

  async checkUserExists() {
    console.log('\n👤 CHECKING IF USER EXISTS');
    console.log('==========================');

    try {
      // Try to login to see if user exists
      const response = await axios.post(`${this.apiUrl}/auth/login`, {
        email: this.testEmail,
        password: 'TestPassword123!'
      }, { timeout: 10000 });

      console.log(`✅ User exists and can login: ${response.status}`);
      console.log(`🎫 Token received: ${!!response.data.token}`);
      return { exists: true, canLogin: true, data: response.data };

    } catch (error) {
      if (error.response?.status === 401) {
        console.log(`ℹ️  User exists but wrong password or not verified: ${error.response.status}`);
        return { exists: true, canLogin: false, error: error.response.data };
      } else if (error.response?.status === 404) {
        console.log(`ℹ️  User does not exist: ${error.response.status}`);
        return { exists: false, canLogin: false };
      } else {
        console.log(`❌ Login check failed: ${error.response?.status || error.message}`);
        return { exists: 'unknown', error: error.response?.data || error.message };
      }
    }
  }

  async testSimpleRegistration() {
    console.log('\n🔐 TESTING SIMPLE REGISTRATION');
    console.log('==============================');

    const simpleData = {
      firstName: 'Test',
      lastName: 'User',
      email: this.testEmail,
      password: 'TestPassword123!',
      agreeToTerms: true
    };

    try {
      console.log('🚀 Attempting simple registration...');
      const response = await axios.post(`${this.apiUrl}/auth/register`, simpleData, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ Simple registration successful: ${response.status}`);
      return { success: true, data: response.data };

    } catch (error) {
      console.log(`❌ Simple registration failed: ${error.response?.status || 'Network Error'}`);
      console.log(`💬 Error details:`, error.response?.data || error.message);
      
      if (error.response?.data) {
        console.log(`🔍 Full error response:`, JSON.stringify(error.response.data, null, 2));
      }

      return { success: false, error: error.response?.data || error.message };
    }
  }

  async testFullRegistration() {
    console.log('\n🔐 TESTING FULL REGISTRATION');
    console.log('============================');

    const fullData = {
      firstName: 'Test',
      lastName: 'User',
      email: this.testEmail,
      password: 'TestPassword123!',
      businessName: 'Test Business LLC',
      phone: '+1234567890',
      agreeToTerms: true,
      marketingConsent: false
    };

    try {
      console.log('🚀 Attempting full registration...');
      const response = await axios.post(`${this.apiUrl}/auth/register`, fullData, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ Full registration successful: ${response.status}`);
      return { success: true, data: response.data };

    } catch (error) {
      console.log(`❌ Full registration failed: ${error.response?.status || 'Network Error'}`);
      console.log(`💬 Error details:`, error.response?.data || error.message);
      
      if (error.response?.data) {
        console.log(`🔍 Full error response:`, JSON.stringify(error.response.data, null, 2));
      }

      return { success: false, error: error.response?.data || error.message };
    }
  }

  async testWithDifferentEmail() {
    console.log('\n📧 TESTING WITH DIFFERENT EMAIL');
    console.log('===============================');

    const testEmail = `test.${Date.now()}@example.com`;
    const testData = {
      firstName: 'Test',
      lastName: 'User',
      email: testEmail,
      password: 'TestPassword123!',
      businessName: 'Test Business',
      agreeToTerms: true
    };

    try {
      console.log(`🚀 Attempting registration with: ${testEmail}`);
      const response = await axios.post(`${this.apiUrl}/auth/register`, testData, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ Different email registration successful: ${response.status}`);
      return { success: true, email: testEmail, data: response.data };

    } catch (error) {
      console.log(`❌ Different email registration failed: ${error.response?.status || 'Network Error'}`);
      console.log(`💬 Error details:`, error.response?.data || error.message);
      
      return { success: false, error: error.response?.data || error.message };
    }
  }

  async runDebugSession() {
    console.log('🔍 REGISTRATION ERROR DEBUG SESSION');
    console.log('===================================');
    console.log(`📧 Target email: ${this.testEmail}`);
    console.log(`🌐 API URL: ${this.apiUrl}`);
    console.log('');

    const results = {
      apiHealth: null,
      userExists: null,
      simpleRegistration: null,
      fullRegistration: null,
      differentEmail: null,
      timestamp: new Date().toISOString()
    };

    // Step 1: Check API health
    results.apiHealth = await this.checkAPIHealth();

    if (results.apiHealth) {
      // Step 2: Check if user already exists
      results.userExists = await this.checkUserExists();

      if (results.userExists.exists && results.userExists.canLogin) {
        console.log('\n✅ USER ALREADY EXISTS AND CAN LOGIN!');
        console.log('====================================');
        console.log('The user dizelll2007@gmail.com is already registered and can login successfully.');
        console.log('No need to register again - we can proceed directly to testing login.');
        
        return {
          ...results,
          conclusion: 'USER_EXISTS_AND_WORKING',
          recommendation: 'Skip registration, test login directly'
        };
      }

      // Step 3: Try simple registration
      if (!results.userExists.exists || !results.userExists.canLogin) {
        results.simpleRegistration = await this.testSimpleRegistration();

        // Step 4: Try full registration if simple failed
        if (!results.simpleRegistration.success) {
          results.fullRegistration = await this.testFullRegistration();
        }

        // Step 5: Try with different email to isolate the issue
        results.differentEmail = await this.testWithDifferentEmail();
      }
    }

    // Generate debug report
    console.log('\n📊 DEBUG SESSION RESULTS');
    console.log('=========================');
    
    console.log(`🏥 API Health: ${results.apiHealth ? '✅ OK' : '❌ FAILED'}`);
    
    if (results.userExists) {
      console.log(`👤 User Exists: ${results.userExists.exists ? '✅ YES' : '❌ NO'}`);
      console.log(`🔑 Can Login: ${results.userExists.canLogin ? '✅ YES' : '❌ NO'}`);
    }

    if (results.simpleRegistration) {
      console.log(`🔐 Simple Registration: ${results.simpleRegistration.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    }

    if (results.fullRegistration) {
      console.log(`🔐 Full Registration: ${results.fullRegistration.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    }

    if (results.differentEmail) {
      console.log(`📧 Different Email Test: ${results.differentEmail.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    }

    // Determine next steps
    console.log('\n🎯 RECOMMENDATIONS:');
    
    if (results.userExists?.canLogin) {
      console.log('✅ User already exists and can login - proceed with login testing');
      results.recommendation = 'PROCEED_WITH_LOGIN';
    } else if (results.simpleRegistration?.success || results.fullRegistration?.success) {
      console.log('✅ Registration working - user should be created now');
      results.recommendation = 'REGISTRATION_SUCCESSFUL';
    } else if (results.differentEmail?.success) {
      console.log('⚠️  Registration works with other emails - issue may be specific to dizelll2007@gmail.com');
      results.recommendation = 'EMAIL_SPECIFIC_ISSUE';
    } else {
      console.log('❌ Registration appears to have server-side issues');
      results.recommendation = 'SERVER_SIDE_ISSUE';
    }

    // Save debug results
    const debugFile = `registration-debug-${Date.now()}.json`;
    require('fs').writeFileSync(debugFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Debug results saved to: ${debugFile}`);

    return results;
  }
}

// Run debug session if called directly
if (require.main === module) {
  const debug = new RegistrationDebugger();
  debug.runDebugSession()
    .then(results => {
      const success = results.userExists?.canLogin ||
                     results.simpleRegistration?.success ||
                     results.fullRegistration?.success;
      process.exit(success ? 0 : 1);
    })
    .catch(console.error);
}

module.exports = RegistrationDebugger;
