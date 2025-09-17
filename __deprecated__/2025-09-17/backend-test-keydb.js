#!/usr/bin/env node

/**
 * Simple KeyDB Connection Test
 */

const Redis = require('ioredis');

async function testKeyDBConnection() {
  console.log('🔍 Testing KeyDB Connection...');
  console.log('=' .repeat(50));

  // Test with the correct hostname
  const testConfigs = [
    {
      name: 'Environment REDIS_URL',
      config: process.env.REDIS_URL
    },
    {
      name: 'Direct hostname',
      config: {
        host: 'sckck444cs4c88g0ws8kw0ss',
        port: 6379,
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 5000,
        commandTimeout: 3000,
        lazyConnect: true,
        maxRetriesPerRequest: 1
      }
    },
    {
      name: 'Full service name',
      config: {
        host: 'keydb-database-sckck444cs4c88g0ws8kw0ss',
        port: 6379,
        password: process.env.REDIS_PASSWORD,
        connectTimeout: 5000,
        commandTimeout: 3000,
        lazyConnect: true,
        maxRetriesPerRequest: 1
      }
    }
  ];

  for (const testConfig of testConfigs) {
    if (!testConfig.config) {
      console.log(`⏭️  Skipping ${testConfig.name} - not configured`);
      continue;
    }

    console.log(`\n🔗 Testing: ${testConfig.name}`);
    
    let redis;
    try {
      redis = new Redis(testConfig.config);
      
      // Try to connect
      await redis.connect();
      console.log(`✅ Connected successfully!`);
      
      // Test basic operations
      await redis.set('test-key', 'test-value', 'EX', 10);
      const value = await redis.get('test-key');
      console.log(`✅ Set/Get test: ${value === 'test-value' ? 'PASS' : 'FAIL'}`);
      
      // Clean up
      await redis.del('test-key');
      console.log(`✅ Cleanup successful`);
      
      await redis.disconnect();
      console.log(`✅ ${testConfig.name} - ALL TESTS PASSED`);
      return true;
      
    } catch (error) {
      console.log(`❌ ${testConfig.name} failed: ${error.message}`);
      if (redis) {
        try {
          await redis.disconnect();
        } catch (_e) {
          // Ignore disconnect errors
        }
      }
    }
  }
  
  console.log('\n❌ All KeyDB connection attempts failed');
  return false;
}

// Run the test
testKeyDBConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });
