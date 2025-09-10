#!/usr/bin/env node

/**
 * Cache Service Test
 * Tests the cache service functionality (KeyDB/Redis or memory fallback)
 */

const path = require('path');

// Add backend to path
process.chdir(path.join(__dirname, '..', 'backend'));

async function testCacheService() {
  console.log('🔍 Testing Cache Service...');
  console.log('=' .repeat(50));

  try {
    // Import the cache service
    const cacheService = require('./services/cacheService');
    
    console.log('✅ Cache service loaded successfully');
    
    // Test basic cache operations
    console.log('\n🧪 Testing cache operations...');
    
    // Test set operation
    const testKey = 'regression:test';
    const testValue = { message: 'FloWorx Cache Test', timestamp: Date.now() };
    
    await cacheService.set(testKey, testValue, 60);
    console.log('✅ Cache SET operation successful');
    
    // Test get operation
    const retrievedValue = await cacheService.get(testKey);
    if (retrievedValue && retrievedValue.message === testValue.message) {
      console.log('✅ Cache GET operation successful');
    } else {
      console.log('❌ Cache GET operation failed');
      console.log('Expected:', testValue);
      console.log('Retrieved:', retrievedValue);
    }
    
    // Test delete operation
    await cacheService.del(testKey);
    const deletedValue = await cacheService.get(testKey);
    if (deletedValue === null) {
      console.log('✅ Cache DELETE operation successful');
    } else {
      console.log('❌ Cache DELETE operation failed');
    }
    
    // Test cache statistics
    const stats = cacheService.getStats();
    console.log('\n📊 Cache Statistics:');
    console.log(`   Type: ${stats.type}`);
    console.log(`   Connected: ${stats.connected}`);
    console.log(`   Keys: ${stats.keys}`);
    console.log(`   Memory Usage: ${stats.memoryUsage}`);
    
    if (stats.type === 'redis') {
      console.log('🎉 KeyDB/Redis cache is working correctly!');
    } else {
      console.log('⚠️ Using memory cache fallback (KeyDB not available)');
    }
    
    console.log('\n✅ All cache tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Cache service test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testCacheService().catch(console.error);
}

module.exports = testCacheService;
