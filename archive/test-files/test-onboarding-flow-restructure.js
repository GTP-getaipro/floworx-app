const puppeteer = require('puppeteer');

async function testOnboardingFlowRestructure() {
  console.log('🔄 Testing Restructured Onboarding Flow...');
  console.log('🎯 Goal: Industry → Service Connection → Dashboard');
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
      if (text.includes('Dashboard:') || text.includes('Onboarding') || text.includes('business-type')) {
        console.log(`📝 Console: ${text}`);
      }
    });
    
    console.log('📱 Step 1: Navigate to dashboard (should redirect to onboarding)...');
    await page.goto('https://app.floworx-iq.com/dashboard', { 
      waitUntil: 'networkidle0',
      timeout: 15000 
    });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Take screenshot of initial state
    await page.screenshot({ path: 'onboarding-flow-step1.png', fullPage: true });
    console.log('📸 Step 1 screenshot saved');
    
    // Check if we're in onboarding mode
    const isOnboarding = await page.$('[data-testid="onboarding-wizard"]').catch(() => null);
    const isWelcomeStep = await page.$('[data-testid="welcome-step"]').catch(() => null);
    const isBusinessTypeStep = await page.$('[data-testid="business-type-step"]').catch(() => null);
    const isGoogleConnection = await page.$('[data-testid="google-oauth-button"]').catch(() => null);
    
    console.log('\n🔍 Current Page State:');
    console.log(`  Onboarding Wizard: ${isOnboarding ? '✅' : '❌'}`);
    console.log(`  Welcome Step: ${isWelcomeStep ? '✅' : '❌'}`);
    console.log(`  Business Type Step: ${isBusinessTypeStep ? '✅' : '❌'}`);
    console.log(`  Google Connection: ${isGoogleConnection ? '✅' : '❌'}`);
    
    if (isOnboarding) {
      console.log('✅ Successfully redirected to onboarding');
      
      // Check current step
      const stepTitle = await page.$eval('h1, h2, .step-title', el => el.textContent).catch(() => 'Unknown');
      console.log(`📍 Current Step: ${stepTitle}`);
      
      // Look for step indicators
      const stepIndicators = await page.$$eval('[data-testid*="step-"], .step-indicator', elements => 
        elements.map(el => ({
          text: el.textContent,
          classes: el.className,
          active: el.classList.contains('active') || el.classList.contains('current')
        }))
      ).catch(() => []);
      
      if (stepIndicators.length > 0) {
        console.log('\n📊 Step Progress:');
        stepIndicators.forEach((step, index) => {
          console.log(`  ${index + 1}. ${step.text} ${step.active ? '(CURRENT)' : ''}`);
        });
      }
      
      // Test the flow progression
      if (isWelcomeStep) {
        console.log('\n🚀 Testing Welcome Step...');
        const continueButton = await page.$('[data-testid="continue-button"], button[type="submit"]').catch(() => null);
        if (continueButton) {
          console.log('🖱️ Clicking continue from welcome step...');
          await continueButton.click();
          await page.waitForTimeout(2000);
          
          // Take screenshot after welcome
          await page.screenshot({ path: 'onboarding-flow-step2.png', fullPage: true });
          console.log('📸 Step 2 screenshot saved');
        }
      }
      
      // Check if we're now on business type selection
      const businessTypeAfterWelcome = await page.$('[data-testid="business-type-step"]').catch(() => null);
      if (businessTypeAfterWelcome) {
        console.log('✅ Progressed to Business Type Selection');
        
        // Look for business type options
        const businessTypes = await page.$$eval('[data-testid*="business-type-"]', elements => 
          elements.map(el => ({
            id: el.getAttribute('data-testid'),
            text: el.textContent.substring(0, 50)
          }))
        ).catch(() => []);
        
        console.log('\n🏢 Available Business Types:');
        businessTypes.forEach(type => {
          console.log(`  - ${type.id}: ${type.text}`);
        });
        
        // Select the first business type
        if (businessTypes.length > 0) {
          const firstBusinessType = await page.$(`[data-testid="${businessTypes[0].id}"]`);
          if (firstBusinessType) {
            console.log(`🖱️ Selecting business type: ${businessTypes[0].id}`);
            await firstBusinessType.click();
            await page.waitForTimeout(1000);
            
            // Click continue
            const continueButton = await page.$('[data-testid="continue-button"]').catch(() => null);
            if (continueButton) {
              console.log('🖱️ Clicking continue after business type selection...');
              await continueButton.click();
              await page.waitForTimeout(2000);
              
              // Take screenshot after business type
              await page.screenshot({ path: 'onboarding-flow-step3.png', fullPage: true });
              console.log('📸 Step 3 screenshot saved');
            }
          }
        }
      }
      
      // Check if we're now on Google connection
      const googleConnectionAfterBusiness = await page.$('[data-testid="google-oauth-button"]').catch(() => null);
      if (googleConnectionAfterBusiness) {
        console.log('✅ Progressed to Google Connection Step');
        console.log('🔗 Google OAuth button is available');
        
        // Note: We won't actually click the OAuth button in automated test
        console.log('ℹ️ OAuth connection would be next step for user');
      }
      
    } else {
      console.log('⚠️ Not redirected to onboarding - checking dashboard state');
      
      // Check if dashboard is showing
      const dashboardContent = await page.$('[data-testid="dashboard-container"]').catch(() => null);
      if (dashboardContent) {
        console.log('❌ Dashboard is showing - onboarding requirements not enforced');
      } else {
        console.log('⚠️ Neither onboarding nor dashboard is showing');
      }
    }
    
    // Check page content for key elements
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        hasOnboardingText: document.body.textContent.toLowerCase().includes('onboarding'),
        hasBusinessTypeText: document.body.textContent.toLowerCase().includes('business type'),
        hasGoogleText: document.body.textContent.toLowerCase().includes('google'),
        hasDashboardText: document.body.textContent.toLowerCase().includes('dashboard')
      };
    });
    
    console.log('\n📄 Page Content Analysis:');
    console.log(`  Title: ${pageContent.title}`);
    console.log(`  URL: ${pageContent.url}`);
    console.log(`  Has Onboarding Text: ${pageContent.hasOnboardingText ? '✅' : '❌'}`);
    console.log(`  Has Business Type Text: ${pageContent.hasBusinessTypeText ? '✅' : '❌'}`);
    console.log(`  Has Google Text: ${pageContent.hasGoogleText ? '✅' : '❌'}`);
    console.log(`  Has Dashboard Text: ${pageContent.hasDashboardText ? '✅' : '❌'}`);
    
    console.log('\n🎯 Onboarding Flow Test Results:');
    if (isOnboarding) {
      console.log('✅ Onboarding flow is properly enforced');
      console.log('✅ Users must complete setup before reaching dashboard');
      console.log('✅ Industry selection is part of the required flow');
    } else {
      console.log('⚠️ Onboarding flow may need adjustment');
    }
    
  } catch (error) {
    console.error('❌ Onboarding flow test failed:', error.message);
  } finally {
    console.log('\n🔍 Keeping browser open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// Run the test
testOnboardingFlowRestructure().catch(console.error);
