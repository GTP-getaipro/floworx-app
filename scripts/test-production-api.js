#!/usr/bin/env node

/**
 * Production API Endpoint Testing
 * Tests critical API endpoints against the deployed Vercel app
 */

const https = require('https');
const http = require('http');

const PRODUCTION_URL = 'https://floworx-gxl5ke7q0-floworxdevelopers-projects.vercel.app';

console.log('🌐 PRODUCTION API ENDPOINT TESTING');
console.log('===================================');
console.log('Testing URL:', PRODUCTION_URL);
console.log('');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FloWorx-API-Test/1.0',
        ...options.headers
      }
    };

    const req = protocol.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testEndpoint(name, path, options = {}) {
  console.log(`🔍 Testing ${name}...`);
  
  try {
    const url = `${PRODUCTION_URL}${path}`;
    const response = await makeRequest(url, options);
    
    const status = response.statusCode;
    const statusText = status < 300 ? '✅' : status < 400 ? '⚠️' : '❌';
    
    console.log(`   Status: ${statusText} ${status}`);
    
    if (response.parseError) {
      console.log(`   Parse Error: ${response.parseError}`);
      console.log(`   Raw Response: ${response.data.substring(0, 200)}...`);
    } else if (response.data) {
      if (response.data.error) {
        console.log(`   Error: ${response.data.error}`);
      }
      if (response.data.message) {
        console.log(`   Message: ${response.data.message}`);
      }
    }
    
    return { name, status, success: status < 400, response };
  } catch (error) {
    console.log(`   ❌ Request Failed: ${error.message}`);
    return { name, status: 0, success: false, error: error.message };
  }
}

async function runAPITests() {
  console.log('Starting API endpoint tests...\n');
  
  const tests = [
    // Basic health check
    {
      name: 'Health Check',
      path: '/api/health',
      options: { method: 'GET' }
    },
    
    // Authentication endpoints
    {
      name: 'User Registration',
      path: '/api/auth/register',
      options: {
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User'
        }
      }
    },
    
    {
      name: 'User Login',
      path: '/api/auth/login',
      options: {
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'TestPassword123!'
        }
      }
    },
    
    // OAuth endpoints
    {
      name: 'Google OAuth Initiate',
      path: '/api/oauth/google',
      options: { method: 'GET' }
    },
    
    // Dashboard endpoint (should require auth)
    {
      name: 'Dashboard Data',
      path: '/api/dashboard',
      options: { method: 'GET' }
    },
    
    // Database connection test
    {
      name: 'Database Test',
      path: '/api/test/database',
      options: { method: 'GET' }
    }
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test.name, test.path, test.options);
    results.push(result);
    console.log(''); // Add spacing between tests
  }
  
  // Summary
  console.log('📊 TEST SUMMARY:');
  console.log('================');
  
  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${result.name}: ${status} (${result.status})`);
  });
  
  const passCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\nOverall: ${passCount}/${totalCount} tests passed`);
  
  if (passCount < totalCount) {
    console.log('\n🔧 ISSUES DETECTED:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`- ${result.name}: ${result.error || `HTTP ${result.status}`}`);
    });
  }
  
  return results;
}

// Run the tests
runAPITests().catch(console.error);
