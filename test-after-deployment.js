#!/usr/bin/env node

const http = require('http');
const https = require('https');

console.log('🚀 POST-DEPLOYMENT TEST');
console.log('=======================');
console.log('Container was just deployed at 03:38:40');
console.log('Testing if application is now accessible...\n');

async function testEndpoint(url, timeout = 10000) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          headers: res.headers,
          body: data,
          success: true
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        url,
        error: error.message,
        code: error.code,
        success: false
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        error: 'Request timeout',
        code: 'TIMEOUT',
        success: false
      });
    });
  });
}

async function testPostDeployment() {
  const tests = [
    'https://app.floworx-iq.com/api/health',
    'https://app.floworx-iq.com',
    'http://72.60.121.93:5001/api/health',
    'http://72.60.121.93:5001'
  ];
  
  console.log('🔍 Testing endpoints after fresh deployment...\n');
  
  for (const url of tests) {
    console.log(`Testing: ${url}`);
    const result = await testEndpoint(url);
    
    if (result.success) {
      console.log(`✅ Status: ${result.status}`);
      if (result.headers['content-type']) {
        console.log(`   Content-Type: ${result.headers['content-type']}`);
      }
      if (result.body && result.body.trim()) {
        const body = result.body.replace(/\s+/g, ' ').substring(0, 200);
        console.log(`   Body: ${body}${result.body.length > 200 ? '...' : ''}`);
      }
      
      // If we get a successful health check, the app is working!
      if (url.includes('/api/health') && result.status === 200) {
        console.log('\n🎉 SUCCESS! Application is now responding!');
        return true;
      }
    } else {
      console.log(`❌ Error: ${result.error} (${result.code})`);
    }
    console.log('');
    
    // Wait a bit between tests to give container time to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return false;
}

async function waitAndTest() {
  console.log('⏳ Waiting 10 seconds for container to fully start...\n');
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  const success = await testPostDeployment();
  
  if (!success) {
    console.log('⚠️  Application still not responding after deployment.');
    console.log('   This suggests the container is starting but the application');
    console.log('   inside is failing to start properly.');
    console.log('\n📋 Next steps:');
    console.log('   1. Check Coolify application logs for startup errors');
    console.log('   2. Look for database connection issues');
    console.log('   3. Check environment variables');
    console.log('   4. Verify health check configuration');
  }
}

waitAndTest().catch(console.error);
