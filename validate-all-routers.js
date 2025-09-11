#!/usr/bin/env node

const https = require('https');
const http = require('http');

console.log('🔍 COMPREHENSIVE FLOWORX ROUTER VALIDATION');
console.log('==========================================');

// Test configuration
const BASE_URL = 'https://app.floworx-iq.com';
const TEST_USER = {
  email: 'test@floworx.com',
  password: 'TestPass123!',
  firstName: 'Test',
  lastName: 'User'
};

let authToken = null;

async function testEndpoint(url, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (url.startsWith('https') ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      timeout: 15000,
      headers: {
        'User-Agent': 'FloWorx-Router-Validator/1.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data && method !== 'GET') {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
    }
    
    const req = client.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        resolve({
          success: true,
          status: res.statusCode,
          headers: res.headers,
          body: responseData,
          url: url,
          method: method
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        code: error.code,
        url: url,
        method: method
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout',
        code: 'TIMEOUT',
        url: url,
        method: method
      });
    });
    
    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function validateHealthRoutes() {
  console.log('\n🏥 HEALTH & MONITORING ROUTES');
  console.log('=============================');
  
  const routes = [
    { path: '/api/health', method: 'GET', desc: 'Main Health Check' },
    { path: '/api/health/detailed', method: 'GET', desc: 'Detailed Health Check' },
    { path: '/api/health/db', method: 'GET', desc: 'Database Health' },
    { path: '/api/health/cache', method: 'GET', desc: 'Cache Health' },
    { path: '/api/health/services', method: 'GET', desc: 'Services Health' }
  ];
  
  const results = [];
  
  for (const route of routes) {
    console.log(`Testing: ${route.desc}`);
    const result = await testEndpoint(`${BASE_URL}${route.path}`, route.method);
    results.push({ ...route, result });
    
    if (result.success) {
      console.log(`✅ ${result.status} - ${getStatusDescription(result.status)}`);
    } else {
      console.log(`❌ ${result.error}`);
    }
  }
  
  return results;
}

