#!/usr/bin/env node

/**
 * Alert Channels Setup and Validation Script
 * Configures and tests Slack, Email, and PagerDuty integrations
 */

const axios = require('axios');
const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class AlertChannelsSetup {
  constructor() {
    this.config = {};
    this.testResults = {};
  }

  /**
   * Main setup process
   */
  async run() {
    try {
      console.log('🚨 FloWorx Alert Channels Setup & Validation');
      );

    const channels = ['slack', 'email', 'pagerduty', 'teams'];

    for (const channel of channels) {
      const result = this.testResults[channel];
      if (!result) continue;

      const statusIcon = result.status === 'success' ? '✅' :
                        result.status === 'failed' ? '❌' : '⏭️';

      console.log(`${statusIcon} ${channel.toUpperCase()}: ${result.status.toUpperCase()}`);

      if (result.error) {
        console.log(`    Error: ${result.error}`);
      }
    }

    const summary = {
      total: Object.keys(this.testResults).length,
      successful: Object.values(this.testResults).filter(r => r.status === 'success').length,
      failed: Object.values(this.testResults).filter(r => r.status === 'failed').length
    };

    console.log('');
    console.log(`Total Channels: ${summary.total}`);
    console.log(`Successful: ${summary.successful}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Success Rate: ${((summary.successful / summary.total) * 100).toFixed(1)}%`);

    if (summary.failed > 0) {
      console.log('');
      console.log('⚠️  Some alert channels failed testing. Please review the configuration and try again.');
      console.log('💡 Check the following:');
      console.log('   - Webhook URLs are correct and accessible');
      console.log('   - API keys and credentials are valid');
      console.log('   - Network connectivity to external services');
      console.log('   - SMTP server settings and authentication');
    } else {
      console.log('');
      console.log('🎉 All configured alert channels are working correctly!');
    }
  }
}

// Handle script execution
if (require.main === module) {
  const setup = new AlertChannelsSetup();
  setup.run().catch(error => {
    console.error('Alert channels setup failed:', error.message);
    process.exit(1);
  });
}

module.exports = AlertChannelsSetup;
