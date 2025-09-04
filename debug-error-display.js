const { chromium } = require('playwright');

async function debugErrorDisplay() {
  console.log('🔍 DEBUGGING ERROR MESSAGE DISPLAY');
  console.log('=' .repeat(50));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Listen for console messages
  page.on('console', msg => {
    console.log(`🖥️ BROWSER: ${msg.text()}`);
  });

  try {
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('\n📧 Testing email field error display...');
    
    const emailInput = page.locator('input[name="email"]');
    
    // Fill invalid email
    await emailInput.fill('invalid-email');
    await emailInput.blur();
    await page.waitForTimeout(2000);
    
    // Check the DOM structure around the email input
    const emailContainer = emailInput.locator('..');
    const containerHTML = await emailContainer.innerHTML();
    console.log('\n📋 Email input container HTML:');
    console.log(containerHTML);
    
    // Look for any error elements
    const errorElements = await page.locator('p[class*="text-danger"], p[class*="text-red"], .error-message, [class*="error"]').all();
    console.log(`\n🔍 Found ${errorElements.length} potential error elements:`);
    
    for (let i = 0; i < errorElements.length; i++) {
      const element = errorElements[i];
      const text = await element.textContent();
      const classes = await element.getAttribute('class');
      const isVisible = await element.isVisible();
      console.log(`   ${i + 1}. Text: "${text}", Classes: "${classes}", Visible: ${isVisible}`);
    }
    
    // Check if the ValidatedInput is rendering the error
    const validatedInputs = await page.locator('div[class*="relative"]').all();
    console.log(`\n🔍 Found ${validatedInputs.length} ValidatedInput containers`);
    
    // Check the form errors state by evaluating JavaScript
    const formErrors = await page.evaluate(() => {
      // Try to access React component state (this is a hack but useful for debugging)
      const emailInput = document.querySelector('input[name="email"]');
      if (emailInput && emailInput._valueTracker) {
        return 'React state not accessible';
      }
      return 'No React state found';
    });
    
    console.log(`\n🔍 Form errors state: ${formErrors}`);
    
    // Check if there are any hidden error messages
    const allPElements = await page.locator('p').all();
    console.log(`\n🔍 Checking all <p> elements (${allPElements.length} found):`);
    
    for (let i = 0; i < Math.min(allPElements.length, 10); i++) {
      const element = allPElements[i];
      const text = await element.textContent();
      const classes = await element.getAttribute('class');
      const isVisible = await element.isVisible();
      if (text && (text.includes('email') || text.includes('Invalid') || text.includes('required'))) {
        console.log(`   Found relevant: "${text}", Classes: "${classes}", Visible: ${isVisible}`);
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the debug
debugErrorDisplay().catch(console.error);
