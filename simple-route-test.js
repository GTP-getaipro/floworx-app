const { chromium } = require('playwright');

async function simpleRouteTest() {
  console.log('🔍 SIMPLE ROUTE TEST');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Create test user and get token
    const testUser = {
      firstName: 'Simple',
      lastName: 'Test',
      companyName: 'Simple Test Co',
      email: `simple.test.${Date.now()}@example.com`,
      password: 'SimpleTest123!'
    };
    
    console.log(`👤 Creating user: ${testUser.email}`);
    
    // Register user
    const registerResponse = await page.evaluate(async (userData) => {
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
      return { status: response.status, data: await response.json() };
    }, testUser);
    
    if (!registerResponse.data?.token) {
      console.log('❌ Failed to get token');
      return;
    }
    
    const token = registerResponse.data.token;
    console.log(`✅ Token: ${token.substring(0, 20)}...`);
    
    console.log('\n🧪 TESTING ROUTES:');
    console.log('─'.repeat(50));
    
    // Test each route individually
    const routes = [
      '/api/auth/user/status',
      '/api/user/status',
      '/api/auth/verify',
      '/api/onboarding/status'
    ];
    
    for (const route of routes) {
      console.log(`\nTesting: ${route}`);
      
      const result = await page.evaluate(async (routeUrl, authToken) => {
        try {
          const response = await fetch(routeUrl, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          const data = await response.json();
          return {
            status: response.status,
            statusText: response.statusText,
            data: data
          };
        } catch (error) {
          return { error: error.message };
        }
      }, `https://app.floworx-iq.com${route}`, token);
      
      console.log(`   Status: ${result.status || 'Error'}`);
      console.log(`   Response:`, result.data || result.error);
      
      if (result.status === 200) {
        console.log(`   ✅ ${route} is WORKING!`);
      } else if (result.status === 404) {
        console.log(`   ❌ ${route} NOT FOUND`);
      } else {
        console.log(`   ⚠️  ${route} returned ${result.status}`);
      }
    }
    
    console.log('\n🔍 CHECKING WHAT ROUTES ACTUALLY EXIST:');
    console.log('─'.repeat(50));
    
    // Test auth routes that we know should work
    const knownRoutes = [
      '/api/health',
      '/api/auth/verify',
      '/api/auth/login'
    ];
    
    for (const route of knownRoutes) {
      const result = await page.evaluate(async (routeUrl, authToken) => {
        try {
          const response = await fetch(routeUrl, {
            headers: authToken ? {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            } : {}
          });
          return { status: response.status };
        } catch (error) {
          return { error: error.message };
        }
      }, `https://app.floworx-iq.com${route}`, route.includes('/auth/') ? token : null);
      
      console.log(`   ${route}: ${result.status || 'Error'}`);
    }
    
    console.log('\n📊 SUMMARY:');
    console.log('─'.repeat(50));
    console.log('If /api/auth/user/status returns 404, the route is not registered');
    console.log('If /api/auth/verify returns 200, auth routes are working');
    console.log('This suggests a specific issue with the user/status route definition');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

simpleRouteTest()
  .then(() => console.log('\n🎉 Simple route test completed'))
  .catch(console.error);
