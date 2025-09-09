#!/usr/bin/env node

/**
 * Test KeyDB Connection Script
 * Debugs KeyDB connection issues in Coolify deployment
 */

const Redis = require('ioredis');

console.log('🔍 Testing KeyDB Connection...');
console.log('Environment Variables:');
console.log(`  REDIS_HOST: ${process.env.REDIS_HOST || 'not set'}`);
console.log(`  REDIS_PORT: ${process.env.REDIS_PORT || '6379'}`);
console.log(`  REDIS_PASSWORD: ${process.env.REDIS_PASSWORD ? 'set' : 'not set'}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log('');

async function testConnection(host, port, password) {
  console.log(`🔗 Testing connection to ${host}:${port}`);

  try {
    const redis = new Redis({
      host: host,
      port: parseInt(port) || 6379,
      password: password || undefined,
      connectTimeout: 5000,
      commandTimeout: 3000,
      enableOfflineQueue: false, // This is key - disable offline queue
      lazyConnect: true,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false
    });

    // Set up event handlers
    redis.on('connect', () => {
      console.log(`✅ Connected successfully to ${host}:${port}`);
    });

    redis.on('error', (error) => {
      console.log(`❌ Connection error to ${host}:${port}:`, error.message);
    });

    redis.on('close', () => {
      console.log(`🔌 Connection closed to ${host}:${port}`);
    });

    // Test ping
    const startTime = Date.now();
    const result = await Promise.race([
      redis.ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Ping timeout')), 3000)
      )
    ]);

    const latency = Date.now() - startTime;
    console.log(`✅ Ping successful: ${result} (${latency}ms)`);

    // Test basic operations
    await redis.set('test_key', 'test_value', 'EX', 10);
    const value = await redis.get('test_key');
    console.log(`✅ Basic operations working: set/get = ${value}`);

    await redis.del('test_key');
    console.log(`✅ Delete operation working`);

    await redis.quit();
    console.log(`✅ Connection test completed successfully for ${host}:${port}`);
    return true;

  } catch (error) {
    console.log(`❌ Connection test failed for ${host}:${port}:`, error.message);
    return false;
  }
}

async function runTests() {
  const testHosts = [
    { host: process.env.REDIS_HOST, port: process.env.REDIS_PORT, password: process.env.REDIS_PASSWORD },
    { host: 'keydb-database-sckck444cs4c88g0ws8kw0ss', port: '6379', password: null },
    { host: 'keydb-service', port: '6379', password: null },
    { host: 'floworx-keydb', port: '6379', password: null },
    { host: 'cautious-chinchilla-psogogcssw4coscowc8o8w0w', port: '6379', password: null },
    { host: 'redis-database-bgkgcogwgcksc0sccw48c8s0', port: '6379', password: null },
    { host: '127.0.0.1', port: '6379', password: null }
  ].filter(test => test.host); // Only test hosts that are defined

  console.log(`Testing ${testHosts.length} possible KeyDB hosts...\n`);

  let successfulConnections = 0;

  for (const testConfig of testHosts) {
    const success = await testConnection(testConfig.host, testConfig.port, testConfig.password);
    if (success) successfulConnections++;
    console.log(''); // Empty line between tests
  }

  console.log('📊 Test Results:');
  console.log(`  Total hosts tested: ${testHosts.length}`);
  console.log(`  Successful connections: ${successfulConnections}`);
  console.log(`  Failed connections: ${testHosts.length - successfulConnections}`);

  if (successfulConnections === 0) {
    console.log('\n❌ No KeyDB connections successful');
    console.log('Suggestions:');
    console.log('  1. Check if KeyDB service is running');
    console.log('  2. Verify network connectivity between containers');
    console.log('  3. Check firewall settings');
    console.log('  4. Verify KeyDB service name and port');
    console.log('  5. Check KeyDB logs for errors');
  } else {
    console.log('\n✅ KeyDB connection successful!');
  }

  process.exit(successfulConnections > 0 ? 0 : 1);
}

runTests().catch(error => {
  console.error('❌ Test script error:', error);
  process.exit(1);
});
