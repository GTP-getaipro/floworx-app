#!/usr/bin/env node

const { chromium } = require('playwright');

async function debugRegistration() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen to console logs
  page.on('console', msg => {
    console.log(`🖥️  BROWSER: ${msg.text()}`);
  });
  
  // Listen to network requests
  page.on('response', response => {
    if (response.url().includes('/auth/register')) {
      console.log(`📡 REGISTER API: ${response.status()} ${response.url()}`);
    }
  });
  
  try {
    console.log('🔍 Debugging registration flow...');
    
    await page.goto('http://localhost:3000/register');
    await page.waitForLoadState('networkidle');
    
    console.log('📝 Filling registration form...');
    
    // Fill the form
    await page.fill('[name="firstName"]', 'Test');
    await page.fill('[name="lastName"]', 'User');
    await page.fill('[name="email"]', `test${Date.now()}@example.com`);
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.fill('[name="confirmPassword"]', 'TestPassword123!');
    
    // Optional company name
    const companyField = await page.locator('[name="companyName"]').count();
    if (companyField > 0) {
      await page.fill('[name="companyName"]', 'Test Company');
    }
    
    console.log('📸 Taking screenshot before submission...');
    await page.screenshot({ path: 'debug-registration-before.png' });
    
    console.log('🚀 Submitting form...');
    const submitButton = await page.locator('button[type="submit"], button:has-text("Create Account")').first();
    await submitButton.click();
    
    console.log('⏳ Waiting for response...');
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log(`📍 Current URL after submission: ${currentUrl}`);
    
    // Check for success messages
    const successMessage = await page.locator('[role="alert"], .alert-success, .success').count();
    console.log(`✅ Success messages found: ${successMessage}`);
    
    // Check for error messages
    const errorMessage = await page.locator('.alert-danger, .error, [role="alert"]').count();
    console.log(`❌ Error messages found: ${errorMessage}`);
    
    // Check if still on register page
    if (currentUrl.includes('/register')) {
      console.log('⚠️  Still on registration page - checking for issues...');
      
      // Check form state
      const formData = await page.evaluate(() => {
        const form = document.querySelector('form');
        if (form) {
          const formData = new FormData(form);
          const data = {};
          for (let [key, value] of formData.entries()) {
            data[key] = value;
          }
          return data;
        }
        return null;
      });
      
      console.log('📋 Form data:', formData);
      
      // Check for validation errors
      const validationErrors = await page.locator('.error, .invalid, [aria-invalid="true"]').all();
      console.log(`🔍 Validation errors found: ${validationErrors.length}`);
      
      for (let i = 0; i < validationErrors.length; i++) {
        const errorText = await validationErrors[i].textContent();
        console.log(`   Error ${i + 1}: ${errorText}`);
      }
    } else {
      console.log('✅ Successfully redirected from registration page');
    }
    
    console.log('📸 Taking screenshot after submission...');
    await page.screenshot({ path: 'debug-registration-after.png' });
    
    console.log('🔍 Browser will stay open for 15 seconds for inspection...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    await browser.close();
  }
}

debugRegistration().catch(console.error);
