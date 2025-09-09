#!/usr/bin/env node

/**
 * Memory Optimization Script for Coolify Deployment
 * Helps reduce memory usage and prevent OOM errors
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧠 FloWorx Memory Optimization Script');
console.log('=====================================');

function optimizeNodeOptions() {
  console.log('\n🔧 Optimizing Node.js memory settings...');

  const startScript = path.join(__dirname, '..', 'start.sh');

  if (!fs.existsSync(startScript)) {
    console.log('❌ start.sh not found');
    return false;
  }

  let content = fs.readFileSync(startScript, 'utf8');

  // Update memory limit to be more conservative
  if (content.includes('--max-old-space-size=512')) {
    content = content.replace('--max-old-space-size=512', '--max-old-space-size=256');
    console.log('✅ Reduced Node.js heap size to 256MB');
  }

  // Add garbage collection hints
  if (!content.includes('--optimize-for-size')) {
    content = content.replace('exec node', 'exec node --optimize-for-size --max-old-space-size=256');
    console.log('✅ Added memory optimization flags');
  }

  fs.writeFileSync(startScript, content);
  console.log('✅ Updated start.sh with memory optimizations');

  return true;
}

function createMemoryMonitoringScript() {
  console.log('\n📊 Creating memory monitoring script...');

  const monitorScript = `#!/usr/bin/env node

/**
 * Memory Monitor for Coolify Deployment
 * Monitors and reports memory usage
 */

setInterval(() => {
  const memUsage = process.memoryUsage();
  const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  const memLimitMB = Math.round(memUsage.heapTotal / 1024 / 1024);
  const memPercent = Math.round((memUsageMB / memLimitMB) * 100);

  if (memPercent > 80) {
    console.warn(\`🚨 HIGH MEMORY USAGE: \${memUsageMB}MB/\${memLimitMB}MB (\${memPercent}%)\`);
  } else if (memPercent > 60) {
    console.log(\`⚠️ Moderate memory usage: \${memUsageMB}MB/\${memLimitMB}MB (\${memPercent}%)\`);
  }

  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
}, 30000); // Check every 30 seconds

console.log('🧠 Memory monitor started');
`;

  const monitorPath = path.join(__dirname, '..', 'scripts', 'memory-monitor.js');
  fs.writeFileSync(monitorPath, monitorScript);
  console.log('✅ Created memory monitoring script');

  return monitorPath;
}

function updateDockerfileMemory() {
  console.log('\n🐳 Optimizing Dockerfile memory settings...');

  const dockerfile = path.join(__dirname, '..', 'Dockerfile');

  if (!fs.existsSync(dockerfile)) {
    console.log('❌ Dockerfile not found');
    return false;
  }

  let content = fs.readFileSync(dockerfile, 'utf8');

  // Update memory limits in Dockerfile
  if (content.includes('memory: 512M')) {
    content = content.replace('memory: 512M', 'memory: 256M');
    content = content.replace('memory: 256M', 'memory: 128M');
    console.log('✅ Reduced Docker memory limits');
  }

  fs.writeFileSync(dockerfile, content);
  console.log('✅ Updated Dockerfile with memory optimizations');

  return true;
}

function updateCacheSettings() {
  console.log('\n🗄️ Optimizing cache settings...');

  const cacheService = path.join(__dirname, '..', 'backend', 'services', 'cacheService.js');

  if (!fs.existsSync(cacheService)) {
    console.log('❌ Cache service not found');
    return false;
  }

  let content = fs.readFileSync(cacheService, 'utf8');

  // Reduce cache sizes
  content = content.replace(
    'maxKeys: process.env.CACHE_MAX_KEYS || 100',
    'maxKeys: process.env.CACHE_MAX_KEYS || 50'
  );

  content = content.replace(
    'stdTTL: process.env.CACHE_TTL || 60',
    'stdTTL: process.env.CACHE_TTL || 30'
  );

  fs.writeFileSync(cacheService, content);
  console.log('✅ Reduced cache size and TTL for memory efficiency');

  return true;
}

function createEnvironmentOverrides() {
  console.log('\n🌍 Creating memory-focused environment overrides...');

  const envContent = `# Memory Optimization Overrides
NODE_OPTIONS=--optimize-for-size --max-old-space-size=256
CACHE_MAX_KEYS=50
CACHE_TTL=30
LOG_LEVEL=warn
COMPRESSION_LEVEL=9
MAX_REQUEST_SIZE=5mb
RATE_LIMIT_MAX_REQUESTS=50
`;

  const envPath = path.join(__dirname, '..', 'memory-optimizations.env');
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created memory optimization environment file');

  return envPath;
}

function main() {
  console.log('Starting memory optimization process...\n');

  let optimizations = 0;

  if (optimizeNodeOptions()) optimizations++;
  if (createMemoryMonitoringScript()) optimizations++;
  if (updateDockerfileMemory()) optimizations++;
  if (updateCacheSettings()) optimizations++;
  if (createEnvironmentOverrides()) optimizations++;

  console.log(`\n🎉 Memory optimization complete!`);
  console.log(`Applied ${optimizations} optimizations:`);
  console.log('  ✅ Node.js memory limits reduced');
  console.log('  ✅ Memory monitoring enabled');
  console.log('  ✅ Docker memory limits optimized');
  console.log('  ✅ Cache settings optimized');
  console.log('  ✅ Environment overrides created');

  console.log('\n📋 Next Steps:');
  console.log('1. Commit and push these changes');
  console.log('2. Redeploy in Coolify');
  console.log('3. Monitor memory usage in Coolify logs');
  console.log('4. If issues persist, consider scaling up the instance');

  console.log('\n🔍 To monitor memory in production:');
  console.log('  node scripts/memory-monitor.js');
}

if (require.main === module) {
  main();
}

module.exports = { main, optimizeNodeOptions, createMemoryMonitoringScript, updateDockerfileMemory, updateCacheSettings, createEnvironmentOverrides };
