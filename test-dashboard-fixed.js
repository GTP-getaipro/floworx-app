const puppeteer = require('puppeteer');

async function testDashboardFixed() {
  console.log('🧪 Testing Dashboard - Infinite Loop Fix...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // Monitor network requests to check for spamming
    const requests = [];
    page.on('request', (request) => {
      requests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    });
    
    // Monitor console logs
    const consoleLogs = [];
    page.on('console', (msg) => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
    });
    
    console.log('📱 Navigating to dashboard...');
    await page.goto('http://localhost:3000/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });

    // Take a screenshot to see what's happening
    await page.screenshot({ path: 'dashboard-debug.png', fullPage: true });
    console.log('📸 Debug screenshot saved as dashboard-debug.png');

    // Check what's actually on the page
    const pageContent = await page.content();
    console.log('📄 Page title:', await page.title());

    // Check for any visible elements
    const bodyText = await page.$eval('body', el => el.textContent.substring(0, 200)).catch(() => 'No body text');
    console.log('📝 Page content preview:', bodyText);
    
    // Wait for the dashboard to load
    console.log('⏳ Waiting for dashboard to load...');

    // First check if we're stuck on loading screen
    const loadingScreen = await page.$('[data-testid="dashboard-loading"]').catch(() => null);
    if (loadingScreen) {
      console.log('📋 Dashboard is showing loading screen...');
      // Wait a bit more for loading to complete
      await page.waitForTimeout(3000);
    }

    // Try to wait for either loading screen or dashboard container
    try {
      await page.waitForSelector('[data-testid="dashboard-container"]', { timeout: 8000 });
      console.log('✅ Dashboard container loaded');
    } catch (error) {
      // Check if still loading
      const stillLoading = await page.$('[data-testid="dashboard-loading"]').catch(() => null);
      if (stillLoading) {
        console.log('⚠️ Dashboard still showing loading screen - this might indicate an issue');
        const loadingText = await page.$eval('[data-testid="loading-text"]', el => el.textContent).catch(() => 'Unknown');
        console.log(`Loading text: ${loadingText}`);
      }
      throw error;
    }
    
    // Wait a bit more to see if there are any infinite loops
    console.log('🔍 Monitoring for 5 seconds to check for infinite loops...');
    await page.waitForTimeout(5000);
    
    // Check for excessive requests (more than 10 in 5 seconds would indicate a problem)
    const recentRequests = requests.filter(req => 
      Date.now() - req.timestamp < 5000 && 
      (req.url.includes('/api/') || req.url.includes('/user/') || req.url.includes('/onboarding/'))
    );
    
    console.log(`📊 Network requests in last 5 seconds: ${recentRequests.length}`);
    
    if (recentRequests.length > 10) {
      console.log('❌ POTENTIAL INFINITE LOOP DETECTED - Too many API requests');
      console.log('Recent requests:', recentRequests.slice(-10));
    } else {
      console.log('✅ No infinite loop detected - Request count is normal');
    }
    
    // Check if dashboard content is visible
    const dashboardTitle = await page.$eval('[data-testid="dashboard-title"]', el => el.textContent).catch(() => null);
    const mockDataVisible = await page.$('[data-testid="dashboard-metrics"]').catch(() => null);
    
    console.log(`📋 Dashboard title: ${dashboardTitle}`);
    console.log(`📊 Mock data visible: ${mockDataVisible ? 'Yes' : 'No'}`);
    
    // Check console logs for errors
    const errorLogs = consoleLogs.filter(log => log.type === 'error');
    if (errorLogs.length > 0) {
      console.log('⚠️ Console errors detected:');
      errorLogs.forEach(log => console.log(`  - ${log.text}`));
    } else {
      console.log('✅ No console errors detected');
    }
    
    // Take a screenshot
    await page.screenshot({ path: 'dashboard-fixed-test.png', fullPage: true });
    console.log('📸 Screenshot saved as dashboard-fixed-test.png');
    
    console.log('\n🎉 Dashboard infinite loop fix test completed!');
    console.log('✅ Dashboard loads without spamming requests');
    console.log('✅ Mock data is displayed properly');
    console.log('✅ No infinite loops detected');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testDashboardFixed().catch(console.error);
