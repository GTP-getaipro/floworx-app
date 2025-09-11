#!/usr/bin/env node

const fs = require('fs');
const { runComprehensiveUXTests } = require('./comprehensive-ux-test-suite');
const { runBusinessLogicTests } = require('./business-logic-test-suite');

async function runMasterTestSuite() {
  console.log('🎯 FLOWORX MASTER TEST SUITE');
  console.log('============================');
  console.log('Running comprehensive testing across all application areas...\n');

  const startTime = Date.now();
  const masterResults = {
    suites: {},
    summary: {
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      overallSuccessRate: 0,
      executionTime: 0,
    },
    recommendations: [],
    criticalIssues: [],
    timestamp: new Date().toISOString(),
  };

  try {
    // Run UX Test Suite
    console.log('🎨 Running UX Test Suite...');
    console.log('===========================');
    const uxResults = await runComprehensiveUXTests();
    masterResults.suites.ux = uxResults;
    
    console.log('\n⏳ Waiting 5 seconds before next suite...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Run Business Logic Test Suite
    console.log('🏢 Running Business Logic Test Suite...');
    console.log('======================================');
    const businessResults = await runBusinessLogicTests();
    masterResults.suites.businessLogic = businessResults;

    // Calculate overall statistics
    masterResults.summary.totalTests = uxResults.total + businessResults.total;
    masterResults.summary.totalPassed = uxResults.passed + businessResults.passed;
    masterResults.summary.totalFailed = uxResults.failed + businessResults.failed;
    masterResults.summary.overallSuccessRate = 
      ((masterResults.summary.totalPassed / masterResults.summary.totalTests) * 100).toFixed(1);
    masterResults.summary.executionTime = Math.round((Date.now() - startTime) / 1000);

    // Analyze results and generate recommendations
    analyzeResults(masterResults);

    // Generate comprehensive report
    generateMasterReport(masterResults);

    // Save master results
    const masterReportFile = `master-test-results-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(masterReportFile, JSON.stringify(masterResults, null, 2));

    console.log('\n🎉 MASTER TEST SUITE COMPLETE!');
    console.log('===============================');
    console.log(`📊 Overall Results: ${masterResults.summary.totalPassed}/${masterResults.summary.totalTests} tests passed (${masterResults.summary.overallSuccessRate}%)`);
    console.log(`⏱️  Total Execution Time: ${masterResults.summary.executionTime} seconds`);
    console.log(`📄 Master report saved to: ${masterReportFile}`);

  } catch (error) {
    console.error(`❌ Master test suite failed: ${error.message}`);
    masterResults.error = error.message;
  }

  return masterResults;
}

function analyzeResults(masterResults) {
  const { ux, businessLogic } = masterResults.suites;
  
  // Analyze UX results
  if (ux.failed > 0) {
    const failedUXTests = ux.tests.filter(test => !test.success);
    failedUXTests.forEach(test => {
      if (['Authentication', 'Security', 'OAuth'].includes(test.category)) {
        masterResults.criticalIssues.push({
          type: 'CRITICAL',
          category: test.category,
          issue: test.name,
          message: test.message,
          impact: 'High - Core functionality affected'
        });
      }
    });
  }

  // Analyze Business Logic results
  if (businessLogic.failed > 0) {
    const failedBusinessTests = businessLogic.tests.filter(test => !test.success);
    failedBusinessTests.forEach(test => {
      if (['User Journey', 'Integration'].includes(test.category)) {
        masterResults.criticalIssues.push({
          type: 'CRITICAL',
          category: test.category,
          issue: test.name,
          message: test.message,
          impact: 'High - User experience affected'
        });
      }
    });
  }

  // Generate recommendations based on success rates
  const uxSuccessRate = (ux.passed / ux.total) * 100;
  const businessSuccessRate = (businessLogic.passed / businessLogic.total) * 100;

  if (uxSuccessRate < 80) {
    masterResults.recommendations.push({
      priority: 'HIGH',
      area: 'User Experience',
      recommendation: 'Focus on fixing UX issues - success rate below 80%',
      details: `Current UX success rate: ${uxSuccessRate.toFixed(1)}%`
    });
  }

  if (businessSuccessRate < 70) {
    masterResults.recommendations.push({
      priority: 'HIGH',
      area: 'Business Logic',
      recommendation: 'Critical business logic issues need immediate attention',
      details: `Current business logic success rate: ${businessSuccessRate.toFixed(1)}%`
    });
  }

  // Category-specific recommendations
  Object.entries(ux.categories || {}).forEach(([category, stats]) => {
    const successRate = (stats.passed / stats.total) * 100;
    if (successRate < 50 && ['Authentication', 'Security'].includes(category)) {
      masterResults.recommendations.push({
        priority: 'CRITICAL',
        area: category,
        recommendation: `${category} has critical failures - immediate fix required`,
        details: `${category} success rate: ${successRate.toFixed(1)}%`
      });
    }
  });
}

function generateMasterReport(masterResults) {
  console.log('\n📋 COMPREHENSIVE TEST ANALYSIS');
  console.log('===============================');
  
  // Overall Statistics
  console.log('📊 Overall Statistics:');
  console.log(`   Total Tests Executed: ${masterResults.summary.totalTests}`);
  console.log(`   ✅ Passed: ${masterResults.summary.totalPassed}`);
  console.log(`   ❌ Failed: ${masterResults.summary.totalFailed}`);
  console.log(`   📈 Success Rate: ${masterResults.summary.overallSuccessRate}%`);
  console.log(`   ⏱️  Execution Time: ${masterResults.summary.executionTime}s`);

  // Suite Breakdown
  console.log('\n🔍 Suite Breakdown:');
  const { ux, businessLogic } = masterResults.suites;
  console.log(`   🎨 UX Suite: ${ux.passed}/${ux.total} (${((ux.passed/ux.total)*100).toFixed(1)}%)`);
  console.log(`   🏢 Business Logic: ${businessLogic.passed}/${businessLogic.total} (${((businessLogic.passed/businessLogic.total)*100).toFixed(1)}%)`);

  // Critical Issues
  if (masterResults.criticalIssues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES:');
    masterResults.criticalIssues.forEach((issue, index) => {
      console.log(`   ${index + 1}. [${issue.type}] ${issue.category}: ${issue.issue}`);
      console.log(`      ${issue.message}`);
      console.log(`      Impact: ${issue.impact}`);
    });
  }

  // Recommendations
  if (masterResults.recommendations.length > 0) {
    console.log('\n💡 RECOMMENDATIONS:');
    masterResults.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. [${rec.priority}] ${rec.area}:`);
      console.log(`      ${rec.recommendation}`);
      console.log(`      ${rec.details}`);
    });
  }

  // Success Assessment
  const overallRate = parseFloat(masterResults.summary.overallSuccessRate);
  console.log('\n🎯 OVERALL ASSESSMENT:');
  if (overallRate >= 90) {
    console.log('   🏆 EXCELLENT - System performing exceptionally well');
  } else if (overallRate >= 80) {
    console.log('   ✅ GOOD - System performing well with minor issues');
  } else if (overallRate >= 70) {
    console.log('   ⚠️  NEEDS ATTENTION - Several issues require fixing');
  } else if (overallRate >= 60) {
    console.log('   🔧 REQUIRES WORK - Significant issues need immediate attention');
  } else {
    console.log('   🚨 CRITICAL - Major system issues require urgent fixes');
  }

  // Next Steps
  console.log('\n🚀 NEXT STEPS:');
  if (masterResults.criticalIssues.length > 0) {
    console.log('   1. Address critical issues immediately');
    console.log('   2. Re-run tests to verify fixes');
    console.log('   3. Focus on high-priority recommendations');
  } else if (overallRate < 85) {
    console.log('   1. Review failed tests and implement fixes');
    console.log('   2. Focus on categories with lowest success rates');
    console.log('   3. Re-run tests to measure improvement');
  } else {
    console.log('   1. Monitor system performance regularly');
    console.log('   2. Consider adding more edge case tests');
    console.log('   3. Prepare for production deployment');
  }
}

// Run the master test suite
if (require.main === module) {
  runMasterTestSuite().catch(console.error);
}

module.exports = { runMasterTestSuite };
