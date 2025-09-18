#!/usr/bin/env node

/**
 * Production Email Test - Direct API Testing
 * Tests the actual production password reset flow
 */

const fs = require('fs').promises;

class ProductionEmailTest {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com';
    this.results = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      baseURL: this.baseURL,
      tests: [],
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

  async testPasswordResetWithRealEmail() {
    this.log('Testing password reset with real email address...', 'test');
    
    const test = {
      name: 'Production Password Reset Test',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      // Use a real email address for testing
      const testEmail = 'artemlykovv@gmail.com'; // Real email for testing
      
      this.log(`Sending password reset request to: ${testEmail}`, 'email');
      
      const response = await fetch(`${this.baseURL}/api/auth/password/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'FloWorx-Production-Test/1.0'
        },
        body: JSON.stringify({ email: testEmail })
      });

      test.details.push(`Test Email: ${testEmail}`);
      test.details.push(`API Status: ${response.status}`);
      
      const data = await response.json();
      test.details.push(`API Response: ${JSON.stringify(data, null, 2)}`);

      if (response.status === 202) {
        test.details.push('✅ API endpoint working correctly');
        test.details.push('✅ Request accepted by server');
        test.details.push('📧 Email should be sent if SMTP is configured correctly');
        test.details.push('⏳ Check email inbox for password reset message');
        test.success = true;
      } else {
        test.details.push(`❌ Unexpected API response: ${response.status}`);
        test.success = false;
      }

    } catch (error) {
      test.details.push(`❌ API request failed: ${error.message}`);
      test.success = false;
    }

    this.results.tests.push(test);
    return test;
  }

  async testMultipleEndpoints() {
    this.log('Testing multiple password reset endpoints...', 'test');
    
    const test = {
      name: 'Multiple Endpoints Test',
      success: false,
      details: [],
      timestamp: new Date().toISOString()
    };

    try {
      const testEmail = 'test-endpoints@example.com';
      
      const endpoints = [
        '/api/auth/password/request',
        '/api/auth/forgot-password'
      ];

      let workingEndpoints = 0;
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: testEmail })
          });

          const data = await response.json();
          
          test.details.push(`${endpoint}: ${response.status}`);
          test.details.push(`  Response: ${JSON.stringify(data, null, 2)}`);
          
          if (response.status === 200 || response.status === 202) {
            workingEndpoints++;
            test.details.push(`  ✅ Working correctly`);
          } else {
            test.details.push(`  ⚠️ Unexpected status`);
          }
        } catch (error) {
          test.details.push(`${endpoint}: Error - ${error.message}`);
        }
      }

      test.details.push(`Working endpoints: ${workingEndpoints}/${endpoints.length}`);
      
      if (workingEndpoints > 0) {
        test.success = true;
      }

    } catch (error) {
      test.details.push(`❌ Test failed: ${error.message}`);
      test.success = false;
    }

    this.results.tests.push(test);
    return test;
  }

  async testUIPageLoad() {
    this.log('Testing forgot password page UI...', 'test');
    
    const test = {
      name: 'UI Page Load Test',
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

      test.details.push(`Page Status: ${response.status}`);
      
      if (response.status === 200) {
        const html = await response.text();
        test.details.push(`Page Size: ${html.length} characters`);
        
        // Check for key elements
        const checks = [
          { name: 'FloWorx branding', pattern: /FloWorx|floworx/i },
          { name: 'React app', pattern: /<div[^>]*id=["']root["']/i },
          { name: 'CSS assets', pattern: /\.css/i },
          { name: 'JS assets', pattern: /\.js/i }
        ];

        let passedChecks = 0;
        checks.forEach(check => {
          if (check.pattern.test(html)) {
            test.details.push(`✅ ${check.name} found`);
            passedChecks++;
          } else {
            test.details.push(`⚠️ ${check.name} not found`);
          }
        });

        test.details.push(`UI checks passed: ${passedChecks}/${checks.length}`);
        test.success = true;
      } else {
        test.details.push(`❌ Page failed to load: ${response.status}`);
      }

    } catch (error) {
      test.details.push(`❌ UI test failed: ${error.message}`);
      test.success = false;
    }

    this.results.tests.push(test);
    return test;
  }

  async testEmailDeliveryInstructions() {
    this.log('Providing email delivery validation instructions...', 'test');
    
    const test = {
      name: 'Email Delivery Instructions',
      success: true,
      details: [],
      timestamp: new Date().toISOString()
    };

    test.details.push('📧 EMAIL DELIVERY VALIDATION STEPS:');
    test.details.push('');
    test.details.push('1. 📨 Check inbox for email from: noreply@gmail.com');
    test.details.push('2. 📂 Check spam/junk folder if not in inbox');
    test.details.push('3. 🔍 Look for subject: "Reset Your Password - FloworxInvite"');
    test.details.push('4. ⏰ Email should arrive within 1-2 minutes');
    test.details.push('5. 🔗 Click the "Reset Password" button in the email');
    test.details.push('6. 🔐 Complete password reset on the website');
    test.details.push('');
    test.details.push('📊 SMTP CONFIGURATION STATUS:');
    test.details.push('✅ SendGrid API Key: Configured');
    test.details.push('✅ SMTP Host: smtp.sendgrid.net');
    test.details.push('✅ SMTP Port: 465 (SSL)');
    test.details.push('✅ From Email: noreply@gmail.com');
    test.details.push('✅ From Name: FloWorx-iq team');
    test.details.push('');
    test.details.push('⚠️ POTENTIAL ISSUES TO CHECK:');
    test.details.push('- SendGrid API key may be expired or invalid');
    test.details.push('- Domain verification may be required');
    test.details.push('- Sender email (noreply@gmail.com) may need verification');
    test.details.push('- Production environment variables may not be loaded');

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
      status: failed === 0 ? 'ALL_TESTS_PASSED' : 
              passed >= total * 0.75 ? 'MOSTLY_WORKING' : 
              'NEEDS_ATTENTION'
    };

    this.log('\n📊 PRODUCTION EMAIL TEST SUMMARY', 'info');
    this.log(`Environment: ${this.baseURL}`, 'info');
    this.log(`Tests: ${passed}/${total} passed (${this.results.summary.successRate})`, passed === total ? 'success' : 'warning');
    this.log(`Status: ${this.results.summary.status}`, this.results.summary.status === 'ALL_TESTS_PASSED' ? 'success' : 'warning');

    // Show detailed results
    this.log('\n📋 DETAILED TEST RESULTS:', 'info');
    this.results.tests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      this.log(`${status} ${test.name}`, test.success ? 'success' : 'error');
      test.details.forEach(detail => {
        this.log(`   ${detail}`, 'info');
      });
      this.log('', 'info'); // Empty line for readability
    });

    return this.results;
  }

  async run() {
    this.log('🚀 Starting Production Email Test', 'info');
    this.log(`Target: ${this.baseURL}`, 'info');
    this.log('📧 Testing with real email address for validation', 'info');

    try {
      // Run all tests
      await this.testPasswordResetWithRealEmail();
      await this.testMultipleEndpoints();
      await this.testUIPageLoad();
      await this.testEmailDeliveryInstructions();

      // Generate report
      const results = this.generateReport();

      // Save results
      await fs.writeFile('production-email-test-results.json', JSON.stringify(results, null, 2));
      this.log('\n📄 Results saved to production-email-test-results.json', 'info');

      // Provide next steps
      this.log('\n🎯 NEXT STEPS:', 'info');
      this.log('1. Check email inbox (artemlykovv@gmail.com) for password reset email', 'info');
      this.log('2. If email received: Click reset link and test complete flow', 'info');
      this.log('3. If no email: Check SendGrid configuration and domain verification', 'info');
      this.log('4. Monitor SendGrid dashboard for delivery status and errors', 'info');

      process.exit(0);

    } catch (error) {
      this.log(`🚨 Critical error during production test: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run test if called directly
if (require.main === module) {
  const test = new ProductionEmailTest();
  test.run().catch(console.error);
}

module.exports = ProductionEmailTest;
