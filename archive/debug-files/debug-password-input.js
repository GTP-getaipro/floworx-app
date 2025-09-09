const { chromium } = require('playwright');

async function debugPasswordInput() {
  console.log('🔍 DEBUGGING PASSWORD INPUT ISSUE');
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

    console.log('\n🔍 INSPECTING PASSWORD FIELD');
    console.log('─'.repeat(40));

    // Check if password field exists and is visible
    const passwordField = page.locator('input[name="password"]');
    const fieldExists = await passwordField.count();
    const fieldVisible = fieldExists > 0 ? await passwordField.isVisible() : false;
    const fieldEnabled = fieldExists > 0 ? await passwordField.isEnabled() : false;
    
    console.log(`Password field exists: ${fieldExists > 0 ? '✅' : '❌'}`);
    console.log(`Password field visible: ${fieldVisible ? '✅' : '❌'}`);
    console.log(`Password field enabled: ${fieldEnabled ? '✅' : '❌'}`);

    if (fieldExists > 0) {
      // Get field attributes
      const fieldType = await passwordField.getAttribute('type');
      const fieldName = await passwordField.getAttribute('name');
      const fieldId = await passwordField.getAttribute('id');
      const fieldClass = await passwordField.getAttribute('class');
      
      console.log(`Field type: ${fieldType}`);
      console.log(`Field name: ${fieldName}`);
      console.log(`Field id: ${fieldId}`);
      console.log(`Field classes: ${fieldClass}`);
    }

    console.log('\n🧪 TESTING PASSWORD INPUT METHODS');
    console.log('─'.repeat(40));

    // Method 1: Direct fill
    console.log('Method 1: Direct fill...');
    await passwordField.fill('TestPassword123!');
    await page.waitForTimeout(1000);
    let value1 = await passwordField.inputValue();
    console.log(`Value after fill: "${value1}"`);

    // Method 2: Clear and type
    console.log('Method 2: Clear and type...');
    await passwordField.clear();
    await passwordField.type('TestPassword123!');
    await page.waitForTimeout(1000);
    let value2 = await passwordField.inputValue();
    console.log(`Value after type: "${value2}"`);

    // Method 3: Focus, clear, and type slowly
    console.log('Method 3: Focus, clear, and type slowly...');
    await passwordField.focus();
    await passwordField.clear();
    await passwordField.type('TestPassword123!', { delay: 50 });
    await page.waitForTimeout(1000);
    let value3 = await passwordField.inputValue();
    console.log(`Value after slow type: "${value3}"`);

    // Method 4: Click and type
    console.log('Method 4: Click and type...');
    await passwordField.click();
    await page.keyboard.press('Control+a');
    await page.keyboard.type('TestPassword123!');
    await page.waitForTimeout(1000);
    let value4 = await passwordField.inputValue();
    console.log(`Value after keyboard type: "${value4}"`);

    console.log('\n🔍 TESTING VALIDATION TRIGGER');
    console.log('─'.repeat(40));

    // Test validation trigger
    await passwordField.blur();
    await page.waitForTimeout(2000);
    
    const errorMessages = await page.locator('p.text-danger').count();
    console.log(`Error messages after blur: ${errorMessages}`);
    
    if (errorMessages > 0) {
      const errorText = await page.locator('p.text-danger').first().textContent();
      console.log(`Error message: "${errorText}"`);
    }

    console.log('\n🔍 CHECKING FORM STATE');
    console.log('─'.repeat(40));

    // Check form state
    const formData = await page.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      
      const formData = new FormData(form);
      const data = {};
      for (let [key, value] of formData.entries()) {
        data[key] = value;
      }
      return data;
    });
    
    console.log('Form data:', formData);

    // Check React state (if accessible)
    const reactState = await page.evaluate(() => {
      const passwordInput = document.querySelector('input[name="password"]');
      if (passwordInput && passwordInput._valueTracker) {
        return passwordInput._valueTracker.getValue();
      }
      return 'Not accessible';
    });
    
    console.log('React state:', reactState);

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

// Run debug
debugPasswordInput()
  .then(() => {
    console.log('\n📋 Debug completed');
  })
  .catch(console.error);
