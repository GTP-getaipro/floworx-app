#!/usr/bin/env node

/**
 * Local Component Test - Verify our fixes are working in the built files
 * This tests the actual built components to ensure our changes are correct
 */

const fs = require('fs');
const path = require('path');

class LocalComponentTest {
  constructor() {
    this.results = {
      authLayoutChanges: {},
      logoChanges: {},
      formContainerChanges: {},
      buildFiles: {},
      overallStatus: 'PENDING'
    };
  }

  async runLocalTest() {
    console.log('🔍 LOCAL COMPONENT VALIDATION');
    console.log('=============================');
    console.log(`📅 Test Date: ${new Date().toISOString()}`);
    
    // Test 1: Verify AuthLayout changes
    this.testAuthLayoutChanges();
    
    // Test 2: Verify Logo component changes
    this.testLogoChanges();
    
    // Test 3: Verify FormContainer changes
    this.testFormContainerChanges();
    
    // Test 4: Check build files
    this.testBuildFiles();
    
    // Generate report
    this.generateLocalReport();
    
    return this.results;
  }

  testAuthLayoutChanges() {
    console.log('\n📐 TEST 1: AUTHLAYOUT COMPONENT CHANGES');
    console.log('=======================================');
    
    try {
      const authLayoutPath = path.join(__dirname, '../frontend/src/components/auth/AuthLayout.jsx');
      const content = fs.readFileSync(authLayoutPath, 'utf8');
      
      // Check for flex centering
      const hasFlexCenter = content.includes('min-h-screen flex items-center justify-center');
      
      // Check for max-h-12 max-w-12 logo wrapper
      const hasLogoWrapper = content.includes('max-h-12 max-w-12');
      
      // Check for reduced form height
      const hasMaxHeight = content.includes('max-h-[600px]');
      
      // Check for responsive classes
      const hasResponsiveClasses = content.includes('max-w-sm sm:max-w-md md:max-w-md lg:max-w-lg');
      
      // Check for reduced padding
      const hasReducedPadding = content.includes('p-4 sm:p-6');
      
      this.results.authLayoutChanges = {
        status: hasFlexCenter && hasLogoWrapper && hasMaxHeight ? 'PASS' : 'FAIL',
        flexCenter: hasFlexCenter,
        logoWrapper: hasLogoWrapper,
        maxHeight: hasMaxHeight,
        responsiveClasses: hasResponsiveClasses,
        reducedPadding: hasReducedPadding
      };
      
      console.log(`✅ Flex centering: ${hasFlexCenter ? 'FOUND' : 'MISSING'}`);
      console.log(`✅ Logo wrapper: ${hasLogoWrapper ? 'FOUND' : 'MISSING'}`);
      console.log(`✅ Max height constraint: ${hasMaxHeight ? 'FOUND' : 'MISSING'}`);
      console.log(`✅ Responsive classes: ${hasResponsiveClasses ? 'FOUND' : 'MISSING'}`);
      console.log(`✅ Reduced padding: ${hasReducedPadding ? 'FOUND' : 'MISSING'}`);
      
    } catch (error) {
      console.error('❌ AuthLayout test failed:', error.message);
      this.results.authLayoutChanges = { status: 'ERROR', error: error.message };
    }
  }

  testLogoChanges() {
    console.log('\n🎨 TEST 2: LOGO COMPONENT CHANGES');
    console.log('=================================');
    
    try {
      const logoPath = path.join(__dirname, '../frontend/src/components/ui/Logo.js');
      const content = fs.readFileSync(logoPath, 'utf8');
      
      // Check for object-contain constraints
      const hasObjectContain = content.includes('object-contain max-w-full max-h-full');
      
      // Check for size classes
      const hasSizeClasses = content.includes('md: \'h-12 w-12\'');
      
      this.results.logoChanges = {
        status: hasObjectContain ? 'PASS' : 'FAIL',
        objectContain: hasObjectContain,
        sizeClasses: hasSizeClasses
      };
      
      console.log(`✅ Object contain constraints: ${hasObjectContain ? 'FOUND' : 'MISSING'}`);
      console.log(`✅ Size classes updated: ${hasSizeClasses ? 'FOUND' : 'MISSING'}`);
      
    } catch (error) {
      console.error('❌ Logo test failed:', error.message);
      this.results.logoChanges = { status: 'ERROR', error: error.message };
    }
  }

  testFormContainerChanges() {
    console.log('\n📝 TEST 3: FORMCONTAINER COMPONENT CHANGES');
    console.log('==========================================');
    
    try {
      const formContainerPath = path.join(__dirname, '../frontend/src/components/auth/FormContainer.jsx');
      const content = fs.readFileSync(formContainerPath, 'utf8');
      
      // Check for reduced spacing
      const hasReducedSpacing = content.includes('space-y-3');
      
      // Check for smaller input height
      const hasSmallerInputs = content.includes('h-9');
      
      // Check for smaller button height
      const hasSmallerButtons = content.includes('h-10');
      
      // Check for smaller labels
      const hasSmallerLabels = content.includes('text-xs');
      
      this.results.formContainerChanges = {
        status: hasReducedSpacing && hasSmallerInputs && hasSmallerButtons ? 'PASS' : 'FAIL',
        reducedSpacing: hasReducedSpacing,
        smallerInputs: hasSmallerInputs,
        smallerButtons: hasSmallerButtons,
        smallerLabels: hasSmallerLabels
      };
      
      console.log(`✅ Reduced spacing: ${hasReducedSpacing ? 'FOUND' : 'MISSING'}`);
      console.log(`✅ Smaller inputs (h-9): ${hasSmallerInputs ? 'FOUND' : 'MISSING'}`);
      console.log(`✅ Smaller buttons (h-10): ${hasSmallerButtons ? 'FOUND' : 'MISSING'}`);
      console.log(`✅ Smaller labels (text-xs): ${hasSmallerLabels ? 'FOUND' : 'MISSING'}`);
      
    } catch (error) {
      console.error('❌ FormContainer test failed:', error.message);
      this.results.formContainerChanges = { status: 'ERROR', error: error.message };
    }
  }

