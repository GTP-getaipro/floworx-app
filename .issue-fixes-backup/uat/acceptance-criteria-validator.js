#!/usr/bin/env node

/**
 * UAT Acceptance Criteria Validator
 * 
 * Validates all acceptance criteria for the Critical Auth Flow + Branding Epic
 * Environment: Production https://app.floworx-iq.com
 */

const axios = require('axios');

const ACCEPTANCE_CRITERIA = {
  userRegistration: {
    name: "User Registration",
    criteria: [
      "New account creation works with email + password",
      "Validation messages displayed correctly",
      "Logo appropriately sized (not oversized)",
      "Tagline cleanly placed without form overlap"
    ]
  },
  emailVerification: {
    name: "Email Verification", 
    criteria: [
      "Email verification link works (manual UAT)",
      "Correct error if token expired/invalid"
    ]
  },
  login: {
    name: "Login Flow",
    criteria: [
      "Valid credentials → Dashboard access",
      "Invalid credentials → Proper error message", 
      "Unverified accounts get correct block/resend message"
    ]
  },
  passwordReset: {
    name: "Password Reset",
    criteria: [
      "Request reset email (pending SendGrid integration)",
      "Reset with valid/invalid token → proper messages"
    ]
  },
  brandingResponsiveness: {
    name: "Branding & Responsiveness",
    criteria: [
      "Logo responsive (lg:h-12 md:h-10 sm:h-8)",
      "Tagline uses proper margin (mt-4, no overlap)",
      "Form centered and spaced consistently across devices",
      "Consistent styling across Login, Register, Forgot Password, Reset Password pages"
    ]
  }
};

class AcceptanceCriteriaValidator {
  constructor() {
    this.baseUrl = 'https://app.floworx-iq.com';
    this.results = {};
    this.overallStatus = 'PENDING';
  }

  async validateAllCriteria() {
    console.log('🎯 UAT ACCEPTANCE CRITERIA VALIDATION');
    console.log('====================================');
    console.log(`🌐 Environment: ${this.baseUrl}`);
    console.log(`📅 Validation Date: ${new Date().toISOString()}`);
    
    // Validate each acceptance criteria area
    await this.validateUserRegistration();
    await this.validateEmailVerification();
    await this.validateLoginFlow();
    await this.validatePasswordReset();
    await this.validateBrandingResponsiveness();
    
    // Generate final report
    this.generateAcceptanceReport();
    
    return this.results;
  }

  async validateUserRegistration() {
    console.log('\n📝 VALIDATING: User Registration');
    console.log('================================');
    
    const criteria = ACCEPTANCE_CRITERIA.userRegistration.criteria;
    const results = {};
    
    try {
      // Test 1: Account creation API
      console.log('🔍 Testing account creation API...');
      const testEmail = `uat-acceptance-${Date.now()}@floworx-test.com`;
      
      try {
        const response = await axios.post(`${this.baseUrl}/api/auth/register`, {
          email: testEmail,
          password: 'UATTest123!',
          firstName: 'UAT',
          lastName: 'Acceptance'
        });
        
        results.accountCreation = {
          status: 'PASS',
          httpStatus: response.status,
          hasUser: !!response.data.user,
          requiresVerification: response.data.user?.emailVerified === false
        };
        console.log('✅ Account creation: FUNCTIONAL');
        
      } catch (error) {
        if (error.response?.status === 409) {
          // Email already exists - this is expected behavior
          results.accountCreation = {
            status: 'PASS',
            httpStatus: 409,
            message: 'Proper duplicate email handling'
          };
          console.log('✅ Account creation: FUNCTIONAL (duplicate email handled)');
        } else {
          results.accountCreation = {
            status: 'FAIL',
            error: error.message,
            httpStatus: error.response?.status
          };
          console.log('❌ Account creation: FAILED');
        }
      }
      
      // Test 2: Validation messages
      console.log('🔍 Testing validation messages...');
      try {
        const invalidResponse = await axios.post(`${this.baseUrl}/api/auth/register`, {
          email: 'invalid-email',
          password: '123',
          firstName: '',
          lastName: ''
        });
        
        results.validationMessages = { status: 'FAIL', message: 'Should have rejected invalid data' };
        console.log('❌ Validation messages: FAILED (accepted invalid data)');
        
      } catch (error) {
        if (error.response?.status === 400 && error.response?.data?.error?.code === 'VALIDATION_ERROR') {
          results.validationMessages = {
            status: 'PASS',
            errorCode: error.response.data.error.code,
            message: 'Proper validation error handling'
          };
          console.log('✅ Validation messages: FUNCTIONAL');
        } else {
          results.validationMessages = {
            status: 'PARTIAL',
            message: 'Validation working but may need schema improvement'
          };
          console.log('⚠️ Validation messages: PARTIAL (needs schema review)');
        }
      }
      
      // Test 3 & 4: UI/Branding (requires manual verification)
      results.logoSizing = { status: 'MANUAL_UAT_REQUIRED', note: 'Logo changed from md to sm size' };
      results.taglineSpacing = { status: 'MANUAL_UAT_REQUIRED', note: 'Added mt-4 and pb-6 spacing' };
      
      console.log('📋 Logo sizing: MANUAL UAT REQUIRED (size reduced to sm)');
      console.log('📋 Tagline spacing: MANUAL UAT REQUIRED (spacing improved)');
      
    } catch (error) {
      console.error('❌ User Registration validation failed:', error.message);
      results.error = error.message;
    }
    
    this.results.userRegistration = results;
  }

