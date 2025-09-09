const { chromium } = require('playwright');

async function testNewRoute() {
  console.log('🧪 TESTING NEW TEST ROUTE');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Create test user and get token
    const testUser = {
      firstName: 'New',
      lastName: 'Route',
      companyName: 'New Route Co',
      email: `new.route.${Date.now()}@example.com`,
      password: 'NewRoute123!'
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
    
    // Test new test route
    console.log('\n1. Testing NEW /api/auth/test-status');
    const testStatusResult = await page.evaluate(async (authToken) => {
      try {
        const response = await fetch('https://app.floworx-iq.com/api/auth/test-status', {
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
    
    console.log(`   Status: ${testStatusResult.status || 'Error'}`);
    console.log(`   Response:`, testStatusResult.data || testStatusResult.error);
    
    // Test original problematic route
    console.log('\n2. Testing ORIGINAL /api/auth/user/status');
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
    
    // Test verify route (should work)
    console.log('\n3. Testing /api/auth/verify (should work)');
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
    
    console.log('\n📊 ANALYSIS:');
    console.log('─'.repeat(50));
    
    if (testStatusResult.status === 200) {
      console.log('✅ NEW test route WORKING - Backend deployment successful!');
      console.log('   This means our changes are being deployed correctly');
    } else if (testStatusResult.status === 404) {
      console.log('❌ NEW test route NOT FOUND - Deployment issue');
      console.log('   This means our changes are not being deployed');
    } else {
      console.log(`⚠️  NEW test route returned ${testStatusResult.status}`);
    }
    
    if (userStatusResult.status === 200) {
      console.log('✅ ORIGINAL user/status route WORKING - Issue resolved!');
    } else if (userStatusResult.status === 404) {
      console.log('❌ ORIGINAL user/status route still NOT FOUND');
      console.log('   This suggests a specific issue with this route definition');
    }
    
    console.log('\n🎯 NEXT STEPS:');
    console.log('─'.repeat(50));
    
    if (testStatusResult.status === 200 && userStatusResult.status === 404) {
      console.log('1. Backend deployment is working');
      console.log('2. New routes are being registered');
      console.log('3. Issue is specific to the /user/status route definition');
      console.log('4. Need to check route path or middleware conflicts');
    } else if (testStatusResult.status === 404) {
      console.log('1. Backend deployment is not working');
      console.log('2. Changes are not being deployed to production');
      console.log('3. Need to check Vercel deployment configuration');
    } else if (testStatusResult.status === 200 && userStatusResult.status === 200) {
      console.log('1. 🎉 ALL ROUTES WORKING!');
      console.log('2. Dashboard should now load correctly');
      console.log('3. Issue has been resolved');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testNewRoute()
  .then(() => console.log('\n🎉 New route test completed'))
  .catch(console.error);
