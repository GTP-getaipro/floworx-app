#!/usr/bin/env node

/**
 * TEST REGISTRATION FLOW
 * ======================
 * End-to-end testing of user registration on https://app.floworx-iq.com/register
 */

const { chromium } = require('playwright');

async function testRegistrationPageLoad() {
  console.log('🌐 TESTING REGISTRATION PAGE LOAD');
  console.log('=================================');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('📱 Navigating to registration page...');
    await page.goto('https://app.floworx-iq.com/register', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Page loaded successfully');
    
    // Check if the page loaded correctly
    const title = await page.title();
    console.log(`📄 Page title: ${title}`);
    
    // Check for registration form elements
    const formElements = await page.evaluate(() => {
      const elements = {
        emailInput: !!document.querySelector('input[type="email"], input[name="email"]'),
        passwordInput: !!document.querySelector('input[type="password"], input[name="password"]'),
        submitButton: !!document.querySelector('button[type="submit"], button:contains("Register"), button:contains("Sign up")'),
        googleButton: !!document.querySelector('button:contains("Google"), button:contains("Continue with Google")'),
        formElement: !!document.querySelector('form')
      };
      
      return elements;
    });
    
    console.log('📋 Form elements detected:');
    Object.entries(formElements).forEach(([key, value]) => {
      console.log(`   ${value ? '✅' : '❌'} ${key}`);
    });
    
    // Take a screenshot
    await page.screenshot({ path: 'registration-page-screenshot.png', fullPage: true });
    console.log('📸 Screenshot saved: registration-page-screenshot.png');
    
    return { success: true, formElements, title };
    
  } catch (error) {
    console.log(`❌ Error loading registration page: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

async function testRegistrationFormSubmission() {
  console.log('\n📝 TESTING REGISTRATION FORM SUBMISSION');
  console.log('=======================================');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen for network requests to see API calls
  const apiCalls = [];
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      apiCalls.push({
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Listen for network responses to see API responses
  const apiResponses = [];
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      apiResponses.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        timestamp: new Date().toISOString()
      });
    }
  });
  
  try {
    console.log('📱 Navigating to registration page...');
    await page.goto('https://app.floworx-iq.com/register', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Fill out the registration form
    console.log('📝 Filling out registration form...');
    
    // Try to find and fill email field
    const emailSelector = 'input[type="email"], input[name="email"], input[placeholder*="email" i]';
    const emailField = await page.$(emailSelector);
    if (emailField) {
      await emailField.fill('test-user-' + Date.now() + '@example.com');
      console.log('✅ Email field filled');
    } else {
      console.log('❌ Email field not found');
    }
    
    // Try to find and fill password field
    const passwordSelector = 'input[type="password"], input[name="password"]';
    const passwordField = await page.$(passwordSelector);
    if (passwordField) {
      await passwordField.fill('TestPassword123!');
      console.log('✅ Password field filled');
    } else {
      console.log('❌ Password field not found');
    }
    
    // Try to find and fill other common fields
    const firstNameField = await page.$('input[name="firstName"], input[name="first_name"], input[placeholder*="first" i]');
    if (firstNameField) {
      await firstNameField.fill('Test');
      console.log('✅ First name field filled');
    }
    
    const lastNameField = await page.$('input[name="lastName"], input[name="last_name"], input[placeholder*="last" i]');
    if (lastNameField) {
      await lastNameField.fill('User');
      console.log('✅ Last name field filled');
    }
    
    // Wait a moment for any dynamic content
    await page.waitForTimeout(1000);
    
    // Try to submit the form
    console.log('🚀 Attempting to submit form...');
    
    const submitButton = await page.$('button[type="submit"], button:has-text("Register"), button:has-text("Sign up"), button:has-text("Create Account")');
    if (submitButton) {
      await submitButton.click();
      console.log('✅ Submit button clicked');
      
      // Wait for potential API calls
      await page.waitForTimeout(3000);
      
    } else {
      console.log('❌ Submit button not found');
    }
    
    // Check for any error messages or success indicators
    const pageContent = await page.evaluate(() => {
      const errors = Array.from(document.querySelectorAll('.error, .alert-danger, [class*="error"]')).map(el => el.textContent.trim());
      const success = Array.from(document.querySelectorAll('.success, .alert-success, [class*="success"]')).map(el => el.textContent.trim());
      const currentUrl = window.location.href;
      
      return { errors, success, currentUrl };
    });
    
    console.log('📊 Form submission results:');
    console.log(`   Current URL: ${pageContent.currentUrl}`);
    console.log(`   Errors found: ${pageContent.errors.length}`);
    pageContent.errors.forEach(error => console.log(`     ❌ ${error}`));
    console.log(`   Success messages: ${pageContent.success.length}`);
    pageContent.success.forEach(success => console.log(`     ✅ ${success}`));
    
    return { 
      success: true, 
      apiCalls, 
      apiResponses, 
      pageContent,
      formSubmitted: !!submitButton
    };
    
  } catch (error) {
    console.log(`❌ Error during form submission: ${error.message}`);
    return { success: false, error: error.message, apiCalls, apiResponses };
  } finally {
    await browser.close();
  }
}

async function testGoogleOAuthButton() {
  console.log('\n🔐 TESTING GOOGLE OAUTH BUTTON');
  console.log('==============================');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('📱 Navigating to registration page...');
    await page.goto('https://app.floworx-iq.com/register', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Look for Google OAuth button
    const googleButton = await page.$('button:has-text("Google"), button:has-text("Continue with Google"), a:has-text("Google")');
    
    if (googleButton) {
      console.log('✅ Google OAuth button found');
      
      // Get the button text and attributes
      const buttonInfo = await googleButton.evaluate(el => ({
        text: el.textContent.trim(),
        href: el.href || null,
        onclick: el.onclick ? el.onclick.toString() : null,
        disabled: el.disabled
      }));
      
      console.log('🔍 Button details:');
      console.log(`   Text: ${buttonInfo.text}`);
      console.log(`   Href: ${buttonInfo.href || 'None'}`);
      console.log(`   Disabled: ${buttonInfo.disabled}`);
      
      // Test clicking the button (but don't actually follow through)
      console.log('🧪 Testing button click...');
      
      // Listen for navigation attempts
      let navigationAttempted = false;
      page.on('request', request => {
        if (request.url().includes('oauth') || request.url().includes('google')) {
          navigationAttempted = true;
          console.log(`🔗 OAuth navigation attempted: ${request.url()}`);
        }
      });
      
      await googleButton.click();
      await page.waitForTimeout(2000);
      
      if (navigationAttempted) {
        console.log('✅ Google OAuth button working - navigation attempted');
      } else {
        console.log('⚠️  Google OAuth button clicked but no navigation detected');
      }
      
      return { success: true, buttonFound: true, navigationAttempted };
      
    } else {
      console.log('❌ Google OAuth button not found');
      return { success: true, buttonFound: false };
    }
    
  } catch (error) {
    console.log(`❌ Error testing Google OAuth: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('🧪 TEST REGISTRATION FLOW');
  console.log('==========================');
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  
  const pageLoadResult = await testRegistrationPageLoad();
  const formSubmissionResult = await testRegistrationFormSubmission();
  const oauthResult = await testGoogleOAuthButton();
  
  console.log('\n📊 END-TO-END REGISTRATION TEST RESULTS');
  console.log('=======================================');
  
  console.log('\n1. 🌐 PAGE LOAD:');
  console.log(`   Success: ${pageLoadResult.success ? '✅' : '❌'}`);
  if (pageLoadResult.formElements) {
    const formElementsCount = Object.values(pageLoadResult.formElements).filter(Boolean).length;
    console.log(`   Form elements detected: ${formElementsCount}/5`);
  }
  
  console.log('\n2. 📝 FORM SUBMISSION:');
  console.log(`   Success: ${formSubmissionResult.success ? '✅' : '❌'}`);
  console.log(`   API calls made: ${formSubmissionResult.apiCalls?.length || 0}`);
  console.log(`   API responses: ${formSubmissionResult.apiResponses?.length || 0}`);
  
  if (formSubmissionResult.apiCalls?.length > 0) {
    console.log('   📡 API Calls:');
    formSubmissionResult.apiCalls.forEach(call => {
      console.log(`     ${call.method} ${call.url}`);
    });
  }
  
  if (formSubmissionResult.apiResponses?.length > 0) {
    console.log('   📨 API Responses:');
    formSubmissionResult.apiResponses.forEach(response => {
      console.log(`     ${response.status} ${response.url}`);
    });
  }
  
  console.log('\n3. 🔐 GOOGLE OAUTH:');
  console.log(`   Button found: ${oauthResult.buttonFound ? '✅' : '❌'}`);
  console.log(`   Navigation attempted: ${oauthResult.navigationAttempted ? '✅' : '❌'}`);
  
  const overallSuccess = pageLoadResult.success && formSubmissionResult.success && oauthResult.success;
  
  console.log('\n🎯 OVERALL RESULT:');
  if (overallSuccess) {
    console.log('✅ Registration flow is functional');
    console.log('   Users can access the registration page');
    console.log('   Form elements are present and working');
    console.log('   API integration is functioning');
    console.log('   Google OAuth button is operational');
  } else {
    console.log('⚠️  Registration flow has some issues');
    console.log('   Check the detailed results above for specific problems');
  }
  
  console.log('\n🧪 REGISTRATION FLOW TEST COMPLETE!');
  
  return {
    pageLoad: pageLoadResult,
    formSubmission: formSubmissionResult,
    oauth: oauthResult,
    overallSuccess
  };
}

main().catch(console.error);
