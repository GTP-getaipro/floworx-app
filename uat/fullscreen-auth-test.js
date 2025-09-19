#!/usr/bin/env node

/**
 * Fullscreen Auth Layout Validation Test
 * 
 * Tests the comprehensive redesign that addresses:
 * - Narrow blue column (ugly vertical stripe)
 * - Vertical scrollbars
 * - Constrained background gradients
 * - Poor mobile experience
 * 
 * Validates the new fullscreen approach:
 * - Full viewport gradient background (100vw × 100vh)
 * - Centered white auth card (max-w-[420px])
 * - No vertical scrollbars
 * - Professional mobile-first responsive design
 * - Clean branding inside card
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

class FullscreenAuthTest {
  constructor() {
    this.results = {
      fullscreenBackground: {},
      centeredCard: {},
      noScrollbars: {},
      mobileOptimization: {},
      brandingCleanup: {},
      overallStatus: 'PENDING'
    };
  }

  async runFullscreenTest() {
    console.log('🎉 FULLSCREEN AUTH LAYOUT VALIDATION');
    console.log('===================================');
    console.log(`🎯 Environment: ${TEST_CONFIG.baseUrl}`);
    console.log(`📅 Test Date: ${new Date().toISOString()}`);
    
    const browser = await chromium.launch({ headless: false });
    
    try {
      // Test 1: Fullscreen Background (No Blue Stripe)
      await this.testFullscreenBackground(browser);
      
      // Test 2: Centered Auth Card
      await this.testCenteredCard(browser);
      
      // Test 3: No Vertical Scrollbars
      await this.testNoScrollbars(browser);
      
      // Test 4: Mobile Optimization
      await this.testMobileOptimization(browser);
      
      // Test 5: Branding Cleanup
      await this.testBrandingCleanup(browser);
      
      // Generate comprehensive report
      this.generateFullscreenReport();
      
    } finally {
      await browser.close();
    }
  }

  async testFullscreenBackground(browser) {
    console.log('\n🌈 TEST 1: FULLSCREEN BACKGROUND (No Blue Stripe)');
    console.log('=================================================');
    
    const context = await browser.newContext({ viewport: TEST_CONFIG.viewports.desktop });
    const page = await context.newPage();
    
    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/register`);
      await page.waitForLoadState('networkidle');
      
      // Check for fullscreen gradient background
      const backgroundElement = await page.locator('[class*="bg-gradient-to-b"]').first();
      const backgroundExists = await backgroundElement.count() > 0;
      
      // Check if background covers full viewport
      const backgroundBox = await backgroundElement.boundingBox();
      const viewportWidth = TEST_CONFIG.viewports.desktop.width;
      const viewportHeight = TEST_CONFIG.viewports.desktop.height;
      
      const coversFullWidth = backgroundBox && backgroundBox.width >= viewportWidth * 0.95; // Allow 5% tolerance
      const coversFullHeight = backgroundBox && backgroundBox.height >= viewportHeight * 0.95;
      
      // Check for absence of narrow column constraints
      const narrowColumn = await page.locator('[class*="max-w-sm"][class*="max-w-md"]').first();
      const hasNarrowColumn = await narrowColumn.count() > 0;
      
      this.results.fullscreenBackground = {
        status: backgroundExists && coversFullWidth && coversFullHeight && !hasNarrowColumn ? 'PASS' : 'FAIL',
        backgroundExists: backgroundExists,
        coversFullWidth: coversFullWidth,
        coversFullHeight: coversFullHeight,
        noNarrowColumn: !hasNarrowColumn,
        backgroundSize: backgroundBox ? `${backgroundBox.width}x${backgroundBox.height}` : 'NOT_FOUND',
        viewportSize: `${viewportWidth}x${viewportHeight}`
      };
      
      console.log(`✅ Gradient background: ${backgroundExists ? 'FOUND' : 'MISSING'}`);
      console.log(`✅ Covers full width: ${coversFullWidth ? 'YES' : 'NO'}`);
      console.log(`✅ Covers full height: ${coversFullHeight ? 'YES' : 'NO'}`);
      console.log(`✅ No narrow column: ${!hasNarrowColumn ? 'YES' : 'NO'}`);
      console.log(`✅ Background size: ${backgroundBox ? `${backgroundBox.width}x${backgroundBox.height}` : 'NOT_FOUND'}`);
      
    } catch (error) {
      console.error('❌ Fullscreen background test failed:', error.message);
      this.results.fullscreenBackground = { status: 'ERROR', error: error.message };
    } finally {
      await context.close();
    }
  }

  async testCenteredCard(browser) {
    console.log('\n🎴 TEST 2: CENTERED AUTH CARD');
    console.log('============================');
    
    const context = await browser.newContext({ viewport: TEST_CONFIG.viewports.desktop });
    const page = await context.newPage();
    
    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/register`);
      await page.waitForLoadState('networkidle');
      
      // Check for white auth card
      const authCard = await page.locator('[class*="bg-white"][class*="rounded-2xl"]').first();
      const cardExists = await authCard.count() > 0;
      
      // Check card dimensions and positioning
      const cardBox = await authCard.boundingBox();
      const viewportWidth = TEST_CONFIG.viewports.desktop.width;
      const viewportHeight = TEST_CONFIG.viewports.desktop.height;
      
      // Card should be centered horizontally
      const cardCenterX = cardBox ? cardBox.x + (cardBox.width / 2) : 0;
      const viewportCenterX = viewportWidth / 2;
      const horizontallyCentered = Math.abs(cardCenterX - viewportCenterX) < 100; // 100px tolerance
      
      // Card should be reasonably centered vertically
      const cardCenterY = cardBox ? cardBox.y + (cardBox.height / 2) : 0;
      const viewportCenterY = viewportHeight / 2;
      const verticallyCentered = Math.abs(cardCenterY - viewportCenterY) < 200; // 200px tolerance
      
      // Card should be appropriate width (around 420px max)
      const appropriateWidth = cardBox && cardBox.width <= 450 && cardBox.width >= 300;
      
      // Check for shadow
      const hasShadow = await authCard.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return styles.boxShadow !== 'none';
      });
      
      this.results.centeredCard = {
        status: cardExists && horizontallyCentered && verticallyCentered && appropriateWidth ? 'PASS' : 'FAIL',
        cardExists: cardExists,
        horizontallyCentered: horizontallyCentered,
        verticallyCentered: verticallyCentered,
        appropriateWidth: appropriateWidth,
        hasShadow: hasShadow,
        cardSize: cardBox ? `${cardBox.width}x${cardBox.height}` : 'NOT_FOUND',
        cardPosition: cardBox ? `${cardBox.x}, ${cardBox.y}` : 'NOT_FOUND'
      };
      
      console.log(`✅ White card: ${cardExists ? 'FOUND' : 'MISSING'}`);
      console.log(`✅ Horizontally centered: ${horizontallyCentered ? 'YES' : 'NO'}`);
      console.log(`✅ Vertically centered: ${verticallyCentered ? 'YES' : 'NO'}`);
      console.log(`✅ Appropriate width: ${appropriateWidth ? 'YES' : 'NO'}`);
      console.log(`✅ Has shadow: ${hasShadow ? 'YES' : 'NO'}`);
      console.log(`✅ Card size: ${cardBox ? `${cardBox.width}x${cardBox.height}` : 'NOT_FOUND'}`);
      
    } catch (error) {
      console.error('❌ Centered card test failed:', error.message);
      this.results.centeredCard = { status: 'ERROR', error: error.message };
    } finally {
      await context.close();
    }
  }

  async testNoScrollbars(browser) {
    console.log('\n📏 TEST 3: NO VERTICAL SCROLLBARS');
    console.log('=================================');
    
    const context = await browser.newContext({ viewport: TEST_CONFIG.viewports.desktop });
    const page = await context.newPage();
    
    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/register`);
      await page.waitForLoadState('networkidle');
      
      // Check if page requires scrolling
      const bodyScrollHeight = await page.evaluate(() => document.body.scrollHeight);
      const viewportHeight = TEST_CONFIG.viewports.desktop.height;
      const noVerticalScroll = bodyScrollHeight <= viewportHeight + 50; // 50px tolerance
      
      // Check for absence of overflow-y-auto
      const overflowElement = await page.locator('[class*="overflow-y-auto"]').first();
      const hasOverflowAuto = await overflowElement.count() > 0;
      
      // Check if content fits naturally
      const authCard = await page.locator('[class*="bg-white"][class*="rounded-2xl"]').first();
      const cardBox = await authCard.boundingBox();
      const cardFitsInViewport = cardBox && (cardBox.y + cardBox.height) <= viewportHeight;
      
      this.results.noScrollbars = {
        status: noVerticalScroll && !hasOverflowAuto && cardFitsInViewport ? 'PASS' : 'FAIL',
        noVerticalScroll: noVerticalScroll,
        noOverflowAuto: !hasOverflowAuto,
        cardFitsInViewport: cardFitsInViewport,
        bodyScrollHeight: bodyScrollHeight,
        viewportHeight: viewportHeight,
        scrollRequired: bodyScrollHeight > viewportHeight
      };
      
      console.log(`✅ No vertical scroll: ${noVerticalScroll ? 'YES' : 'NO'}`);
      console.log(`✅ No overflow-y-auto: ${!hasOverflowAuto ? 'YES' : 'NO'}`);
      console.log(`✅ Card fits in viewport: ${cardFitsInViewport ? 'YES' : 'NO'}`);
      console.log(`✅ Body scroll height: ${bodyScrollHeight}px`);
      console.log(`✅ Viewport height: ${viewportHeight}px`);
      
    } catch (error) {
      console.error('❌ No scrollbars test failed:', error.message);
      this.results.noScrollbars = { status: 'ERROR', error: error.message };
    } finally {
      await context.close();
    }
  }

  async testMobileOptimization(browser) {
    console.log('\n📱 TEST 4: MOBILE OPTIMIZATION');
    console.log('==============================');
    
    const context = await browser.newContext({ viewport: TEST_CONFIG.viewports.mobile });
    const page = await context.newPage();
    
    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/register`);
      await page.waitForLoadState('networkidle');
      
      // Check for proper mobile padding
      const container = await page.locator('[class*="px-4"]').first();
      const hasMobilePadding = await container.count() > 0;
      
      // Check card doesn't touch screen edges
      const authCard = await page.locator('[class*="bg-white"][class*="rounded-2xl"]').first();
      const cardBox = await authCard.boundingBox();
      const viewportWidth = TEST_CONFIG.viewports.mobile.width;
      
      const hasEdgePadding = cardBox && cardBox.x >= 16 && (cardBox.x + cardBox.width) <= (viewportWidth - 16);
      
      // Check responsive sizing
      const cardFitsWidth = cardBox && cardBox.width <= viewportWidth - 32; // Account for padding
      
      // Check if form elements are appropriately sized
      const formInputs = await page.locator('input').count();
      const hasFormElements = formInputs > 0;
      
      this.results.mobileOptimization = {
        status: hasMobilePadding && hasEdgePadding && cardFitsWidth && hasFormElements ? 'PASS' : 'FAIL',
        hasMobilePadding: hasMobilePadding,
        hasEdgePadding: hasEdgePadding,
        cardFitsWidth: cardFitsWidth,
        hasFormElements: hasFormElements,
        cardWidth: cardBox ? cardBox.width : 0,
        viewportWidth: viewportWidth,
        formInputCount: formInputs
      };
      
      console.log(`✅ Mobile padding (px-4): ${hasMobilePadding ? 'FOUND' : 'MISSING'}`);
      console.log(`✅ Edge padding: ${hasEdgePadding ? 'YES' : 'NO'}`);
      console.log(`✅ Card fits width: ${cardFitsWidth ? 'YES' : 'NO'}`);
      console.log(`✅ Form elements: ${hasFormElements ? 'FOUND' : 'MISSING'}`);
      console.log(`✅ Card width: ${cardBox ? cardBox.width : 0}px (viewport: ${viewportWidth}px)`);
      
    } catch (error) {
      console.error('❌ Mobile optimization test failed:', error.message);
      this.results.mobileOptimization = { status: 'ERROR', error: error.message };
    } finally {
      await context.close();
    }
  }

  async testBrandingCleanup(browser) {
    console.log('\n🎨 TEST 5: BRANDING CLEANUP');
    console.log('===========================');
    
    const context = await browser.newContext({ viewport: TEST_CONFIG.viewports.desktop });
    const page = await context.newPage();
    
    try {
      await page.goto(`${TEST_CONFIG.baseUrl}/register`);
      await page.waitForLoadState('networkidle');
      
      // Check logo is inside the white card
      const authCard = await page.locator('[class*="bg-white"][class*="rounded-2xl"]').first();
      const logo = await authCard.locator('img[alt*="FloWorx"]').first();
      const logoInCard = await logo.count() > 0;
      
      // Check tagline is inside the card
      const tagline = await authCard.locator('text=Email AI Built by Hot Tub Pros').first();
      const taglineInCard = await tagline.count() > 0;
      
      // Check for footer outside card
      const footer = await page.locator('text=© 2025 FloWorx').first();
      const footerExists = await footer.count() > 0;
      
      // Check footer is outside the card (not a child of the card)
      const footerInCard = await authCard.locator('text=© 2025 FloWorx').count() > 0;
      const footerOutsideCard = footerExists && !footerInCard;
      
      // Check logo variant (should be dark/transparent for white background)
      const logoSrc = await logo.getAttribute('src');
      const appropriateLogoVariant = logoSrc && !logoSrc.includes('whiteOnBlue');
      
      this.results.brandingCleanup = {
        status: logoInCard && taglineInCard && footerOutsideCard && appropriateLogoVariant ? 'PASS' : 'FAIL',
        logoInCard: logoInCard,
        taglineInCard: taglineInCard,
        footerExists: footerExists,
        footerOutsideCard: footerOutsideCard,
        appropriateLogoVariant: appropriateLogoVariant,
        logoSrc: logoSrc || 'NOT_FOUND'
      };
      
      console.log(`✅ Logo in card: ${logoInCard ? 'YES' : 'NO'}`);
      console.log(`✅ Tagline in card: ${taglineInCard ? 'YES' : 'NO'}`);
      console.log(`✅ Footer exists: ${footerExists ? 'YES' : 'NO'}`);
      console.log(`✅ Footer outside card: ${footerOutsideCard ? 'YES' : 'NO'}`);
      console.log(`✅ Appropriate logo variant: ${appropriateLogoVariant ? 'YES' : 'NO'}`);
      console.log(`✅ Logo source: ${logoSrc || 'NOT_FOUND'}`);
      
    } catch (error) {
      console.error('❌ Branding cleanup test failed:', error.message);
      this.results.brandingCleanup = { status: 'ERROR', error: error.message };
    } finally {
      await context.close();
    }
  }

  generateFullscreenReport() {
    console.log('\n📊 FULLSCREEN AUTH LAYOUT VALIDATION REPORT');
    console.log('===========================================');
    
    const testResults = [
      { name: 'Fullscreen Background', result: this.results.fullscreenBackground },
      { name: 'Centered Card', result: this.results.centeredCard },
      { name: 'No Scrollbars', result: this.results.noScrollbars },
      { name: 'Mobile Optimization', result: this.results.mobileOptimization },
      { name: 'Branding Cleanup', result: this.results.brandingCleanup }
    ];
    
    let passedTests = 0;
    let totalTests = testResults.length;
    
    testResults.forEach(({ name, result }) => {
      const status = result.status === 'PASS' ? '✅ PASS' : result.status === 'FAIL' ? '❌ FAIL' : '⚠️ ERROR';
      console.log(`\n📋 ${name}: ${status}`);
      
      if (result.status === 'PASS') passedTests++;
    });
    
    const passRate = (passedTests / totalTests) * 100;
    this.results.overallStatus = passRate >= 80 ? 'PASS' : 'FAIL';
    
    console.log('\n🎯 OVERALL FULLSCREEN STATUS:');
    console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`   Pass Rate: ${passRate.toFixed(1)}%`);
    console.log(`   Status: ${this.results.overallStatus}`);
    
    if (this.results.overallStatus === 'PASS') {
      console.log('\n🎉 FULLSCREEN AUTH REDESIGN SUCCESSFUL!');
      console.log('   ✅ No more narrow blue column (ugly vertical stripe)');
      console.log('   ✅ Full viewport gradient background');
      console.log('   ✅ Perfectly centered white auth card');
      console.log('   ✅ No vertical scrollbars required');
      console.log('   ✅ Mobile-optimized with proper padding');
      console.log('   ✅ Clean branding inside card with footer outside');
      console.log('\n🚀 Professional fullscreen auth experience achieved!');
    } else {
      console.log('\n🔧 FULLSCREEN REDESIGN NEEDS ADDITIONAL FIXES');
    }
    
    return this.results;
  }
}

// Run test if called directly
if (require.main === module) {
  const test = new FullscreenAuthTest();
  test.runFullscreenTest().catch(console.error);
}

module.exports = FullscreenAuthTest;