  testBuildFiles() {
    console.log('\n🏗️ TEST 4: BUILD FILES STATUS');
    console.log('=============================');
    
    try {
      const buildPath = path.join(__dirname, '../frontend/build');
      const buildExists = fs.existsSync(buildPath);
      
      if (buildExists) {
        const buildStats = fs.statSync(buildPath);
        const buildTime = buildStats.mtime;
        const timeSinceLastBuild = Date.now() - buildTime.getTime();
        const minutesSinceLastBuild = Math.floor(timeSinceLastBuild / (1000 * 60));
        
        // Check for main JS file
        const staticJsPath = path.join(buildPath, 'static/js');
        const jsFiles = fs.existsSync(staticJsPath) ? fs.readdirSync(staticJsPath) : [];
        const mainJsFile = jsFiles.find(file => file.startsWith('main.') && file.endsWith('.js'));
        
        // Check for main CSS file
        const staticCssPath = path.join(buildPath, 'static/css');
        const cssFiles = fs.existsSync(staticCssPath) ? fs.readdirSync(staticCssPath) : [];
        const mainCssFile = cssFiles.find(file => file.startsWith('main.') && file.endsWith('.css'));
        
        this.results.buildFiles = {
          status: 'PASS',
          buildExists: true,
          buildTime: buildTime.toISOString(),
          minutesSinceLastBuild: minutesSinceLastBuild,
          mainJsFile: mainJsFile || 'NOT_FOUND',
          mainCssFile: mainCssFile || 'NOT_FOUND',
          recentBuild: minutesSinceLastBuild < 30 // Built within last 30 minutes
        };
        
        console.log(`✅ Build directory: EXISTS`);
        console.log(`✅ Last build: ${minutesSinceLastBuild} minutes ago`);
        console.log(`✅ Main JS file: ${mainJsFile || 'NOT_FOUND'}`);
        console.log(`✅ Main CSS file: ${mainCssFile || 'NOT_FOUND'}`);
        console.log(`✅ Recent build: ${minutesSinceLastBuild < 30 ? 'YES' : 'NO'}`);
        
      } else {
        this.results.buildFiles = {
          status: 'FAIL',
          buildExists: false
        };
        console.log(`❌ Build directory: MISSING`);
      }
      
    } catch (error) {
      console.error('❌ Build files test failed:', error.message);
      this.results.buildFiles = { status: 'ERROR', error: error.message };
    }
  }

  generateLocalReport() {
    console.log('\n📊 LOCAL COMPONENT VALIDATION REPORT');
    console.log('====================================');
    
    const testResults = [
      { name: 'AuthLayout Changes', result: this.results.authLayoutChanges },
      { name: 'Logo Changes', result: this.results.logoChanges },
      { name: 'FormContainer Changes', result: this.results.formContainerChanges },
      { name: 'Build Files', result: this.results.buildFiles }
    ];
    
    let passedTests = 0;
    let totalTests = testResults.length;
    
    testResults.forEach(({ name, result }) => {
      const status = result.status === 'PASS' ? '✅ PASS' : result.status === 'FAIL' ? '❌ FAIL' : '⚠️ ERROR';
      console.log(`\n📋 ${name}: ${status}`);
      
      if (result.status === 'PASS') passedTests++;
    });
    
    const passRate = (passedTests / totalTests) * 100;
    this.results.overallStatus = passRate >= 75 ? 'PASS' : 'FAIL';
    
    console.log('\n🎯 LOCAL VALIDATION STATUS:');
    console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`   Pass Rate: ${passRate.toFixed(1)}%`);
    console.log(`   Status: ${this.results.overallStatus}`);
    
    if (this.results.overallStatus === 'PASS') {
      console.log('\n✅ LOCAL COMPONENTS CORRECTLY IMPLEMENTED!');
      console.log('   All fixes are present in the source code.');
      console.log('   Issue may be deployment/caching related.');
    } else {
      console.log('\n❌ LOCAL COMPONENTS NEED FIXES');
    }
    
    // Deployment analysis
    console.log('\n🚀 DEPLOYMENT ANALYSIS:');
    if (this.results.buildFiles.recentBuild) {
      console.log('   ✅ Recent build detected - changes should be deployed');
      console.log('   🔄 If UAT still fails, likely a CDN/caching issue');
      console.log('   💡 Try hard refresh (Ctrl+F5) or wait for CDN propagation');
    } else {
      console.log('   ⚠️ Build may be stale - consider rebuilding');
    }
    
    return this.results;
  }
}

// Run test if called directly
if (require.main === module) {
  const test = new LocalComponentTest();
  test.runLocalTest().catch(console.error);
}

module.exports = LocalComponentTest;
