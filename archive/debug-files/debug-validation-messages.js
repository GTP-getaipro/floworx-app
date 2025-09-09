const { chromium } = require('playwright');

async function debugValidationMessages() {
  console.log('🔍 DEBUGGING VALIDATION ERROR MESSAGES');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('\n🧪 TEST 1: EMAIL VALIDATION MESSAGES');
    console.log('─'.repeat(50));

    // Test invalid email formats
    const invalidEmails = [
      'invalid-email',
      'test@',
      '@example.com',
      'test.example.com',
      'test@.com'
    ];

    for (const email of invalidEmails) {
      console.log(`\n📧 Testing email: "${email}"`);
      
      // Clear and fill email field
      await page.fill('input[name="email"]', '');
      await page.fill('input[name="email"]', email);
      await page.click('input[name="firstName"]'); // Trigger blur
      await page.waitForTimeout(1500);

      // Check for error message
      const errorElement = await page.locator('[data-testid="email-error"]').first();
      const errorExists = await errorElement.count();
      
      if (errorExists > 0) {
        const errorText = await errorElement.textContent();
        console.log(`   ✅ Error found: "${errorText}"`);
      } else {
        console.log(`   ❌ No error message found`);
      }
    }

    console.log('\n🔍 EXPECTED VS ACTUAL EMAIL ERRORS:');
    console.log('─'.repeat(50));
    
    const expectedEmailErrors = [
      "Please enter a valid email address",
      "Invalid email format",
      "Email format is invalid",
      "Enter a valid email"
    ];

    // Test with a specific invalid email
    await page.fill('input[name="email"]', '');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.click('input[name="firstName"]');
    await page.waitForTimeout(1500);

    const actualEmailError = await page.locator('[data-testid="email-error"]').first().textContent().catch(() => 'No error');
    console.log(`Actual email error: "${actualEmailError}"`);

    expectedEmailErrors.forEach((expected, index) => {
      const matches = actualEmailError.includes(expected) || expected.includes(actualEmailError);
      console.log(`${index + 1}. Expected: "${expected}" - Match: ${matches ? '✅' : '❌'}`);
    });

    console.log('\n🧪 TEST 2: PASSWORD VALIDATION MESSAGES');
    console.log('─'.repeat(50));

    // Test weak passwords
    const weakPasswords = [
      '123',
      'weak',
      'password',
      '12345678',
      'Password'
    ];

    for (const password of weakPasswords) {
      console.log(`\n🔒 Testing password: "${password}"`);
      
      // Clear and fill password field
      await page.fill('input[name="password"]', '');
      await page.fill('input[name="password"]', password);
      await page.click('input[name="firstName"]'); // Trigger blur
      await page.waitForTimeout(1500);

      // Check for error message
      const errorElement = await page.locator('[data-testid="password-error"]').first();
      const errorExists = await errorElement.count();
      
      if (errorExists > 0) {
        const errorText = await errorElement.textContent();
        console.log(`   ✅ Error found: "${errorText}"`);
      } else {
        console.log(`   ❌ No error message found`);
      }
    }

    console.log('\n🔍 EXPECTED VS ACTUAL PASSWORD ERRORS:');
    console.log('─'.repeat(50));
    
    const expectedPasswordErrors = [
      "Password must be at least 8 characters",
      "Must be at least 8 characters",
      "Password too short",
      "Minimum 8 characters required"
    ];

    // Test with a specific weak password
    await page.fill('input[name="password"]', '');
    await page.fill('input[name="password"]', '123');
    await page.click('input[name="firstName"]');
    await page.waitForTimeout(1500);

    const actualPasswordError = await page.locator('[data-testid="password-error"]').first().textContent().catch(() => 'No error');
    console.log(`Actual password error: "${actualPasswordError}"`);

    expectedPasswordErrors.forEach((expected, index) => {
      const matches = actualPasswordError.includes(expected) || expected.includes(actualPasswordError);
      console.log(`${index + 1}. Expected: "${expected}" - Match: ${matches ? '✅' : '❌'}`);
    });

    console.log('\n🧪 TEST 3: CONFIRM PASSWORD VALIDATION');
    console.log('─'.repeat(50));

    // Test mismatched passwords
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    await page.click('input[name="firstName"]'); // Trigger blur
    await page.waitForTimeout(1500);

    // Check for confirm password error
    const confirmPasswordError = await page.locator('[data-testid="confirm-password-error"]').first();
    const confirmErrorExists = await confirmPasswordError.count();
    
    console.log(`Confirm password error exists: ${confirmErrorExists > 0 ? '✅' : '❌'}`);
    
    if (confirmErrorExists > 0) {
      const confirmErrorText = await confirmPasswordError.textContent();
      console.log(`Confirm password error: "${confirmErrorText}"`);
    } else {
      console.log('❌ No confirm password error found');
      
      // Check if there's any error related to password confirmation
      const allErrors = await page.locator('p.text-danger').allTextContents();
      console.log('All error messages on page:', allErrors);
      
      // Check if the validation is happening at form level
      const formErrors = await page.locator('[data-testid*="error"]').allTextContents();
      console.log('All data-testid errors:', formErrors);
    }

    console.log('\n🔍 VALIDATION RULES ANALYSIS');
    console.log('─'.repeat(50));

    // Check what validation rules are actually implemented
    const validationAnalysis = await page.evaluate(() => {
      const emailInput = document.querySelector('input[name="email"]');
      const passwordInput = document.querySelector('input[name="password"]');
      const confirmPasswordInput = document.querySelector('input[name="confirmPassword"]');
      
      return {
        emailInput: {
          exists: !!emailInput,
          type: emailInput?.type,
          required: emailInput?.required,
          pattern: emailInput?.pattern,
          minLength: emailInput?.minLength,
          maxLength: emailInput?.maxLength
        },
        passwordInput: {
          exists: !!passwordInput,
          type: passwordInput?.type,
          required: passwordInput?.required,
          minLength: passwordInput?.minLength,
          maxLength: passwordInput?.maxLength
        },
        confirmPasswordInput: {
          exists: !!confirmPasswordInput,
          type: confirmPasswordInput?.type,
          required: confirmPasswordInput?.required,
          minLength: confirmPasswordInput?.minLength,
          maxLength: confirmPasswordInput?.maxLength
        }
      };
    });

    console.log('Input validation attributes:');
    Object.entries(validationAnalysis).forEach(([field, attrs]) => {
      console.log(`\n${field}:`);
      Object.entries(attrs).forEach(([attr, value]) => {
        console.log(`   ${attr}: ${value}`);
      });
    });

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

// Run debug
debugValidationMessages()
  .then(() => {
    console.log('\n📋 Validation message debug completed');
  })
  .catch(console.error);
