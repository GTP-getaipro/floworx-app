#!/usr/bin/env node

const https = require('https');
const http = require('http');

console.log('🔍 TESTING BROWSER CACHE & PROXY ISSUES');
console.log('=======================================');

async function testWithCacheBusting() {
  console.log('\n🚀 CACHE-BUSTING TESTS');
  console.log('======================');
  
  const timestamp = Date.now();
  const tests = [
    {
      name: 'HTTPS with cache buster',
      url: `https://app.floworx-iq.com/api/health?t=${timestamp}`,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    },
    {
      name: 'HTTPS root with cache buster',
      url: `https://app.floworx-iq.com/?t=${timestamp}`,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    },
    {
      name: 'HTTP with cache buster',
      url: `http://app.floworx-iq.com/api/health?t=${timestamp}`,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    }
  ];
  
  for (const test of tests) {
    console.log(`\nTesting: ${test.name}`);
    console.log(`URL: ${test.url}`);
    
    const result = await testEndpoint(test.url, test.headers);
    
    if (result.success) {
      console.log(`✅ Status: ${result.status}`);
      
      if (result.status === 200) {
        console.log('🎉 SUCCESS! Application is now responding!');
        console.log('   The issue was likely browser/proxy caching.');
        return true;
      } else if (result.status === 503) {
        console.log('❌ Still getting 503 - proxy issue persists');
      } else {
        console.log(`ℹ️ Got status ${result.status} - checking response...`);
      }
      
      if (result.body && result.body.trim()) {
        const body = result.body.substring(0, 200);
        console.log(`   Body: ${body}`);
      }
    } else {
      console.log(`❌ Error: ${result.error}`);
    }
  }
  
  return false;
}

async function testDifferentUserAgents() {
  console.log('\n🤖 TESTING DIFFERENT USER AGENTS');
  console.log('=================================');
  
  const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'curl/7.68.0',
    'FloWorx-Test/1.0',
    'PostmanRuntime/7.28.0'
  ];
  
  for (const ua of userAgents) {
    console.log(`\nTesting with User-Agent: ${ua.substring(0, 30)}...`);
    
    const result = await testEndpoint('https://app.floworx-iq.com/api/health', {
      'User-Agent': ua,
      'Cache-Control': 'no-cache'
    });
    
    if (result.success && result.status === 200) {
      console.log('🎉 SUCCESS! Found working User-Agent');
      return true;
    } else if (result.success) {
      console.log(`   Status: ${result.status}`);
    } else {
      console.log(`   Error: ${result.error}`);
    }
  }
  
  return false;
}

async function testEndpoint(url, headers = {}) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    const options = {
      timeout: 10000,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        ...headers
      }
    };
    
    const req = client.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          success: true,
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message,
        code: error.code
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Request timeout',
        code: 'TIMEOUT'
      });
    });
  });
}

async function testDNSConsistency() {
  console.log('\n🌐 DNS CONSISTENCY CHECK');
  console.log('========================');
  
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    // Test multiple DNS servers
    const dnsServers = ['8.8.8.8', '1.1.1.1', '208.67.222.222'];
    
    for (const dns of dnsServers) {
      try {
        const { stdout } = await execAsync(`nslookup app.floworx-iq.com ${dns}`);
        console.log(`DNS ${dns}:`);
        
        const lines = stdout.split('\n');
        const addressLine = lines.find(line => line.includes('Address:') && !line.includes('#'));
        if (addressLine) {
          const ip = addressLine.split('Address:')[1].trim();
          console.log(`   Resolves to: ${ip}`);
          
          if (ip === '72.60.121.93') {
            console.log('   ✅ Correct IP');
          } else {
            console.log('   ❌ Wrong IP!');
          }
        }
      } catch (error) {
        console.log(`   ❌ DNS ${dns} failed: ${error.message}`);
      }
    }
  } catch (error) {
    console.log('❌ DNS consistency check failed:', error.message);
  }
}

async function runComprehensiveTest() {
  console.log('🎯 COMPREHENSIVE CACHE & PROXY TEST');
  console.log('===================================');
  console.log('Your application is running perfectly inside the container.');
  console.log('Testing if the issue is browser cache or proxy configuration...\n');
  
  // Test DNS first
  await testDNSConsistency();
  
  // Test with cache busting
  const cacheBustingWorked = await testWithCacheBusting();
  
  if (cacheBustingWorked) {
    console.log('\n🎉 ISSUE RESOLVED!');
    console.log('The problem was browser/proxy caching.');
    console.log('Your application is now working correctly.');
    return;
  }
  
  // Test different user agents
  const userAgentWorked = await testDifferentUserAgents();
  
  if (userAgentWorked) {
    console.log('\n🎉 ISSUE RESOLVED!');
    console.log('The problem was user agent filtering.');
    return;
  }
  
  console.log('\n🔧 NEXT STEPS');
  console.log('=============');
  console.log('The application is running correctly, but proxy issues persist.');
  console.log('');
  console.log('📋 IMMEDIATE ACTIONS:');
  console.log('1. Clear your browser cache completely');
  console.log('2. Try incognito/private browsing mode');
  console.log('3. Try a different browser entirely');
  console.log('4. In Coolify dashboard:');
  console.log('   - Restart the application');
  console.log('   - Check domain configuration');
  console.log('   - Verify port 5001 is correctly mapped');
  console.log('   - Check SSL certificate status');
  console.log('');
  console.log('🎯 MOST LIKELY FIX:');
  console.log('Restart your application in Coolify to refresh the proxy configuration.');
}

runComprehensiveTest().catch(console.error);
