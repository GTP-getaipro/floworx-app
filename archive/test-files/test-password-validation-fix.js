const { chromium } = require('playwright');

class PasswordValidationFixTest {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🔐 PASSWORD VALIDATION FIX TEST');
    console.log('=' .repeat(50));
    
    this.browser = await chromium.launch({ headless: false });
    this.page = await this.browser.newPage();
    
    // Listen for console messages
    this.page.on('console', msg => {
      if (msg.text().includes('🔍') || msg.text().includes('💾')) {
        console.log(`🖥️ BROWSER: ${msg.text()}`);
      }
    });
  }

  async testPasswordValidationFix() {
    console.log('\n🔧 TESTING PASSWORD VALIDATION FIX');
    console.log('─'.repeat(50));

    await this.page.goto('https://app.floworx-iq.com/register');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(3000);

    const tests = {
      weakPasswordRejected: false,
      missingSpecialCharRejected: false,
      strongPasswordAccepted: false,
      passwordMismatchDetected: false,
      passwordMatchAccepted: false
    };

    // Test 1: Weak password (too short) should be rejected
    console.log('   🚫 Testing weak password (too short)...');
    await this.page.fill('input[name="password"]', '123');
    await this.page.locator('input[name="password"]').blur();
    await this.page.waitForTimeout(1500);
    
    const weakPasswordError = await this.page.locator('p.text-danger').count();
    tests.weakPasswordRejected = weakPasswordError > 0;
    console.log(`   Weak password rejected: ${tests.weakPasswordRejected ? '✅' : '❌'}`);

    // Test 2: Password missing special character should be rejected
    console.log('   ❌ Testing password without special character...');
    await this.page.fill('input[name="password"]', 'Password123');
    await this.page.locator('input[name="password"]').blur();
    await this.page.waitForTimeout(1500);
    
    const noSpecialCharError = await this.page.locator('p.text-danger').count();
    const errorText = noSpecialCharError > 0 ? await this.page.locator('p.text-danger').first().textContent() : '';
    tests.missingSpecialCharRejected = noSpecialCharError > 0 && errorText.includes('special character');
    console.log(`   Missing special char rejected: ${tests.missingSpecialCharRejected ? '✅' : '❌'}`);
    if (errorText) console.log(`   Error message: "${errorText}"`);

    // Test 3: Strong password with special character should be accepted
    console.log('   ✅ Testing strong password with special character...');
    await this.page.fill('input[name="password"]', 'StrongPassword123!');
    await this.page.locator('input[name="password"]').blur();
    await this.page.waitForTimeout(1500);
    
    const strongPasswordError = await this.page.locator('p.text-danger').count();
    tests.strongPasswordAccepted = strongPasswordError === 0;
    console.log(`   Strong password accepted: ${tests.strongPasswordAccepted ? '✅' : '❌'}`);

    // Test 4: Password mismatch should be detected
    console.log('   🔄 Testing password mismatch detection...');
    await this.page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    await this.page.locator('input[name="confirmPassword"]').blur();
    await this.page.waitForTimeout(1500);
    
    const mismatchError = await this.page.locator('p.text-danger').count();
    const mismatchErrorText = mismatchError > 0 ? await this.page.locator('p.text-danger').first().textContent() : '';
    tests.passwordMismatchDetected = mismatchError > 0 && mismatchErrorText.includes('match');
    console.log(`   Password mismatch detected: ${tests.passwordMismatchDetected ? '✅' : '❌'}`);
    if (mismatchErrorText) console.log(`   Mismatch error: "${mismatchErrorText}"`);

    // Test 5: Matching passwords should be accepted
    console.log('   ✅ Testing matching passwords...');
    await this.page.fill('input[name="confirmPassword"]', 'StrongPassword123!');
    await this.page.locator('input[name="confirmPassword"]').blur();
    await this.page.waitForTimeout(1500);
    
    const matchError = await this.page.locator('p.text-danger').count();
    tests.passwordMatchAccepted = matchError === 0;
    console.log(`   Matching passwords accepted: ${tests.passwordMatchAccepted ? '✅' : '❌'}`);

    // Calculate score
    const passedTests = Object.values(tests).filter(Boolean).length;
    const totalTests = Object.keys(tests).length;
    const score = Math.round((passedTests / totalTests) * 100);

    console.log('\n📊 PASSWORD VALIDATION FIX RESULTS');
    console.log('─'.repeat(50));
    console.log(`🎯 Score: ${score}%`);
    console.log(`📈 Passed: ${passedTests}/${totalTests} tests`);
    
    console.log('\n🔍 DETAILED RESULTS');
    console.log('─'.repeat(30));
    console.log(`🚫 Weak password rejected: ${tests.weakPasswordRejected ? '✅' : '❌'}`);
    console.log(`❌ Missing special char rejected: ${tests.missingSpecialCharRejected ? '✅' : '❌'}`);
    console.log(`✅ Strong password accepted: ${tests.strongPasswordAccepted ? '✅' : '❌'}`);
    console.log(`🔄 Password mismatch detected: ${tests.passwordMismatchDetected ? '✅' : '❌'}`);
    console.log(`✅ Matching passwords accepted: ${tests.passwordMatchAccepted ? '✅' : '❌'}`);

    if (score >= 90) {
      console.log('\n🏆 EXCELLENT - Password validation fix working perfectly!');
    } else if (score >= 80) {
      console.log('\n✅ GREAT - Password validation mostly working!');
    } else if (score >= 70) {
      console.log('\n👍 GOOD - Password validation working well!');
    } else {
      console.log('\n⚠️ NEEDS WORK - Password validation issues remain!');
    }

    return { score, tests };
  }

  async testFormSubmissionWithValidPassword() {
    console.log('\n🚀 TESTING FORM SUBMISSION WITH VALID PASSWORD');
    console.log('─'.repeat(50));

    const testUser = {
      firstName: 'Password',
      lastName: 'Test',
      email: `passwordtest.${Date.now()}@example.com`,
      password: 'ValidPassword123!'
    };

    // Fill form with valid data
    await this.page.fill('input[name="firstName"]', testUser.firstName);
    await this.page.fill('input[name="lastName"]', testUser.lastName);
    await this.page.fill('input[name="email"]', testUser.email);
    await this.page.fill('input[name="password"]', testUser.password);
    await this.page.fill('input[name="confirmPassword"]', testUser.password);
    
    console.log('   📝 Form filled with valid data...');
    await this.page.waitForTimeout(2000);

    // Check for validation errors
    const errorCount = await this.page.locator('p.text-danger').count();
    console.log(`   Validation errors: ${errorCount}`);

    // Try to submit
    const submitButton = this.page.locator('button[type="submit"]');
    const buttonEnabled = await submitButton.isEnabled();
    console.log(`   Submit button enabled: ${buttonEnabled ? '✅' : '❌'}`);

    if (buttonEnabled) {
      await submitButton.click();
      await this.page.waitForTimeout(3000);
      
      const buttonDisabled = await submitButton.isDisabled();
      const loadingSpinner = await submitButton.locator('svg[class*="animate-spin"]').count();
      
      console.log(`   Form submission attempted: ${buttonDisabled || loadingSpinner > 0 ? '✅' : '❌'}`);
      console.log(`   Loading state shown: ${loadingSpinner > 0 ? '✅' : '❌'}`);
    }

    return { errorCount, buttonEnabled };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Run password validation fix test
async function runPasswordValidationFixTest() {
  const testSuite = new PasswordValidationFixTest();
  
  try {
    await testSuite.initialize();
    
    const validationResults = await testSuite.testPasswordValidationFix();
    const submissionResults = await testSuite.testFormSubmissionWithValidPassword();
    
    console.log('\n🎉 SUMMARY');
    console.log('─'.repeat(30));
    console.log(`Password validation: ${validationResults.score}%`);
    console.log(`Form submission: ${submissionResults.buttonEnabled ? 'Working' : 'Issues'}`);
    
    const overallScore = validationResults.score;
    
    if (overallScore >= 80) {
      console.log('\n🏆 SUCCESS - Password validation fix is working!');
    } else {
      console.log('\n⚠️ NEEDS ATTENTION - Some password validation issues remain');
    }
    
    return { overallScore, validationResults, submissionResults };
  } catch (error) {
    console.error('❌ Password validation fix test failed:', error);
    return { overallScore: 0 };
  } finally {
    await testSuite.cleanup();
  }
}

// Execute if run directly
if (require.main === module) {
  runPasswordValidationFixTest()
    .then(results => {
      console.log(`\n📋 Password validation fix test completed: ${results.overallScore}% score`);
      process.exit(results.overallScore >= 70 ? 0 : 1);
    })
    .catch(console.error);
}

module.exports = { PasswordValidationFixTest, runPasswordValidationFixTest };
