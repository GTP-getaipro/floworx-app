/**
 * Complete Authentication to Onboarding Flow Test
 * Tests the entire user journey from registration to onboarding readiness
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
const TEST_EMAIL = `auth-onboarding-test-${Date.now()}@floworx-iq.com`;
const TEST_PASSWORD = 'TestPassword123!';

class AuthToOnboardingTester {
  constructor() {
    this.testResults = {
      registration: { status: 'pending', details: null },
      emailVerification: { status: 'pending', details: null },
      login: { status: 'pending', details: null },
      profileAccess: { status: 'pending', details: null },
      onboardingStatus: { status: 'pending', details: null },
      businessTypes: { status: 'pending', details: null },
      userStateTransition: { status: 'pending', details: null }
    };
    this.userToken = null;
    this.userId = null;
    this.verificationToken = null;
  }

  async runCompleteTest() {
    console.log('🚀 Starting Complete Authentication to Onboarding Flow Test');
    console.log(`📧 Test Email: ${TEST_EMAIL}`);
    console.log('=' .repeat(80));

    try {
      // Step 1: User Registration
      await this.testRegistration();
      
      // Step 2: Email Verification Token Generation
      await this.testEmailVerificationGeneration();
      
      // Step 3: Email Verification Process
      await this.testEmailVerification();
      
      // Step 4: User Login
      await this.testLogin();
      
      // Step 5: Profile Access (Authenticated)
      await this.testProfileAccess();
      
      // Step 6: Onboarding Status Access
      await this.testOnboardingStatus();
      
      // Step 7: Business Types Access
      await this.testBusinessTypes();
      
      // Step 8: User State Transition Validation
      await this.testUserStateTransition();
      
      // Generate Final Report
      this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.generateFinalReport();
      process.exit(1);
    }
  }

  async testRegistration() {
    console.log('\n📝 Step 1: Testing User Registration...');
    
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/register`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        firstName: 'Auth',
        lastName: 'Test',
        businessName: 'Auth Test Business',
        agreeToTerms: true
      });

      if (response.data.success && response.data.user) {
        this.userId = response.data.user.id;
        this.testResults.registration = {
          status: 'success',
          details: {
            userId: this.userId,
            email: response.data.user.email,
            hasToken: !!response.data.token
          }
        };
        console.log('✅ Registration successful');
        console.log(`   User ID: ${this.userId}`);
      } else {
        throw new Error('Registration response missing required data');
      }
    } catch (error) {
      this.testResults.registration = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ Registration failed:', error.message);
      throw error;
    }
  }

  async testEmailVerificationGeneration() {
    console.log('\n🔗 Step 2: Testing Email Verification Token Generation...');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/auth/generate-verification-link/${TEST_EMAIL}`);

      if (response.data.success && response.data.token) {
        this.verificationToken = response.data.token;
        this.testResults.emailVerification = {
          status: 'token_generated',
          details: {
            token: this.verificationToken,
            verificationLink: response.data.verificationLink
          }
        };
        console.log('✅ Verification token generated successfully');
        console.log(`   Token: ${this.verificationToken.substring(0, 20)}...`);
      } else {
        throw new Error('Token generation response missing required data');
      }
    } catch (error) {
      this.testResults.emailVerification = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ Email verification token generation failed:', error.message);
      throw error;
    }
  }

  async testEmailVerification() {
    console.log('\n✉️ Step 3: Testing Email Verification Process...');
    
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/verify-email`, {
        token: this.verificationToken
      });

      if (response.data.success && response.data.user.emailVerified) {
        this.testResults.emailVerification = {
          status: 'success',
          details: {
            emailVerified: response.data.user.emailVerified,
            hasNewToken: !!response.data.token
          }
        };
        console.log('✅ Email verification successful');
        console.log(`   Email Verified: ${response.data.user.emailVerified}`);
      } else {
        throw new Error('Email verification failed or user not marked as verified');
      }
    } catch (error) {
      this.testResults.emailVerification = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ Email verification failed:', error.message);
      throw error;
    }
  }

  async testLogin() {
    console.log('\n🔐 Step 4: Testing User Login...');
    
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });

      if (response.data.success && response.data.data.token) {
        this.userToken = response.data.data.token;
        this.testResults.login = {
          status: 'success',
          details: {
            hasToken: !!this.userToken,
            userId: response.data.data.user.id,
            email: response.data.data.user.email
          }
        };
        console.log('✅ Login successful');
        console.log(`   Token received: ${this.userToken.substring(0, 20)}...`);
      } else {
        throw new Error('Login response missing token or success flag');
      }
    } catch (error) {
      this.testResults.login = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ Login failed:', error.message);
      throw error;
    }
  }

  async testProfileAccess() {
    console.log('\n👤 Step 5: Testing Profile Access (Authenticated)...');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${this.userToken}`
        }
      });

      if (response.data.success && response.data.user.emailVerified) {
        this.testResults.profileAccess = {
          status: 'success',
          details: {
            emailVerified: response.data.user.emailVerified,
            onboardingCompleted: response.data.user.onboardingCompleted,
            hasRequiredFields: !!(response.data.user.firstName && response.data.user.email)
          }
        };
        console.log('✅ Profile access successful');
        console.log(`   Email Verified: ${response.data.user.emailVerified}`);
        console.log(`   Onboarding Complete: ${response.data.user.onboardingCompleted}`);
      } else {
        throw new Error('Profile access failed or email not verified');
      }
    } catch (error) {
      this.testResults.profileAccess = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ Profile access failed:', error.message);
      throw error;
    }
  }

  async testOnboardingStatus() {
    console.log('\n📋 Step 6: Testing Onboarding Status Access...');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/onboarding/status`, {
        headers: {
          'Authorization': `Bearer ${this.userToken}`
        }
      });

      if (response.data.user && response.data.user.emailVerified) {
        this.testResults.onboardingStatus = {
          status: 'success',
          details: {
            emailVerified: response.data.user.emailVerified,
            onboardingComplete: response.data.onboardingComplete,
            nextStep: response.data.nextStep,
            hasBusinessTypes: Array.isArray(response.data.businessTypes) && response.data.businessTypes.length > 0
          }
        };
        console.log('✅ Onboarding status access successful');
        console.log(`   Email Verified: ${response.data.user.emailVerified}`);
        console.log(`   Onboarding Complete: ${response.data.onboardingComplete}`);
        console.log(`   Next Step: ${response.data.nextStep}`);
        console.log(`   Business Types Available: ${response.data.businessTypes.length}`);
      } else {
        throw new Error('Onboarding status response missing required data');
      }
    } catch (error) {
      this.testResults.onboardingStatus = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ Onboarding status access failed:', error.message);
      throw error;
    }
  }

  async testBusinessTypes() {
    console.log('\n🏢 Step 7: Testing Business Types Access...');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/business-types`);

      const businessTypes = response.data.success ? response.data.data : response.data;

      if (Array.isArray(businessTypes) && businessTypes.length > 0) {
        this.testResults.businessTypes = {
          status: 'success',
          details: {
            count: businessTypes.length,
            hasHotTubType: businessTypes.some(bt => bt.slug === 'hot-tub-spa'),
            businessTypes: businessTypes.map(bt => ({ id: bt.id, name: bt.name, slug: bt.slug }))
          }
        };
        console.log('✅ Business types access successful');
        console.log(`   Available Types: ${businessTypes.length}`);
        console.log(`   Hot Tub Type Available: ${businessTypes.some(bt => bt.slug === 'hot-tub-spa')}`);
      } else {
        throw new Error('Business types response missing or empty');
      }
    } catch (error) {
      this.testResults.businessTypes = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ Business types access failed:', error.message);
      throw error;
    }
  }

  async testUserStateTransition() {
    console.log('\n🔄 Step 8: Testing User State Transition Validation...');
    
    try {
      // Check if user can progress from email verified to onboarding
      const canProgress = 
        this.testResults.registration.status === 'success' &&
        this.testResults.emailVerification.status === 'success' &&
        this.testResults.login.status === 'success' &&
        this.testResults.profileAccess.status === 'success' &&
        this.testResults.onboardingStatus.status === 'success' &&
        this.testResults.businessTypes.status === 'success';

      if (canProgress) {
        this.testResults.userStateTransition = {
          status: 'success',
          details: {
            canProgressToOnboarding: true,
            allStepsWorking: true,
            readyForBusinessTypeSelection: true,
            readyForEmailProviderSelection: true
          }
        };
        console.log('✅ User state transition validation successful');
        console.log('   ✅ User can progress from registration to onboarding');
        console.log('   ✅ All authentication steps working');
        console.log('   ✅ Ready for business type selection');
        console.log('   ✅ Ready for email provider selection');
      } else {
        throw new Error('User state transition validation failed - some steps not working');
      }
    } catch (error) {
      this.testResults.userStateTransition = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ User state transition validation failed:', error.message);
      throw error;
    }
  }

  generateFinalReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPLETE AUTHENTICATION TO ONBOARDING FLOW TEST REPORT');
    console.log('='.repeat(80));

    const steps = [
      { name: 'Registration', key: 'registration' },
      { name: 'Email Verification', key: 'emailVerification' },
      { name: 'Login', key: 'login' },
      { name: 'Profile Access', key: 'profileAccess' },
      { name: 'Onboarding Status', key: 'onboardingStatus' },
      { name: 'Business Types', key: 'businessTypes' },
      { name: 'User State Transition', key: 'userStateTransition' }
    ];

    let successCount = 0;
    let totalSteps = steps.length;

    steps.forEach(step => {
      const result = this.testResults[step.key];
      const status = result.status === 'success' ? '✅' : '❌';
      const statusText = result.status === 'success' ? 'PASS' : 'FAIL';
      
      console.log(`${status} ${step.name}: ${statusText}`);
      
      if (result.status === 'success') {
        successCount++;
      } else {
        console.log(`   Error: ${result.details?.error || 'Unknown error'}`);
      }
    });

    const successRate = Math.round((successCount / totalSteps) * 100);
    
    console.log('\n' + '-'.repeat(80));
    console.log(`📈 OVERALL RESULTS:`);
    console.log(`   Success Rate: ${successCount}/${totalSteps} (${successRate}%)`);
    console.log(`   Test Email: ${TEST_EMAIL}`);
    console.log(`   User ID: ${this.userId || 'Not created'}`);
    
    if (successRate === 100) {
      console.log('\n🎉 ALL TESTS PASSED! Authentication to Onboarding flow is working perfectly!');
      console.log('✅ Users can now successfully:');
      console.log('   • Register for an account');
      console.log('   • Verify their email address');
      console.log('   • Log in to their account');
      console.log('   • Access their profile');
      console.log('   • View onboarding status');
      console.log('   • See available business types');
      console.log('   • Progress to business type and email provider selection');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED - Authentication to Onboarding flow has issues');
      console.log('❌ Issues need to be resolved before users can progress to onboarding');
    }
    
    console.log('='.repeat(80));
  }
}

// Run the test
const tester = new AuthToOnboardingTester();
tester.runCompleteTest().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
