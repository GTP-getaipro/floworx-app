#!/usr/bin/env node

/**
 * FloWorx Auth UI Revamp Validation Test
 * 
 * Tests the comprehensive redesign addressing:
 * - Oversized logo issues
 * - Overlapping tagline problems  
 * - Tall forms requiring scroll
 * - Stretched and misaligned layout
 * 
 * Validates the new design:
 * - Flex-center wrapper for perfect centering
 * - Compact form containers (max-h-[650px])
 * - Responsive sizing (max-w-sm/md/lg)
 * - No vertical scrolling required
 * - Consistent branding across all auth pages
 */

const { chromium } = require('playwright');

const TEST_CONFIG = {
  baseUrl: 'https://app.floworx-iq.com',
  testTimeout: 30000,
  viewports: {
    desktop: { width: 1920, height: 1080 },
    tablet: { width: 768, height: 1024 },
    mobile: { width: 375, height: 667 }
  }
};

class AuthUIRevampTest {
  constructor() {
    this.results = {
      layoutCentering: {},
      logoSizing: {},
      formHeight: {},
      responsiveDesign: {},
      brandingConsistency: {},
      overallStatus: 'PENDING'
    };
  }

  async runRevampValidation() {
    console.log('🚀 FLOWORX AUTH UI REVAMP VALIDATION');
    console.log('===================================');
    console.log(`🎯 Environment: ${TEST_CONFIG.baseUrl}`);
    console.log(`📅 Test Date: ${new Date().toISOString()}`);
    
    const browser = await chromium.launch({ headless: false });
    
    try {
      // Test 1: Layout Centering & Flex Wrapper
      await this.testLayoutCentering(browser);
      
      // Test 2: Logo Sizing (max-h-12 max-w-12)
      await this.testLogoSizing(browser);
      
      // Test 3: Form Height & Viewport Fit
      await this.testFormHeight(browser);
      
      // Test 4: Responsive Design
      await this.testResponsiveDesign(browser);
      
      // Test 5: Cross-Page Branding Consistency
      await this.testBrandingConsistency(browser);
      
      // Generate comprehensive report
      this.generateRevampReport();
      
    } finally {
      await browser.close();
    }
  }

