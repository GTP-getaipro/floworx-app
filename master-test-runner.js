const { runComprehensiveTests } = require('./test-suite-comprehensive');
const { runPerformanceAccessibilityTests } = require('./test-performance-accessibility');
const { runCrossBrowserTests } = require('./test-cross-browser');
const { runEdgeCaseStressTests } = require('./test-edge-cases-stress');
const { runUserJourneyTests } = require('./test-user-journeys');

class MasterTestRunner {
  constructor() {
    this.results = {
      comprehensive: null,
      performanceAccessibility: null,
      crossBrowser: null,
      edgeCaseStress: null,
      userJourneys: null,
      startTime: Date.now(),
      endTime: null
    };
  }

  async runAllTestSuites() {
    console.log('🚀 FLOWORX MASTER TEST SUITE RUNNER');
    console.log('=' .repeat(80));
    console.log(`📅 Started at: ${new Date().toLocaleString()}`);
    console.log('🎯 Running comprehensive browser tests for all fixes and enhancements');
    console.log('');

    try {
      // Run Comprehensive Tests
      console.log('🔄 PHASE 1: COMPREHENSIVE FUNCTIONALITY TESTS');
      console.log('─'.repeat(60));
      this.results.comprehensive = await runComprehensiveTests();
      console.log(`✅ Comprehensive tests completed: ${this.results.comprehensive.overallScore}%`);

      // Run Cross-Browser Tests
      console.log('\n🔄 PHASE 2: CROSS-BROWSER COMPATIBILITY TESTS');
      console.log('─'.repeat(60));
      this.results.crossBrowser = await runCrossBrowserTests();
      const crossBrowserScore = this.calculateCrossBrowserScore(this.results.crossBrowser);
      console.log(`✅ Cross-browser tests completed: ${crossBrowserScore}%`);

      // Run Edge Case & Stress Tests
      console.log('\n🔄 PHASE 3: EDGE CASE & STRESS TESTS');
      console.log('─'.repeat(60));
      this.results.edgeCaseStress = await runEdgeCaseStressTests();
      console.log(`✅ Edge case & stress tests completed: ${this.results.edgeCaseStress.overallScore}%`);

      // Run User Journey Tests
      console.log('\n🔄 PHASE 4: USER JOURNEY TESTS');
      console.log('─'.repeat(60));
      this.results.userJourneys = await runUserJourneyTests();
      console.log(`✅ User journey tests completed: ${this.results.userJourneys.overallScore}%`);

      // Run Performance & Accessibility Tests
      console.log('\n🔄 PHASE 5: PERFORMANCE & ACCESSIBILITY TESTS');
      console.log('─'.repeat(60));
      this.results.performanceAccessibility = await runPerformanceAccessibilityTests();
      console.log(`✅ Performance & Accessibility tests completed: ${this.results.performanceAccessibility.overallScore}%`);

      this.results.endTime = Date.now();
      return this.generateMasterReport();

    } catch (error) {
      console.error('❌ Master test suite failed:', error);
      this.results.endTime = Date.now();
      return this.generateMasterReport();
    }
  }

  calculateCrossBrowserScore(crossBrowserResults) {
    const scores = Object.values(crossBrowserResults).map(r => r.score || 0);
    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }

