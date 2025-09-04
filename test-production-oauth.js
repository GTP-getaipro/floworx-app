#!/usr/bin/env node

/**
 * Production OAuth Configuration Test
 * Run this after updating Google OAuth and Vercel environment variables
 */

const https = require('https');

const PRODUCTION_URL = 'https://app.floworx-iq.com';

console.log('🔍 TESTING PRODUCTION OAUTH CONFIGURATION');
console.log('==========================================');

// Test 1: Check if OAuth endpoint is accessible
function testOAuthEndpoint() {
  return new Promise((resolve) => {
    const url = `${PRODUCTION_URL}/api/oauth/google`;
    
    console.log('1️⃣ Testing OAuth initiation endpoint...');
    
    https.get(url, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      
      if (res.statusCode === 302) {
        const location = res.headers.location;
        if (location && location.includes('accounts.google.com')) {
          console.log('   ✅ OAuth redirect to Google working');
          console.log(`   📍 Redirect URL: ${location.substring(0, 80)}...`);
          resolve(true);
        } else {
          console.log('   ❌ OAuth redirect not pointing to Google');
          resolve(false);
        }
      } else {
        console.log('   ❌ OAuth endpoint not returning redirect');
        resolve(false);
      }
    }).on('error', (err) => {
      console.log(`   ❌ Error accessing OAuth endpoint: ${err.message}`);
      resolve(false);
    });
  });
}

// Test 2: Check if callback endpoint exists
function testCallbackEndpoint() {
  return new Promise((resolve) => {
    const url = `${PRODUCTION_URL}/api/oauth/google/callback`;
    
    console.log('2️⃣ Testing OAuth callback endpoint...');
    
    https.get(url, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      
      // Callback should return 400 (bad request) without proper OAuth params
      // This means the endpoint exists and is processing requests
      if (res.statusCode === 400 || res.statusCode === 302) {
        console.log('   ✅ OAuth callback endpoint accessible');
        resolve(true);
      } else {
        console.log('   ❌ OAuth callback endpoint not responding correctly');
        resolve(false);
      }
    }).on('error', (err) => {
      console.log(`   ❌ Error accessing callback endpoint: ${err.message}`);
      resolve(false);
    });
  });
}

// Test 3: Check API health
function testAPIHealth() {
  return new Promise((resolve) => {
    const url = `${PRODUCTION_URL}/api/health`;
    
    console.log('3️⃣ Testing API health...');
    
    https.get(url, (res) => {
      console.log(`   Status: ${res.statusCode}`);
      
      if (res.statusCode === 200) {
        console.log('   ✅ API is healthy');
        resolve(true);
      } else {
        console.log('   ❌ API health check failed');
        resolve(false);
      }
    }).on('error', (err) => {
      console.log(`   ❌ Error accessing API: ${err.message}`);
      resolve(false);
    });
  });
}

// Run all tests
async function runTests() {
  console.log(`🎯 Testing production deployment: ${PRODUCTION_URL}\n`);
  
  const results = {
    oauth: await testOAuthEndpoint(),
    callback: await testCallbackEndpoint(),
    api: await testAPIHealth()
  };
  
  console.log('\n📊 TEST RESULTS');
  console.log('===============');
  console.log(`OAuth Initiation: ${results.oauth ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`OAuth Callback: ${results.callback ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`API Health: ${results.api ? '✅ PASS' : '❌ FAIL'}`);
  
  const passCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\nOverall: ${passCount}/${totalTests} tests passed`);
  
  if (passCount === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED! OAuth configuration is ready.');
    console.log('\n🔗 Test OAuth login at:');
    console.log(`   ${PRODUCTION_URL}/api/oauth/google`);
  } else {
    console.log('\n⚠️  Some tests failed. Check the configuration steps above.');
  }
}

runTests().catch(console.error);
