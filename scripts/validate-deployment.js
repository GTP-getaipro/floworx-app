#!/usr/bin/env node

/**
 * Deployment Validation Script
 * Comprehensive validation of production deployment before going live
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class DeploymentValidator {
  constructor() {
    this.validationResults = {};
    this.config = {};
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    this.adminToken = null;
  }

  /**
   * Main validation process
   */
  async run() {
    try {
      console.log('🔍 FloWorx Deployment Validation');
      );

    const categories = [
      'environment',
      'database',
      'applicationHealth',
      'monitoring',
      'alerting',
      'reporting',
      'security',
      'performance'
    ];

    for (const category of categories) {
      const result = this.validationResults[category];
      if (!result) continue;

      const statusIcon = result.status === 'pass' ? '✅' :
                        result.status === 'warn' ? '⚠️' : '❌';

      console.log(`${statusIcon} ${category.toUpperCase()}: ${result.status.toUpperCase()}`);
    }

    const summary = this.calculateSummary();

    console.log('');
    console.log(`Total Validations: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Warnings: ${summary.warned}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Success Rate: ${summary.successRate}%`);

    if (summary.failed > 0) {
      console.log('');
      console.log('❌ Deployment validation failed. Please address the issues above before proceeding.');
      process.exit(1);
    } else if (summary.warned > 0) {
      console.log('');
      console.log('⚠️  Deployment validation completed with warnings. Review the issues above.');
    } else {
      console.log('');
      console.log('🎉 All deployment validations passed! Ready for production deployment.');
    }
  }
}

// Handle script execution
if (require.main === module) {
  const validator = new DeploymentValidator();
  validator.run().catch(error => {
    console.error('Validation failed:', error.message);
    process.exit(1);
  });
}

module.exports = DeploymentValidator;
