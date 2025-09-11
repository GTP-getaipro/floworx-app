#!/usr/bin/env node

/**
 * INVESTIGATE REMAINING API ISSUES
 * ================================
 * Deep dive into the 6 remaining failed endpoints
 */

const axios = require('axios');

async function investigateAuthenticationIssues() {
  console.log('🔍 INVESTIGATING AUTHENTICATION ISSUES');
  console.log('=====================================');
  
  const baseUrl = 'https://app.floworx-iq.com/api';
  
  // Test endpoints that are returning 403 instead of 401
  const problematicEndpoints = [
    { path: '/user/status', expected: [200, 401], actual: 403 },
    { path: '/dashboard/status', expected: [200, 401], actual: 403 },
    { path: '/onboarding/status', expected: [200, 401], actual: 403 }
  ];
  
  console.log('🧪 Testing endpoints with authentication issues:');
  
  for (const endpoint of problematicEndpoints) {
    console.log(`\n🔍 Testing: ${endpoint.path}`);
    
    // Test without token
    try {
      const response = await axios.get(`${baseUrl}${endpoint.path}`, {
        timeout: 10000,
        validateStatus: () => true
      });
      
      console.log(`   Without token: ${response.status}`);
      
      if (response.status === 403) {
        console.log(`   ⚠️  403 Forbidden - This suggests rate limiting or IP blocking`);
      } else if (response.status === 401) {
        console.log(`   ✅ 401 Unauthorized - Correct authentication response`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    // Test with invalid token
    try {
      const response = await axios.get(`${baseUrl}${endpoint.path}`, {
        headers: {
          'Authorization': 'Bearer invalid-token-12345'
        },
        timeout: 10000,
        validateStatus: () => true
      });
      
      console.log(`   With invalid token: ${response.status}`);
      
    } catch (error) {
      console.log(`   ❌ Error with token: ${error.message}`);
    }
  }
}

async function investigateMissingPasswordReset() {
  console.log('\n🔍 INVESTIGATING MISSING PASSWORD RESET ENDPOINT');
  console.log('===============================================');
  
  const baseUrl = 'https://app.floworx-iq.com/api';
  
  const passwordEndpoints = [
    '/password-reset',           // We added this - should work
    '/password-reset/request',   // This is missing - returns 404
    '/password-reset/verify',    // Let's check this too
    '/password-reset/reset'      // And this one
  ];
  
  for (const endpoint of passwordEndpoints) {
    try {
      console.log(`\n🧪 Testing: ${endpoint}`);
      
      const response = await axios({
        method: endpoint.includes('/request') ? 'POST' : 'GET',
        url: `${baseUrl}${endpoint}`,
        data: endpoint.includes('/request') ? { email: 'test@example.com' } : undefined,
        headers: endpoint.includes('/request') ? { 'Content-Type': 'application/json' } : undefined,
        timeout: 10000,
        validateStatus: () => true
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 404) {
        console.log(`   ❌ Missing endpoint - needs to be added`);
      } else if (response.status === 200 || response.status === 400) {
        console.log(`   ✅ Endpoint exists and responding`);
      } else {
        console.log(`   ⚠️  Unexpected status: ${response.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

async function checkRateLimitingStatus() {
  console.log('\n🔍 CHECKING RATE LIMITING STATUS');
  console.log('===============================');
  
  const baseUrl = 'https://app.floworx-iq.com/api';
  
  // Test a simple endpoint multiple times to see if we're rate limited
  console.log('🧪 Testing rate limiting with multiple requests to /health');
  
  for (let i = 1; i <= 5; i++) {
    try {
      const response = await axios.get(`${baseUrl}/health`, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      console.log(`   Request ${i}: ${response.status} - ${response.headers['x-ratelimit-remaining'] || 'No rate limit header'}`);
      
      if (response.status === 429) {
        console.log(`   🚨 Rate limited! This explains the 403 errors.`);
        break;
      }
      
    } catch (error) {
      console.log(`   Request ${i}: Error - ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

async function analyzeRouteConfiguration() {
  console.log('\n🔍 ANALYZING ROUTE CONFIGURATION');
  console.log('===============================');
  
  // Check if the missing endpoints exist in our backend routes
  const missingEndpoints = [
    { path: '/password-reset/request', file: 'backend/routes/passwordReset.js' },
    { path: '/onboarding/complete', file: 'backend/routes/onboarding.js' }
  ];
  
  console.log('📋 Endpoints that should exist but return 404:');
  
  missingEndpoints.forEach(endpoint => {
    console.log(`\n📁 ${endpoint.path}`);
    console.log(`   Expected in: ${endpoint.file}`);
    console.log(`   Status: Needs investigation`);
  });
  
  console.log('\n💡 POSSIBLE CAUSES:');
  console.log('1. Route not properly mounted in server.js');
  console.log('2. Route handler missing from route file');
  console.log('3. Route path mismatch');
  console.log('4. Middleware blocking the route');
  console.log('5. Deployment issue - route not deployed');
}

async function main() {
  console.log('🔍 INVESTIGATE REMAINING API ISSUES');
  console.log('===================================');
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  
  await investigateAuthenticationIssues();
  await investigateMissingPasswordReset();
  await checkRateLimitingStatus();
  await analyzeRouteConfiguration();
  
  console.log('\n📊 INVESTIGATION SUMMARY');
  console.log('=======================');
  console.log('1. 403 vs 401 errors may be due to rate limiting');
  console.log('2. /password-reset/request endpoint is genuinely missing');
  console.log('3. Some routes may not be properly mounted');
  console.log('4. Rate limiting might be too aggressive');
  
  console.log('\n💡 RECOMMENDED ACTIONS:');
  console.log('1. Add missing /password-reset/request endpoint');
  console.log('2. Check rate limiting configuration');
  console.log('3. Verify all routes are mounted in server.js');
  console.log('4. Test with valid authentication tokens');
  
  console.log('\n🔍 INVESTIGATION COMPLETE!');
}

main().catch(console.error);
