const { chromium } = require('playwright');

async function debugPersistence() {
  console.log('🔍 DEBUGGING FORM PERSISTENCE');
  console.log('=' .repeat(50));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  // Listen for all console messages
  page.on('console', msg => {
    console.log(`🖥️ BROWSER ${msg.type()}: ${msg.text()}`);
  });

  try {
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('\n📝 Step 1: Fill form data...');
    const testData = {
      firstName: 'PersistTest',
      lastName: 'Debug',
      companyName: 'Debug Company',
      email: 'persist@test.com'
    };

    await page.fill('input[name="firstName"]', testData.firstName);
    await page.fill('input[name="lastName"]', testData.lastName);
    await page.fill('input[name="companyName"]', testData.companyName);
    await page.fill('input[name="email"]', testData.email);
    
    // Wait for persistence to save
    await page.waitForTimeout(2000);
    
    // Check sessionStorage
    const sessionData = await page.evaluate(() => {
      const data = sessionStorage.getItem('form_registration');
      return data ? JSON.parse(data) : null;
    });
    
    console.log('📦 Data in sessionStorage:', sessionData);

    console.log('\n🔄 Step 2: Navigate away and back...');
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForTimeout(1000);
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Give more time for React to initialize

    console.log('\n🔍 Step 3: Check if data was restored...');
    
    // Check sessionStorage again
    const restoredSessionData = await page.evaluate(() => {
      const data = sessionStorage.getItem('form_registration');
      return data ? JSON.parse(data) : null;
    });
    
    console.log('📦 Data still in sessionStorage:', restoredSessionData);
    
    // Check form input values
    const formValues = await page.evaluate(() => {
      return {
        firstName: document.querySelector('input[name="firstName"]')?.value || '',
        lastName: document.querySelector('input[name="lastName"]')?.value || '',
        companyName: document.querySelector('input[name="companyName"]')?.value || '',
        email: document.querySelector('input[name="email"]')?.value || ''
      };
    });
    
    console.log('📝 Current form values:', formValues);
    
    // Check React component state
    const reactState = await page.evaluate(() => {
      // Try to access React DevTools or component state
      const inputs = document.querySelectorAll('input[name]');
      const inputStates = {};
      inputs.forEach(input => {
        inputStates[input.name] = {
          value: input.value,
          defaultValue: input.defaultValue,
          placeholder: input.placeholder
        };
      });
      return inputStates;
    });
    
    console.log('⚛️ React input states:', reactState);

    // Test manual restoration
    console.log('\n🔧 Step 4: Test manual restoration...');
    
    if (restoredSessionData) {
      console.log('Manually setting form values...');
      
      // Try to set values directly
      await page.evaluate((data) => {
        const firstName = document.querySelector('input[name="firstName"]');
        const lastName = document.querySelector('input[name="lastName"]');
        const companyName = document.querySelector('input[name="companyName"]');
        const email = document.querySelector('input[name="email"]');
        
        if (firstName) {
          firstName.value = data.firstName || '';
          firstName.dispatchEvent(new Event('input', { bubbles: true }));
          firstName.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        if (lastName) {
          lastName.value = data.lastName || '';
          lastName.dispatchEvent(new Event('input', { bubbles: true }));
          lastName.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        if (companyName) {
          companyName.value = data.companyName || '';
          companyName.dispatchEvent(new Event('input', { bubbles: true }));
          companyName.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        if (email) {
          email.value = data.email || '';
          email.dispatchEvent(new Event('input', { bubbles: true }));
          email.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        return 'Manual restoration attempted';
      }, restoredSessionData);
      
      await page.waitForTimeout(1000);
      
      // Check if manual restoration worked
      const manualValues = await page.evaluate(() => {
        return {
          firstName: document.querySelector('input[name="firstName"]')?.value || '',
          lastName: document.querySelector('input[name="lastName"]')?.value || '',
          companyName: document.querySelector('input[name="companyName"]')?.value || '',
          email: document.querySelector('input[name="email"]')?.value || ''
        };
      });
      
      console.log('📝 Values after manual restoration:', manualValues);
    }

    // Check for any error messages in console
    console.log('\n🚨 Step 5: Check for any React errors...');
    
    // Look for React error boundaries or warnings
    const reactErrors = await page.evaluate(() => {
      const errors = [];
      
      // Check for React error boundaries
      const errorBoundaries = document.querySelectorAll('[data-reactroot] *');
      errorBoundaries.forEach(el => {
        if (el.textContent && el.textContent.includes('Error')) {
          errors.push(`Error boundary: ${el.textContent}`);
        }
      });
      
      return errors;
    });
    
    if (reactErrors.length > 0) {
      console.log('⚠️ React errors found:', reactErrors);
    } else {
      console.log('✅ No React errors detected');
    }

    // Summary
    console.log('\n📊 PERSISTENCE DEBUG SUMMARY');
    console.log('─'.repeat(40));
    console.log(`Data saved to sessionStorage: ${sessionData ? 'YES' : 'NO'}`);
    console.log(`Data persists after navigation: ${restoredSessionData ? 'YES' : 'NO'}`);
    console.log(`Form inputs restored: ${Object.values(formValues).some(v => v) ? 'YES' : 'NO'}`);
    console.log(`Manual restoration works: ${Object.values(formValues).some(v => v) ? 'YES' : 'NO'}`);

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugPersistence().catch(console.error);
