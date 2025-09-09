const { chromium } = require('playwright');

async function debugConfirmPasswordTestId() {
  console.log('🔍 DEBUGGING CONFIRM PASSWORD DATA-TESTID ISSUE');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('\n🧪 TRIGGERING CONFIRM PASSWORD VALIDATION');
    console.log('─'.repeat(50));

    // Fill form to trigger confirm password validation
    await page.fill('input[name="firstName"]', 'Debug');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', 'debug@example.com');
    await page.fill('input[name="password"]', 'TestPassword123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    
    // Trigger validation by blurring the confirm password field
    await page.click('input[name="firstName"]');
    await page.waitForTimeout(2000);

    console.log('\n🔍 ANALYZING ALL ERROR ELEMENTS');
    console.log('─'.repeat(50));

    // Get all error elements and their properties
    const allErrors = await page.evaluate(() => {
      const errorElements = document.querySelectorAll('p.text-danger, [data-testid*="error"]');
      
      return Array.from(errorElements).map((el, index) => {
        // Find the parent input element
        let parentInput = null;
        let currentElement = el.parentElement;
        
        while (currentElement && !parentInput) {
          const input = currentElement.querySelector('input');
          if (input) {
            parentInput = {
              name: input.name,
              type: input.type,
              id: input.id
            };
          }
          currentElement = currentElement.parentElement;
        }

        return {
          index: index,
          tagName: el.tagName,
          className: el.className,
          textContent: el.textContent,
          dataTestId: el.getAttribute('data-testid'),
          hasDataTestId: !!el.getAttribute('data-testid'),
          parentInput: parentInput,
          outerHTML: el.outerHTML.substring(0, 200)
        };
      });
    });

    console.log(`Found ${allErrors.length} error elements:`);
    allErrors.forEach((error, index) => {
      console.log(`\n${index + 1}. Error Element:`);
      console.log(`   Text: "${error.textContent}"`);
      console.log(`   data-testid: "${error.dataTestId || 'NONE'}"`);
      console.log(`   Has data-testid: ${error.hasDataTestId ? '✅' : '❌'}`);
      console.log(`   Parent input: ${error.parentInput ? error.parentInput.name : 'none'}`);
      console.log(`   Classes: "${error.className}"`);
      console.log(`   HTML: ${error.outerHTML}`);
    });

    console.log('\n🔍 SPECIFIC CONFIRM PASSWORD ERROR ANALYSIS');
    console.log('─'.repeat(50));

    // Find the specific "Passwords do not match" error
    const confirmPasswordErrors = allErrors.filter(error => 
      error.textContent.toLowerCase().includes('password') && 
      (error.textContent.toLowerCase().includes('match') || 
       error.textContent.toLowerCase().includes('confirm'))
    );

    console.log(`Found ${confirmPasswordErrors.length} confirm password related errors:`);
    confirmPasswordErrors.forEach((error, index) => {
      console.log(`\n${index + 1}. Confirm Password Error:`);
      console.log(`   Text: "${error.textContent}"`);
      console.log(`   data-testid: "${error.dataTestId || 'MISSING'}"`);
      console.log(`   Expected: "confirm-password-error"`);
      console.log(`   Match: ${error.dataTestId === 'confirm-password-error' ? '✅' : '❌'}`);
      console.log(`   Parent input: ${error.parentInput ? error.parentInput.name : 'none'}`);
    });

    console.log('\n🔍 CHECKING INPUT FIELD STRUCTURE');
    console.log('─'.repeat(50));

    // Check the structure around the confirm password input
    const confirmPasswordStructure = await page.evaluate(() => {
      const confirmPasswordInput = document.querySelector('input[name="confirmPassword"]');
      if (!confirmPasswordInput) return { error: 'Confirm password input not found' };

      // Get the parent container
      const container = confirmPasswordInput.closest('div');
      
      return {
        inputExists: true,
        inputName: confirmPasswordInput.name,
        inputDataTestId: confirmPasswordInput.getAttribute('data-testid'),
        containerHTML: container ? container.outerHTML.substring(0, 500) : 'no container',
        errorElements: Array.from(container.querySelectorAll('p')).map(p => ({
          text: p.textContent,
          classes: p.className,
          dataTestId: p.getAttribute('data-testid')
        }))
      };
    });

    console.log('Confirm password field structure:');
    Object.entries(confirmPasswordStructure).forEach(([key, value]) => {
      if (key === 'errorElements') {
        console.log(`   ${key}:`);
        value.forEach((error, index) => {
          console.log(`     ${index + 1}. "${error.text}" - testid: "${error.dataTestId || 'none'}"`);
        });
      } else {
        console.log(`   ${key}: ${typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + '...' : value}`);
      }
    });

    console.log('\n🔍 CHECKING FORM VALIDATION LOGIC');
    console.log('─'.repeat(50));

    // Check if the validation is happening at the right level
    const validationCheck = await page.evaluate(() => {
      // Try to find validation-related JavaScript
      const scripts = Array.from(document.querySelectorAll('script'));
      const hasValidationScript = scripts.some(script => 
        script.textContent && (
          script.textContent.includes('confirmPassword') ||
          script.textContent.includes('password') && script.textContent.includes('match')
        )
      );

      // Check for React components
      const confirmPasswordInput = document.querySelector('input[name="confirmPassword"]');
      const hasReactFiber = confirmPasswordInput && (
        confirmPasswordInput._reactInternalFiber || 
        confirmPasswordInput.__reactInternalInstance
      );

      return {
        hasValidationScript: hasValidationScript,
        hasReactFiber: !!hasReactFiber,
        inputValue: confirmPasswordInput ? confirmPasswordInput.value : 'not found'
      };
    });

    console.log('Validation logic check:');
    Object.entries(validationCheck).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

// Run debug
debugConfirmPasswordTestId()
  .then(() => {
    console.log('\n📋 Confirm password data-testid debug completed');
  })
  .catch(console.error);
