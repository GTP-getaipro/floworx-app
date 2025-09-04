const { chromium } = require('playwright');

async function debugDashboardIssues() {
  console.log('🔍 DEBUGGING DASHBOARD ISSUES');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('\n🧪 STEP 1: CREATE AND LOGIN USER');
    console.log('─'.repeat(50));
    
    const testUser = {
      firstName: 'Debug',
      lastName: 'Dashboard',
      companyName: 'Debug Dashboard Co',
      email: `debug.dashboard.${Date.now()}@example.com`,
      password: 'DebugDashboard123!'
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
    
    console.log('\n🔍 STEP 2: ANALYZE PAGE CONTENT');
    console.log('─'.repeat(50));
    
    // Check all H1 elements
    const h1Elements = await page.evaluate(() => {
      const h1s = Array.from(document.querySelectorAll('h1'));
      return h1s.map((h1, index) => ({
        index: index + 1,
        text: h1.textContent,
        classes: h1.className,
        dataTestId: h1.getAttribute('data-testid'),
        outerHTML: h1.outerHTML.substring(0, 150)
      }));
    });
    
    console.log(`Found ${h1Elements.length} H1 elements:`);
    h1Elements.forEach(h1 => {
      console.log(`   ${h1.index}. "${h1.text}"`);
      console.log(`      Classes: "${h1.classes}"`);
      console.log(`      data-testid: "${h1.dataTestId || 'none'}"`);
      console.log(`      HTML: ${h1.outerHTML}`);
    });
    
    console.log('\n🔍 STEP 3: CHECK FOR DATA-TESTID ATTRIBUTES');
    console.log('─'.repeat(50));
    
    const expectedTestIds = [
      'dashboard-container',
      'dashboard-header',
      'welcome-message',
      'dashboard-subtitle',
      'sign-out-button',
      'dashboard-content',
      'connected-state',
      'not-connected-state',
      'connect-google-button'
    ];
    
    for (const testId of expectedTestIds) {
      const element = await page.locator(`[data-testid="${testId}"]`).count();
      console.log(`   ${testId}: ${element > 0 ? '✅' : '❌'}`);
    }
    
    console.log('\n🔍 STEP 4: CHECK CURRENT PAGE STRUCTURE');
    console.log('─'.repeat(50));
    
    const pageStructure = await page.evaluate(() => {
      const body = document.body;
      const title = document.title;
      const url = window.location.href;
      
      // Get main content areas
      const mainContent = document.querySelector('main') || document.querySelector('[role="main"]') || document.querySelector('.main');
      const headers = Array.from(document.querySelectorAll('header, .header, [role="banner"]'));
      const navs = Array.from(document.querySelectorAll('nav, .nav, [role="navigation"]'));
      
      return {
        title: title,
        url: url,
        hasMain: !!mainContent,
        headerCount: headers.length,
        navCount: navs.length,
        bodyClasses: body.className,
        bodyText: body.textContent.substring(0, 200)
      };
    });
    
    console.log('Page structure:');
    Object.entries(pageStructure).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    console.log('\n🔍 STEP 5: CHECK IF ON DASHBOARD OR LOGIN');
    console.log('─'.repeat(50));
    
    const pageType = await page.evaluate(() => {
      const url = window.location.pathname;
      const hasLoginForm = !!document.querySelector('input[name="email"][type="email"]');
      const hasWelcomeMessage = !!document.querySelector('h1:contains("Welcome")') || 
                               document.body.textContent.includes('Welcome,');
      const hasSignOutButton = !!document.querySelector('button:contains("Sign Out")') ||
                              document.body.textContent.includes('Sign Out');
      
      return {
        pathname: url,
        isLoginPage: url.includes('/login'),
        isDashboardPage: url.includes('/dashboard'),
        hasLoginForm: hasLoginForm,
        hasWelcomeMessage: hasWelcomeMessage,
        hasSignOutButton: hasSignOutButton
      };
    });
    
    console.log('Page type analysis:');
    Object.entries(pageType).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    console.log('\n🔍 STEP 6: CHECK AUTHENTICATION STATE');
    console.log('─'.repeat(50));
    
    const authState = await page.evaluate(() => {
      const token = localStorage.getItem('token');
      const authToken = localStorage.getItem('authToken');
      const sessionToken = sessionStorage.getItem('token');
      
      return {
        hasLocalStorageToken: !!token,
        hasAuthToken: !!authToken,
        hasSessionToken: !!sessionToken,
        tokenLength: token ? token.length : 0
      };
    });
    
    console.log('Authentication state:');
    Object.entries(authState).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });
    
    console.log('\n📊 DIAGNOSIS SUMMARY');
    console.log('─'.repeat(50));
    
    if (finalUrl.includes('/dashboard')) {
      console.log('✅ User successfully reached dashboard');
      if (h1Elements.some(h1 => h1.dataTestId === 'welcome-message')) {
        console.log('✅ Dashboard improvements are deployed');
      } else {
        console.log('❌ Dashboard improvements not deployed yet');
      }
    } else if (finalUrl.includes('/login')) {
      console.log('❌ User stuck on login page');
      if (authState.hasLocalStorageToken) {
        console.log('⚠️  User has token but not redirected - possible routing issue');
      } else {
        console.log('⚠️  User has no token - authentication failed');
      }
    } else {
      console.log('⚠️  User on unexpected page');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

// Run debug
debugDashboardIssues()
  .then(() => {
    console.log('\n🎉 Dashboard issues debug completed');
  })
  .catch(console.error);
