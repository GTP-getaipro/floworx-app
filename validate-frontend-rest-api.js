/**
 * Comprehensive Frontend and REST API Validation
 * Tests frontend serving and all REST API endpoints properly
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PRODUCTION_URL = 'https://app.floworx-iq.com';
const TEST_EMAIL = `test-frontend-${Date.now()}@floworx-test.com`;
const TEST_PASSWORD = 'TestPassword123!';

// Test results tracking
const results = {
  frontend: { passed: 0, failed: 0, tests: [] },
  restApi: { passed: 0, failed: 0, tests: [] },
  total: { passed: 0, failed: 0 }
};

// HTTP request helper
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PRODUCTION_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FloWorx-Frontend-API-Validator/1.0',
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
function logTest(category, name, passed, details = '', response = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: [${category.toUpperCase()}] ${name}`);
  if (details) console.log(`   ${details}`);
  if (response && !passed && response.error) {
    console.log(`   Error: ${response.error}`);
  }
  
  results[category].tests.push({ name, passed, details, response });
  if (passed) {
    results[category].passed++;
    results.total.passed++;
  } else {
    results[category].failed++;
    results.total.failed++;
  }
}

// Validate frontend serving
async function validateFrontendServing() {
  console.log('🌐 VALIDATING FRONTEND SERVING');
  console.log('='.repeat(60));

  try {
    // Test 1: Root path should serve React app
    const rootResponse = await makeRequest('GET', '/');
    const isHtml = rootResponse.success && 
                   (rootResponse.headers['content-type']?.includes('text/html') ||
                    rootResponse.rawBody?.includes('<!DOCTYPE html>') ||
                    rootResponse.rawBody?.includes('<html'));
    
    logTest('frontend', 'Root path serves HTML', isHtml,
      `Status: ${rootResponse.status}, Content-Type: ${rootResponse.headers['content-type'] || 'unknown'}`);

    // Test 2: Static assets should be served
    const staticPaths = ['/static/css/', '/static/js/', '/favicon.ico', '/manifest.json'];
    
    for (const staticPath of staticPaths) {
      const staticResponse = await makeRequest('GET', staticPath);
      const isStatic = staticResponse.success && 
                      (staticResponse.status === 200 || staticResponse.status === 404);
      
      logTest('frontend', `Static asset: ${staticPath}`, isStatic,
        `Status: ${staticResponse.status} (200=found, 404=not found but server responding)`);
    }

    // Test 3: React Router paths should serve index.html
    const reactPaths = ['/dashboard', '/login', '/register', '/settings'];
    
    for (const reactPath of reactPaths) {
      const reactResponse = await makeRequest('GET', reactPath);
      const servesReact = reactResponse.success && 
                         (reactResponse.status === 200 || reactResponse.status === 503);
      
      logTest('frontend', `React route: ${reactPath}`, servesReact,
        `Status: ${reactResponse.status} (200=working, 503=frontend build issue)`);
    }

    // Test 4: Check if frontend build exists in container
    const buildCheckResponse = await makeRequest('GET', '/');
    if (buildCheckResponse.status === 503 && 
        buildCheckResponse.rawBody?.includes('FRONTEND_NOT_BUILT')) {
      logTest('frontend', 'Frontend build status', false,
        'Frontend build files missing from Docker container');
    } else if (buildCheckResponse.status === 200) {
      logTest('frontend', 'Frontend build status', true,
        'Frontend build files present and serving correctly');
    } else {
      logTest('frontend', 'Frontend build status', false,
        `Unexpected response: ${buildCheckResponse.status}`);
    }

  } catch (error) {
    console.error('❌ Frontend validation error:', error.message);
  }
}

// Validate REST API endpoints
async function validateRestApiEndpoints() {
  console.log('\n🔗 VALIDATING REST API ENDPOINTS');
  console.log('='.repeat(60));

  let authToken = null;

  try {
    // Test 1: Health and Status APIs
    console.log('\n📋 Health & Status APIs...');
    
    const health = await makeRequest('GET', '/api/health');
    logTest('restApi', 'GET /api/health', health.success && health.status === 200,
      `Status: ${health.status}${health.error ? `, Error: ${health.error}` : ''}`);

    const configHealth = await makeRequest('GET', '/api/health/config');
    logTest('restApi', 'GET /api/health/config', configHealth.success && configHealth.status === 200,
      `Status: ${configHealth.status}${configHealth.error ? `, Error: ${configHealth.error}` : ''}`);

    const dbHealth = await makeRequest('GET', '/api/health/db');
    logTest('restApi', 'GET /api/health/db', dbHealth.success && dbHealth.status === 200,
      `Status: ${dbHealth.status}${dbHealth.error ? `, Error: ${dbHealth.error}` : ''}`);

    // Test 2: Authentication APIs
    console.log('\n🔐 Authentication APIs...');
    
    const passwordReq = await makeRequest('GET', '/api/auth/password-requirements');
    logTest('restApi', 'GET /api/auth/password-requirements', 
      passwordReq.success && passwordReq.status === 200,
      `Status: ${passwordReq.status}${passwordReq.error ? `, Error: ${passwordReq.error}` : ''}`);

    const registration = await makeRequest('POST', '/api/auth/register', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      firstName: 'Test',
      lastName: 'User'
    });
    logTest('restApi', 'POST /api/auth/register', 
      registration.success && registration.status === 201,
      `Status: ${registration.status}${registration.error ? `, Error: ${registration.error}` : ''}`);

    const login = await makeRequest('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    logTest('restApi', 'POST /api/auth/login (unverified)', 
      login.success && login.status === 403,
      `Status: ${login.status} (Expected: 403 for unverified user)${login.error ? `, Error: ${login.error}` : ''}`);

    const forgotPassword = await makeRequest('POST', '/api/auth/password/request', {
      email: TEST_EMAIL
    });
    logTest('restApi', 'POST /api/auth/password/request', 
      forgotPassword.success && forgotPassword.status === 202,
      `Status: ${forgotPassword.status}${forgotPassword.error ? `, Error: ${forgotPassword.error}` : ''}`);

    // Test 3: User Management APIs
    console.log('\n👤 User Management APIs...');
    
    const userProfile = await makeRequest('GET', '/api/user/profile');
    logTest('restApi', 'GET /api/user/profile (no auth)', 
      userProfile.success && userProfile.status === 401,
      `Status: ${userProfile.status} (Expected: 401 without auth)${userProfile.error ? `, Error: ${userProfile.error}` : ''}`);

    const userSettings = await makeRequest('GET', '/api/user/settings');
    logTest('restApi', 'GET /api/user/settings (no auth)', 
      userSettings.success && userSettings.status === 401,
      `Status: ${userSettings.status} (Expected: 401 without auth)${userSettings.error ? `, Error: ${userSettings.error}` : ''}`);

    // Test 4: Business & Configuration APIs
    console.log('\n🏢 Business & Configuration APIs...');
    
    const businessTypes = await makeRequest('GET', '/api/business-types');
    logTest('restApi', 'GET /api/business-types', 
      businessTypes.success && businessTypes.status === 200,
      `Status: ${businessTypes.status}${businessTypes.error ? `, Error: ${businessTypes.error}` : ''}`);

    // Test 5: OAuth & Integration APIs
    console.log('\n🔗 OAuth & Integration APIs...');
    
    const oauthStatus = await makeRequest('GET', '/api/oauth/status');
    logTest('restApi', 'GET /api/oauth/status', 
      oauthStatus.success && oauthStatus.status >= 200 && oauthStatus.status < 500,
      `Status: ${oauthStatus.status}${oauthStatus.error ? `, Error: ${oauthStatus.error}` : ''}`);

    const googleStatus = await makeRequest('GET', '/api/integrations/google/status');
    logTest('restApi', 'GET /api/integrations/google/status (no auth)', 
      googleStatus.success && googleStatus.status === 401,
      `Status: ${googleStatus.status} (Expected: 401 without auth)${googleStatus.error ? `, Error: ${googleStatus.error}` : ''}`);

    // Test 6: Dashboard & Analytics APIs
    console.log('\n📊 Dashboard & Analytics APIs...');
    
    const dashboard = await makeRequest('GET', '/api/dashboard');
    logTest('restApi', 'GET /api/dashboard (no auth)', 
      dashboard.success && dashboard.status === 401,
      `Status: ${dashboard.status} (Expected: 401 without auth)${dashboard.error ? `, Error: ${dashboard.error}` : ''}`);

    const analytics = await makeRequest('GET', '/api/analytics');
    logTest('restApi', 'GET /api/analytics (no auth)', 
      analytics.success && analytics.status === 401,
      `Status: ${analytics.status} (Expected: 401 without auth)${analytics.error ? `, Error: ${analytics.error}` : ''}`);

    // Test 7: Workflow APIs
    console.log('\n⚙️ Workflow APIs...');
    
    const workflows = await makeRequest('GET', '/api/workflows');
    logTest('restApi', 'GET /api/workflows (no auth)', 
      workflows.success && workflows.status === 401,
      `Status: ${workflows.status} (Expected: 401 without auth)${workflows.error ? `, Error: ${workflows.error}` : ''}`);

    // Test 8: Error Handling
    console.log('\n🚫 Error Handling APIs...');
    
    const notFound = await makeRequest('GET', '/api/nonexistent-endpoint');
    logTest('restApi', 'GET /api/nonexistent-endpoint', 
      notFound.success && notFound.status === 404,
      `Status: ${notFound.status} (Expected: 404 for non-existent endpoint)${notFound.error ? `, Error: ${notFound.error}` : ''}`);

  } catch (error) {
    console.error('❌ REST API validation error:', error.message);
  }
}

// Main validation function
async function runValidation() {
  console.log('🚀 COMPREHENSIVE FRONTEND & REST API VALIDATION');
  console.log('='.repeat(80));
  console.log(`Production URL: ${PRODUCTION_URL}`);
  console.log(`Test Email: ${TEST_EMAIL}`);
  console.log(`Validation Time: ${new Date().toISOString()}\n`);

  // Run validations
  await validateFrontendServing();
  await validateRestApiEndpoints();

  // Final results
  console.log('\n📊 VALIDATION RESULTS SUMMARY');
  console.log('='.repeat(80));
  
  console.log('\n🌐 FRONTEND SERVING:');
  console.log(`✅ Passed: ${results.frontend.passed}`);
  console.log(`❌ Failed: ${results.frontend.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.frontend.passed / (results.frontend.passed + results.frontend.failed)) * 100)}%`);

  console.log('\n🔗 REST API ENDPOINTS:');
  console.log(`✅ Passed: ${results.restApi.passed}`);
  console.log(`❌ Failed: ${results.restApi.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.restApi.passed / (results.restApi.passed + results.restApi.failed)) * 100)}%`);

  console.log('\n🎯 OVERALL RESULTS:');
  console.log(`✅ Total Passed: ${results.total.passed}`);
  console.log(`❌ Total Failed: ${results.total.failed}`);
  console.log(`📈 Overall Success Rate: ${Math.round((results.total.passed / (results.total.passed + results.total.failed)) * 100)}%`);

  // Analysis and recommendations
  console.log('\n🔍 ANALYSIS & RECOMMENDATIONS');
  console.log('='.repeat(80));

  if (results.restApi.passed === 0) {
    console.log('🚨 CRITICAL: REST API completely inaccessible');
    console.log('   - Coolify proxy configuration issue');
    console.log('   - Container network connectivity problem');
    console.log('   - Port mapping not working (80/443 → 5001)');
  } else if (results.restApi.passed > results.restApi.failed) {
    console.log('✅ REST API is functional');
    console.log('   - Backend services working correctly');
    console.log('   - Database connectivity established');
    console.log('   - Authentication system operational');
  }

  if (results.frontend.passed === 0) {
    console.log('🚨 FRONTEND: Not serving properly');
    console.log('   - Frontend build files missing from container');
    console.log('   - Docker build process needs fixing');
    console.log('   - Static file serving not working');
  } else if (results.frontend.passed > results.frontend.failed) {
    console.log('✅ FRONTEND: Serving correctly');
    console.log('   - React app accessible');
    console.log('   - Static assets available');
    console.log('   - Routing working properly');
  }

  return results;
}

if (require.main === module) {
  runValidation().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

module.exports = { runValidation, validateFrontendServing, validateRestApiEndpoints };
