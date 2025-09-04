const { chromium } = require('playwright');

async function testLatestDeployment() {
  console.log('🎯 TESTING LATEST DEPLOYMENT WITH ENHANCED FEATURES');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Test both the main domain and latest deployment URL
  const testUrls = [
    'https://app.floworx-iq.com',
    'https://floworx-ocfqc4vpc-floworxdevelopers-projects.vercel.app'
  ];

  for (const baseUrl of testUrls) {
    console.log(`\n🌐 Testing: ${baseUrl}`);
    console.log('─'.repeat(50));

    try {
      // Test 1: Login Window Sizing
      console.log('\n🖥️ Testing Login Window Sizing...');
      await page.goto(`${baseUrl}/login`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const loginMeasurements = await page.evaluate(() => {
        const card = document.querySelector('[class*="bg-surface"]');
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        
        return {
          viewport,
          cardHeight: card ? card.offsetHeight : 0,
          bodyHeight: document.body.scrollHeight,
          needsScroll: document.body.scrollHeight > window.innerHeight,
          cardFitsInViewport: card ? (card.getBoundingClientRect().bottom <= window.innerHeight) : false
        };
      });

      console.log(`   📦 Card height: ${loginMeasurements.cardHeight}px`);
      console.log(`   📄 Body height: ${loginMeasurements.bodyHeight}px`);
      console.log(`   📜 Needs scroll: ${loginMeasurements.needsScroll ? 'YES' : 'NO'}`);
      console.log(`   ✅ Login fits: ${loginMeasurements.cardFitsInViewport ? 'YES' : 'NO'}`);

      // Test 2: Registration Enhanced Features
      console.log('\n📝 Testing Registration Enhanced Features...');
      await page.goto(`${baseUrl}/register`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      // Listen for console messages
      page.on('console', msg => {
        if (msg.type() === 'log' && (msg.text().includes('💾') || msg.text().includes('📥') || msg.text().includes('🔄'))) {
          console.log(`   🖥️ BROWSER: ${msg.text()}`);
        }
      });

      const testResults = {
        progressIndicator: false,
        enhancedInputs: false,
        realTimeValidation: false,
        formPersistence: false,
        persistenceNotification: false,
        enhancedToasts: false,
        loadingStates: false,
        successIndicators: false
      };

      // Test Progress Indicator
      const progressSteps = await page.locator('div[class*="rounded-full"][class*="border-2"]').count();
      testResults.progressIndicator = progressSteps >= 3;
      console.log(`   📊 Progress steps: ${progressSteps} - ${testResults.progressIndicator ? 'PASS' : 'FAIL'}`);

      // Test Enhanced Input Components
      const inputFields = await page.locator('input[name="firstName"], input[name="lastName"], input[name="email"]').count();
      testResults.enhancedInputs = inputFields >= 3;
      console.log(`   📝 Enhanced inputs: ${inputFields} - ${testResults.enhancedInputs ? 'PASS' : 'FAIL'}`);

      // Test Real-time Validation
      const emailInput = page.locator('input[name="email"]');
      await emailInput.fill('invalid-email');
      await emailInput.blur();
      await page.waitForTimeout(1000);
      
      const validationError = await page.locator('text=/Invalid email format/, text=/Please enter a valid email/').count();
      testResults.realTimeValidation = validationError > 0;
      console.log(`   ⚡ Email validation: ${testResults.realTimeValidation ? 'PASS' : 'FAIL'}`);

      // Test Form Persistence
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
      await page.goto(`${baseUrl}/login`);
      await page.waitForTimeout(1000);
      await page.goto(`${baseUrl}/register`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(4000);
      
      // Check if data was restored
      const restoredFirstName = await page.inputValue('input[name="firstName"]');
      const restoredLastName = await page.inputValue('input[name="lastName"]');
      
      testResults.formPersistence = restoredFirstName === testData.firstName && restoredLastName === testData.lastName;
      console.log(`   💾 Form persistence: ${testResults.formPersistence ? 'PASS' : 'FAIL'}`);

      // Test Persistence Notification
      const persistenceNotification = await page.locator('text=/Previous data restored/, text=/restored your previous form data/').count();
      testResults.persistenceNotification = persistenceNotification > 0;
      console.log(`   🔔 Persistence notification: ${testResults.persistenceNotification ? 'PASS' : 'FAIL'}`);

      // Test Enhanced Toast System
      const toastContainer = await page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"]').count();
      const toastWithContent = await page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"] p').count();
      
      testResults.enhancedToasts = toastContainer > 0 && toastWithContent > 0;
      console.log(`   🍞 Enhanced toasts: ${testResults.enhancedToasts ? 'PASS' : 'FAIL'}`);

      // Test Loading States
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
      console.log(`   🔄 Loading states: ${testResults.loadingStates ? 'PASS' : 'FAIL'}`);

      // Test Success Indicators
      await page.goto(`${baseUrl}/register`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      await page.fill('input[name="firstName"]', 'Success');
      await page.locator('input[name="firstName"]').blur();
      await page.waitForTimeout(1000);
      
      const successIndicator = await page.locator('svg[class*="text-green-500"]').count();
      testResults.successIndicators = successIndicator > 0;
      console.log(`   ✨ Success indicators: ${testResults.successIndicators ? 'PASS' : 'FAIL'}`);

      // Calculate Results
      const passedTests = Object.values(testResults).filter(Boolean).length;
      const totalTests = Object.keys(testResults).length;
      const successRate = Math.round((passedTests / totalTests) * 100);

      console.log(`\n📊 RESULTS FOR ${baseUrl}`);
      console.log('─'.repeat(40));
      console.log(`🎯 Success Rate: ${successRate}%`);
      console.log(`📈 Passed Tests: ${passedTests}/${totalTests}`);
      console.log(`🖥️ Login Window Fits: ${loginMeasurements.cardFitsInViewport && !loginMeasurements.needsScroll ? 'YES' : 'NO'}`);

      if (successRate >= 85) {
        console.log('🏆 EXCELLENT - Enhanced features working great!');
      } else if (successRate >= 70) {
        console.log('👍 GOOD - Most enhanced features working');
      } else if (successRate >= 50) {
        console.log('⚠️ FAIR - Some enhanced features working');
      } else {
        console.log('❌ POOR - Major issues with enhanced features');
      }

      // If this is the main domain and it's working well, we can stop here
      if (baseUrl.includes('app.floworx-iq.com') && successRate >= 75) {
        console.log('\n🎉 Main domain is working well with enhanced features!');
        break;
      }

    } catch (error) {
      console.error(`❌ Test failed for ${baseUrl}:`, error.message);
    }
  }

  await browser.close();
}

// Run the test
testLatestDeployment().catch(console.error);
