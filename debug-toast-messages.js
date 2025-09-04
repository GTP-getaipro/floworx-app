const { chromium } = require('playwright');

async function debugToastMessages() {
  console.log('🔍 DEBUGGING TOAST MESSAGE MISMATCHES');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('\n🧪 TEST 1: SUCCESSFUL REGISTRATION TOAST');
    console.log('─'.repeat(50));
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Fill form with valid data
    const testUser = {
      firstName: 'Toast',
      lastName: 'Message',
      companyName: 'Toast Message Co',
      email: `toastmsg.${Date.now()}@example.com`,
      password: 'ToastMessage123!'
    };

    console.log(`👤 Test user: ${testUser.email}`);

    await page.fill('input[name="firstName"]', testUser.firstName);
    await page.fill('input[name="lastName"]', testUser.lastName);
    await page.fill('input[name="companyName"]', testUser.companyName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);

    console.log('✅ Form filled with valid data');
    await page.waitForTimeout(2000);

    // Submit form and capture all toasts
    console.log('🚀 Submitting form...');
    await page.click('button[type="submit"]');

    // Wait and capture all toast messages that appear
    await page.waitForTimeout(8000);

    const allToasts = await page.evaluate(() => {
      const toastContainer = document.querySelector('.fixed.top-4.right-4.z-50');
      if (!toastContainer) return [];

      const toasts = Array.from(toastContainer.children);
      return toasts.map((toast, index) => {
        const innerDiv = toast.querySelector('div[data-testid*="toast"]');
        return {
          index: index,
          outerHTML: toast.outerHTML.substring(0, 200),
          dataTestId: innerDiv ? innerDiv.getAttribute('data-testid') : 'none',
          textContent: toast.textContent,
          variant: innerDiv ? innerDiv.getAttribute('data-testid').replace('toast-', '') : 'unknown',
          classes: innerDiv ? innerDiv.className : 'none'
        };
      });
    });

    console.log(`📊 Found ${allToasts.length} toasts:`);
    allToasts.forEach((toast, index) => {
      console.log(`\n${index + 1}. Toast (${toast.variant}):`);
      console.log(`   data-testid: "${toast.dataTestId}"`);
      console.log(`   Text: "${toast.textContent}"`);
      console.log(`   Classes: "${toast.classes}"`);
    });

    // Check what the test expects vs what we get
    const expectedMessages = [
      "Registration successful! Please check your email to verify your account.",
      "🎉 Account created successfully! Redirecting to your dashboard...",
      "Account created! Please check your email to verify your account.",
      "Registration completed successfully"
    ];

    console.log('\n🔍 EXPECTED VS ACTUAL ANALYSIS:');
    console.log('─'.repeat(50));
    
    expectedMessages.forEach((expected, index) => {
      const matchingToast = allToasts.find(toast => 
        toast.textContent.includes(expected) || 
        expected.includes(toast.textContent.replace('Close', '').trim())
      );
      
      console.log(`${index + 1}. Expected: "${expected}"`);
      console.log(`   Match found: ${matchingToast ? '✅' : '❌'}`);
      if (matchingToast) {
        console.log(`   Actual: "${matchingToast.textContent}"`);
      }
    });

    console.log('\n🧪 TEST 2: DUPLICATE EMAIL REGISTRATION TOAST');
    console.log('─'.repeat(50));

    // Try to register with the same email to trigger error toast
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Fill with same email
    await page.fill('input[name="firstName"]', testUser.firstName);
    await page.fill('input[name="lastName"]', testUser.lastName);
    await page.fill('input[name="companyName"]', testUser.companyName);
    await page.fill('input[name="email"]', testUser.email); // Same email
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);

    console.log('🚀 Submitting duplicate email...');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(8000);

    const errorToasts = await page.evaluate(() => {
      const toastContainer = document.querySelector('.fixed.top-4.right-4.z-50');
      if (!toastContainer) return [];

      const toasts = Array.from(toastContainer.children);
      return toasts.map((toast, index) => {
        const innerDiv = toast.querySelector('div[data-testid*="toast"]');
        return {
          index: index,
          dataTestId: innerDiv ? innerDiv.getAttribute('data-testid') : 'none',
          textContent: toast.textContent,
          variant: innerDiv ? innerDiv.getAttribute('data-testid').replace('toast-', '') : 'unknown'
        };
      }).filter(toast => toast.variant === 'error');
    });

    console.log(`📊 Found ${errorToasts.length} error toasts:`);
    errorToasts.forEach((toast, index) => {
      console.log(`\n${index + 1}. Error Toast:`);
      console.log(`   data-testid: "${toast.dataTestId}"`);
      console.log(`   Text: "${toast.textContent}"`);
    });

    // Check expected error messages
    const expectedErrorMessages = [
      "User already exists",
      "Email already registered",
      "Account with this email already exists",
      "Duplicate email"
    ];

    console.log('\n🔍 ERROR MESSAGE ANALYSIS:');
    console.log('─'.repeat(50));
    
    expectedErrorMessages.forEach((expected, index) => {
      const matchingToast = errorToasts.find(toast => 
        toast.textContent.toLowerCase().includes(expected.toLowerCase())
      );
      
      console.log(`${index + 1}. Expected: "${expected}"`);
      console.log(`   Match found: ${matchingToast ? '✅' : '❌'}`);
      if (matchingToast) {
        console.log(`   Actual: "${matchingToast.textContent}"`);
      }
    });

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

// Run debug
debugToastMessages()
  .then(() => {
    console.log('\n📋 Toast message debug completed');
  })
  .catch(console.error);
