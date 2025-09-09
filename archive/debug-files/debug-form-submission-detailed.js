const { chromium } = require('playwright');

async function debugFormSubmissionDetailed() {
  console.log('🔍 DETAILED FORM SUBMISSION DEBUG');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for all console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('🚀') || text.includes('Registration') || text.includes('Form submission') || text.includes('handleSubmit')) {
      console.log(`🖥️ BROWSER: ${text}`);
    }
  });

  // Listen for errors
  page.on('pageerror', error => {
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });

  try {
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('\n🔍 INJECTING DEBUG CODE');
    console.log('─'.repeat(50));

    // Inject debug code to monitor form submission
    await page.evaluate(() => {
      // Override console.log to capture form-related logs
      const originalLog = console.log;
      console.log = function(...args) {
        originalLog.apply(console, args);
        // Also log to a global array we can access
        if (!window.debugLogs) window.debugLogs = [];
        window.debugLogs.push(args.join(' '));
      };

      // Monitor form submission events
      const form = document.querySelector('form');
      if (form) {
        console.log('🔍 DEBUG: Form found, adding event listeners');
        
        // Add submit event listener
        form.addEventListener('submit', function(e) {
          console.log('🚀 DEBUG: Form submit event triggered');
          console.log('🚀 DEBUG: Event prevented:', e.defaultPrevented);
          console.log('🚀 DEBUG: Form action:', form.action);
          console.log('🚀 DEBUG: Form method:', form.method);
        });

        // Monitor button clicks
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
          console.log('🔍 DEBUG: Submit button found, adding click listener');
          
          submitButton.addEventListener('click', function(e) {
            console.log('🔘 DEBUG: Submit button clicked');
            console.log('🔘 DEBUG: Button disabled:', submitButton.disabled);
            console.log('🔘 DEBUG: Button type:', submitButton.type);
            console.log('🔘 DEBUG: Event prevented:', e.defaultPrevented);
          });
        } else {
          console.log('❌ DEBUG: Submit button not found');
        }
      } else {
        console.log('❌ DEBUG: Form not found');
      }

      // Monitor React events (if available)
      if (window.React) {
        console.log('🔍 DEBUG: React detected');
      }
    });

    console.log('\n📝 FILLING FORM');
    console.log('─'.repeat(50));

    const testUser = {
      firstName: 'Debug',
      lastName: 'Form',
      companyName: 'Debug Company',
      email: `debugform.${Date.now()}@example.com`,
      password: 'DebugPassword123!'
    };

    console.log(`👤 Test user: ${testUser.email}`);

    await page.fill('input[name="firstName"]', testUser.firstName);
    await page.fill('input[name="lastName"]', testUser.lastName);
    await page.fill('input[name="companyName"]', testUser.companyName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);

    console.log('✅ Form filled');

    await page.waitForTimeout(3000);

    // Check validation state
    const errorCount = await page.locator('p.text-danger').count();
    console.log(`⚡ Validation errors: ${errorCount}`);

    if (errorCount > 0) {
      const errors = await page.locator('p.text-danger').allTextContents();
      console.log(`❌ Errors: ${errors.join(', ')}`);
      return;
    }

    console.log('\n🔍 ANALYZING FORM STRUCTURE');
    console.log('─'.repeat(50));

    const formAnalysis = await page.evaluate(() => {
      const form = document.querySelector('form');
      const submitButton = document.querySelector('button[type="submit"]');
      
      return {
        formExists: !!form,
        formAction: form?.action || 'none',
        formMethod: form?.method || 'none',
        formOnSubmit: form?.onsubmit ? 'function assigned' : 'no function',
        formEventListeners: form?._reactInternalFiber ? 'React component' : 'regular DOM',
        
        submitButtonExists: !!submitButton,
        submitButtonType: submitButton?.type || 'none',
        submitButtonDisabled: submitButton?.disabled || false,
        submitButtonText: submitButton?.textContent || 'none',
        submitButtonOnClick: submitButton?.onclick ? 'function assigned' : 'no function',
        
        reactProps: form?._reactInternalFiber ? 'React props available' : 'no React props'
      };
    });

    console.log('Form analysis:', formAnalysis);

    console.log('\n🚀 ATTEMPTING FORM SUBMISSION');
    console.log('─'.repeat(50));

    // Clear debug logs
    await page.evaluate(() => {
      if (window.debugLogs) window.debugLogs.length = 0;
    });

    // Click submit button
    console.log('🔘 Clicking submit button...');
    await page.click('button[type="submit"]');

    // Wait for events to process
    await page.waitForTimeout(5000);

    // Get debug logs
    const debugLogs = await page.evaluate(() => {
      return window.debugLogs || [];
    });

    console.log('\n📊 DEBUG LOGS FROM BROWSER');
    console.log('─'.repeat(50));

    if (debugLogs.length > 0) {
      debugLogs.forEach((log, index) => {
        console.log(`${index + 1}. ${log}`);
      });
    } else {
      console.log('❌ No debug logs captured');
    }

    console.log('\n🔍 CHECKING FORM STATE AFTER SUBMISSION');
    console.log('─'.repeat(50));

    const postSubmissionState = await page.evaluate(() => {
      const form = document.querySelector('form');
      const submitButton = document.querySelector('button[type="submit"]');
      
      return {
        formVisible: form ? window.getComputedStyle(form).display !== 'none' : false,
        buttonText: submitButton?.textContent || 'none',
        buttonDisabled: submitButton?.disabled || false,
        
        // Check for success/error messages
        successMessages: Array.from(document.querySelectorAll('*')).filter(el => 
          el.textContent && (
            el.textContent.includes('success') || 
            el.textContent.includes('created') || 
            el.textContent.includes('registered')
          )
        ).map(el => el.textContent),
        
        errorMessages: Array.from(document.querySelectorAll('*')).filter(el => 
          el.textContent && (
            el.textContent.includes('error') || 
            el.textContent.includes('failed')
          )
        ).map(el => el.textContent)
      };
    });

    console.log('Post-submission state:', postSubmissionState);

    console.log('\n🔍 CHECKING NETWORK ACTIVITY');
    console.log('─'.repeat(50));

    // Check if any network requests were made
    const networkRequests = await page.evaluate(() => {
      // This is a simple check - in a real scenario, we'd need to monitor from the start
      return performance.getEntriesByType('resource')
        .filter(entry => entry.name.includes('/api/'))
        .map(entry => ({
          name: entry.name,
          method: entry.initiatorType,
          duration: entry.duration
        }));
    });

    console.log(`Network requests to /api/: ${networkRequests.length}`);
    networkRequests.forEach((req, index) => {
      console.log(`${index + 1}. ${req.name} (${req.duration}ms)`);
    });

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

// Run debug
debugFormSubmissionDetailed()
  .then(() => {
    console.log('\n📋 Detailed form submission debug completed');
  })
  .catch(console.error);
