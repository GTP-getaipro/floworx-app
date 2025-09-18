#!/usr/bin/env node

/**
 * SendGrid Validation Test
 * Direct test of SendGrid configuration and email sending
 */

const nodemailer = require('nodemailer');
const fs = require('fs').promises;

// Load environment variables from .env file manually
function loadEnvFile() {
  try {
    const envContent = require('fs').readFileSync('.env', 'utf8');
    const lines = envContent.split('\n');

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          process.env[key.trim()] = value;
        }
      }
    });
  } catch (error) {
    console.log('⚠️ Could not load .env file:', error.message);
  }
}

// Load environment variables
loadEnvFile();

class SendGridValidationTest {
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
      email: '📧',
      config: '⚙️'
    }[level] || '🔍';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async testEnvironmentVariables() {
    this.log('Checking environment variables...', 'config');
    
    const test = {
      name: 'Environment Variables Check',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    const requiredVars = {
      'SMTP_HOST': process.env.SMTP_HOST,
      'SMTP_PORT': process.env.SMTP_PORT,
      'SMTP_USER': process.env.SMTP_USER,
      'SMTP_PASS': process.env.SMTP_PASS,
      'FROM_EMAIL': process.env.FROM_EMAIL,
      'FROM_NAME': process.env.FROM_NAME
    };

    let allSet = true;
    Object.entries(requiredVars).forEach(([key, value]) => {
      if (value) {
        const displayValue = key.includes('PASS') ? '[HIDDEN]' : value;
        test.details.push(`✅ ${key}: ${displayValue}`);
      } else {
        test.details.push(`❌ ${key}: NOT SET`);
        allSet = false;
      }
    });

    if (allSet) {
      test.details.push('✅ All required environment variables are set');
      test.success = true;
    } else {
      test.details.push('❌ Some environment variables are missing');
    }

    this.results.tests.push(test);
    return test;
  }

  async testSendGridConnection() {
    this.log('Testing SendGrid SMTP connection...', 'test');
    
    const test = {
      name: 'SendGrid SMTP Connection',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Create transporter with exact configuration from .env
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: parseInt(process.env.SMTP_PORT || '465') === 465, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER || 'apikey',
          pass: process.env.SMTP_PASS
        },
        debug: false,
        logger: false
      });

      test.details.push(`SMTP Host: ${transporter.options.host}`);
      test.details.push(`SMTP Port: ${transporter.options.port}`);
      test.details.push(`SMTP Secure: ${transporter.options.secure}`);
      test.details.push(`SMTP User: ${transporter.options.auth.user}`);
      test.details.push(`SMTP Pass: ${transporter.options.auth.pass ? '[SET]' : '[NOT SET]'}`);

      // Test connection
      this.log('Attempting SMTP connection...', 'email');
      await transporter.verify();
      
      test.details.push('✅ SMTP connection successful');
      test.details.push('✅ SendGrid authentication working');
      test.success = true;

    } catch (error) {
      test.details.push(`❌ SMTP connection failed: ${error.message}`);
      
      // Analyze specific error types
      if (error.message.includes('535')) {
        test.details.push('🔍 Error 535: Authentication failed');
        test.details.push('💡 Possible causes:');
        test.details.push('   - Invalid SendGrid API key');
        test.details.push('   - API key expired or revoked');
        test.details.push('   - API key missing Mail Send permissions');
        this.results.recommendations.push('Verify SendGrid API key is valid and has Mail Send permissions');
      } else if (error.message.includes('timeout')) {
        test.details.push('🔍 Connection timeout');
        test.details.push('💡 Possible causes:');
        test.details.push('   - Network connectivity issues');
        test.details.push('   - Firewall blocking SMTP port');
        test.details.push('   - Incorrect SMTP host/port');
        this.results.recommendations.push('Check network connectivity and SMTP configuration');
      }
      
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
      // Only proceed if we have valid SMTP configuration
      if (!process.env.SMTP_PASS || process.env.SMTP_PASS.includes('your_sendgrid_api_key')) {
        test.details.push('⚠️ Skipping email send test - SMTP_PASS not properly configured');
        test.success = false;
        this.results.tests.push(test);
        return test;
      }

      // Create transporter
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: parseInt(process.env.SMTP_PORT || '465') === 465,
        auth: {
          user: process.env.SMTP_USER || 'apikey',
          pass: process.env.SMTP_PASS
        }
      });

      // Load password reset template
      const templatePath = 'backend/templates/password-reset-email.html';
      let htmlContent;
      
      try {
        htmlContent = await fs.readFile(templatePath, 'utf8');
        test.details.push('✅ Email template loaded successfully');
      } catch (error) {
        htmlContent = `
          <h2>Password Reset Test</h2>
          <p>This is a test email from FloWorx password reset system.</p>
          <p>Reset URL: https://app.floworx-iq.com/reset-password?token=test123</p>
          <p>This link expires in 1 hour.</p>
        `;
        test.details.push('⚠️ Using fallback HTML template');
      }

      // Replace template variables
      const testVariables = {
        reset_url: 'https://app.floworx-iq.com/reset-password?token=test123456789',
        current_year: new Date().getFullYear(),
        expiry_hours: '1'
      };

      Object.entries(testVariables).forEach(([key, value]) => {
        htmlContent = htmlContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });

      // Send test email
      const testEmail = 'artemlykovv@gmail.com'; // Real email for testing
      const mailOptions = {
        from: `${process.env.FROM_NAME || 'FloWorx Team'} <${process.env.FROM_EMAIL || 'noreply@gmail.com'}>`,
        to: testEmail,
        subject: 'FloWorx Password Reset Test - ' + new Date().toISOString(),
        html: htmlContent
      };

      test.details.push(`Sending test email to: ${testEmail}`);
      test.details.push(`From: ${mailOptions.from}`);
      test.details.push(`Subject: ${mailOptions.subject}`);

      this.log(`Sending test email to ${testEmail}...`, 'email');
      const result = await transporter.sendMail(mailOptions);
      
      test.details.push(`✅ Email sent successfully!`);
      test.details.push(`Message ID: ${result.messageId}`);
      test.details.push(`Response: ${result.response}`);
      test.details.push(`📧 Check inbox at ${testEmail} for the test email`);
      
      test.success = true;

    } catch (error) {
      test.details.push(`❌ Email sending failed: ${error.message}`);
      
      if (error.message.includes('535')) {
        this.results.recommendations.push('SendGrid API key authentication failed - check key validity');
      } else if (error.message.includes('550')) {
        this.results.recommendations.push('Email rejected - check sender email verification in SendGrid');
      } else {
        this.results.recommendations.push(`Email sending error: ${error.message}`);
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
    
    this.results.summary = {
      total,
      passed,
      failed,
      successRate: `${((passed / total) * 100).toFixed(1)}%`,
      status: failed === 0 ? 'ALL_WORKING' : 
              passed >= total * 0.66 ? 'MOSTLY_WORKING' : 
              'NEEDS_ATTENTION'
    };

    this.log('\n📊 SENDGRID VALIDATION SUMMARY', 'info');
    this.log(`Tests: ${passed}/${total} passed (${this.results.summary.successRate})`, passed === total ? 'success' : 'warning');
    this.log(`Status: ${this.results.summary.status}`, this.results.summary.status === 'ALL_WORKING' ? 'success' : 'warning');

    // Show detailed results
    this.log('\n📋 DETAILED TEST RESULTS:', 'info');
    this.results.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      this.log(`${status} ${test.name}`, test.success ? 'success' : 'error');
      test.details.forEach(detail => {
        this.log(`   ${detail}`, 'info');
      });
      this.log('', 'info');
    });

    // Show recommendations
    if (this.results.recommendations.length > 0) {
      this.log('💡 RECOMMENDATIONS:', 'warning');
      this.results.recommendations.forEach(rec => {
        this.log(`   • ${rec}`, 'info');
      });
    }

    return this.results;
  }

  async run() {
    this.log('🚀 Starting SendGrid Validation Test', 'info');

    try {
      // Run all tests
      await this.testEnvironmentVariables();
      await this.testSendGridConnection();
      await this.testEmailSending();

      // Generate report
      const results = this.generateReport();

      // Save results
      await fs.writeFile('sendgrid-validation-results.json', JSON.stringify(results, null, 2));
      this.log('\n📄 Results saved to sendgrid-validation-results.json', 'info');

      // Provide next steps
      this.log('\n🎯 NEXT STEPS:', 'info');
      if (results.summary.status === 'ALL_WORKING') {
        this.log('✅ SendGrid is working correctly!', 'success');
        this.log('📧 Check email inbox for test message', 'info');
        this.log('🔄 Test password reset flow on website', 'info');
      } else {
        this.log('⚠️ SendGrid configuration needs attention', 'warning');
        this.log('🔧 Review recommendations above', 'info');
        this.log('📋 Check SendGrid dashboard for more details', 'info');
      }

      process.exit(0);

    } catch (error) {
      this.log(`🚨 Critical error during SendGrid validation: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run test if called directly
if (require.main === module) {
  const test = new SendGridValidationTest();
  test.run().catch(console.error);
}

module.exports = SendGridValidationTest;
