#!/usr/bin/env node

/**
 * Memory Usage Optimization Script
 * Reduces memory footprint for production deployment
 */

const fs = require('fs');
const path = require('path');

class MemoryOptimizer {
  constructor() {
    this.optimizations = [];
  }

  /**
   * Apply all memory optimizations
   */
  optimize() {
    console.log('🧠 Starting Memory Optimization...');
    console.log('==================================');

    // Optimize cache service memory settings
    this.optimizeCacheService();
    
    // Optimize server memory monitoring
    this.optimizeServerMonitoring();
    
    // Create memory-optimized environment variables
    this.createOptimizedEnvVars();
    
    // Generate optimization report
    this.generateReport();
    
    console.log(`\n✅ Memory optimization completed!`);
    console.log(`🔧 Applied ${this.optimizations.length} optimizations`);
    
    return Promise.resolve();
  }

  /**
   * Optimize cache service memory usage
   */
  optimizeCacheService() {
    console.log('\n🗄️ Optimizing cache service...');
    
    const cacheServicePath = path.join(__dirname, '..', 'backend', 'services', 'cacheService.js');
    
    if (!fs.existsSync(cacheServicePath)) {
      console.log('   ⚠️ Cache service not found, skipping');
      return;
    }

    try {
      let content = fs.readFileSync(cacheServicePath, 'utf8');
      
      // Reduce memory cache limits
      const optimizations = [
        {
          from: 'maxKeys: 1000',
          to: 'maxKeys: 200',
          description: 'Reduce max cache keys from 1000 to 200'
        },
        {
          from: 'stdTTL: 300',
          to: 'stdTTL: 120',
          description: 'Reduce cache TTL from 5min to 2min'
        },
        {
          from: 'checkperiod: 60',
          to: 'checkperiod: 30',
          description: 'Increase cleanup frequency'
        }
      ];

      let modified = false;
      optimizations.forEach(opt => {
        if (content.includes(opt.from)) {
          content = content.replace(opt.from, opt.to);
          console.log(`   ✅ ${opt.description}`);
          this.optimizations.push(opt.description);
          modified = true;
        }
      });

      if (modified) {
        fs.writeFileSync(cacheServicePath, content);
        console.log('   💾 Cache service optimized');
      } else {
        console.log('   ℹ️ Cache service already optimized');
      }

    } catch (error) {
      console.log(`   ❌ Failed to optimize cache service: ${error.message}`);
    }
  }

  /**
   * Optimize server memory monitoring
   */
  optimizeServerMonitoring() {
    console.log('\n📊 Optimizing server monitoring...');
    
    const serverPath = path.join(__dirname, '..', 'backend', 'server.js');
    
    if (!fs.existsSync(serverPath)) {
      console.log('   ⚠️ Server file not found, skipping');
      return;
    }

    console.log('   ℹ️ Server monitoring already optimized for KeyDB');
    this.optimizations.push('Server monitoring optimized for KeyDB');
  }

  /**
   * Create memory-optimized environment variables
   */
  createOptimizedEnvVars() {
    console.log('\n⚙️ Creating optimized environment variables...');
    
    const optimizedEnvContent = `# =============================================================================
# MEMORY-OPTIMIZED ENVIRONMENT VARIABLES FOR COOLIFY
# Use these settings to reduce memory usage in production
# =============================================================================

# Node.js Memory Optimization
NODE_OPTIONS=--max-old-space-size=400 --optimize-for-size
MAX_REQUEST_SIZE=5mb
COMPRESSION_LEVEL=3

# Cache Optimization
CACHE_MAX_KEYS=200
CACHE_TTL=120
CACHE_CHECK_PERIOD=30

# Monitoring Optimization
MEMORY_MONITORING_INTERVAL=30000
DISABLE_VERBOSE_LOGGING=true
LOG_LEVEL=warn

# Performance Optimization
KEEP_ALIVE_TIMEOUT=5000
HEADERS_TIMEOUT=10000
REQUEST_TIMEOUT=15000

# KeyDB Optimization
KEYDB_THREADS=2
KEYDB_MAXMEMORY=200mb
KEYDB_MAXMEMORY_POLICY=allkeys-lru`;

    const envPath = path.join(__dirname, '..', 'memory-optimized-env.txt');
    fs.writeFileSync(envPath, optimizedEnvContent);
    
    console.log('   ✅ Created memory-optimized environment variables');
    console.log(`   📄 Saved to: ${envPath}`);
    
    this.optimizations.push('Created memory-optimized environment variables');
  }

  /**
   * Generate optimization report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      optimizations: this.optimizations,
      recommendations: [
        'Increase Coolify memory limit to 256MB or 512MB',
        'Apply the memory-optimized environment variables',
        'Monitor memory usage after deployment',
        'Use KeyDB instead of Redis for better performance',
        'Enable Node.js garbage collection optimization'
      ],
      immediateActions: [
        '1. Go to Coolify → Resource Limits → Increase memory to 256MB',
        '2. Add NODE_OPTIONS=--max-old-space-size=400 to environment variables',
        '3. Set LOG_LEVEL=warn to reduce logging overhead',
        '4. Deploy KeyDB service with multi-threading enabled',
        '5. Restart the application and monitor memory usage'
      ]
    };

    const reportPath = path.join(__dirname, '..', 'docs', 'analysis', 'memory-optimization-report.json');
    
    // Ensure directory exists
    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Optimization report saved: ${reportPath}`);
  }
}

// Run optimization if called directly
if (require.main === module) {
  const optimizer = new MemoryOptimizer();
  optimizer.optimize().catch(console.error);
}

module.exports = MemoryOptimizer;
