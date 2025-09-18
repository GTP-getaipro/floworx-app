#!/usr/bin/env node

/**
 * Email Service Diagnostic and Configuration Script
 * Tests email delivery and provides configuration guidance
 */

const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const axios = require('axios');

class EmailServiceDiagnostic {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: [],
      recommendations: [],
      summary: {}
    };
    this.testEmail = 'test-email-diagnostic@floworx-test.com';
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📧',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      config: '🔧'
    }[level] || '📧';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async checkEnvironmentVariables() {
    this.log('Checking email environment variables...', 'info');
    
    const requiredVars = [
      'SMTP_HOST',
      'SMTP_PORT', 
      'SMTP_USER',
      'SMTP_PASS',
      'FROM_EMAIL',
      'FROM_NAME'
    ];
    
    const optionalVars = [
      'REPLY_TO_EMAIL',
      'FRONTEND_URL'
    ];
    
    const envStatus = {};
    const missing = [];
    const present = [];
    
    requiredVars.forEach(varName => {
      const value = process.env[varName];
      envStatus[varName] = {
        present: !!value,
        value: value ? (varName.includes('PASS') ? '[REDACTED]' : value) : null,
        required: true
      };
      
      if (value) {
        present.push(varName);
      } else {
        missing.push(varName);
      }
    });
    
    optionalVars.forEach(varName => {
      const value = process.env[varName];
      envStatus[varName] = {
        present: !!value,
        value: value || null,
        required: false
      };
    });
    
    const test = {
      name: 'Environment Variables Check',
      envStatus,
      missing,
      present,
      success: missing.length === 0
    };
    
    this.results.tests.push(test);
    
    if (test.success) {
      this.log('✅ All required email environment variables are present', 'success');
    } else {
      this.log(`❌ Missing required variables: ${missing.join(', ')}`, 'error');
      this.results.recommendations.push({
        type: 'MISSING_ENV_VARS',
        message: `Configure missing environment variables: ${missing.join(', ')}`,
        priority: 'HIGH',
        action: 'Set the missing environment variables in your production environment'
      });
    }
    
    return test;
  }

  async testSMTPConnection() {
    this.log('Testing SMTP connection...', 'info');
    
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      const test = {
        name: 'SMTP Connection Test',
        error: 'Missing SMTP configuration',
        success: false
      };
      this.results.tests.push(test);
      this.log('❌ Cannot test SMTP - missing configuration', 'error');
      return test;
    }
    
    try {
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: parseInt(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      
      // Verify connection
      await transporter.verify();
      
      const test = {
        name: 'SMTP Connection Test',
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        success: true
      };
      
      this.results.tests.push(test);
      this.log('✅ SMTP connection successful', 'success');
      return test;
      
    } catch (error) {
      const test = {
        name: 'SMTP Connection Test',
        error: error.message,
        success: false
      };
      
      this.results.tests.push(test);
      this.log(`❌ SMTP connection failed: ${error.message}`, 'error');
      
      // Add specific recommendations based on error
      if (error.message.includes('authentication')) {
        this.results.recommendations.push({
          type: 'SMTP_AUTH_ERROR',
          message: 'SMTP authentication failed - check username and password',
          priority: 'HIGH',
          action: 'Verify SMTP_USER and SMTP_PASS credentials'
        });
      } else if (error.message.includes('timeout') || error.message.includes('connect')) {
        this.results.recommendations.push({
          type: 'SMTP_CONNECTION_ERROR',
          message: 'SMTP connection failed - check host and port',
          priority: 'HIGH',
          action: 'Verify SMTP_HOST and SMTP_PORT settings'
        });
      }
      
      return test;
    }
  }

  async testPasswordResetEmailAPI() {
    this.log('Testing password reset email API...', 'info');
    
    try {
      const response = await axios.post('https://app.floworx-iq.com/api/auth/password/request', {
        email: this.testEmail
      }, {
        validateStatus: () => true
      });
      
      const test = {
        name: 'Password Reset Email API',
        endpoint: 'POST /api/auth/password/request',
        status: response.status,
        data: response.data,
        success: response.status === 200 || response.status === 202
      };
      
      this.results.tests.push(test);
      
      if (test.success) {
        this.log('✅ Password reset API responding correctly', 'success');
      } else {
        this.log(`❌ Password reset API failed with status ${response.status}`, 'error');
      }
      
      return test;
    } catch (error) {
      const test = {
        name: 'Password Reset Email API',
        error: error.message,
        success: false
      };
      
      this.results.tests.push(test);
      this.log(`❌ Error testing password reset API: ${error.message}`, 'error');
      return test;
    }
  }

  async generateEmailConfiguration() {
    this.log('Generating email configuration recommendations...', 'config');
    
    const configurations = {
      gmail: {
        name: 'Gmail SMTP',
        config: {
          SMTP_HOST: 'smtp.gmail.com',
          SMTP_PORT: '587',
          SMTP_USER: 'your-email@gmail.com',
          SMTP_PASS: 'your-app-password', // App Password, not regular password
          FROM_EMAIL: 'noreply@floworx-iq.com',
          FROM_NAME: 'FloWorx Team'
        },
        notes: [
          'Use App Password, not regular Gmail password',
          'Enable 2-factor authentication first',
          'Generate App Password in Google Account settings'
        ]
      },
      sendgrid: {
        name: 'SendGrid',
        config: {
          SMTP_HOST: 'smtp.sendgrid.net',
          SMTP_PORT: '587',
          SMTP_USER: 'apikey',
          SMTP_PASS: 'SG.your_sendgrid_api_key',
          FROM_EMAIL: 'noreply@floworx-iq.com',
          FROM_NAME: 'FloWorx Team'
        },
        notes: [
          'Create SendGrid account and verify domain',
          'Generate API key with Mail Send permissions',
          'Use "apikey" as username, API key as password'
        ]
      },
      outlook: {
        name: 'Outlook/Office365',
        config: {
          SMTP_HOST: 'smtp-mail.outlook.com',
          SMTP_PORT: '587',
          SMTP_USER: 'your-email@outlook.com',
          SMTP_PASS: 'your-password',
          FROM_EMAIL: 'noreply@floworx-iq.com',
          FROM_NAME: 'FloWorx Team'
        },
        notes: [
          'Use full email address as username',
          'May require app-specific password',
          'Enable SMTP in Outlook settings'
        ]
      }
    };
    
    return configurations;
  }

  generateReport() {
    const passed = this.results.tests.filter(t => t.success).length;
    const failed = this.results.tests.filter(t => !t.success).length;
    const total = this.results.tests.length;
    
    this.results.summary = {
      total,
      passed,
      failed,
      successRate: `${((passed / total) * 100).toFixed(1)}%`,
      status: failed === 0 ? 'EMAIL_SERVICE_OPERATIONAL' : 'EMAIL_ISSUES_DETECTED',
      recommendations: this.results.recommendations.length
    };
    
    this.log('\n📊 EMAIL SERVICE DIAGNOSTIC SUMMARY', 'info');
    this.log(`Total Tests: ${total}`, 'info');
    this.log(`Passed: ${passed}`, 'success');
    this.log(`Failed: ${failed}`, failed > 0 ? 'error' : 'info');
    this.log(`Success Rate: ${this.results.summary.successRate}`, 'info');
    this.log(`Recommendations: ${this.results.recommendations.length}`, 'info');
    
    // Show detailed results
    this.log('\n📋 DETAILED RESULTS:', 'info');
    this.results.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      this.log(`${status} ${test.name}`, test.success ? 'success' : 'error');
      if (test.error) {
        this.log(`   Error: ${test.error}`, 'error');
      }
      if (test.missing && test.missing.length > 0) {
        this.log(`   Missing: ${test.missing.join(', ')}`, 'warning');
      }
    });
    
    // Show recommendations
    if (this.results.recommendations.length > 0) {
      this.log('\n🔧 RECOMMENDATIONS:', 'config');
      this.results.recommendations.forEach((rec, index) => {
        this.log(`${index + 1}. [${rec.priority}] ${rec.message}`, 'config');
        this.log(`   Action: ${rec.action}`, 'info');
      });
    }
    
    return this.results;
  }

  async run() {
    this.log('🚀 Starting Email Service Diagnostic', 'info');
    
    try {
      // Run all tests
      await this.checkEnvironmentVariables();
      await this.testSMTPConnection();
      await this.testPasswordResetEmailAPI();
      
      // Generate configuration recommendations
      const configs = await this.generateEmailConfiguration();
      
      // Generate report
      const results = this.generateReport();
      
      // Save results
      await fs.writeFile('email-diagnostic-results.json', JSON.stringify(results, null, 2));
      await fs.writeFile('email-config-recommendations.json', JSON.stringify(configs, null, 2));
      
      this.log('📄 Results saved to email-diagnostic-results.json', 'info');
      this.log('📄 Configuration guide saved to email-config-recommendations.json', 'info');
      
      // Exit with appropriate code
      process.exit(results.summary.failed === 0 ? 0 : 1);
      
    } catch (error) {
      this.log(`🚨 Critical error during diagnostic: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run diagnostic if called directly
if (require.main === module) {
  const diagnostic = new EmailServiceDiagnostic();
  diagnostic.run().catch(console.error);
}

module.exports = EmailServiceDiagnostic;
