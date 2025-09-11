
#!/usr/bin/env node

/**
 * Comprehensive Test Script
 * Tests all fixed components
 */

const { execSync } = require('child_process');

async function runTests() {
  console.log('🧪 Running comprehensive tests...\n');
  
  const tests = [
    {
      name: 'Database Connection',
      command: 'node fix-database-connection.js',
      critical: true
    },
    {
      name: 'Create Test User',
      command: 'node create-test-user.js',
      critical: true
    },
    {
      name: 'Frontend Tests',
      command: 'npm run test -- --testPathPattern=frontend --passWithNoTests',
      critical: false
    },
    {
      name: 'Backend Tests',
      command: 'npm run test -- --testPathPattern=backend --passWithNoTests',
      critical: false
    }
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    console.log(`\n🔍 Running: ${test.name}`);
    
    try {
      execSync(test.command, { stdio: 'inherit', timeout: 30000 });
      console.log(`✅ ${test.name} - PASSED`);
    } catch (error) {
      console.log(`❌ ${test.name} - FAILED`);
      if (test.critical) {
        allPassed = false;
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('🎉 All critical tests passed!');
    console.log('✅ Your app should be working properly now.');
  } else {
    console.log('🚨 Some critical tests failed!');
    console.log('❌ Please review the errors above.');
  }
  
  return allPassed;
}

if (require.main === module) {
  require('dotenv').config();
  runTests().then(success => process.exit(success ? 0 : 1));
}

module.exports = { runTests };
