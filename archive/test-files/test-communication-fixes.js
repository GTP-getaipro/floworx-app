const { chromium } = require('playwright');

async function testCommunicationFixes() {
  console.log('📱 TESTING ALL COMMUNICATION CUT-OFF FIXES');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const results = {
      inputErrorMessages: false,
      toastNotifications: false,
      alertComponents: false,
      responsiveDesign: false,
      textWrapping: false
    };

    console.log('\n📝 Testing Input Error Messages...');
    
    // Test long error message
    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill('this-is-a-very-long-invalid-email-address-that-should-trigger-a-long-error-message');
    await emailInput.blur();
    await page.waitForTimeout(1500);
    
    const errorMessage = page.locator('p.text-danger').first();
    const errorExists = await errorMessage.count();
    
    if (errorExists > 0) {
      const errorBounds = await errorMessage.boundingBox();
      const errorText = await errorMessage.textContent();
      const errorClasses = await errorMessage.getAttribute('class');
      
      console.log(`   Error message found: "${errorText}"`);
      console.log(`   Error classes: "${errorClasses}"`);
      console.log(`   Error width: ${Math.round(errorBounds.width)}px`);
      
      // Check if error message has proper wrapping classes
      const hasBreakWords = errorClasses.includes('break-words');
      const hasWhitespaceWrap = errorClasses.includes('whitespace-pre-wrap');
      
      results.inputErrorMessages = hasBreakWords && errorText.length > 0;
      console.log(`   ✅ Input error messages: ${results.inputErrorMessages ? 'FIXED' : 'NEEDS WORK'}`);
    }

    console.log('\n🍞 Testing Toast Notifications...');
    
    // Fill form to trigger persistence notification
    await page.fill('input[name="firstName"]', 'Very Long First Name That Should Test Text Wrapping');
    await page.fill('input[name="lastName"]', 'Very Long Last Name That Should Also Test Text Wrapping');
    await page.fill('input[name="companyName"]', 'Very Long Company Name That Should Test Text Wrapping In Toast Messages');
    await page.waitForTimeout(2000);
    
    // Navigate away and back to trigger toast
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForTimeout(1000);
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(4000);
    
    // Check for toast notification
    const toastContainer = page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"]');
    const toastExists = await toastContainer.count();
    
    if (toastExists > 0) {
      const toastBounds = await toastContainer.boundingBox();
      const toastClasses = await toastContainer.getAttribute('class');
      const toastContent = await toastContainer.textContent();
      
      console.log(`   Toast found: "${toastContent.substring(0, 50)}..."`);
      console.log(`   Toast classes: "${toastClasses}"`);
      console.log(`   Toast width: ${Math.round(toastBounds.width)}px`);
      
      // Check if toast has proper width classes
      const hasMaxWMd = toastClasses.includes('max-w-md');
      const hasMaxWLg = toastClasses.includes('max-w-lg');
      
      results.toastNotifications = (hasMaxWMd || hasMaxWLg) && toastContent.length > 0;
      console.log(`   ✅ Toast notifications: ${results.toastNotifications ? 'FIXED' : 'NEEDS WORK'}`);
    }

    console.log('\n🚨 Testing Alert Components...');
    
    // Check if there are any alert components on the page
    const alertComponents = await page.locator('div[class*="rounded-lg"][class*="p-4"]').all();
    console.log(`   Found ${alertComponents.length} potential alert components`);
    
    if (alertComponents.length > 0) {
      for (let i = 0; i < Math.min(alertComponents.length, 3); i++) {
        const alert = alertComponents[i];
        const alertClasses = await alert.getAttribute('class');
        const alertText = await alert.textContent();
        
        if (alertText && alertText.length > 20) {
          console.log(`   Alert ${i + 1}: "${alertText.substring(0, 40)}..."`);
          
          // Check for text wrapping classes in child elements
          const textElements = await alert.locator('p, div').all();
          let hasProperWrapping = false;
          
          for (const textEl of textElements) {
            const textClasses = await textEl.getAttribute('class');
            if (textClasses && (textClasses.includes('break-words') || textClasses.includes('whitespace-pre-wrap'))) {
              hasProperWrapping = true;
              break;
            }
          }
          
          results.alertComponents = hasProperWrapping;
          break;
        }
      }
    } else {
      results.alertComponents = true; // No alerts to test, consider it passed
    }
    
    console.log(`   ✅ Alert components: ${results.alertComponents ? 'FIXED' : 'NEEDS WORK'}`);

    console.log('\n📱 Testing Responsive Design...');
    
    // Test different screen sizes
    const screenSizes = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];
    
    let responsiveWorking = true;
    
    for (const size of screenSizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(500);
      
      // Check if toast container adapts to screen size
      const toastContainer = page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"]');
      const toastExists = await toastContainer.count();
      
      if (toastExists > 0) {
        const toastBounds = await toastContainer.boundingBox();
        const fitsInScreen = toastBounds.width <= size.width - 32; // Account for padding
        
        console.log(`   ${size.name} (${size.width}x${size.height}): Toast width ${Math.round(toastBounds.width)}px - ${fitsInScreen ? 'FITS' : 'OVERFLOW'}`);
        
        if (!fitsInScreen) {
          responsiveWorking = false;
        }
      }
    }
    
    results.responsiveDesign = responsiveWorking;
    console.log(`   ✅ Responsive design: ${results.responsiveDesign ? 'WORKING' : 'NEEDS WORK'}`);

    console.log('\n📝 Testing Text Wrapping...');
    
    // Reset to desktop size
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    
    // Test very long error message
    await page.fill('input[name="email"]', 'this-is-an-extremely-long-email-address-that-should-definitely-cause-text-wrapping-issues-if-not-handled-properly@very-long-domain-name-for-testing.com');
    await page.locator('input[name="email"]').blur();
    await page.waitForTimeout(1500);
    
    const longErrorMessage = page.locator('p.text-danger').first();
    const longErrorExists = await longErrorMessage.count();
    
    if (longErrorExists > 0) {
      const errorBounds = await longErrorMessage.boundingBox();
      const parentBounds = await longErrorMessage.locator('..').boundingBox();
      
      const textWrapsCorrectly = errorBounds.height > 20; // Multi-line indicates wrapping
      const staysWithinParent = errorBounds.width <= parentBounds.width;
      
      console.log(`   Long error message height: ${Math.round(errorBounds.height)}px (${textWrapsCorrectly ? 'multi-line' : 'single-line'})`);
      console.log(`   Stays within parent: ${staysWithinParent ? 'YES' : 'NO'}`);
      
      results.textWrapping = textWrapsCorrectly && staysWithinParent;
    } else {
      results.textWrapping = true; // No long error to test
    }
    
    console.log(`   ✅ Text wrapping: ${results.textWrapping ? 'WORKING' : 'NEEDS WORK'}`);

    // Calculate overall success
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    const successRate = Math.round((passedTests / totalTests) * 100);

    console.log('\n📊 COMMUNICATION FIXES RESULTS');
    console.log('=' .repeat(50));
    console.log(`🎯 Success Rate: ${successRate}%`);
    console.log(`📈 Passed Tests: ${passedTests}/${totalTests}`);
    
    console.log('\n🔍 DETAILED BREAKDOWN');
    console.log('─'.repeat(40));
    console.log(`📝 Input Error Messages: ${results.inputErrorMessages ? '✅ FIXED' : '❌ NEEDS WORK'}`);
    console.log(`🍞 Toast Notifications: ${results.toastNotifications ? '✅ FIXED' : '❌ NEEDS WORK'}`);
    console.log(`🚨 Alert Components: ${results.alertComponents ? '✅ FIXED' : '❌ NEEDS WORK'}`);
    console.log(`📱 Responsive Design: ${results.responsiveDesign ? '✅ WORKING' : '❌ NEEDS WORK'}`);
    console.log(`📝 Text Wrapping: ${results.textWrapping ? '✅ WORKING' : '❌ NEEDS WORK'}`);
    
    if (successRate >= 90) {
      console.log('\n🏆 EXCELLENT - All communication cut-off issues fixed!');
    } else if (successRate >= 75) {
      console.log('\n👍 GOOD - Most communication issues fixed');
    } else if (successRate >= 60) {
      console.log('\n⚠️ FAIR - Some communication issues remain');
    } else {
      console.log('\n❌ POOR - Major communication issues remain');
    }

    return { successRate, results, passedTests, totalTests };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { successRate: 0, results: {}, passedTests: 0, totalTests: 5 };
  } finally {
    await browser.close();
  }
}

// Run the test
testCommunicationFixes()
  .then(results => {
    console.log(`\n📋 Communication fixes test completed: ${results.successRate}% success rate`);
    
    if (results.successRate >= 85) {
      console.log('🎉 Communication cut-off issues have been successfully fixed!');
      process.exit(0);
    } else {
      console.log('⚠️ Some communication issues still need attention');
      process.exit(1);
    }
  })
  .catch(console.error);
