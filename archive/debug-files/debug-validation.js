const { chromium } = require('playwright');

async function debugValidation() {
  console.log('🔍 DEBUGGING REAL-TIME VALIDATION');
  console.log('=' .repeat(50));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Listen for all console messages
  page.on('console', msg => {
    console.log(`🖥️ BROWSER ${msg.type()}: ${msg.text()}`);
  });

  // Listen for errors
  page.on('pageerror', error => {
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });

  try {
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Test email validation step by step
    console.log('\n📧 Testing Email Validation...');
    
    const emailInput = page.locator('input[name="email"]');
    
    // Check if input exists
    const inputExists = await emailInput.count();
    console.log(`Email input exists: ${inputExists > 0}`);
    
    if (inputExists > 0) {
      // Fill with invalid email
      console.log('Filling invalid email...');
      await emailInput.fill('invalid-email');
      
      // Trigger blur event
      console.log('Triggering blur event...');
      await emailInput.blur();
      
      // Wait for validation
      await page.waitForTimeout(2000);
      
      // Check for error elements
      console.log('\nChecking for error elements...');
      
      // Check for error text in various ways
      const errorByText1 = await page.locator('text=/Please enter a valid email/').count();
      const errorByText2 = await page.locator('text=/Invalid email format/').count();
      const errorByText3 = await page.locator('text=/valid email/').count();
      
      console.log(`Error by "Please enter a valid email": ${errorByText1}`);
      console.log(`Error by "Invalid email format": ${errorByText2}`);
      console.log(`Error by "valid email": ${errorByText3}`);
      
      // Check for error styling
      const errorByClass1 = await page.locator('[class*="text-red"]').count();
      const errorByClass2 = await page.locator('[class*="text-danger"]').count();
      const errorByClass3 = await page.locator('[class*="error"]').count();
      
      console.log(`Error by "text-red" class: ${errorByClass1}`);
      console.log(`Error by "text-danger" class: ${errorByClass2}`);
      console.log(`Error by "error" class: ${errorByClass3}`);
      
      // Check input styling
      const inputClasses = await emailInput.getAttribute('class');
      console.log(`Input classes: ${inputClasses}`);
      
      // Check for error elements near the input
      const parentDiv = emailInput.locator('..');
      const errorInParent = await parentDiv.locator('p, span, div').count();
      console.log(`Elements in parent div: ${errorInParent}`);
      
      if (errorInParent > 0) {
        const parentContent = await parentDiv.textContent();
        console.log(`Parent div content: "${parentContent}"`);
      }
      
      // Check the ValidatedInput wrapper
      const validatedInputWrapper = emailInput.locator('../..');
      const wrapperContent = await validatedInputWrapper.textContent();
      console.log(`ValidatedInput wrapper content: "${wrapperContent}"`);
      
      // Try to find any error-related elements on the page
      const allErrorElements = await page.locator('p, span, div').evaluateAll(elements => {
        return elements
          .filter(el => {
            const text = el.textContent.toLowerCase();
            const classes = el.className.toLowerCase();
            return text.includes('email') || text.includes('error') || text.includes('invalid') ||
                   classes.includes('error') || classes.includes('danger') || classes.includes('red');
          })
          .map(el => ({
            tag: el.tagName,
            text: el.textContent,
            classes: el.className
          }));
      });
      
      console.log('\nAll potential error elements:');
      allErrorElements.forEach((el, i) => {
        console.log(`${i + 1}. ${el.tag}: "${el.text}" (classes: ${el.classes})`);
      });
    }

    // Test firstName validation
    console.log('\n👤 Testing FirstName Validation...');
    
    const firstNameInput = page.locator('input[name="firstName"]');
    await firstNameInput.fill('A'); // Too short
    await firstNameInput.blur();
    await page.waitForTimeout(1000);
    
    const firstNameError = await page.locator('text=/must be at least 2 characters/').count();
    console.log(`FirstName validation error: ${firstNameError > 0 ? 'FOUND' : 'NOT FOUND'}`);

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugValidation().catch(console.error);
