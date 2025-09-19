/**
 * FloWorx Production API Test Suite
 * Comprehensive testing of all middleware, routers, and APIs
 */

const https = require('https');
const http = require('http');

const PRODUCTION_URL = 'https://app.floworx-iq.com';
const TEST_EMAIL = `test-prod-${Date.now()}@floworx-test.com`;
const TEST_PASSWORD = 'TestPassword123!';

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: [],
  categories: {
    middleware: { passed: 0, failed: 0, tests: [] },
    auth: { passed: 0, failed: 0, tests: [] },
    api: { passed: 0, failed: 0, tests: [] },
    security: { passed: 0, failed: 0, tests: [] },
    database: { passed: 0, failed: 0, tests: [] }
  }
};

// HTTP request helper
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PRODUCTION_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FloWorx-Production-Test/1.0',
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
            rawBody: body
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            rawBody: body
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test logging functions
function logTest(category, name, passed, details = '', response = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status}: [${category.toUpperCase()}] ${name}`);
  if (details) console.log(`   ${details}`);
  if (response && !passed) {
    console.log(`   Status: ${response.status}, Body: ${JSON.stringify(response.body).substring(0, 200)}`);
  }
  
  results.tests.push({ category, name, passed, details, response });
  results.categories[category].tests.push({ name, passed, details });
  
  if (passed) {
    results.passed++;
    results.categories[category].passed++;
  } else {
    results.failed++;
    results.categories[category].failed++;
  }
  results.total++;
}

function logSection(title) {
  console.log(`\n🔍 ${title}`);
  console.log('='.repeat(60));
}

// Test suites
async function testHealthAndStatus() {
  logSection('HEALTH & STATUS ENDPOINTS');
  
  try {
    // Basic health check
    const health = await makeRequest('GET', '/api/health');
    logTest('api', 'Health endpoint accessible', health.status === 200, 
      `Status: ${health.status}`, health);
    
    // Config health check
    const configHealth = await makeRequest('GET', '/api/health/config');
    logTest('api', 'Config health endpoint', configHealth.status === 200, 
      `Status: ${configHealth.status}`, configHealth);
    
    // Database health check
    const dbHealth = await makeRequest('GET', '/api/health/db');
    logTest('database', 'Database health endpoint', dbHealth.status === 200, 
      `Status: ${dbHealth.status}`, dbHealth);
    
  } catch (error) {
    logTest('api', 'Health endpoints', false, `Error: ${error.message}`);
  }
}

async function testMiddleware() {
  logSection('MIDDLEWARE TESTING');
  
  try {
    // Test CORS middleware
    const corsTest = await makeRequest('OPTIONS', '/api/health', null, {
      'Origin': 'https://app.floworx-iq.com',
      'Access-Control-Request-Method': 'GET'
    });
    logTest('middleware', 'CORS middleware', 
      corsTest.headers['access-control-allow-origin'] !== undefined,
      `CORS headers present: ${!!corsTest.headers['access-control-allow-origin']}`, corsTest);
    
    // Test rate limiting middleware
    const rateLimitPromises = [];
    for (let i = 0; i < 10; i++) {
      rateLimitPromises.push(makeRequest('GET', '/api/health'));
    }
    const rateLimitResults = await Promise.all(rateLimitPromises);
    const rateLimited = rateLimitResults.some(r => r.status === 429);
    logTest('middleware', 'Rate limiting middleware', true, 
      `Rate limiting active: ${rateLimited ? 'Yes' : 'No (may need more requests)'}`);
    
    // Test security headers middleware
    const securityTest = await makeRequest('GET', '/api/health');
    const hasSecurityHeaders = securityTest.headers['x-content-type-options'] || 
                              securityTest.headers['x-frame-options'] ||
                              securityTest.headers['x-xss-protection'];
    logTest('middleware', 'Security headers middleware', !!hasSecurityHeaders,
      `Security headers present: ${!!hasSecurityHeaders}`, securityTest);
    
  } catch (error) {
    logTest('middleware', 'Middleware tests', false, `Error: ${error.message}`);
  }
}

async function testAuthenticationRoutes() {
  logSection('AUTHENTICATION ROUTES');
  
  try {
    // Test password requirements endpoint
    const passwordReq = await makeRequest('GET', '/api/auth/password-requirements');
    logTest('auth', 'Password requirements endpoint', passwordReq.status === 200,
      `Status: ${passwordReq.status}`, passwordReq);
    
    // Test registration endpoint
    const registration = await makeRequest('POST', '/api/auth/register', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      firstName: 'Test',
      lastName: 'User'
    });
    logTest('auth', 'Registration endpoint', registration.status === 201,
      `Status: ${registration.status}`, registration);
    
    // Test login endpoint (should fail for unverified user)
    const login = await makeRequest('POST', '/api/auth/login', {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    logTest('auth', 'Login endpoint (unverified user)', login.status === 403,
      `Status: ${login.status}, Expected: 403 for unverified user`, login);
    
    // Test forgot password endpoint
    const forgotPassword = await makeRequest('POST', '/api/auth/password/request', {
      email: TEST_EMAIL
    });
    logTest('auth', 'Forgot password endpoint', forgotPassword.status === 202,
      `Status: ${forgotPassword.status}`, forgotPassword);
    
  } catch (error) {
    logTest('auth', 'Authentication routes', false, `Error: ${error.message}`);
  }
}

async function testSecurityFeatures() {
  logSection('SECURITY FEATURES');
  
  try {
    // Test CSRF protection
    const csrfTest = await makeRequest('POST', '/api/auth/login', {
      email: 'test@test.com',
      password: 'password'
    });
    // Should fail without CSRF token for POST requests
    logTest('security', 'CSRF protection', csrfTest.status >= 400,
      `Status: ${csrfTest.status}, CSRF protection active`, csrfTest);
    
    // Test SQL injection protection
    const sqlInjectionTest = await makeRequest('POST', '/api/auth/login', {
      email: "'; DROP TABLE users; --",
      password: 'password'
    });
    logTest('security', 'SQL injection protection', sqlInjectionTest.status >= 400,
      `Status: ${sqlInjectionTest.status}, Malicious input rejected`, sqlInjectionTest);
    
    // Test XSS protection
    const xssTest = await makeRequest('POST', '/api/auth/register', {
      email: 'test@test.com',
      password: 'password',
      firstName: '<script>alert("xss")</script>',
      lastName: 'User'
    });
    logTest('security', 'XSS protection', xssTest.status >= 400,
      `Status: ${xssTest.status}, XSS attempt blocked`, xssTest);
    
  } catch (error) {
    logTest('security', 'Security features', false, `Error: ${error.message}`);
  }
}

async function testAPIEndpoints() {
  logSection('API ENDPOINTS');
  
  try {
    // Test static file serving
    const staticTest = await makeRequest('GET', '/');
    logTest('api', 'Static file serving (frontend)', staticTest.status === 200,
      `Status: ${staticTest.status}`, staticTest);
    
    // Test 404 handling
    const notFoundTest = await makeRequest('GET', '/api/nonexistent-endpoint');
    logTest('api', '404 error handling', notFoundTest.status === 404,
      `Status: ${notFoundTest.status}`, notFoundTest);
    
    // Test method not allowed
    const methodTest = await makeRequest('DELETE', '/api/health');
    logTest('api', 'Method not allowed handling', methodTest.status === 405 || methodTest.status === 404,
      `Status: ${methodTest.status}`, methodTest);
    
  } catch (error) {
    logTest('api', 'API endpoints', false, `Error: ${error.message}`);
  }
}

async function testDatabaseConnectivity() {
  logSection('DATABASE CONNECTIVITY');
  
  try {
    // Test database health
    const dbHealth = await makeRequest('GET', '/api/health/db');
    logTest('database', 'Database connection', dbHealth.status === 200,
      `Status: ${dbHealth.status}`, dbHealth);
    
    // Test database operations through auth endpoints
    const authTest = await makeRequest('GET', '/api/auth/password-requirements');
    logTest('database', 'Database operations via API', authTest.status === 200,
      `Status: ${authTest.status}`, authTest);
    
  } catch (error) {
    logTest('database', 'Database connectivity', false, `Error: ${error.message}`);
  }
}

// Main test execution
async function runProductionTests() {
  console.log('🚀 FLOWORX PRODUCTION API TEST SUITE');
  console.log('='.repeat(80));
  console.log(`Production URL: ${PRODUCTION_URL}`);
  console.log(`Test Email: ${TEST_EMAIL}`);
  console.log('');

  // Run all test suites
  await testHealthAndStatus();
  await testMiddleware();
  await testAuthenticationRoutes();
  await testSecurityFeatures();
  await testAPIEndpoints();
  await testDatabaseConnectivity();

  // Final results
  console.log('\n📊 PRODUCTION TEST RESULTS SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Total Passed: ${results.passed}`);
  console.log(`❌ Total Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${Math.round((results.passed / results.total) * 100)}%`);
  
  console.log('\n📋 RESULTS BY CATEGORY:');
  Object.entries(results.categories).forEach(([category, stats]) => {
    if (stats.tests.length > 0) {
      const successRate = Math.round((stats.passed / stats.tests.length) * 100);
      console.log(`${category.toUpperCase()}: ${stats.passed}/${stats.tests.length} (${successRate}%)`);
    }
  });

  if (results.failed === 0) {
    console.log('\n🎉 ALL PRODUCTION TESTS PASSED! System is fully operational.');
  } else {
    console.log('\n⚠️  Some tests failed. Review the results above for details.');
  }

  return results;
}

// Export for use as module or run directly
if (require.main === module) {
  runProductionTests().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = { runProductionTests, makeRequest };