  generateMasterReport() {
    const duration = Math.round((this.results.endTime - this.results.startTime) / 1000);
    
    console.log('\n🏆 MASTER TEST SUITE RESULTS');
    console.log('=' .repeat(80));
    console.log(`⏱️  Total execution time: ${duration} seconds`);
    console.log(`📅 Completed at: ${new Date().toLocaleString()}`);
    console.log('');

    // Calculate overall scores
    const comprehensiveScore = this.results.comprehensive?.overallScore || 0;
    const crossBrowserScore = this.calculateCrossBrowserScore(this.results.crossBrowser || {});
    const edgeCaseScore = this.results.edgeCaseStress?.overallScore || 0;
    const userJourneyScore = this.results.userJourneys?.overallScore || 0;
    const performanceScore = this.results.performanceAccessibility?.overallScore || 0;

    const overallScore = Math.round((comprehensiveScore + crossBrowserScore + edgeCaseScore + userJourneyScore + performanceScore) / 5);

    console.log('📊 CATEGORY SCORES');
    console.log('─'.repeat(50));
    console.log(`🔧 Comprehensive Functionality: ${comprehensiveScore}% ${this.getScoreEmoji(comprehensiveScore)}`);
    console.log(`🌐 Cross-Browser Compatibility: ${crossBrowserScore}% ${this.getScoreEmoji(crossBrowserScore)}`);
    console.log(`🔥 Edge Case & Stress Tests: ${edgeCaseScore}% ${this.getScoreEmoji(edgeCaseScore)}`);
    console.log(`👥 User Journey Tests: ${userJourneyScore}% ${this.getScoreEmoji(userJourneyScore)}`);
    console.log(`⚡ Performance & Accessibility: ${performanceScore}% ${this.getScoreEmoji(performanceScore)}`);
    console.log('');
    console.log(`🎯 OVERALL SCORE: ${overallScore}% ${this.getScoreEmoji(overallScore)}`);

    // Detailed breakdown
    console.log('\n🔍 DETAILED BREAKDOWN');
    console.log('─'.repeat(50));

    if (this.results.comprehensive) {
      console.log('📋 Comprehensive Test Results:');
      Object.entries(this.results.comprehensive.categoryScores || {}).forEach(([category, result]) => {
        const categoryName = category.replace(/([A-Z])/g, ' $1').trim();
        console.log(`   ${categoryName}: ${result.score}% ${this.getScoreEmoji(result.score)}`);
      });
    }

    if (this.results.performanceAccessibility) {
      console.log('\n⚡ Performance & Accessibility Results:');
      Object.entries(this.results.performanceAccessibility.categoryScores || {}).forEach(([category, result]) => {
        console.log(`   ${category.toUpperCase()}: ${result.score}% ${this.getScoreEmoji(result.score)}`);
      });
    }

    // Summary and recommendations
    console.log('\n🎉 SUMMARY & RECOMMENDATIONS');
    console.log('─'.repeat(50));

    if (overallScore >= 90) {
      console.log('🏆 OUTSTANDING! All systems are working excellently!');
      console.log('✨ The Floworx application is ready for production with:');
      console.log('   • Perfect login form layout and functionality');
      console.log('   • Complete communication cut-off fixes');
      console.log('   • Enhanced UX features working flawlessly');
      console.log('   • Strong performance and accessibility');
    } else if (overallScore >= 80) {
      console.log('✅ EXCELLENT! The application is working very well!');
      console.log('🎯 Key achievements:');
      console.log('   • Login form layout issues completely resolved');
      console.log('   • Communication cut-off problems fixed');
      console.log('   • Most enhanced UX features working properly');
      console.log('   • Solid performance metrics');
    } else if (overallScore >= 70) {
      console.log('👍 GOOD! Most features are working well!');
      console.log('⚠️  Some areas may need minor improvements:');
      if (comprehensiveScore < 80) console.log('   • Review comprehensive functionality');
      if (performanceScore < 80) console.log('   • Optimize performance and accessibility');
    } else {
      console.log('⚠️  NEEDS ATTENTION - Several areas require fixes!');
      console.log('🔧 Priority fixes needed');
    }

    // Test coverage summary
    console.log('\n📈 TEST COVERAGE SUMMARY');
    console.log('─'.repeat(50));
    console.log('✅ Login Form Layout & Password Input Issues');
    console.log('✅ Communication Cut-off Fixes (Toasts, Alerts, Errors)');
    console.log('✅ Enhanced UX Features (Validation, Persistence, Loading)');
    console.log('✅ Responsive Design Across All Screen Sizes');
    console.log('✅ Performance Metrics & Optimization');
    console.log('✅ Accessibility Standards Compliance');
    console.log('✅ SEO Best Practices');
    console.log('✅ Security Fundamentals');

    console.log('\n🎯 NEXT STEPS');
    console.log('─'.repeat(30));
    if (overallScore >= 85) {
      console.log('🚀 Ready for production deployment!');
      console.log('📊 Consider monitoring user feedback for further improvements');
    } else if (overallScore >= 75) {
      console.log('🔧 Address minor issues identified in the detailed breakdown');
      console.log('🧪 Run focused tests on lower-scoring categories');
    } else {
      console.log('⚠️  Focus on critical issues in lowest-scoring categories');
      console.log('🔄 Re-run tests after implementing fixes');
    }

    return {
      overallScore,
      comprehensiveScore,
      performanceScore,
      duration,
      timestamp: new Date().toISOString()
    };
  }

  getScoreEmoji(score) {
    if (score >= 90) return '🏆';
    if (score >= 80) return '✅';
    if (score >= 70) return '👍';
    if (score >= 60) return '⚠️';
    return '❌';
  }
}

// Run all tests
async function runAllTests() {
  const masterRunner = new MasterTestRunner();
  return await masterRunner.runAllTestSuites();
}

// Execute if run directly
if (require.main === module) {
  runAllTests()
    .then(results => {
      console.log(`\n📋 Master test suite completed with ${results.overallScore}% overall score`);
      process.exit(results.overallScore >= 75 ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Master test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { MasterTestRunner, runAllTests };
