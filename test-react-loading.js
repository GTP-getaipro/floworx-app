const { chromium } = require('playwright');

async function testReactLoading() {
  console.log('🔍 TESTING REACT LOADING AND COMPONENT RENDERING');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('React') || text.includes('🚀') || text.includes('DEBUG')) {
      console.log(`🖥️ BROWSER: ${text}`);
    }
  });

  // Listen for errors
  page.on('pageerror', error => {
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });

  try {
    console.log('\n🌐 NAVIGATING TO REGISTRATION PAGE');
    console.log('─'.repeat(50));
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Wait longer for React to load

    console.log('\n🔍 CHECKING REACT ENVIRONMENT');
    console.log('─'.repeat(50));

    const reactCheck = await page.evaluate(() => {
      return {
        // Check if React is loaded
        reactLoaded: typeof window.React !== 'undefined',
        reactDOMLoaded: typeof window.ReactDOM !== 'undefined',
        
        // Check React version if available
        reactVersion: window.React ? window.React.version : 'not available',
        
        // Check if there are React components on the page
        reactRoots: document.querySelectorAll('[data-reactroot]').length,
        reactComponents: document.querySelectorAll('[data-react-component]').length,
        
        // Check for React DevTools
        reactDevTools: window.__REACT_DEVTOOLS_GLOBAL_HOOK__ ? 'available' : 'not available',
        
        // Check if form has React fiber
        formHasReactFiber: (() => {
          const form = document.querySelector('form');
          if (!form) return 'form not found';
          
          // Check for React fiber properties
          const fiberKeys = Object.keys(form).filter(key => 
            key.startsWith('__reactFiber') || 
            key.startsWith('__reactInternalFiber') ||
            key.startsWith('_reactInternalFiber')
          );
          
          return fiberKeys.length > 0 ? `React fiber found: ${fiberKeys.join(', ')}` : 'no React fiber';
        })(),
        
        // Check for React event listeners
        formEventListeners: (() => {
          const form = document.querySelector('form');
          if (!form) return 'form not found';
          
          // Try to access React props
          const reactProps = form._reactInternalFiber || form.__reactInternalFiber;
          if (reactProps) {
            return 'React props accessible';
          }
          
          return 'no React props';
        })(),
        
        // Check JavaScript errors
        jsErrors: window.onerror ? 'error handler present' : 'no error handler',
        
        // Check if the page is fully loaded
        readyState: document.readyState,
        
        // Check for any loading indicators
        loadingElements: document.querySelectorAll('.loading, .spinner, [data-loading]').length
      };
    });

    console.log('React Environment Check:');
    Object.entries(reactCheck).forEach(([key, value]) => {
      const status = value.toString().includes('not') || value.toString().includes('no ') || value === 0 ? '❌' : '✅';
      console.log(`   ${key}: ${value} ${status}`);
    });

    console.log('\n🔍 CHECKING COMPONENT RENDERING');
    console.log('─'.repeat(50));

    const componentCheck = await page.evaluate(() => {
      // Check if RegisterForm component is rendered
      const form = document.querySelector('form');
      const submitButton = document.querySelector('button[type="submit"]');
      const inputs = document.querySelectorAll('input');
      
      return {
        formExists: !!form,
        formHTML: form ? form.outerHTML.substring(0, 200) + '...' : 'no form',
        
        submitButtonExists: !!submitButton,
        submitButtonHTML: submitButton ? submitButton.outerHTML.substring(0, 200) + '...' : 'no button',
        
        inputCount: inputs.length,
        inputTypes: Array.from(inputs).map(input => input.type),
        
        // Check for React-specific attributes
        reactAttributes: (() => {
          const elements = document.querySelectorAll('*');
          let reactAttrs = 0;
          elements.forEach(el => {
            const attrs = el.getAttributeNames();
            attrs.forEach(attr => {
              if (attr.startsWith('data-react') || attr.startsWith('__react')) {
                reactAttrs++;
              }
            });
          });
          return reactAttrs;
        })(),
        
        // Check for event handlers
        eventHandlers: (() => {
          const form = document.querySelector('form');
          if (!form) return 'no form';
          
          const handlers = [];
          if (form.onsubmit) handlers.push('onsubmit');
          if (form.onclick) handlers.push('onclick');
          
          return handlers.length > 0 ? handlers.join(', ') : 'no handlers';
        })()
      };
    });

    console.log('Component Rendering Check:');
    Object.entries(componentCheck).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    console.log('\n🔍 TESTING FORM INTERACTION');
    console.log('─'.repeat(50));

    // Try to trigger form events manually
    await page.evaluate(() => {
      console.log('🚀 DEBUG: Manually triggering form events');
      
      const form = document.querySelector('form');
      if (form) {
        // Try to trigger submit event
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        console.log('🚀 DEBUG: Dispatching submit event');
        form.dispatchEvent(submitEvent);
        
        // Try to access React props
        const reactFiber = form._reactInternalFiber || form.__reactInternalFiber;
        if (reactFiber) {
          console.log('🚀 DEBUG: React fiber found on form');
        } else {
          console.log('🚀 DEBUG: No React fiber on form');
        }
      }
    });

    await page.waitForTimeout(3000);

    console.log('\n🔍 CHECKING BROWSER CONSOLE FOR ERRORS');
    console.log('─'.repeat(50));

    // Check for any JavaScript errors that might prevent React from working
    const consoleErrors = await page.evaluate(() => {
      // Return any stored errors
      return window.console.errors || [];
    });

    if (consoleErrors.length > 0) {
      console.log('❌ Console errors found:');
      consoleErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ No console errors detected');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run test
testReactLoading()
  .then(() => {
    console.log('\n📋 React loading test completed');
  })
  .catch(console.error);
