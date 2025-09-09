#!/usr/bin/env node

/**
 * Redis Connection Diagnostic Tool
 * Tests Redis connectivity and network resolution
 */

const Redis = require('ioredis');
const dns = require('dns').promises;

class RedisConnectionTester {
  constructor() {
    this.redisHost = process.env.REDIS_HOST || 'redis-database-bgkgcogwgcksc0sccw48c8s0';
    this.redisPort = process.env.REDIS_PORT || 6379;
    this.redisPassword = process.env.REDIS_PASSWORD;
  }

  async testDNSResolution() {
    console.log(`🔍 Testing DNS resolution for: ${this.redisHost}`);
    
    try {
      const addresses = await dns.lookup(this.redisHost);
      console.log(`✅ DNS Resolution successful: ${this.redisHost} → ${addresses.address}`);
      return true;
    } catch (error) {
      console.log(`❌ DNS Resolution failed: ${error.message}`);
      console.log(`   Error code: ${error.code}`);
      
      if (error.code === 'EAI_AGAIN') {
        console.log('   This indicates a temporary DNS failure or incorrect hostname');
      } else if (error.code === 'ENOTFOUND') {
        console.log('   This indicates the hostname does not exist');
      }
      
      return false;
    }
  }

  async testRedisConnection() {
    console.log(`🔗 Testing Redis connection to: ${this.redisHost}:${this.redisPort}`);
    
    const redis = new Redis({
      host: this.redisHost,
      port: this.redisPort,
      password: this.redisPassword,
      connectTimeout: 5000,
      lazyConnect: true,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 1
    });

    try {
      await redis.connect();
      console.log('✅ Redis connection successful');
      
      // Test basic operations
      await redis.set('test-key', 'test-value', 'EX', 10);
      const value = await redis.get('test-key');
      
      if (value === 'test-value') {
        console.log('✅ Redis read/write operations working');
      } else {
        console.log('⚠️ Redis connected but read/write operations failed');
      }
      
      await redis.del('test-key');
      await redis.quit();
      
      return true;
    } catch (error) {
      console.log(`❌ Redis connection failed: ${error.message}`);
      console.log(`   Error code: ${error.code}`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('   Redis service is not running or not accessible');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('   Connection timed out - network or firewall issue');
      }
      
      try {
        await redis.quit();
      } catch (e) {
        // Ignore cleanup errors
      }
      
      return false;
    }
  }

  async testNetworkConnectivity() {
    console.log('🌐 Testing network connectivity...');
    
    // Test if we can resolve common DNS names
    try {
      await dns.lookup('google.com');
      console.log('✅ External DNS resolution working');
    } catch (error) {
      console.log('❌ External DNS resolution failed - network issue');
      return false;
    }
    
    return true;
  }

  async runAllTests() {
    console.log('🚀 Redis Connection Diagnostic Tool');
    console.log('=' .repeat(50));
    console.log(`Redis Host: ${this.redisHost}`);
    console.log(`Redis Port: ${this.redisPort}`);
    console.log(`Redis Password: ${this.redisPassword ? '[SET]' : '[NOT SET]'}`);
    console.log('=' .repeat(50));

    const results = {
      network: false,
      dns: false,
      redis: false
    };

    // Test 1: Network connectivity
    results.network = await this.testNetworkConnectivity();
    
    // Test 2: DNS resolution
    if (results.network) {
      results.dns = await this.testDNSResolution();
    }
    
    // Test 3: Redis connection
    if (results.dns) {
      results.redis = await this.testRedisConnection();
    }

    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 DIAGNOSTIC SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Network Connectivity: ${results.network ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`DNS Resolution: ${results.dns ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Redis Connection: ${results.redis ? '✅ PASS' : '❌ FAIL'}`);

    if (results.redis) {
      console.log('\n🎉 All tests passed! Redis is working correctly.');
      console.log('Your application should be able to connect to Redis.');
    } else {
      console.log('\n⚠️ Redis connection issues detected.');
      console.log('\n🔧 RECOMMENDED ACTIONS:');
      
      if (!results.network) {
        console.log('1. Check network connectivity in your container');
      } else if (!results.dns) {
        console.log('1. Verify the Redis service name in Coolify');
        console.log('2. Ensure Redis service is running');
        console.log('3. Check if services are on the same network');
      } else {
        console.log('1. Verify Redis service is running and healthy');
        console.log('2. Check Redis port and password configuration');
        console.log('3. Review firewall/security group settings');
      }
    }

    return results;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new RedisConnectionTester();
  tester.runAllTests().catch(console.error);
}

module.exports = RedisConnectionTester;
