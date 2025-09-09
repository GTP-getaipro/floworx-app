const { chromium } = require('playwright');

async function testLoginWindowSizing() {
  console.log('🖥️ TESTING LOGIN WINDOW SIZING');
  console.log('=' .repeat(50));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Test different screen sizes
    const screenSizes = [
      { width: 1366, height: 768, name: 'Laptop (1366x768)' },
      { width: 1920, height: 1080, name: 'Desktop (1920x1080)' },
      { width: 1440, height: 900, name: 'MacBook (1440x900)' },
      { width: 1280, height: 720, name: 'Small Desktop (1280x720)' },
      { width: 1024, height: 768, name: 'Tablet Landscape (1024x768)' }
    ];

    const results = {};

    for (const size of screenSizes) {
      console.log(`\n📱 Testing ${size.name}...`);
      
      await page.setViewportSize(size);
      await page.goto('https://app.floworx-iq.com/login');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      const measurements = await page.evaluate(() => {
        const card = document.querySelector('[class*="bg-surface"]');
        const form = document.querySelector('form');
        const container = document.querySelector('[class*="max-w-md"]');
        const viewport = { width: window.innerWidth, height: window.innerHeight };
        
        return {
          viewport,
          cardHeight: card ? card.offsetHeight : 0,
          cardTop: card ? card.getBoundingClientRect().top : 0,
          cardBottom: card ? card.getBoundingClientRect().bottom : 0,
          formHeight: form ? form.offsetHeight : 0,
          containerHeight: container ? container.offsetHeight : 0,
          bodyHeight: document.body.scrollHeight,
          documentHeight: document.documentElement.scrollHeight,
          needsScroll: document.body.scrollHeight > window.innerHeight,
          scrollableHeight: document.body.scrollHeight - window.innerHeight,
          cardFitsInViewport: card ? (card.getBoundingClientRect().bottom <= window.innerHeight) : false
        };
      });

      results[size.name] = measurements;

      console.log(`   📏 Viewport: ${measurements.viewport.width}x${measurements.viewport.height}`);
      console.log(`   📦 Card height: ${measurements.cardHeight}px`);
      console.log(`   📄 Body height: ${measurements.bodyHeight}px`);
      console.log(`   📜 Needs scroll: ${measurements.needsScroll ? 'YES' : 'NO'}`);
      console.log(`   ✅ Card fits: ${measurements.cardFitsInViewport ? 'YES' : 'NO'}`);
      
      if (measurements.needsScroll) {
        console.log(`   ⚠️  Scroll needed: ${measurements.scrollableHeight}px`);
      }
    }

    // Summary
    console.log('\n📊 SIZING TEST SUMMARY');
    console.log('=' .repeat(50));
    
    let passCount = 0;
    let totalCount = screenSizes.length;
    
    Object.entries(results).forEach(([screenName, measurements]) => {
      const fits = measurements.cardFitsInViewport && !measurements.needsScroll;
      const status = fits ? '✅ FITS' : '❌ SCROLLS';
      console.log(`${status.padEnd(12)} ${screenName}`);
      if (fits) passCount++;
    });

    const successRate = Math.round((passCount / totalCount) * 100);
    
    console.log('\n🎯 OVERALL RESULTS');
    console.log('─'.repeat(30));
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Screens that fit: ${passCount}/${totalCount}`);
    
    if (successRate >= 80) {
      console.log('🏆 EXCELLENT - Login window fits well on most screens');
    } else if (successRate >= 60) {
      console.log('👍 GOOD - Login window fits on most common screens');
    } else if (successRate >= 40) {
      console.log('⚠️ FAIR - Login window has sizing issues on some screens');
    } else {
      console.log('❌ POOR - Login window has major sizing issues');
    }

    // Test registration window too
    console.log('\n📝 Testing Registration Window...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    const regMeasurements = await page.evaluate(() => {
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

    console.log(`📦 Registration card height: ${regMeasurements.cardHeight}px`);
    console.log(`📜 Registration needs scroll: ${regMeasurements.needsScroll ? 'YES' : 'NO'}`);
    console.log(`✅ Registration fits: ${regMeasurements.cardFitsInViewport ? 'YES' : 'NO'}`);

    return { 
      loginSuccessRate: successRate, 
      loginPassCount: passCount, 
      totalScreens: totalCount,
      registrationFits: regMeasurements.cardFitsInViewport && !regMeasurements.needsScroll
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { loginSuccessRate: 0, loginPassCount: 0, totalScreens: 5, registrationFits: false };
  } finally {
    await browser.close();
  }
}

// Run the test
testLoginWindowSizing()
  .then(results => {
    console.log(`\n📋 Login sizing test completed: ${results.loginSuccessRate}% success rate`);
    console.log(`📋 Registration window fits: ${results.registrationFits ? 'YES' : 'NO'}`);
    
    if (results.loginSuccessRate >= 80 && results.registrationFits) {
      console.log('🎉 All windows fit properly!');
      process.exit(0);
    } else {
      console.log('⚠️ Some windows need sizing adjustments');
      process.exit(1);
    }
  })
  .catch(console.error);
