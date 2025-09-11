#!/usr/bin/env node

const { chromium } = require('playwright');

async function diagnoseCriticalIssues() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🔍 FOCUSED DIAGNOSIS - CRITICAL FAILING TESTS');
  console.log('==============================================');
  
  const issues = [];
  
  try {
    // Issue 1: Registration Flow
    console.log('\n1️⃣ DIAGNOSING: Registration Flow');
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // Fill registration form with unique email
    const email = `test${Date.now()}@example.com`;
    console.log(`   📧 Using email: ${email}`);
    
    await page.fill('[name="firstName"]', 'Test');
    await page.fill('[name="lastName"]', 'User');
    await page.fill('[name="email"]', email);
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.fill('[name="confirmPassword"]', 'TestPassword123!');
    
    // Check if company name field exists
    const companyField = await page.locator('[name="companyName"]').count();
    if (companyField > 0) {
      await page.fill('[name="companyName"]', 'Test Company');
    }
    
    console.log('   🚀 Submitting registration...');
    await page.click('button[type="submit"]');
    
    // Wait and check response
    await page.waitForTimeout(5000);
    const currentUrl = page.url();
    const errorMessage = await page.locator('[role="alert"], .error, .alert-danger').textContent().catch(() => '');
    const successMessage = await page.locator('.success, .alert-success').textContent().catch(() => '');
    
    console.log(`   📍 Current URL: ${currentUrl}`);
    console.log(`   ❌ Error Message: ${errorMessage || 'None'}`);
    console.log(`   ✅ Success Message: ${successMessage || 'None'}`);
    
    if (currentUrl.includes('/register') && !successMessage) {
      issues.push({
        issue: 'Registration Flow',
        problem: 'Form submission does not redirect or show success',
        details: { currentUrl, errorMessage, successMessage }
      });
    }
    
    // Issue 2: Business Type Selection
    console.log('\n2️⃣ DIAGNOSING: Business Type Selection');
    await page.goto('https://app.floworx-iq.com/onboarding');
    await page.waitForLoadState('networkidle');
    
    // Check for business type elements
    const businessTypeSelectors = [
      'input[type="radio"]',
      '.business-type',
      'select option',
      '[data-testid*="business"]',
      'button[value*="hot"]',
      'text=Hot Tub',
      'text=Spa'
    ];
    
    let businessTypesFound = 0;
    let hotTubFound = false;
    
    for (const selector of businessTypeSelectors) {
      const count = await page.locator(selector).count();
      if (count > 0) {
        businessTypesFound += count;
        console.log(`   ✅ Found ${count} elements with selector: ${selector}`);
        
        // Check if it's hot tub related
        if (selector.includes('hot') || selector.includes('Hot Tub') || selector.includes('Spa')) {
          hotTubFound = true;
        }
      }
    }
    
    console.log(`   📊 Total business type elements found: ${businessTypesFound}`);
    console.log(`   🛁 Hot Tub option found: ${hotTubFound}`);
    
    if (businessTypesFound === 0) {
      issues.push({
        issue: 'Business Type Selection',
        problem: 'No business type options found on onboarding page',
        details: { businessTypesFound, hotTubFound }
      });
    }
    
    // Issue 3: Login Redirect
    console.log('\n3️⃣ DIAGNOSING: Login Redirect');
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForLoadState('networkidle');
    
    // Try login with test credentials (will likely fail but we can see behavior)
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    const loginUrl = page.url();
    const loginError = await page.locator('[role="alert"], .error').textContent().catch(() => '');
    
    console.log(`   📍 Login URL after attempt: ${loginUrl}`);
    console.log(`   ❌ Login Error: ${loginError || 'None'}`);
    
    if (!loginError && loginUrl.includes('/login')) {
      issues.push({
        issue: 'Login Redirect',
        problem: 'Login does not show error message for invalid credentials',
        details: { loginUrl, loginError }
      });
    }
    
    // Issue 4: Dashboard Navigation
    console.log('\n4️⃣ DIAGNOSING: Dashboard Navigation');
    await page.goto('https://app.floworx-iq.com/dashboard');
    await page.waitForLoadState('networkidle');
    
    const navElements = await page.locator('nav, [role="navigation"], .navbar').count();
    const navLinks = await page.locator('nav a, [role="navigation"] a').count();
    const dashboardContent = await page.locator('main, .dashboard, [data-testid*="dashboard"]').count();
    
    console.log(`   🧭 Navigation elements: ${navElements}`);
    console.log(`   🔗 Navigation links: ${navLinks}`);
    console.log(`   📊 Dashboard content areas: ${dashboardContent}`);
    
    if (navElements === 0 || dashboardContent === 0) {
      issues.push({
        issue: 'Dashboard Navigation',
        problem: 'Dashboard missing navigation or content areas',
        details: { navElements, navLinks, dashboardContent }
      });
    }
    
    // Issue 5: Password Reset
    console.log('\n5️⃣ DIAGNOSING: Password Reset');
    await page.goto('https://app.floworx-iq.com/forgot-password');
    await page.waitForLoadState('networkidle');
    
    const emailInput = await page.locator('input[type="email"], [name="email"]').count();
    const resetButton = await page.locator('button[type="submit"], button:has-text("Reset"), button:has-text("Send")').count();
    
    console.log(`   📧 Email input found: ${emailInput > 0}`);
    console.log(`   🔘 Reset button found: ${resetButton > 0}`);
    
    if (emailInput === 0 || resetButton === 0) {
      issues.push({
        issue: 'Password Reset',
        problem: 'Password reset page missing email input or submit button',
        details: { hasEmailInput: emailInput > 0, hasResetButton: resetButton > 0 }
      });
    }
    
    // Issue 6: Keyboard Navigation
    console.log('\n6️⃣ DIAGNOSING: Keyboard Navigation');
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForLoadState('networkidle');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    const firstFocus = await page.evaluate(() => document.activeElement.tagName);
    await page.keyboard.press('Tab');
    const secondFocus = await page.evaluate(() => document.activeElement.tagName);
    await page.keyboard.press('Tab');
    const thirdFocus = await page.evaluate(() => document.activeElement.tagName);
    
    console.log(`   🎯 Tab sequence: ${firstFocus} → ${secondFocus} → ${thirdFocus}`);
    
    if (firstFocus === secondFocus && secondFocus === thirdFocus) {
      issues.push({
        issue: 'Keyboard Navigation',
        problem: 'Tab navigation not working - same element focused repeatedly',
        details: { tabSequence: [firstFocus, secondFocus, thirdFocus] }
      });
    }
    
  } catch (error) {
    console.error(`❌ Diagnosis error: ${error.message}`);
    issues.push({
      issue: 'Diagnosis Error',
      problem: error.message,
      details: { error: error.stack }
    });
  }
  
  // Summary
  console.log('\n📊 DIAGNOSIS SUMMARY');
  console.log('====================');
  console.log(`Issues Found: ${issues.length}`);
  
  if (issues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES TO FIX:');
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.issue}: ${issue.problem}`);
    });
    
    console.log('\n🔧 RECOMMENDED FIXES:');
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.issue}:`);
      if (issue.issue === 'Registration Flow') {
        console.log('   - Check API endpoint response and error handling');
        console.log('   - Verify redirect logic in registration success handler');
        console.log('   - Check for JavaScript errors in browser console');
      } else if (issue.issue === 'Business Type Selection') {
        console.log('   - Verify business types API endpoint is working');
        console.log('   - Check if onboarding component is loading data properly');
        console.log('   - Ensure business types are being rendered in UI');
      } else if (issue.issue === 'Dashboard Navigation') {
        console.log('   - Add navigation component to dashboard layout');
        console.log('   - Ensure dashboard content is properly structured');
        console.log('   - Check if user authentication is required for dashboard');
      }
    });
  } else {
    console.log('🎉 No critical issues found!');
  }
  
  console.log('\n🔍 Browser will stay open for 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);
  
  await browser.close();
  return issues;
}

diagnoseCriticalIssues().catch(console.error);
