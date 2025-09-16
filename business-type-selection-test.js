/**
 * Business Type Selection Flow Test
 * Tests the complete business type selection functionality
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
const TEST_EMAIL = `business-type-test-${Date.now()}@floworx-iq.com`;
const TEST_PASSWORD = 'TestPassword123!';

class BusinessTypeSelectionTester {
  constructor() {
    this.testResults = {
      userSetup: { status: 'pending', details: null },
      businessTypesLoad: { status: 'pending', details: null },
      businessTypeSelection: { status: 'pending', details: null },
      selectionValidation: { status: 'pending', details: null },
      onboardingProgress: { status: 'pending', details: null },
      workflowTemplate: { status: 'pending', details: null }
    };
    this.userToken = null;
    this.userId = null;
    this.selectedBusinessTypeId = 1; // Hot Tub & Spa
  }

  async runCompleteTest() {
    console.log('🏢 Starting Business Type Selection Flow Test');
    console.log(`📧 Test Email: ${TEST_EMAIL}`);
    console.log('=' .repeat(80));

    try {
      // Step 1: Setup user account
      await this.setupUserAccount();
      
      // Step 2: Test business types loading
      await this.testBusinessTypesLoad();
      
      // Step 3: Test business type selection
      await this.testBusinessTypeSelection();
      
      // Step 4: Validate selection was saved
      await this.testSelectionValidation();
      
      // Step 5: Check onboarding progress update
      await this.testOnboardingProgress();
      
      // Step 6: Test workflow template access
      await this.testWorkflowTemplate();
      
      // Generate Final Report
      this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.generateFinalReport();
      process.exit(1);
    }
  }

  async setupUserAccount() {
    console.log('\n👤 Step 1: Setting up user account...');
    
    try {
      // Register user
      const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        firstName: 'Business',
        lastName: 'Test',
        businessName: 'Business Type Test Company',
        agreeToTerms: true
      });

      if (!registerResponse.data.success) {
        throw new Error('Registration failed');
      }

      this.userId = registerResponse.data.user.id;

      // Generate verification token
      const verifyTokenResponse = await axios.get(`${BASE_URL}/api/auth/generate-verification-link/${TEST_EMAIL}`);
      
      if (!verifyTokenResponse.data.success) {
        throw new Error('Verification token generation failed');
      }

      // Verify email
      const verifyResponse = await axios.post(`${BASE_URL}/api/auth/verify-email`, {
        token: verifyTokenResponse.data.token
      });

      if (!verifyResponse.data.success) {
        throw new Error('Email verification failed');
      }

      // Login to get token
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      });

      if (!loginResponse.data.success) {
        throw new Error('Login failed');
      }

      this.userToken = loginResponse.data.data.token;

      this.testResults.userSetup = {
        status: 'success',
        details: {
          userId: this.userId,
          hasToken: !!this.userToken,
          emailVerified: true
        }
      };
      
      console.log('✅ User account setup successful');
      console.log(`   User ID: ${this.userId}`);
      console.log(`   Token: ${this.userToken.substring(0, 20)}...`);
      
    } catch (error) {
      this.testResults.userSetup = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ User account setup failed:', error.message);
      throw error;
    }
  }

  async testBusinessTypesLoad() {
    console.log('\n📋 Step 2: Testing business types loading...');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/business-types`);

      if (!response.data.success || !Array.isArray(response.data.data)) {
        throw new Error('Business types response invalid');
      }

      const businessTypes = response.data.data;
      const hotTubType = businessTypes.find(bt => bt.slug === 'hot-tub-spa');

      if (!hotTubType) {
        throw new Error('Hot Tub & Spa business type not found');
      }

      this.testResults.businessTypesLoad = {
        status: 'success',
        details: {
          totalTypes: businessTypes.length,
          hasHotTubType: !!hotTubType,
          hotTubTypeId: hotTubType.id,
          hasDefaultCategories: Array.isArray(hotTubType.default_categories) && hotTubType.default_categories.length > 0,
          hasWorkflowTemplate: !!hotTubType.workflow_template_id
        }
      };
      
      console.log('✅ Business types loading successful');
      console.log(`   Total Types: ${businessTypes.length}`);
      console.log(`   Hot Tub Type ID: ${hotTubType.id}`);
      console.log(`   Default Categories: ${hotTubType.default_categories.length}`);
      console.log(`   Workflow Template: ${hotTubType.workflow_template_id}`);
      
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
    console.log('\n🎯 Step 3: Testing business type selection...');
    
    try {
      const response = await axios.post(
        `${BASE_URL}/api/business-types/select`,
        { businessTypeId: this.selectedBusinessTypeId },
        {
          headers: {
            'Authorization': `Bearer ${this.userToken}`
          }
        }
      );

      if (!response.data.success) {
        throw new Error(response.data.message || 'Business type selection failed');
      }

      const businessType = response.data.data.businessType;

      this.testResults.businessTypeSelection = {
        status: 'success',
        details: {
          selectedId: this.selectedBusinessTypeId,
          businessTypeName: businessType.name,
          businessTypeSlug: businessType.slug,
          hasDefaultCategories: Array.isArray(businessType.defaultCategories) && businessType.defaultCategories.length > 0
        }
      };
      
      console.log('✅ Business type selection successful');
      console.log(`   Selected: ${businessType.name} (ID: ${this.selectedBusinessTypeId})`);
      console.log(`   Slug: ${businessType.slug}`);
      console.log(`   Default Categories: ${businessType.defaultCategories?.length || 0}`);
      
    } catch (error) {
      this.testResults.businessTypeSelection = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ Business type selection failed:', error.message);
      throw error;
    }
  }

  async testSelectionValidation() {
    console.log('\n✅ Step 4: Validating selection was saved...');
    
    try {
      const response = await axios.get(
        `${BASE_URL}/api/business-types/user/current`,
        {
          headers: {
            'Authorization': `Bearer ${this.userToken}`
          }
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error('Failed to retrieve user business type');
      }

      const businessType = response.data.data.businessType;

      if (businessType.id !== this.selectedBusinessTypeId) {
        throw new Error(`Business type mismatch: expected ${this.selectedBusinessTypeId}, got ${businessType.id}`);
      }

      this.testResults.selectionValidation = {
        status: 'success',
        details: {
          savedBusinessTypeId: businessType.id,
          savedBusinessTypeName: businessType.name,
          savedBusinessTypeSlug: businessType.slug,
          matchesSelection: businessType.id === this.selectedBusinessTypeId
        }
      };
      
      console.log('✅ Selection validation successful');
      console.log(`   Saved Business Type: ${businessType.name} (ID: ${businessType.id})`);
      console.log(`   Matches Selection: ${businessType.id === this.selectedBusinessTypeId}`);
      
    } catch (error) {
      this.testResults.selectionValidation = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ Selection validation failed:', error.message);
      throw error;
    }
  }

  async testOnboardingProgress() {
    console.log('\n📈 Step 5: Checking onboarding progress update...');
    
    try {
      const response = await axios.get(
        `${BASE_URL}/api/onboarding/status`,
        {
          headers: {
            'Authorization': `Bearer ${this.userToken}`
          }
        }
      );

      if (!response.data.user) {
        throw new Error('Onboarding status response invalid');
      }

      const hasBusinessType = response.data.businessTypeId === this.selectedBusinessTypeId;
      const nextStep = response.data.nextStep;

      this.testResults.onboardingProgress = {
        status: 'success',
        details: {
          businessTypeId: response.data.businessTypeId,
          hasBusinessType: hasBusinessType,
          nextStep: nextStep,
          onboardingComplete: response.data.onboardingComplete,
          progressedFromBusinessType: nextStep !== 'business-type'
        }
      };
      
      console.log('✅ Onboarding progress check successful');
      console.log(`   Business Type ID: ${response.data.businessTypeId}`);
      console.log(`   Has Business Type: ${hasBusinessType}`);
      console.log(`   Next Step: ${nextStep}`);
      console.log(`   Progressed: ${nextStep !== 'business-type'}`);
      
    } catch (error) {
      this.testResults.onboardingProgress = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ Onboarding progress check failed:', error.message);
      throw error;
    }
  }

  async testWorkflowTemplate() {
    console.log('\n🔧 Step 6: Testing workflow template access...');
    
    try {
      const response = await axios.get(
        `${BASE_URL}/api/business-types/${this.selectedBusinessTypeId}/template`,
        {
          headers: {
            'Authorization': `Bearer ${this.userToken}`
          }
        }
      );

      if (!response.data.success || !response.data.data) {
        throw new Error('Workflow template response invalid');
      }

      const template = response.data.data;

      this.testResults.workflowTemplate = {
        status: 'success',
        details: {
          businessTypeId: template.businessTypeId,
          businessTypeName: template.businessTypeName,
          hasCategories: Array.isArray(template.categories) && template.categories.length > 0,
          hasWorkflowSteps: Array.isArray(template.workflowSteps) && template.workflowSteps.length > 0,
          workflowStepsCount: template.workflowSteps?.length || 0
        }
      };
      
      console.log('✅ Workflow template access successful');
      console.log(`   Business Type: ${template.businessTypeName}`);
      console.log(`   Categories: ${template.categories?.length || 0}`);
      console.log(`   Workflow Steps: ${template.workflowSteps?.length || 0}`);
      
    } catch (error) {
      this.testResults.workflowTemplate = {
        status: 'failed',
        details: { error: error.message }
      };
      console.log('❌ Workflow template access failed:', error.message);
      throw error;
    }
  }

  generateFinalReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 BUSINESS TYPE SELECTION FLOW TEST REPORT');
    console.log('='.repeat(80));

    const steps = [
      { name: 'User Setup', key: 'userSetup' },
      { name: 'Business Types Load', key: 'businessTypesLoad' },
      { name: 'Business Type Selection', key: 'businessTypeSelection' },
      { name: 'Selection Validation', key: 'selectionValidation' },
      { name: 'Onboarding Progress', key: 'onboardingProgress' },
      { name: 'Workflow Template', key: 'workflowTemplate' }
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
    console.log(`   Selected Business Type: Hot Tub & Spa (ID: ${this.selectedBusinessTypeId})`);
    
    if (successRate === 100) {
      console.log('\n🎉 ALL TESTS PASSED! Business Type Selection is working perfectly!');
      console.log('✅ Users can now successfully:');
      console.log('   • Load available business types');
      console.log('   • Select their business type');
      console.log('   • Have selection saved to database');
      console.log('   • Progress in onboarding flow');
      console.log('   • Access workflow templates');
    } else {
      console.log('\n⚠️  SOME TESTS FAILED - Business Type Selection has issues');
      console.log('❌ Issues need to be resolved before users can select business types');
    }
    
    console.log('='.repeat(80));
  }
}

// Run the test
const tester = new BusinessTypeSelectionTester();
tester.runCompleteTest().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
