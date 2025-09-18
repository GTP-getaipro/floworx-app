#!/usr/bin/env node

/**
 * Password Reset Diagnostic Tool
 * Comprehensive testing of password reset functionality
 */

const fs = require('fs').promises;

class PasswordResetDiagnostic {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com';
    this.results = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      baseURL: this.baseURL,
      tests: [],
      issues: [],
      summary: {}
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

  addIssue(issue, severity = 'medium') {
    this.results.issues.push({
      issue,
      severity,
      timestamp: new Date().toISOString()
    });
  }

  async testPasswordResetAPI() {
    this.log('Testing password reset API endpoint...', 'test');
    
    const test = {
      name: 'Password Reset API',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      const testEmail = `password-reset-test-${Date.now()}@example.com`;
      
      const response = await fetch(`${this.baseURL}/api/auth/password/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: testEmail })
      });

      const data = await response.json();
      
      test.details.push(`API Response Status: ${response.status}`);
      test.details.push(`API Response: ${JSON.stringify(data, null, 2)}`);

      if (response.status === 202) {
        test.details.push('✅ API endpoint responding correctly');
        test.success = true;
      } else {
        test.details.push(`❌ Unexpected API response status: ${response.status}`);
        this.addIssue(`Password reset API returned ${response.status} instead of 202`, 'high');
      }

    } catch (error) {
      test.details.push(`❌ API request failed: ${error.message}`);
      this.addIssue(`Password reset API request failed: ${error.message}`, 'high');
      test.success = false;
    }

    this.results.tests.push(test);
    return test;
  }

  async testEmailTemplateExists() {
    this.log('Checking password reset email template...', 'test');
    
    const test = {
      name: 'Email Template Existence',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      const templatePath = 'backend/templates/password-reset-email.html';
      await fs.access(templatePath);
      
      const templateContent = await fs.readFile(templatePath, 'utf8');
      
      test.details.push('✅ Password reset email template found');
      test.details.push(`Template size: ${templateContent.length} characters`);
      
      // Check for required placeholders
      const requiredPlaceholders = ['{{reset_url}}', '{{expiry_hours}}'];
      const missingPlaceholders = requiredPlaceholders.filter(placeholder => 
        !templateContent.includes(placeholder)
      );
      
      if (missingPlaceholders.length === 0) {
        test.details.push('✅ All required placeholders found in template');
        test.success = true;
      } else {
        test.details.push(`❌ Missing placeholders: ${missingPlaceholders.join(', ')}`);
        this.addIssue(`Email template missing placeholders: ${missingPlaceholders.join(', ')}`, 'medium');
      }

    } catch (error) {
      test.details.push(`❌ Email template not found or inaccessible: ${error.message}`);
      this.addIssue('Password reset email template missing', 'high');
      test.success = false;
    }

    this.results.tests.push(test);
    return test;
  }

  async testEmailServiceConfiguration() {
    this.log('Testing email service configuration...', 'test');
    
    const test = {
      name: 'Email Service Configuration',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Check if email service can be loaded
      const emailServicePath = 'backend/services/emailService.js';
      await fs.access(emailServicePath);
      
      test.details.push('✅ Email service file exists');
      
      // Check for sendPasswordResetEmail method
      const emailServiceContent = await fs.readFile(emailServicePath, 'utf8');
      
      if (emailServiceContent.includes('sendPasswordResetEmail')) {
        test.details.push('✅ sendPasswordResetEmail method found');
        test.success = true;
      } else {
        test.details.push('❌ sendPasswordResetEmail method not found');
        this.addIssue('Email service missing sendPasswordResetEmail method', 'high');
      }

      // Check for SMTP configuration references
      const smtpConfigChecks = [
        'SMTP_HOST',
        'SMTP_PORT', 
        'SMTP_USER',
        'SMTP_PASS',
        'FROM_EMAIL'
      ];

      const foundConfigs = smtpConfigChecks.filter(config => 
        emailServiceContent.includes(config)
      );

      test.details.push(`SMTP configuration references found: ${foundConfigs.length}/${smtpConfigChecks.length}`);
      
      if (foundConfigs.length < 3) {
        this.addIssue('Email service may be missing SMTP configuration', 'medium');
      }

    } catch (error) {
      test.details.push(`❌ Email service check failed: ${error.message}`);
      this.addIssue(`Email service configuration check failed: ${error.message}`, 'high');
      test.success = false;
    }

    this.results.tests.push(test);
    return test;
  }

  async testPasswordResetRouting() {
    this.log('Testing password reset routing...', 'test');
    
    const test = {
      name: 'Password Reset Routing',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Test multiple potential endpoints
      const endpoints = [
        '/api/auth/password/request',
        '/api/auth/forgot-password',
        '/api/password-reset/request'
      ];

      let workingEndpoints = 0;
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: 'test@example.com' })
          });

          test.details.push(`${endpoint}: ${response.status} ${response.statusText}`);
          
          if (response.status === 202 || response.status === 200) {
            workingEndpoints++;
          }
        } catch (error) {
          test.details.push(`${endpoint}: Error - ${error.message}`);
        }
      }

      if (workingEndpoints > 0) {
        test.details.push(`✅ Found ${workingEndpoints} working password reset endpoint(s)`);
        test.success = true;
      } else {
        test.details.push('❌ No working password reset endpoints found');
        this.addIssue('No functional password reset endpoints found', 'critical');
      }

    } catch (error) {
      test.details.push(`❌ Routing test failed: ${error.message}`);
      this.addIssue(`Password reset routing test failed: ${error.message}`, 'high');
      test.success = false;
    }

    this.results.tests.push(test);
    return test;
  }

  async testFrontendPage() {
    this.log('Testing forgot password frontend page...', 'test');
    
    const test = {
      name: 'Frontend Forgot Password Page',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(`${this.baseURL}/forgot-password`, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });

      test.details.push(`Frontend page status: ${response.status}`);
      
      if (response.status === 200) {
        const html = await response.text();
        
        // Check for key elements
        const checks = [
          { name: 'FloWorx branding', pattern: /FloWorx|floworx/i },
          { name: 'Email input field', pattern: /type=["']email["']/i },
          { name: 'Submit button', pattern: /type=["']submit["']|button.*submit/i },
          { name: 'Form element', pattern: /<form/i }
        ];

        let passedChecks = 0;
        checks.forEach(check => {
          if (check.pattern.test(html)) {
            test.details.push(`✅ ${check.name} found`);
            passedChecks++;
          } else {
            test.details.push(`❌ ${check.name} not found`);
          }
        });

        if (passedChecks >= 3) {
          test.details.push('✅ Frontend page appears functional');
          test.success = true;
        } else {
          test.details.push('⚠️ Frontend page may have issues');
          this.addIssue('Frontend forgot password page missing key elements', 'medium');
        }
      } else {
        test.details.push(`❌ Frontend page failed to load: ${response.status}`);
        this.addIssue(`Frontend forgot password page returns ${response.status}`, 'high');
      }

    } catch (error) {
      test.details.push(`❌ Frontend page test failed: ${error.message}`);
      this.addIssue(`Frontend page test failed: ${error.message}`, 'medium');
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

    this.log('\n📊 PASSWORD RESET DIAGNOSTIC SUMMARY', 'info');
    this.log(`Environment: ${this.baseURL}`, 'info');
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

    // Show issues
    if (this.results.issues.length > 0) {
      this.log('\n🚨 IDENTIFIED ISSUES:', 'warning');
      this.results.issues.forEach(issue => {
        const severity = issue.severity.toUpperCase();
        this.log(`[${severity}] ${issue.issue}`, 'error');
      });
    }

    return this.results;
  }

  async run() {
    this.log('🚀 Starting Password Reset Diagnostic', 'info');
    this.log(`Target: ${this.baseURL}`, 'info');

    try {
      // Run all diagnostic tests
      await this.testPasswordResetAPI();
      await this.testEmailTemplateExists();
      await this.testEmailServiceConfiguration();
      await this.testPasswordResetRouting();
      await this.testFrontendPage();

      // Generate report
      const results = this.generateReport();

      // Save results
      await fs.writeFile('password-reset-diagnostic-results.json', JSON.stringify(results, null, 2));
      this.log('\n📄 Results saved to password-reset-diagnostic-results.json', 'info');

      // Exit with appropriate code
      const exitCode = results.summary.status === 'CRITICAL_ISSUES' ? 2 : 
                      results.summary.status === 'HIGH_PRIORITY_ISSUES' ? 1 : 0;
      process.exit(exitCode);

    } catch (error) {
      this.log(`🚨 Critical error during diagnostic: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run diagnostic if called directly
if (require.main === module) {
  const diagnostic = new PasswordResetDiagnostic();
  diagnostic.run().catch(console.error);
}

module.exports = PasswordResetDiagnostic;
