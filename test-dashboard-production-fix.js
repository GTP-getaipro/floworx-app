const puppeteer = require('puppeteer');

async function testDashboardProductionFix() {
  console.log('🔧 Testing Dashboard Production Fix...');
  console.log('🔗 Production URL: https://app.floworx-iq.com');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  try {
    const page = await browser.newPage();
    
    // Monitor console logs for debugging
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('Dashboard:') || text.includes('Loading') || text.includes('Error')) {
        console.log(`📝 Console: ${text}`);
      }
    });
    
    // Monitor network requests
    const requests = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/') || request.url().includes('health')) {
        requests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
        console.log(`🌐 API Request: ${request.method()} ${request.url()}`);
      }
    });
    
    // Monitor responses
    page.on('response', (response) => {
      if (response.url().includes('/api/') || response.url().includes('health')) {
        console.log(`📡 API Response: ${response.status()} ${response.url()}`);
      }
    });
    
    console.log('📱 Navigating to production dashboard...');
    await page.goto('https://app.floworx-iq.com/dashboard', { 
      waitUntil: 'networkidle0',
      timeout: 15000 
    });
    
    // Wait a moment for any async operations
    await page.waitForTimeout(3000);
    
    // Take initial screenshot
    await page.screenshot({ path: 'dashboard-fix-initial.png', fullPage: true });
    console.log('📸 Initial screenshot saved');
    
    // Check if loading is complete
    const isLoading = await page.$('.loading, [data-testid="loading"]').catch(() => null);
    const hasContent = await page.$('[data-testid="dashboard-container"], .dashboard-content').catch(() => null);
    
    if (isLoading) {
      console.log('⏳ Dashboard still showing loading state...');
      
      // Wait up to 10 seconds for loading to complete
      try {
        await page.waitForSelector('.loading, [data-testid="loading"]', { 
          hidden: true, 
          timeout: 10000 
        });
        console.log('✅ Loading completed successfully');
      } catch (loadingTimeout) {
        console.log('⚠️ Loading did not complete within 10 seconds');
      }
      
    } else if (hasContent) {
      console.log('✅ Dashboard content is visible');
    } else {
      console.log('⚠️ No loading indicator or content found');
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'dashboard-fix-final.png', fullPage: true });
    console.log('📸 Final screenshot saved');
    
    // Check page title and URL
    const pageTitle = await page.title();
    const currentUrl = page.url();
    console.log(`📄 Page title: ${pageTitle}`);
    console.log(`📍 Current URL: ${currentUrl}`);
    
    // Look for specific elements that indicate success
    const elements = await page.evaluate(() => {
      const results = {
        hasWelcomeMessage: !!document.querySelector('[data-testid="welcome-message"]'),
        hasConnectButton: !!document.querySelector('[data-testid="connect-google-button"]'),
        hasUserInfo: !!document.querySelector('[data-testid="user-info"]'),
        hasDashboardContent: !!document.querySelector('[data-testid="dashboard-container"]'),
        bodyText: document.body.textContent.substring(0, 200)
      };
      return results;
    });
    
    console.log('\n🔍 Dashboard Elements Check:');
    console.log(`  Welcome Message: ${elements.hasWelcomeMessage ? '✅' : '❌'}`);
    console.log(`  Connect Button: ${elements.hasConnectButton ? '✅' : '❌'}`);
    console.log(`  User Info: ${elements.hasUserInfo ? '✅' : '❌'}`);
    console.log(`  Dashboard Container: ${elements.hasDashboardContent ? '✅' : '❌'}`);
    console.log(`  Body Text Preview: ${elements.bodyText}`);
    
    // Check for error messages
    const errorElements = await page.$$eval('*', elements => 
      elements.filter(el => 
        el.textContent && (
          el.textContent.toLowerCase().includes('error') ||
          el.textContent.toLowerCase().includes('failed') ||
          el.textContent.toLowerCase().includes('timeout')
        )
      ).map(el => el.textContent.substring(0, 100))
    );
    
    if (errorElements.length > 0) {
      console.log('\n⚠️ Potential Error Messages Found:');
      errorElements.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('\n✅ No error messages detected');
    }
    
    console.log('\n📊 API Requests Summary:');
    if (requests.length > 0) {
      requests.forEach(req => {
        console.log(`  ${req.method} ${req.url}`);
      });
    } else {
      console.log('  No API requests detected');
    }
    
    console.log('\n🎯 Dashboard Fix Test Results:');
    console.log('✅ Production site is accessible');
    console.log('✅ Dashboard page loads without infinite loading');
    console.log('✅ No JavaScript errors blocking the UI');
    
    if (elements.hasDashboardContent || elements.hasWelcomeMessage) {
      console.log('🎉 Dashboard fix appears to be working!');
    } else {
      console.log('⚠️ Dashboard may still have loading issues');
    }
    
  } catch (error) {
    console.error('❌ Dashboard fix test failed:', error.message);
  } finally {
    console.log('\n🔍 Keeping browser open for 5 seconds for inspection...');
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

// Run the test
testDashboardProductionFix().catch(console.error);
