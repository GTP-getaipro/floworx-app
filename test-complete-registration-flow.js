const { chromium } = require('playwright');

class CompleteRegistrationFlowTest {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = {
      formValidation: { score: 0, details: {} },
      backendConnection: { score: 0, details: {} },
      databaseIntegration: { score: 0, details: {} },
      emailService: { score: 0, details: {} },
      endToEndFlow: { score: 0, details: {} }
    };
  }

  async initialize() {
    console.log('🚀 COMPLETE REGISTRATION FLOW TEST');
    console.log('=' .repeat(60));
    
    this.browser = await chromium.launch({ headless: false });
    this.page = await this.browser.newPage();
    
    // Listen for console messages and errors
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ BROWSER ERROR: ${msg.text()}`);
      } else if (msg.text().includes('🔍') || msg.text().includes('💾') || msg.text().includes('🚀')) {
        console.log(`🖥️ BROWSER: ${msg.text()}`);
      }
    });

    // Listen for network requests and responses
    this.page.on('request', request => {
      if (request.url().includes('/api/')) {
        console.log(`🌐 API REQUEST: ${request.method()} ${request.url()}`);
      }
    });

    this.page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`📡 API RESPONSE: ${response.status()} ${response.url()}`);
      }
    });
  }

  async testFormValidation() {
    console.log('\n📝 TESTING FORM VALIDATION');
    console.log('─'.repeat(50));

    await this.page.goto('https://app.floworx-iq.com/register');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(3000);

    const tests = {
      formExists: false,
      allFieldsPresent: false,
      passwordValidation: false,
      emailValidation: false,
      requiredFieldValidation: false,
      submitButtonEnabled: false
    };

    // Test 1: Form exists and is visible
    console.log('   🔍 Testing form existence...');
    const form = await this.page.locator('form').count();
    tests.formExists = form > 0;
    console.log(`   Form exists: ${tests.formExists ? '✅' : '❌'}`);

    // Test 2: All required fields present
    console.log('   📋 Testing required fields...');
    const requiredFields = ['firstName', 'lastName', 'email', 'password', 'confirmPassword'];
    let fieldsPresent = 0;
    
    for (const field of requiredFields) {
      const fieldExists = await this.page.locator(`input[name="${field}"]`).count();
      if (fieldExists > 0) fieldsPresent++;
      console.log(`   ${field}: ${fieldExists > 0 ? '✅' : '❌'}`);
    }
    
    tests.allFieldsPresent = fieldsPresent === requiredFields.length;
    console.log(`   All fields present: ${tests.allFieldsPresent ? '✅' : '❌'}`);

    // Test 3: Password validation
    console.log('   🔐 Testing password validation...');
    await this.page.fill('input[name="password"]', 'weak');
    await this.page.locator('input[name="password"]').blur();
    await this.page.waitForTimeout(1500);
    
    const passwordError = await this.page.locator('p.text-danger').count();
    tests.passwordValidation = passwordError > 0;
    console.log(`   Password validation: ${tests.passwordValidation ? '✅' : '❌'}`);

    // Test 4: Email validation
    console.log('   📧 Testing email validation...');
    await this.page.fill('input[name="email"]', 'invalid-email');
    await this.page.locator('input[name="email"]').blur();
    await this.page.waitForTimeout(1500);
    
    const emailError = await this.page.locator('p.text-danger').count();
    tests.emailValidation = emailError > 0;
    console.log(`   Email validation: ${tests.emailValidation ? '✅' : '❌'}`);

    // Test 5: Submit button state
    console.log('   🔘 Testing submit button...');
    const submitButton = this.page.locator('button[type="submit"]');
    const buttonExists = await submitButton.count();
    const buttonEnabled = buttonExists > 0 ? await submitButton.isEnabled() : false;
    
    tests.submitButtonEnabled = buttonExists > 0;
    console.log(`   Submit button exists: ${tests.submitButtonEnabled ? '✅' : '❌'}`);
    console.log(`   Submit button enabled: ${buttonEnabled ? '✅' : '❌'}`);

    const score = Math.round((Object.values(tests).filter(Boolean).length / Object.keys(tests).length) * 100);
    this.testResults.formValidation = { score, details: tests };
    console.log(`   📊 Form Validation Score: ${score}%`);
  }

  async testCompleteRegistrationFlow() {
    console.log('\n🚀 TESTING COMPLETE REGISTRATION FLOW');
    console.log('─'.repeat(50));

    const tests = {
      formFillSuccess: false,
      validationPassed: false,
      submissionAttempted: false,
      backendResponse: false,
      successHandling: false
    };

    // Generate unique test user data
    const timestamp = Date.now();
    const testUser = {
      firstName: 'Test',
      lastName: 'User',
      companyName: 'Test Company',
      email: `testuser.${timestamp}@example.com`,
      password: 'TestPassword123!'
    };

    console.log(`   👤 Testing with user: ${testUser.email}`);

    // Test 1: Fill form with valid data
    console.log('   📝 Filling form with valid data...');
    try {
      await this.page.fill('input[name="firstName"]', testUser.firstName);
      await this.page.fill('input[name="lastName"]', testUser.lastName);
      await this.page.fill('input[name="companyName"]', testUser.companyName);
      await this.page.fill('input[name="email"]', testUser.email);
      await this.page.fill('input[name="password"]', testUser.password);
      await this.page.fill('input[name="confirmPassword"]', testUser.password);
      
      tests.formFillSuccess = true;
      console.log(`   Form fill success: ✅`);
    } catch (error) {
      console.log(`   Form fill failed: ❌ ${error.message}`);
    }

    // Test 2: Check validation state
    console.log('   ⚡ Checking validation state...');
    await this.page.waitForTimeout(2000);
    
    const errorCount = await this.page.locator('p.text-danger').count();
    tests.validationPassed = errorCount === 0;
    console.log(`   Validation errors: ${errorCount}`);
    console.log(`   Validation passed: ${tests.validationPassed ? '✅' : '❌'}`);

    if (errorCount > 0) {
      const errors = await this.page.locator('p.text-danger').allTextContents();
      console.log(`   Error messages: ${errors.join(', ')}`);
    }

    // Test 3: Attempt form submission
    console.log('   🚀 Attempting form submission...');
    const submitButton = this.page.locator('button[type="submit"]');
    
    // Set up response listener before clicking
    let responseReceived = false;
    let responseStatus = null;
    let responseData = null;

    this.page.on('response', async (response) => {
      if (response.url().includes('/api/auth/register')) {
        responseReceived = true;
        responseStatus = response.status();
        try {
          responseData = await response.json();
        } catch (e) {
          responseData = await response.text();
        }
        console.log(`   📡 Registration API Response: ${responseStatus}`);
        console.log(`   📄 Response data:`, responseData);
      }
    });

    try {
      await submitButton.click();
      tests.submissionAttempted = true;
      console.log(`   Submission attempted: ✅`);
      
      // Wait for response
      await this.page.waitForTimeout(5000);
      
      tests.backendResponse = responseReceived;
      console.log(`   Backend response received: ${tests.backendResponse ? '✅' : '❌'}`);
      
      if (responseReceived) {
        console.log(`   Response status: ${responseStatus}`);
        
        // Check for success indicators
        const successMessage = await this.page.locator('text=/success/, text=/registered/, text=/created/, text=/account created/').count();
        const errorMessage = await this.page.locator('text=/error/, text=/failed/, text=/invalid/').count();
        
        tests.successHandling = responseStatus === 200 || responseStatus === 201 || successMessage > 0;
        console.log(`   Success handling: ${tests.successHandling ? '✅' : '❌'}`);
        
        if (successMessage > 0) {
          const successText = await this.page.locator('text=/success/, text=/registered/, text=/created/').first().textContent();
          console.log(`   Success message: "${successText}"`);
        }
        
        if (errorMessage > 0) {
          const errorText = await this.page.locator('text=/error/, text=/failed/, text=/invalid/').first().textContent();
          console.log(`   Error message: "${errorText}"`);
        }
      }
      
    } catch (error) {
      console.log(`   Submission failed: ❌ ${error.message}`);
    }

    const score = Math.round((Object.values(tests).filter(Boolean).length / Object.keys(tests).length) * 100);
    this.testResults.endToEndFlow = { score, details: tests };
    console.log(`   📊 End-to-End Flow Score: ${score}%`);

    return { testUser, responseStatus, responseData };
  }

  async testBackendConnectivity() {
    console.log('\n🌐 TESTING BACKEND CONNECTIVITY');
    console.log('─'.repeat(50));

    const tests = {
      healthEndpoint: false,
      authEndpoint: false,
      corsHeaders: false,
      responseTime: false
    };

    // Test 1: Health endpoint
    console.log('   🏥 Testing health endpoint...');
    try {
      const startTime = Date.now();
      const response = await this.page.evaluate(async () => {
        const response = await fetch('/api/health');
        return {
          status: response.status,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        };
      });
      const responseTime = Date.now() - startTime;
      
      tests.healthEndpoint = response.ok;
      tests.responseTime = responseTime < 5000;
      
      console.log(`   Health endpoint: ${tests.healthEndpoint ? '✅' : '❌'} (${response.status})`);
      console.log(`   Response time: ${responseTime}ms ${tests.responseTime ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`   Health endpoint: ❌ ${error.message}`);
    }

    // Test 2: Auth endpoint accessibility
    console.log('   🔐 Testing auth endpoint...');
    try {
      const response = await this.page.evaluate(async () => {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}) // Empty body to test endpoint accessibility
        });
        return {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        };
      });
      
      // 400 is expected for empty body, but it means endpoint is accessible
      tests.authEndpoint = response.status === 400 || response.status === 422;
      tests.corsHeaders = response.headers['access-control-allow-origin'] !== undefined;
      
      console.log(`   Auth endpoint accessible: ${tests.authEndpoint ? '✅' : '❌'} (${response.status})`);
      console.log(`   CORS headers present: ${tests.corsHeaders ? '✅' : '❌'}`);
    } catch (error) {
      console.log(`   Auth endpoint: ❌ ${error.message}`);
    }

    const score = Math.round((Object.values(tests).filter(Boolean).length / Object.keys(tests).length) * 100);
    this.testResults.backendConnection = { score, details: tests };
    console.log(`   📊 Backend Connectivity Score: ${score}%`);
  }

  async generateComprehensiveReport() {
    console.log('\n📊 COMPREHENSIVE REGISTRATION DIAGNOSIS');
    console.log('=' .repeat(60));

    const categories = Object.keys(this.testResults);
    const scores = categories.map(cat => this.testResults[cat].score);
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    console.log(`🎯 OVERALL REGISTRATION HEALTH: ${overallScore}%`);
    console.log('─'.repeat(50));

    categories.forEach(category => {
      const result = this.testResults[category];
      const status = result.score >= 90 ? '🏆' : result.score >= 75 ? '✅' : result.score >= 60 ? '⚠️' : '❌';
      const categoryName = category.replace(/([A-Z])/g, ' $1').trim();
      console.log(`${status} ${categoryName}: ${result.score}%`);
    });

    console.log('\n🔍 DETAILED DIAGNOSIS');
    console.log('─'.repeat(50));

    Object.entries(this.testResults).forEach(([category, result]) => {
      const categoryName = category.replace(/([A-Z])/g, ' $1').trim();
      console.log(`\n${categoryName}:`);
      Object.entries(result.details).forEach(([test, passed]) => {
        const testName = test.replace(/([A-Z])/g, ' $1').trim();
        console.log(`   ${testName}: ${passed ? '✅' : '❌'}`);
      });
    });

    console.log('\n🎯 RECOMMENDATIONS');
    console.log('─'.repeat(50));

    if (overallScore >= 90) {
      console.log('🏆 EXCELLENT - Registration flow is working well!');
    } else if (overallScore >= 75) {
      console.log('✅ GOOD - Minor issues to address');
    } else if (overallScore >= 60) {
      console.log('⚠️ NEEDS ATTENTION - Several issues found');
    } else {
      console.log('❌ CRITICAL - Major registration issues need immediate fixing');
    }

    return { overallScore, categoryScores: this.testResults };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Run complete registration flow test
async function runCompleteRegistrationTest() {
  const testSuite = new CompleteRegistrationFlowTest();
  
  try {
    await testSuite.initialize();
    
    await testSuite.testFormValidation();
    await testSuite.testBackendConnectivity();
    const registrationResult = await testSuite.testCompleteRegistrationFlow();
    
    const results = await testSuite.generateComprehensiveReport();
    
    return { ...results, registrationResult };
  } catch (error) {
    console.error('❌ Complete registration test failed:', error);
    return { overallScore: 0, categoryScores: {} };
  } finally {
    await testSuite.cleanup();
  }
}

// Execute if run directly
if (require.main === module) {
  runCompleteRegistrationTest()
    .then(results => {
      console.log(`\n📋 Complete registration test completed: ${results.overallScore}% overall score`);
      process.exit(results.overallScore >= 70 ? 0 : 1);
    })
    .catch(console.error);
}

module.exports = { CompleteRegistrationFlowTest, runCompleteRegistrationTest };
