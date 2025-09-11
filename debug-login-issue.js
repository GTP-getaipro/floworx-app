#!/usr/bin/env node

const { chromium } = require('playwright');
const axios = require('axios');

const BASE_URL = 'https://app.floworx-iq.com';
const API_URL = `${BASE_URL}/api`;

async function debugLoginIssue() {
  console.log('🔍 DEBUGGING LOGIN ISSUE');
  console.log('========================');
  
  const testUser = {
    email: 'owner@hottubparadise.com',
    password: 'TestPassword123!'
  };

  let browser;

  try {
    // First test API login directly
    console.log('\n1️⃣ TESTING API LOGIN DIRECTLY');
    console.log('==============================');
    
    try {
      const apiResponse = await axios.post(`${API_URL}/auth/login`, testUser, {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log(`✅ API Login Success: ${apiResponse.status}`);
      console.log(`📊 Response: ${JSON.stringify(apiResponse.data)}`);
      
      if (apiResponse.data.token) {
        console.log('✅ JWT Token received - API authentication working');
      }
      
    } catch (apiError) {
      console.log(`❌ API Login Failed: ${apiError.response?.status} - ${apiError.response?.data?.error || apiError.message}`);
      console.log(`📊 Full API Error: ${JSON.stringify(apiError.response?.data)}`);
    }

    // Now test frontend login
    console.log('\n2️⃣ TESTING FRONTEND LOGIN');
    console.log('==========================');
    
    browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const page = await browser.newPage();

    // Monitor network requests
    const networkRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/auth/login')) {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
        console.log(`🌐 Login Request: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/auth/login')) {
        console.log(`🌐 Login Response: ${response.status()} ${response.url()}`);
      }
    });

    // Go to login page
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    
    console.log(`📍 Current URL: ${page.url()}`);

    // Fill login form
    console.log(`📧 Filling email: ${testUser.email}`);
    await page.fill('input[type="email"], input[name="email"]', testUser.email);
    
    console.log(`🔐 Filling password: ${testUser.password}`);
    await page.fill('input[type="password"], input[name="password"]', testUser.password);

    // Submit form
    console.log('🚀 Submitting login form...');
    await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    
    // Wait and observe
    await page.waitForTimeout(8000);
    
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);
    
    // Check for error messages
    const errorElements = await page.locator('.error, .alert-danger, [role="alert"]').count();
    if (errorElements > 0) {
      const errorText = await page.locator('.error, .alert-danger, [role="alert"]').first().textContent();
      console.log(`❌ Error message found: ${errorText}`);
    }
    
    // Check for success indicators
    const successElements = await page.locator('.success, .alert-success').count();
    if (successElements > 0) {
      const successText = await page.locator('.success, .alert-success').first().textContent();
      console.log(`✅ Success message found: ${successText}`);
    }
    
    // Check page content
    const pageTitle = await page.title();
    console.log(`📄 Page title: ${pageTitle}`);
    
    const bodyText = await page.textContent('body');
    const hasLoginText = bodyText.toLowerCase().includes('login');
    const hasDashboardText = bodyText.toLowerCase().includes('dashboard');
    const hasWelcomeText = bodyText.toLowerCase().includes('welcome');
    
    console.log(`🔍 Page analysis:`);
    console.log(`   - Contains "login": ${hasLoginText}`);
    console.log(`   - Contains "dashboard": ${hasDashboardText}`);
    console.log(`   - Contains "welcome": ${hasWelcomeText}`);
    console.log(`   - Network requests made: ${networkRequests.length}`);
    
    if (networkRequests.length > 0) {
      console.log(`📊 Login request data: ${networkRequests[0].postData}`);
    }

    // Check if we're still on login page
    if (finalUrl.includes('/login')) {
      console.log('❌ Still on login page - login failed or no redirect');
      
      // Check for specific error indicators
      const invalidCredentials = bodyText.toLowerCase().includes('invalid') || bodyText.toLowerCase().includes('incorrect');
      const accountLocked = bodyText.toLowerCase().includes('locked') || bodyText.toLowerCase().includes('disabled');
      const verificationNeeded = bodyText.toLowerCase().includes('verify') || bodyText.toLowerCase().includes('verification');
      
      console.log(`🔍 Error analysis:`);
      console.log(`   - Invalid credentials: ${invalidCredentials}`);
      console.log(`   - Account locked: ${accountLocked}`);
      console.log(`   - Verification needed: ${verificationNeeded}`);
      
    } else if (finalUrl.includes('/dashboard')) {
      console.log('✅ Successfully redirected to dashboard!');
    } else if (finalUrl.includes('/onboarding')) {
      console.log('✅ Successfully redirected to onboarding!');
    } else {
      console.log(`⚠️  Redirected to unexpected page: ${finalUrl}`);
    }

    console.log('\n🔍 Keeping browser open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error(`❌ Debug error: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  console.log('\n🎯 DEBUGGING COMPLETE');
  console.log('=====================');
}

// Run the debug
if (require.main === module) {
  debugLoginIssue().catch(console.error);
}

module.exports = { debugLoginIssue };
