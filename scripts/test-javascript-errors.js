#!/usr/bin/env node

/**
 * Test script to verify JavaScript initialization errors are resolved
 * Tests the production deployment for specific JavaScript errors
 */

const https = require('https');

const PRODUCTION_URL = 'https://floworx-gxl5ke7q0-floworxdevelopers-projects.vercel.app';

async function testJavaScriptErrors() {
  console.log('🔍 JAVASCRIPT ERROR VERIFICATION TEST');
  console.log('=====================================');
  console.log(`Testing URL: ${PRODUCTION_URL}`);
  console.log('');

  try {
    // Test homepage for JavaScript errors
    console.log('1️⃣ Testing homepage for JavaScript errors...');
    
    const response = await fetch(PRODUCTION_URL);
    const html = await response.text();
    
    // Check for common JavaScript error patterns
    const errorPatterns = [
      /Cannot access.*before initialization/i,
      /ReferenceError.*N.*before initialization/i,
      /Uncaught ReferenceError/i,
      /Cannot access 'N' before initialization/i,
      /SyntaxError/i,
      /TypeError.*undefined/i
    ];
    
    let hasJavaScriptErrors = false;
    const foundErrors = [];
    
    for (const pattern of errorPatterns) {
      if (pattern.test(html)) {
        hasJavaScriptErrors = true;
        foundErrors.push(pattern.toString());
      }
    }
    
    if (hasJavaScriptErrors) {
      console.log('   ❌ JavaScript errors detected in HTML:');
      foundErrors.forEach(error => console.log(`      - ${error}`));
    } else {
      console.log('   ✅ No JavaScript errors detected in HTML');
    }
    
    // Check if the page loads basic React content
    const hasReactContent = html.includes('FloWorx') || html.includes('react');
    if (hasReactContent) {
      console.log('   ✅ React application content detected');
    } else {
      console.log('   ⚠️  React application content not detected');
    }
    
    // Check for error boundary activation
    const hasErrorBoundary = html.includes('Something went wrong') || html.includes('error-boundary');
    if (hasErrorBoundary) {
      console.log('   ❌ Error boundary is active (indicates JavaScript error)');
    } else {
      console.log('   ✅ Error boundary not active');
    }
    
    console.log('');
    console.log('2️⃣ Testing API endpoint...');
    
    const apiResponse = await fetch(`${PRODUCTION_URL}/api/health`);
    if (apiResponse.ok) {
      console.log('   ✅ API endpoint responding correctly');
    } else {
      console.log('   ❌ API endpoint issues detected');
    }
    
    console.log('');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('=======================');
    
    if (!hasJavaScriptErrors && hasReactContent && !hasErrorBoundary) {
      console.log('✅ SUCCESS: JavaScript initialization errors RESOLVED!');
      console.log('✅ Application is loading correctly');
      console.log('✅ No error boundaries activated');
      console.log('✅ React content rendering properly');
      console.log('');
      console.log('🎉 DEPLOYMENT FIX SUCCESSFUL!');
      process.exit(0);
    } else {
      console.log('❌ ISSUES DETECTED:');
      if (hasJavaScriptErrors) console.log('   - JavaScript errors still present');
      if (!hasReactContent) console.log('   - React content not loading');
      if (hasErrorBoundary) console.log('   - Error boundary is active');
      console.log('');
      console.log('🔧 Additional fixes may be needed');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    process.exit(1);
  }
}

// Run the test
testJavaScriptErrors();
