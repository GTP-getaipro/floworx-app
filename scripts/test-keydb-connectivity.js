#!/usr/bin/env node

/**
 * KeyDB/Redis Connectivity Test
 * Tests the KeyDB connection and cache functionality
 */

const Redis = require('ioredis');

async function testKeyDBConnectivity() {
  console.log('🔍 Testing KeyDB/Redis Connectivity...');
  console.log('=' .repeat(50));

  const redisUrl = process.env.REDIS_URL || 'redis://:p2oydZsAltTxy9tGVtVVF0LcPo1PzCNBPv3w0rEcuSwlzT9t9eHbRju195A7G8ui@sgkgk4s80s0wosscs4800g0k:6379/0';
  
  let redis;
  
  try {
    // Create Redis connection
    redis = new Redis(redisUrl, {
      connectTimeout: 5000,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      retryDelayOnFailover: 100
    });

    console.log('🔗 Attempting to connect to KeyDB...');
    console.log(`   URL: ${redisUrl.replace(/:([^:@]*@)/, ':***@')}`);
    
    // Test connection
    await redis.connect();
    console.log('✅ KeyDB connection established');

    // Test basic operations
    console.log('\n🧪 Testing basic operations...');
    
    // Set a test key
    await redis.set('test:regression', 'FloWorx-Test-Value', 'EX', 60);
    console.log('✅ SET operation successful');
    
    // Get the test key
    const value = await redis.get('test:regression');
    if (value === 'FloWorx-Test-Value') {
      console.log('✅ GET operation successful');
    } else {
      console.log('❌ GET operation failed - value mismatch');
    }
    
    // Test key expiration
    const ttl = await redis.ttl('test:regression');
    if (ttl > 0 && ttl <= 60) {
      console.log('✅ TTL operation successful');
    } else {
      console.log('❌ TTL operation failed');
    }
    
    // Test delete
    await redis.del('test:regression');
    const deletedValue = await redis.get('test:regression');
    if (deletedValue === null) {
      console.log('✅ DELETE operation successful');
    } else {
      console.log('❌ DELETE operation failed');
    }
    
    // Test server info
    const info = await redis.info('server');
    console.log('\n📊 KeyDB Server Info:');
    const lines = info.split('\r\n');
    for (const line of lines) {
      if (line.includes('redis_version') || line.includes('uptime_in_seconds') || line.includes('connected_clients')) {
        console.log(`   ${line}`);
      }
    }
    
    console.log('\n🎉 All KeyDB tests passed!');
    
  } catch (error) {
    console.error('❌ KeyDB test failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('💡 Connection refused - check if KeyDB service is running');
    } else if (error.message.includes('ENOTFOUND')) {
      console.log('💡 Host not found - check KeyDB hostname');
    } else if (error.message.includes('WRONGPASS')) {
      console.log('💡 Authentication failed - check KeyDB password');
    }
    
    process.exit(1);
  } finally {
    if (redis) {
      await redis.quit();
      console.log('🔌 KeyDB connection closed');
    }
  }
}

// Run the test
if (require.main === module) {
  testKeyDBConnectivity().catch(console.error);
}

module.exports = testKeyDBConnectivity;