async function validateAuthRoutes() {
  console.log('\n🔐 AUTHENTICATION ROUTES');
  console.log('========================');
  
  const routes = [
    { path: '/api/auth/register', method: 'POST', desc: 'User Registration', 
      data: TEST_USER },
    { path: '/api/auth/login', method: 'POST', desc: 'User Login',
      data: { email: TEST_USER.email, password: TEST_USER.password } },
    { path: '/api/auth/logout', method: 'POST', desc: 'User Logout' },
    { path: '/api/auth/refresh', method: 'POST', desc: 'Token Refresh' },
    { path: '/api/auth/profile', method: 'GET', desc: 'Get Profile' },
    { path: '/api/auth/profile', method: 'PUT', desc: 'Update Profile',
      data: { firstName: 'Updated' } },
    { path: '/api/auth/forgot-password', method: 'POST', desc: 'Forgot Password',
      data: { email: TEST_USER.email } },
    { path: '/api/auth/reset-password', method: 'POST', desc: 'Reset Password',
      data: { token: 'test-token', password: 'NewPass123!' } },
    { path: '/api/auth/verify-email', method: 'POST', desc: 'Verify Email',
      data: { token: 'test-token' } },
    { path: '/api/auth/resend-verification', method: 'POST', desc: 'Resend Verification',
      data: { email: TEST_USER.email } },
    { path: '/api/auth/password-requirements', method: 'GET', desc: 'Password Requirements' }
  ];
  
  const results = [];
  
  for (const route of routes) {
    console.log(`Testing: ${route.desc}`);
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    const result = await testEndpoint(`${BASE_URL}${route.path}`, route.method, route.data, headers);
    results.push({ ...route, result });
    
    if (result.success) {
      console.log(`✅ ${result.status} - ${getStatusDescription(result.status)}`);
      
      // Try to extract auth token from login response
      if (route.path === '/api/auth/login' && result.status === 200) {
        try {
          const responseData = JSON.parse(result.body);
          if (responseData.token) {
            authToken = responseData.token;
            console.log('   🔑 Auth token captured for subsequent requests');
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    } else {
      console.log(`❌ ${result.error}`);
    }
  }
  
  return results;
}

async function validateUserRoutes() {
  console.log('\n👤 USER MANAGEMENT ROUTES');
  console.log('=========================');
  
  const routes = [
    { path: '/api/user/status', method: 'GET', desc: 'User Status' },
    { path: '/api/user/profile', method: 'GET', desc: 'User Profile' },
    { path: '/api/user/profile', method: 'PUT', desc: 'Update User Profile',
      data: { firstName: 'Updated', lastName: 'Name' } },
    { path: '/api/user/preferences', method: 'GET', desc: 'User Preferences' },
    { path: '/api/user/preferences', method: 'PUT', desc: 'Update Preferences',
      data: { notifications: true, theme: 'dark' } }
  ];
  
  const results = [];
  
  for (const route of routes) {
    console.log(`Testing: ${route.desc}`);
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    const result = await testEndpoint(`${BASE_URL}${route.path}`, route.method, route.data, headers);
    results.push({ ...route, result });
    
    if (result.success) {
      console.log(`✅ ${result.status} - ${getStatusDescription(result.status)}`);
    } else {
      console.log(`❌ ${result.error}`);
    }
  }
  
  return results;
}

async function validateDashboardRoutes() {
  console.log('\n📊 DASHBOARD ROUTES');
  console.log('===================');
  
  const routes = [
    { path: '/api/dashboard', method: 'GET', desc: 'Dashboard Data' },
    { path: '/api/dashboard/stats', method: 'GET', desc: 'Dashboard Stats' },
    { path: '/api/dashboard/activities', method: 'GET', desc: 'Recent Activities' },
    { path: '/api/dashboard/quick-actions', method: 'GET', desc: 'Quick Actions' }
  ];
  
  const results = [];
  
  for (const route of routes) {
    console.log(`Testing: ${route.desc}`);
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    const result = await testEndpoint(`${BASE_URL}${route.path}`, route.method, route.data, headers);
    results.push({ ...route, result });
    
    if (result.success) {
      console.log(`✅ ${result.status} - ${getStatusDescription(result.status)}`);
    } else {
      console.log(`❌ ${result.error}`);
    }
  }
  
  return results;
}

function getStatusDescription(status) {
  const descriptions = {
    200: 'OK - Success',
    201: 'Created - Resource created',
    400: 'Bad Request - Invalid data',
    401: 'Unauthorized - Auth required',
    403: 'Forbidden - Access denied',
    404: 'Not Found - Endpoint missing',
    405: 'Method Not Allowed',
    409: 'Conflict - Resource exists',
    429: 'Too Many Requests - Rate limited',
    500: 'Internal Server Error',
    502: 'Bad Gateway - Proxy issue',
    503: 'Service Unavailable'
  };
  
  return descriptions[status] || `Status ${status}`;
}

async function validateOAuthRoutes() {
  console.log('\n🔗 OAUTH ROUTES');
  console.log('===============');

  const routes = [
    { path: '/api/oauth/google', method: 'GET', desc: 'Google OAuth Initiate' },
    { path: '/api/oauth/google/callback', method: 'GET', desc: 'Google OAuth Callback' },
    { path: '/api/oauth/status', method: 'GET', desc: 'OAuth Status' },
    { path: '/api/oauth/disconnect', method: 'POST', desc: 'Disconnect OAuth',
      data: { service: 'google' } }
  ];

  const results = [];

  for (const route of routes) {
    console.log(`Testing: ${route.desc}`);
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    const result = await testEndpoint(`${BASE_URL}${route.path}`, route.method, route.data, headers);
    results.push({ ...route, result });

    if (result.success) {
      console.log(`✅ ${result.status} - ${getStatusDescription(result.status)}`);
    } else {
      console.log(`❌ ${result.error}`);
    }
  }

  return results;
}

async function validateOnboardingRoutes() {
  console.log('\n🎯 ONBOARDING ROUTES');
  console.log('====================');

  const routes = [
    { path: '/api/onboarding/status', method: 'GET', desc: 'Onboarding Status' },
    { path: '/api/onboarding/business-data', method: 'POST', desc: 'Submit Business Data',
      data: { businessType: 'hot_tub', companyName: 'Test Spa' } },
    { path: '/api/onboarding/complete', method: 'POST', desc: 'Complete Onboarding' },
    { path: '/api/onboarding/skip', method: 'POST', desc: 'Skip Onboarding Step',
      data: { step: 'business_setup' } }
  ];

  const results = [];

  for (const route of routes) {
    console.log(`Testing: ${route.desc}`);
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    const result = await testEndpoint(`${BASE_URL}${route.path}`, route.method, route.data, headers);
    results.push({ ...route, result });

    if (result.success) {
      console.log(`✅ ${result.status} - ${getStatusDescription(result.status)}`);
    } else {
      console.log(`❌ ${result.error}`);
    }
  }

  return results;
}

async function validateBusinessTypesRoutes() {
  console.log('\n🏢 BUSINESS TYPES ROUTES');
  console.log('========================');

  const routes = [
    { path: '/api/business-types', method: 'GET', desc: 'Get Business Types' },
    { path: '/api/business-types/hot_tub', method: 'GET', desc: 'Get Specific Business Type' },
    { path: '/api/business-types/config', method: 'GET', desc: 'Get Business Config' }
  ];

  const results = [];

  for (const route of routes) {
    console.log(`Testing: ${route.desc}`);
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    const result = await testEndpoint(`${BASE_URL}${route.path}`, route.method, route.data, headers);
    results.push({ ...route, result });

    if (result.success) {
      console.log(`✅ ${result.status} - ${getStatusDescription(result.status)}`);
    } else {
      console.log(`❌ ${result.error}`);
    }
  }

  return results;
}

async function validateWorkflowRoutes() {
  console.log('\n⚙️ WORKFLOW ROUTES');
  console.log('==================');

  const routes = [
    { path: '/api/workflows', method: 'GET', desc: 'Get Workflows' },
    { path: '/api/workflows/templates', method: 'GET', desc: 'Get Workflow Templates' },
    { path: '/api/workflows', method: 'POST', desc: 'Create Workflow',
      data: { name: 'Test Workflow', type: 'email_automation' } },
    { path: '/api/workflows/123', method: 'GET', desc: 'Get Specific Workflow' },
    { path: '/api/workflows/123', method: 'PUT', desc: 'Update Workflow',
      data: { name: 'Updated Workflow' } },
    { path: '/api/workflows/123', method: 'DELETE', desc: 'Delete Workflow' }
  ];

  const results = [];

  for (const route of routes) {
    console.log(`Testing: ${route.desc}`);
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    const result = await testEndpoint(`${BASE_URL}${route.path}`, route.method, route.data, headers);
    results.push({ ...route, result });

    if (result.success) {
      console.log(`✅ ${result.status} - ${getStatusDescription(result.status)}`);
    } else {
      console.log(`❌ ${result.error}`);
    }
  }

  return results;
}

async function validateAnalyticsRoutes() {
  console.log('\n📈 ANALYTICS ROUTES');
  console.log('===================');

  const routes = [
    { path: '/api/analytics/dashboard', method: 'GET', desc: 'Analytics Dashboard' },
    { path: '/api/analytics/funnel', method: 'GET', desc: 'Onboarding Funnel' },
    { path: '/api/analytics/conversion', method: 'GET', desc: 'Conversion Analytics' },
    { path: '/api/analytics/behavior', method: 'GET', desc: 'User Behavior' },
    { path: '/api/analytics/realtime', method: 'GET', desc: 'Real-time Metrics' }
  ];

  const results = [];

  for (const route of routes) {
    console.log(`Testing: ${route.desc}`);
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    const result = await testEndpoint(`${BASE_URL}${route.path}`, route.method, route.data, headers);
    results.push({ ...route, result });

    if (result.success) {
      console.log(`✅ ${result.status} - ${getStatusDescription(result.status)}`);
    } else {
      console.log(`❌ ${result.error}`);
    }
  }

  return results;
}

async function validatePerformanceRoutes() {
  console.log('\n⚡ PERFORMANCE ROUTES');
  console.log('====================');

  const routes = [
    { path: '/api/performance', method: 'GET', desc: 'Performance Metrics' },
    { path: '/api/performance/endpoints', method: 'GET', desc: 'Endpoint Performance' },
    { path: '/api/performance/system', method: 'GET', desc: 'System Performance' }
  ];

  const results = [];

  for (const route of routes) {
    console.log(`Testing: ${route.desc}`);
    const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {};
    const result = await testEndpoint(`${BASE_URL}${route.path}`, route.method, route.data, headers);
    results.push({ ...route, result });

    if (result.success) {
      console.log(`✅ ${result.status} - ${getStatusDescription(result.status)}`);
    } else {
      console.log(`❌ ${result.error}`);
    }
  }

  return results;
}

async function validateRecoveryRoutes() {
  console.log('\n🔄 RECOVERY ROUTES');
  console.log('==================');

  const routes = [
    { path: '/api/recovery/initiate', method: 'POST', desc: 'Initiate Recovery',
      data: { email: TEST_USER.email } },
    { path: '/api/recovery/verify', method: 'POST', desc: 'Verify Recovery',
      data: { token: 'test-token', code: '123456' } },
    { path: '/api/account-recovery/emergency', method: 'POST', desc: 'Emergency Recovery',
      data: { email: TEST_USER.email, reason: 'lost_access' } },
    { path: '/api/password-reset/request', method: 'POST', desc: 'Password Reset Request',
      data: { email: TEST_USER.email } },
    { path: '/api/password-reset/verify', method: 'POST', desc: 'Password Reset Verify',
      data: { token: 'test-token', password: 'NewPass123!' } }
  ];

  const results = [];

  for (const route of routes) {
    console.log(`Testing: ${route.desc}`);
    const result = await testEndpoint(`${BASE_URL}${route.path}`, route.method, route.data);
    results.push({ ...route, result });

    if (result.success) {
      console.log(`✅ ${result.status} - ${getStatusDescription(result.status)}`);
    } else {
      console.log(`❌ ${result.error}`);
    }
  }

  return results;
}

async function runValidation() {
  console.log('🚀 Starting comprehensive router validation...\n');

  const allResults = [];

  // Test all route groups
  allResults.push(...await validateHealthRoutes());
  allResults.push(...await validateAuthRoutes());
  allResults.push(...await validateUserRoutes());
  allResults.push(...await validateDashboardRoutes());
  allResults.push(...await validateOAuthRoutes());
  allResults.push(...await validateOnboardingRoutes());
  allResults.push(...await validateBusinessTypesRoutes());
  allResults.push(...await validateWorkflowRoutes());
  allResults.push(...await validateAnalyticsRoutes());
  allResults.push(...await validatePerformanceRoutes());
  allResults.push(...await validateRecoveryRoutes());

  return allResults;
}

// Export for use in other scripts
if (require.main === module) {
  runValidation()
    .then(results => {
      console.log('\n📊 VALIDATION SUMMARY');
      console.log('=====================');
      
      const working = results.filter(r => r.result.success && [200, 201].includes(r.result.status));
      const clientErrors = results.filter(r => r.result.success && [400, 401, 403, 404, 405, 409].includes(r.result.status));
      const rateLimited = results.filter(r => r.result.success && r.result.status === 429);
      const serverErrors = results.filter(r => r.result.success && [500, 502, 503].includes(r.result.status));
      const networkErrors = results.filter(r => !r.result.success);
      
      console.log(`✅ Working endpoints: ${working.length}`);
      console.log(`⚠️  Client errors (400-409): ${clientErrors.length}`);
      console.log(`🚫 Rate limited (429): ${rateLimited.length}`);
      console.log(`❌ Server errors (500+): ${serverErrors.length}`);
      console.log(`🔌 Network errors: ${networkErrors.length}`);
      
      if (rateLimited.length > 0) {
        console.log('\n🚨 RATE LIMITING DETECTED');
        console.log('Restart your application in Coolify to clear rate limits');
      }
      
      console.log('\n🎯 NEXT STEPS:');
      if (serverErrors.length > 0) {
        console.log('1. Fix server errors in application code');
      }
      if (rateLimited.length > 0) {
        console.log('2. Restart application to clear rate limits');
      }
      if (working.length > 0) {
        console.log('3. Test actual user flows (registration → login → dashboard)');
      }
    })
    .catch(console.error);
}

module.exports = { testEndpoint, runValidation };
