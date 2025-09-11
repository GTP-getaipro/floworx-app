#!/usr/bin/env node

const https = require('https');
const http = require('http');

console.log('🔐 FLOWORX AUTHENTICATION ENDPOINT VALIDATION');
console.log('=============================================');

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
        'User-Agent': 'FloWorx-Auth-Validator/1.0',
        'Accept': 'application/json, text/plain, */*',
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

async function validateAuthEndpoints() {
  console.log('\n🌐 TESTING CORE AUTHENTICATION ENDPOINTS');
  console.log('========================================');
  
  const baseUrl = 'https://app.floworx-iq.com';
  
  const endpoints = [
    // Core API endpoints
    { url: `${baseUrl}/api/health`, method: 'GET', desc: 'Health Check' },
    { url: `${baseUrl}/api/status`, method: 'GET', desc: 'Status Check' },
    
    // Authentication endpoints
    { url: `${baseUrl}/api/auth/register`, method: 'POST', desc: 'User Registration', 
      data: { email: 'test@example.com', password: 'TestPass123!', name: 'Test User' } },
    { url: `${baseUrl}/api/auth/login`, method: 'POST', desc: 'User Login',
      data: { email: 'test@example.com', password: 'TestPass123!' } },
    { url: `${baseUrl}/api/auth/logout`, method: 'POST', desc: 'User Logout' },
    { url: `${baseUrl}/api/auth/refresh`, method: 'POST', desc: 'Token Refresh' },
    
    // Password recovery
    { url: `${baseUrl}/api/auth/forgot-password`, method: 'POST', desc: 'Forgot Password',
      data: { email: 'test@example.com' } },
    { url: `${baseUrl}/api/auth/reset-password`, method: 'POST', desc: 'Reset Password',
      data: { token: 'test-token', password: 'NewPass123!' } },
    
    // Email confirmation
    { url: `${baseUrl}/api/auth/confirm-email`, method: 'POST', desc: 'Confirm Email',
      data: { token: 'test-token' } },
    { url: `${baseUrl}/api/auth/resend-confirmation`, method: 'POST', desc: 'Resend Confirmation',
      data: { email: 'test@example.com' } },
    
    // Profile endpoints
    { url: `${baseUrl}/api/auth/profile`, method: 'GET', desc: 'Get Profile' },
    { url: `${baseUrl}/api/auth/profile`, method: 'PUT', desc: 'Update Profile',
      data: { name: 'Updated Name' } },
    
    // OAuth endpoints
    { url: `${baseUrl}/api/auth/google`, method: 'GET', desc: 'Google OAuth' },
    { url: `${baseUrl}/api/auth/google/callback`, method: 'GET', desc: 'Google OAuth Callback' },
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    console.log(`\nTesting: ${endpoint.desc}`);
    console.log(`${endpoint.method} ${endpoint.url}`);
    
    const result = await testEndpoint(
      endpoint.url, 
      endpoint.method, 
      endpoint.data || null
    );
    
    results.push({ ...endpoint, result });
    
    if (result.success) {
      console.log(`✅ Status: ${result.status}`);
      
      // Analyze response
      if (result.status === 200) {
        console.log('   🎉 Endpoint is working!');
      } else if (result.status === 400) {
        console.log('   ⚠️  Bad Request (expected for test data)');
      } else if (result.status === 401) {
        console.log('   🔒 Unauthorized (expected for protected endpoints)');
      } else if (result.status === 404) {
        console.log('   ❌ Not Found - Endpoint may not exist');
      } else if (result.status === 405) {
        console.log('   ❌ Method Not Allowed');
      } else if (result.status === 500) {
        console.log('   ❌ Server Error');
      } else if (result.status === 502) {
        console.log('   ❌ Bad Gateway - Proxy issue');
      }
      
      // Show response preview
      if (result.body && result.body.trim()) {
        const bodyPreview = result.body.substring(0, 150);
        console.log(`   Response: ${bodyPreview}${result.body.length > 150 ? '...' : ''}`);
      }
      
    } else {
      console.log(`❌ Error: ${result.error} (${result.code})`);
    }
  }
  
  return results;
}

