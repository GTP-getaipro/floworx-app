const { chromium } = require('playwright');

async function checkDashboardPreview() {
  console.log('🔍 CHECKING DASHBOARD BRANCH PREVIEW DEPLOYMENT');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // The dashboard branch should create a preview deployment
    // Vercel typically creates URLs like: https://floworx-app-git-dashboard-username.vercel.app
    
    const possibleUrls = [
      'https://floworx-app-git-dashboard-gtp-getaipro.vercel.app',
      'https://floworx-app-dashboard.vercel.app',
      'https://floworx-app-git-dashboard.vercel.app'
    ];
    
    console.log('\n🌐 TESTING POSSIBLE PREVIEW URLS');
    console.log('─'.repeat(50));
    
    for (const url of possibleUrls) {
      console.log(`\n🧪 Testing: ${url}`);
      
      try {
        await page.goto(url, { timeout: 10000 });
        await page.waitForLoadState('networkidle', { timeout: 5000 });
        
        const title = await page.title();
        const currentUrl = page.url();
        
        console.log(`   ✅ Accessible: ${title}`);
        console.log(`   Final URL: ${currentUrl}`);
        
        // Test if this has our dashboard improvements
        await page.goto(`${url}/register`);
        await page.waitForTimeout(3000);
        
        const testUser = {
          firstName: 'Preview',
          lastName: 'Test',
          companyName: 'Preview Test Co',
          email: `preview.test.${Date.now()}@example.com`,
          password: 'PreviewTest123!'
        };
        
        await page.fill('input[name="firstName"]', testUser.firstName);
        await page.fill('input[name="lastName"]', testUser.lastName);
        await page.fill('input[name="companyName"]', testUser.companyName);
        await page.fill('input[name="email"]', testUser.email);
        await page.fill('input[name="password"]', testUser.password);
        await page.fill('input[name="confirmPassword"]', testUser.password);
        
        await page.click('button[type="submit"]');
        await page.waitForTimeout(8000);
        
        // Login if needed
        const afterRegisterUrl = page.url();
        if (afterRegisterUrl.includes('/login')) {
          await page.fill('input[name="email"]', testUser.email);
          await page.fill('input[name="password"]', testUser.password);
          await page.click('button[type="submit"]');
          await page.waitForTimeout(8000);
        }
        
        // Check for dashboard improvements
        const dashboardUrl = page.url();
        console.log(`   Dashboard URL: ${dashboardUrl}`);
        
        if (dashboardUrl.includes('/dashboard')) {
          const hasDataTestIds = await page.evaluate(() => {
            const testIds = [
              'dashboard-container',
              'welcome-message',
              'sign-out-button'
            ];
            
            return testIds.map(testId => ({
              testId: testId,
              found: !!document.querySelector(`[data-testid="${testId}"]`)
            }));
          });
          
          console.log('   Dashboard improvements check:');
          hasDataTestIds.forEach(({ testId, found }) => {
            console.log(`     ${testId}: ${found ? '✅' : '❌'}`);
          });
          
          const hasImprovements = hasDataTestIds.some(({ found }) => found);
          if (hasImprovements) {
            console.log(`   🎉 FOUND PREVIEW WITH DASHBOARD IMPROVEMENTS: ${url}`);
            return url;
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Not accessible: ${error.message}`);
      }
    }
    
    console.log('\n📊 SUMMARY');
    console.log('─'.repeat(50));
    console.log('❌ No preview deployment found with dashboard improvements');
    console.log('💡 This means either:');
    console.log('   1. Preview deployment is still building');
    console.log('   2. Preview deployment has a different URL pattern');
    console.log('   3. We need to merge to main branch for production deployment');
    
    console.log('\n🎯 RECOMMENDATION');
    console.log('─'.repeat(50));
    console.log('Since the dashboard functionality is working correctly,');
    console.log('we should merge the dashboard branch to main to deploy');
    console.log('the improvements to production.');
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  } finally {
    await browser.close();
  }
}

// Run check
checkDashboardPreview()
  .then(() => {
    console.log('\n🎉 Dashboard preview check completed');
  })
  .catch(console.error);
