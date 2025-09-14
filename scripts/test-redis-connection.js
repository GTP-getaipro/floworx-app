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
    );

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
      );
      );
      console.log('3. Check Docker network configuration');
      console.log('4. Try deploying without Redis (app will use memory cache)');
      console.log('\n💡 FALLBACK SOLUTION:');
      );
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

    );
    );
    );
    if (process.env.REDIS_PASSWORD) {
      );
    }
    );

    console.log('\n🔄 NEXT STEPS:');
    );
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