async function testFrontendPages() {
  console.log('\n🌐 TESTING FRONTEND PAGES');
  console.log('=========================');
  
  const baseUrl = 'https://app.floworx-iq.com';
  
  const pages = [
    { url: `${baseUrl}/`, desc: 'Home Page' },
    { url: `${baseUrl}/login`, desc: 'Login Page' },
    { url: `${baseUrl}/register`, desc: 'Registration Page' },
    { url: `${baseUrl}/forgot-password`, desc: 'Forgot Password Page' },
    { url: `${baseUrl}/reset-password`, desc: 'Reset Password Page' },
    { url: `${baseUrl}/confirm-email`, desc: 'Email Confirmation Page' },
    { url: `${baseUrl}/dashboard`, desc: 'Dashboard (Protected)' },
  ];
  
  for (const page of pages) {
    console.log(`\nTesting: ${page.desc}`);
    console.log(`GET ${page.url}`);
    
    const result = await testEndpoint(page.url, 'GET');
    
    if (result.success) {
      console.log(`✅ Status: ${result.status}`);
      
      if (result.status === 200) {
        console.log('   🎉 Page loads successfully!');
        
        // Check if it's HTML content
        if (result.headers['content-type'] && result.headers['content-type'].includes('text/html')) {
          console.log('   📄 HTML content detected');
          
          // Look for React app indicators
          if (result.body.includes('react') || result.body.includes('React') || result.body.includes('root')) {
            console.log('   ⚛️  React app detected');
          }
        }
      } else if (result.status === 302 || result.status === 301) {
        console.log(`   🔄 Redirect to: ${result.headers.location || 'Unknown'}`);
      } else if (result.status === 502) {
        console.log('   ❌ Bad Gateway - Proxy issue');
      }
    } else {
      console.log(`❌ Error: ${result.error}`);
    }
  }
}

async function analyzeResults(results) {
  console.log('\n📊 AUTHENTICATION ANALYSIS');
  console.log('==========================');
  
  const working = results.filter(r => r.result.success && [200, 400, 401].includes(r.result.status));
  const notFound = results.filter(r => r.result.success && r.result.status === 404);
  const serverError = results.filter(r => r.result.success && r.result.status === 500);
  const proxyError = results.filter(r => r.result.success && r.result.status === 502);
  const networkError = results.filter(r => !r.result.success);
  
  console.log(`✅ Working endpoints: ${working.length}`);
  console.log(`❌ Not found (404): ${notFound.length}`);
  console.log(`❌ Server errors (500): ${serverError.length}`);
  console.log(`❌ Proxy errors (502): ${proxyError.length}`);
  console.log(`❌ Network errors: ${networkError.length}`);
  
  if (proxyError.length > 0) {
    console.log('\n🚨 PROXY ISSUES DETECTED:');
    console.log('The application is running but Coolify proxy is misconfigured.');
    console.log('SOLUTION: Restart your application in Coolify dashboard.');
  }
  
  if (notFound.length > 0) {
    console.log('\n📋 MISSING ENDPOINTS:');
    notFound.forEach(endpoint => {
      console.log(`   - ${endpoint.method} ${endpoint.url.split('/').pop()}`);
    });
  }
  
  console.log('\n🎯 NEXT STEPS:');
  if (proxyError.length > 0) {
    console.log('1. Restart application in Coolify to fix proxy issues');
    console.log('2. Test authentication flows after restart');
    console.log('3. Check application logs for any missing route implementations');
  } else if (working.length > 0) {
    console.log('1. Authentication endpoints are responding');
    console.log('2. Test actual registration/login flows');
    console.log('3. Check email service configuration');
  } else {
    console.log('1. Fix application connectivity issues first');
    console.log('2. Ensure application is running and accessible');
  }
}

async function runValidation() {
  console.log('Starting comprehensive authentication validation...\n');
  
  const results = await validateAuthEndpoints();
  await testFrontendPages();
  await analyzeResults(results);
  
  console.log('\n🚀 VALIDATION COMPLETE');
  console.log('Check the results above to identify specific issues with authentication endpoints.');
}

runValidation().catch(console.error);
