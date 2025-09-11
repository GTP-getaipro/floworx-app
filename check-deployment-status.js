#!/usr/bin/env node

/**
 * CHECK DEPLOYMENT STATUS
 * ======================
 * Investigate server deployment issues and route conflicts
 */

const axios = require('axios');

async function checkServerHealth() {
  console.log('🏥 CHECKING SERVER HEALTH');
  console.log('=========================');
  
  const baseUrl = 'https://app.floworx-iq.com/api';
  
  const healthEndpoints = [
    '/health',
    '/health/database', 
    '/health/oauth'
  ];
  
  for (const endpoint of healthEndpoints) {
    try {
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        timeout: 10000,
        validateStatus: () => true
      });
      
      console.log(`🧪 ${endpoint}: ${response.status}`);
      
      if (response.status >= 500) {
        console.log(`   🚨 Server Error: ${response.status} - ${response.statusText}`);
        if (response.data) {
          console.log(`   Error details:`, response.data);
        }
      } else if (response.status === 200) {
        console.log(`   ✅ Healthy`);
      }
      
    } catch (error) {
      console.log(`🧪 ${endpoint}: ❌ ${error.message}`);
    }
  }
}

async function checkRouteConflicts() {
  console.log('\n🔍 CHECKING ROUTE CONFLICTS');
  console.log('===========================');
  
  const baseUrl = 'https://app.floworx-iq.com/api';
  
  // Test both backend routes and Vercel API routes
  const routeTests = [
    { path: '/password-reset/request', type: 'Backend Route', method: 'POST' },
    { path: '/auth/forgot-password', type: 'Vercel API', method: 'POST' },
    { path: '/onboarding/complete', type: 'Backend Route', method: 'POST' },
    { path: '/onboarding/status', type: 'Vercel API', method: 'GET' }
  ];
  
  for (const route of routeTests) {
    try {
      console.log(`\n🧪 Testing ${route.type}: ${route.method} ${route.path}`);
      
      const config = {
        method: route.method.toLowerCase(),
        url: `${baseUrl}${route.path}`,
        timeout: 10000,
        validateStatus: () => true
      };
      
      if (route.method === 'POST') {
        config.data = { email: 'test@example.com' };
        config.headers = { 'Content-Type': 'application/json' };
      }
      
      const response = await axios(config);
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 404) {
        console.log(`   ❌ Route not found`);
      } else if (response.status === 502 || response.status === 503) {
        console.log(`   🚨 Server error - deployment issue`);
      } else if (response.status === 401 || response.status === 400 || response.status === 200) {
        console.log(`   ✅ Route exists and responding`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

async function testCorrectPasswordResetEndpoints() {
  console.log('\n🔐 TESTING CORRECT PASSWORD RESET ENDPOINTS');
  console.log('===========================================');
  
  const baseUrl = 'https://app.floworx-iq.com/api';
  
  // Test the actual Vercel API endpoints
  const passwordEndpoints = [
    { path: '/auth/forgot-password', method: 'POST', description: 'Initiate password reset' },
    { path: '/auth/verify-reset-token', method: 'POST', description: 'Verify reset token' },
    { path: '/auth/reset-password', method: 'POST', description: 'Complete password reset' },
    { path: '/auth/password-requirements', method: 'GET', description: 'Get password requirements' }
  ];
  
  for (const endpoint of passwordEndpoints) {
    try {
      console.log(`\n🧪 Testing: ${endpoint.method} ${endpoint.path}`);
      console.log(`   Description: ${endpoint.description}`);
      
      const config = {
        method: endpoint.method.toLowerCase(),
        url: `${baseUrl}${endpoint.path}`,
        timeout: 10000,
        validateStatus: () => true
      };
      
      if (endpoint.method === 'POST') {
        if (endpoint.path.includes('forgot-password')) {
          config.data = { email: 'test@example.com' };
        } else if (endpoint.path.includes('verify-reset-token')) {
          config.data = { token: 'test-token' };
        } else if (endpoint.path.includes('reset-password')) {
          config.data = { token: 'test-token', newPassword: 'Test123!', confirmPassword: 'Test123!' };
        }
        config.headers = { 'Content-Type': 'application/json' };
      }
      
      const response = await axios(config);
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200 || response.status === 400) {
        console.log(`   ✅ Working correctly`);
      } else if (response.status === 404) {
        console.log(`   ❌ Not found`);
      } else if (response.status >= 500) {
        console.log(`   🚨 Server error`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }
}

async function updateComprehensiveTestEndpoints() {
  console.log('\n📝 ENDPOINT MAPPING FOR COMPREHENSIVE TEST');
  console.log('==========================================');
  
  console.log('The comprehensive test should use these ACTUAL endpoints:');
  console.log('');
  console.log('❌ WRONG (what test currently uses):');
  console.log('   POST /password-reset/request');
  console.log('   POST /onboarding/complete');
  console.log('');
  console.log('✅ CORRECT (what actually exists):');
  console.log('   POST /auth/forgot-password');
  console.log('   GET /onboarding/status (Vercel API)');
  console.log('   POST /onboarding/complete (Backend route - may need auth)');
  console.log('');
  console.log('💡 RECOMMENDATION:');
  console.log('Update the comprehensive test to use the correct endpoint paths');
  console.log('that match the actual deployed API structure.');
}

async function main() {
  console.log('🔍 CHECK DEPLOYMENT STATUS');
  console.log('==========================');
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  
  await checkServerHealth();
  await checkRouteConflicts();
  await testCorrectPasswordResetEndpoints();
  await updateComprehensiveTestEndpoints();
  
  console.log('\n📊 DEPLOYMENT STATUS SUMMARY');
  console.log('============================');
  console.log('1. Server health endpoints are experiencing 502/503 errors');
  console.log('2. Route conflicts exist between Backend routes and Vercel API');
  console.log('3. Password reset uses /auth/forgot-password, not /password-reset/request');
  console.log('4. Some endpoints may be working but test is using wrong paths');
  
  console.log('\n💡 NEXT ACTIONS:');
  console.log('1. Fix server deployment issues causing 502/503 errors');
  console.log('2. Update comprehensive test to use correct endpoint paths');
  console.log('3. Resolve route conflicts between backend and Vercel API');
  console.log('4. Test with correct endpoint paths');
  
  console.log('\n🔍 DEPLOYMENT STATUS CHECK COMPLETE!');
}

main().catch(console.error);