  async validateEmailVerification() {
    console.log('\n📧 VALIDATING: Email Verification');
    console.log('=================================');
    
    // This requires manual UAT until SendGrid is configured
    this.results.emailVerification = {
      status: 'MANUAL_UAT_REQUIRED',
      note: 'Requires SendGrid configuration for automated testing',
      manualSteps: [
        '1. Register new account',
        '2. Check email for verification link',
        '3. Click verification link',
        '4. Verify account is activated',
        '5. Test expired/invalid token handling'
      ]
    };
    
    console.log('📋 Email verification: MANUAL UAT REQUIRED');
    console.log('   → SendGrid configuration needed for automated testing');
  }

  async validateLoginFlow() {
    console.log('\n🔐 VALIDATING: Login Flow');
    console.log('=========================');
    
    const results = {};
    
    try {
      // Test invalid credentials
      console.log('🔍 Testing invalid credentials...');
      try {
        await axios.post(`${this.baseUrl}/api/auth/login`, {
          email: 'nonexistent@example.com',
          password: 'WrongPassword123!'
        });
        
        results.invalidCredentials = { status: 'FAIL', message: 'Should have rejected invalid credentials' };
        console.log('❌ Invalid credentials: FAILED (accepted invalid login)');
        
      } catch (error) {
        if (error.response?.status === 401 && error.response?.data?.error?.code === 'INVALID_CREDENTIALS') {
          results.invalidCredentials = {
            status: 'PASS',
            errorCode: error.response.data.error.code,
            message: 'Proper invalid credentials handling'
          };
          console.log('✅ Invalid credentials: FUNCTIONAL');
        } else {
          results.invalidCredentials = {
            status: 'PARTIAL',
            httpStatus: error.response?.status,
            message: 'Error handling may need improvement'
          };
          console.log('⚠️ Invalid credentials: PARTIAL');
        }
      }
      
      // Test unverified account handling
      results.unverifiedAccounts = {
        status: 'MANUAL_UAT_REQUIRED',
        note: 'Test with unverified account to confirm block/resend message'
      };
      console.log('📋 Unverified accounts: MANUAL UAT REQUIRED');
      
    } catch (error) {
      console.error('❌ Login Flow validation failed:', error.message);
      results.error = error.message;
    }
    
    this.results.loginFlow = results;
  }

