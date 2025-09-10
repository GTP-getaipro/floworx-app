#!/usr/bin/env node

/**
 * Coolify KeyDB Connection Debug Script
 * Run this inside your Coolify container to diagnose KeyDB connection issues
 */

const Redis = require('ioredis');
const { execSync } = require('child_process');

console.log('🔍 COOLIFY KEYDB CONNECTION DEBUGGER');
console.log('=====================================\n');

// 1. Environment Variables Check
console.log('1. 📋 ENVIRONMENT VARIABLES:');
console.log(`   REDIS_HOST: ${process.env.REDIS_HOST || 'NOT SET'}`);
console.log(`   REDIS_PORT: ${process.env.REDIS_PORT || 'NOT SET'}`);
console.log(`   REDIS_PASSWORD: ${process.env.REDIS_PASSWORD ? '***SET***' : 'NOT SET'}`);
console.log(`   REDIS_URL: ${process.env.REDIS_URL || 'NOT SET'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}\n`);

// 2. Network Connectivity Tests
console.log('2. 🌐 NETWORK CONNECTIVITY TESTS:');

const possibleHosts = [
  process.env.REDIS_HOST,
  'keydb-service',
  'floworx-keydb',
  'keydb-database',
  'redis-service',
  'redis-database',
  '127.0.0.1'
].filter(Boolean);

for (const host of possibleHosts) {
  try {
    console.log(`   Testing: ${host}:${process.env.REDIS_PORT || 6379}`);
    
    // Test ping
    try {
      execSync(`ping -c 1 ${host}`, { timeout: 3000, stdio: 'pipe' });
      console.log(`   ✅ ${host} - Ping successful`);
    } catch (error) {
      console.log(`   ❌ ${host} - Ping failed`);
    }
    
    // Test port connectivity
    try {
      execSync(`nc -z ${host} ${process.env.REDIS_PORT || 6379}`, { timeout: 3000, stdio: 'pipe' });
      console.log(`   ✅ ${host} - Port ${process.env.REDIS_PORT || 6379} open`);
    } catch (error) {
      console.log(`   ❌ ${host} - Port ${process.env.REDIS_PORT || 6379} closed`);
    }
    
  } catch (error) {
    console.log(`   ❌ ${host} - Network test failed: ${error.message}`);
  }
}

console.log('\n3. 🔗 REDIS CONNECTION TESTS:');

// 3. Redis Connection Tests
async function testRedisConnections() {
  for (const host of possibleHosts) {
    try {
      console.log(`   Testing Redis connection to: ${host}:${process.env.REDIS_PORT || 6379}`);
      
      const redis = new Redis({
        host: host,
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        connectTimeout: 3000,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryDelayOnFailover: 100
      });
      
      // Test ping
      const result = await Promise.race([
        redis.ping(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 3000)
        )
      ]);
      
      console.log(`   ✅ ${host} - Redis PING successful: ${result}`);
      
      // Test set/get
      await redis.set('test-key', 'test-value', 'EX', 10);
      const value = await redis.get('test-key');
      console.log(`   ✅ ${host} - Redis SET/GET successful: ${value}`);
      
      await redis.disconnect();
      console.log(`   ✅ ${host} - Connection successful!\n`);
      
      // If we get here, this host works
      console.log(`🎉 SOLUTION FOUND: Use REDIS_HOST=${host}\n`);
      break;
      
    } catch (error) {
      console.log(`   ❌ ${host} - Redis connection failed: ${error.message}`);
    }
  }
}

// 4. Docker Services Check
console.log('4. 🐳 DOCKER SERVICES CHECK:');
try {
  const services = execSync('docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"', { encoding: 'utf8' });
  console.log(services);
} catch (error) {
  console.log('   ❌ Cannot list Docker services (not available in container)');
}

console.log('\n5. 🔍 DNS RESOLUTION CHECK:');
for (const host of possibleHosts) {
  try {
    const result = execSync(`nslookup ${host}`, { encoding: 'utf8', timeout: 3000 });
    console.log(`   ✅ ${host} - DNS resolved`);
  } catch (error) {
    console.log(`   ❌ ${host} - DNS resolution failed`);
  }
}

// Run the tests
testRedisConnections().then(() => {
  console.log('\n🏁 DEBUG COMPLETE');
  console.log('================');
  console.log('If no working connection was found:');
  console.log('1. Check your Coolify KeyDB service name');
  console.log('2. Ensure KeyDB service is running');
  console.log('3. Verify network connectivity between services');
  console.log('4. Consider using memory cache only (remove REDIS_HOST)');
}).catch(error => {
  console.error('❌ Debug script failed:', error.message);
});
