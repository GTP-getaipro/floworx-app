const { chromium } = require('playwright');

async function testApiEndpoint() {
  console.log('🔍 TESTING API ENDPOINT DIRECTLY');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('\n🌐 TESTING API ENDPOINTS');
    console.log('─'.repeat(50));

    // Test 1: Check environment variables in browser
    console.log('🔍 Checking environment variables...');
    const envVars = await page.evaluate(() => {
      return {
        NODE_ENV: process.env.NODE_ENV,
        REACT_APP_API_URL: process.env.REACT_APP_API_URL,
        windowLocation: window.location.href,
        windowOrigin: window.location.origin
      };
    });
    
    console.log('Environment variables:', envVars);

    // Test 2: Test axios configuration
    console.log('\n🔧 Testing axios configuration...');
    const axiosConfig = await page.evaluate(() => {
      // Check if axios is available
      if (typeof window.axios !== 'undefined') {
        return {
          baseURL: window.axios.defaults.baseURL,
          available: true
        };
      }
      return { available: false };
    });
    
    console.log('Axios config:', axiosConfig);

    // Test 3: Direct API call test
    console.log('\n🚀 Testing direct API calls...');
    
    const testEndpoints = [
      '/api/health',
      'https://app.floworx-iq.com/api/health',
      '/api/auth/register'
    ];

    for (const endpoint of testEndpoints) {
      console.log(`\n📡 Testing endpoint: ${endpoint}`);
      
      try {
        const result = await page.evaluate(async (url) => {
          const response = await fetch(url, {
            method: url.includes('register') ? 'POST' : 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            body: url.includes('register') ? JSON.stringify({
              email: 'test@example.com',
              password: 'TestPassword123!',
              firstName: 'Test',
              lastName: 'User'
            }) : undefined
          });
          
          let responseData;
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
          } else {
            responseData = await response.text();
          }
          
          return {
            status: response.status,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries()),
            data: responseData,
            url: response.url
          };
        }, endpoint);
        
        console.log(`   Status: ${result.status} ${result.ok ? '✅' : '❌'}`);
        console.log(`   Final URL: ${result.url}`);
        console.log(`   Response:`, result.data);
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    // Test 4: Test form submission with network monitoring
    console.log('\n📝 TESTING FORM SUBMISSION WITH NETWORK MONITORING');
    console.log('─'.repeat(50));

    const networkRequests = [];
    
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        networkRequests.push({
          type: 'request',
          method: request.method(),
          url: request.url(),
          headers: request.headers(),
          postData: request.postData()
        });
        console.log(`🌐 REQUEST: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        try {
          const responseData = await response.text();
          networkRequests.push({
            type: 'response',
            status: response.status(),
            url: response.url(),
            data: responseData
          });
          console.log(`📡 RESPONSE: ${response.status()} ${response.url()}`);
          console.log(`📄 Data: ${responseData}`);
        } catch (e) {
          console.log(`❌ Error reading response: ${e.message}`);
        }
      }
    });

    // Fill and submit form
    const testUser = {
      firstName: 'API',
      lastName: 'Test',
      companyName: 'API Test Company',
      email: `apitest.${Date.now()}@example.com`,
      password: 'ApiTestPassword123!'
    };

    console.log(`👤 Test user: ${testUser.email}`);

    await page.fill('input[name="firstName"]', testUser.firstName);
    await page.fill('input[name="lastName"]', testUser.lastName);
    await page.fill('input[name="companyName"]', testUser.companyName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);

    console.log('✅ Form filled');

    // Wait for validation
    await page.waitForTimeout(2000);

    // Check validation errors
    const errorCount = await page.locator('p.text-danger').count();
    console.log(`⚡ Validation errors: ${errorCount}`);

    if (errorCount === 0) {
      console.log('🚀 Submitting form...');
      
      // Clear previous network requests
      networkRequests.length = 0;
      
      await page.click('button[type="submit"]');
      
      // Wait for network activity
      await page.waitForTimeout(8000);
      
      console.log(`📊 Network requests captured: ${networkRequests.length}`);
      
      if (networkRequests.length === 0) {
        console.log('❌ NO NETWORK REQUESTS - Form submission not working');
        
        // Check if there are any JavaScript errors
        const jsErrors = await page.evaluate(() => {
          return window.console.errors || [];
        });
        
        if (jsErrors.length > 0) {
          console.log('❌ JavaScript errors:', jsErrors);
        }
        
        // Check form state
        const formState = await page.evaluate(() => {
          const form = document.querySelector('form');
          const submitButton = document.querySelector('button[type="submit"]');
          
          return {
            formExists: !!form,
            submitButtonExists: !!submitButton,
            submitButtonDisabled: submitButton ? submitButton.disabled : null,
            submitButtonText: submitButton ? submitButton.textContent : null
          };
        });
        
        console.log('📋 Form state:', formState);
      } else {
        console.log('✅ Network requests detected');
        networkRequests.forEach((req, index) => {
          console.log(`${index + 1}. ${req.type.toUpperCase()}: ${req.method || ''} ${req.url}`);
          if (req.postData) {
            console.log(`   Data: ${req.postData}`);
          }
          if (req.data) {
            console.log(`   Response: ${req.data}`);
          }
        });
      }
    } else {
      console.log('❌ Form has validation errors, cannot submit');
      const errors = await page.locator('p.text-danger').allTextContents();
      console.log('Errors:', errors);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run test
testApiEndpoint()
  .then(() => {
    console.log('\n📋 API endpoint test completed');
  })
  .catch(console.error);
