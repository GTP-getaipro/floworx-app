#!/usr/bin/env node

/**
 * Email Service Test - Direct SMTP Testing
 * Tests email delivery without going through the full API
 */

const nodemailer = require('nodemailer');
const fs = require('fs').promises;

class EmailServiceTest {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      issues: [],
      recommendations: []
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '🔍',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      test: '🧪',
      email: '📧'
    }[level] || '🔍';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  addIssue(issue, severity = 'medium', recommendation = '') {
    this.results.issues.push({
      issue,
      severity,
      recommendation,
      timestamp: new Date().toISOString()
    });
  }

  async testSMTPConfiguration() {
    this.log('Testing SMTP configuration...', 'test');
    
    const test = {
      name: 'SMTP Configuration Test',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Check environment variables
      const requiredEnvVars = [
        'SMTP_HOST',
        'SMTP_PORT',
        'SMTP_USER',
        'SMTP_PASS',
        'FROM_EMAIL'
      ];

      const envStatus = {};
      requiredEnvVars.forEach(varName => {
        const value = process.env[varName];
        envStatus[varName] = {
          exists: !!value,
          value: value ? (varName.includes('PASS') ? '[HIDDEN]' : value) : 'NOT SET'
        };
      });

      test.details.push('Environment Variables:');
      Object.entries(envStatus).forEach(([key, status]) => {
        const statusIcon = status.exists ? '✅' : '❌';
        test.details.push(`  ${statusIcon} ${key}: ${status.value}`);
      });

      const missingVars = Object.entries(envStatus)
        .filter(([_, status]) => !status.exists)
        .map(([key, _]) => key);

      if (missingVars.length > 0) {
        this.addIssue(
          `Missing SMTP environment variables: ${missingVars.join(', ')}`,
          'critical',
          'Configure all required SMTP environment variables in production'
        );
        test.success = false;
      } else {
        test.details.push('✅ All required environment variables are set');
        test.success = true;
      }

    } catch (error) {
      test.details.push(`❌ Configuration test failed: ${error.message}`);
      this.addIssue(`SMTP configuration test failed: ${error.message}`, 'high');
      test.success = false;
    }

    this.results.tests.push(test);
    return test;
  }

  async testSMTPConnection() {
    this.log('Testing SMTP connection...', 'test');
    
    const test = {
      name: 'SMTP Connection Test',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Create transporter with current configuration
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER || 'apikey',
          pass: process.env.SMTP_PASS || 'your-api-key'
        },
        debug: true,
        logger: false
      });

      test.details.push(`SMTP Host: ${transporter.options.host}`);
      test.details.push(`SMTP Port: ${transporter.options.port}`);
      test.details.push(`SMTP User: ${transporter.options.auth.user}`);
      test.details.push(`SMTP Pass: ${transporter.options.auth.pass ? '[SET]' : '[NOT SET]'}`);

      // Test connection
      await transporter.verify();
      
      test.details.push('✅ SMTP connection successful');
      test.success = true;

    } catch (error) {
      test.details.push(`❌ SMTP connection failed: ${error.message}`);
      
      // Provide specific recommendations based on error
      if (error.message.includes('authentication')) {
        this.addIssue(
          'SMTP authentication failed',
          'critical',
          'Verify SMTP_USER and SMTP_PASS are correct. For SendGrid, use "apikey" as user and your API key as password.'
        );
      } else if (error.message.includes('timeout') || error.message.includes('ENOTFOUND')) {
        this.addIssue(
          'SMTP connection timeout or host not found',
          'high',
          'Check SMTP_HOST and SMTP_PORT settings. Ensure network connectivity to SMTP server.'
        );
      } else {
        this.addIssue(
          `SMTP connection error: ${error.message}`,
          'high',
          'Review SMTP configuration and check server logs for more details.'
        );
      }
      
      test.success = false;
    }

    this.results.tests.push(test);
    return test;
  }

  async testEmailTemplate() {
    this.log('Testing email template loading...', 'test');
    
    const test = {
      name: 'Email Template Test',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      const templatePath = 'backend/templates/password-reset-email.html';
      const templateContent = await fs.readFile(templatePath, 'utf8');
      
      test.details.push(`✅ Template loaded (${templateContent.length} characters)`);
      
      // Test template variable substitution
      const testVariables = {
        reset_url: 'https://app.floworx-iq.com/reset-password?token=test123',
        current_year: new Date().getFullYear(),
        expiry_hours: '1'
      };

      let processedTemplate = templateContent;
      Object.entries(testVariables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        if (processedTemplate.includes(placeholder)) {
          processedTemplate = processedTemplate.replace(new RegExp(placeholder, 'g'), value);
          test.details.push(`✅ Replaced {{${key}}} with ${value}`);
        } else {
          test.details.push(`⚠️ Placeholder {{${key}}} not found in template`);
        }
      });

      // Check for remaining unreplaced placeholders
      const remainingPlaceholders = processedTemplate.match(/\{\{[^}]+\}\}/g);
      if (remainingPlaceholders) {
        test.details.push(`⚠️ Unreplaced placeholders: ${remainingPlaceholders.join(', ')}`);
        this.addIssue(
          `Email template has unreplaced placeholders: ${remainingPlaceholders.join(', ')}`,
          'medium',
          'Ensure all template variables are properly replaced before sending emails.'
        );
      } else {
        test.details.push('✅ All placeholders properly replaced');
      }

      test.success = true;

    } catch (error) {
      test.details.push(`❌ Template test failed: ${error.message}`);
      this.addIssue(`Email template test failed: ${error.message}`, 'high');
      test.success = false;
    }

    this.results.tests.push(test);
    return test;
  }

  async testEmailSending() {
    this.log('Testing actual email sending...', 'test');
    
    const test = {
      name: 'Email Sending Test',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Only proceed if SMTP configuration is valid
      const smtpHost = process.env.SMTP_HOST;
      const smtpPass = process.env.SMTP_PASS;
      
      if (!smtpHost || !smtpPass || smtpPass === 'your-api-key' || smtpPass === 'SG.your_sendgrid_api_key') {
        test.details.push('⚠️ Skipping email send test - SMTP not properly configured');
        test.details.push('Configure SMTP_HOST and SMTP_PASS to test actual email sending');
        test.success = false;
        this.addIssue(
          'Cannot test email sending - SMTP credentials not configured',
          'critical',
          'Set proper SMTP credentials in environment variables to enable email functionality.'
        );
        this.results.tests.push(test);
        return test;
      }

      // Create transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER || 'apikey',
          pass: process.env.SMTP_PASS
        }
      });

      // Load and process template
      const templatePath = 'backend/templates/password-reset-email.html';
      let htmlContent = await fs.readFile(templatePath, 'utf8');
      
      // Replace template variables
      const testVariables = {
        reset_url: 'https://app.floworx-iq.com/reset-password?token=test123456',
        current_year: new Date().getFullYear(),
        expiry_hours: '1'
      };

      Object.entries(testVariables).forEach(([key, value]) => {
        htmlContent = htmlContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });

      // Send test email
      const testEmail = `floworx-test-${Date.now()}@example.com`;
      const mailOptions = {
        from: `${process.env.FROM_NAME || 'FloWorx Team'} <${process.env.FROM_EMAIL || 'noreply@floworx-iq.com'}>`,
        to: testEmail,
        subject: 'FloWorx Password Reset Test',
        html: htmlContent
      };

      test.details.push(`Sending test email to: ${testEmail}`);
      test.details.push(`From: ${mailOptions.from}`);
      test.details.push(`Subject: ${mailOptions.subject}`);

      const result = await transporter.sendMail(mailOptions);
      
      test.details.push(`✅ Email sent successfully`);
      test.details.push(`Message ID: ${result.messageId}`);
      test.details.push(`Response: ${result.response}`);
      
      test.success = true;

    } catch (error) {
      test.details.push(`❌ Email sending failed: ${error.message}`);
      
      if (error.message.includes('authentication')) {
        this.addIssue(
          'Email sending failed due to authentication error',
          'critical',
          'Verify SendGrid API key is correct and has Mail Send permissions.'
        );
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        this.addIssue(
          'Email sending failed due to quota/rate limits',
          'high',
          'Check SendGrid account limits and usage. Consider upgrading plan if needed.'
        );
      } else {
        this.addIssue(
          `Email sending failed: ${error.message}`,
          'high',
          'Check SMTP configuration and SendGrid account status.'
        );
      }
      
      test.success = false;
    }

    this.results.tests.push(test);
    return test;
  }

  generateReport() {
    const passed = this.results.tests.filter(t => t.success).length;
    const failed = this.results.tests.filter(t => !t.success).length;
    const total = this.results.tests.length;
    
    const criticalIssues = this.results.issues.filter(i => i.severity === 'critical').length;
    const highIssues = this.results.issues.filter(i => i.severity === 'high').length;
    const mediumIssues = this.results.issues.filter(i => i.severity === 'medium').length;
    
    this.results.summary = {
      total,
      passed,
      failed,
      successRate: `${((passed / total) * 100).toFixed(1)}%`,
      issues: {
        critical: criticalIssues,
        high: highIssues,
        medium: mediumIssues,
        total: this.results.issues.length
      },
      status: criticalIssues > 0 ? 'CRITICAL_ISSUES' : 
              highIssues > 0 ? 'HIGH_PRIORITY_ISSUES' : 
              mediumIssues > 0 ? 'MINOR_ISSUES' : 'HEALTHY'
    };

    this.log('\n📊 EMAIL SERVICE TEST SUMMARY', 'info');
    this.log(`Tests: ${passed}/${total} passed (${this.results.summary.successRate})`, passed === total ? 'success' : 'error');
    this.log(`Issues: ${this.results.summary.issues.total} total (${criticalIssues} critical, ${highIssues} high, ${mediumIssues} medium)`, 'info');
    this.log(`Status: ${this.results.summary.status}`, this.results.summary.status === 'HEALTHY' ? 'success' : 'error');

    // Show detailed results
    this.log('\n📋 DETAILED TEST RESULTS:', 'info');
    this.results.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      this.log(`${status} ${test.name}`, test.success ? 'success' : 'error');
      test.details.forEach(detail => {
        this.log(`   ${detail}`, 'info');
      });
    });

    // Show issues and recommendations
    if (this.results.issues.length > 0) {
      this.log('\n🚨 IDENTIFIED ISSUES & RECOMMENDATIONS:', 'warning');
      this.results.issues.forEach(issue => {
        const severity = issue.severity.toUpperCase();
        this.log(`[${severity}] ${issue.issue}`, 'error');
        if (issue.recommendation) {
          this.log(`   💡 Recommendation: ${issue.recommendation}`, 'info');
        }
      });
    }

    return this.results;
  }

  async run() {
    this.log('🚀 Starting Email Service Test', 'info');

    try {
      // Run all tests
      await this.testSMTPConfiguration();
      await this.testSMTPConnection();
      await this.testEmailTemplate();
      await this.testEmailSending();

      // Generate report
      const results = this.generateReport();

      // Save results
      await fs.writeFile('email-service-test-results.json', JSON.stringify(results, null, 2));
      this.log('\n📄 Results saved to email-service-test-results.json', 'info');

      // Exit with appropriate code
      const exitCode = results.summary.status === 'CRITICAL_ISSUES' ? 2 : 
                      results.summary.status === 'HIGH_PRIORITY_ISSUES' ? 1 : 0;
      process.exit(exitCode);

    } catch (error) {
      this.log(`🚨 Critical error during email service test: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run test if called directly
if (require.main === module) {
  const test = new EmailServiceTest();
  test.run().catch(console.error);
}

module.exports = EmailServiceTest;
