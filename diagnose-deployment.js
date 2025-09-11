#!/usr/bin/env node

const https = require('https');
const http = require('http');

console.log('🔍 DIAGNOSING FLOWORX DEPLOYMENT');
console.log('================================');

// Test different endpoints
const endpoints = [
  'https://app.floworx-iq.com',
  'https://app.floworx-iq.com/api/health',
  'https://app.floworx-iq.com/api/status',
  'http://app.floworx-iq.com',
  'http://app.floworx-iq.com/api/health'
];

async function testEndpoint(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          headers: res.headers,
          body: data.substring(0, 200) // First 200 chars
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

async function diagnose() {
  console.log('\n🌐 Testing endpoints...\n');
  
  for (const endpoint of endpoints) {
    console.log(`Testing: ${endpoint}`);
    const result = await testEndpoint(endpoint);
    
    if (result.error) {
      console.log(`❌ Error: ${result.error} (${result.code || 'Unknown'})`);
    } else {
      console.log(`✅ Status: ${result.status}`);
      if (result.headers['content-type']) {
        console.log(`   Content-Type: ${result.headers['content-type']}`);
      }
      if (result.body) {
        console.log(`   Body: ${result.body.replace(/\n/g, ' ')}`);
      }
    }
    console.log('');
  }
  
  console.log('🔍 DIAGNOSIS COMPLETE');
  console.log('\n💡 Common issues and solutions:');
  console.log('1. Container not running - Check Coolify logs');
  console.log('2. Port not exposed - Verify Dockerfile EXPOSE directive');
  console.log('3. Environment variables missing - Check .env configuration');
  console.log('4. Database connection issues - Verify Supabase settings');
  console.log('5. SSL/Domain issues - Check Coolify domain configuration');
}

diagnose().catch(console.error);
