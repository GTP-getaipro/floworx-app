const { chromium } = require('playwright');

async function debugBackendResponse() {
  console.log('🔍 DEBUGGING BACKEND RESPONSE ISSUE');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture all network activity
  const networkLogs = [];
  
  page.on('request', request => {
    networkLogs.push({
      type: 'REQUEST',
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      postData: request.postData()
    });
    
    if (request.url().includes('/api/')) {
      console.log(`🌐 REQUEST: ${request.method()} ${request.url()}`);
      if (request.postData()) {
        console.log(`📤 POST DATA:`, request.postData());
      }
    }
  });

  page.on('response', async response => {
    const responseData = {
      type: 'RESPONSE',
      status: response.status(),
      url: response.url(),
      headers: response.headers()
    };
    
    try {
      if (response.url().includes('/api/')) {
        const contentType = response.headers()['content-type'] || '';
        let body = null;
        
        if (contentType.includes('application/json')) {
          body = await response.json();
        } else {
          body = await response.text();
        }
        
        responseData.body = body;
        console.log(`📡 RESPONSE: ${response.status()} ${response.url()}`);
        console.log(`📥 RESPONSE BODY:`, body);
      }
    } catch (error) {
      console.log(`❌ Error reading response body: ${error.message}`);
    }
    
    networkLogs.push(responseData);
  });

  page.on('requestfailed', request => {
    console.log(`❌ REQUEST FAILED: ${request.method()} ${request.url()}`);
    console.log(`❌ FAILURE REASON: ${request.failure()?.errorText}`);
  });

  // Listen for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ BROWSER ERROR: ${msg.text()}`);
    }
  });

  try {
    console.log('\n🌐 NAVIGATING TO REGISTRATION PAGE');
    console.log('─'.repeat(50));
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('\n📝 FILLING REGISTRATION FORM');
    console.log('─'.repeat(50));

    const testUser = {
      firstName: 'Debug',
      lastName: 'Test',
      companyName: 'Debug Company',
      email: `debugtest.${Date.now()}@example.com`,
      password: 'DebugPassword123!'
    };

    console.log(`👤 Test user: ${testUser.email}`);

    // Fill form
    await page.fill('input[name="firstName"]', testUser.firstName);
    await page.fill('input[name="lastName"]', testUser.lastName);
    await page.fill('input[name="companyName"]', testUser.companyName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);

    console.log('✅ Form filled successfully');

    // Wait for validation
    await page.waitForTimeout(2000);

    // Check validation state
    const errorCount = await page.locator('p.text-danger').count();
    console.log(`⚡ Validation errors: ${errorCount}`);

    if (errorCount > 0) {
      const errors = await page.locator('p.text-danger').allTextContents();
      console.log(`❌ Validation errors: ${errors.join(', ')}`);
      return;
    }

    console.log('\n🚀 ATTEMPTING FORM SUBMISSION');
    console.log('─'.repeat(50));

    // Clear network logs before submission
    networkLogs.length = 0;

    // Submit form
    const submitButton = page.locator('button[type="submit"]');
    console.log('🔘 Clicking submit button...');
    
    await submitButton.click();
    
    console.log('⏳ Waiting for response...');
    await page.waitForTimeout(10000); // Wait longer for response

    console.log('\n📊 NETWORK ACTIVITY ANALYSIS');
    console.log('─'.repeat(50));

    const apiRequests = networkLogs.filter(log => log.url && log.url.includes('/api/'));
    console.log(`🌐 Total API requests: ${apiRequests.filter(log => log.type === 'REQUEST').length}`);
    console.log(`📡 Total API responses: ${apiRequests.filter(log => log.type === 'RESPONSE').length}`);

    if (apiRequests.length === 0) {
      console.log('❌ NO API REQUESTS DETECTED - Form submission not triggering API calls');
    } else {
      apiRequests.forEach((log, index) => {
        console.log(`\n${index + 1}. ${log.type}: ${log.method || 'N/A'} ${log.url}`);
        if (log.type === 'REQUEST' && log.postData) {
          console.log(`   📤 Data: ${log.postData}`);
        }
        if (log.type === 'RESPONSE') {
          console.log(`   📡 Status: ${log.status}`);
          if (log.body) {
            console.log(`   📥 Body:`, log.body);
          }
        }
      });
    }

    console.log('\n🔍 CHECKING FORM STATE AFTER SUBMISSION');
    console.log('─'.repeat(50));

    // Check if form is still visible or if there's a success/error message
    const formVisible = await page.locator('form').isVisible();
    const successMessage = await page.locator('text=/success/, text=/registered/, text=/created/, text=/account created/').count();
    const errorMessage = await page.locator('text=/error/, text=/failed/, text=/invalid/').count();
    const loadingIndicator = await page.locator('text=/loading/, text=/submitting/, .loading, .spinner').count();

    console.log(`📋 Form still visible: ${formVisible ? '✅' : '❌'}`);
    console.log(`✅ Success message: ${successMessage > 0 ? '✅' : '❌'}`);
    console.log(`❌ Error message: ${errorMessage > 0 ? '✅' : '❌'}`);
    console.log(`⏳ Loading indicator: ${loadingIndicator > 0 ? '✅' : '❌'}`);

    if (successMessage > 0) {
      const successText = await page.locator('text=/success/, text=/registered/, text=/created/').first().textContent();
      console.log(`✅ Success text: "${successText}"`);
    }

    if (errorMessage > 0) {
      const errorText = await page.locator('text=/error/, text=/failed/, text=/invalid/').first().textContent();
      console.log(`❌ Error text: "${errorText}"`);
    }

    console.log('\n🔍 CHECKING BROWSER CONSOLE FOR ERRORS');
    console.log('─'.repeat(50));

    // Get any JavaScript errors
    const jsErrors = await page.evaluate(() => {
      return window.console.errors || [];
    });

    if (jsErrors.length > 0) {
      console.log('❌ JavaScript errors found:');
      jsErrors.forEach(error => console.log(`   ${error}`));
    } else {
      console.log('✅ No JavaScript errors in console');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

// Run debug
debugBackendResponse()
  .then(() => {
    console.log('\n📋 Backend response debug completed');
  })
  .catch(console.error);
