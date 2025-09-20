#!/usr/bin/env node

/**
 * Continuous Issue Monitor for FloWorx
 * 
 * Monitors the codebase continuously for critical issues
 * Prevents regressions and catches new issues early
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class ContinuousIssueMonitor {
  constructor(options = {}) {
    this.projectRoot = process.cwd();
    this.monitoringInterval = options.interval || 60000; // 1 minute default
    this.isRunning = false;
    this.lastScanResults = null;
    this.alertThresholds = {
      critical: 0, // Alert on any critical issues
      high: 5,     // Alert if more than 5 high issues
      medium: 20   // Alert if more than 20 medium issues
    };
    this.webhookUrl = process.env.FLOWORX_ALERT_WEBHOOK;
    this.emailAlert = process.env.FLOWORX_ALERT_EMAIL;
  }

  async startMonitoring() {
    console.log('🔍 Starting Continuous Issue Monitoring...');
    console.log(`📊 Monitoring interval: ${this.monitoringInterval / 1000} seconds`);
    console.log(`🎯 Alert thresholds: Critical=${this.alertThresholds.critical}, High=${this.alertThresholds.high}, Medium=${this.alertThresholds.medium}`);
    
    this.isRunning = true;
    
    // Initial scan
    await this.performScan();
    
    // Set up continuous monitoring
    this.monitoringTimer = setInterval(async () => {
      if (this.isRunning) {
        await this.performScan();
      }
    }, this.monitoringInterval);

    // Handle graceful shutdown
    process.on('SIGINT', () => this.stopMonitoring());
    process.on('SIGTERM', () => this.stopMonitoring());
    
    console.log('✅ Continuous monitoring started. Press Ctrl+C to stop.\n');
  }

  async performScan() {
    try {
      console.log(`🔍 [${new Date().toISOString()}] Performing issue scan...`);
      
      // Run the critical issue detector
      const results = await this.runIssueDetector();
      
      if (results) {
        await this.analyzeResults(results);
        await this.checkForRegressions(results);
        await this.generateAlerts(results);
        
        this.lastScanResults = results;
      }
      
    } catch (error) {
      console.error('❌ Error during scan:', error.message);
    }
  }

  async runIssueDetector() {
    return new Promise((resolve, reject) => {
      const detector = spawn('node', ['critical-issue-detector.js'], {
        cwd: this.projectRoot,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      detector.stdout.on('data', (data) => {
        output += data.toString();
      });

      detector.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      detector.on('close', (code) => {
        if (code === 0) {
          try {
            // Load the generated report
            const reportPath = path.join(this.projectRoot, 'critical-issues-report.json');
            if (fs.existsSync(reportPath)) {
              const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
              resolve(report);
            } else {
              resolve(null);
            }
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error(`Issue detector failed with code ${code}: ${errorOutput}`));
        }
      });
    });
  }

  async analyzeResults(results) {
    const { issuesBySeverity, totalIssues } = results;
    
    const critical = (issuesBySeverity.critical || []).length;
    const high = (issuesBySeverity.high || []).length;
    const medium = (issuesBySeverity.medium || []).length;
    const low = (issuesBySeverity.low || []).length;

    console.log(`📊 Scan Results: ${totalIssues} total issues`);
    console.log(`   🔴 Critical: ${critical}`);
    console.log(`   🟠 High: ${high}`);
    console.log(`   🟡 Medium: ${medium}`);
    console.log(`   🟢 Low: ${low}`);

    // Check against thresholds
    const alerts = [];
    
    if (critical > this.alertThresholds.critical) {
      alerts.push({
        severity: 'critical',
        message: `${critical} critical issues detected (threshold: ${this.alertThresholds.critical})`,
        count: critical,
        issues: issuesBySeverity.critical.slice(0, 5) // First 5 for alert
      });
    }

    if (high > this.alertThresholds.high) {
      alerts.push({
        severity: 'high',
        message: `${high} high-priority issues detected (threshold: ${this.alertThresholds.high})`,
        count: high,
        issues: issuesBySeverity.high.slice(0, 3)
      });
    }

    if (medium > this.alertThresholds.medium) {
      alerts.push({
        severity: 'medium',
        message: `${medium} medium-priority issues detected (threshold: ${this.alertThresholds.medium})`,
        count: medium,
        issues: issuesBySeverity.medium.slice(0, 3)
      });
    }

    if (alerts.length > 0) {
      console.log('🚨 ALERTS TRIGGERED:');
      alerts.forEach(alert => {
        console.log(`   ${this.getSeverityIcon(alert.severity)} ${alert.message}`);
      });
      
      await this.sendAlerts(alerts);
    } else {
      console.log('✅ All issue counts within acceptable thresholds');
    }

    console.log('');
  }

  async checkForRegressions(currentResults) {
    if (!this.lastScanResults) return;

    const currentCritical = (currentResults.issuesBySeverity.critical || []).length;
    const previousCritical = (this.lastScanResults.issuesBySeverity.critical || []).length;

    const currentHigh = (currentResults.issuesBySeverity.high || []).length;
    const previousHigh = (this.lastScanResults.issuesBySeverity.high || []).length;

    if (currentCritical > previousCritical) {
      const newCritical = currentCritical - previousCritical;
      console.log(`🚨 REGRESSION DETECTED: ${newCritical} new critical issues introduced!`);
      
      await this.sendRegressionAlert({
        type: 'critical',
        newCount: newCritical,
        totalCount: currentCritical,
        previousCount: previousCritical
      });
    }

    if (currentHigh > previousHigh + 5) { // Allow some variance for high issues
      const newHigh = currentHigh - previousHigh;
      console.log(`⚠️  REGRESSION DETECTED: ${newHigh} new high-priority issues introduced!`);
      
      await this.sendRegressionAlert({
        type: 'high',
        newCount: newHigh,
        totalCount: currentHigh,
        previousCount: previousHigh
      });
    }
  }

  async generateAlerts(results) {
    // Auto-fix critical issues if enabled
    if (process.env.FLOWORX_AUTO_FIX === 'true') {
      const criticalCount = (results.issuesBySeverity.critical || []).length;
      
      if (criticalCount > 0) {
        console.log(`🔧 Auto-fixing ${criticalCount} critical issues...`);
        
        try {
          await this.runAutoFixer();
          console.log('✅ Auto-fix completed');
        } catch (error) {
          console.error('❌ Auto-fix failed:', error.message);
        }
      }
    }
  }

  async runAutoFixer() {
    return new Promise((resolve, reject) => {
      const fixer = spawn('node', ['critical-issue-fixer.js'], {
        cwd: this.projectRoot,
        stdio: 'inherit'
      });

      fixer.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Auto-fixer failed with code ${code}`));
        }
      });
    });
  }

  async sendAlerts(alerts) {
    const alertMessage = this.formatAlertMessage(alerts);
    
    // Console alert (always shown)
    console.log('\n' + '='.repeat(60));
    console.log('🚨 FLOWORX ISSUE ALERT');
    console.log('='.repeat(60));
    console.log(alertMessage);
    console.log('='.repeat(60) + '\n');

    // Webhook alert
    if (this.webhookUrl) {
      try {
        await this.sendWebhookAlert(alertMessage, alerts);
      } catch (error) {
        console.error('❌ Failed to send webhook alert:', error.message);
      }
    }

    // Email alert (if configured)
    if (this.emailAlert) {
      try {
        await this.sendEmailAlert(alertMessage, alerts);
      } catch (error) {
        console.error('❌ Failed to send email alert:', error.message);
      }
    }
  }

  async sendRegressionAlert(regression) {
    const message = `🚨 FLOWORX REGRESSION ALERT

${regression.newCount} new ${regression.type} issues detected!

Previous: ${regression.previousCount}
Current: ${regression.totalCount}
Increase: +${regression.newCount}

This indicates that recent changes may have introduced new issues.
Please review recent commits and run the verification system.`;

    console.log('\n' + '='.repeat(60));
    console.log(message);
    console.log('='.repeat(60) + '\n');

    // Send via configured channels
    if (this.webhookUrl) {
      await this.sendWebhookAlert(message, [regression]);
    }
  }

  formatAlertMessage(alerts) {
    let message = `FloWorx Issue Alert - ${new Date().toISOString()}\n\n`;
    
    alerts.forEach(alert => {
      message += `${this.getSeverityIcon(alert.severity)} ${alert.message}\n`;
      
      if (alert.issues && alert.issues.length > 0) {
        message += '\nTop Issues:\n';
        alert.issues.forEach(issue => {
          message += `  • ${issue.file}:${issue.line} - ${issue.message}\n`;
        });
      }
      message += '\n';
    });

    message += 'Run the verification system to get detailed information and fixes.';
    
    return message;
  }

  async sendWebhookAlert(message, alerts) {
    // Implementation would depend on webhook service (Slack, Discord, etc.)
    console.log('📡 Webhook alert would be sent here');
  }

  async sendEmailAlert(message, alerts) {
    // Implementation would use email service
    console.log('📧 Email alert would be sent here');
  }

  getSeverityIcon(severity) {
    const icons = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };
    return icons[severity] || '⚪';
  }

  stopMonitoring() {
    console.log('\n🛑 Stopping continuous monitoring...');
    this.isRunning = false;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    console.log('✅ Monitoring stopped');
    process.exit(0);
  }

  // Static method to run a one-time check
  static async runOnceCheck() {
    const monitor = new ContinuousIssueMonitor();
    await monitor.performScan();
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'once') {
    // Run a single check
    ContinuousIssueMonitor.runOnceCheck().then(() => {
      console.log('✅ One-time check completed');
    }).catch(error => {
      console.error('❌ Check failed:', error);
      process.exit(1);
    });
  } else {
    // Start continuous monitoring
    const options = {};
    
    // Parse options
    args.forEach(arg => {
      if (arg.startsWith('--interval=')) {
        options.interval = parseInt(arg.split('=')[1]) * 1000;
      }
    });

    const monitor = new ContinuousIssueMonitor(options);
    monitor.startMonitoring().catch(error => {
      console.error('❌ Monitoring failed:', error);
      process.exit(1);
    });
  }
}

module.exports = ContinuousIssueMonitor;
