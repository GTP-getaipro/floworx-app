#!/usr/bin/env node

/**
 * KeyDB Connection Test Script
 * Tests connection to KeyDB service from application environment
 */

const net = require('net');
const path = require('path');

// Try to load ioredis if available (in backend environment)
let Redis;
try {
  Redis = require('ioredis');
  console.log('📦 Using ioredis for enhanced testing');
} catch (e) {
  console.log('📦 Using basic TCP testing (ioredis not available)');
}

// KeyDB connection configurations to test
const keydbHosts = [
  'keydb-database-sckck444cs4c88g0ws8kw0ss',
  'keydb-service', 
  'floworx-keydb',
  'cautious-chinchilla-psogogcssw4coscowc8o8w0w',
  'redis-database-bgkgcogwgcksc0sccw48c8s0',
  '127.0.0.1'
];

const port = 6379;
const timeout = 5000; // 5 seconds

console.log('🧪 KeyDB Connection Test Starting...');
console.log('=====================================');

async function testKeyDBConnection(host, port) {
  return new Promise((resolve) => {
    console.log(`\n🔗 Testing connection to: ${host}:${port}`);

    const startTime = Date.now();
    const socket = new net.Socket();

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      const connectTime = Date.now() - startTime;
      console.log(`   ✅ TCP connection successful (${connectTime}ms)`);

      // Send Redis PING command
      socket.write('*1\r\n$4\r\nPING\r\n');
    });

    socket.on('data', (data) => {
      const response = data.toString();
      console.log(`   ✅ KeyDB response received: ${response.trim()}`);

      if (response.includes('PONG') || response.includes('+PONG')) {
        console.log(`   ✅ KeyDB PING successful`);
        socket.destroy();
        resolve({
          host,
          port,
          success: true,
          connectTime: Date.now() - startTime,
          response: response.trim()
        });
      } else {
        console.log(`   ⚠️ Unexpected response: ${response}`);
        socket.destroy();
        resolve({
          host,
          port,
          success: false,
          error: `Unexpected response: ${response}`
        });
      }
    });

    socket.on('error', (error) => {
      const connectTime = Date.now() - startTime;
      console.log(`   ❌ Connection failed (${connectTime}ms): ${error.message}`);

      resolve({
        host,
        port,
        success: false,
        connectTime,
        error: error.message
      });
    });

    socket.on('timeout', () => {
      console.log(`   ⏰ Connection timeout after ${timeout}ms`);
      socket.destroy();
      resolve({
        host,
        port,
        success: false,
        error: 'Connection timeout'
      });
    });

    // Attempt connection
    socket.connect(port, host);
  });
}

async function runAllTests() {
  console.log(`📊 Testing ${keydbHosts.length} KeyDB hosts...\n`);
  
  const results = [];
  
  for (const host of keydbHosts) {
    const result = await testKeyDBConnection(host, port);
    results.push(result);
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📋 TEST RESULTS SUMMARY');
  console.log('========================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  if (successful.length > 0) {
    console.log(`\n✅ SUCCESSFUL CONNECTIONS (${successful.length}):`);
    successful.forEach(result => {
      console.log(`   🎯 ${result.host}:${result.port} - ${result.connectTime}ms - Response: ${result.response || 'Connected'}`);
    });
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ FAILED CONNECTIONS (${failed.length}):`);
    failed.forEach(result => {
      console.log(`   💥 ${result.host}:${result.port} - ${result.error}`);
    });
  }
  
  console.log('\n🔧 RECOMMENDATIONS:');
  
  if (successful.length > 0) {
    const bestConnection = successful[0];
    console.log(`✅ Use this KeyDB host: ${bestConnection.host}:${bestConnection.port}`);
    console.log(`✅ Update REDIS_HOST environment variable to: ${bestConnection.host}`);
    console.log(`✅ Connection is working - check application configuration`);
  } else {
    console.log(`❌ No KeyDB connections successful`);
    console.log(`🔍 Check KeyDB service status in Coolify`);
    console.log(`🔍 Verify KeyDB service is in same network as application`);
    console.log(`🔍 Check KeyDB service logs for errors`);
    console.log(`🔍 Verify port 6379 is exposed and accessible`);
  }
  
  console.log('\n🚀 NEXT STEPS:');
  if (successful.length > 0) {
    console.log('1. Update REDIS_HOST environment variable with working host');
    console.log('2. Restart your application');
    console.log('3. Monitor logs for successful KeyDB connection');
  } else {
    console.log('1. Check KeyDB service status and logs in Coolify');
    console.log('2. Verify network connectivity between services');
    console.log('3. Check KeyDB service configuration and ports');
    console.log('4. Consider recreating KeyDB service if needed');
  }
  
  return results;
}

// Environment info
console.log('🌍 ENVIRONMENT INFO:');
console.log(`   Node.js: ${process.version}`);
console.log(`   Platform: ${process.platform}`);
console.log(`   Current working directory: ${process.cwd()}`);
console.log(`   REDIS_HOST env var: ${process.env.REDIS_HOST || 'not set'}`);
console.log(`   REDIS_PORT env var: ${process.env.REDIS_PORT || 'not set'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);

// Run tests
runAllTests()
  .then((results) => {
    const successCount = results.filter(r => r.success).length;
    console.log(`\n🎯 Test completed: ${successCount}/${results.length} connections successful`);
    process.exit(successCount > 0 ? 0 : 1);
  })
  .catch((error) => {
    console.error(`\n💥 Test failed with error: ${error.message}`);
    process.exit(1);
  });
