#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 FLOWORX COMPLETE TEST SUITE RUNNER');
console.log('====================================');

async function runTestSuite(testName, command) {
  return new Promise((resolve) => {
    console.log(`\n🧪 Running ${testName}...`);
    console.log(`📝 Command: ${command}`);
    console.log('─'.repeat(50));
    
    const startTime = Date.now();
    const process = spawn('node', [command], { 
      stdio: 'inherit',
      shell: true 
    });
    
    process.on('close', (code) => {
      const duration = Date.now() - startTime;
      console.log('─'.repeat(50));
      console.log(`✅ ${testName} completed in ${duration}ms (exit code: ${code})`);
      resolve({ testName, command, code, duration });
    });
    
    process.on('error', (error) => {
      console.log(`❌ ${testName} failed: ${error.message}`);
      resolve({ testName, command, error: error.message, duration: 0 });
    });
  });
}

async function runAllTests() {
  console.log('🎯 Starting comprehensive test execution...\n');
  console.log(`📅 Started: ${new Date().toLocaleString()}`);
  console.log(`🎯 Target: https://app.floworx-iq.com\n`);
  
  const testSuites = [
    {
      name: 'API Regression Tests',
      command: 'comprehensive-regression-tests.js',
      description: 'Backend API endpoint validation'
    },
    {
      name: 'Comprehensive UX Tests',
      command: 'comprehensive-ux-test-suite.js',
      description: 'Frontend user experience automation'
    },
    {
      name: 'Data Discovery Tests',
      command: 'find-existing-data.js',
      description: 'Database and system data validation'
    }
  ];
  
  const results = [];
  let totalDuration = 0;
  
  for (const suite of testSuites) {
    console.log(`\n🔍 Test Suite: ${suite.name}`);
    console.log(`📋 Description: ${suite.description}`);
    
    const result = await runTestSuite(suite.name, suite.command);
    results.push(result);
    totalDuration += result.duration || 0;
  }
  
  // Generate comprehensive summary
  console.log('\n🎉 ALL TESTS COMPLETED!');
  console.log('======================');
  console.log(`📊 Total Test Suites: ${testSuites.length}`);
  console.log(`⏱️ Total Duration: ${totalDuration}ms (${(totalDuration/1000).toFixed(1)}s)`);
  console.log(`📅 Completed: ${new Date().toLocaleString()}\n`);
  
  console.log('📋 Test Suite Results:');
  results.forEach((result, index) => {
    const status = result.code === 0 ? '✅' : '❌';
    const duration = result.duration ? `${result.duration}ms` : 'N/A';
    console.log(`   ${index + 1}. ${status} ${result.testName} (${duration})`);
  });
  
  // Check for generated files
  console.log('\n📄 Generated Reports:');
  const reportFiles = [
    'ux-test-results-2025-09-11.json',
    'regression-test-results-2025-09-11.json',
    'COMPREHENSIVE_UX_TEST_REPORT.md',
    'EXISTING_DATA_SUMMARY.md'
  ];
  
  reportFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      console.log(`   ✅ ${file} (${(stats.size/1024).toFixed(1)}KB)`);
    } else {
      console.log(`   ⚠️ ${file} (not found)`);
    }
  });
  
  // Check for screenshots
  console.log('\n📸 Screenshots Captured:');
  const screenshotDirs = ['test-screenshots', 'ux-test-screenshots'];
  
  screenshotDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
      console.log(`   📁 ${dir}: ${files.length} screenshots`);
    } else {
      console.log(`   📁 ${dir}: not found`);
    }
  });
  
  // Final recommendations
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. 📊 Review the comprehensive UX test report');
  console.log('2. 🔧 Address the high-priority issues identified');
  console.log('3. 🌐 Open the user experience dashboard');
  console.log('4. 🚀 Test the live application at https://app.floworx-iq.com');
  
  console.log('\n📋 Quick Commands:');
  console.log('• View UX Report: cat COMPREHENSIVE_UX_TEST_REPORT.md');
  console.log('• Open Dashboard: start user-experience-dashboard.html');
  console.log('• View Screenshots: explorer test-screenshots');
  console.log('• Check API Results: cat regression-test-results-2025-09-11.json');
  
  // Success summary
  const successfulTests = results.filter(r => r.code === 0).length;
  const successRate = ((successfulTests / results.length) * 100).toFixed(1);
  
  console.log(`\n🏆 OVERALL SUCCESS RATE: ${successRate}% (${successfulTests}/${results.length} test suites passed)`);
  
  if (successRate >= 80) {
    console.log('🎉 EXCELLENT: Your FloWorx application is performing very well!');
  } else if (successRate >= 60) {
    console.log('👍 GOOD: Your FloWorx application is functional with some areas for improvement.');
  } else {
    console.log('⚠️ NEEDS ATTENTION: Several issues need to be addressed for optimal performance.');
  }
  
  console.log('\n🚀 Your FloWorx SaaS application testing is complete!');
  
  return results;
}

// Run all tests if this script is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };
