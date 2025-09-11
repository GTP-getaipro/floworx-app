#!/usr/bin/env node

/**
 * TEST OAUTH FIX
 * ==============
 * Quick test to verify the OAuth endpoint fix is working
 */

const axios = require('axios');

async function testOAuthFix() {
  console.log('🔧 TESTING OAUTH FIX');
  console.log('====================');
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  
  try {
    console.log('\n🧪 Testing correct OAuth endpoint...');
    console.log('📍 URL: https://app.floworx-iq.com/api/oauth/google');
    
    const response = await axios.get('https://app.floworx-iq.com/api/oauth/google', {
      timeout: 10000,
      validateStatus: () => true,
      maxRedirects: 0
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers['content-type'] || 'Not specified'}`);
    
    if (response.status === 302) {
      const location = response.headers.location;
      console.log(`Redirect: ${location}`);
      
      if (location && location.includes('dashboard?error=auth_required')) {
        console.log('✅ SUCCESS: OAuth endpoint working correctly!');
        console.log('   - Endpoint exists (not 404)');
        console.log('   - Properly requires authentication');
        console.log('   - Redirects to dashboard with auth_required error (expected)');
        return true;
      } else if (location && location.includes('accounts.google.com')) {
        console.log('🎉 EXCELLENT: OAuth endpoint redirecting to Google!');
        console.log('   - This means OAuth is fully working');
        return true;
      } else {
        console.log(`⚠️  Unexpected redirect: ${location}`);
        return false;
      }
    } else if (response.status === 404) {
      console.log('❌ FAILED: Still getting 404 - endpoint not found');
      console.log('   - Check if deployment completed');
      console.log('   - Verify route mounting in server.js');
      return false;
    } else {
      console.log(`⚠️  Unexpected status: ${response.status}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ REQUEST FAILED: ${error.message}`);
    return false;
  }
}

async function testWrongEndpoint() {
  console.log('\n🧪 Testing wrong OAuth endpoint (should still 404)...');
  console.log('📍 URL: https://app.floworx-iq.com/api/auth/google');
  
  try {
    const response = await axios.get('https://app.floworx-iq.com/api/auth/google', {
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 404) {
      console.log('✅ CORRECT: Wrong endpoint still returns 404 (as expected)');
      return true;
    } else {
      console.log(`⚠️  Unexpected: Wrong endpoint returned ${response.status}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ REQUEST FAILED: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🎯 OAUTH FIX VERIFICATION');
  console.log('=========================');
  
  // Wait a moment for deployment
  console.log('⏳ Waiting 30 seconds for deployment...');
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  const correctEndpointWorking = await testOAuthFix();
  const wrongEndpointStill404 = await testWrongEndpoint();
  
  console.log('\n📊 OAUTH FIX TEST RESULTS');
  console.log('=========================');
  console.log(`✅ Correct endpoint working: ${correctEndpointWorking}`);
  console.log(`✅ Wrong endpoint still 404: ${wrongEndpointStill404}`);
  
  if (correctEndpointWorking && wrongEndpointStill404) {
    console.log('\n🎉 OAUTH FIX SUCCESSFUL!');
    console.log('The Google OAuth button should now work correctly.');
    console.log('\n💡 USER ACTION:');
    console.log('1. Clear browser cache and hard refresh (Ctrl+F5)');
    console.log('2. Go to https://app.floworx-iq.com/login');
    console.log('3. Click "Continue with Google" button');
    console.log('4. Should now work without 404 errors!');
  } else {
    console.log('\n⚠️  OAUTH FIX NEEDS MORE TIME');
    console.log('Deployment may still be propagating. Wait 2-3 more minutes and try again.');
  }
  
  console.log('\n🔧 OAUTH FIX TEST COMPLETE!');
}

main().catch(console.error);