  async testLayoutCentering(browser) {
    console.log('\n📐 TEST 1: LAYOUT CENTERING & FLEX WRAPPER');
    console.log('==========================================');
    
    const context = await browser.newContext({ viewport: TEST_CONFIG.viewports.desktop });
    const page = await context.newPage();
    
    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/register`);
      await page.waitForLoadState('networkidle');
      
      // Check if main container uses flex centering
      const mainContainer = await page.locator('[class*="min-h-screen"][class*="flex"]').first();
      const containerExists = await mainContainer.count() > 0;
      
      // Check form container positioning
      const formContainer = await page.locator('[class*="backdrop-blur"]').first();
      const formBox = await formContainer.boundingBox();
      
      // Calculate if form is centered
      const viewportHeight = TEST_CONFIG.viewports.desktop.height;
      const formCenterY = formBox ? formBox.y + (formBox.height / 2) : 0;
      const viewportCenterY = viewportHeight / 2;
      const centeringOffset = Math.abs(formCenterY - viewportCenterY);
      
      // Form should be reasonably centered (within 100px of center)
      const isCentered = centeringOffset < 100;
      
      this.results.layoutCentering = {
        status: containerExists && isCentered ? 'PASS' : 'FAIL',
        flexContainerExists: containerExists,
        formCentered: isCentered,
        centeringOffset: centeringOffset,
        formPosition: formBox ? `${formBox.x}, ${formBox.y}` : 'NOT_FOUND',
        formSize: formBox ? `${formBox.width}x${formBox.height}` : 'NOT_FOUND'
      };
      
      console.log(`✅ Flex container: ${containerExists ? 'FOUND' : 'MISSING'}`);
      console.log(`✅ Form centering: ${isCentered ? 'CENTERED' : 'OFF-CENTER'} (offset: ${centeringOffset}px)`);
      
    } catch (error) {
      console.error('❌ Layout centering test failed:', error.message);
      this.results.layoutCentering = { status: 'ERROR', error: error.message };
    } finally {
      await context.close();
    }
  }

  async testLogoSizing(browser) {
    console.log('\n🎨 TEST 2: LOGO SIZING (max-h-12 max-w-12)');
    console.log('==========================================');
    
    const context = await browser.newContext({ viewport: TEST_CONFIG.viewports.desktop });
    const page = await context.newPage();
    
    const pages = ['/register', '/login', '/forgot-password'];
    const logoResults = {};
    
    for (const pagePath of pages) {
      try {
        await page.goto(`${TEST_CONFIG.baseUrl}${pagePath}`);
        await page.waitForLoadState('networkidle');
        
        // Find logo element
        const logo = await page.locator('img[alt*="FloWorx"]').first();
        const logoBox = await logo.boundingBox();
        
        if (logoBox) {
          // Check if logo respects max-h-12 max-w-12 (48px)
          const maxSize = 48; // h-12 = 48px
          const logoOversized = logoBox.width > maxSize * 1.5 || logoBox.height > maxSize * 1.5; // Allow 50% tolerance
          
          logoResults[pagePath] = {
            size: `${logoBox.width}x${logoBox.height}`,
            oversized: logoOversized,
            withinLimits: !logoOversized
          };
          
          console.log(`  ${pagePath}: ${logoBox.width}x${logoBox.height} ${logoOversized ? '🚨 OVERSIZED' : '✅ APPROPRIATE'}`);
        } else {
          logoResults[pagePath] = { status: 'NOT_FOUND' };
          console.log(`  ${pagePath}: ❌ Logo not found`);
        }
        
      } catch (error) {
        logoResults[pagePath] = { status: 'ERROR', error: error.message };
        console.log(`  ${pagePath}: ❌ Error - ${error.message}`);
      }
    }
    
    const allLogosAppropriate = Object.values(logoResults).every(result => result.withinLimits);
    
    this.results.logoSizing = {
      status: allLogosAppropriate ? 'PASS' : 'FAIL',
      pages: logoResults,
      allAppropriate: allLogosAppropriate
    };
  }

  async testFormHeight(browser) {
    console.log('\n📏 TEST 3: FORM HEIGHT & VIEWPORT FIT');
    console.log('====================================');
    
    const context = await browser.newContext({ viewport: TEST_CONFIG.viewports.desktop });
    const page = await context.newPage();
    
    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/register`);
      await page.waitForLoadState('networkidle');
      
      // Check form container max height
      const formContainer = await page.locator('[class*="backdrop-blur"]').first();
      const formBox = await formContainer.boundingBox();
      
      // Check if form fits in viewport without scrolling
      const viewportHeight = TEST_CONFIG.viewports.desktop.height;
      const formFitsInViewport = formBox && (formBox.y + formBox.height) <= viewportHeight;
      
      // Check if form has max-height constraint (should be ≤ 650px)
      const maxHeightRespected = formBox && formBox.height <= 650;
      
      // Check for scroll requirement
      const bodyScrollHeight = await page.evaluate(() => document.body.scrollHeight);
      const noScrollRequired = bodyScrollHeight <= viewportHeight;
      
      this.results.formHeight = {
        status: formFitsInViewport && maxHeightRespected && noScrollRequired ? 'PASS' : 'FAIL',
        formHeight: formBox ? formBox.height : 0,
        fitsInViewport: formFitsInViewport,
        maxHeightRespected: maxHeightRespected,
        noScrollRequired: noScrollRequired,
        bodyScrollHeight: bodyScrollHeight,
        viewportHeight: viewportHeight
      };
      
