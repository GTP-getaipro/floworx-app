/**
 * Authentication to Onboarding Gap Analysis
 * Tests the complete user journey from registration to business type selection
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
const timestamp = Date.now();

class AuthToOnboardingAnalyzer {
  constructor() {
    this.results = [];
    this.gaps = [];
    this.testUser = {
      email: `gap-analysis-${timestamp}@floworx-iq.com`,
      password: 'TestPassword123!',
      firstName: 'Gap',
      lastName: 'Analysis',
      businessName: 'Gap Analysis Business'
    };
  }

  log(test, passed, details = '', isGap = false) {
    const status = passed ? '✅ WORKING' : '❌ GAP';
    console.log(`${status}: ${test}${details ? ' - ' + details : ''}`);
    
    this.results.push({ test, passed, details });
    
    if (!passed && isGap) {
      this.gaps.push({ test, details });
    }
  }

  async testCompleteUserJourney() {
    console.log('🔍 AUTHENTICATION TO ONBOARDING GAP ANALYSIS');
    console.log('=' .repeat(70));
    console.log('Testing complete user journey from registration to business selection...\n');

    let userToken = null;
    let userId = null;

    // === PHASE 1: REGISTRATION ===
    console.log('📝 PHASE 1: USER REGISTRATION');
    console.log('-' .repeat(40));

    try {
      const response = await axios.post(`${BASE_URL}/auth/register`, {
        email: this.testUser.email,
        password: this.testUser.password,
        firstName: this.testUser.firstName,
        lastName: this.testUser.lastName,
        businessName: this.testUser.businessName,
        agreeToTerms: true
      });
      
      const success = response.status === 201 && response.data.success && response.data.token;
      userToken = response.data.token;
      userId = response.data.user?.id;
      
      this.log('User Registration', success, 
        success ? 'User created with JWT token' : 'Registration failed');
    } catch (error) {
      this.log('User Registration', false, error.response?.data?.message || error.message, true);
    }

    // === PHASE 2: EMAIL VERIFICATION STATUS ===
    console.log('\n📧 PHASE 2: EMAIL VERIFICATION FLOW');
    console.log('-' .repeat(40));

    // Test 1: Check if user needs email verification
    if (userToken) {
      try {
        const response = await axios.get(`${BASE_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        
        const emailVerified = response.data.user?.emailVerified || response.data.user?.email_verified;
        this.log('Email Verification Status Check', true, 
          `Email verified: ${emailVerified}`);
        
        if (!emailVerified) {
          this.log('Email Verification Required', false, 
            'User needs to verify email before onboarding', true);
        }
      } catch (error) {
        this.log('Email Verification Status Check', false, 
          'Cannot check email verification status', true);
      }
    }

    // Test 2: Email verification endpoint accessibility
    try {
      await axios.get(`${BASE_URL}/auth/verify-email/test-token`);
      this.log('Email Verification Endpoint', false, 'Should return 400 for invalid token');
    } catch (error) {
      const accessible = error.response?.status === 400;
      this.log('Email Verification Endpoint', accessible,
        accessible ? 'Endpoint accessible and validates tokens' : 'Endpoint not working');
    }

    // Test 3: Email verification token generation
    if (userToken) {
      try {
        const response = await axios.post(`${BASE_URL}/auth/generate-verification-link`, {
          email: this.testUser.email
        }, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        
        const success = response.status === 200 && response.data.success;
        this.log('Email Verification Token Generation', success,
          success ? 'Verification link generated' : 'Token generation failed');
      } catch (error) {
        this.log('Email Verification Token Generation', false,
          'Cannot generate verification tokens', true);
      }
    }

    // === PHASE 3: ONBOARDING READINESS ===
    console.log('\n🚀 PHASE 3: ONBOARDING SYSTEM READINESS');
    console.log('-' .repeat(40));

    // Test 1: Onboarding status endpoint
    if (userToken) {
      try {
        const response = await axios.get(`${BASE_URL}/onboarding/status`, {
          headers: { Authorization: `Bearer ${userToken}` }
        });
        
        const success = response.status === 200;
        this.log('Onboarding Status Endpoint', success,
          success ? 'Onboarding system accessible' : 'Onboarding system not accessible');
        
        if (success) {
          const data = response.data;
          console.log(`   Next Step: ${data.nextStep || 'Unknown'}`);
          console.log(`   Completed Steps: ${data.completedSteps?.length || 0}`);
        }
      } catch (error) {
        this.log('Onboarding Status Endpoint', false,
          'Onboarding system not accessible', true);
      }
    }

    // Test 2: Business types availability
    try {
      const response = await axios.get(`${BASE_URL}/business-types`);
      const success = response.status === 200 && response.data.data && response.data.data.length > 0;
      this.log('Business Types Data', success,
        success ? `${response.data.data.length} business types available` : 'No business types found');
    } catch (error) {
      this.log('Business Types Data', false,
        'Business types not accessible', true);
    }

    // Test 3: Email providers availability (check if endpoint exists)
    if (userToken) {
      try {
        const response = await axios.get(`${BASE_URL}/onboarding/debug`);
        const success = response.status === 200;
        this.log('Onboarding System Debug', success,
          success ? 'Onboarding system accessible' : 'Onboarding system not accessible');
      } catch (error) {
        this.log('Onboarding System Debug', false,
          'Onboarding system not accessible', true);
      }
    }

    // === PHASE 4: DATABASE MIGRATION STATUS ===
    console.log('\n🗄️ PHASE 4: DATABASE MIGRATION STATUS');
    console.log('-' .repeat(40));

    try {
      const response = await axios.get(`${BASE_URL}/onboarding/debug`);
      const success = response.status === 200;
      this.log('Database Migration Status', success,
        success ? 'Database operations working' : 'Database migration issues detected');
      
      if (success && response.data.debug) {
        const debug = response.data.debug;
        console.log(`   Business Types Working: ${debug.businessTypesWorking}`);
        console.log(`   User Config Test: ${debug.userConfigTableTest ? 'Working' : 'Issues detected'}`);
      }
    } catch (error) {
      this.log('Database Migration Status', false,
        'Database migration issues detected', true);
    }

    // === PHASE 5: FRONTEND INTEGRATION GAPS ===
    console.log('\n🎨 PHASE 5: FRONTEND INTEGRATION GAPS');
    console.log('-' .repeat(40));

    // These would need to be tested manually or with frontend testing tools
    this.log('Email Verification Page', false, 
      'Frontend page for email verification not tested', true);
    this.log('Post-Registration Flow', false,
      'Automatic redirect to email verification not tested', true);
    this.log('Onboarding Entry Point', false,
      'Seamless transition from auth to onboarding not tested', true);

    // === SUMMARY ===
    const working = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const successRate = Math.round((working / total) * 100);

    console.log('\n' + '=' .repeat(70));
    console.log('📊 GAP ANALYSIS SUMMARY');
    console.log('=' .repeat(70));
    console.log(`✅ Working: ${working}`);
    console.log(`❌ Gaps: ${total - working}`);
    console.log(`📊 Total Tests: ${total}`);
    console.log(`🎯 Readiness: ${successRate}%`);

    if (this.gaps.length > 0) {
      console.log('\n🚨 CRITICAL GAPS TO ADDRESS:');
      this.gaps.forEach((gap, index) => {
        console.log(`   ${index + 1}. ${gap.test}: ${gap.details}`);
      });
    }

    console.log('\n🎯 READINESS STATUS:');
    if (successRate >= 90) {
      console.log('🎉 READY - User journey is complete and functional');
    } else if (successRate >= 70) {
      console.log('⚠️  MOSTLY READY - Minor gaps need addressing');
    } else {
      console.log('🔧 NOT READY - Critical gaps must be resolved');
    }

    console.log('\n🏁 Gap Analysis Complete!');
    return successRate >= 80;
  }
}

// Run the gap analysis
const analyzer = new AuthToOnboardingAnalyzer();
analyzer.testCompleteUserJourney()
  .then(ready => {
    process.exit(ready ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Gap analysis crashed:', error);
    process.exit(1);
  });
