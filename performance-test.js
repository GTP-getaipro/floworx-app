const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting comprehensive production test...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  let testResults = {
    performance: {},
    functionality: {},
    errors: []
  };

  try {
    // 1. PERFORMANCE TESTING
    console.log('\n📊 TESTING PERFORMANCE...');

    // Test login page load time
    const loginStart = Date.now();
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    const criticalContentTime = Date.now() - loginStart;

    await page.waitForLoadState('networkidle');
    const fullLoadTime = Date.now() - loginStart;

    testResults.performance.loginCritical = criticalContentTime;
    testResults.performance.loginFull = fullLoadTime;

    console.log('Login page critical content:', criticalContentTime + 'ms');
    console.log('Login page full load time:', fullLoadTime + 'ms');

    // Test registration page
    const regStart = Date.now();
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    const regCriticalTime = Date.now() - regStart;
    await page.waitForLoadState('networkidle');
    const regFullTime = Date.now() - regStart;

    testResults.performance.regCritical = regCriticalTime;
    testResults.performance.regFull = regFullTime;

    console.log('Registration page critical content:', regCriticalTime + 'ms');
    console.log('Registration page full load time:', regFullTime + 'ms');

    // 2. FUNCTIONALITY TESTING
    console.log('\n🔧 TESTING FUNCTIONALITY...');

    // Test login form validation
    await page.goto('https://app.floworx-iq.com/login');
    await page.click('button[type="submit"]');

    const emailError = await page.locator('text=This field is required').first().isVisible();
    testResults.functionality.formValidation = emailError;
    console.log('Form validation:', emailError ? '✅ WORKING' : '❌ FAILED');

    // Test API health
    const healthResponse = await page.goto('https://app.floworx-iq.com/api/health');
    const healthStatus = healthResponse.status() === 200;
    testResults.functionality.apiHealth = healthStatus;
    console.log('API health:', healthStatus ? '✅ WORKING' : '❌ FAILED');

    // Test mobile responsiveness
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('https://app.floworx-iq.com/login');
    const mobileLayout = await page.locator('input[type="email"]').isVisible();
    testResults.functionality.mobileResponsive = mobileLayout;
    console.log('Mobile responsive:', mobileLayout ? '✅ WORKING' : '❌ FAILED');

    // Reset viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // 3. PERFORMANCE ANALYSIS
    console.log('\n✅ PERFORMANCE ANALYSIS:');
    if (criticalContentTime < 1000) console.log('✅ Login critical content: EXCELLENT (<1s)');
    else if (criticalContentTime < 2000) console.log('✅ Login critical content: GOOD (<2s)');
    else console.log('⚠️ Login critical content: NEEDS IMPROVEMENT (>2s)');

    if (fullLoadTime < 2000) console.log('✅ Login full load: EXCELLENT (<2s)');
    else if (fullLoadTime < 3000) console.log('✅ Login full load: GOOD (<3s)');
    else console.log('⚠️ Login full load: NEEDS IMPROVEMENT (>3s)');

    if (regCriticalTime < 1000) console.log('✅ Registration critical content: EXCELLENT (<1s)');
    else if (regCriticalTime < 2000) console.log('✅ Registration critical content: GOOD (<2s)');
    else console.log('⚠️ Registration critical content: NEEDS IMPROVEMENT (>2s)');

    // 4. FINAL SUMMARY
    console.log('\n🎯 FINAL TEST SUMMARY:');
    const allFunctionalityWorking = Object.values(testResults.functionality).every(result => result === true);
    const performanceGood = criticalContentTime < 2000 && fullLoadTime < 3000;

    console.log('Functionality tests:', allFunctionalityWorking ? '✅ ALL PASSING' : '❌ SOME FAILED');
    console.log('Performance tests:', performanceGood ? '✅ GOOD' : '⚠️ NEEDS IMPROVEMENT');

    if (allFunctionalityWorking && performanceGood) {
      console.log('🎉 OVERALL STATUS: PRODUCTION READY!');
    } else {
      console.log('⚠️ OVERALL STATUS: NEEDS ATTENTION');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    testResults.errors.push(error.message);
  } finally {
    await browser.close();
  }
})();
