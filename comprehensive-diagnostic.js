#!/usr/bin/env node

const { chromium } = require('playwright');

async function runComprehensiveDiagnostic() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('🔍 COMPREHENSIVE DIAGNOSTIC - FLOWORX ISSUES');
  console.log('==============================================');
  
  const issues = [];
  
  try {
    // Test 1: Google OAuth Button
    console.log('\n1️⃣ Testing Google OAuth Button...');
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForLoadState('networkidle');
    
    const googleButton = await page.locator('button:has-text("Continue with Google"), [data-testid="google-oauth-button"]').count();
    if (googleButton === 0) {
      issues.push('❌ Google OAuth button not found on login page');
      
      // Debug: Check what buttons exist
      const allButtons = await page.locator('button').all();
      console.log(`   Found ${allButtons.length} buttons total:`);
      for (let i = 0; i < Math.min(allButtons.length, 5); i++) {
        const text = await allButtons[i].textContent();
        console.log(`   - "${text}"`);
      }
    } else {
      console.log('   ✅ Google OAuth button found');
    }
    
    // Test 2: Registration Flow
    console.log('\n2️⃣ Testing Registration Flow...');
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // Fill registration form
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.fill('[name="firstName"]', 'Test');
    await page.fill('[name="lastName"]', 'User');
    
    const submitButton = await page.locator('button[type="submit"], button:has-text("Register")').first();
    if (await submitButton.count() > 0) {
      await submitButton.click();
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      if (currentUrl.includes('/register')) {
        issues.push('❌ Registration form does not redirect after submission');
      } else {
        console.log('   ✅ Registration redirects properly');
      }
    } else {
      issues.push('❌ Registration submit button not found');
    }
    
    // Test 3: Business Type Selection
    console.log('\n3️⃣ Testing Business Type Selection...');
    await page.goto('https://app.floworx-iq.com/onboarding');
    await page.waitForLoadState('networkidle');
    
    const businessTypes = await page.locator('[data-testid*="business-type"], .business-type, button:has-text("Hot Tub")').count();
    if (businessTypes === 0) {
      issues.push('❌ No business type options found on onboarding page');
    } else {
      console.log(`   ✅ Found ${businessTypes} business type options`);
    }
    
    // Test 4: Password Reset Flow
    console.log('\n4️⃣ Testing Password Reset Flow...');
    await page.goto('https://app.floworx-iq.com/forgot-password');
    await page.waitForLoadState('networkidle');
    
    const emailInput = await page.locator('[name="email"], input[type="email"]').count();
    const resetButton = await page.locator('button:has-text("Reset"), button:has-text("Send")').count();
    
    if (emailInput === 0 || resetButton === 0) {
      issues.push('❌ Password reset form incomplete (missing email input or submit button)');
    } else {
      console.log('   ✅ Password reset form appears complete');
    }
    
    // Test 5: Login Redirect
    console.log('\n5️⃣ Testing Login Redirect...');
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForLoadState('networkidle');
    
    // Try to login (this will likely fail but we can see the behavior)
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'wrongpassword');
    
    const loginButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').first();
    if (await loginButton.count() > 0) {
      await loginButton.click();
      await page.waitForTimeout(2000);
      
      // Check if error message appears (good) or if it redirects unexpectedly (bad)
      const errorMessage = await page.locator('[role="alert"], .error, .text-danger').count();
      if (errorMessage > 0) {
        console.log('   ✅ Login shows error message for invalid credentials');
      } else {
        issues.push('❌ Login does not show proper error feedback');
      }
    } else {
      issues.push('❌ Login submit button not found');
    }
    
    // Test 6: Keyboard Navigation
    console.log('\n6️⃣ Testing Keyboard Navigation...');
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForLoadState('networkidle');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    const firstFocus = await page.evaluate(() => document.activeElement.tagName);
    await page.keyboard.press('Tab');
    const secondFocus = await page.evaluate(() => document.activeElement.tagName);
    
    if (firstFocus === secondFocus) {
      issues.push('❌ Keyboard navigation not working properly (same element focused)');
    } else {
      console.log(`   ✅ Keyboard navigation working: ${firstFocus} → ${secondFocus}`);
    }
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error.message);
    issues.push(`❌ Diagnostic error: ${error.message}`);
  }
  
  // Summary
  console.log('\n📊 DIAGNOSTIC SUMMARY');
  console.log('====================');
  console.log(`Total Issues Found: ${issues.length}`);
  
  if (issues.length > 0) {
    console.log('\n🚨 ISSUES TO FIX:');
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  } else {
    console.log('\n🎉 No issues found! All tests passing.');
  }
  
  console.log('\n🔍 Browser will stay open for 10 seconds for manual inspection...');
  await page.waitForTimeout(10000);
  
  await browser.close();
  return issues;
}

runComprehensiveDiagnostic().catch(console.error);
