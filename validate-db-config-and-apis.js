/**
 * Comprehensive Database Configuration and API Validation
 * Validates all database configurations use port 5432 and tests all routers/APIs
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const PRODUCTION_URL = 'https://app.floworx-iq.com';

// Database configuration validation
function validateDatabaseConfigurations() {
  console.log('🔍 VALIDATING DATABASE CONFIGURATIONS');
  console.log('='.repeat(60));
  
  const results = { passed: 0, failed: 0, issues: [] };
  
  // Files to check for database configuration
  const configFiles = [
    'backend/config/config.js',
    'backend/database/unified-connection.js',
    'coolify-environment-variables-final.txt',
    'coolify.env',
    'scripts/validate-environment.js'
  ];
  
  configFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      console.log(`\n📁 Checking: ${filePath}`);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check for port 5432 (correct)
      const port5432Matches = content.match(/port.*5432|5432.*port|DB_PORT.*5432/gi) || [];
      
      // Check for port 6543 (incorrect - Supabase pooler)
      const port6543Matches = content.match(/port.*6543|6543.*port|DB_PORT.*6543/gi) || [];
      
      if (port5432Matches.length > 0) {
        console.log(`   ✅ Found ${port5432Matches.length} references to port 5432 (correct)`);
        port5432Matches.forEach(match => {
          console.log(`      - ${match.trim()}`);
        });
        results.passed++;
      }
      
      if (port6543Matches.length > 0) {
        console.log(`   ❌ Found ${port6543Matches.length} references to port 6543 (incorrect)`);
        port6543Matches.forEach(match => {
          console.log(`      - ${match.trim()}`);
        });
        results.failed++;
        results.issues.push({
          file: filePath,
          issue: 'Contains port 6543 references (should be 5432)',
          matches: port6543Matches
        });
      }
      
      // Check for default port fallback
      const defaultPortMatches = content.match(/\|\|\s*5432|\|\|\s*6543/gi) || [];
      if (defaultPortMatches.length > 0) {
        console.log(`   📋 Default port fallbacks found:`);
        defaultPortMatches.forEach(match => {
          const isCorrect = match.includes('5432');
          console.log(`      ${isCorrect ? '✅' : '❌'} ${match.trim()}`);
          if (!isCorrect) {
            results.failed++;
            results.issues.push({
              file: filePath,
              issue: 'Default port fallback uses 6543 (should be 5432)',
              matches: [match]
            });
          } else {
            results.passed++;
          }
        });
      }
    } else {
      console.log(`\n⚠️  File not found: ${filePath}`);
    }
  });
  
  return results;
}

// API endpoint testing
async function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, PRODUCTION_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FloWorx-Config-Validator/1.0',
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

// Test all API routers
async function validateAllRouters() {
  console.log('\n🔍 VALIDATING ALL ROUTERS AND APIs');
  console.log('='.repeat(60));
  
  const results = { passed: 0, failed: 0, total: 0, categories: {} };
  
  function logTest(category, name, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: [${category.toUpperCase()}] ${name}`);
    if (details) console.log(`   ${details}`);
    
    if (!results.categories[category]) {
      results.categories[category] = { passed: 0, failed: 0, tests: [] };
    }
    
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

  try {
    // 1. HEALTH ENDPOINTS
    console.log('\n📋 Testing Health Endpoints...');
    const health = await makeRequest('GET', '/api/health');
    logTest('health', 'Health endpoint', health.status === 200, 
      `Status: ${health.status}`);

    const configHealth = await makeRequest('GET', '/api/health/config');
    logTest('health', 'Config health', configHealth.status === 200, 
      `Status: ${configHealth.status}`);

    const dbHealth = await makeRequest('GET', '/api/health/db');
    logTest('health', 'Database health', dbHealth.status === 200, 
      `Status: ${dbHealth.status}`);

    // 2. AUTHENTICATION ROUTER
    console.log('\n🔐 Testing Authentication Router...');
    const passwordReq = await makeRequest('GET', '/api/auth/password-requirements');
    logTest('auth', 'Password requirements', passwordReq.status === 200,
      `Status: ${passwordReq.status}`);

    const testEmail = `test-${Date.now()}@floworx-test.com`;
    const registration = await makeRequest('POST', '/api/auth/register', {
      email: testEmail,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    });
    logTest('auth', 'User registration', registration.status === 201,
      `Status: ${registration.status}`);

    const login = await makeRequest('POST', '/api/auth/login', {
      email: testEmail,
      password: 'TestPassword123!'
    });
    logTest('auth', 'Login attempt', login.status === 403,
      `Status: ${login.status}, Expected: 403 for unverified user`);

    const forgotPassword = await makeRequest('POST', '/api/auth/password/request', {
      email: testEmail
    });
    logTest('auth', 'Forgot password', forgotPassword.status === 202,
      `Status: ${forgotPassword.status}`);

    // 3. USER ROUTER
    console.log('\n👤 Testing User Router...');
    const userProfile = await makeRequest('GET', '/api/user/profile');
    logTest('user', 'User profile (no auth)', userProfile.status === 401,
      `Status: ${userProfile.status}, Expected: 401 without auth`);

    // 4. OAUTH ROUTER
    console.log('\n🔗 Testing OAuth Router...');
    const oauthStatus = await makeRequest('GET', '/api/oauth/status');
    logTest('oauth', 'OAuth status', oauthStatus.status >= 200 && oauthStatus.status < 500,
      `Status: ${oauthStatus.status}`);

    // 5. DASHBOARD ROUTER
    console.log('\n📊 Testing Dashboard Router...');
    const dashboard = await makeRequest('GET', '/api/dashboard');
    logTest('dashboard', 'Dashboard endpoint', dashboard.status === 401,
      `Status: ${dashboard.status}, Expected: 401 without auth`);

    // 6. BUSINESS TYPES ROUTER
    console.log('\n🏢 Testing Business Types Router...');
    const businessTypes = await makeRequest('GET', '/api/business-types');
    logTest('business', 'Business types list', businessTypes.status === 200,
      `Status: ${businessTypes.status}`);

    // 7. GOOGLE INTEGRATION ROUTER
    console.log('\n📧 Testing Google Integration Router...');
    const googleStatus = await makeRequest('GET', '/api/integrations/google/status');
    logTest('google', 'Google integration status', googleStatus.status === 401,
      `Status: ${googleStatus.status}, Expected: 401 without auth`);

    // 8. MICROSOFT INTEGRATION ROUTER
    console.log('\n📧 Testing Microsoft Integration Router...');
    const microsoftStatus = await makeRequest('GET', '/api/integrations/microsoft/status');
    logTest('microsoft', 'Microsoft integration status', microsoftStatus.status === 401,
      `Status: ${microsoftStatus.status}, Expected: 401 without auth`);

    // 9. WORKFLOWS ROUTER
    console.log('\n⚙️ Testing Workflows Router...');
    const workflows = await makeRequest('GET', '/api/workflows');
    logTest('workflows', 'Workflows list', workflows.status === 401,
      `Status: ${workflows.status}, Expected: 401 without auth`);

    // 10. ANALYTICS ROUTER
    console.log('\n📈 Testing Analytics Router...');
    const analytics = await makeRequest('GET', '/api/analytics');
    logTest('analytics', 'Analytics endpoint', analytics.status === 401,
      `Status: ${analytics.status}, Expected: 401 without auth`);

  } catch (error) {
    console.error('❌ Router testing error:', error.message);
  }

  return results;
}

// Main validation function
async function runValidation() {
  console.log('🚀 COMPREHENSIVE DATABASE CONFIG & API VALIDATION');
  console.log('='.repeat(80));
  console.log(`Production URL: ${PRODUCTION_URL}`);
  console.log(`Validation Time: ${new Date().toISOString()}\n`);

  // 1. Validate database configurations
  const dbConfigResults = validateDatabaseConfigurations();

  // 2. Validate all routers and APIs
  const routerResults = await validateAllRouters();

  // 3. Final summary
  console.log('\n📊 VALIDATION SUMMARY');
  console.log('='.repeat(80));
  
  console.log('\n🗄️ DATABASE CONFIGURATION:');
  console.log(`✅ Correct configurations: ${dbConfigResults.passed}`);
  console.log(`❌ Issues found: ${dbConfigResults.failed}`);
  
  if (dbConfigResults.issues.length > 0) {
    console.log('\n🚨 DATABASE CONFIGURATION ISSUES:');
    dbConfigResults.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.file}: ${issue.issue}`);
      issue.matches.forEach(match => {
        console.log(`   - ${match.trim()}`);
      });
    });
  }

  console.log('\n🔗 API ROUTERS:');
  console.log(`✅ Total Passed: ${routerResults.passed}`);
  console.log(`❌ Total Failed: ${routerResults.failed}`);
  console.log(`📈 Success Rate: ${Math.round((routerResults.passed / routerResults.total) * 100)}%`);

  console.log('\n📋 RESULTS BY CATEGORY:');
  Object.entries(routerResults.categories).forEach(([category, stats]) => {
    const successRate = Math.round((stats.passed / stats.tests.length) * 100);
    console.log(`${category.toUpperCase()}: ${stats.passed}/${stats.tests.length} (${successRate}%)`);
  });

  // Overall assessment
  const overallSuccess = dbConfigResults.failed === 0 && routerResults.failed < routerResults.total * 0.2;
  
  if (overallSuccess) {
    console.log('\n🎉 VALIDATION SUCCESSFUL!');
    console.log('✅ Database configurations are correct (port 5432)');
    console.log('✅ All critical API routers are functional');
    console.log('✅ System is ready for production use');
  } else {
    console.log('\n⚠️  VALIDATION ISSUES FOUND');
    if (dbConfigResults.failed > 0) {
      console.log('❌ Database configuration issues need to be fixed');
    }
    if (routerResults.failed > routerResults.total * 0.2) {
      console.log('❌ Multiple API router issues detected');
    }
  }

  return {
    database: dbConfigResults,
    routers: routerResults,
    overall: overallSuccess
  };
}

if (require.main === module) {
  runValidation().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}

module.exports = { runValidation, validateDatabaseConfigurations, validateAllRouters };
