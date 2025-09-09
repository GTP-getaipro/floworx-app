const { chromium } = require('playwright');

async function testApiDirect() {
  console.log('🔍 TESTING API ENDPOINTS DIRECTLY');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('\n🧪 STEP 1: TEST API HEALTH ENDPOINTS');
    console.log('─'.repeat(50));
    
    // Test health endpoint
    const healthResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('https://app.floworx-iq.com/api/health');
        return {
          status: response.status,
          statusText: response.statusText,
          data: await response.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('Health endpoint test:');
    console.log(`   Status: ${healthResponse.status || 'Error'}`);
    console.log(`   Data:`, healthResponse.data || healthResponse.error);
    
    console.log('\n🧪 STEP 2: TEST REGISTRATION ENDPOINT');
    console.log('─'.repeat(50));
    
    const testUser = {
      firstName: 'Direct',
      lastName: 'API',
      companyName: 'Direct API Co',
      email: `direct.api.${Date.now()}@example.com`,
      password: 'DirectAPI123!'
    };
    
    console.log(`👤 Testing registration for: ${testUser.email}`);
    
    const registerResponse = await page.evaluate(async (userData) => {
      try {
        const response = await fetch('https://app.floworx-iq.com/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
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
          statusText: response.statusText,
          data: await response.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    }, testUser);
    
    console.log('Registration test:');
    console.log(`   Status: ${registerResponse.status || 'Error'}`);
    console.log(`   Data:`, registerResponse.data || registerResponse.error);
    
    console.log('\n🧪 STEP 3: TEST LOGIN ENDPOINT');
    console.log('─'.repeat(50));
    
    const loginResponse = await page.evaluate(async (userData) => {
      try {
        const response = await fetch('https://app.floworx-iq.com/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            email: userData.email,
            password: userData.password
          })
        });
        
        return {
          status: response.status,
          statusText: response.statusText,
          data: await response.json()
        };
      } catch (error) {
        return { error: error.message };
      }
    }, testUser);
    
    console.log('Login test:');
    console.log(`   Status: ${loginResponse.status || 'Error'}`);
    console.log(`   Data:`, loginResponse.data || loginResponse.error);
    
    // If login successful, test protected endpoints
    if (loginResponse.data && loginResponse.data.token) {
      const token = loginResponse.data.token;
      console.log(`   ✅ Token received: ${token.substring(0, 20)}...`);
      
      console.log('\n🧪 STEP 4: TEST PROTECTED ENDPOINTS');
      console.log('─'.repeat(50));
      
      // Test user status endpoint
      const statusResponse = await page.evaluate(async (token) => {
        try {
          const response = await fetch('https://app.floworx-iq.com/api/auth/user/status', {
            headers: {
              'Authorization': `Bearer ${token}`,
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
      }, token);
      
      console.log('User status test:');
      console.log(`   Status: ${statusResponse.status || 'Error'}`);
      console.log(`   Data:`, statusResponse.data || statusResponse.error);
      
      if (statusResponse.status === 200) {
        console.log('   ✅ User status endpoint working correctly!');
      } else {
        console.log('   ❌ User status endpoint failed');
      }
      
      // Test onboarding status endpoint
      const onboardingResponse = await page.evaluate(async (token) => {
        try {
          const response = await fetch('https://app.floworx-iq.com/api/onboarding/status', {
            headers: {
              'Authorization': `Bearer ${token}`,
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
      }, token);
      
      console.log('Onboarding status test:');
      console.log(`   Status: ${onboardingResponse.status || 'Error'}`);
      console.log(`   Data:`, onboardingResponse.data || onboardingResponse.error);
      
    } else {
      console.log('   ❌ No token received - cannot test protected endpoints');
    }
    
    console.log('\n🧪 STEP 5: TEST FRONTEND LOGIN FLOW');
    console.log('─'.repeat(50));
    
    // Test the actual frontend login flow
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForLoadState('networkidle');
    
    console.log('Testing frontend login flow...');
    
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
    const token = await page.evaluate(() => localStorage.getItem('token'));
    
    console.log(`   Current URL: ${currentUrl}`);
    console.log(`   Token in localStorage: ${!!token}`);
    console.log(`   Token length: ${token ? token.length : 0}`);
    
    console.log('\nNetwork requests during login:');
    networkRequests.forEach((req, index) => {
      console.log(`   ${index + 1}. ${req.status} ${req.statusText} - ${req.url}`);
    });
    
    // Check for error messages on page
    const errorMessage = await page.locator('text=Failed to load user details').count();
    console.log(`   Error message visible: ${errorMessage > 0}`);
    
    console.log('\n📊 DIAGNOSIS SUMMARY');
    console.log('─'.repeat(50));
    
    const apiHealthy = healthResponse.status === 200;
    const registrationWorking = registerResponse.status === 201;
    const loginWorking = loginResponse.status === 200 && loginResponse.data?.token;
    const frontendLoginWorking = currentUrl.includes('/dashboard') && !!token;
    
    console.log(`✅ API Health: ${apiHealthy ? 'Working' : 'Failed'}`);
    console.log(`✅ Registration: ${registrationWorking ? 'Working' : 'Failed'}`);
    console.log(`✅ Direct Login: ${loginWorking ? 'Working' : 'Failed'}`);
    console.log(`✅ Frontend Login: ${frontendLoginWorking ? 'Working' : 'Failed'}`);
    
    if (apiHealthy && registrationWorking && loginWorking && !frontendLoginWorking) {
      console.log('\n🎯 ISSUE IDENTIFIED: Frontend login flow problem');
      console.log('API endpoints work directly but frontend login fails');
      console.log('This suggests a frontend-backend integration issue');
    } else if (!loginWorking) {
      console.log('\n🎯 ISSUE IDENTIFIED: Backend authentication problem');
      console.log('Direct API login is failing');
    } else if (frontendLoginWorking) {
      console.log('\n🎉 ALL SYSTEMS WORKING: Dashboard should load correctly');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run test
testApiDirect()
  .then(() => {
    console.log('\n🎉 Direct API test completed');
  })
  .catch(console.error);
