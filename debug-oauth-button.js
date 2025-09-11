#!/usr/bin/env node

const { chromium } = require('playwright');

async function debugOAuthButton() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Debugging Google OAuth button...');
    
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'debug-login-page.png' });
    console.log('📸 Screenshot saved: debug-login-page.png');
    
    // Check for various button selectors
    const selectors = [
      'button:has-text("Continue with Google")',
      '[data-testid="google-oauth-button"]',
      'button:has-text("Google")',
      'a:has-text("Google")',
      '.google-signin',
      '[href*="oauth/google"]',
      'button[type="button"]'
    ];
    
    for (const selector of selectors) {
      const count = await page.locator(selector).count();
      console.log(`${selector}: ${count} elements found`);
      
      if (count > 0) {
        const elements = await page.locator(selector).all();
        for (let i = 0; i < elements.length; i++) {
          const text = await elements[i].textContent();
          const visible = await elements[i].isVisible();
          console.log(`  Element ${i + 1}: "${text}" (visible: ${visible})`);
        }
      }
    }
    
    // Check page content
    const pageContent = await page.content();
    const hasGoogleText = pageContent.includes('Google');
    const hasContinueText = pageContent.includes('Continue with');
    
    console.log(`Page contains "Google": ${hasGoogleText}`);
    console.log(`Page contains "Continue with": ${hasContinueText}`);
    
    // Wait for user to inspect
    console.log('🔍 Browser will stay open for 10 seconds for inspection...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

debugOAuthButton().catch(console.error);
