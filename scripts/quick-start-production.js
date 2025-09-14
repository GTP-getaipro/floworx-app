#!/usr/bin/env node

/**
 * Quick Start Production Setup Script
 * Automated execution of all production setup steps
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class QuickStartProduction {
  constructor() {
    this.steps = [
      {
        name: 'Environment Configuration',
        script: 'setup-production-environment.js',
        args: ['--non-interactive'],
        required: true
      },
      {
        name: 'Alert Channels Setup',
        script: 'setup-alert-channels.js',
        args: [],
        required: true
      },
      {
        name: 'Deployment Dry Run',
        script: 'deploy-production-monitoring.js',
        args: ['--dry-run'],
        required: true
      },
      {
        name: 'Production Deployment',
        script: 'deploy-production-monitoring.js',
        args: ['--verbose'],
        required: true
      },
      {
        name: 'Deployment Validation',
        script: 'validate-deployment.js',
        args: [],
        required: true
      },
      {
        name: 'Health & Alert Testing',
        script: 'monitor-health-and-alerts.js',
        args: [],
        required: false
      }
    ];

    this.results = {};
    this.startTime = Date.now();
  }

  /**
   * Main execution
   */
  async run() {
    try {
      console.log('🚀 FloWorx Production Quick Start');
      );
    console.log(`Total Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`Steps Executed: ${summary.executed}/${summary.total}`);
    console.log(`Successful: ${summary.successful}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Success Rate: ${summary.successRate}%`);
    console.log('');

    // Show step results
    for (const step of this.steps) {
      const result = this.results[step.name];
      if (!result) {
        console.log(`⏭️  ${step.name}: Not executed`);
      } else {
        const icon = result.status === 'success' ? '✅' : '❌';
        console.log(`${icon} ${step.name}: ${result.status.toUpperCase()}`);
      }
    }

    console.log('');

    if (summary.failed > 0) {
      console.log('❌ Some steps failed. Please review the errors above and run individual scripts to fix issues.');
      console.log('');
      console.log('Manual recovery steps:');
      console.log('1. Check the error messages above');
      console.log('2. Run individual scripts to fix specific issues');
      console.log('3. Re-run this quick start script');
    } else if (summary.successful === summary.total) {
      console.log('🎉 All steps completed successfully!');
      console.log('');
      console.log('Your FloWorx production monitoring system is now fully deployed!');
      console.log('');
      console.log('Next steps:');
      console.log('1. Monitor the system for the first 24 hours');
      console.log('2. Review alert frequency and adjust thresholds if needed');
      console.log('3. Check stakeholder reports are being delivered');
      console.log('4. Start adaptive learning monitoring:');
      console.log('   node scripts/monitor-adaptive-learning.js');
    } else {
      console.log('⚠️  Deployment completed with some optional steps skipped.');
      console.log('Core monitoring functionality should be operational.');
    }
  }
}

// Handle script execution
if (require.main === module) {
  const quickStart = new QuickStartProduction();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Quick start interrupted by user');
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Quick start terminated');
    process.exit(1);
  });

  // Run quick start
  quickStart.run().catch(error => {
    console.error('Quick start failed:', error.message);
    process.exit(1);
  });
}

module.exports = QuickStartProduction;
