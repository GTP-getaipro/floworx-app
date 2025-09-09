const { chromium } = require('playwright');

async function testProductionEnhancedFeatures() {
  console.log('🎯 TESTING ENHANCED UX FEATURES IN PRODUCTION');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Set viewport to test different screen sizes
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'log' && (msg.text().includes('💾') || msg.text().includes('📥') || msg.text().includes('🔄'))) {
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
    successIndicators: false,
    loginWindowFits: false
  };

  try {
    // Test 1: Check Login Window Sizing
    console.log('🖥️ Testing Login Window Sizing...');
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check if login form fits without scrolling
    const loginFormHeight = await page.evaluate(() => {
      const form = document.querySelector('form');
      const card = document.querySelector('[class*="bg-surface"]');
      const viewport = window.innerHeight;
      
      return {
        formHeight: form ? form.offsetHeight : 0,
        cardHeight: card ? card.offsetHeight : 0,
        viewportHeight: viewport,
        needsScroll: document.body.scrollHeight > viewport,
        bodyHeight: document.body.scrollHeight
      };
    });

    testResults.loginWindowFits = !loginFormHeight.needsScroll && loginFormHeight.cardHeight < loginFormHeight.viewportHeight * 0.9;
    
    console.log(`✅ Login form dimensions:`);
    console.log(`   - Card height: ${loginFormHeight.cardHeight}px`);
    console.log(`   - Viewport height: ${loginFormHeight.viewportHeight}px`);
    console.log(`   - Body height: ${loginFormHeight.bodyHeight}px`);
    console.log(`   - Needs scroll: ${loginFormHeight.needsScroll ? 'YES' : 'NO'}`);
    console.log(`   - Fits properly: ${testResults.loginWindowFits ? 'YES' : 'NO'}`);

    // Test different screen sizes for login
    const screenSizes = [
      { width: 1366, height: 768, name: 'Laptop' },
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 1440, height: 900, name: 'MacBook' }
    ];

    for (const size of screenSizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(500);
      
      const sizeTest = await page.evaluate(() => {
        const card = document.querySelector('[class*="bg-surface"]');
        const viewport = window.innerHeight;
        return {
          cardHeight: card ? card.offsetHeight : 0,
          viewportHeight: viewport,
          needsScroll: document.body.scrollHeight > viewport
        };
      });
      
      console.log(`   - ${size.name} (${size.width}x${size.height}): ${sizeTest.needsScroll ? 'NEEDS SCROLL' : 'FITS'}`);
    }

    // Reset to standard size
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Test 2: Navigate to Registration and Test Enhanced Features
    console.log('\n📝 Testing Registration Enhanced Features...');
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Test Progress Indicator
    console.log('\n📊 Testing Progress Indicator...');
    const progressSteps = await page.locator('div[class*="rounded-full"][class*="border-2"]').count();
    testResults.progressIndicator = progressSteps >= 3;
    console.log(`✅ Progress steps: ${progressSteps} - ${testResults.progressIndicator ? 'PASS' : 'FAIL'}`);

    // Test Enhanced Input Components
    console.log('\n📝 Testing Enhanced Input Components...');
    const inputFields = await page.locator('input[name="firstName"], input[name="lastName"], input[name="email"]').count();
    testResults.enhancedInputs = inputFields >= 3;
    console.log(`✅ Enhanced inputs: ${inputFields} - ${testResults.enhancedInputs ? 'PASS' : 'FAIL'}`);

    // Test Real-time Validation
    console.log('\n⚡ Testing Real-time Validation...');
    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill('invalid-email');
    await emailInput.blur();
    await page.waitForTimeout(1000);
    
    const validationError = await page.locator('text=/Invalid email format/, text=/Please enter a valid email/').count();
    testResults.realTimeValidation = validationError > 0;
    console.log(`✅ Email validation: ${testResults.realTimeValidation ? 'PASS' : 'FAIL'}`);

    // Test Form Persistence
    console.log('\n💾 Testing Form Persistence...');
    const testData = {
      firstName: 'Enhanced',
      lastName: 'Test',
      companyName: 'Enhanced Testing Co'
    };

    await page.fill('input[name="firstName"]', testData.firstName);
    await page.fill('input[name="lastName"]', testData.lastName);
    await page.fill('input[name="companyName"]', testData.companyName);
    
    await page.waitForTimeout(2000);
    
    // Navigate away and back
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForTimeout(1000);
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(4000);
    
    // Check if data was restored
    const restoredFirstName = await page.inputValue('input[name="firstName"]');
    const restoredLastName = await page.inputValue('input[name="lastName"]');
    
    testResults.formPersistence = restoredFirstName === testData.firstName && restoredLastName === testData.lastName;
    console.log(`✅ Form persistence: ${testResults.formPersistence ? 'PASS' : 'FAIL'}`);
    console.log(`   - Expected: "${testData.firstName}", Got: "${restoredFirstName}"`);

    // Test Persistence Notification
    const persistenceNotification = await page.locator('text=/Previous data restored/, text=/restored your previous form data/').count();
    testResults.persistenceNotification = persistenceNotification > 0;
    console.log(`✅ Persistence notification: ${testResults.persistenceNotification ? 'PASS' : 'FAIL'}`);

    // Test Enhanced Toast System
    console.log('\n🍞 Testing Enhanced Toast System...');
    const toastContainer = await page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"]').count();
    const toastWithContent = await page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"] p').count();
    
    testResults.enhancedToasts = toastContainer > 0 && toastWithContent > 0;
    console.log(`✅ Enhanced toasts: ${testResults.enhancedToasts ? 'PASS' : 'FAIL'}`);

    // Test Loading States
    console.log('\n🔄 Testing Loading States...');
    
    // Fill form with valid data
    await page.fill('input[name="firstName"]', 'Loading');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', `loading.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'LoadingTest123!');
    await page.fill('input[name="confirmPassword"]', 'LoadingTest123!');
    
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    await page.waitForTimeout(1000);
    
    const loadingSpinner = await submitButton.locator('svg[class*="animate-spin"]').count();
    const loadingText = await submitButton.textContent();
    
    testResults.loadingStates = loadingSpinner > 0 || loadingText.includes('Creating');
    console.log(`✅ Loading states: ${testResults.loadingStates ? 'PASS' : 'FAIL'}`);

    // Test Success Indicators
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

    console.log('\n🎯 PRODUCTION TEST RESULTS');
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

    console.log('\n🚀 PRODUCTION STATUS');
    console.log('─'.repeat(40));
    if (testResults.loginWindowFits) {
      console.log('✅ LOGIN WINDOW: Fits properly without scrolling');
    } else {
      console.log('⚠️ LOGIN WINDOW: May require scrolling on some screens');
    }

    if (successRate >= 75) {
      console.log('✅ ENHANCED FEATURES: Successfully deployed and working');
    } else {
      console.log('⚠️ ENHANCED FEATURES: Some features need attention');
    }

    return { successRate, passedTests, totalTests, testResults };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { successRate: 0, passedTests: 0, totalTests: 10, testResults };
  } finally {
    await browser.close();
  }
}

// Run the test
testProductionEnhancedFeatures()
  .then(results => {
    console.log('\n📋 Production test completed with', results.successRate + '% success rate');
    process.exit(results.successRate >= 70 ? 0 : 1);
  })
  .catch(console.error);
