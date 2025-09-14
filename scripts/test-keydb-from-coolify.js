#!/usr/bin/env node

/**
 * Run KeyDB Connection Test from Coolify Environment
 * This script executes the KeyDB test from within the deployed container
 */

const { execSync } = require('child_process');
const path = require('path');

);
);

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
  );
  );
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
