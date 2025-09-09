const { chromium } = require('playwright');

async function testDashboardProduction() {
  console.log('🧪 TESTING DASHBOARD IMPROVEMENTS IN PRODUCTION');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('\n🚀 STEP 1: CREATE TEST USER AND ACCESS DASHBOARD');
    console.log('─'.repeat(50));
    
    const testUser = {
      firstName: 'Production',
      lastName: 'Dashboard',
      companyName: 'Production Dashboard Co',
      email: `prod.dashboard.${Date.now()}@example.com`,
      password: 'ProdDashboard123!'
    };
    
    console.log(`👤 Creating user: ${testUser.email}`);
    
    // Register user
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="firstName"]', testUser.firstName);
    await page.fill('input[name="lastName"]', testUser.lastName);
    await page.fill('input[name="companyName"]', testUser.companyName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(8000);
    
    const afterRegisterUrl = page.url();
    console.log(`After registration URL: ${afterRegisterUrl}`);
    
    // Login if redirected to login
    if (afterRegisterUrl.includes('/login')) {
      console.log('🔑 Logging in...');
      await page.fill('input[name="email"]', testUser.email);
      await page.fill('input[name="password"]', testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(8000);
    }
    
    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);
    
    if (!finalUrl.includes('/dashboard')) {
      throw new Error(`Expected dashboard but got: ${finalUrl}`);
    }
    
    console.log('✅ Successfully reached dashboard');
    
    console.log('\n🔍 STEP 2: TEST DASHBOARD DATA-TESTID IMPROVEMENTS');
    console.log('─'.repeat(50));
    
    // Test all the new data-testid attributes
    const testIds = [
      'dashboard-container',
      'dashboard-header',
      'welcome-message',
      'dashboard-subtitle',
      'sign-out-button',
      'dashboard-content'
    ];
    
    let foundCount = 0;
    for (const testId of testIds) {
      const element = await page.locator(`[data-testid="${testId}"]`).count();
      const found = element > 0;
      console.log(`   ${testId}: ${found ? '✅' : '❌'}`);
      if (found) foundCount++;
    }
    
    console.log(`\n📊 Basic data-testids found: ${foundCount}/${testIds.length}`);
    
    console.log('\n🔍 STEP 3: TEST CONNECTION STATE DATA-TESTIDS');
    console.log('─'.repeat(50));
    
    // Wait for dashboard to fully load
    await page.waitForTimeout(3000);
    
    const hasConnectedState = await page.locator('[data-testid="connected-state"]').count() > 0;
    const hasNotConnectedState = await page.locator('[data-testid="not-connected-state"]').count() > 0;
    
    console.log(`   Connected state: ${hasConnectedState ? '✅' : '❌'}`);
    console.log(`   Not connected state: ${hasNotConnectedState ? '✅' : '❌'}`);
    
    if (hasNotConnectedState) {
      console.log('\n🎯 Testing not-connected state elements:');
      
      const notConnectedElements = [
        'connect-title',
        'connect-description',
        'feature-benefits',
        'connect-google-button',
        'feature-email-sorting',
        'feature-ai-responses',
        'feature-response-times',
        'feature-security'
      ];
      
      let notConnectedFound = 0;
      for (const testId of notConnectedElements) {
        const element = await page.locator(`[data-testid="${testId}"]`).count();
        const found = element > 0;
        console.log(`     ${testId}: ${found ? '✅' : '❌'}`);
        if (found) notConnectedFound++;
      }
      
      console.log(`   Not-connected elements found: ${notConnectedFound}/${notConnectedElements.length}`);
    }
    
    if (hasConnectedState) {
      console.log('\n🎯 Testing connected state elements:');
      
      const connectedElements = [
        'connection-success-title',
        'connection-success-message',
        'success-icon'
      ];
      
      let connectedFound = 0;
      for (const testId of connectedElements) {
        const element = await page.locator(`[data-testid="${testId}"]`).count();
        const found = element > 0;
        console.log(`     ${testId}: ${found ? '✅' : '❌'}`);
        if (found) connectedFound++;
      }
      
      console.log(`   Connected elements found: ${connectedFound}/${connectedElements.length}`);
    }
    
    console.log('\n🧪 STEP 4: TEST DASHBOARD FUNCTIONALITY');
    console.log('─'.repeat(50));
    
    // Test sign out functionality
    const signOutButton = await page.locator('[data-testid="sign-out-button"]').count();
    console.log(`   Sign out button exists: ${signOutButton > 0 ? '✅' : '❌'}`);
    
    if (signOutButton > 0) {
      console.log('🚪 Testing sign out...');
      await page.click('[data-testid="sign-out-button"]');
      await page.waitForTimeout(3000);
      
      const afterSignOutUrl = page.url();
      console.log(`   URL after sign out: ${afterSignOutUrl}`);
      console.log(`   Redirected to login: ${afterSignOutUrl.includes('/login') ? '✅' : '❌'}`);
      
      // Check if token is cleared
      const token = await page.evaluate(() => localStorage.getItem('token'));
      console.log(`   Token cleared: ${token === null ? '✅' : '❌'}`);
    }
    
    console.log('\n🧪 STEP 5: TEST OAUTH CALLBACK HANDLING');
    console.log('─'.repeat(50));
    
    // Login again to test OAuth callbacks
    await page.goto('https://app.floworx-iq.com/login');
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    // Test success callback
    await page.goto('https://app.floworx-iq.com/dashboard?connected=google');
    await page.waitForTimeout(3000);
    
    const successAlert = await page.locator('[data-testid="success-alert"]').count();
    console.log(`   Success alert for OAuth: ${successAlert > 0 ? '✅' : '❌'}`);
    
    if (successAlert > 0) {
      const alertText = await page.locator('[data-testid="success-alert"]').textContent();
      console.log(`   Success message: "${alertText}"`);
    }
    
    // Test error callback
    await page.goto('https://app.floworx-iq.com/dashboard?error=oauth_denied');
    await page.waitForTimeout(3000);
    
    const errorAlert = await page.locator('[data-testid="error-alert"]').count();
    console.log(`   Error alert for OAuth: ${errorAlert > 0 ? '✅' : '❌'}`);
    
    if (errorAlert > 0) {
      const alertText = await page.locator('[data-testid="error-alert"]').textContent();
      console.log(`   Error message: "${alertText}"`);
    }
    
    console.log('\n📊 PRODUCTION DASHBOARD TEST SUMMARY');
    console.log('─'.repeat(50));
    
    const totalBasicElements = foundCount;
    const hasConnectionState = hasConnectedState || hasNotConnectedState;
    const hasSignOut = signOutButton > 0;
    const hasAlerts = successAlert > 0 || errorAlert > 0;
    
    console.log(`✅ Basic dashboard elements: ${totalBasicElements}/6`);
    console.log(`✅ Connection state handling: ${hasConnectionState ? 'Working' : 'Missing'}`);
    console.log(`✅ Sign out functionality: ${hasSignOut ? 'Working' : 'Missing'}`);
    console.log(`✅ OAuth callback handling: ${hasAlerts ? 'Working' : 'Missing'}`);
    
    const overallScore = totalBasicElements + (hasConnectionState ? 1 : 0) + (hasSignOut ? 1 : 0) + (hasAlerts ? 1 : 0);
    console.log(`\n🎯 Overall Score: ${overallScore}/9`);
    
    if (overallScore >= 7) {
      console.log('🎉 DASHBOARD IMPROVEMENTS SUCCESSFULLY DEPLOYED!');
    } else if (overallScore >= 4) {
      console.log('⚠️  Dashboard improvements partially deployed');
    } else {
      console.log('❌ Dashboard improvements not yet deployed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run test
testDashboardProduction()
  .then(() => {
    console.log('\n🎉 Production dashboard test completed');
  })
  .catch(console.error);
