const { chromium } = require('playwright');

async function debugToastTestId() {
  console.log('🔍 DEBUGGING TOAST DATA-TESTID ISSUE');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('\n🍞 TRIGGERING TOAST NOTIFICATION');
    console.log('─'.repeat(50));

    // Fill form with invalid data to trigger error toast
    await page.fill('input[name="firstName"]', 'Toast');
    await page.fill('input[name="lastName"]', 'Debug');
    await page.fill('input[name="email"]', 'invalid-email-format');
    await page.fill('input[name="password"]', 'ToastDebug123!');
    await page.fill('input[name="confirmPassword"]', 'ToastDebug123!');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);

    console.log('\n🔍 ANALYZING TOAST ELEMENTS');
    console.log('─'.repeat(50));

    // Get all toast-related elements
    const toastAnalysis = await page.evaluate(() => {
      // Find all elements that might be toasts
      const fixedElements = Array.from(document.querySelectorAll('div[class*="fixed"]'));
      const toastElements = fixedElements.filter(el => 
        el.className.includes('top-4') || 
        el.className.includes('right-4') ||
        el.textContent.includes('invalid') ||
        el.textContent.includes('error')
      );

      return toastElements.map(el => ({
        tag: el.tagName,
        classes: el.className,
        textContent: el.textContent.substring(0, 100),
        hasDataTestId: !!el.getAttribute('data-testid'),
        dataTestId: el.getAttribute('data-testid'),
        innerHTML: el.innerHTML.substring(0, 200),
        children: Array.from(el.children).map(child => ({
          tag: child.tagName,
          classes: child.className,
          hasDataTestId: !!child.getAttribute('data-testid'),
          dataTestId: child.getAttribute('data-testid'),
          textContent: child.textContent.substring(0, 50)
        }))
      }));
    });

    console.log(`Found ${toastAnalysis.length} potential toast elements:`);
    toastAnalysis.forEach((toast, index) => {
      console.log(`\n${index + 1}. Toast Element:`);
      console.log(`   Tag: ${toast.tag}`);
      console.log(`   Classes: "${toast.classes}"`);
      console.log(`   Text: "${toast.textContent}"`);
      console.log(`   Has data-testid: ${toast.hasDataTestId ? '✅' : '❌'}`);
      console.log(`   data-testid value: "${toast.dataTestId || 'none'}"`);
      console.log(`   HTML: ${toast.innerHTML}`);
      
      if (toast.children.length > 0) {
        console.log(`   Children (${toast.children.length}):`);
        toast.children.forEach((child, childIndex) => {
          console.log(`     ${childIndex + 1}. ${child.tag} - "${child.classes}" - testid: ${child.dataTestId || 'none'}`);
        });
      }
    });

    console.log('\n🔍 CHECKING TOAST CONTEXT STRUCTURE');
    console.log('─'.repeat(50));

    // Check if ToastContext is rendering correctly
    const toastContextCheck = await page.evaluate(() => {
      // Look for the toast container from ToastContext
      const toastContainer = document.querySelector('div.fixed.top-4.right-4.z-50.space-y-2');
      
      if (toastContainer) {
        const toasts = Array.from(toastContainer.children);
        return {
          containerFound: true,
          containerClasses: toastContainer.className,
          toastCount: toasts.length,
          toasts: toasts.map(toast => ({
            classes: toast.className,
            hasDataTestId: !!toast.getAttribute('data-testid'),
            dataTestId: toast.getAttribute('data-testid'),
            innerHTML: toast.innerHTML.substring(0, 150)
          }))
        };
      }
      
      return { containerFound: false };
    });

    if (toastContextCheck.containerFound) {
      console.log('✅ Toast container found');
      console.log(`   Container classes: "${toastContextCheck.containerClasses}"`);
      console.log(`   Toast count: ${toastContextCheck.toastCount}`);
      
      toastContextCheck.toasts.forEach((toast, index) => {
        console.log(`\n   Toast ${index + 1}:`);
        console.log(`     Classes: "${toast.classes}"`);
        console.log(`     Has data-testid: ${toast.hasDataTestId ? '✅' : '❌'}`);
        console.log(`     data-testid: "${toast.dataTestId || 'none'}"`);
        console.log(`     HTML: ${toast.innerHTML}`);
      });
    } else {
      console.log('❌ Toast container not found');
    }

    console.log('\n🔍 CHECKING FOR TOAST VARIANTS');
    console.log('─'.repeat(50));

    // Check for specific toast variants
    const variantCheck = await page.evaluate(() => {
      const variants = ['success', 'error', 'warning', 'info'];
      const results = {};
      
      variants.forEach(variant => {
        const toastByTestId = document.querySelector(`[data-testid="toast-${variant}"]`);
        const toastByClass = document.querySelector(`div[class*="${variant}"]`);
        
        results[variant] = {
          byTestId: !!toastByTestId,
          byClass: !!toastByClass,
          testIdElement: toastByTestId ? {
            classes: toastByTestId.className,
            text: toastByTestId.textContent.substring(0, 50)
          } : null
        };
      });
      
      return results;
    });

    Object.entries(variantCheck).forEach(([variant, check]) => {
      console.log(`   ${variant}: testid=${check.byTestId ? '✅' : '❌'}, class=${check.byClass ? '✅' : '❌'}`);
      if (check.testIdElement) {
        console.log(`     Element: "${check.testIdElement.classes}" - "${check.testIdElement.text}"`);
      }
    });

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

// Run debug
debugToastTestId()
  .then(() => {
    console.log('\n📋 Toast data-testid debug completed');
  })
  .catch(console.error);
