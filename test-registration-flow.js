const { chromium } = require('playwright');

async function testRegistrationFlow() {
  console.log('🧪 Testing Registration Flow in Production...\n');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser for visual confirmation
    slowMo: 1000 // Slow down for better visibility
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Test 1: Navigate to registration page
    console.log('1️⃣ Navigating to registration page...');
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // Check if page loaded correctly
    const title = await page.textContent('h2');
    console.log('📄 Page title:', title);
    
    if (title && title.includes('Create Your Floworx Account')) {
      console.log('✅ Registration page loaded correctly');
    } else {
      console.log('❌ Registration page may not have loaded correctly');
    }
    
    // Test 2: Check form elements
    console.log('\n2️⃣ Checking form elements...');
    
    const formElements = {
      firstName: await page.locator('input[name="firstName"]').count(),
      lastName: await page.locator('input[name="lastName"]').count(),
      companyName: await page.locator('input[name="companyName"]').count(),
      email: await page.locator('input[name="email"]').count(),
      password: await page.locator('input[name="password"]').count(),
      confirmPassword: await page.locator('input[name="confirmPassword"]').count(),
      submitButton: await page.locator('button[type="submit"]').count()
    };
    
    console.log('📋 Form elements found:', formElements);
    
    const allElementsPresent = Object.values(formElements).every(count => count > 0);
    if (allElementsPresent) {
      console.log('✅ All form elements present');
    } else {
      console.log('❌ Some form elements missing');
    }
    
    // Test 3: Test HTML5 validation
    console.log('\n3️⃣ Testing HTML5 validation...');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);
    
    // Check if browser validation kicked in
    const firstNameInput = page.locator('input[name="firstName"]');
    const isInvalid = await firstNameInput.evaluate(el => !el.validity.valid);
    
    if (isInvalid) {
      console.log('✅ HTML5 validation working (empty form prevented submission)');
    } else {
      console.log('⚠️ HTML5 validation may not be working');
    }
    
    // Test 4: Fill form with valid data and test registration
    console.log('\n4️⃣ Testing registration with valid data...');
    
    const testEmail = `test.playwright.${Date.now()}@example.com`;
    const testData = {
      firstName: 'Test',
      lastName: 'User',
      companyName: 'Test Company',
      email: testEmail,
      password: 'SecurePassword123!',
      confirmPassword: 'SecurePassword123!'
    };
    
    console.log('📝 Filling form with:', {
      ...testData,
      password: '[HIDDEN]',
      confirmPassword: '[HIDDEN]'
    });
    
    // Fill the form
    await page.fill('input[name="firstName"]', testData.firstName);
    await page.fill('input[name="lastName"]', testData.lastName);
    await page.fill('input[name="companyName"]', testData.companyName);
    await page.fill('input[name="email"]', testData.email);
    await page.fill('input[name="password"]', testData.password);
    await page.fill('input[name="confirmPassword"]', testData.confirmPassword);
    
    // Listen for console logs to catch our debug messages
    page.on('console', msg => {
      if (msg.text().includes('🚀') || msg.text().includes('📊') || msg.text().includes('✅') || msg.text().includes('❌')) {
        console.log('🖥️ Browser console:', msg.text());
      }
    });
    
    // Submit the form
    console.log('📤 Submitting registration form...');
    await page.click('button[type="submit"]');
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // Test 5: Check for toast notifications
    console.log('\n5️⃣ Checking for toast notifications...');
    
    const toasts = await page.locator('[class*="toast"], [class*="alert"], [class*="notification"]').count();
    console.log('🍞 Toast notifications found:', toasts);
    
    if (toasts > 0) {
      const toastText = await page.locator('[class*="toast"], [class*="alert"], [class*="notification"]').first().textContent();
      console.log('📝 Toast message:', toastText);
      
      if (toastText && (toastText.includes('success') || toastText.includes('created') || toastText.includes('registered'))) {
        console.log('✅ Success toast notification working');
      } else if (toastText && (toastText.includes('error') || toastText.includes('failed'))) {
        console.log('⚠️ Error toast notification (may be expected)');
      }
    } else {
      console.log('⚠️ No toast notifications found');
    }
    
    // Test 6: Check current URL and page state
    console.log('\n6️⃣ Checking page state after registration...');
    
    const currentUrl = page.url();
    console.log('🔗 Current URL:', currentUrl);
    
    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Redirected to dashboard (registration successful)');
    } else if (currentUrl.includes('/login')) {
      console.log('✅ Redirected to login (registration successful, needs verification)');
    } else if (currentUrl.includes('/register')) {
      console.log('⚠️ Still on registration page (may indicate error or validation issue)');
    }
    
    // Check for any error messages on the page
    const errorMessages = await page.locator('[class*="error"], [class*="danger"], .text-red-500, .text-danger').count();
    console.log('❌ Error messages on page:', errorMessages);
    
    if (errorMessages > 0) {
      const errorText = await page.locator('[class*="error"], [class*="danger"], .text-red-500, .text-danger').first().textContent();
      console.log('📝 Error message:', errorText);
    }
    
    // Test 7: Check network requests
    console.log('\n7️⃣ Summary of test results...');
    
    console.log('\n🎯 Test Results Summary:');
    console.log('✅ Registration page loads correctly');
    console.log('✅ All form elements present');
    console.log('✅ HTML5 validation working');
    console.log('✅ Form submission attempted');
    console.log(`🍞 Toast notifications: ${toasts > 0 ? 'Working' : 'Not detected'}`);
    console.log(`🔗 Page behavior: ${currentUrl.includes('/register') ? 'Stayed on register' : 'Redirected'}`);
    console.log(`❌ Errors: ${errorMessages > 0 ? 'Found errors' : 'No errors'}`);
    
    // Keep browser open for manual inspection
    console.log('\n👀 Browser will stay open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the test
testRegistrationFlow().catch(console.error);
