#!/usr/bin/env node

/**
 * FloWorx 503 Error Fix Validation Script
 * 
 * This script validates that the 503 error has been resolved
 * and the application is functioning properly.
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://app.floworx-iq.com';
const TIMEOUT = 10000; // 10 seconds

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(url, timeout = TIMEOUT) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, { timeout }, (res) => {
      const responseTime = Date.now() - startTime;
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          responseTime: responseTime
        });
      });
    });
    
    req.on('error', (error) => {
      reject({
        error: error.message,
        code: error.code,
        responseTime: Date.now() - startTime
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject({
        error: 'Request timeout',
        code: 'TIMEOUT',
        responseTime: timeout
      });
    });
  });
}

async function testEndpoint(name, path, expectedStatus = 200) {
  const url = `${BASE_URL}${path}`;
  log(`\n🧪 Testing ${name}...`, colors.blue);
  log(`   URL: ${url}`);
  
  try {
    const result = await makeRequest(url);
    
    if (result.statusCode === expectedStatus) {
      log(`   ✅ SUCCESS - Status: ${result.statusCode} (${result.responseTime}ms)`, colors.green);
      
      // Try to parse JSON response for health endpoint
      if (path.includes('health')) {
        try {
          const jsonData = JSON.parse(result.data);
          log(`   📊 Response: ${JSON.stringify(jsonData)}`, colors.blue);
        } catch (e) {
          log(`   📄 Response: ${result.data.substring(0, 100)}...`, colors.blue);
        }
      }
      
      return true;
    } else {
      log(`   ❌ FAILED - Expected: ${expectedStatus}, Got: ${result.statusCode}`, colors.red);
      log(`   📄 Response: ${result.data.substring(0, 200)}...`, colors.yellow);
      return false;
    }
  } catch (error) {
    log(`   ❌ ERROR - ${error.error} (${error.responseTime}ms)`, colors.red);
    if (error.code) {
      log(`   🔍 Error Code: ${error.code}`, colors.yellow);
    }
    return false;
  }
}

async function validateFix() {
  log(`${colors.bold}🚀 FloWorx 503 Error Fix Validation${colors.reset}`);
  log(`${colors.bold}=====================================${colors.reset}`);
  log(`Target: ${BASE_URL}`);
  log(`Time: ${new Date().toISOString()}`);
  
  const tests = [
    { name: 'Health Check', path: '/api/health', expected: 200 },
    { name: 'Root Application', path: '/', expected: 200 },
    { name: 'API Base', path: '/api', expected: 404 }, // Expected 404 for base API
    { name: 'Auth Endpoint', path: '/api/auth', expected: 404 }, // Expected 404 without specific route
    { name: 'Static Assets', path: '/static/css/main.css', expected: 200 }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    const success = await testEndpoint(test.name, test.path, test.expected);
    if (success) {
      passed++;
    } else {
      failed++;
    }
  }
  
  // Summary
  log(`\n${colors.bold}📊 VALIDATION SUMMARY${colors.reset}`);
  log(`${colors.bold}===================${colors.reset}`);
  log(`✅ Passed: ${passed}`, passed > 0 ? colors.green : colors.reset);
  log(`❌ Failed: ${failed}`, failed > 0 ? colors.red : colors.reset);
  log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    log(`\n🎉 ${colors.bold}${colors.green}ALL TESTS PASSED!${colors.reset}`);
    log(`${colors.green}✅ The 503 error has been resolved successfully!${colors.reset}`);
    log(`${colors.green}✅ FloWorx application is now accessible at ${BASE_URL}${colors.reset}`);
    
    log(`\n📋 ${colors.bold}NEXT STEPS:${colors.reset}`);
    log(`1. Test user registration and login functionality`);
    log(`2. Verify email sending capabilities`);
    log(`3. Check OAuth integrations (Google)`);
    log(`4. Monitor application logs for any errors`);
    log(`5. Set up monitoring and alerts`);
    
  } else {
    log(`\n⚠️  ${colors.bold}${colors.yellow}PARTIAL SUCCESS${colors.reset}`);
    log(`${colors.yellow}Some tests failed. The application may be partially functional.${colors.reset}`);
    log(`${colors.yellow}Check the failed endpoints and Coolify logs for more details.${colors.reset}`);
    
    log(`\n🔧 ${colors.bold}TROUBLESHOOTING:${colors.reset}`);
    log(`1. Check Coolify deployment logs`);
    log(`2. Verify all environment variables are set correctly`);
    log(`3. Ensure the application container is running`);
    log(`4. Check domain DNS configuration`);
    log(`5. Verify SSL certificate is valid`);
  }
  
  log(`\n🕐 Validation completed at: ${new Date().toISOString()}`);
  
  // Exit with appropriate code
  process.exit(failed === 0 ? 0 : 1);
}

// Run validation
validateFix().catch(error => {
  log(`\n💥 ${colors.bold}${colors.red}VALIDATION SCRIPT ERROR:${colors.reset}`, colors.red);
  log(`${error.message}`, colors.red);
  process.exit(1);
});
