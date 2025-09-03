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
      console.log('===========================================');
      console.log('');

      // Load environment configuration
      await this.loadEnvironmentConfig();

      // Test each alert channel
      await this.testSlackIntegration();
      await this.testEmailIntegration();
      await this.testPagerDutyIntegration();
      await this.testTeamsIntegration();

      // Generate test report
      await this.generateTestReport();

      // Display summary
      this.displaySummary();

    } catch (error) {
      console.error('❌ Alert channels setup failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Load environment configuration
   */
  async loadEnvironmentConfig() {
    try {
      // Try to load from .env.production first
      const envPath = path.join(process.cwd(), '.env.production');
      
      try {
        const envContent = await fs.readFile(envPath, 'utf8');
        this.parseEnvFile(envContent);
        console.log('📋 Loaded configuration from .env.production');
      } catch (error) {
        // Fall back to process.env
        this.config = { ...process.env };
        console.log('📋 Using environment variables from process.env');
      }

    } catch (error) {
      throw new Error(`Failed to load configuration: ${error.message}`);
    }
  }

  /**
   * Parse environment file
   */
  parseEnvFile(content) {
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=');
        this.config[key] = value;
      }
    }
  }

  /**
   * Test Slack integration
   */
  async testSlackIntegration() {
    console.log('📱 Testing Slack integration...');

    if (this.config.SLACK_ALERTS_ENABLED !== 'true') {
      console.log('  ⏭️  Slack alerts disabled, skipping test');
      this.testResults.slack = { enabled: false, status: 'skipped' };
      return;
    }

    if (!this.config.SLACK_WEBHOOK_URL || this.config.SLACK_WEBHOOK_URL.includes('YOUR')) {
      console.log('  ❌ Slack webhook URL not configured');
      this.testResults.slack = { enabled: true, status: 'failed', error: 'Webhook URL not configured' };
      return;
    }

    try {
      const testMessage = {
        channel: this.config.SLACK_ALERT_CHANNEL || '#floworx-alerts',
        username: 'FloWorx Monitor',
        icon_emoji: ':white_check_mark:',
        text: '✅ FloWorx Alert Channel Test',
        attachments: [{
          color: 'good',
          title: 'Alert System Test',
          text: 'This is a test message to verify Slack integration is working correctly.',
          fields: [
            {
              title: 'Environment',
              value: this.config.NODE_ENV || 'production',
              short: true
            },
            {
              title: 'Timestamp',
              value: new Date().toISOString(),
              short: true
            }
          ],
          footer: 'FloWorx Monitoring System',
          ts: Math.floor(Date.now() / 1000)
        }]
      };

      const response = await axios.post(this.config.SLACK_WEBHOOK_URL, testMessage, {
        timeout: 10000
      });

      if (response.status === 200) {
        console.log('  ✅ Slack integration test successful');
        this.testResults.slack = { 
          enabled: true, 
          status: 'success',
          channel: this.config.SLACK_ALERT_CHANNEL,
          responseTime: response.headers['x-response-time'] || 'N/A'
        };
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }

    } catch (error) {
      console.log(`  ❌ Slack integration test failed: ${error.message}`);
      this.testResults.slack = { 
        enabled: true, 
        status: 'failed', 
        error: error.message 
      };
    }
  }

  /**
   * Test Email integration
   */
  async testEmailIntegration() {
    console.log('📧 Testing Email integration...');

    if (this.config.EMAIL_ALERTS_ENABLED !== 'true') {
      console.log('  ⏭️  Email alerts disabled, skipping test');
      this.testResults.email = { enabled: false, status: 'skipped' };
      return;
    }

    if (!this.config.SMTP_HOST || !this.config.SMTP_USER || !this.config.SMTP_PASSWORD) {
      console.log('  ❌ Email configuration incomplete');
      this.testResults.email = { enabled: true, status: 'failed', error: 'SMTP configuration incomplete' };
      return;
    }

    try {
      const transporter = nodemailer.createTransporter({
        host: this.config.SMTP_HOST,
        port: parseInt(this.config.SMTP_PORT) || 587,
        secure: this.config.SMTP_PORT === '465',
        auth: {
          user: this.config.SMTP_USER,
          pass: this.config.SMTP_PASSWORD
        }
      });

      // Verify SMTP connection
      await transporter.verify();
      console.log('  ✅ SMTP connection verified');

      // Send test email
      const testEmail = {
        from: this.config.ALERT_FROM_EMAIL || this.config.SMTP_USER,
        to: this.config.CRITICAL_ALERT_EMAILS?.split(',')[0] || this.config.SMTP_USER,
        subject: '✅ FloWorx Alert System Test',
        html: this.generateTestEmailHTML()
      };

      const info = await transporter.sendMail(testEmail);
      console.log('  ✅ Test email sent successfully');
      
      this.testResults.email = { 
        enabled: true, 
        status: 'success',
        messageId: info.messageId,
        recipient: testEmail.to,
        smtpHost: this.config.SMTP_HOST
      };

    } catch (error) {
      console.log(`  ❌ Email integration test failed: ${error.message}`);
      this.testResults.email = { 
        enabled: true, 
        status: 'failed', 
        error: error.message 
      };
    }
  }

  /**
   * Test PagerDuty integration
   */
  async testPagerDutyIntegration() {
    console.log('📟 Testing PagerDuty integration...');

    if (this.config.PAGERDUTY_ENABLED !== 'true') {
      console.log('  ⏭️  PagerDuty disabled, skipping test');
      this.testResults.pagerduty = { enabled: false, status: 'skipped' };
      return;
    }

    if (!this.config.PAGERDUTY_INTEGRATION_KEY) {
      console.log('  ❌ PagerDuty integration key not configured');
      this.testResults.pagerduty = { enabled: true, status: 'failed', error: 'Integration key not configured' };
      return;
    }

    try {
      const testEvent = {
        routing_key: this.config.PAGERDUTY_INTEGRATION_KEY,
        event_action: 'trigger',
        dedup_key: `floworx-test-${Date.now()}`,
        payload: {
          summary: '✅ FloWorx Alert System Test',
          severity: 'info',
          source: 'FloWorx Monitoring Test',
          component: 'alert-system',
          group: 'FloWorx',
          class: 'test'
        }
      };

      const response = await axios.post('https://events.pagerduty.com/v2/enqueue', testEvent, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 202) {
        console.log('  ✅ PagerDuty integration test successful');
        this.testResults.pagerduty = { 
          enabled: true, 
          status: 'success',
          dedupKey: testEvent.dedup_key,
          responseStatus: response.status
        };
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }

    } catch (error) {
      console.log(`  ❌ PagerDuty integration test failed: ${error.message}`);
      this.testResults.pagerduty = { 
        enabled: true, 
        status: 'failed', 
        error: error.message 
      };
    }
  }

  /**
   * Test Microsoft Teams integration
   */
  async testTeamsIntegration() {
    console.log('👥 Testing Microsoft Teams integration...');

    if (this.config.TEAMS_ALERTS_ENABLED !== 'true') {
      console.log('  ⏭️  Teams alerts disabled, skipping test');
      this.testResults.teams = { enabled: false, status: 'skipped' };
      return;
    }

    if (!this.config.TEAMS_WEBHOOK_URL || this.config.TEAMS_WEBHOOK_URL.includes('your-teams-webhook')) {
      console.log('  ❌ Teams webhook URL not configured');
      this.testResults.teams = { enabled: true, status: 'failed', error: 'Webhook URL not configured' };
      return;
    }

    try {
      const testMessage = {
        '@type': 'MessageCard',
        '@context': 'http://schema.org/extensions',
        themeColor: '00FF00',
        summary: 'FloWorx Alert System Test',
        sections: [{
          activityTitle: '✅ FloWorx Alert System Test',
          activitySubtitle: 'Testing Microsoft Teams integration',
          facts: [
            {
              name: 'Environment',
              value: this.config.NODE_ENV || 'production'
            },
            {
              name: 'Test Type',
              value: 'Alert Channel Validation'
            },
            {
              name: 'Timestamp',
              value: new Date().toISOString()
            }
          ]
        }]
      };

      const response = await axios.post(this.config.TEAMS_WEBHOOK_URL, testMessage, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        console.log('  ✅ Teams integration test successful');
        this.testResults.teams = { 
          enabled: true, 
          status: 'success',
          responseStatus: response.status
        };
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }

    } catch (error) {
      console.log(`  ❌ Teams integration test failed: ${error.message}`);
      this.testResults.teams = { 
        enabled: true, 
        status: 'failed', 
        error: error.message 
      };
    }
  }

  /**
   * Generate test email HTML
   */
  generateTestEmailHTML() {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px;">
          <div style="background-color: #28a745; color: white; padding: 15px; border-radius: 5px;">
            <h2>✅ FloWorx Alert System Test</h2>
          </div>
          <div style="padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-top: 10px;">
            <h3>Email Integration Test</h3>
            <p>This is a test email to verify that the FloWorx alert system can successfully send email notifications.</p>
            <p><strong>Environment:</strong> ${this.config.NODE_ENV || 'production'}</p>
            <p><strong>SMTP Host:</strong> ${this.config.SMTP_HOST}</p>
            <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
            <p><strong>Status:</strong> <span style="color: #28a745;">✅ SUCCESS</span></p>
          </div>
          <div style="margin-top: 20px; font-size: 12px; color: #666;">
            <p>This test was generated by the FloWorx Alert Channels Setup Script</p>
            <p>If you received this email, your email alert configuration is working correctly.</p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate test report
   */
  async generateTestReport() {
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.config.NODE_ENV || 'production',
      testResults: this.testResults,
      summary: {
        totalChannels: Object.keys(this.testResults).length,
        successfulChannels: Object.values(this.testResults).filter(r => r.status === 'success').length,
        failedChannels: Object.values(this.testResults).filter(r => r.status === 'failed').length,
        skippedChannels: Object.values(this.testResults).filter(r => r.status === 'skipped').length
      }
    };

    try {
      await fs.mkdir('./reports', { recursive: true });
      const reportPath = `./reports/alert-channels-test-${Date.now()}.json`;
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Test report saved: ${reportPath}`);
    } catch (error) {
      console.warn(`⚠️  Failed to save test report: ${error.message}`);
    }
  }

  /**
   * Display summary
   */
  displaySummary() {
    console.log('');
    console.log('📊 Alert Channels Test Summary');
    console.log('==============================');

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
