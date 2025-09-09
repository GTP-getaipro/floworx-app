const { chromium } = require('playwright');

async function debugApiEndpoints() {
  console.log('🔍 DEBUGGING API ENDPOINTS');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('\n🧪 STEP 1: CREATE TEST USER AND LOGIN');
    console.log('─'.repeat(50));
    
    const testUser = {
      firstName: 'API',
      lastName: 'Debug',
      companyName: 'API Debug Co',
      email: `api.debug.${Date.now()}@example.com`,
      password: 'ApiDebug123!'
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
    
    console.log('\n🔍 STEP 2: EXTRACT TOKEN AND TEST API ENDPOINTS');
    console.log('─'.repeat(50));
    
    // Get the token from localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    console.log(`Token exists: ${!!token}`);
    console.log(`Token length: ${token ? token.length : 0}`);
    
    if (!token) {
      console.log('❌ No token found - authentication failed');
      return;
    }
    
    // Test API endpoints directly
    const apiBaseUrl = 'https://app.floworx-iq.com/api';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('\n🧪 Testing API endpoints...');
    
    // Test 1: Health check
    console.log('\n1. Testing /api/health');
    try {
      const healthResponse = await page.evaluate(async (url) => {
        const response = await fetch(url);
        return {
          status: response.status,
          statusText: response.statusText,
          data: await response.json()
        };
      }, `${apiBaseUrl}/health`);
      
      console.log(`   Status: ${healthResponse.status} ${healthResponse.statusText}`);
      console.log(`   Data:`, healthResponse.data);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Test 2: Auth verify
    console.log('\n2. Testing /api/auth/verify');
    try {
      const verifyResponse = await page.evaluate(async (url, headers) => {
        const response = await fetch(url, { headers });
        return {
          status: response.status,
          statusText: response.statusText,
          data: await response.json()
        };
      }, `${apiBaseUrl}/auth/verify`, headers);
      
      console.log(`   Status: ${verifyResponse.status} ${verifyResponse.statusText}`);
      console.log(`   Data:`, verifyResponse.data);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Test 3: User status (the failing endpoint)
    console.log('\n3. Testing /api/auth/user/status');
    try {
      const statusResponse = await page.evaluate(async (url, headers) => {
        const response = await fetch(url, { headers });
        return {
          status: response.status,
          statusText: response.statusText,
          data: await response.json()
        };
      }, `${apiBaseUrl}/auth/user/status`, headers);
      
      console.log(`   Status: ${statusResponse.status} ${statusResponse.statusText}`);
      console.log(`   Data:`, statusResponse.data);
      
      if (statusResponse.status === 200) {
        console.log('   ✅ User status endpoint working correctly!');
      } else {
        console.log('   ❌ User status endpoint failed');
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Test 4: Dashboard endpoint
    console.log('\n4. Testing /api/auth/dashboard');
    try {
      const dashboardResponse = await page.evaluate(async (url, headers) => {
        const response = await fetch(url, { headers });
        return {
          status: response.status,
          statusText: response.statusText,
          data: await response.json()
        };
      }, `${apiBaseUrl}/auth/dashboard`, headers);
      
      console.log(`   Status: ${dashboardResponse.status} ${dashboardResponse.statusText}`);
      console.log(`   Data:`, dashboardResponse.data);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Test 5: Onboarding status
    console.log('\n5. Testing /api/onboarding/status');
    try {
      const onboardingResponse = await page.evaluate(async (url, headers) => {
        const response = await fetch(url, { headers });
        return {
          status: response.status,
          statusText: response.statusText,
          data: await response.json()
        };
      }, `${apiBaseUrl}/onboarding/status`, headers);
      
      console.log(`   Status: ${onboardingResponse.status} ${onboardingResponse.statusText}`);
      console.log(`   Data:`, onboardingResponse.data);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('\n🔍 STEP 3: CHECK NETWORK REQUESTS IN BROWSER');
    console.log('─'.repeat(50));
    
    // Monitor network requests
    const networkRequests = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        networkRequests.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    
    // Refresh the dashboard to trigger API calls
    await page.goto('https://app.floworx-iq.com/dashboard');
    await page.waitForTimeout(5000);
    
    console.log('\nNetwork requests made:');
    networkRequests.forEach((req, index) => {
      console.log(`   ${index + 1}. ${req.status} ${req.statusText} - ${req.url}`);
    });
    
    console.log('\n📊 DIAGNOSIS SUMMARY');
    console.log('─'.repeat(50));
    
    const currentUrl = page.url();
    const hasError = await page.locator('text=Failed to load user details').count() > 0;
    
    console.log(`Current URL: ${currentUrl}`);
    console.log(`Has error message: ${hasError}`);
    console.log(`Token available: ${!!token}`);
    console.log(`Network requests made: ${networkRequests.length}`);
    
    if (hasError) {
      console.log('\n🎯 ERROR FOUND: "Failed to load user details"');
      console.log('This suggests the /api/auth/user/status endpoint is failing');
      
      // Check console errors
      const consoleErrors = await page.evaluate(() => {
        return window.console.errors || [];
      });
      
      if (consoleErrors.length > 0) {
        console.log('\nConsole errors:');
        consoleErrors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

// Run debug
debugApiEndpoints()
  .then(() => {
    console.log('\n🎉 API endpoints debug completed');
  })
  .catch(console.error);
