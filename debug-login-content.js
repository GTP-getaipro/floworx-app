#!/usr/bin/env node

const { chromium } = require('playwright');

async function debugLoginContent() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Debugging login page content...');
    
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'debug-login-full.png', fullPage: true });
    console.log('📸 Full page screenshot saved: debug-login-full.png');
    
    // Get all buttons
    const buttons = await page.locator('button').all();
    console.log(`\n🔘 Found ${buttons.length} buttons:`);
    
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const text = await button.textContent();
      const visible = await button.isVisible();
      const classes = await button.getAttribute('class');
      const testId = await button.getAttribute('data-testid');
      
      console.log(`  Button ${i + 1}:`);
      console.log(`    Text: "${text}"`);
      console.log(`    Visible: ${visible}`);
      console.log(`    Classes: ${classes}`);
      console.log(`    Test ID: ${testId}`);
      console.log('');
    }
    
    // Check for any elements containing "Google" or "OAuth"
    const googleElements = await page.locator('*:has-text("Google")').all();
    console.log(`\n🔍 Elements containing "Google": ${googleElements.length}`);
    
    const oauthElements = await page.locator('*:has-text("OAuth")').all();
    console.log(`🔍 Elements containing "OAuth": ${oauthElements.length}`);
    
    // Check page HTML content
    const pageContent = await page.content();
    const hasGoogleInHTML = pageContent.includes('Google');
    const hasContinueInHTML = pageContent.includes('Continue with');
    
    console.log(`\n📄 Page HTML analysis:`);
    console.log(`  Contains "Google": ${hasGoogleInHTML}`);
    console.log(`  Contains "Continue with": ${hasContinueInHTML}`);
    
    // Check for any React errors in console
    const logs = await page.evaluate(() => {
      return window.console.logs || [];
    });
    
    console.log(`\n🚨 Console logs: ${logs.length}`);
    
    // Wait for user inspection
    console.log('\n🔍 Browser will stay open for 15 seconds for inspection...');
    await page.waitForTimeout(15000);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

debugLoginContent().catch(console.error);
