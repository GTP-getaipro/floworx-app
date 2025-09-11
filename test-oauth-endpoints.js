#!/usr/bin/env node

/**
 * TEST OAUTH ENDPOINTS
 * ====================
 * Test the correct OAuth endpoints to verify they're working
 */

const axios = require('axios');

async function testOAuthEndpoint(url, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`📍 URL: ${url}`);
    console.log('-'.repeat(50));
    
    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: () => true, // Don't throw on any status
      maxRedirects: 0 // Don't follow redirects automatically
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers['content-type'] || 'Not specified'}`);
    
    // Check for redirect (OAuth should redirect to Google)
    if (response.status === 302) {
      const location = response.headers.location;
      console.log(`✅ REDIRECT: ${location}`);
      
      if (location && location.includes('accounts.google.com')) {
        console.log(`🎉 SUCCESS: Properly redirecting to Google OAuth`);
        return { success: true, status: response.status, redirect: location };
      } else {
        console.log(`⚠️  WARNING: Redirecting but not to Google OAuth`);
        return { success: false, status: response.status, redirect: location };
      }
    } else if (response.status === 200) {
      console.log(`📄 RESPONSE: ${response.data.toString().substring(0, 200)}...`);
      return { success: true, status: response.status, data: response.data };
    } else {
      console.log(`❌ ERROR: ${response.status} - ${response.statusText}`);
      if (response.data) {
        console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
      }
      return { success: false, status: response.status, error: response.data };
    }
    
  } catch (error) {
    console.log(`❌ REQUEST FAILED: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🔗 OAUTH ENDPOINTS TEST');
  console.log('=======================');
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  
  const endpoints = [
    {
      url: 'https://app.floworx-iq.com/api/oauth/google',
      description: 'Google OAuth Initiation (CORRECT URL)'
    },
    {
      url: 'https://app.floworx-iq.com/api/auth/google',
      description: 'Google OAuth via Auth Route (INCORRECT URL - should 404)'
    },
    {
      url: 'https://app.floworx-iq.com/api/oauth/status',
      description: 'OAuth Status Endpoint'
    },
    {
      url: 'https://app.floworx-iq.com/api/health/oauth',
      description: 'OAuth Health Check'
    }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const result = await testOAuthEndpoint(endpoint.url, endpoint.description);
    results.push({
      ...endpoint,
      ...result
    });
  }
  
  console.log('\n📊 OAUTH ENDPOINTS TEST SUMMARY');
  console.log('===============================');
  
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.description}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Status: ${result.status || 'ERROR'}`);
    
    if (result.redirect && result.redirect.includes('accounts.google.com')) {
      console.log(`   🎉 Properly configured OAuth redirect`);
    } else if (result.status === 404) {
      console.log(`   ℹ️  Expected 404 for incorrect URL`);
    }
    console.log('');
  });
  
  // Provide guidance
  console.log('💡 GUIDANCE FOR USER:');
  console.log('=====================');
  
  const correctOAuthResult = results.find(r => r.url.includes('/api/oauth/google'));
  const incorrectOAuthResult = results.find(r => r.url.includes('/api/auth/google'));
  
  if (correctOAuthResult && correctOAuthResult.success) {
    console.log('✅ The correct OAuth endpoint is working!');
    console.log('📍 Use: https://app.floworx-iq.com/api/oauth/google');
    console.log('❌ NOT: https://app.floworx-iq.com/api/auth/google');
  }
  
  if (incorrectOAuthResult && incorrectOAuthResult.status === 404) {
    console.log('✅ The incorrect URL properly returns 404 (as expected)');
  }
  
  console.log('\n🔧 FRONTEND FIX NEEDED:');
  console.log('Check your frontend code and update any references from:');
  console.log('❌ /api/auth/google → ✅ /api/oauth/google');
  
  console.log('\n🔗 OAUTH ENDPOINTS TEST COMPLETE!');
}

main().catch(console.error);
