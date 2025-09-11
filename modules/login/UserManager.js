#!/usr/bin/env node

/**
 * USER MANAGER FOR LOGIN MODULE
 * =============================
 * Manages test users for login module testing
 */

const axios = require('axios');

class UserManager {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.apiUrl = `${baseUrl}/api`;
  }

  /**
   * Create a verified test user for login testing
   */
  async createVerifiedTestUser() {
    console.log('👤 CREATING VERIFIED TEST USER');
    console.log('==============================');

    const testUser = {
      firstName: 'Login',
      lastName: 'Test',
      email: 'login.test@floworx-iq.com',
      password: 'LoginTest123!',
      businessName: 'Login Test Company',
      phone: '+1234567890',
      agreeToTerms: true,
      marketingConsent: false
    };

    try {
      // Step 1: Register user
      console.log(`📧 Registering user: ${testUser.email}`);
      
      const registerResponse = await axios.post(`${this.apiUrl}/auth/register`, testUser, {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' }
      });

      console.log(`✅ User registered: ${registerResponse.status}`);
      console.log(`📊 Response: ${JSON.stringify(registerResponse.data)}`);

      const userId = registerResponse.data.user?.id;
      
      if (!userId) {
        throw new Error('User ID not returned from registration');
      }

      // Step 2: Try to verify user (if verification endpoint exists)
      try {
        console.log('📧 Attempting to verify user email...');
        
        // Try different verification approaches
        const verificationAttempts = [
          // Direct verification
          () => axios.post(`${this.apiUrl}/auth/verify-email`, { 
            userId, 
            email: testUser.email 
          }),
          // Admin verification
          () => axios.post(`${this.apiUrl}/admin/verify-user`, { 
            userId 
          }),
          // Auto-verification for test users
          () => axios.post(`${this.apiUrl}/auth/auto-verify`, { 
            email: testUser.email,
            testUser: true 
          })
        ];

        let verified = false;
        for (const attempt of verificationAttempts) {
          try {
            const verifyResponse = await attempt();
            console.log(`✅ User verified via API: ${verifyResponse.status}`);
            verified = true;
            break;
          } catch (verifyError) {
            // Continue to next attempt
            continue;
          }
        }

        if (!verified) {
          console.log('⚠️  Could not verify via API, user may need manual verification');
        }

      } catch (verifyError) {
        console.log('⚠️  Verification step failed, but user is created');
      }

      // Step 3: Test login immediately
      console.log('\n🔐 TESTING LOGIN WITH NEW USER');
      console.log('==============================');
      
      try {
        const loginResponse = await axios.post(`${this.apiUrl}/auth/login`, {
          email: testUser.email,
          password: testUser.password
        }, {
          timeout: 15000,
          headers: { 'Content-Type': 'application/json' }
        });

        console.log(`✅ Login test successful: ${loginResponse.status}`);
        console.log(`📊 Login response: ${JSON.stringify(loginResponse.data)}`);

        return {
          success: true,
          user: testUser,
          message: '✅ Verified test user created and login confirmed',
          canLogin: true
        };

      } catch (loginError) {
        const errorType = loginError.response?.data?.error?.type;
        const errorMessage = loginError.response?.data?.error?.message;

        console.log(`❌ Login test failed: ${loginError.response?.status} - ${errorMessage}`);

        if (errorType === 'EMAIL_NOT_VERIFIED') {
          return {
            success: false,
            user: testUser,
            message: '⚠️  User created but requires email verification',
            canLogin: false,
            needsVerification: true
          };
        } else {
          return {
            success: false,
            user: testUser,
            message: `❌ User created but login failed: ${errorMessage}`,
            canLogin: false,
            error: errorMessage
          };
        }
      }

    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️  User already exists, testing login...');
        
        try {
          const loginResponse = await axios.post(`${this.apiUrl}/auth/login`, {
            email: testUser.email,
            password: testUser.password
          });

          console.log(`✅ Existing user login successful: ${loginResponse.status}`);
          
          return {
            success: true,
            user: testUser,
            message: '✅ Existing verified test user confirmed',
            canLogin: true,
            existing: true
          };

        } catch (loginError) {
          const errorType = loginError.response?.data?.error?.type;
          const errorMessage = loginError.response?.data?.error?.message;

          return {
            success: false,
            user: testUser,
            message: `❌ Existing user cannot login: ${errorMessage}`,
            canLogin: false,
            needsVerification: errorType === 'EMAIL_NOT_VERIFIED'
          };
        }
      } else {
        console.error(`❌ User creation failed: ${error.response?.data?.error || error.message}`);
        
        return {
          success: false,
          message: `❌ User creation failed: ${error.response?.data?.error || error.message}`,
          canLogin: false
        };
      }
    }
  }

  /**
   * Find existing users that can be used for testing
   */
  async findWorkingTestUsers() {
    console.log('🔍 FINDING WORKING TEST USERS');
    console.log('=============================');

    const potentialUsers = [
      { email: 'owner@hottubparadise.com', password: 'TestPassword123!' },
      { email: 'owner@hottubparadise.com', password: 'HotTub2024!' },
      { email: 'owner@hottubparadise.com', password: 'password123' },
      { email: 'sarah@hottubparadise.com', password: 'TestPassword123!' },
      { email: 'test@floworx-iq.com', password: 'TestPassword123!' },
      { email: 'admin@floworx-iq.com', password: 'AdminPassword123!' }
    ];

    const workingUsers = [];

    for (const user of potentialUsers) {
      try {
        console.log(`🔐 Testing: ${user.email}`);
        
        const response = await axios.post(`${this.apiUrl}/auth/login`, user, {
          timeout: 10000,
          headers: { 'Content-Type': 'application/json' }
        });

        console.log(`✅ Working user found: ${user.email}`);
        workingUsers.push({
          ...user,
          status: 'working',
          response: response.data
        });

      } catch (error) {
        const errorType = error.response?.data?.error?.type;
        const errorMessage = error.response?.data?.error?.message;
        
        console.log(`❌ ${user.email}: ${errorMessage}`);
        
        workingUsers.push({
          ...user,
          status: 'failed',
          error: errorMessage,
          errorType
        });
      }
    }

    return workingUsers;
  }

  /**
   * Setup login module with working credentials
   */
  async setupLoginModule() {
    console.log('🔧 SETTING UP LOGIN MODULE');
    console.log('==========================');

    // First, try to find existing working users
    const existingUsers = await this.findWorkingTestUsers();
    const workingUser = existingUsers.find(user => user.status === 'working');

    if (workingUser) {
      console.log(`✅ Found working user: ${workingUser.email}`);
      return {
        success: true,
        validUser: {
          email: workingUser.email,
          password: workingUser.password,
          description: 'Verified existing user'
        },
        message: '✅ Login module ready with existing user'
      };
    }

    // If no working user found, create one
    console.log('🆕 No working users found, creating new test user...');
    const newUserResult = await this.createVerifiedTestUser();

    if (newUserResult.success && newUserResult.canLogin) {
      return {
        success: true,
        validUser: {
          email: newUserResult.user.email,
          password: newUserResult.user.password,
          description: 'Newly created verified user'
        },
        message: '✅ Login module ready with new user'
      };
    }

    return {
      success: false,
      message: '❌ Could not setup working user for login module',
      details: newUserResult
    };
  }
}

// Export for use as module
module.exports = UserManager;

// Run setup if called directly
if (require.main === module) {
  const userManager = new UserManager();
  userManager.setupLoginModule()
    .then(result => {
      console.log('\n🎯 USER MANAGER SETUP COMPLETE');
      console.log('==============================');
      console.log(result.message);
      
      if (result.success) {
        console.log(`📧 Valid user: ${result.validUser.email}`);
        console.log(`🔐 Password: ${result.validUser.password}`);
      }
      
      process.exit(result.success ? 0 : 1);
    })
    .catch(console.error);
}
