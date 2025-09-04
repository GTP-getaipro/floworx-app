const { chromium } = require('playwright');

async function fixedRouteTest() {
  console.log('🔍 FIXED ROUTE TEST');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Create test user and get token
    const testUser = {
      firstName: 'Fixed',
      lastName: 'Test',
      companyName: 'Fixed Test Co',
      email: `fixed.test.${Date.now()}@example.com`,
      password: 'FixedTest123!'
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
    
    // Test /api/auth/user/status
    console.log('\n1. Testing /api/auth/user/status');
    const userStatusResult = await page.evaluate(async (authToken) => {
      try {
        const response = await fetch('https://app.floworx-iq.com/api/auth/user/status', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        return { status: response.status, data: data };
      } catch (error) {
        return { error: error.message };
      }
    }, token);
    
    console.log(`   Status: ${userStatusResult.status || 'Error'}`);
    console.log(`   Response:`, userStatusResult.data || userStatusResult.error);
    
    // Test /api/auth/verify
    console.log('\n2. Testing /api/auth/verify');
    const verifyResult = await page.evaluate(async (authToken) => {
      try {
        const response = await fetch('https://app.floworx-iq.com/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        return { status: response.status, data: data };
      } catch (error) {
        return { error: error.message };
      }
    }, token);
    
    console.log(`   Status: ${verifyResult.status || 'Error'}`);
    console.log(`   Response:`, verifyResult.data || verifyResult.error);
    
    // Test /api/onboarding/status
    console.log('\n3. Testing /api/onboarding/status');
    const onboardingResult = await page.evaluate(async (authToken) => {
      try {
        const response = await fetch('https://app.floworx-iq.com/api/onboarding/status', {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        return { status: response.status, data: data };
      } catch (error) {
        return { error: error.message };
      }
    }, token);
    
    console.log(`   Status: ${onboardingResult.status || 'Error'}`);
    console.log(`   Response:`, onboardingResult.data || onboardingResult.error);
    
    // Test /api/health (no auth needed)
    console.log('\n4. Testing /api/health');
    const healthResult = await page.evaluate(async () => {
      try {
        const response = await fetch('https://app.floworx-iq.com/api/health');
        const data = await response.json();
        return { status: response.status, data: data };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log(`   Status: ${healthResult.status || 'Error'}`);
    console.log(`   Response:`, healthResult.data || healthResult.error);
    
    console.log('\n📊 ANALYSIS:');
    console.log('─'.repeat(50));
    
    if (userStatusResult.status === 404) {
      console.log('❌ /api/auth/user/status NOT FOUND - Route not registered');
    } else if (userStatusResult.status === 200) {
      console.log('✅ /api/auth/user/status WORKING - Route is registered');
    } else {
      console.log(`⚠️  /api/auth/user/status returned ${userStatusResult.status}`);
    }
    
    if (verifyResult.status === 200) {
      console.log('✅ /api/auth/verify WORKING - Auth routes are functional');
    } else {
      console.log('❌ /api/auth/verify FAILED - Auth routes have issues');
    }
    
    if (onboardingResult.status === 404) {
      console.log('❌ /api/onboarding/status NOT FOUND - Onboarding routes not registered');
    } else if (onboardingResult.status === 200) {
      console.log('✅ /api/onboarding/status WORKING - Onboarding routes are registered');
    }
    
    if (healthResult.status === 200) {
      console.log('✅ /api/health WORKING - Backend is responding');
    } else {
      console.log('❌ /api/health FAILED - Backend has issues');
    }
    
    console.log('\n🎯 CONCLUSION:');
    console.log('─'.repeat(50));
    
    if (userStatusResult.status === 404 && verifyResult.status === 200) {
      console.log('ISSUE: Specific route /api/auth/user/status is not registered');
      console.log('SOLUTION: Check route definition in backend/routes/auth.js');
    } else if (verifyResult.status !== 200) {
      console.log('ISSUE: Auth routes are not working properly');
      console.log('SOLUTION: Check backend deployment and auth middleware');
    } else if (userStatusResult.status === 200) {
      console.log('SUCCESS: All routes are working correctly!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

fixedRouteTest()
  .then(() => console.log('\n🎉 Fixed route test completed'))
  .catch(console.error);
