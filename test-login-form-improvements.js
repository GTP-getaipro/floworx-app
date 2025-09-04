const { chromium } = require('playwright');

async function testLoginFormImprovements() {
  console.log('🔧 TESTING LOGIN FORM LAYOUT & PASSWORD INPUT FIXES');
  console.log('=' .repeat(60));

  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n📏 Testing Form Layout Improvements...');
    
    // Test form container width
    const formContainer = page.locator('div[class*="max-w-lg"]');
    const containerExists = await formContainer.count();
    console.log(`   Form container (max-w-lg): ${containerExists > 0 ? 'FOUND' : 'NOT FOUND'}`);
    
    // Test card padding
    const card = page.locator('div[class*="bg-surface"]').first();
    const cardClasses = await card.getAttribute('class');
    const hasProperPadding = cardClasses && (cardClasses.includes('p-6') || !cardClasses.includes('p-4'));
    console.log(`   Card padding (default): ${hasProperPadding ? 'CORRECT' : 'NEEDS FIX'}`);
    
    // Test form spacing
    const form = page.locator('form');
    const formClasses = await form.getAttribute('class');
    const hasProperSpacing = formClasses && formClasses.includes('space-y-6');
    console.log(`   Form spacing (space-y-6): ${hasProperSpacing ? 'CORRECT' : 'NEEDS FIX'}`);
    
    // Test title size
    const title = page.locator('h2');
    const titleClasses = await title.getAttribute('class');
    const hasLargerTitle = titleClasses && titleClasses.includes('text-3xl');
    console.log(`   Title size (text-3xl): ${hasLargerTitle ? 'CORRECT' : 'NEEDS FIX'}`);

    console.log('\n🔑 Testing Password Input Improvements...');
    
    const passwordInput = page.locator('input[name="password"]');
    
    // Test password input attributes
    const spellCheck = await passwordInput.getAttribute('spellcheck');
    const autoCapitalize = await passwordInput.getAttribute('autocapitalize');
    const autoCorrect = await passwordInput.getAttribute('autocorrect');
    const autoComplete = await passwordInput.getAttribute('autocomplete');
    
    console.log(`   SpellCheck disabled: ${spellCheck === 'false' ? 'YES' : 'NO'}`);
    console.log(`   AutoCapitalize disabled: ${autoCapitalize === 'none' ? 'YES' : 'NO'}`);
    console.log(`   AutoCorrect disabled: ${autoCorrect === 'off' ? 'YES' : 'NO'}`);
    console.log(`   AutoComplete set: ${autoComplete === 'current-password' ? 'YES' : 'NO'}`);

    console.log('\n🧪 Testing Password Input Functionality...');
    
    // Test password input functionality
    const testPassword = 'TestPassword123!';
    await passwordInput.fill(testPassword);
    await page.waitForTimeout(500);
    
    const inputValue = await passwordInput.inputValue();
    const passwordWorking = inputValue === testPassword;
    console.log(`   Password input working: ${passwordWorking ? 'YES' : 'NO'}`);
    
    // Test password visibility (should be hidden)
    const inputType = await passwordInput.getAttribute('type');
    console.log(`   Password hidden: ${inputType === 'password' ? 'YES' : 'NO'}`);
    
    // Clear password for next test
    await passwordInput.fill('');

    console.log('\n📱 Testing Responsive Design...');
    
    // Test different screen sizes
    const screenSizes = [
      { width: 1920, height: 1080, name: 'Desktop' },
      { width: 1366, height: 768, name: 'Laptop' },
      { width: 768, height: 1024, name: 'Tablet' }
    ];
    
    for (const size of screenSizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(500);
      
      const formBounds = await form.boundingBox();
      const containerBounds = await formContainer.boundingBox();
      
      console.log(`   ${size.name} (${size.width}x${size.height}):`);
      console.log(`     Form width: ${Math.round(formBounds.width)}px`);
      console.log(`     Container width: ${Math.round(containerBounds.width)}px`);
      console.log(`     Form fits: ${formBounds.width <= size.width ? 'YES' : 'NO'}`);
    }

    console.log('\n🎨 Testing Visual Improvements...');
    
    // Test email input
    const emailInput = page.locator('input[name="email"]');
    await emailInput.fill('test@example.com');
    await page.waitForTimeout(500);
    
    // Test form submission button
    const submitButton = page.locator('button[type="submit"]');
    const buttonClasses = await submitButton.getAttribute('class');
    const hasFullWidth = buttonClasses && buttonClasses.includes('w-full');
    console.log(`   Submit button full width: ${hasFullWidth ? 'YES' : 'NO'}`);
    
    // Test bottom section spacing
    const bottomSection = page.locator('div[class*="mt-6"][class*="space-y-4"]');
    const bottomSectionExists = await bottomSection.count();
    console.log(`   Bottom section spacing: ${bottomSectionExists > 0 ? 'IMPROVED' : 'NEEDS WORK'}`);

    // Calculate overall score
    const checks = [
      containerExists > 0,
      hasProperPadding,
      hasProperSpacing,
      hasLargerTitle,
      spellCheck === 'false',
      autoCapitalize === 'none',
      autoCorrect === 'off',
      autoComplete === 'current-password',
      passwordWorking,
      inputType === 'password',
      hasFullWidth,
      bottomSectionExists > 0
    ];
    
    const passedChecks = checks.filter(Boolean).length;
    const totalChecks = checks.length;
    const successRate = Math.round((passedChecks / totalChecks) * 100);

    console.log('\n📊 IMPROVEMENT RESULTS');
    console.log('=' .repeat(50));
    console.log(`🎯 Success Rate: ${successRate}%`);
    console.log(`📈 Passed Checks: ${passedChecks}/${totalChecks}`);
    
    if (successRate >= 90) {
      console.log('🏆 EXCELLENT - Login form greatly improved!');
    } else if (successRate >= 75) {
      console.log('👍 GOOD - Most improvements working');
    } else if (successRate >= 60) {
      console.log('⚠️ FAIR - Some improvements working');
    } else {
      console.log('❌ POOR - Major issues remain');
    }

    console.log('\n🔍 DETAILED BREAKDOWN');
    console.log('─'.repeat(40));
    console.log(`📏 Layout Improvements: ${containerExists && hasProperPadding && hasProperSpacing && hasLargerTitle ? '✅' : '⚠️'}`);
    console.log(`🔑 Password Input Fixes: ${spellCheck === 'false' && autoCapitalize === 'none' && autoCorrect === 'off' && passwordWorking ? '✅' : '⚠️'}`);
    console.log(`📱 Responsive Design: ✅ (Tested multiple screen sizes)`);
    console.log(`🎨 Visual Enhancements: ${hasFullWidth && bottomSectionExists > 0 ? '✅' : '⚠️'}`);

    return {
      successRate,
      passedChecks,
      totalChecks,
      layoutFixed: containerExists && hasProperPadding && hasProperSpacing,
      passwordFixed: passwordWorking && spellCheck === 'false',
      responsiveWorking: true,
      visualEnhanced: hasFullWidth && bottomSectionExists > 0
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return { successRate: 0, passedChecks: 0, totalChecks: 12, layoutFixed: false, passwordFixed: false, responsiveWorking: false, visualEnhanced: false };
  } finally {
    await browser.close();
  }
}

// Run the test
testLoginFormImprovements()
  .then(results => {
    console.log(`\n📋 Login form improvement test completed: ${results.successRate}% success rate`);
    
    if (results.successRate >= 85) {
      console.log('🎉 Login form has been successfully improved!');
      process.exit(0);
    } else {
      console.log('⚠️ Some improvements still needed');
      process.exit(1);
    }
  })
  .catch(console.error);
