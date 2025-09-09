const { chromium } = require('playwright');

async function debugRoutes() {
  console.log('🔍 DEBUGGING ROUTE REGISTRATION');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('\n🧪 STEP 1: TEST ALL POSSIBLE ROUTE VARIATIONS');
    console.log('─'.repeat(50));
    
    // Create a test user first
    const testUser = {
      firstName: 'Route',
      lastName: 'Debug',
      companyName: 'Route Debug Co',
      email: `route.debug.${Date.now()}@example.com`,
      password: 'RouteDebug123!'
    };
    
    console.log(`👤 Creating user: ${testUser.email}`);
    
    // Register and get token
    const registerResponse = await page.evaluate(async (userData) => {
      try {
        const response = await fetch('https://app.floworx-iq.com/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: userData.firstName,
            lastName: userData.lastName,
            companyName: userData.companyName,
            email: userData.email,
            password: userData.password,
            confirmPassword: userData.password,
            agreeToTerms: true,
            marketingConsent: false
          })
        });
        return {
          status: response.status,
          data: await response.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    }, testUser);
    
    if (!registerResponse.data?.token) {
      console.log('❌ Failed to get token from registration');
      return;
    }
    
    const token = registerResponse.data.token;
    console.log(`✅ Token obtained: ${token.substring(0, 20)}...`);
    
    console.log('\n🔍 Testing different route variations:');
    
    const routesToTest = [
      '/api/auth/user/status',
      '/api/user/status', 
      '/api/auth/status',
      '/api/auth/verify',
      '/api/onboarding/status',
      '/api/dashboard',
      '/api/auth/dashboard'
    ];
    
    for (const route of routesToTest) {
      const response = await page.evaluate(async (url, authToken) => {
        try {
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });
          return {
            status: response.status,
            statusText: response.statusText,
            data: await response.json()
          };
        } catch (error) {
          return { error: error.message };
        }
      }, `https://app.floworx-iq.com${route}`, token);
      
      console.log(`   ${route}: ${response.status || 'Error'} ${response.statusText || ''}`);
      if (response.status === 200) {
        console.log(`     ✅ SUCCESS: ${route} is working!`);
      } else if (response.status === 404) {
        console.log(`     ❌ NOT FOUND: ${route} doesn't exist`);
      } else if (response.status === 401) {
        console.log(`     🔒 UNAUTHORIZED: ${route} requires auth`);
      } else {
        console.log(`     ⚠️  OTHER: ${response.data?.message || response.error || 'Unknown error'}`);
      }
    }
    
    console.log('\n🧪 STEP 2: TEST ROUTE DISCOVERY');
    console.log('─'.repeat(50));
    
    // Try to discover available routes by testing common patterns
    const commonRoutes = [
      '/api',
      '/api/health',
      '/api/auth',
      '/api/user',
      '/api/dashboard',
      '/api/onboarding'
    ];
    
    console.log('Testing base routes for discovery:');
    for (const route of commonRoutes) {
      const response = await page.evaluate(async (url) => {
        try {
          const response = await fetch(url);
          return {
            status: response.status,
            statusText: response.statusText
          };
        } catch (error) {
          return { error: error.message };
        }
      }, `https://app.floworx-iq.com${route}`);
      
      console.log(`   ${route}: ${response.status || 'Error'} ${response.statusText || ''}`);
    }
    
    console.log('\n🧪 STEP 3: CHECK FRONTEND NETWORK REQUESTS');
    console.log('─'.repeat(50));
    
    // Monitor all network requests when accessing dashboard
    const networkRequests = [];
    page.on('response', response => {
      networkRequests.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        method: response.request().method()
      });
    });
    
    // Go to dashboard and see what requests are made
    await page.goto('https://app.floworx-iq.com/dashboard');
    await page.waitForTimeout(5000);
    
    console.log('All network requests made:');
    networkRequests.forEach((req, index) => {
      if (req.url.includes('/api/')) {
        console.log(`   ${index + 1}. ${req.method} ${req.status} ${req.statusText} - ${req.url}`);
      }
    });
    
    console.log('\n🧪 STEP 4: CHECK CURRENT BACKEND DEPLOYMENT');
    console.log('─'.repeat(50));
    
    // Check if the backend is actually deployed with our changes
    const healthResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('https://app.floworx-iq.com/api/health');
        return {
          status: response.status,
          data: await response.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('Backend health check:');
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Data:`, healthResponse.data);
    
    if (healthResponse.data?.timestamp) {
      const deployTime = new Date(healthResponse.data.timestamp);
      const now = new Date();
      const timeDiff = Math.round((now - deployTime) / 1000);
      console.log(`   Deployment age: ${timeDiff} seconds ago`);
      
      if (timeDiff > 300) {
        console.log('   ⚠️  Backend might not have latest changes (>5 minutes old)');
      } else {
        console.log('   ✅ Backend appears to be recently deployed');
      }
    }
    
    console.log('\n📊 ROUTE DEBUG SUMMARY');
    console.log('─'.repeat(50));
    
    const workingRoutes = routesToTest.filter(async route => {
      const response = await page.evaluate(async (url, authToken) => {
        try {
          const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
          });
          return response.status === 200;
        } catch {
          return false;
        }
      }, `https://app.floworx-iq.com${route}`, token);
      return response;
    });
    
    console.log(`Working routes found: ${workingRoutes.length}/${routesToTest.length}`);
    console.log('Next steps:');
    console.log('1. Check if backend deployment completed');
    console.log('2. Verify route definitions in backend code');
    console.log('3. Check for any middleware blocking routes');
    console.log('4. Test with different authentication methods');
    
  } catch (error) {
    console.error('❌ Route debug failed:', error);
  } finally {
    await browser.close();
  }
}

// Run debug
debugRoutes()
  .then(() => {
    console.log('\n🎉 Route debugging completed');
  })
  .catch(console.error);