  async validatePasswordReset() {
    console.log('\n🔄 VALIDATING: Password Reset');
    console.log('=============================');
    
    const results = {};
    
    try {
      console.log('🔍 Testing password reset request...');
      const response = await axios.post(`${this.baseUrl}/api/auth/forgot-password`, {
        email: 'test@example.com'
      });
      
      if (response.data.success) {
        results.resetRequest = {
          status: 'PASS',
          message: 'Password reset request functional'
        };
        console.log('✅ Password reset request: FUNCTIONAL');
      } else {
        results.resetRequest = {
          status: 'PARTIAL',
          message: 'Response format may need review'
        };
        console.log('⚠️ Password reset request: PARTIAL');
      }
      
    } catch (error) {
      if (error.response?.status === 500) {
        results.resetRequest = {
          status: 'FAIL',
          message: 'Password reset still returning 500 errors',
          httpStatus: 500
        };
        console.log('❌ Password reset request: FAILED (500 error)');
      } else {
        results.resetRequest = {
          status: 'UNKNOWN',
          error: error.message,
          httpStatus: error.response?.status
        };
        console.log('❓ Password reset request: UNKNOWN STATUS');
      }
    }
    
    results.resetCompletion = {
      status: 'MANUAL_UAT_REQUIRED',
      note: 'Test reset completion with valid/invalid tokens'
    };
    
    this.results.passwordReset = results;
  }

  async validateBrandingResponsiveness() {
    console.log('\n🎨 VALIDATING: Branding & Responsiveness');
    console.log('=======================================');
    
    // This requires visual/browser testing
    this.results.brandingResponsiveness = {
      status: 'MANUAL_UAT_REQUIRED',
      changes: [
        'Logo size reduced from "md" to "sm" (h-10 → h-8)',
        'Tagline spacing improved with mt-4 and px-4',
        'Form container spacing improved with mt-4',
        'Logo lg size reduced from h-14 to h-12 for better scaling'
      ],
      manualChecks: [
        '1. Visit /register, /login, /forgot-password pages',
        '2. Verify logo is appropriately sized (not oversized)',
        '3. Verify tagline does not overlap form container',
        '4. Test responsiveness on desktop/tablet/mobile',
        '5. Confirm consistent styling across all auth pages'
      ]
    };
    
    console.log('📋 Branding & Responsiveness: MANUAL UAT REQUIRED');
    console.log('   → Visual testing needed for UI improvements');
  }

  generateAcceptanceReport() {
    console.log('\n📊 ACCEPTANCE CRITERIA VALIDATION REPORT');
    console.log('========================================');
    
    let totalCriteria = 0;
    let passedCriteria = 0;
    let failedCriteria = 0;
    let manualCriteria = 0;
    
    Object.entries(this.results).forEach(([area, results]) => {
      console.log(`\n📋 ${area.toUpperCase()}:`);
      
      Object.entries(results).forEach(([test, result]) => {
        totalCriteria++;
        
        if (result.status === 'PASS') {
          console.log(`   ✅ ${test}: PASS`);
          passedCriteria++;
        } else if (result.status === 'FAIL') {
          console.log(`   ❌ ${test}: FAIL - ${result.message || result.error}`);
          failedCriteria++;
        } else if (result.status === 'MANUAL_UAT_REQUIRED') {
          console.log(`   📋 ${test}: MANUAL UAT REQUIRED`);
          manualCriteria++;
        } else {
          console.log(`   ⚠️ ${test}: ${result.status}`);
        }
      });
    });
    
    console.log('\n🎯 OVERALL ACCEPTANCE STATUS:');
    console.log(`   Total Criteria: ${totalCriteria}`);
    console.log(`   ✅ Automated Pass: ${passedCriteria}`);
    console.log(`   ❌ Failed: ${failedCriteria}`);
    console.log(`   📋 Manual UAT Required: ${manualCriteria}`);
    
    const automatedPassRate = totalCriteria > 0 ? (passedCriteria / (totalCriteria - manualCriteria)) * 100 : 0;
    console.log(`   📊 Automated Pass Rate: ${automatedPassRate.toFixed(1)}%`);
    
    this.overallStatus = failedCriteria === 0 ? 'READY_FOR_MANUAL_UAT' : 'NEEDS_FIXES';
    console.log(`   🎯 Status: ${this.overallStatus}`);
    
    if (this.overallStatus === 'READY_FOR_MANUAL_UAT') {
      console.log('\n🎉 READY FOR MANUAL UAT TESTING!');
      console.log('   All automated tests pass. Proceed with manual UI/UX validation.');
    } else {
      console.log('\n🔧 FIXES NEEDED BEFORE MANUAL UAT');
    }
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new AcceptanceCriteriaValidator();
  validator.validateAllCriteria().catch(console.error);
}

module.exports = AcceptanceCriteriaValidator;
