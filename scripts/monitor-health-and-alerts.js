#!/usr/bin/env node

/**
 * Health Check and Alert Monitoring Script
 * Comprehensive validation and testing of monitoring system components
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class HealthAndAlertMonitor {
  constructor() {
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.adminToken = null;
    this.testResults = {};
    this.monitoringData = {};
  }

  /**
   * Main monitoring process
   */
  async run() {
    try {
      console.log('🏥 FloWorx Health Check & Alert Monitoring');
      );

    const categories = [
      'healthChecks',
      'alertGeneration',
      'monitoringMetrics',
      'errorTracking',
      'reporting',
      'adaptiveThresholds'
    ];

    for (const category of categories) {
      const result = this.testResults[category];
      if (!result) continue;

      const statusIcon = result.status === 'pass' ? '✅' :
                        result.status === 'warn' ? '⚠️' : '❌';

      console.log(`${statusIcon} ${category.toUpperCase()}: ${result.status.toUpperCase()}`);

      // Show nested results for complex categories
      if (typeof result === 'object' && !result.status) {
        for (const [subCategory, subResult] of Object.entries(result)) {
          const subStatusIcon = subResult.status === 'pass' ? '✅' :
                               subResult.status === 'warn' ? '⚠️' : '❌';
          console.log(`    ${subStatusIcon} ${subCategory}: ${subResult.status}`);
        }
      }
    }

    const summary = this.calculateTestSummary();

    console.log('');
    console.log(`Total Tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Warnings: ${summary.warned}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Success Rate: ${summary.successRate}%`);

    if (summary.failed > 0) {
      console.log('');
      console.log('❌ Some health checks failed. Please review the issues above.');
    } else if (summary.warned > 0) {
      console.log('');
      console.log('⚠️  Health checks completed with warnings. System is functional but could be improved.');
    } else {
      console.log('');
      console.log('🎉 All health checks passed! Monitoring system is fully operational.');
    }
  }
}

// Handle script execution
if (require.main === module) {
  const monitor = new HealthAndAlertMonitor();
  monitor.run().catch(error => {
    console.error('Health monitoring failed:', error.message);
    process.exit(1);
  });
}

module.exports = HealthAndAlertMonitor;
