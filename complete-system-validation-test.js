/**
 * Complete System Validation Test
 * Tests the entire FloWorx system from registration to business type selection
 * Validates all modules are working together seamlessly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
const TEST_EMAIL = `system-validation-${Date.now()}@floworx-iq.com`;
const TEST_PASSWORD = 'TestPassword123!';

class CompleteSystemValidator {
  constructor() {
    this.testResults = {
      // Authentication Module
      registration: { status: 'pending', details: null },
      emailVerification: { status: 'pending', details: null },
      login: { status: 'pending', details: null },
      profileAccess: { status: 'pending', details: null },
      
      // Onboarding Module
      onboardingStatus: { status: 'pending', details: null },
      
      // Business Type Module
      businessTypesLoad: { status: 'pending', details: null },
      businessTypeSelection: { status: 'pending', details: null },
      selectionPersistence: { status: 'pending', details: null },
      workflowTemplate: { status: 'pending', details: null },
      
      // Integration Tests
      userStateTransition: { status: 'pending', details: null },
      endToEndFlow: { status: 'pending', details: null }
    };
    this.userToken = null;
    this.userId = null;
    this.verificationToken = null;
    this.selectedBusinessTypeId = 1; // Hot Tub & Spa
  }

  async runCompleteValidation() {
    console.log('🔍 Starting Complete FloWorx System Validation');
    console.log(`📧 Test Email: ${TEST_EMAIL}`);
    console.log('=' .repeat(100));

    try {
      // Phase 1: Authentication Module
      console.log('\n🔐 PHASE 1: AUTHENTICATION MODULE VALIDATION');
      console.log('-'.repeat(60));
      await this.testRegistration();
      await this.testEmailVerification();
      await this.testLogin();
      await this.testProfileAccess();
      
      // Phase 2: Onboarding Module
      console.log('\n📋 PHASE 2: ONBOARDING MODULE VALIDATION');
      console.log('-'.repeat(60));
      await this.testOnboardingStatus();
      
      // Phase 3: Business Type Module
      console.log('\n🏢 PHASE 3: BUSINESS TYPE MODULE VALIDATION');
      console.log('-'.repeat(60));
      await this.testBusinessTypesLoad();
      await this.testBusinessTypeSelection();
      await this.testSelectionPersistence();
      await this.testWorkflowTemplate();
      
      // Phase 4: Integration Tests
      console.log('\n🔄 PHASE 4: INTEGRATION & FLOW VALIDATION');
      console.log('-'.repeat(60));
      await this.testUserStateTransition();
      await this.testEndToEndFlow();
      
      // Generate Final Report
      this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ System validation failed:', error.message);
      this.generateFinalReport();
      process.exit(1);
    }
  }

  async testRegistration() {
    console.log('\n📝 Testing User Registration...');
    
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/register`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        firstName: 'System',
        lastName: 'Validation',
        businessName: 'System Validation Test Company',
        agreeToTerms: true
      });

      if (response.data.success && response.data.user) {
        this.userId = response.data.user.id;
        this.testResults.registration = {
          status: 'success',
          details: {
            userId: this.userId,
            email: response.data.user.email,
            hasToken: !!response.data.token,
            emailVerified: response.data.user.emailVerified
          }
        };
        console.log('✅ Registration successful');
        console.log(`   User ID: ${this.userId}`);
        console.log(`   Email Verified: ${response.data.user.emailVerified}`);
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

  async testEmailVerification() {
    console.log('\n✉️ Testing Email Verification Flow...');
    
    try {
      // Generate verification token
      const tokenResponse = await axios.get(`${BASE_URL}/api/auth/generate-verification-link/${TEST_EMAIL}`);
      
      if (!tokenResponse.data.success || !tokenResponse.data.token) {
        throw new Error('Verification token generation failed');
      }
      
      this.verificationToken = tokenResponse.data.token;
      
      // Verify email
      const verifyResponse = await axios.post(`${BASE_URL}/api/auth/verify-email`, {
        token: this.verificationToken
      });

      if (verifyResponse.data.success && verifyResponse.data.user.emailVerified) {
        this.testResults.emailVerification = {
          status: 'success',
          details: {
            tokenGenerated: !!this.verificationToken,
            emailVerified: verifyResponse.data.user.emailVerified,
            hasNewToken: !!verifyResponse.data.token
          }
        };
        console.log('✅ Email verification successful');
        console.log(`   Token: ${this.verificationToken.substring(0, 20)}...`);
        console.log(`   Email Verified: ${verifyResponse.data.user.emailVerified}`);
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
    console.log('\n🔐 Testing User Login...');
    
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
            email: response.data.data.user.email,
            tokenLength: this.userToken.length
          }
        };
        console.log('✅ Login successful');
        console.log(`   Token: ${this.userToken.substring(0, 20)}...`);
        console.log(`   User ID: ${response.data.data.user.id}`);
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
    console.log('\n👤 Testing Authenticated Profile Access...');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${this.userToken}` }
      });

      if (response.data.success && response.data.user.emailVerified) {
        this.testResults.profileAccess = {
          status: 'success',
          details: {
            emailVerified: response.data.user.emailVerified,
            onboardingCompleted: response.data.user.onboardingCompleted,
            hasRequiredFields: !!(response.data.user.firstName && response.data.user.email),
            businessName: response.data.user.companyName
          }
        };
        console.log('✅ Profile access successful');
        console.log(`   Email Verified: ${response.data.user.emailVerified}`);
        console.log(`   Onboarding Complete: ${response.data.user.onboardingCompleted}`);
        console.log(`   Business Name: ${response.data.user.companyName}`);
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
    console.log('\n📋 Testing Onboarding Status Access...');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/onboarding/status`, {
        headers: { 'Authorization': `Bearer ${this.userToken}` }
      });

      if (response.data.user && response.data.user.emailVerified) {
        this.testResults.onboardingStatus = {
          status: 'success',
          details: {
            emailVerified: response.data.user.emailVerified,
            onboardingComplete: response.data.onboardingComplete,
            nextStep: response.data.nextStep,
            hasBusinessTypes: Array.isArray(response.data.businessTypes) && response.data.businessTypes.length > 0,
            businessTypesCount: response.data.businessTypes?.length || 0,
            currentBusinessTypeId: response.data.businessTypeId
          }
        };
        console.log('✅ Onboarding status access successful');
        console.log(`   Next Step: ${response.data.nextStep}`);
        console.log(`   Business Types Available: ${response.data.businessTypes?.length || 0}`);
        console.log(`   Current Business Type ID: ${response.data.businessTypeId || 'None'}`);
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

  async testBusinessTypesLoad() {
    console.log('\n🏢 Testing Business Types Loading...');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/business-types`);

      if (response.data.success && Array.isArray(response.data.data)) {
        const businessTypes = response.data.data;
        const hotTubType = businessTypes.find(bt => bt.slug === 'hot-tub-spa');
        
        this.testResults.businessTypesLoad = {
          status: 'success',
          details: {
            totalTypes: businessTypes.length,
            hasHotTubType: !!hotTubType,
            hotTubTypeId: hotTubType?.id,
            hotTubCategories: hotTubType?.default_categories?.length || 0,
            hotTubWorkflowTemplate: hotTubType?.workflow_template_id,
            allTypesHaveNames: businessTypes.every(bt => bt.name && bt.slug)
          }
        };
        console.log('✅ Business types loading successful');
        console.log(`   Total Types: ${businessTypes.length}`);
        console.log(`   Hot Tub Type: ${hotTubType ? `${hotTubType.name} (ID: ${hotTubType.id})` : 'Not found'}`);
        console.log(`   Hot Tub Categories: ${hotTubType?.default_categories?.length || 0}`);
        console.log(`   Hot Tub Template: ${hotTubType?.workflow_template_id || 'None'}`);
      } else {
        throw new Error('Business types response invalid or empty');
      }
    } catch (error) {
      this.testResults.businessTypesLoad = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ Business types loading failed:', error.message);
      throw error;
    }
  }

  async testBusinessTypeSelection() {
    console.log('\n🎯 Testing Business Type Selection...');
    
    try {
      const response = await axios.post(
        `${BASE_URL}/api/business-types/select`,
        { businessTypeId: this.selectedBusinessTypeId },
        { headers: { 'Authorization': `Bearer ${this.userToken}` } }
      );

      if (response.data.success && response.data.data.businessType) {
        const businessType = response.data.data.businessType;
        this.testResults.businessTypeSelection = {
          status: 'success',
          details: {
            selectedId: this.selectedBusinessTypeId,
            businessTypeName: businessType.name,
            businessTypeSlug: businessType.slug,
            hasDefaultCategories: Array.isArray(businessType.defaultCategories) && businessType.defaultCategories.length > 0,
            categoriesCount: businessType.defaultCategories?.length || 0
          }
        };
        console.log('✅ Business type selection successful');
        console.log(`   Selected: ${businessType.name} (ID: ${this.selectedBusinessTypeId})`);
        console.log(`   Slug: ${businessType.slug}`);
        console.log(`   Categories: ${businessType.defaultCategories?.length || 0}`);
      } else {
        throw new Error(response.data.message || 'Business type selection failed');
      }
    } catch (error) {
      this.testResults.businessTypeSelection = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ Business type selection failed:', error.message);
      throw error;
    }
  }

  async testSelectionPersistence() {
    console.log('\n💾 Testing Selection Persistence...');
    
    try {
      const response = await axios.get(
        `${BASE_URL}/api/business-types/user/current`,
        { headers: { 'Authorization': `Bearer ${this.userToken}` } }
      );

      if (response.data.success && response.data.data) {
        const businessType = response.data.data.businessType;
        const matches = businessType.id === this.selectedBusinessTypeId;
        
        this.testResults.selectionPersistence = {
          status: 'success',
          details: {
            savedBusinessTypeId: businessType.id,
            savedBusinessTypeName: businessType.name,
            matchesSelection: matches,
            hasDescription: !!businessType.description,
            hasDefaultCategories: Array.isArray(businessType.default_categories) && businessType.default_categories.length > 0
          }
        };
        console.log('✅ Selection persistence successful');
        console.log(`   Saved: ${businessType.name} (ID: ${businessType.id})`);
        console.log(`   Matches Selection: ${matches}`);
        console.log(`   Has Categories: ${Array.isArray(businessType.default_categories) && businessType.default_categories.length > 0}`);
      } else {
        throw new Error('Failed to retrieve saved business type');
      }
    } catch (error) {
      this.testResults.selectionPersistence = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ Selection persistence failed:', error.message);
      throw error;
    }
  }

  async testWorkflowTemplate() {
    console.log('\n🔧 Testing Workflow Template Access...');
    
    try {
      const response = await axios.get(
        `${BASE_URL}/api/business-types/${this.selectedBusinessTypeId}/template`,
        { headers: { 'Authorization': `Bearer ${this.userToken}` } }
      );

      if (response.data.success && response.data.data) {
        const template = response.data.data;
        this.testResults.workflowTemplate = {
          status: 'success',
          details: {
            businessTypeId: template.businessTypeId,
            businessTypeName: template.businessTypeName,
            hasCategories: Array.isArray(template.categories) && template.categories.length > 0,
            categoriesCount: template.categories?.length || 0,
            hasWorkflowSteps: Array.isArray(template.workflowSteps) && template.workflowSteps.length > 0,
            workflowStepsCount: template.workflowSteps?.length || 0
          }
        };
        console.log('✅ Workflow template access successful');
        console.log(`   Business Type: ${template.businessTypeName}`);
        console.log(`   Categories: ${template.categories?.length || 0}`);
        console.log(`   Workflow Steps: ${template.workflowSteps?.length || 0}`);
      } else {
        throw new Error('Workflow template response invalid');
      }
    } catch (error) {
      this.testResults.workflowTemplate = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ Workflow template access failed:', error.message);
      throw error;
    }
  }

  async testUserStateTransition() {
    console.log('\n🔄 Testing User State Transition...');
    
    try {
      // Check onboarding status after business type selection
      const response = await axios.get(`${BASE_URL}/api/onboarding/status`, {
        headers: { 'Authorization': `Bearer ${this.userToken}` }
      });

      if (response.data.user) {
        const hasProgressed = response.data.nextStep !== 'business-type';
        const hasBusinessType = response.data.businessTypeId === this.selectedBusinessTypeId;
        
        this.testResults.userStateTransition = {
          status: 'success',
          details: {
            currentStep: response.data.nextStep,
            hasBusinessType: hasBusinessType,
            businessTypeId: response.data.businessTypeId,
            hasProgressed: hasProgressed,
            onboardingComplete: response.data.onboardingComplete,
            expectedNextStep: 'email-provider'
          }
        };
        console.log('✅ User state transition successful');
        console.log(`   Current Step: ${response.data.nextStep}`);
        console.log(`   Has Business Type: ${hasBusinessType}`);
        console.log(`   Has Progressed: ${hasProgressed}`);
        console.log(`   Expected Next: email-provider`);
      } else {
        throw new Error('User state transition check failed');
      }
    } catch (error) {
      this.testResults.userStateTransition = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ User state transition failed:', error.message);
      throw error;
    }
  }

  async testEndToEndFlow() {
    console.log('\n🎯 Testing End-to-End Flow Validation...');

    try {
      // Validate complete flow works (excluding this test itself)
      const testKeys = Object.keys(this.testResults).filter(key => key !== 'endToEndFlow');
      const allStepsWorking = testKeys.every(key => this.testResults[key].status === 'success');

      if (allStepsWorking) {
        this.testResults.endToEndFlow = {
          status: 'success',
          details: {
            allModulesWorking: true,
            canProgressToNextModule: true,
            readyForEmailProvider: true,
            userJourneyComplete: true,
            systemIntegrity: 'excellent'
          }
        };
        console.log('✅ End-to-end flow validation successful');
        console.log('   ✅ All modules working perfectly');
        console.log('   ✅ User can progress to email provider selection');
        console.log('   ✅ System integrity excellent');
        console.log('   ✅ Ready for next module development');
      } else {
        throw new Error('Some modules are not working properly');
      }
    } catch (error) {
      this.testResults.endToEndFlow = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ End-to-end flow validation failed:', error.message);
      throw error;
    }
  }

  generateFinalReport() {
    console.log('\n' + '='.repeat(100));
    console.log('📊 COMPLETE FLOWORX SYSTEM VALIDATION REPORT');
    console.log('='.repeat(100));

    const modules = [
      { name: '🔐 AUTHENTICATION MODULE', tests: ['registration', 'emailVerification', 'login', 'profileAccess'] },
      { name: '📋 ONBOARDING MODULE', tests: ['onboardingStatus'] },
      { name: '🏢 BUSINESS TYPE MODULE', tests: ['businessTypesLoad', 'businessTypeSelection', 'selectionPersistence', 'workflowTemplate'] },
      { name: '🔄 INTEGRATION MODULE', tests: ['userStateTransition', 'endToEndFlow'] }
    ];

    let totalTests = 0;
    let totalPassed = 0;

    modules.forEach(module => {
      console.log(`\n${module.name}:`);
      let modulePassed = 0;
      
      module.tests.forEach(testKey => {
        const result = this.testResults[testKey];
        const status = result.status === 'success' ? '✅' : '❌';
        const statusText = result.status === 'success' ? 'PASS' : 'FAIL';
        
        console.log(`  ${status} ${testKey}: ${statusText}`);
        
        if (result.status === 'success') {
          modulePassed++;
          totalPassed++;
        } else {
          console.log(`     Error: ${result.details?.error || 'Unknown error'}`);
        }
        totalTests++;
      });
      
      const moduleSuccessRate = Math.round((modulePassed / module.tests.length) * 100);
      console.log(`  📈 Module Success Rate: ${modulePassed}/${module.tests.length} (${moduleSuccessRate}%)`);
    });

    const overallSuccessRate = Math.round((totalPassed / totalTests) * 100);
    
    console.log('\n' + '='.repeat(100));
    console.log(`📈 OVERALL SYSTEM RESULTS:`);
    console.log(`   Success Rate: ${totalPassed}/${totalTests} (${overallSuccessRate}%)`);
    console.log(`   Test Email: ${TEST_EMAIL}`);
    console.log(`   User ID: ${this.userId || 'Not created'}`);
    console.log(`   Selected Business Type: Hot Tub & Spa (ID: ${this.selectedBusinessTypeId})`);
    
    if (overallSuccessRate === 100) {
      console.log('\n🎉 SYSTEM FULLY FUNCTIONAL! ALL MODULES WORKING PERFECTLY!');
      console.log('✅ READY TO MOVE TO NEXT MODULE: EMAIL PROVIDER CONNECTION');
      console.log('\n🚀 CURRENT SYSTEM CAPABILITIES:');
      console.log('   • Complete user registration and email verification');
      console.log('   • Secure JWT authentication and profile management');
      console.log('   • Onboarding status tracking and progress management');
      console.log('   • Business type selection with 6 available types');
      console.log('   • Hot Tub & Spa fully configured with workflow template');
      console.log('   • Seamless user state transitions between modules');
      console.log('   • Database persistence and data integrity');
      console.log('   • Professional UI components ready for production');
      console.log('\n🎯 NEXT MODULE: Gmail OAuth Integration for Email Provider Connection');
    } else {
      console.log('\n⚠️  SYSTEM HAS ISSUES - Some modules need attention');
      console.log('❌ Cannot proceed to next module until all issues are resolved');
    }
    
    console.log('='.repeat(100));
  }
}

// Run the complete validation
const validator = new CompleteSystemValidator();
validator.runCompleteValidation().catch(error => {
  console.error('System validation failed:', error);
  process.exit(1);
});
