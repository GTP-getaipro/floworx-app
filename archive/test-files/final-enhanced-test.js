const { chromium } = require('playwright');

async function runFinalEnhancedTest() {
  console.log('🎯 FINAL ENHANCED UX FEATURES TEST');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'log' && msg.text().includes('💾') || msg.text().includes('📥')) {
      console.log(`🖥️ BROWSER: ${msg.text()}`);
    }
  });

  const testResults = {
    progressIndicator: false,
    enhancedInputs: false,
    realTimeValidation: false,
    formPersistence: false,
    persistenceNotification: false,
    enhancedToasts: false,
    doubleClickProtection: false,
    loadingStates: false,
    successIndicators: false
  };

  try {
    // Navigate to registration page
    console.log('📍 Navigating to registration page...');
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('✅ Page loaded successfully');

    // Test 1: Progress Indicator
    console.log('\n📊 Testing Progress Indicator...');
    const progressSteps = await page.locator('div[class*="rounded-full"][class*="border-2"]').count();
    testResults.progressIndicator = progressSteps >= 3;
    console.log(`✅ Progress steps found: ${progressSteps} - ${testResults.progressIndicator ? 'PASS' : 'FAIL'}`);

    // Test 2: Enhanced Input Components
    console.log('\n📝 Testing Enhanced Input Components...');
    const inputFields = await page.locator('input[name="firstName"], input[name="lastName"], input[name="email"]').count();
    testResults.enhancedInputs = inputFields >= 3;
    console.log(`✅ Enhanced inputs found: ${inputFields} - ${testResults.enhancedInputs ? 'PASS' : 'FAIL'}`);

    // Test 3: Real-time Validation
    console.log('\n⚡ Testing Real-time Validation...');
    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill('invalid-email');
    await emailInput.blur();
    await page.waitForTimeout(1000);
    
    const validationError = await page.locator('text=/Please enter a valid email/, text=/Invalid email format/').count();
    testResults.realTimeValidation = validationError > 0;
    console.log(`✅ Email validation error shown: ${testResults.realTimeValidation ? 'PASS' : 'FAIL'}`);

    // Test 4: Form Persistence
    console.log('\n💾 Testing Form Persistence...');
    const testData = {
      firstName: 'Enhanced',
      lastName: 'Test',
      companyName: 'Enhanced Testing Co'
    };

    await page.fill('input[name="firstName"]', testData.firstName);
    await page.fill('input[name="lastName"]', testData.lastName);
    await page.fill('input[name="companyName"]', testData.companyName);
    
    // Wait for persistence
    await page.waitForTimeout(2000);
    
    // Navigate away and back
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForTimeout(1000);
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Check if data was restored
    const restoredFirstName = await page.inputValue('input[name="firstName"]');
    const restoredLastName = await page.inputValue('input[name="lastName"]');
    
    testResults.formPersistence = restoredFirstName === testData.firstName && restoredLastName === testData.lastName;
    console.log(`✅ Form persistence: ${testResults.formPersistence ? 'PASS' : 'FAIL'}`);
    console.log(`   - Restored firstName: "${restoredFirstName}"`);
    console.log(`   - Restored lastName: "${restoredLastName}"`);

    // Test 5: Persistence Notification
    const persistenceNotification = await page.locator('text=/Previous data restored/, text=/restored from/').count();
    testResults.persistenceNotification = persistenceNotification > 0;
    console.log(`✅ Persistence notification: ${testResults.persistenceNotification ? 'PASS' : 'FAIL'}`);

    // Test 6: Enhanced Toast System
    console.log('\n🍞 Testing Enhanced Toast System...');
    
    // Fill form with invalid data to trigger error
    await page.fill('input[name="firstName"]', 'Toast');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', 'invalid-email-format');
    await page.fill('input[name="password"]', 'ToastTest123!');
    await page.fill('input[name="confirmPassword"]', 'ToastTest123!');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    const toastContainer = await page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"]').count();
    const toastWithContent = await page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"] p').count();
    
    testResults.enhancedToasts = toastContainer > 0 && toastWithContent > 0;
    console.log(`✅ Enhanced toasts: ${testResults.enhancedToasts ? 'PASS' : 'FAIL'}`);

    // Test 7: Double-click Protection
    console.log('\n🛡️ Testing Double-click Protection...');
    
    // Monitor network requests
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/api/auth/register')) {
        requests.push({ timestamp: Date.now() });
      }
    });
    
    // Fill valid form data
    await page.fill('input[name="firstName"]', 'DoubleClick');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', `doubleclick.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'DoubleClickTest123!');
    await page.fill('input[name="confirmPassword"]', 'DoubleClickTest123!');
    
    // Rapid clicks
    const submitButton = page.locator('button[type="submit"]');
    for (let i = 0; i < 3; i++) {
      await submitButton.click();
      await page.waitForTimeout(100);
    }
    
    await page.waitForTimeout(3000);
    
    testResults.doubleClickProtection = requests.length <= 1;
    console.log(`✅ Double-click protection: ${testResults.doubleClickProtection ? 'PASS' : 'FAIL'}`);
    console.log(`   - Registration requests made: ${requests.length}`);

    // Test 8: Loading States
    const loadingSpinner = await submitButton.locator('svg[class*="animate-spin"]').count();
    const loadingText = await submitButton.textContent();
    
    testResults.loadingStates = loadingSpinner > 0 || loadingText.includes('Creating');
    console.log(`✅ Loading states: ${testResults.loadingStates ? 'PASS' : 'FAIL'}`);

    // Test 9: Success Indicators
    console.log('\n✨ Testing Success Indicators...');
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    await page.fill('input[name="firstName"]', 'Success');
    await page.locator('input[name="firstName"]').blur();
    await page.waitForTimeout(1000);
    
    const successIndicator = await page.locator('svg[class*="text-green-500"]').count();
    testResults.successIndicators = successIndicator > 0;
    console.log(`✅ Success indicators: ${testResults.successIndicators ? 'PASS' : 'FAIL'}`);

    // Calculate Results
    const passedTests = Object.values(testResults).filter(Boolean).length;
    const totalTests = Object.keys(testResults).length;
    const successRate = Math.round((passedTests / totalTests) * 100);

    console.log('\n🎯 FINAL TEST RESULTS');
    console.log('=' .repeat(60));
    
    Object.entries(testResults).forEach(([feature, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      const name = feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`${status.padEnd(10)} ${name}`);
    });

    console.log('\n📊 OVERALL ASSESSMENT');
    console.log('─'.repeat(40));
    console.log(`🎯 Success Rate: ${successRate}%`);
    console.log(`📈 Passed Tests: ${passedTests}/${totalTests}`);

    if (successRate >= 85) {
      console.log('🏆 EXCELLENT - Enhanced UX features working great!');
    } else if (successRate >= 70) {
      console.log('👍 GOOD - Most enhanced features working');
    } else if (successRate >= 50) {
      console.log('⚠️ FAIR - Some enhanced features working');
    } else {
      console.log('❌ POOR - Major issues with enhanced features');
    }

    console.log('\n🚀 PRODUCTION READINESS');
    console.log('─'.repeat(40));
    if (successRate >= 75) {
      console.log('✅ READY - Enhanced features successfully deployed');
      console.log('🎉 Users will experience significantly improved UX');
    } else {
      console.log('⚠️ NEEDS WORK - Some features need attention');
      console.log('🔧 Consider addressing failing tests before full rollout');
    }

    return { successRate, passedTests, totalTests, testResults };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { successRate: 0, passedTests: 0, totalTests: 9, testResults };
  } finally {
    await browser.close();
  }
}

// Run the final test
runFinalEnhancedTest()
  .then(results => {
    console.log('\n📋 Test completed with', results.successRate + '% success rate');
    process.exit(results.successRate >= 75 ? 0 : 1);
  })
  .catch(console.error);
