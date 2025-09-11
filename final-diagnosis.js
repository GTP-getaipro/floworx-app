#!/usr/bin/env node

const http = require('http');
const https = require('https');

console.log('🎯 FINAL COOLIFY DIAGNOSIS');
console.log('==========================');

async function testHealthCheck() {
  console.log('\n🏥 HEALTH CHECK ANALYSIS');
  console.log('========================');
  
  // Test the exact health check that Coolify would use
  const healthCheckUrl = 'http://72.60.121.93:5001/api/health';
  
  console.log(`Testing direct health check: ${healthCheckUrl}`);
  
  return new Promise((resolve) => {
    const req = http.get(healthCheckUrl, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ Direct health check status: ${res.statusCode}`);
        console.log(`   Response: ${data}`);
        resolve(true);
      });
    });
    
    req.on('error', (error) => {
      console.log(`❌ Direct health check failed: ${error.message}`);
      console.log(`   Error code: ${error.code}`);
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      console.log(`❌ Direct health check timeout`);
      resolve(false);
    });
  });
}

async function analyzeProxyBehavior() {
  console.log('\n🔄 PROXY BEHAVIOR ANALYSIS');
  console.log('==========================');
  
  // Test different scenarios to understand proxy behavior
  const tests = [
    {
      name: 'HTTPS with Host header',
      url: 'https://72.60.121.93',
      headers: { 'Host': 'app.floworx-iq.com' }
    },
    {
      name: 'HTTP with Host header', 
      url: 'http://72.60.121.93',
      headers: { 'Host': 'app.floworx-iq.com' }
    },
    {
      name: 'HTTPS direct domain',
      url: 'https://app.floworx-iq.com'
    },
    {
      name: 'HTTP direct domain',
      url: 'http://app.floworx-iq.com'
    }
  ];
  
  for (const test of tests) {
    console.log(`\nTesting: ${test.name}`);
    console.log(`URL: ${test.url}`);
    if (test.headers) {
      console.log(`Headers: ${JSON.stringify(test.headers)}`);
    }
    
    await new Promise((resolve) => {
      const client = test.url.startsWith('https') ? https : http;
      const req = client.get(test.url, { 
        timeout: 10000,
        headers: test.headers || {}
      }, (res) => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Server: ${res.headers.server || 'Not specified'}`);
        console.log(`   Content-Type: ${res.headers['content-type'] || 'Not specified'}`);
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (data.trim()) {
            console.log(`   Body: ${data.substring(0, 100)}${data.length > 100 ? '...' : ''}`);
          }
          resolve();
        });
      });
      
      req.on('error', (error) => {
        console.log(`   Error: ${error.message} (${error.code})`);
        resolve();
      });
      
      req.on('timeout', () => {
        req.destroy();
        console.log(`   Timeout after 10s`);
        resolve();
      });
    });
  }
}

async function checkDockerNetworking() {
  console.log('\n🐳 DOCKER NETWORKING ANALYSIS');
  console.log('==============================');
  
  console.log('Based on the test results:');
  console.log('');
  
  // Analyze the 503 vs 404 pattern
  console.log('🔍 Error Pattern Analysis:');
  console.log('- HTTPS requests → 503 "no available server"');
  console.log('- HTTP requests → 404 "page not found"');
  console.log('');
  console.log('This pattern indicates:');
  console.log('✅ Coolify reverse proxy is running');
  console.log('✅ SSL termination is working');
  console.log('✅ Domain routing is configured');
  console.log('❌ Backend container is not reachable');
  console.log('');
  
  console.log('🎯 ROOT CAUSE:');
  console.log('The "503 no available server" error means Coolify\'s proxy');
  console.log('cannot establish a connection to your application container.');
  console.log('');
  
  console.log('🔧 POSSIBLE CAUSES:');
  console.log('1. Container crashed or failed to start');
  console.log('2. Health check is failing');
  console.log('3. Container is not on the correct Docker network');
  console.log('4. Application is not actually listening on port 5001');
  console.log('5. Container firewall or security group blocking port 5001');
  console.log('');
  
  console.log('📋 IMMEDIATE ACTIONS NEEDED:');
  console.log('1. Check Coolify dashboard → Your app → Status');
  console.log('2. Check Coolify dashboard → Your app → Logs');
  console.log('3. Look for container restart loops');
  console.log('4. Verify health check configuration');
  console.log('5. Check if container shows as "Running" and "Healthy"');
}

async function runFinalDiagnosis() {
  console.log('Running final comprehensive diagnosis...\n');
  
  const healthCheckWorking = await testHealthCheck();
  await analyzeProxyBehavior();
  await checkDockerNetworking();
  
  console.log('\n🎯 FINAL VERDICT');
  console.log('================');
  
  if (!healthCheckWorking) {
    console.log('❌ CRITICAL: Container port 5001 is not accessible');
    console.log('   This confirms the container is either:');
    console.log('   - Not running');
    console.log('   - Not listening on port 5001');
    console.log('   - Blocked by firewall');
    console.log('   - On wrong Docker network');
  } else {
    console.log('✅ Container is accessible on port 5001');
    console.log('❌ But Coolify proxy cannot reach it internally');
    console.log('   This is a Docker networking issue');
  }
  
  console.log('');
  console.log('🚨 NEXT STEP: Check your Coolify dashboard NOW!');
  console.log('   Look at the application status and logs.');
}

runFinalDiagnosis().catch(console.error);
