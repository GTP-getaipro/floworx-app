const { chromium } = require('playwright');

async function testCorrectEndpoint() {
  console.log('🧪 TESTING CORRECT API ENDPOINT');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Create test user and get token
    const testUser = {
      firstName: 'Correct',
      lastName: 'Endpoint',
      companyName: 'Correct Endpoint Co',
      email: `correct.endpoint.${Date.now()}@example.com`,
      password: 'CorrectEndpoint123!'
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
    
    console.log('\n🧪 TESTING CORRECT ENDPOINTS:');
    console.log('─'.repeat(50));
    
    // Test CORRECT user status endpoint
    console.log('\n1. Testing CORRECT /api/user/status');
    const userStatusResult = await page.evaluate(async (authToken) => {
      try {
        const response = await fetch('https://app.floworx-iq.com/api/user/status', {
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
    
    // Test auth verify (should still work)
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
    
    console.log('\n🧪 TESTING DASHBOARD FLOW:');
    console.log('─'.repeat(50));
    
    // Test actual dashboard login flow
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForLoadState('networkidle');
    
    console.log('Testing dashboard login flow...');
    
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
    
    // Fill login form
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(8000);
    
    const currentUrl = page.url();
    const token_localStorage = await page.evaluate(() => localStorage.getItem('token'));
    
    console.log(`   Current URL: ${currentUrl}`);
    console.log(`   Token in localStorage: ${!!token_localStorage}`);
    console.log(`   Token length: ${token_localStorage ? token_localStorage.length : 0}`);
    
    console.log('\nNetwork requests during login:');
    networkRequests.forEach((req, index) => {
      console.log(`   ${index + 1}. ${req.status} ${req.statusText} - ${req.url}`);
    });
    
    // Check for error messages on page
    const errorMessage = await page.locator('text=Failed to load user details').count();
    const successMessage = await page.locator('text=Welcome').count();
    
    console.log(`   Error message visible: ${errorMessage > 0}`);
    console.log(`   Welcome message visible: ${successMessage > 0}`);
    
    console.log('\n📊 FINAL ANALYSIS:');
    console.log('─'.repeat(50));
    
    if (userStatusResult.status === 200) {
      console.log('✅ /api/user/status WORKING - Correct endpoint found!');
    } else {
      console.log(`❌ /api/user/status returned ${userStatusResult.status}`);
    }
    
    if (currentUrl.includes('/dashboard') && token_localStorage && errorMessage === 0) {
      console.log('🎉 DASHBOARD LOADING SUCCESSFULLY!');
      console.log('✅ User can login and access dashboard');
      console.log('✅ No error messages visible');
      console.log('✅ Token stored in localStorage');
    } else if (errorMessage > 0) {
      console.log('❌ Dashboard still showing error message');
    } else if (!currentUrl.includes('/dashboard')) {
      console.log('❌ User not redirected to dashboard');
    } else if (!token_localStorage) {
      console.log('❌ Token not stored in localStorage');
    }
    
    console.log('\n🎯 CONCLUSION:');
    console.log('─'.repeat(50));
    
    if (userStatusResult.status === 200 && currentUrl.includes('/dashboard') && errorMessage === 0) {
      console.log('🎉 SUCCESS: Dashboard issue has been RESOLVED!');
      console.log('✅ Correct API endpoints are working');
      console.log('✅ Frontend can load user details');
      console.log('✅ No more "Failed to load user details" error');
    } else {
      console.log('⚠️  Issue partially resolved but needs more work');
      console.log('Check the specific failing components above');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testCorrectEndpoint()
  .then(() => console.log('\n🎉 Correct endpoint test completed'))
  .catch(console.error);