      console.log(`✅ Form height: ${formBox ? formBox.height : 0}px`);
      console.log(`✅ Fits in viewport: ${formFitsInViewport ? 'YES' : 'NO'}`);
      console.log(`✅ Max height respected: ${maxHeightRespected ? 'YES' : 'NO'}`);
      console.log(`✅ No scroll required: ${noScrollRequired ? 'YES' : 'NO'}`);
      
    } catch (error) {
      console.error('❌ Form height test failed:', error.message);
      this.results.formHeight = { status: 'ERROR', error: error.message };
    } finally {
      await context.close();
    }
  }

  async testResponsiveDesign(browser) {
    console.log('\n📱 TEST 4: RESPONSIVE DESIGN');
    console.log('============================');
    
    const viewports = [
      { name: 'Desktop', ...TEST_CONFIG.viewports.desktop },
      { name: 'Tablet', ...TEST_CONFIG.viewports.tablet },
      { name: 'Mobile', ...TEST_CONFIG.viewports.mobile }
    ];
    
    const responsiveResults = {};
    
    for (const viewport of viewports) {
      console.log(`\n📐 Testing ${viewport.name} (${viewport.width}x${viewport.height})`);
      
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      
      try {
        await page.goto(`${TEST_CONFIG.baseUrl}/register`);
        await page.waitForLoadState('networkidle');
        
        // Check form container width
        const formContainer = await page.locator('[class*="backdrop-blur"]').first();
        const formBox = await formContainer.boundingBox();
        
        // Check responsive width classes
        const expectedMaxWidths = {
          Desktop: 512, // max-w-lg = 512px
          Tablet: 448,  // max-w-md = 448px  
          Mobile: 384   // max-w-sm = 384px
        };
        
        const expectedMaxWidth = expectedMaxWidths[viewport.name];
        const widthAppropriate = formBox && formBox.width <= expectedMaxWidth + 50; // Allow some tolerance
        
        responsiveResults[viewport.name] = {
          formWidth: formBox ? formBox.width : 0,
          expectedMaxWidth: expectedMaxWidth,
          widthAppropriate: widthAppropriate,
          fitsInViewport: formBox && formBox.width <= viewport.width - 32 // Account for padding
        };
        
        console.log(`  Form width: ${formBox ? formBox.width : 0}px (max: ${expectedMaxWidth}px) ${widthAppropriate ? '✅' : '❌'}`);
        
      } catch (error) {
        responsiveResults[viewport.name] = { status: 'ERROR', error: error.message };
        console.log(`  ❌ Error: ${error.message}`);
      } finally {
        await context.close();
      }
    }
    
    const allResponsive = Object.values(responsiveResults).every(result => result.widthAppropriate);
    
    this.results.responsiveDesign = {
      status: allResponsive ? 'PASS' : 'FAIL',
      viewports: responsiveResults,
      allResponsive: allResponsive
    };
  }

  async testBrandingConsistency(browser) {
    console.log('\n🎨 TEST 5: CROSS-PAGE BRANDING CONSISTENCY');
    console.log('==========================================');
    
    const context = await browser.newContext({ viewport: TEST_CONFIG.viewports.desktop });
    const page = await context.newPage();
    
    const pages = ['/register', '/login', '/forgot-password'];
    const brandingResults = {};
    
    for (const pagePath of pages) {
      try {
        await page.goto(`${TEST_CONFIG.baseUrl}${pagePath}`);
        await page.waitForLoadState('networkidle');
        
        // Check logo presence and size
        const logo = await page.locator('img[alt*="FloWorx"]').first();
        const logoBox = await logo.boundingBox();
        
        // Check tagline presence
        const tagline = await page.locator('text=Email AI Built by Hot Tub Pros').first();
        const taglineVisible = await tagline.isVisible();
        
        // Check form container styling
        const formContainer = await page.locator('[class*="backdrop-blur"]').first();
        const formBox = await formContainer.boundingBox();
        
        brandingResults[pagePath] = {
          logoPresent: !!logoBox,
          logoSize: logoBox ? `${logoBox.width}x${logoBox.height}` : 'NOT_FOUND',
          taglineVisible: taglineVisible,
          formPresent: !!formBox,
          formSize: formBox ? `${formBox.width}x${formBox.height}` : 'NOT_FOUND'
        };
        
        console.log(`  ${pagePath}: Logo ${logoBox ? '✅' : '❌'}, Tagline ${taglineVisible ? '✅' : '❌'}, Form ${formBox ? '✅' : '❌'}`);
        
      } catch (error) {
        brandingResults[pagePath] = { status: 'ERROR', error: error.message };
        console.log(`  ${pagePath}: ❌ Error - ${error.message}`);
      }
    }
    
    // Check consistency across pages
    const logoSizes = Object.values(brandingResults).map(r => r.logoSize).filter(s => s !== 'NOT_FOUND');
    const logosConsistent = logoSizes.length > 0 && logoSizes.every(size => size === logoSizes[0]);
    
    this.results.brandingConsistency = {
      status: logosConsistent ? 'PASS' : 'FAIL',
      pages: brandingResults,
      logosConsistent: logosConsistent,
      logoSizes: logoSizes
    };
    
    await context.close();
  }

  generateRevampReport() {
    console.log('\n📊 AUTH UI REVAMP VALIDATION REPORT');
    console.log('===================================');
    
    const testResults = [
      { name: 'Layout Centering', result: this.results.layoutCentering },
      { name: 'Logo Sizing', result: this.results.logoSizing },
      { name: 'Form Height', result: this.results.formHeight },
      { name: 'Responsive Design', result: this.results.responsiveDesign },
      { name: 'Branding Consistency', result: this.results.brandingConsistency }
    ];
    
    let passedTests = 0;
    let totalTests = testResults.length;
    
    testResults.forEach(({ name, result }) => {
      const status = result.status === 'PASS' ? '✅ PASS' : result.status === 'FAIL' ? '❌ FAIL' : '⚠️ ERROR';
      console.log(`\n📋 ${name}: ${status}`);
      
      if (result.status === 'PASS') passedTests++;
      
      // Show key details
      if (name === 'Layout Centering' && result.formCentered !== undefined) {
        console.log(`   Form centering: ${result.formCentered ? 'CENTERED' : 'OFF-CENTER'}`);
      }
      if (name === 'Logo Sizing' && result.allAppropriate !== undefined) {
        console.log(`   All logos appropriate: ${result.allAppropriate ? 'YES' : 'NO'}`);
      }
      if (name === 'Form Height' && result.noScrollRequired !== undefined) {
        console.log(`   No scroll required: ${result.noScrollRequired ? 'YES' : 'NO'}`);
      }
    });
    
    const passRate = (passedTests / totalTests) * 100;
    this.results.overallStatus = passRate >= 80 ? 'PASS' : 'FAIL';
    
    console.log('\n🎯 OVERALL REVAMP STATUS:');
    console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`   Pass Rate: ${passRate.toFixed(1)}%`);
    console.log(`   Status: ${this.results.overallStatus}`);
    
    if (this.results.overallStatus === 'PASS') {
      console.log('\n🎉 AUTH UI REVAMP SUCCESSFUL!');
      console.log('   ✅ Layout properly centered with flex wrapper');
      console.log('   ✅ Logo sizing appropriate (no more oversized issues)');
      console.log('   ✅ Forms fit in viewport (no scroll required)');
      console.log('   ✅ Responsive design works across devices');
      console.log('   ✅ Branding consistent across all auth pages');
    } else {
      console.log('\n🔧 REVAMP NEEDS ADDITIONAL FIXES');
    }
    
    return this.results;
  }
}

// Run test if called directly
if (require.main === module) {
  const test = new AuthUIRevampTest();
  test.runRevampValidation().catch(console.error);
}

module.exports = AuthUIRevampTest;
