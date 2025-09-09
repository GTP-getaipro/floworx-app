const { chromium } = require('playwright');

async function verifyCriticalBugs() {
  console.log('🚨 VERIFYING CRITICAL BUGS IDENTIFIED FROM TESTS');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  const bugReport = {
    toastDataTestId: { status: 'UNKNOWN', details: [] },
    validationErrorDataTestId: { status: 'UNKNOWN', details: [] },
    loginFormDataTestId: { status: 'UNKNOWN', details: [] },
    dashboardRedirect: { status: 'UNKNOWN', details: [] }
  };

  try {
    console.log('\n🔴 BUG #1: TOAST NOTIFICATIONS DATA-TESTID');
    console.log('─'.repeat(50));
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Fill form with invalid data to trigger error toast
    await page.fill('input[name="firstName"]', 'Bug');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', 'invalid-email-format');
    await page.fill('input[name="password"]', 'BugTest123!');
    await page.fill('input[name="confirmPassword"]', 'BugTest123!');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Check for toast elements
    const toastElements = await page.locator('div[class*="fixed"][class*="top-4"]').count();
    const toastWithTestId = await page.locator('[data-testid*="toast"]').count();
    
    bugReport.toastDataTestId.details.push(`Toast elements found: ${toastElements}`);
    bugReport.toastDataTestId.details.push(`Toast with data-testid: ${toastWithTestId}`);
    
    if (toastElements > 0 && toastWithTestId === 0) {
      bugReport.toastDataTestId.status = 'CONFIRMED';
      bugReport.toastDataTestId.details.push('❌ CONFIRMED: Toasts render but missing data-testid attributes');
    } else if (toastElements === 0) {
      bugReport.toastDataTestId.details.push('⚠️ No toasts triggered - may need different trigger');
    } else {
      bugReport.toastDataTestId.status = 'NOT_REPRODUCED';
    }

    console.log('\n🔴 BUG #2: VALIDATION ERROR DATA-TESTID');
    console.log('─'.repeat(50));

    // Check for validation error elements
    const errorElements = await page.locator('p, span, div').evaluateAll(elements => {
      return elements
        .filter(el => {
          const text = el.textContent.toLowerCase();
          const classes = el.className.toLowerCase();
          return (text.includes('invalid') || text.includes('error')) && 
                 (text.includes('email') || text.includes('format'));
        })
        .map(el => ({
          tag: el.tagName,
          text: el.textContent,
          classes: el.className,
          hasDataTestId: !!el.getAttribute('data-testid')
        }));
    });

    const errorWithTestId = await page.locator('[data-testid*="error"]').count();
    
    bugReport.validationErrorDataTestId.details.push(`Error elements found: ${errorElements.length}`);
    bugReport.validationErrorDataTestId.details.push(`Errors with data-testid: ${errorWithTestId}`);
    
    if (errorElements.length > 0) {
      const hasTestIds = errorElements.some(el => el.hasDataTestId);
      if (!hasTestIds) {
        bugReport.validationErrorDataTestId.status = 'CONFIRMED';
        bugReport.validationErrorDataTestId.details.push('❌ CONFIRMED: Error messages render but missing data-testid attributes');
        bugReport.validationErrorDataTestId.details.push(`Error examples: ${JSON.stringify(errorElements.slice(0, 2), null, 2)}`);
      } else {
        bugReport.validationErrorDataTestId.status = 'NOT_REPRODUCED';
      }
    } else {
      bugReport.validationErrorDataTestId.details.push('⚠️ No validation errors found');
    }

    console.log('\n🔴 BUG #3: LOGIN FORM DATA-TESTID');
    console.log('─'.repeat(50));

    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check for expected login form elements
    const emailInputByTestId = await page.locator('[data-testid="email-input"]').count();
    const passwordInputByTestId = await page.locator('[data-testid="password-input"]').count();
    const loginButtonByTestId = await page.locator('[data-testid="login-button"]').count();
    
    // Check for actual form elements
    const emailInputByName = await page.locator('input[name="email"], input[type="email"]').count();
    const passwordInputByName = await page.locator('input[name="password"], input[type="password"]').count();
    const submitButton = await page.locator('button[type="submit"]').count();

    bugReport.loginFormDataTestId.details.push(`Email input by data-testid: ${emailInputByTestId}`);
    bugReport.loginFormDataTestId.details.push(`Password input by data-testid: ${passwordInputByTestId}`);
    bugReport.loginFormDataTestId.details.push(`Login button by data-testid: ${loginButtonByTestId}`);
    bugReport.loginFormDataTestId.details.push(`Email input by name/type: ${emailInputByName}`);
    bugReport.loginFormDataTestId.details.push(`Password input by name/type: ${passwordInputByName}`);
    bugReport.loginFormDataTestId.details.push(`Submit button: ${submitButton}`);

    if (emailInputByName > 0 && passwordInputByName > 0 && submitButton > 0) {
      if (emailInputByTestId === 0 || passwordInputByTestId === 0 || loginButtonByTestId === 0) {
        bugReport.loginFormDataTestId.status = 'CONFIRMED';
        bugReport.loginFormDataTestId.details.push('❌ CONFIRMED: Login form exists but missing expected data-testid attributes');
      } else {
        bugReport.loginFormDataTestId.status = 'NOT_REPRODUCED';
      }
    } else {
      bugReport.loginFormDataTestId.status = 'FORM_NOT_FOUND';
      bugReport.loginFormDataTestId.details.push('❌ CRITICAL: Login form elements not found at all');
    }

    console.log('\n🔴 BUG #4: DASHBOARD REDIRECT');
    console.log('─'.repeat(50));

    // Try to test dashboard redirect (if we can find login elements)
    if (emailInputByName > 0 && passwordInputByName > 0) {
      try {
        // Create a test user first (this might fail, but let's try)
        await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
        await page.fill('input[name="password"], input[type="password"]', 'TestPassword123!');
        
        const currentUrl = page.url();
        await page.click('button[type="submit"]');
        await page.waitForTimeout(5000);
        
        const newUrl = page.url();
        const redirected = newUrl !== currentUrl;
        const redirectedToDashboard = newUrl.includes('/dashboard');
        
        bugReport.dashboardRedirect.details.push(`Original URL: ${currentUrl}`);
        bugReport.dashboardRedirect.details.push(`New URL: ${newUrl}`);
        bugReport.dashboardRedirect.details.push(`Redirected: ${redirected}`);
        bugReport.dashboardRedirect.details.push(`Redirected to dashboard: ${redirectedToDashboard}`);
        
        if (redirected && !redirectedToDashboard) {
          bugReport.dashboardRedirect.status = 'CONFIRMED';
          bugReport.dashboardRedirect.details.push('❌ CONFIRMED: Login redirects but not to /dashboard');
        } else if (!redirected) {
          bugReport.dashboardRedirect.status = 'CONFIRMED';
          bugReport.dashboardRedirect.details.push('❌ CONFIRMED: No redirect after login attempt');
        } else {
          bugReport.dashboardRedirect.status = 'NOT_REPRODUCED';
        }
      } catch (error) {
        bugReport.dashboardRedirect.status = 'TEST_FAILED';
        bugReport.dashboardRedirect.details.push(`Test failed: ${error.message}`);
      }
    } else {
      bugReport.dashboardRedirect.status = 'CANNOT_TEST';
      bugReport.dashboardRedirect.details.push('Cannot test - login form not accessible');
    }

  } catch (error) {
    console.error('❌ Bug verification failed:', error);
  } finally {
    await browser.close();
  }

  // Print comprehensive bug report
  console.log('\n📊 COMPREHENSIVE BUG VERIFICATION REPORT');
  console.log('=' .repeat(60));

  Object.entries(bugReport).forEach(([bugName, bugInfo]) => {
    const statusIcon = bugInfo.status === 'CONFIRMED' ? '🔴' : 
                      bugInfo.status === 'NOT_REPRODUCED' ? '🟢' : 
                      bugInfo.status === 'UNKNOWN' ? '🟡' : '⚪';
    
    console.log(`\n${statusIcon} ${bugName.toUpperCase()}: ${bugInfo.status}`);
    bugInfo.details.forEach(detail => {
      console.log(`   ${detail}`);
    });
  });

  // Summary
  const confirmedBugs = Object.values(bugReport).filter(bug => bug.status === 'CONFIRMED').length;
  const totalBugs = Object.keys(bugReport).length;
  
  console.log(`\n🎯 SUMMARY: ${confirmedBugs}/${totalBugs} bugs confirmed`);
  
  if (confirmedBugs > 0) {
    console.log('\n🔧 NEXT STEPS: Fix confirmed bugs');
    console.log('1. Add data-testid attributes to toast components');
    console.log('2. Add data-testid attributes to validation error elements');
    console.log('3. Add data-testid attributes to login form elements');
    console.log('4. Fix dashboard redirect after login');
  }

  return bugReport;
}

// Run verification
verifyCriticalBugs()
  .then((report) => {
    console.log('\n📋 Bug verification completed');
    process.exit(0);
  })
  .catch(console.error);
