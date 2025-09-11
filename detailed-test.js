#!/usr/bin/env node

const http = require('http');
const https = require('https');

console.log('🔍 DETAILED COOLIFY DIAGNOSIS');
console.log('=============================');

async function testEndpoint(url, options = {}) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { 
      timeout: 10000,
      headers: {
        'User-Agent': 'FloWorx-Test/1.0',
        'Accept': 'application/json, text/plain, */*',
        ...options.headers
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          headers: res.headers,
          body: data.substring(0, 500)
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        url,
        error: error.message,
        code: error.code
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        error: 'Request timeout',
        code: 'TIMEOUT'
      });
    });
  });
}

async function runDetailedTests() {
  const tests = [
    // Test HTTPS (should work with Coolify proxy)
    'https://app.floworx-iq.com',
    'https://app.floworx-iq.com/api/health',
    'https://app.floworx-iq.com/api/status',
    
    // Test HTTP (might redirect to HTTPS)
    'http://app.floworx-iq.com',
    'http://app.floworx-iq.com/api/health',
    
    // Test direct server on port 80 (Coolify proxy)
    'http://72.60.121.93',
    'http://72.60.121.93/api/health',
    
    // Test if any other common ports are open
    'http://72.60.121.93:443',
    'http://72.60.121.93:8000',
  ];
  
  console.log('\n🌐 Testing all endpoints...\n');
  
  for (const url of tests) {
    console.log(`Testing: ${url}`);
    const result = await testEndpoint(url);
    
    if (result.error) {
      console.log(`❌ Error: ${result.error} (${result.code || 'Unknown'})`);
    } else {
      console.log(`✅ Status: ${result.status}`);
      if (result.headers['content-type']) {
        console.log(`   Content-Type: ${result.headers['content-type']}`);
      }
      if (result.headers['server']) {
        console.log(`   Server: ${result.headers['server']}`);
      }
      if (result.headers['location']) {
        console.log(`   Location: ${result.headers['location']}`);
      }
      if (result.body && result.body.trim()) {
        console.log(`   Body: ${result.body.replace(/\n/g, ' ').substring(0, 200)}`);
      }
    }
    console.log('');
  }
  
  console.log('🔍 DETAILED DIAGNOSIS COMPLETE');
  console.log('\n💡 ANALYSIS:');
  console.log('- If HTTPS returns 503: Coolify proxy running but can\'t reach container');
  console.log('- If HTTP redirects to HTTPS: SSL is configured');
  console.log('- If port 80 returns 404: Proxy running but routing misconfigured');
  console.log('- If connection refused: Service not running on that port');
}

runDetailedTests().catch(console.error);
