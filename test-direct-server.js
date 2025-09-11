#!/usr/bin/env node

const http = require('http');
const https = require('https');

console.log('🔍 TESTING DIRECT SERVER CONNECTION');
console.log('===================================');

const serverIP = '72.60.121.93';
const testEndpoints = [
  `http://${serverIP}:5001/api/health`,
  `http://${serverIP}:5001`,
  `http://${serverIP}:3000/api/health`,
  `http://${serverIP}:3000`,
  `http://${serverIP}:8080/api/health`,
  `http://${serverIP}:8080`,
  `http://${serverIP}:80/api/health`,
  `http://${serverIP}:80`
];

async function testEndpoint(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          headers: res.headers,
          body: data.substring(0, 200)
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

async function testDirectConnection() {
  console.log(`\n🌐 Testing direct connection to server: ${serverIP}\n`);
  
  for (const endpoint of testEndpoints) {
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
  
  console.log('🔍 DIRECT CONNECTION TEST COMPLETE');
}

testDirectConnection().catch(console.error);
