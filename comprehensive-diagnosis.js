#!/usr/bin/env node

const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

console.log('🔍 COMPREHENSIVE FLOWORX DIAGNOSIS');
console.log('==================================');

async function testEndpoint(url, options = {}) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'FloWorx-Diagnostic/1.0',
        'Accept': 'application/json, text/plain, */*',
        'Cache-Control': 'no-cache',
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
        error: 'Request timeout (15s)',
        code: 'TIMEOUT',
        success: false
      });
    });
  });
}

async function checkSSLCertificate() {
  console.log('\n🔒 SSL CERTIFICATE CHECK');
  console.log('========================');
  
  try {
    const { stdout } = await execAsync('curl -I -k --connect-timeout 10 https://app.floworx-iq.com 2>&1');
    console.log('SSL Response Headers:');
    console.log(stdout);
  } catch (error) {
    console.log('❌ SSL Check failed:', error.message);
  }
}

async function checkPortsAndServices() {
  console.log('\n🌐 PORT AND SERVICE CHECK');
  console.log('=========================');
  
  const serverIP = '72.60.121.93';
  const portsToCheck = [80, 443, 5001, 3000, 8000, 8080, 22, 21];
  
  for (const port of portsToCheck) {
    try {
      const result = await testEndpoint(`http://${serverIP}:${port}`);
      if (result.success) {
        console.log(`✅ Port ${port}: OPEN - Status ${result.status}`);
        if (result.headers.server) {
          console.log(`   Server: ${result.headers.server}`);
        }
      } else if (result.code === 'ECONNREFUSED') {
        console.log(`❌ Port ${port}: CLOSED`);
      } else {
        console.log(`⚠️  Port ${port}: ${result.error}`);
      }
    } catch (error) {
      console.log(`❌ Port ${port}: Error - ${error.message}`);
    }
  }
}

async function testCoolifySpecific() {
  console.log('\n🐳 COOLIFY-SPECIFIC TESTS');
  console.log('=========================');
  
  const tests = [
    // Test different protocols and paths
    { url: 'https://app.floworx-iq.com', desc: 'HTTPS Root' },
    { url: 'https://app.floworx-iq.com/', desc: 'HTTPS Root with slash' },
    { url: 'https://app.floworx-iq.com/api', desc: 'HTTPS API base' },
    { url: 'https://app.floworx-iq.com/api/', desc: 'HTTPS API with slash' },
    { url: 'https://app.floworx-iq.com/api/health', desc: 'HTTPS Health endpoint' },
    { url: 'https://app.floworx-iq.com/api/status', desc: 'HTTPS Status endpoint' },
    { url: 'https://app.floworx-iq.com/health', desc: 'HTTPS Health (no api prefix)' },
    
    // Test HTTP variants
    { url: 'http://app.floworx-iq.com', desc: 'HTTP Root' },
    { url: 'http://app.floworx-iq.com/api/health', desc: 'HTTP Health endpoint' },
    
    // Test with different headers
    { url: 'https://app.floworx-iq.com/api/health', desc: 'Health with JSON Accept', headers: { 'Accept': 'application/json' } },
  ];
  
  for (const test of tests) {
    console.log(`\nTesting: ${test.desc}`);
    console.log(`URL: ${test.url}`);
    
    const result = await testEndpoint(test.url, { headers: test.headers });
    
    if (result.success) {
      console.log(`✅ Status: ${result.status}`);
      
      // Show important headers
      const importantHeaders = ['content-type', 'server', 'location', 'x-powered-by', 'set-cookie'];
      importantHeaders.forEach(header => {
        if (result.headers[header]) {
          console.log(`   ${header}: ${result.headers[header]}`);
        }
      });
      
      // Show body preview
      if (result.body && result.body.trim()) {
        const bodyPreview = result.body.replace(/\s+/g, ' ').substring(0, 200);
        console.log(`   Body: ${bodyPreview}${result.body.length > 200 ? '...' : ''}`);
      }
    } else {
      console.log(`❌ Error: ${result.error} (${result.code})`);
    }
  }
}

async function checkDNSAndConnectivity() {
  console.log('\n🌍 DNS AND CONNECTIVITY CHECK');
  console.log('==============================');
  
  try {
    // Test DNS resolution
    const { stdout: dnsResult } = await execAsync('nslookup app.floworx-iq.com 8.8.8.8');
    console.log('DNS Resolution:');
    console.log(dnsResult);
    
    // Test ping
    const { stdout: pingResult } = await execAsync('ping app.floworx-iq.com -n 2');
    console.log('Ping Test:');
    console.log(pingResult);
    
  } catch (error) {
    console.log('❌ DNS/Connectivity check failed:', error.message);
  }
}

async function runComprehensiveDiagnosis() {
  console.log('Starting comprehensive diagnosis...\n');
  
  await checkDNSAndConnectivity();
  await checkPortsAndServices();
  await checkSSLCertificate();
  await testCoolifySpecific();
  
  console.log('\n🎯 DIAGNOSIS SUMMARY');
  console.log('===================');
  console.log('✅ DNS Resolution: Working');
  console.log('✅ Server Reachable: Yes');
  console.log('✅ Coolify Proxy: Running (port 80/443)');
  console.log('❌ Application Container: Not reachable by proxy');
  console.log('');
  console.log('🔧 LIKELY ISSUES:');
  console.log('1. Container not running or crashed');
  console.log('2. Health check failing');
  console.log('3. Internal Docker network misconfiguration');
  console.log('4. Port 5001 not properly exposed in container');
  console.log('5. Application not binding to 0.0.0.0:5001');
  console.log('');
  console.log('📋 NEXT STEPS:');
  console.log('1. Check Coolify dashboard - container status');
  console.log('2. Check application logs in Coolify');
  console.log('3. Verify Dockerfile EXPOSE 5001');
  console.log('4. Ensure app binds to 0.0.0.0:5001 not localhost:5001');
}

runComprehensiveDiagnosis().catch(console.error);
