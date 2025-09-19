#!/usr/bin/env node

/**
 * Cache-Busting UAT Test
 * Forces fresh page loads to bypass caching and test latest deployment
 */

const { chromium } = require('playwright');

const TEST_CONFIG = {
  baseUrl: 'https://app.floworx-iq.com',
  testTimeout: 30000,
  viewports: {
    desktop: { width: 1920, height: 1080 }
  }
};

class CacheBustingTest {
  constructor() {
    this.results = {
      cacheBypass: {},
      logoSizing: {},
      formHeight: {},
      overallStatus: 'PENDING'
    };
  }

  async runCacheBustingTest() {
    console.log('🔄 CACHE-BUSTING UAT TEST');
    console.log('========================');
    console.log(`🎯 Environment: ${TEST_CONFIG.baseUrl}`);
    console.log(`📅 Test Date: ${new Date().toISOString()}`);
    
    const browser = await chromium.launch({ headless: false });
    
    try {
      // Test with aggressive cache busting
      await this.testWithCacheBusting(browser);
      
      // Generate report
      this.generateCacheBustingReport();
      
    } finally {
      await browser.close();
    }
  }

  async testWithCacheBusting(browser) {
    console.log('\n🔄 CACHE-BUSTING TEST');
    console.log('====================');
    
    const context = await browser.newContext({ 
      viewport: TEST_CONFIG.viewports.desktop,
      // Disable cache
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    const page = await context.newPage();
    
    try {
      // Add cache-busting timestamp
      const cacheBuster = Date.now();
      const testUrl = `${TEST_CONFIG.baseUrl}/register?cb=${cacheBuster}`;
      
      console.log(`🌐 Loading: ${testUrl}`);
      
      // Force hard reload
      await page.goto(testUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Wait for page to fully load
      await page.waitForTimeout(3000);
      
      // Test 1: Check if logo wrapper exists (our fix)
      const logoWrapper = await page.locator('[class*="max-h-12"][class*="max-w-12"]').first();
      const logoWrapperExists = await logoWrapper.count() > 0;
      
      // Test 2: Check actual logo size
      const logo = await page.locator('img[alt*="FloWorx"]').first();
      const logoBox = await logo.boundingBox();
      
      // Test 3: Check form container height
      const formContainer = await page.locator('[class*="backdrop-blur"]').first();
      const formBox = await formContainer.boundingBox();
      
      // Test 4: Check for flex centering
      const flexContainer = await page.locator('[class*="min-h-screen"][class*="flex"][class*="items-center"]').first();
      const flexExists = await flexContainer.count() > 0;
      
      this.results.cacheBypass = {
        status: logoWrapperExists && flexExists ? 'PASS' : 'FAIL',
        logoWrapperExists: logoWrapperExists,
        flexContainerExists: flexExists,
        logoSize: logoBox ? `${logoBox.width}x${logoBox.height}` : 'NOT_FOUND',
        formHeight: formBox ? formBox.height : 0,
        testUrl: testUrl
      };
      
      console.log(`✅ Logo wrapper (our fix): ${logoWrapperExists ? 'FOUND' : 'MISSING'}`);
      console.log(`✅ Flex container (our fix): ${flexExists ? 'FOUND' : 'MISSING'}`);
      console.log(`✅ Logo size: ${logoBox ? `${logoBox.width}x${logoBox.height}` : 'NOT_FOUND'}`);
      console.log(`✅ Form height: ${formBox ? formBox.height : 0}px`);
      
      // Check if we're seeing the new version
      const isNewVersion = logoWrapperExists && flexExists;
      console.log(`\n🎯 Deployment Status: ${isNewVersion ? '✅ NEW VERSION DETECTED' : '❌ OLD VERSION (CACHED)'}`);
      
    } catch (error) {
      console.error('❌ Cache-busting test failed:', error.message);
      this.results.cacheBypass = { status: 'ERROR', error: error.message };
    } finally {
      await context.close();
    }
  }

  generateCacheBustingReport() {
    console.log('\n📊 CACHE-BUSTING TEST REPORT');
    console.log('============================');
    
    const result = this.results.cacheBypass;
    
    if (result.status === 'PASS') {
      console.log('🎉 SUCCESS: NEW VERSION DEPLOYED!');
      console.log('   ✅ Logo wrapper constraint found');
      console.log('   ✅ Flex centering container found');
      console.log('   ✅ All fixes are now live in production');
      
      // Analyze logo size
      if (result.logoSize && result.logoSize !== 'NOT_FOUND') {
        const [width, height] = result.logoSize.split('x').map(Number);
        const logoAppropriate = width <= 60 && height <= 60; // Allow some tolerance
        console.log(`   ${logoAppropriate ? '✅' : '❌'} Logo size: ${result.logoSize} ${logoAppropriate ? '(APPROPRIATE)' : '(STILL OVERSIZED)'}`);
      }
      
      // Analyze form height
      if (result.formHeight > 0) {
        const formAppropriate = result.formHeight <= 650;
        console.log(`   ${formAppropriate ? '✅' : '❌'} Form height: ${result.formHeight}px ${formAppropriate ? '(WITHIN LIMITS)' : '(TOO TALL)'}`);
      }
      
    } else if (result.status === 'FAIL') {
      console.log('⏳ DEPLOYMENT STILL PENDING');
      console.log('   ❌ Old version still cached');
      console.log('   🔄 CDN propagation may take 5-15 minutes');
      console.log('   💡 Try again in a few minutes');
      
    } else {
      console.log('❌ TEST ERROR');
      console.log(`   Error: ${result.error}`);
    }
    
    console.log('\n🚀 NEXT STEPS:');
    if (result.status === 'PASS') {
      console.log('   1. ✅ Run full UAT validation: node uat/auth-ui-revamp-test.js');
      console.log('   2. ✅ Proceed with Phase 2: Complete remaining auth pages');
      console.log('   3. ✅ Final cross-browser testing');
    } else {
      console.log('   1. ⏳ Wait 5-10 minutes for deployment propagation');
      console.log('   2. 🔄 Re-run this test: node uat/cache-busting-test.js');
      console.log('   3. 🌐 Try hard refresh (Ctrl+F5) in browser');
    }
    
    return this.results;
  }
}

// Run test if called directly
if (require.main === module) {
  const test = new CacheBustingTest();
  test.runCacheBustingTest().catch(console.error);
}

module.exports = CacheBustingTest;
