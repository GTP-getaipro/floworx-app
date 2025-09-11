#!/usr/bin/env node

/**
 * Authentication Issues Fix Script
 * Diagnoses and fixes authentication-related 403 errors
 */

const axios = require('axios');

async function testAuthenticationEndpoints() {
  console.log('🔍 Testing authentication endpoints...\n');
  
  const baseUrl = process.env.API_BASE_URL || 'https://app.floworx-iq.com';
  console.log(`Testing against: ${baseUrl}\n`);
  
  // Test endpoints that were failing with 403 errors
  const testEndpoints = [
    { method: 'GET', path: '/api/auth/user/status', requiresAuth: true },
    { method: 'GET', path: '/api/dashboard/status', requiresAuth: true },
    { method: 'GET', path: '/api/onboarding/status', requiresAuth: true },
    { method: 'POST', path: '/api/onboarding/complete', requiresAuth: true },
    { method: 'GET', path: '/api/user/status', requiresAuth: true },
    { method: 'GET', path: '/api/health', requiresAuth: false },
    { method: 'GET', path: '/api/health/database', requiresAuth: false },
    { method: 'GET', path: '/api/health/oauth', requiresAuth: false }
  ];
  
  let testToken = null;
  
  // First, try to get a test token by logging in
  console.log('🔐 Attempting to get authentication token...');
  try {
    const loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
      email: 'test.user@floworx-iq.com',
      password: 'TestPassword123!'
    });
    
    if (loginResponse.data.token) {
      testToken = loginResponse.data.token;
      console.log('✅ Successfully obtained authentication token');
    } else {
      console.log('⚠️ Login successful but no token received');
    }
  } catch (error) {
    console.log('❌ Failed to obtain authentication token');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error: ${error.response?.data?.error || error.message}`);
  }
  
  console.log('\n📋 Testing individual endpoints:\n');
  
  const results = [];
  
  for (const endpoint of testEndpoints) {
    const config = {
      method: endpoint.method.toLowerCase(),
      url: `${baseUrl}${endpoint.path}`,
      timeout: 10000
    };
    
    // Add authorization header if endpoint requires auth and we have a token
    if (endpoint.requiresAuth && testToken) {
      config.headers = {
        'Authorization': `Bearer ${testToken}`
      };
    }
    
    try {
      const response = await axios(config);
      const result = {
        endpoint: endpoint.path,
        method: endpoint.method,
        status: response.status,
        success: true,
        requiresAuth: endpoint.requiresAuth,
        hasToken: !!testToken,
        error: null
      };
      
      console.log(`✅ ${endpoint.method} ${endpoint.path} - ${response.status}`);
      results.push(result);
      
    } catch (error) {
      const result = {
        endpoint: endpoint.path,
        method: endpoint.method,
        status: error.response?.status || 'NETWORK_ERROR',
        success: false,
        requiresAuth: endpoint.requiresAuth,
        hasToken: !!testToken,
        error: error.response?.data?.error || error.message
      };
      
      if (error.response?.status === 403) {
        console.log(`❌ ${endpoint.method} ${endpoint.path} - 403 FORBIDDEN`);
        console.log(`   ${error.response.data?.error || error.response.data?.message || 'Access denied'}`);
      } else if (error.response?.status === 401) {
        console.log(`⚠️ ${endpoint.method} ${endpoint.path} - 401 UNAUTHORIZED`);
        console.log(`   ${error.response.data?.error || error.response.data?.message || 'Authentication required'}`);
      } else if (error.response?.status === 404) {
        console.log(`❓ ${endpoint.method} ${endpoint.path} - 404 NOT FOUND`);
        console.log(`   Endpoint may not exist or be mounted incorrectly`);
      } else {
        console.log(`❌ ${endpoint.method} ${endpoint.path} - ${error.response?.status || 'ERROR'}`);
        console.log(`   ${error.response?.data?.error || error.message}`);
      }
      
      results.push(result);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 AUTHENTICATION TEST SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const forbidden = results.filter(r => r.status === 403);
  const unauthorized = results.filter(r => r.status === 401);
  const notFound = results.filter(r => r.status === 404);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  console.log(`🚫 403 Forbidden: ${forbidden.length}`);
  console.log(`🔐 401 Unauthorized: ${unauthorized.length}`);
  console.log(`❓ 404 Not Found: ${notFound.length}`);
  
  if (forbidden.length > 0) {
    console.log('\n🚨 403 FORBIDDEN ISSUES:');
    forbidden.forEach(result => {
      console.log(`   ${result.method} ${result.endpoint}`);
      if (result.requiresAuth && !result.hasToken) {
        console.log(`     → Missing authentication token`);
      } else if (result.requiresAuth && result.hasToken) {
        console.log(`     → Token present but access denied - check middleware/permissions`);
      } else {
        console.log(`     → Unexpected 403 on public endpoint`);
      }
    });
  }
  
  if (notFound.length > 0) {
    console.log('\n❓ 404 NOT FOUND ISSUES:');
    notFound.forEach(result => {
      console.log(`   ${result.method} ${result.endpoint}`);
      console.log(`     → Check if route is properly mounted in server.js`);
    });
  }
  
  console.log('\n💡 RECOMMENDATIONS:');
  
  if (!testToken) {
    console.log('1. ❌ Unable to obtain authentication token');
    console.log('   - Check if test user exists and credentials are correct');
    console.log('   - Verify login endpoint is working');
    console.log('   - Check rate limiting settings');
  } else {
    console.log('1. ✅ Authentication token obtained successfully');
  }
  
  if (forbidden.length > 0) {
    console.log('2. 🚫 Fix 403 Forbidden errors:');
    console.log('   - Check authentication middleware configuration');
    console.log('   - Verify JWT token validation logic');
    console.log('   - Check if routes are properly protected');
    console.log('   - Review user permissions and roles');
  }
  
  if (notFound.length > 0) {
    console.log('3. ❓ Fix 404 Not Found errors:');
    console.log('   - Verify routes are mounted in server.js');
    console.log('   - Check route path definitions');
    console.log('   - Ensure route files exist and export correctly');
  }
  
  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    hasToken: !!testToken,
    results
  };
}

async function checkRouteConfiguration() {
  console.log('\n🔍 Checking route configuration...\n');
  
  const fs = require('fs');
  const path = require('path');
  
  // Check if route files exist
  const routeFiles = [
    'backend/routes/auth.js',
    'backend/routes/dashboard.js',
    'backend/routes/onboarding.js',
    'backend/routes/user.js'
  ];
  
  console.log('📁 Route files check:');
  for (const routeFile of routeFiles) {
    if (fs.existsSync(routeFile)) {
      console.log(`✅ ${routeFile} - exists`);
    } else {
      console.log(`❌ ${routeFile} - missing`);
    }
  }
  
  // Check server.js route mounting
  console.log('\n🔗 Route mounting check:');
  try {
    const serverContent = fs.readFileSync('backend/server.js', 'utf8');
    
    const routeMounts = [
      { path: '/api/auth', pattern: /app\.use\(['"]\/api\/auth['"]/ },
      { path: '/api/dashboard', pattern: /app\.use\(['"]\/api\/dashboard['"]/ },
      { path: '/api/onboarding', pattern: /app\.use\(['"]\/api\/onboarding['"]/ },
      { path: '/api/user', pattern: /app\.use\(['"]\/api\/user['"]/ }
    ];
    
    for (const mount of routeMounts) {
      if (mount.pattern.test(serverContent)) {
        console.log(`✅ ${mount.path} - properly mounted`);
      } else {
        console.log(`❌ ${mount.path} - not found in server.js`);
      }
    }
  } catch (error) {
    console.log('❌ Could not read server.js file');
  }
}

async function main() {
  console.log('🚀 FloworxInvite Authentication Issues Fix\n');
  
  // Load environment variables
  require('dotenv').config();
  
  // Check route configuration
  await checkRouteConfiguration();
  
  // Test authentication endpoints
  const testResults = await testAuthenticationEndpoints();
  
  console.log('\n' + '='.repeat(60));
  
  if (testResults.failed === 0) {
    console.log('🎉 All authentication endpoints are working properly!');
    process.exit(0);
  } else {
    console.log('🚨 Authentication issues detected!');
    console.log(`   ${testResults.failed}/${testResults.total} endpoints failing`);
    
    if (!testResults.hasToken) {
      console.log('\n🔑 Priority: Fix authentication token acquisition');
    } else {
      console.log('\n🔧 Priority: Fix endpoint access permissions');
    }
    
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testAuthenticationEndpoints, checkRouteConfiguration };
