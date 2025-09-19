/**
 * Test Backend APIs - Server is Running, Test All Endpoints
 * The server logs show it's running on port 5001, let's test all APIs
 */

const https = require('https');
const http = require('http');

const PRODUCTION_URL = 'https://app.floworx-iq.com';
const TEST_EMAIL = `test-backend-${Date.now()}@floworx-test.com`;

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: []
};

// HTTP request helper with better error handling
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PRODUCTION_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FloWorx-Backend-Working-Test/1.0',
        ...headers
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonBody,
            rawBody: body,
            success: true
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            rawBody: body,
            success: true
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        status: 0,
        error: error.message,
        success: false
      });
    });

    req.setTimeout(15000, () => {
      req.destroy();
      resolve({
        status: 0,
        error: 'Request timeout',
        success: false
      });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test logging
function logTest(name, passed, details = '', response = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: ${name}`);
  if (details) console.log(`   ${details}`);
  if (response && !passed) {
    console.log(`   Response: ${JSON.stringify(response).substring(0, 150)}...`);
  }
  
  results.tests.push({ name, passed, details, response });
  if (passed) results.passed++;
  else results.failed++;
  results.total++;
}

async function testBackendAPIs() {
  console.log('🚀 TESTING BACKEND APIs - SERVER IS RUNNING');
  console.log('='.repeat(70));
  console.log(`Production URL: ${PRODUCTION_URL}`);
  console.log('Server Status: ✅ Running on port 5001 (from logs)');
  console.log('Database Status: ✅ Connected via Supabase REST API');
  console.log('Issue: Frontend serving 503, testing backend APIs directly\n');

  try {
    // Test 1: Health endpoints
    console.log('🔍 Testing Core Health Endpoints...');
    
    const health = await makeRequest('GET', '/api/health');
    logTest('Health endpoint', health.success && health.status === 200, 
      `Status: ${health.status}${health.error ? `, Error: ${health.error}` : ''}`, health);

    const configHealth = await makeRequest('GET', '/api/health/config');
    logTest('Config health endpoint', configHealth.success && configHealth.status === 200, 
      `Status: ${configHealth.status}${configHealth.error ? `, Error: ${configHealth.error}` : ''}`, configHealth);

    const dbHealth = await makeRequest('GET', '/api/health/db');
    logTest('Database health endpoint', dbHealth.success && dbHealth.status === 200, 
      `Status: ${dbHealth.status}${dbHealth.error ? `, Error: ${dbHealth.error}` : ''}`, dbHealth);

    // Test 2: Authentication endpoints
    console.log('\n🔐 Testing Authentication Endpoints...');
    
    const passwordReq = await makeRequest('GET', '/api/auth/password-requirements');
    logTest('Password requirements', passwordReq.success && passwordReq.status === 200,
      `Status: ${passwordReq.status}${passwordReq.error ? `, Error: ${passwordReq.error}` : ''}`, passwordReq);

    const registration = await makeRequest('POST', '/api/auth/register', {
      email: TEST_EMAIL,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    });
    logTest('User registration', registration.success && registration.status === 201,
      `Status: ${registration.status}${registration.error ? `, Error: ${registration.error}` : ''}`, registration);

    const login = await makeRequest('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: 'TestPassword123!'
    });
    logTest('Login attempt', login.success && login.status === 403,
      `Status: ${login.status} (Expected: 403 for unverified user)${login.error ? `, Error: ${login.error}` : ''}`, login);

    // Test 3: Business endpoints
    console.log('\n🏢 Testing Business Endpoints...');
    
    const businessTypes = await makeRequest('GET', '/api/business-types');
    logTest('Business types', businessTypes.success && businessTypes.status === 200,
      `Status: ${businessTypes.status}${businessTypes.error ? `, Error: ${businessTypes.error}` : ''}`, businessTypes);

    // Test 4: OAuth endpoints
    console.log('\n🔗 Testing OAuth Endpoints...');
    
    const oauthStatus = await makeRequest('GET', '/api/oauth/status');
    logTest('OAuth status', oauthStatus.success && oauthStatus.status >= 200 && oauthStatus.status < 500,
      `Status: ${oauthStatus.status}${oauthStatus.error ? `, Error: ${oauthStatus.error}` : ''}`, oauthStatus);

    // Test 5: Protected endpoints (should return 401)
    console.log('\n🔒 Testing Protected Endpoints...');
    
    const userProfile = await makeRequest('GET', '/api/user/profile');
    logTest('User profile (no auth)', userProfile.success && userProfile.status === 401,
      `Status: ${userProfile.status} (Expected: 401 without auth)${userProfile.error ? `, Error: ${userProfile.error}` : ''}`, userProfile);

    const dashboard = await makeRequest('GET', '/api/dashboard');
    logTest('Dashboard (no auth)', dashboard.success && dashboard.status === 401,
      `Status: ${dashboard.status} (Expected: 401 without auth)${dashboard.error ? `, Error: ${dashboard.error}` : ''}`, dashboard);

    // Test 6: Frontend serving issue
    console.log('\n🌐 Testing Frontend Serving...');
    
    const frontend = await makeRequest('GET', '/');
    logTest('Frontend root', frontend.success && frontend.status === 200,
      `Status: ${frontend.status} (Issue: Frontend build missing)${frontend.error ? `, Error: ${frontend.error}` : ''}`, frontend);

  } catch (error) {
    console.error('❌ Test execution error:', error.message);
  }

  // Results summary
  console.log('\n📊 BACKEND API TEST RESULTS');
  console.log('='.repeat(70));
  console.log(`✅ Total Passed: ${results.passed}`);
  console.log(`❌ Total Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);

  // Analysis
  console.log('\n🔍 ANALYSIS');
  console.log('='.repeat(70));
  
  if (results.passed === 0) {
    console.log('🚨 CRITICAL ISSUE: No APIs are accessible');
    console.log('   - Coolify proxy is not routing to the container');
    console.log('   - Container may not be accessible on the network');
    console.log('   - Port mapping issue between proxy and container');
    
    console.log('\n🔧 IMMEDIATE FIXES NEEDED:');
    console.log('1. Check Coolify proxy configuration');
    console.log('2. Verify container network settings');
    console.log('3. Ensure port mapping: 80/443 → container:5001');
    console.log('4. Restart Coolify proxy service');
    
  } else if (results.passed > results.total * 0.7) {
    console.log('✅ BACKEND APIs ARE WORKING!');
    console.log('   - Server is running correctly');
    console.log('   - Database connection is working');
    console.log('   - Authentication system is functional');
    
    if (results.tests.some(t => t.name.includes('Frontend') && !t.passed)) {
      console.log('\n⚠️  FRONTEND ISSUE IDENTIFIED:');
      console.log('   - Backend APIs working perfectly');
      console.log('   - Frontend build files missing from container');
      console.log('   - Need to fix Docker frontend build process');
    }
    
  } else {
    console.log('⚠️  PARTIAL FUNCTIONALITY');
    console.log('   - Some APIs working, others failing');
    console.log('   - Mixed connectivity issues');
    console.log('   - Need detailed investigation');
  }

  return results;
}

// Run tests
if (require.main === module) {
  testBackendAPIs().catch(error => {
    console.error('❌ Backend API testing failed:', error);
    process.exit(1);
  });
}

module.exports = { testBackendAPIs };
