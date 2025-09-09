#!/usr/bin/env node

/**
 * Redis Connection Test Script
 * Tests all possible Redis connection configurations for Coolify
 */

const Redis = require('ioredis');

class RedisConnectionTester {
  constructor() {
    this.testResults = [];
  }

  /**
   * Test all possible Redis configurations
   */
  async testAllConfigurations() {
    console.log('🔴 Testing Redis Connection Configurations...');
    console.log('==============================================');

    const configurations = [
      {
        name: 'Environment Variable Host',
        host: process.env.REDIS_HOST || 'redis-database',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      },
      {
        name: 'Coolify Redis Service (Short)',
        host: 'redis-database',
        port: 6379,
        password: process.env.REDIS_PASSWORD
      },
      {
        name: 'Coolify Redis Service (Full)',
        host: 'redis-database-bgkgcogwgcksc0sccw48c8s0',
        port: 6379,
        password: process.env.REDIS_PASSWORD
      },
      {
        name: 'Docker Compose Service',
        host: 'redis-db',
        port: 6379,
        password: process.env.REDIS_PASSWORD
      },
      {
        name: 'Localhost',
        host: '127.0.0.1',
        port: 6379,
        password: process.env.REDIS_PASSWORD
      },
      {
        name: 'Localhost (hostname)',
        host: 'localhost',
        port: 6379,
        password: process.env.REDIS_PASSWORD
      }
    ];

    for (const config of configurations) {
      await this.testConfiguration(config);
    }

    this.printResults();
    this.generateRecommendations();
  }

  /**
   * Test a single Redis configuration
   */
  async testConfiguration(config) {
    console.log(`\n🔍 Testing: ${config.name}`);
    console.log(`   Host: ${config.host}:${config.port}`);
    
    const result = {
      name: config.name,
      host: config.host,
      port: config.port,
      success: false,
      error: null,
      latency: null,
      details: {}
    };

    try {
      const redis = new Redis({
        host: config.host,
        port: config.port,
        password: config.password,
        connectTimeout: 5000,
        commandTimeout: 3000,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1,
        lazyConnect: true,
        enableOfflineQueue: false
      });

      // Test connection
      const startTime = Date.now();
      
      // Try to connect and ping
      await redis.connect();
      const pingResult = await redis.ping();
      
      const latency = Date.now() - startTime;

      if (pingResult === 'PONG') {
        result.success = true;
        result.latency = latency;
        result.details.ping = pingResult;
        
        // Additional tests
        await this.runAdditionalTests(redis, result);
        
        console.log(`   ✅ SUCCESS (${latency}ms)`);
      }

      await redis.quit();

    } catch (error) {
      result.error = error.message;
      console.log(`   ❌ FAILED: ${error.message}`);
      
      // Categorize error types
      if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
        result.details.errorType = 'DNS_RESOLUTION';
      } else if (error.message.includes('ECONNREFUSED')) {
        result.details.errorType = 'CONNECTION_REFUSED';
      } else if (error.message.includes('timeout')) {
        result.details.errorType = 'TIMEOUT';
      } else {
        result.details.errorType = 'OTHER';
      }
    }

    this.testResults.push(result);
  }

  /**
   * Run additional tests on successful connection
   */
  async runAdditionalTests(redis, result) {
    try {
      // Test basic operations
      await redis.set('test:connection', 'success');
      const getValue = await redis.get('test:connection');
      await redis.del('test:connection');
      
      result.details.basicOperations = getValue === 'success';
      
      // Test info command
      const info = await redis.info('server');
      result.details.serverInfo = info.includes('redis_version');
      
    } catch (error) {
      result.details.additionalTestsError = error.message;
    }
  }

  /**
   * Print test results
   */
  printResults() {
    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('========================');

    const successful = this.testResults.filter(r => r.success);
    const failed = this.testResults.filter(r => !r.success);

    console.log(`✅ Successful: ${successful.length}`);
    console.log(`❌ Failed: ${failed.length}`);

    if (successful.length > 0) {
      console.log('\n🎯 WORKING CONFIGURATIONS:');
      successful.forEach(result => {
        console.log(`   ✅ ${result.name}: ${result.host}:${result.port} (${result.latency}ms)`);
      });
    }

    if (failed.length > 0) {
      console.log('\n💥 FAILED CONFIGURATIONS:');
      failed.forEach(result => {
        console.log(`   ❌ ${result.name}: ${result.error}`);
      });
    }
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    console.log('\n🎯 RECOMMENDATIONS');
    console.log('==================');

    const successful = this.testResults.filter(r => r.success);
    
    if (successful.length === 0) {
      console.log('❌ No Redis connections successful!');
      console.log('\n🔧 TROUBLESHOOTING STEPS:');
      console.log('1. Check if Redis service is running in Coolify');
      console.log('2. Verify Redis service name in Coolify dashboard');
      console.log('3. Check Docker network configuration');
      console.log('4. Try deploying without Redis (app will use memory cache)');
      console.log('\n💡 FALLBACK SOLUTION:');
      console.log('Remove REDIS_HOST environment variable to disable Redis');
      console.log('The app will automatically fall back to memory caching');
      return;
    }

    // Find the best configuration
    const best = successful.reduce((prev, current) => 
      (prev.latency < current.latency) ? prev : current
    );

    console.log(`🏆 RECOMMENDED CONFIGURATION: ${best.name}`);
    console.log(`   Host: ${best.host}`);
    console.log(`   Port: ${best.port}`);
    console.log(`   Latency: ${best.latency}ms`);

    console.log('\n📋 COOLIFY ENVIRONMENT VARIABLES:');
    console.log(`REDIS_HOST=${best.host}`);
    console.log(`REDIS_PORT=${best.port}`);
    if (process.env.REDIS_PASSWORD) {
      console.log(`REDIS_PASSWORD=${process.env.REDIS_PASSWORD}`);
    }
    console.log(`REDIS_URL=redis://${best.host}:${best.port}`);

    console.log('\n🔄 NEXT STEPS:');
    console.log('1. Update your Coolify environment variables with the above values');
    console.log('2. Redeploy your application');
    console.log('3. Monitor the startup logs for Redis connection success');
  }

  /**
   * Save results to file
   */
  saveResults() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        REDIS_HOST: process.env.REDIS_HOST,
        REDIS_PORT: process.env.REDIS_PORT,
        NODE_ENV: process.env.NODE_ENV
      },
      results: this.testResults,
      summary: {
        total: this.testResults.length,
        successful: this.testResults.filter(r => r.success).length,
        failed: this.testResults.filter(r => !r.success).length
      }
    };

    const fs = require('fs');
    const path = require('path');
    
    const reportPath = path.join(__dirname, '..', 'logs', 'redis-connection-test.json');
    
    // Ensure logs directory exists
    const logsDir = path.dirname(reportPath);
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportPath}`);
  }
}

// Run the test if called directly
if (require.main === module) {
  const tester = new RedisConnectionTester();
  tester.testAllConfigurations()
    .then(() => {
      tester.saveResults();
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = RedisConnectionTester;
