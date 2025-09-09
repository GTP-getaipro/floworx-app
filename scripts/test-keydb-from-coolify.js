#!/usr/bin/env node

/**
 * Run KeyDB Connection Test from Coolify Environment
 * This script executes the KeyDB test from within the deployed container
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Running KeyDB Connection Test from Coolify Environment');
console.log('========================================================');

console.log('\n📍 Current Environment:');
console.log(`   Working Directory: ${process.cwd()}`);
console.log(`   Node.js Version: ${process.version}`);
console.log(`   Platform: ${process.platform}`);

console.log('\n🌍 Environment Variables:');
console.log(`   REDIS_HOST: ${process.env.REDIS_HOST || 'not set'}`);
console.log(`   REDIS_PORT: ${process.env.REDIS_PORT || 'not set'}`);
console.log(`   REDIS_URL: ${process.env.REDIS_URL || 'not set'}`);
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
console.log(`   PORT: ${process.env.PORT || 'not set'}`);

try {
  console.log('\n🧪 Executing KeyDB Connection Test...');
  console.log('=====================================');
  
  // Run the test script
  const testScript = path.join(__dirname, '..', 'test-keydb-connection.js');
  const result = execSync(`node "${testScript}"`, { 
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 30000 // 30 seconds timeout
  });
  
  console.log(result);
  console.log('\n✅ KeyDB test completed successfully!');
  
} catch (error) {
  console.log('\n❌ KeyDB test failed:');
  console.log('====================');
  
  if (error.stdout) {
    console.log('📤 STDOUT:');
    console.log(error.stdout);
  }
  
  if (error.stderr) {
    console.log('\n📥 STDERR:');
    console.log(error.stderr);
  }
  
  console.log(`\n💥 Error: ${error.message}`);
  console.log(`📊 Exit Code: ${error.status}`);
  
  console.log('\n🔧 Troubleshooting Tips:');
  console.log('1. Check if KeyDB service is running in Coolify');
  console.log('2. Verify REDIS_HOST environment variable is set');
  console.log('3. Ensure both services are in the same network');
  console.log('4. Check KeyDB service logs for errors');
  
  process.exit(1);
}

console.log('\n🎯 Next Steps:');
console.log('1. Review the test results above');
console.log('2. If connections failed, check KeyDB service status');
console.log('3. If connections succeeded, restart your main application');
console.log('4. Monitor application logs for KeyDB connection success');

process.exit(0);
