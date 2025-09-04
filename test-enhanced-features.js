const { chromium } = require('playwright');

async function testEnhancedFeatures() {
  console.log('🚀 Testing Enhanced UX Features in Production');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to registration page
    console.log('📍 Navigating to registration page...');
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded successfully');

    // Test 1: Check for Progress Indicator
    console.log('\n📊 Testing Progress Indicator...');
    const progressIndicator = await page.locator('div[class*="rounded-full"][class*="border-2"]').count();
    console.log(`✅ Progress indicator steps found: ${progressIndicator}`);

    // Test 2: Check for Enhanced Form Components
    console.log('\n📝 Testing Enhanced Form Components...');
    
    // Check for ValidatedInput components (should have success indicators)
    const inputFields = await page.locator('input[name="firstName"], input[name="lastName"], input[name="email"]').count();
    console.log(`✅ Enhanced input fields found: ${inputFields}`);

    // Test 3: Real-time Validation
    console.log('\n⚡ Testing Real-time Validation...');
    
    // Test email validation
    await page.fill('input[name="email"]', 'invalid-email');
    await page.locator('input[name="email"]').blur();
    await page.waitForTimeout(500);
    
    const emailValidationError = await page.locator('text=/Please enter a valid email/').count();
    console.log(`✅ Email validation working: ${emailValidationError > 0 ? 'YES' : 'NO'}`);

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
    await page.waitForTimeout(1000);
    
    // Navigate away and back
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForTimeout(500);
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // Check if data was restored
    const restoredFirstName = await page.inputValue('input[name="firstName"]');
    const restoredLastName = await page.inputValue('input[name="lastName"]');
    
    console.log(`✅ Form persistence working: ${restoredFirstName === testData.firstName ? 'YES' : 'NO'}`);
    
    // Check for persistence notification
    const persistenceNotification = await page.locator('text=/Previous data restored/').count();
    console.log(`✅ Persistence notification: ${persistenceNotification > 0 ? 'SHOWN' : 'NOT SHOWN'}`);

    // Test 5: Enhanced Toast Notifications
    console.log('\n🍞 Testing Enhanced Toast Notifications...');
    
    // Fill form with invalid data to trigger error toast
    await page.fill('input[name="firstName"]', 'Toast');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', 'invalid-email-format');
    await page.fill('input[name="password"]', 'ToastTest123!');
    await page.fill('input[name="confirmPassword"]', 'ToastTest123!');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Check for enhanced toast
    const toastContainer = await page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"]').count();
    const toastIcon = await page.locator('svg[class*="text-red-400"], svg[class*="text-green-400"]').count();
    
    console.log(`✅ Enhanced toast container: ${toastContainer > 0 ? 'PRESENT' : 'NOT FOUND'}`);
    console.log(`✅ Toast icons: ${toastIcon > 0 ? 'PRESENT' : 'NOT FOUND'}`);

    // Test 6: Double-click Protection
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
    
    console.log(`✅ Registration requests made: ${requests.length}`);
    console.log(`✅ Double-click protection: ${requests.length <= 1 ? 'WORKING' : 'NEEDS IMPROVEMENT'}`);
    
    // Check for loading state
    const loadingState = await submitButton.locator('svg[class*="animate-spin"]').count();
    console.log(`✅ Loading state indicator: ${loadingState > 0 ? 'WORKING' : 'NOT DETECTED'}`);

    // Test 7: Success Indicators
    console.log('\n✨ Testing Success Indicators...');
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="firstName"]', 'Success');
    await page.locator('input[name="firstName"]').blur();
    await page.waitForTimeout(500);
    
    const successIndicator = await page.locator('svg[class*="text-green-500"]').count();
    console.log(`✅ Success indicators: ${successIndicator > 0 ? 'WORKING' : 'NOT DETECTED'}`);

    // Calculate Overall UX Score
    console.log('\n📊 CALCULATING UX ENHANCEMENT SCORE...');
    
    const features = {
      progressIndicator: progressIndicator > 0,
      enhancedInputs: inputFields >= 3,
      realTimeValidation: emailValidationError > 0,
      formPersistence: restoredFirstName === testData.firstName,
      persistenceNotification: persistenceNotification > 0,
      enhancedToasts: toastContainer > 0 && toastIcon > 0,
      doubleClickProtection: requests.length <= 1,
      loadingStates: loadingState > 0,
      successIndicators: successIndicator > 0
    };

    const workingFeatures = Object.values(features).filter(Boolean).length;
    const totalFeatures = Object.keys(features).length;
    const uxScore = Math.round((workingFeatures / totalFeatures) * 100);

    console.log('\n🎯 UX ENHANCEMENT RESULTS:');
    console.log('─'.repeat(40));
    Object.entries(features).forEach(([feature, working]) => {
      const status = working ? '✅ WORKING' : '❌ NOT WORKING';
      const name = feature.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`${status.padEnd(12)} ${name}`);
    });

    console.log('\n📈 OVERALL ASSESSMENT:');
    console.log('─'.repeat(40));
    console.log(`🎯 UX Enhancement Score: ${uxScore}%`);
    console.log(`📊 Working Features: ${workingFeatures}/${totalFeatures}`);

    if (uxScore >= 85) {
      console.log('🏆 EXCELLENT - UX significantly enhanced!');
    } else if (uxScore >= 70) {
      console.log('👍 GOOD - Notable UX improvements');
    } else if (uxScore >= 50) {
      console.log('⚠️ FAIR - Some improvements working');
    } else {
      console.log('❌ POOR - Major issues need fixing');
    }

    console.log('\n🚀 PRODUCTION STATUS:');
    if (uxScore >= 75) {
      console.log('✅ READY - Enhanced features successfully deployed');
    } else {
      console.log('⚠️ NEEDS WORK - Some features need attention');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testEnhancedFeatures().catch(console.error);
