const { chromium } = require('playwright');

async function testFormSubmission() {
  console.log('🔍 TESTING FORM SUBMISSION ISSUE');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture network activity
  const networkActivity = [];
  
  page.on('request', request => {
    networkActivity.push({
      type: 'REQUEST',
      method: request.method(),
      url: request.url(),
      headers: request.headers(),
      postData: request.postData()
    });
    
    if (request.url().includes('/api/')) {
      console.log(`🌐 API REQUEST: ${request.method()} ${request.url()}`);
      if (request.postData()) {
        console.log(`📤 POST DATA: ${request.postData()}`);
      }
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      console.log(`📡 API RESPONSE: ${response.status()} ${response.url()}`);
      try {
        const responseText = await response.text();
        console.log(`📥 RESPONSE BODY: ${responseText}`);
      } catch (e) {
        console.log(`❌ Could not read response body: ${e.message}`);
      }
    }
  });

  page.on('requestfailed', request => {
    console.log(`❌ REQUEST FAILED: ${request.method()} ${request.url()}`);
    console.log(`❌ FAILURE REASON: ${request.failure()?.errorText}`);
  });

  // Listen for console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`❌ BROWSER ERROR: ${msg.text()}`);
    } else if (msg.text().includes('🚀') || msg.text().includes('Registration')) {
      console.log(`🖥️ BROWSER: ${msg.text()}`);
    }
  });

  try {
    console.log('\n🌐 NAVIGATING TO REGISTRATION PAGE');
    console.log('─'.repeat(50));
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('\n📝 FILLING FORM WITH VALID DATA');
    console.log('─'.repeat(50));

    const testUser = {
      firstName: 'Form',
      lastName: 'Test',
      companyName: 'Form Test Company',
      email: `formtest.${Date.now()}@example.com`,
      password: 'FormTestPassword123!'
    };

    console.log(`👤 Test user: ${testUser.email}`);

    // Fill form step by step
    console.log('   Filling firstName...');
    await page.fill('input[name="firstName"]', testUser.firstName);
    
    console.log('   Filling lastName...');
    await page.fill('input[name="lastName"]', testUser.lastName);
    
    console.log('   Filling companyName...');
    await page.fill('input[name="companyName"]', testUser.companyName);
    
    console.log('   Filling email...');
    await page.fill('input[name="email"]', testUser.email);
    
    console.log('   Filling password...');
    await page.fill('input[name="password"]', testUser.password);
    
    console.log('   Filling confirmPassword...');
    await page.fill('input[name="confirmPassword"]', testUser.password);

    console.log('✅ Form filled successfully');

    // Wait for validation
    console.log('\n⚡ CHECKING VALIDATION STATE');
    console.log('─'.repeat(50));
    
    await page.waitForTimeout(3000);

    const errorCount = await page.locator('p.text-danger').count();
    console.log(`Validation errors: ${errorCount}`);

    if (errorCount > 0) {
      const errors = await page.locator('p.text-danger').allTextContents();
      console.log(`❌ Validation errors found: ${errors.join(', ')}`);
      return;
    }

    console.log('✅ No validation errors');

    // Check submit button state
    const submitButton = page.locator('button[type="submit"]');
    const buttonExists = await submitButton.count();
    const buttonEnabled = buttonExists > 0 ? await submitButton.isEnabled() : false;
    const buttonText = buttonExists > 0 ? await submitButton.textContent() : 'N/A';

    console.log(`Submit button exists: ${buttonExists > 0 ? '✅' : '❌'}`);
    console.log(`Submit button enabled: ${buttonEnabled ? '✅' : '❌'}`);
    console.log(`Submit button text: "${buttonText}"`);

    if (!buttonEnabled) {
      console.log('❌ Submit button is disabled, cannot proceed');
      return;
    }

    console.log('\n🚀 ATTEMPTING FORM SUBMISSION');
    console.log('─'.repeat(50));

    // Clear network activity before submission
    networkActivity.length = 0;

    // Click submit button
    console.log('🔘 Clicking submit button...');
    await submitButton.click();

    console.log('⏳ Waiting for response (10 seconds)...');
    await page.waitForTimeout(10000);

    // Analyze network activity
    console.log('\n📊 NETWORK ACTIVITY ANALYSIS');
    console.log('─'.repeat(50));

    const apiRequests = networkActivity.filter(activity => 
      activity.url && activity.url.includes('/api/')
    );

    console.log(`Total network requests: ${networkActivity.length}`);
    console.log(`API requests: ${apiRequests.length}`);

    if (apiRequests.length === 0) {
      console.log('❌ CRITICAL: NO API REQUESTS DETECTED');
      console.log('   This means the form submission is not triggering API calls');
      
      // Check if form is still visible
      const formStillVisible = await page.locator('form').isVisible();
      console.log(`   Form still visible: ${formStillVisible ? '✅' : '❌'}`);
      
      // Check for any success/error messages
      const successMsg = await page.locator('text=/success/, text=/created/, text=/registered/').count();
      const errorMsg = await page.locator('text=/error/, text=/failed/').count();
      
      console.log(`   Success messages: ${successMsg}`);
      console.log(`   Error messages: ${errorMsg}`);
      
      // Check button state after click
      const buttonTextAfter = await submitButton.textContent();
      const buttonEnabledAfter = await submitButton.isEnabled();
      
      console.log(`   Button text after click: "${buttonTextAfter}"`);
      console.log(`   Button enabled after click: ${buttonEnabledAfter ? '✅' : '❌'}`);
      
    } else {
      console.log('✅ API requests detected:');
      apiRequests.forEach((req, index) => {
        console.log(`${index + 1}. ${req.method} ${req.url}`);
        if (req.postData) {
          console.log(`   Data: ${req.postData}`);
        }
      });
    }

    console.log('\n🔍 CHECKING FOR JAVASCRIPT ERRORS');
    console.log('─'.repeat(50));

    // Check for any unhandled errors
    const hasErrors = await page.evaluate(() => {
      return window.onerror !== null || window.addEventListener !== undefined;
    });

    console.log(`JavaScript error handling: ${hasErrors ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run test
testFormSubmission()
  .then(() => {
    console.log('\n📋 Form submission test completed');
  })
  .catch(console.error);
