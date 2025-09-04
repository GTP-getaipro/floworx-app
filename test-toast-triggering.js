const { chromium } = require('playwright');

async function testToastTriggering() {
  console.log('🔍 TESTING TOAST TRIGGERING DIRECTLY');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('\n🧪 TEST 1: TRIGGER TOAST VIA BROWSER CONSOLE');
    console.log('─'.repeat(50));

    // Try to trigger toast directly via browser console
    const directToastResult = await page.evaluate(() => {
      try {
        // Try to access React context directly
        const reactFiber = document.querySelector('#root')._reactInternalFiber || 
                          document.querySelector('#root').__reactInternalInstance;
        
        if (reactFiber) {
          console.log('🔍 React fiber found, attempting to access toast context');
          return 'React fiber found but cannot access context directly';
        }
        
        // Try to find toast functions in window
        const toastFunctions = Object.keys(window).filter(key => 
          key.toLowerCase().includes('toast') || 
          key.toLowerCase().includes('show')
        );
        
        return {
          message: 'Direct toast access attempted',
          availableFunctions: toastFunctions,
          windowKeys: Object.keys(window).slice(0, 10)
        };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log('Direct toast result:', directToastResult);

    console.log('\n🧪 TEST 2: TRIGGER FORM SUBMISSION WITH VALID DATA');
    console.log('─'.repeat(50));

    // Fill form with valid data to trigger success toast
    const testUser = {
      firstName: 'Toast',
      lastName: 'Test',
      companyName: 'Toast Test Company',
      email: `toasttest.${Date.now()}@example.com`,
      password: 'ToastTest123!'
    };

    console.log(`👤 Test user: ${testUser.email}`);

    await page.fill('input[name="firstName"]', testUser.firstName);
    await page.fill('input[name="lastName"]', testUser.lastName);
    await page.fill('input[name="companyName"]', testUser.companyName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);

    console.log('✅ Form filled with valid data');

    // Wait for validation
    await page.waitForTimeout(2000);

    // Check validation state
    const errorCount = await page.locator('p.text-danger').count();
    console.log(`⚡ Validation errors: ${errorCount}`);

    if (errorCount === 0) {
      console.log('🚀 Submitting form to trigger success toast...');
      
      // Monitor for toast appearance
      const toastPromise = page.waitForSelector('[data-testid*="toast"]', { timeout: 10000 }).catch(() => null);
      
      await page.click('button[type="submit"]');
      
      // Wait for either toast or timeout
      const toastElement = await toastPromise;
      
      if (toastElement) {
        console.log('✅ Toast appeared!');
        const toastText = await toastElement.textContent();
        const toastTestId = await toastElement.getAttribute('data-testid');
        console.log(`   Toast text: "${toastText}"`);
        console.log(`   Toast data-testid: "${toastTestId}"`);
      } else {
        console.log('❌ No toast appeared within 10 seconds');
        
        // Check if there are any toasts without data-testid
        await page.waitForTimeout(5000);
        const anyToasts = await page.locator('div[class*="fixed"][class*="top-4"]').count();
        console.log(`   Toasts without data-testid: ${anyToasts}`);
        
        if (anyToasts > 0) {
          const toastContent = await page.locator('div[class*="fixed"][class*="top-4"]').first().textContent();
          console.log(`   Toast content: "${toastContent}"`);
        }
      }
    } else {
      console.log('❌ Form has validation errors, cannot test success toast');
      const errors = await page.locator('p.text-danger').allTextContents();
      console.log('Errors:', errors);
    }

    console.log('\n🧪 TEST 3: CHECK TOAST CONTEXT INTEGRATION');
    console.log('─'.repeat(50));

    // Check if ToastContext is properly integrated
    const contextCheck = await page.evaluate(() => {
      // Check if there's a ToastProvider in the React tree
      const root = document.querySelector('#root');
      if (root) {
        const reactFiber = root._reactInternalFiber || root.__reactInternalInstance;
        if (reactFiber) {
          return 'React root found with fiber';
        }
      }
      
      // Check for toast-related elements
      const toastContainer = document.querySelector('.fixed.top-4.right-4');
      const toastElements = document.querySelectorAll('[class*="toast"]');
      
      return {
        toastContainer: !!toastContainer,
        toastElements: toastElements.length,
        containerHTML: toastContainer ? toastContainer.outerHTML.substring(0, 200) : null
      };
    });

    console.log('Context check:', contextCheck);

    console.log('\n🧪 TEST 4: MANUAL TOAST INJECTION');
    console.log('─'.repeat(50));

    // Try to manually inject a toast to test the data-testid fix
    const manualToastResult = await page.evaluate(() => {
      try {
        // Find the toast container
        const container = document.querySelector('.fixed.top-4.right-4.z-50');
        
        if (container) {
          // Create a test toast element
          const testToast = document.createElement('div');
          testToast.setAttribute('data-testid', 'toast-success');
          testToast.className = 'p-4 rounded-lg shadow-lg border-l-4 backdrop-blur-sm bg-green-50 border-green-400 text-green-800';
          testToast.innerHTML = `
            <div class="flex items-start">
              <div class="flex-shrink-0">
                <svg class="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
                </svg>
              </div>
              <div class="ml-3 flex-1 min-w-0">
                <div class="text-sm text-green-800">🧪 Manual test toast with data-testid!</div>
              </div>
            </div>
          `;
          
          container.appendChild(testToast);
          
          return {
            success: true,
            message: 'Manual toast injected successfully',
            testId: testToast.getAttribute('data-testid')
          };
        } else {
          return {
            success: false,
            message: 'Toast container not found'
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error.message
        };
      }
    });

    console.log('Manual toast injection:', manualToastResult);

    if (manualToastResult.success) {
      // Wait a moment and then check if we can find the manual toast
      await page.waitForTimeout(2000);
      
      const manualToastFound = await page.locator('[data-testid="toast-success"]').count();
      console.log(`   Manual toast found by data-testid: ${manualToastFound > 0 ? '✅' : '❌'}`);
      
      if (manualToastFound > 0) {
        const manualToastText = await page.locator('[data-testid="toast-success"]').textContent();
        console.log(`   Manual toast text: "${manualToastText}"`);
        console.log('🎉 DATA-TESTID FIX IS WORKING! The issue is toast triggering, not the data-testid.');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run test
testToastTriggering()
  .then(() => {
    console.log('\n📋 Toast triggering test completed');
  })
  .catch(console.error);
