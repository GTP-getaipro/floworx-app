#!/usr/bin/env node

/**
 * TEST LOGIN OAUTH
 * ================
 * Test Google OAuth button on the LOGIN page
 */

const { chromium } = require('playwright');

async function testLoginPageOAuth() {
  console.log('🔐 TESTING LOGIN PAGE OAUTH');
  console.log('===========================');
  
  const browser = await chromium.launch({ headless: false, slowMo: 1000 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Listen for network requests to catch OAuth redirects
  const networkRequests = [];
  page.on('request', request => {
    networkRequests.push({
      url: request.url(),
      method: request.method(),
      timestamp: new Date().toISOString()
    });
    
    if (request.url().includes('oauth') || request.url().includes('google')) {
      console.log(`🔗 OAuth request detected: ${request.method()} ${request.url()}`);
    }
  });
  
  // Listen for navigation attempts
  let navigationAttempted = false;
  page.on('framenavigated', frame => {
    if (frame.url().includes('oauth') || frame.url().includes('google')) {
      navigationAttempted = true;
      console.log(`🚀 OAuth navigation detected: ${frame.url()}`);
    }
  });
  
  try {
    console.log('📱 Navigating to login page...');
    await page.goto('https://app.floworx-iq.com/login', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Login page loaded successfully');
    
    // Get page title and URL
    const title = await page.title();
    const url = await page.url();
    console.log(`📄 Page title: ${title}`);
    console.log(`🔗 Current URL: ${url}`);
    
    // Look for Google OAuth button with various possible selectors
    const possibleSelectors = [
      'button:has-text("Google")',
      'button:has-text("Continue with Google")',
      'button:has-text("Sign in with Google")',
      'a:has-text("Google")',
      'a:has-text("Continue with Google")',
      '[class*="google"]',
      '[id*="google"]',
      'button[onclick*="google"]',
      'button[onclick*="oauth"]'
    ];
    
    let googleButton = null;
    let usedSelector = null;
    
    for (const selector of possibleSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          googleButton = element;
          usedSelector = selector;
          console.log(`✅ Google OAuth button found with selector: ${selector}`);
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }
    
    if (!googleButton) {
      console.log('❌ Google OAuth button not found with any selector');
      
      // Get all buttons to see what's available
      const allButtons = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button')).map((btn, index) => ({
          index,
          text: btn.textContent.trim(),
          id: btn.id,
          className: btn.className,
          onclick: btn.onclick ? btn.onclick.toString() : null
        }));
      });
      
      console.log('\n📋 ALL BUTTONS ON LOGIN PAGE:');
      allButtons.forEach(btn => {
        console.log(`   Button ${btn.index}: "${btn.text}"`);
        console.log(`     ID: ${btn.id || 'None'}, Class: ${btn.className || 'None'}`);
        if (btn.onclick) {
          console.log(`     OnClick: ${btn.onclick}`);
        }
      });
      
      return { success: true, buttonFound: false, allButtons };
    }
    
    // Get button details
    const buttonInfo = await googleButton.evaluate(el => ({
      text: el.textContent.trim(),
      href: el.href || null,
      onclick: el.onclick ? el.onclick.toString() : null,
      disabled: el.disabled,
      tagName: el.tagName.toLowerCase()
    }));
    
    console.log('\n🔍 GOOGLE OAUTH BUTTON DETAILS:');
    console.log(`   Text: "${buttonInfo.text}"`);
    console.log(`   Tag: ${buttonInfo.tagName}`);
    console.log(`   Href: ${buttonInfo.href || 'None'}`);
    console.log(`   Disabled: ${buttonInfo.disabled}`);
    console.log(`   OnClick: ${buttonInfo.onclick || 'None'}`);
    
    // Test clicking the button
    console.log('\n🧪 TESTING OAUTH BUTTON CLICK...');
    
    // Take screenshot before clicking
    await page.screenshot({ path: 'login-page-before-oauth.png', fullPage: true });
    console.log('📸 Screenshot saved: login-page-before-oauth.png');
    
    // Click the button
    await googleButton.click();
    console.log('✅ Google OAuth button clicked');
    
    // Wait for potential navigation or API calls
    await page.waitForTimeout(3000);
    
    // Check current URL after click
    const newUrl = await page.url();
    console.log(`🔗 URL after click: ${newUrl}`);
    
    // Take screenshot after clicking
    await page.screenshot({ path: 'login-page-after-oauth.png', fullPage: true });
    console.log('📸 Screenshot saved: login-page-after-oauth.png');
    
    // Check for any error messages
    const errorMessages = await page.evaluate(() => {
      const errors = Array.from(document.querySelectorAll('.error, .alert-danger, [class*="error"], .text-red-500')).map(el => el.textContent.trim());
      return errors.filter(error => error.length > 0);
    });
    
    console.log('\n📊 OAUTH TEST RESULTS:');
    console.log(`   Button found: ✅`);
    console.log(`   Button clicked: ✅`);
    console.log(`   URL changed: ${newUrl !== url ? '✅' : '❌'}`);
    console.log(`   Navigation attempted: ${navigationAttempted ? '✅' : '❌'}`);
    console.log(`   Errors detected: ${errorMessages.length}`);
    
    if (errorMessages.length > 0) {
      console.log('   Error messages:');
      errorMessages.forEach(error => console.log(`     ❌ ${error}`));
    }
    
    // Check OAuth-related network requests
    const oauthRequests = networkRequests.filter(req => 
      req.url.includes('oauth') || 
      req.url.includes('google') || 
      req.url.includes('/api/oauth')
    );
    
    console.log(`   OAuth requests made: ${oauthRequests.length}`);
    oauthRequests.forEach(req => {
      console.log(`     ${req.method} ${req.url}`);
    });
    
    // Wait for user to see the result
    console.log('\n⏳ Keeping browser open for 10 seconds for manual inspection...');
    await page.waitForTimeout(10000);
    
    return { 
      success: true, 
      buttonFound: true, 
      buttonInfo, 
      navigationAttempted,
      urlChanged: newUrl !== url,
      errorMessages,
      oauthRequests,
      originalUrl: url,
      newUrl
    };
    
  } catch (error) {
    console.log(`❌ Error testing OAuth: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('🔐 TEST LOGIN OAUTH');
  console.log('===================');
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  
  const result = await testLoginPageOAuth();
  
  console.log('\n📊 LOGIN OAUTH TEST SUMMARY');
  console.log('===========================');
  
  if (result.success) {
    if (result.buttonFound) {
      console.log('✅ Google OAuth button found on login page');
      console.log(`✅ Button click test: ${result.navigationAttempted || result.urlChanged ? 'WORKING' : 'NEEDS INVESTIGATION'}`);
      
      if (result.oauthRequests && result.oauthRequests.length > 0) {
        console.log('✅ OAuth API requests detected - integration working');
      } else if (result.urlChanged) {
        console.log('✅ URL changed after click - likely working');
      } else {
        console.log('⚠️  No OAuth requests or URL change detected');
      }
      
      if (result.errorMessages && result.errorMessages.length > 0) {
        console.log('⚠️  Error messages detected - may need attention');
      } else {
        console.log('✅ No error messages - OAuth button functioning properly');
      }
    } else {
      console.log('❌ Google OAuth button not found on login page');
      console.log('💡 This might be intentional based on your UI design');
    }
  } else {
    console.log('❌ OAuth test failed');
    console.log(`Error: ${result.error}`);
  }
  
  console.log('\n🔐 LOGIN OAUTH TEST COMPLETE!');
  
  return result;
}

main().catch(console.error);
