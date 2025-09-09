const { chromium } = require('playwright');

async function testRemainingFeatures() {
  console.log('🎯 TESTING REMAINING FEATURES TO GET TO 100%');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Listen for console messages
  page.on('console', msg => {
    console.log(`🖥️ BROWSER ${msg.type()}: ${msg.text()}`);
  });

  // Listen for network requests to track double-click protection
  const requests = [];
  page.on('request', request => {
    if (request.url().includes('/api/auth/register')) {
      requests.push({ 
        timestamp: Date.now(),
        url: request.url(),
        method: request.method()
      });
      console.log(`🌐 NETWORK: Registration request #${requests.length}`);
    }
  });

  try {
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('\n⚡ TESTING REAL-TIME VALIDATION (Target: 100%)');
    console.log('─'.repeat(50));

    // Test 1: Email validation visibility
    console.log('📧 Testing email validation visibility...');
    const emailInput = page.locator('input[name="email"]');
    
    await emailInput.fill('invalid-email');
    await emailInput.blur();
    await page.waitForTimeout(1500);
    
    // Check for error message visibility
    const errorMessage = await page.locator('p.text-danger, p[class*="text-danger"]').first();
    const errorExists = await errorMessage.count();
    const errorVisible = errorExists > 0 ? await errorMessage.isVisible() : false;
    const errorText = errorExists > 0 ? await errorMessage.textContent() : '';
    
    console.log(`   Error message exists: ${errorExists > 0 ? 'YES' : 'NO'}`);
    console.log(`   Error message visible: ${errorVisible ? 'YES' : 'NO'}`);
    console.log(`   Error text: "${errorText}"`);
    
    // Check error styling
    const inputClasses = await emailInput.getAttribute('class');
    const hasErrorStyling = inputClasses.includes('border-red') || inputClasses.includes('border-danger');
    console.log(`   Input has error styling: ${hasErrorStyling ? 'YES' : 'NO'}`);
    
    // Test firstName validation
    console.log('👤 Testing firstName validation...');
    const firstNameInput = page.locator('input[name="firstName"]');
    await firstNameInput.fill('A'); // Too short
    await firstNameInput.blur();
    await page.waitForTimeout(1000);
    
    const firstNameError = await page.locator('text=/must be at least/, text=/too short/').count();
    console.log(`   FirstName error shown: ${firstNameError > 0 ? 'YES' : 'NO'}`);

    console.log('\n🔔 TESTING PERSISTENCE NOTIFICATION (Target: 100%)');
    console.log('─'.repeat(50));

    // Test 2: Persistence notification visibility
    console.log('💾 Testing persistence notification...');
    
    // Fill form data
    await page.fill('input[name="firstName"]', 'Notification');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="companyName"]', 'Test Company');
    await page.waitForTimeout(2000);
    
    // Navigate away and back
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForTimeout(1000);
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(4000);
    
    // Check for notification banner
    const notificationBanner = await page.locator('text=/Previous data restored/').count();
    console.log(`   Notification banner: ${notificationBanner > 0 ? 'FOUND' : 'NOT FOUND'}`);
    
    // Check for toast notification
    const toastNotification = await page.locator('div[class*="fixed"][class*="top-4"] p').count();
    const toastContent = toastNotification > 0 ? await page.locator('div[class*="fixed"][class*="top-4"] p').first().textContent() : '';
    console.log(`   Toast notification: ${toastNotification > 0 ? 'FOUND' : 'NOT FOUND'}`);
    console.log(`   Toast content: "${toastContent}"`);

    console.log('\n🛡️ TESTING DOUBLE-CLICK PROTECTION (Target: 100%)');
    console.log('─'.repeat(50));

    // Test 3: Double-click protection
    console.log('🔄 Testing double-click protection...');
    
    // Clear previous requests
    requests.length = 0;
    
    // Fill valid form data
    await page.fill('input[name="firstName"]', 'DoubleClick');
    await page.fill('input[name="lastName"]', 'Protection');
    await page.fill('input[name="companyName"]', 'Test Company');
    await page.fill('input[name="email"]', `doubleclick.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'DoubleClick123!');
    await page.fill('input[name="confirmPassword"]', 'DoubleClick123!');

    // Wait for form to be ready
    await page.waitForTimeout(1000);
    
    const submitButton = page.locator('button[type="submit"]');
    
    // Test rapid clicking
    console.log('   Performing rapid clicks...');
    const clickPromises = [];
    for (let i = 0; i < 5; i++) {
      clickPromises.push(submitButton.click());
      await page.waitForTimeout(50); // Very rapid clicks
    }
    
    await Promise.all(clickPromises);
    await page.waitForTimeout(3000);
    
    console.log(`   Total registration requests: ${requests.length}`);
    console.log(`   Double-click protection: ${requests.length <= 1 ? 'WORKING' : 'NEEDS IMPROVEMENT'}`);
    
    // Check button state during submission
    const buttonDisabled = await submitButton.isDisabled();
    const buttonText = await submitButton.textContent();
    const hasLoadingSpinner = await submitButton.locator('svg[class*="animate-spin"]').count();
    
    console.log(`   Button disabled during submission: ${buttonDisabled ? 'YES' : 'NO'}`);
    console.log(`   Button text: "${buttonText}"`);
    console.log(`   Loading spinner: ${hasLoadingSpinner > 0 ? 'YES' : 'NO'}`);

    // Calculate results
    const realTimeValidationScore = (errorExists && errorVisible) ? 100 : (errorExists ? 80 : 0);
    const persistenceNotificationScore = (notificationBanner > 0 && toastNotification > 0) ? 100 : 
                                       (notificationBanner > 0 || toastNotification > 0) ? 60 : 0;
    const doubleClickProtectionScore = (requests.length <= 1 && buttonDisabled) ? 100 : 
                                     (requests.length <= 1 || buttonDisabled) ? 70 : 0;

    console.log('\n📊 DETAILED RESULTS');
    console.log('=' .repeat(60));
    console.log(`⚡ Real-time Validation: ${realTimeValidationScore}%`);
    console.log(`   - Error message exists: ${errorExists > 0 ? '✅' : '❌'}`);
    console.log(`   - Error message visible: ${errorVisible ? '✅' : '❌'}`);
    console.log(`   - Input error styling: ${hasErrorStyling ? '✅' : '❌'}`);
    
    console.log(`🔔 Persistence Notification: ${persistenceNotificationScore}%`);
    console.log(`   - Notification banner: ${notificationBanner > 0 ? '✅' : '❌'}`);
    console.log(`   - Toast notification: ${toastNotification > 0 ? '✅' : '❌'}`);
    
    console.log(`🛡️ Double-click Protection: ${doubleClickProtectionScore}%`);
    console.log(`   - Single request only: ${requests.length <= 1 ? '✅' : '❌'}`);
    console.log(`   - Button disabled: ${buttonDisabled ? '✅' : '❌'}`);
    console.log(`   - Loading feedback: ${hasLoadingSpinner > 0 ? '✅' : '❌'}`);

    const averageScore = Math.round((realTimeValidationScore + persistenceNotificationScore + doubleClickProtectionScore) / 3);
    
    console.log('\n🎯 SUMMARY');
    console.log('─'.repeat(30));
    console.log(`Average Score: ${averageScore}%`);
    
    if (averageScore >= 95) {
      console.log('🏆 EXCELLENT - All features at 100%!');
    } else if (averageScore >= 85) {
      console.log('👍 GOOD - Most features working well');
    } else {
      console.log('⚠️ NEEDS WORK - Issues identified for fixing');
    }

    return {
      realTimeValidation: realTimeValidationScore,
      persistenceNotification: persistenceNotificationScore,
      doubleClickProtection: doubleClickProtectionScore,
      average: averageScore
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { realTimeValidation: 0, persistenceNotification: 0, doubleClickProtection: 0, average: 0 };
  } finally {
    await browser.close();
  }
}

// Run the test
testRemainingFeatures()
  .then(results => {
    console.log(`\n📋 Test completed with ${results.average}% average score`);
    process.exit(results.average >= 95 ? 0 : 1);
  })
  .catch(console.error);
