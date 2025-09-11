#!/usr/bin/env node

const https = require('https');

console.log('🔍 VALIDATING ACTUAL IMPLEMENTED ENDPOINTS');
console.log('==========================================');

const BASE_URL = 'https://app.floworx-iq.com';

async function testEndpoint(url, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve) => {
    const client = https;
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      timeout: 15000,
      headers: {
        'User-Agent': 'FloWorx-Endpoint-Validator/1.0',
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

async function validateActualEndpoints() {
  console.log('\n🎯 TESTING ACTUALLY IMPLEMENTED ENDPOINTS');
  console.log('=========================================');
  
  const endpoints = [
    // Health endpoints (confirmed working)
    { path: '/api/health', method: 'GET', desc: 'Main Health Check', expected: 200 },
    { path: '/api/health/db', method: 'GET', desc: 'Database Health', expected: 200 },
    { path: '/api/health/cache', method: 'GET', desc: 'Cache Health', expected: [200, 503] },
    
    // Business types (confirmed working)
    { path: '/api/business-types', method: 'GET', desc: 'Business Types List', expected: 200 },
    
    // Performance (confirmed working)
    { path: '/api/performance', method: 'GET', desc: 'Performance Metrics', expected: 200 },
    
    // Auth endpoints (rate limited but exist)
    { path: '/api/auth/register', method: 'POST', desc: 'User Registration', 
      data: { email: 'test@example.com', password: 'Test123!', firstName: 'Test', lastName: 'User' },
      expected: [400, 429] },
    { path: '/api/auth/login', method: 'POST', desc: 'User Login',
      data: { email: 'test@example.com', password: 'Test123!' },
      expected: [401, 429] },
    { path: '/api/auth/password-requirements', method: 'GET', desc: 'Password Requirements', expected: [200, 429] },
    
    // OAuth endpoints (confirmed redirects)
    { path: '/api/oauth/google', method: 'GET', desc: 'Google OAuth', expected: 302 },
    { path: '/api/oauth/google/callback', method: 'GET', desc: 'OAuth Callback', expected: 302 },
    
    // User endpoints (require auth)
    { path: '/api/user/status', method: 'GET', desc: 'User Status', expected: 401 },
    { path: '/api/user/profile', method: 'GET', desc: 'User Profile', expected: 401 },
    
    // Dashboard (require auth)
    { path: '/api/dashboard', method: 'GET', desc: 'Dashboard Data', expected: 401 },
    
    // Onboarding (actual implemented endpoints)
    { path: '/api/onboarding/status', method: 'GET', desc: 'Onboarding Status', expected: 401 },
    { path: '/api/onboarding/gmail-labels', method: 'GET', desc: 'Gmail Labels', expected: 401 },
    { path: '/api/onboarding/step/business-categories', method: 'POST', desc: 'Business Categories',
      data: { categories: ['customer_service'] }, expected: 401 },
    { path: '/api/onboarding/step/label-mapping', method: 'POST', desc: 'Label Mapping',
      data: { mappings: [] }, expected: 401 },
    { path: '/api/onboarding/step/team-setup', method: 'POST', desc: 'Team Setup',
      data: { teamMembers: [] }, expected: 401 },
    
    // Workflows (actual implemented endpoints)
    { path: '/api/workflows/health', method: 'GET', desc: 'Workflow Health', expected: 401 },
    { path: '/api/workflows/status', method: 'GET', desc: 'Workflow Status', expected: 401 },
    { path: '/api/workflows/deploy', method: 'POST', desc: 'Deploy Workflow', expected: 401 },
    
    // Analytics (require auth)
    { path: '/api/analytics/dashboard', method: 'GET', desc: 'Analytics Dashboard', expected: 401 },
    { path: '/api/analytics/funnel', method: 'GET', desc: 'Onboarding Funnel', expected: 401 },
    { path: '/api/analytics/conversion', method: 'GET', desc: 'Conversion Analytics', expected: 401 },
    { path: '/api/analytics/behavior', method: 'GET', desc: 'User Behavior', expected: 401 },
    { path: '/api/analytics/realtime', method: 'GET', desc: 'Real-time Metrics', expected: 401 },
    
    // Performance (some require auth)
    { path: '/api/performance/endpoints', method: 'GET', desc: 'Endpoint Performance', expected: 401 },
    { path: '/api/performance/system', method: 'GET', desc: 'System Performance', expected: 401 }
  ];
  
  const results = [];
  let workingCount = 0;
  let expectedCount = 0;
  let rateLimitedCount = 0;
  let unexpectedCount = 0;
  
  for (const endpoint of endpoints) {
    console.log(`\nTesting: ${endpoint.desc}`);
    console.log(`${endpoint.method} ${endpoint.path}`);
    
    const result = await testEndpoint(`${BASE_URL}${endpoint.path}`, endpoint.method, endpoint.data);
    results.push({ ...endpoint, result });
    
    if (result.success) {
      const expectedStatuses = Array.isArray(endpoint.expected) ? endpoint.expected : [endpoint.expected];
      
      if (expectedStatuses.includes(result.status)) {
        console.log(`✅ ${result.status} - Expected response`);
        expectedCount++;
        if (result.status === 200) workingCount++;
      } else if (result.status === 429) {
        console.log(`🚫 ${result.status} - Rate limited (restart needed)`);
        rateLimitedCount++;
      } else {
        console.log(`⚠️ ${result.status} - Unexpected (expected ${endpoint.expected})`);
        unexpectedCount++;
      }
      
      // Show response preview for successful endpoints
      if (result.status === 200 && result.body) {
        const preview = result.body.substring(0, 100).replace(/\n/g, ' ');
        console.log(`   Response: ${preview}${result.body.length > 100 ? '...' : ''}`);
      }
    } else {
      console.log(`❌ ${result.error}`);
      unexpectedCount++;
    }
  }
  
  return { results, workingCount, expectedCount, rateLimitedCount, unexpectedCount };
}

async function runValidation() {
  console.log('🚀 Starting validation of actual implemented endpoints...\n');
  
  const { results, workingCount, expectedCount, rateLimitedCount, unexpectedCount } = await validateActualEndpoints();
  
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('=====================');
  console.log(`Total endpoints tested: ${results.length}`);
  console.log(`✅ Fully working (200): ${workingCount}`);
  console.log(`✅ Expected responses: ${expectedCount}`);
  console.log(`🚫 Rate limited (429): ${rateLimitedCount}`);
  console.log(`⚠️ Unexpected responses: ${unexpectedCount}`);
  
  const successRate = ((expectedCount / results.length) * 100).toFixed(1);
  console.log(`📈 Success rate: ${successRate}%`);
  
  console.log('\n🎯 KEY FINDINGS');
  console.log('===============');
  
  if (rateLimitedCount > 0) {
    console.log('🚨 RATE LIMITING ISSUE:');
    console.log(`   ${rateLimitedCount} endpoints are rate limited`);
    console.log('   SOLUTION: Restart application in Coolify');
  }
  
  if (workingCount > 0) {
    console.log('✅ WORKING ENDPOINTS:');
    console.log(`   ${workingCount} endpoints returning 200 OK`);
    console.log('   Core application infrastructure is functional');
  }
  
  console.log('\n📋 ENDPOINT STATUS BY CATEGORY');
  console.log('==============================');
  
  const categories = {
    'Health': results.filter(r => r.path.includes('/health')),
    'Auth': results.filter(r => r.path.includes('/auth')),
    'User': results.filter(r => r.path.includes('/user')),
    'Dashboard': results.filter(r => r.path.includes('/dashboard')),
    'OAuth': results.filter(r => r.path.includes('/oauth')),
    'Onboarding': results.filter(r => r.path.includes('/onboarding')),
    'Workflows': results.filter(r => r.path.includes('/workflows')),
    'Analytics': results.filter(r => r.path.includes('/analytics')),
    'Performance': results.filter(r => r.path.includes('/performance')),
    'Business': results.filter(r => r.path.includes('/business'))
  };
  
  for (const [category, endpoints] of Object.entries(categories)) {
    if (endpoints.length > 0) {
      const working = endpoints.filter(e => e.result.success && e.result.status === 200).length;
      const expected = endpoints.filter(e => {
        const expectedStatuses = Array.isArray(e.expected) ? e.expected : [e.expected];
        return e.result.success && expectedStatuses.includes(e.result.status);
      }).length;
      
      console.log(`${category}: ${expected}/${endpoints.length} working as expected`);
    }
  }
  
  console.log('\n🚀 NEXT STEPS');
  console.log('=============');
  
  if (rateLimitedCount > 0) {
    console.log('1. 🚨 IMMEDIATE: Restart application in Coolify to clear rate limits');
    console.log('2. 🧪 TEST: Try user registration and login after restart');
  }
  
  if (workingCount >= 3) {
    console.log('3. ✅ GOOD: Core infrastructure is working');
    console.log('4. 🔧 ENHANCE: Add missing endpoint implementations');
  }
  
  console.log('5. 📊 MONITOR: Set up endpoint monitoring and alerting');
  console.log('6. 🧪 AUTOMATE: Create automated endpoint testing');
}

runValidation().catch(console.error);
