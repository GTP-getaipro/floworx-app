const { chromium } = require('playwright');

async function debugToasts() {
  console.log('🔍 DEBUGGING TOAST SYSTEM');
  console.log('=' .repeat(50));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Listen for all console messages
  page.on('console', msg => {
    console.log(`🖥️ BROWSER ${msg.type()}: ${msg.text()}`);
  });

  // Listen for network requests
  page.on('request', request => {
    if (request.url().includes('/api/auth/register')) {
      console.log(`🌐 NETWORK: ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/auth/register')) {
      console.log(`🌐 RESPONSE: ${response.status()} ${response.url()}`);
    }
  });

  try {
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n🍞 Step 1: Check initial toast container...');
    
    const initialToastContainer = await page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"]').count();
    console.log(`Initial toast container: ${initialToastContainer > 0 ? 'EXISTS' : 'NOT FOUND'}`);

    console.log('\n📝 Step 2: Fill form with invalid data to trigger validation error...');
    
    // Fill form with invalid email to trigger client-side validation
    await page.fill('input[name="firstName"]', 'Toast');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', 'invalid-email-format'); // Invalid email
    await page.fill('input[name="password"]', 'ToastTest123!');
    await page.fill('input[name="confirmPassword"]', 'ToastTest123!');
    
    console.log('Submitting form with invalid email...');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Check for toast after invalid submission
    const toastAfterInvalid = await page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"]').count();
    console.log(`Toast container after invalid submission: ${toastAfterInvalid > 0 ? 'EXISTS' : 'NOT FOUND'}`);
    
    if (toastAfterInvalid > 0) {
      const toastContent = await page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"]').textContent();
      console.log(`Toast content: "${toastContent}"`);
      
      // Check for specific toast elements
      const toastMessages = await page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"] p').count();
      console.log(`Toast message elements: ${toastMessages}`);
      
      if (toastMessages > 0) {
        const messageTexts = await page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"] p').allTextContents();
        console.log(`Toast messages: ${JSON.stringify(messageTexts)}`);
      }
    }

    console.log('\n📧 Step 3: Test with valid data but existing email...');
    
    // Clear and fill with valid format but existing email
    await page.fill('input[name="email"]', 'existing@example.com');
    
    console.log('Submitting form with existing email...');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000); // Wait longer for server response
    
    // Check for toast after server error
    const toastAfterServer = await page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"]').count();
    console.log(`Toast container after server response: ${toastAfterServer > 0 ? 'EXISTS' : 'NOT FOUND'}`);
    
    if (toastAfterServer > 0) {
      const serverToastContent = await page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"]').textContent();
      console.log(`Server toast content: "${serverToastContent}"`);
    }

    console.log('\n🔍 Step 4: Check ToastContext integration...');
    
    // Check if ToastContext is properly integrated
    const toastContextCheck = await page.evaluate(() => {
      // Look for toast-related elements in the DOM
      const toastElements = document.querySelectorAll('[class*="toast"], [class*="notification"]');
      const fixedElements = document.querySelectorAll('[class*="fixed"]');
      
      return {
        toastElements: toastElements.length,
        fixedElements: fixedElements.length,
        toastContainerClasses: Array.from(document.querySelectorAll('div[class*="fixed"][class*="top-4"]')).map(el => el.className),
        allFixedElements: Array.from(fixedElements).map(el => ({
          tag: el.tagName,
          classes: el.className,
          content: el.textContent.substring(0, 100)
        }))
      };
    });
    
    console.log('Toast context check:', JSON.stringify(toastContextCheck, null, 2));

    console.log('\n🧪 Step 5: Test manual toast trigger...');
    
    // Try to manually trigger a toast through browser console
    const manualToastResult = await page.evaluate(() => {
      try {
        // Try to find and call toast functions
        if (window.React && window.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) {
          return 'React detected but cannot access toast context directly';
        }
        
        // Check if there are any global toast functions
        const globalFunctions = Object.keys(window).filter(key => 
          key.toLowerCase().includes('toast') || 
          key.toLowerCase().includes('notification')
        );
        
        return {
          message: 'Manual toast test attempted',
          globalFunctions: globalFunctions
        };
      } catch (error) {
        return { error: error.message };
      }
    });
    
    console.log('Manual toast result:', manualToastResult);

    console.log('\n📊 TOAST DEBUG SUMMARY');
    console.log('─'.repeat(40));
    console.log(`Toast container exists: ${toastAfterServer > 0 ? 'YES' : 'NO'}`);
    console.log(`Toast content populated: ${toastAfterServer > 0 && serverToastContent.trim() ? 'YES' : 'NO'}`);
    console.log(`Form submission triggers network: ${toastAfterServer > 0 ? 'LIKELY' : 'UNLIKELY'}`);

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugToasts().catch(console.error);
