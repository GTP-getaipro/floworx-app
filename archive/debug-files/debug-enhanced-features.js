const { chromium } = require('playwright');

async function debugEnhancedFeatures() {
  console.log('🔍 Debugging Enhanced UX Features');
  console.log('=' .repeat(50));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Listen for console messages
  page.on('console', msg => {
    console.log(`🖥️ BROWSER: ${msg.type()}: ${msg.text()}`);
  });

  // Listen for errors
  page.on('pageerror', error => {
    console.log(`❌ PAGE ERROR: ${error.message}`);
  });

  try {
    // Navigate to registration page
    console.log('📍 Navigating to registration page...');
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded successfully');

    // Wait a bit for React to initialize
    await page.waitForTimeout(2000);

    // Debug 1: Check if ValidatedInput components are rendered
    console.log('\n🔍 Debugging ValidatedInput Components...');
    
    const emailInput = await page.locator('input[name="email"]');
    const emailInputExists = await emailInput.count();
    console.log(`Email input exists: ${emailInputExists > 0}`);

    if (emailInputExists > 0) {
      // Test real-time validation
      console.log('Testing email validation...');
      await emailInput.fill('invalid-email');
      await emailInput.blur();
      await page.waitForTimeout(1000);
      
      // Check for validation error
      const errorText = await page.locator('text=/Please enter a valid email/').count();
      const anyErrorText = await page.locator('[class*="text-red"], [class*="error"]').count();
      
      console.log(`Validation error found: ${errorText > 0}`);
      console.log(`Any error styling found: ${anyErrorText > 0}`);
      
      // Check for validation indicators
      const validationSpinner = await page.locator('[class*="animate-spin"]').count();
      console.log(`Validation spinner found: ${validationSpinner > 0}`);
    }

    // Debug 2: Check form persistence
    console.log('\n🔍 Debugging Form Persistence...');
    
    const firstNameInput = await page.locator('input[name="firstName"]');
    const lastNameInput = await page.locator('input[name="lastName"]');
    
    if (await firstNameInput.count() > 0) {
      console.log('Filling form data...');
      await firstNameInput.fill('Debug');
      await lastNameInput.fill('Test');
      
      // Wait for persistence
      await page.waitForTimeout(1000);
      
      // Check sessionStorage
      const sessionData = await page.evaluate(() => {
        const data = sessionStorage.getItem('form_registration');
        return data ? JSON.parse(data) : null;
      });
      
      console.log('Session storage data:', sessionData);
      
      // Navigate away and back
      console.log('Testing persistence by navigating away...');
      await page.goto('https://app.floworx-iq.com/login');
      await page.waitForTimeout(500);
      await page.goto('https://app.floworx-iq.com/register');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Check if data was restored
      const restoredFirstName = await page.inputValue('input[name="firstName"]');
      const restoredLastName = await page.inputValue('input[name="lastName"]');
      
      console.log(`Restored firstName: "${restoredFirstName}"`);
      console.log(`Restored lastName: "${restoredLastName}"`);
    }

    // Debug 3: Check Toast System
    console.log('\n🔍 Debugging Toast System...');
    
    // Fill form with invalid email to trigger toast
    await page.fill('input[name="firstName"]', 'Toast');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'ToastTest123!');
    await page.fill('input[name="confirmPassword"]', 'ToastTest123!');
    
    console.log('Submitting form to trigger toast...');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Check for toast container
    const toastContainer = await page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"]').count();
    console.log(`Toast container found: ${toastContainer > 0}`);
    
    if (toastContainer > 0) {
      const toastContent = await page.locator('div[class*="fixed"][class*="top-4"][class*="right-4"]').textContent();
      console.log(`Toast content: "${toastContent}"`);
    }
    
    // Check for any toast-like elements
    const anyToast = await page.locator('[class*="toast"], [class*="notification"], [class*="alert"]').count();
    console.log(`Any toast-like elements: ${anyToast}`);

    // Debug 4: Check ProtectedButton
    console.log('\n🔍 Debugging ProtectedButton...');
    
    const submitButton = await page.locator('button[type="submit"]');
    const submitButtonExists = await submitButton.count();
    console.log(`Submit button exists: ${submitButtonExists > 0}`);
    
    if (submitButtonExists > 0) {
      const buttonText = await submitButton.textContent();
      const buttonClasses = await submitButton.getAttribute('class');
      console.log(`Button text: "${buttonText}"`);
      console.log(`Button classes: "${buttonClasses}"`);
      
      // Check for loading state after click
      await submitButton.click();
      await page.waitForTimeout(1000);
      
      const loadingSpinner = await submitButton.locator('svg[class*="animate-spin"]').count();
      const loadingText = await submitButton.textContent();
      console.log(`Loading spinner in button: ${loadingSpinner > 0}`);
      console.log(`Button text during loading: "${loadingText}"`);
    }

    // Debug 5: Check Progress Indicator
    console.log('\n🔍 Debugging Progress Indicator...');
    
    const progressSteps = await page.locator('div[class*="rounded-full"][class*="border-2"]').count();
    console.log(`Progress steps found: ${progressSteps}`);
    
    if (progressSteps > 0) {
      const progressContainer = await page.locator('div[class*="rounded-full"][class*="border-2"]').first();
      const progressClasses = await progressContainer.getAttribute('class');
      console.log(`Progress step classes: "${progressClasses}"`);
    }

    console.log('\n📊 Debug Summary Complete');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the debug
debugEnhancedFeatures().catch(console.error);
