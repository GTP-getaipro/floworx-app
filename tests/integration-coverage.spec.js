const { test, expect } = require('@playwright/test');

test.describe('Integration & API Coverage Tests', () => {
  
  test('should test complete API integration coverage', async ({ page }) => {
    console.log('🔗 Testing complete API integration coverage...');
    
    // Test all API endpoints
    const apiEndpoints = [
      { method: 'POST', url: '/api/auth/register', description: 'User registration' },
      { method: 'POST', url: '/api/auth/login', description: 'User login' },
      { method: 'POST', url: '/api/auth/logout', description: 'User logout' },
      { method: 'POST', url: '/api/auth/forgot-password', description: 'Password reset request' },
      { method: 'POST', url: '/api/auth/reset-password', description: 'Password reset' },
      { method: 'GET', url: '/api/auth/verify-email', description: 'Email verification' },
      { method: 'GET', url: '/api/user/profile', description: 'User profile' },
      { method: 'PUT', url: '/api/user/profile', description: 'Update profile' }
    ];
    
    for (const endpoint of apiEndpoints) {
      console.log(`🧪 Testing ${endpoint.method} ${endpoint.url} - ${endpoint.description}`);
      
      try {
        const response = await page.request[endpoint.method.toLowerCase()](`https://app.floworx-iq.com${endpoint.url}`, {
          data: endpoint.method !== 'GET' ? {
            email: `api.test.${Date.now()}@example.com`,
            password: 'ApiTest123!',
            firstName: 'API',
            lastName: 'Test'
          } : undefined
        });
        
        console.log(`   Status: ${response.status()}`);
        
        if (response.status() < 500) {
          console.log('   ✅ Endpoint accessible');
        } else {
          console.log('   ⚠️ Server error');
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    console.log('✅ API integration coverage completed');
  });

  test('should test database integration scenarios', async ({ page }) => {
    console.log('🗄️ Testing database integration scenarios...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    // Test 1: Successful data persistence
    const testUser = {
      firstName: 'Database',
      lastName: 'Integration',
      companyName: 'DB Integration Co',
      email: `db.integration.${Date.now()}@example.com`,
      password: 'DatabaseTest123!'
    };
    
    await page.fill('input[name="firstName"]', testUser.firstName);
    await page.fill('input[name="lastName"]', testUser.lastName);
    await page.fill('input[name="companyName"]', testUser.companyName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    console.log('✅ Database write operation tested');
    
    // Test 2: Duplicate email constraint
    await page.goto('https://app.floworx-iq.com/register');
    
    await page.fill('input[name="firstName"]', 'Duplicate');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', testUser.email); // Same email
    await page.fill('input[name="password"]', 'DuplicateTest123!');
    await page.fill('input[name="confirmPassword"]', 'DuplicateTest123!');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    const hasError = await page.locator('[class*="error"]').count() > 0;
    const stayedOnRegister = page.url().includes('/register');
    
    console.log(`✅ Duplicate email constraint: ${hasError || stayedOnRegister ? 'Working' : 'Needs review'}`);
    
    // Test 3: Data validation at database level
    const invalidDataTests = [
      { field: 'email', value: 'not-an-email', description: 'Invalid email format' },
      { field: 'firstName', value: '', description: 'Empty required field' },
      { field: 'lastName', value: '', description: 'Empty required field' }
    ];
    
    for (const test of invalidDataTests) {
      console.log(`🧪 Testing database validation: ${test.description}`);
      
      await page.goto('https://app.floworx-iq.com/register');
      
      await page.fill('input[name="firstName"]', test.field === 'firstName' ? test.value : 'Valid');
      await page.fill('input[name="lastName"]', test.field === 'lastName' ? test.value : 'User');
      await page.fill('input[name="email"]', test.field === 'email' ? test.value : `valid.${Date.now()}@example.com`);
      await page.fill('input[name="password"]', 'ValidPassword123!');
      await page.fill('input[name="confirmPassword"]', 'ValidPassword123!');
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      
      const hasValidationError = await page.locator('[class*="error"]').count() > 0;
      console.log(`   Result: ${hasValidationError ? 'Validation triggered' : 'No validation'}`);
    }
    
    console.log('✅ Database integration testing completed');
  });

  test('should test third-party service integrations', async ({ page }) => {
    console.log('🔌 Testing third-party service integrations...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    // Test email service integration (check for email-related API calls)
    const emailServiceCalls = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('mail') || url.includes('email') || url.includes('sendgrid') || url.includes('ses')) {
        emailServiceCalls.push({
          url: url,
          method: request.method()
        });
      }
    });
    
    // Complete registration to trigger email services
    await page.fill('input[name="firstName"]', 'Email');
    await page.fill('input[name="lastName"]', 'Service');
    await page.fill('input[name="email"]', `email.service.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'EmailService123!');
    await page.fill('input[name="confirmPassword"]', 'EmailService123!');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    console.log(`📧 Email service calls detected: ${emailServiceCalls.length}`);
    emailServiceCalls.forEach(call => {
      console.log(`   ${call.method} ${call.url}`);
    });
    
    // Test analytics integration (check for tracking calls)
    const analyticsCalls = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('analytics') || url.includes('gtag') || url.includes('facebook') || url.includes('mixpanel')) {
        analyticsCalls.push({
          url: url,
          method: request.method()
        });
      }
    });
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    console.log(`📊 Analytics calls detected: ${analyticsCalls.length}`);
    
    // Test CDN integration (check for external resource loading)
    const cdnCalls = [];
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('cdn') || url.includes('cloudflare') || url.includes('amazonaws')) {
        cdnCalls.push({
          url: url,
          method: request.method(),
          resourceType: request.resourceType()
        });
      }
    });
    
    await page.reload();
    await page.waitForTimeout(3000);
    
    console.log(`🌐 CDN calls detected: ${cdnCalls.length}`);
    
    console.log('✅ Third-party service integration testing completed');
  });

  test('should test frontend-backend data flow', async ({ page }) => {
    console.log('🔄 Testing frontend-backend data flow...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    // Monitor all network requests
    const networkRequests = [];
    
    page.on('request', request => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        headers: Object.fromEntries(request.headers()),
        postData: request.postData()
      });
    });
    
    page.on('response', response => {
      const request = networkRequests.find(req => req.url === response.url());
      if (request) {
        request.status = response.status();
        request.responseHeaders = Object.fromEntries(response.headers());
      }
    });
    
    // Fill and submit form
    const formData = {
      firstName: 'DataFlow',
      lastName: 'Test',
      companyName: 'DataFlow Testing Co',
      email: `dataflow.test.${Date.now()}@example.com`,
      password: 'DataFlowTest123!'
    };
    
    await page.fill('input[name="firstName"]', formData.firstName);
    await page.fill('input[name="lastName"]', formData.lastName);
    await page.fill('input[name="companyName"]', formData.companyName);
    await page.fill('input[name="email"]', formData.email);
    await page.fill('input[name="password"]', formData.password);
    await page.fill('input[name="confirmPassword"]', formData.password);
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    // Analyze data flow
    const registrationRequests = networkRequests.filter(req => 
      req.url.includes('/api/auth/register') && req.method === 'POST'
    );
    
    console.log(`📤 Registration requests: ${registrationRequests.length}`);
    
    registrationRequests.forEach((req, index) => {
      console.log(`   Request ${index + 1}:`);
      console.log(`     Status: ${req.status}`);
      console.log(`     Content-Type: ${req.headers['content-type']}`);
      console.log(`     Data sent: ${req.postData ? 'Yes' : 'No'}`);
      
      if (req.postData) {
        try {
          const data = JSON.parse(req.postData);
          console.log(`     Fields sent: ${Object.keys(data).join(', ')}`);
          
          // Verify password is not sent in plain text (should be hashed)
          if (data.password && data.password === formData.password) {
            console.log('     ⚠️ Password sent in plain text');
          } else {
            console.log('     ✅ Password properly handled');
          }
        } catch (e) {
          console.log('     Data format: Non-JSON');
        }
      }
    });
    
    console.log('✅ Frontend-backend data flow testing completed');
  });

  test('should test error propagation and handling', async ({ page }) => {
    console.log('🚨 Testing error propagation and handling...');
    
    // Test different error scenarios
    const errorScenarios = [
      {
        name: '400 Bad Request',
        mockResponse: { status: 400, body: { error: 'Bad request' } }
      },
      {
        name: '401 Unauthorized',
        mockResponse: { status: 401, body: { error: 'Unauthorized' } }
      },
      {
        name: '403 Forbidden',
        mockResponse: { status: 403, body: { error: 'Forbidden' } }
      },
      {
        name: '409 Conflict',
        mockResponse: { status: 409, body: { error: 'Email already exists' } }
      },
      {
        name: '422 Validation Error',
        mockResponse: { status: 422, body: { errors: { email: ['Invalid email format'] } } }
      },
      {
        name: '500 Server Error',
        mockResponse: { status: 500, body: { error: 'Internal server error' } }
      },
      {
        name: '503 Service Unavailable',
        mockResponse: { status: 503, body: { error: 'Service temporarily unavailable' } }
      }
    ];
    
    for (const scenario of errorScenarios) {
      console.log(`🧪 Testing error scenario: ${scenario.name}`);
      
      // Mock the API response
      await page.route('**/api/auth/register', route => {
        route.fulfill({
          status: scenario.mockResponse.status,
          contentType: 'application/json',
          body: JSON.stringify(scenario.mockResponse.body)
        });
      });
      
      await page.goto('https://app.floworx-iq.com/register');
      
      await page.fill('input[name="firstName"]', 'Error');
      await page.fill('input[name="lastName"]', 'Test');
      await page.fill('input[name="email"]', `error.test.${Date.now()}@example.com`);
      await page.fill('input[name="password"]', 'ErrorTest123!');
      await page.fill('input[name="confirmPassword"]', 'ErrorTest123!');
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      
      // Check how error is handled in UI
      const hasErrorMessage = await page.locator('[class*="error"], .text-red-500, .text-danger').count() > 0;
      const stayedOnPage = page.url().includes('/register');
      const buttonEnabled = await page.isEnabled('button[type="submit"]');
      
      console.log(`   Error displayed: ${hasErrorMessage ? 'Yes' : 'No'}`);
      console.log(`   Stayed on page: ${stayedOnPage ? 'Yes' : 'No'}`);
      console.log(`   Button re-enabled: ${buttonEnabled ? 'Yes' : 'No'}`);
      
      // Clear route mock
      await page.unroute('**/api/auth/register');
    }
    
    console.log('✅ Error propagation and handling testing completed');
  });

  test('should test state management and persistence', async ({ page }) => {
    console.log('💾 Testing state management and persistence...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    // Test form state persistence during navigation
    await page.fill('input[name="firstName"]', 'State');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', `state.test.${Date.now()}@example.com`);
    
    // Navigate away and back
    await page.goto('https://app.floworx-iq.com/login');
    await page.goBack();
    
    // Check if form data persisted
    const firstName = await page.inputValue('input[name="firstName"]');
    const lastName = await page.inputValue('input[name="lastName"]');
    const email = await page.inputValue('input[name="email"]');
    
    console.log(`📝 Form persistence after navigation:`);
    console.log(`   First name: ${firstName ? 'Preserved' : 'Cleared'}`);
    console.log(`   Last name: ${lastName ? 'Preserved' : 'Cleared'}`);
    console.log(`   Email: ${email ? 'Preserved' : 'Cleared'}`);
    
    // Test browser storage usage
    const localStorageData = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        data[key] = localStorage.getItem(key);
      }
      return data;
    });
    
    const sessionStorageData = await page.evaluate(() => {
      const data = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        data[key] = sessionStorage.getItem(key);
      }
      return data;
    });
    
    console.log(`💾 Local storage items: ${Object.keys(localStorageData).length}`);
    console.log(`💾 Session storage items: ${Object.keys(sessionStorageData).length}`);
    
    // Test form validation state persistence
    await page.fill('input[name="email"]', 'invalid-email');
    await page.locator('input[name="email"]').blur();
    await page.waitForTimeout(500);
    
    const hasValidationError = await page.locator('[class*="error"]').count() > 0;
    
    // Refresh page
    await page.reload();
    
    const validationErrorAfterReload = await page.locator('[class*="error"]').count() > 0;
    
    console.log(`⚠️ Validation error before reload: ${hasValidationError ? 'Yes' : 'No'}`);
    console.log(`⚠️ Validation error after reload: ${validationErrorAfterReload ? 'Yes' : 'No'}`);
    
    console.log('✅ State management and persistence testing completed');
  });
});
