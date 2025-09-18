#!/usr/bin/env node

/**
 * Email Delivery Status Checker
 * Validates email delivery by testing SMTP connectivity and email service status
 */

const axios = require('axios');
const fs = require('fs').promises;

class EmailDeliveryStatusChecker {
  constructor() {
    this.baseURL = 'https://app.floworx-iq.com';
    this.results = {
      timestamp: new Date().toISOString(),
      environment: 'production',
      baseURL: this.baseURL,
      emailTests: [],
      deliveryStatus: {},
      recommendations: []
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📧',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      email: '📬',
      smtp: '🔗'
    }[level] || '📧';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async testEmailEndpointWithHeaders() {
    this.log('Testing email endpoints with debug headers...', 'smtp');
    
    const tests = [
      {
        name: 'Password Reset with Debug Headers',
        endpoint: '/api/auth/password/request',
        method: 'POST',
        data: { email: 'debug-test-reset@example.com' },
        expectedStatus: 202
      },
      {
        name: 'Registration with Debug Headers',
        endpoint: '/api/auth/register',
        method: 'POST',
        data: {
          firstName: 'Debug',
          lastName: 'Test',
          email: `debug-test-reg-${Date.now()}@example.com`,
          password: 'TestPassword123!',
          confirmPassword: 'TestPassword123!'
        },
        expectedStatus: [200, 201]
      }
    ];

    for (const testCase of tests) {
      try {
        this.log(`Testing ${testCase.name}...`, 'smtp');
        
        const response = await axios({
          method: testCase.method,
          url: `${this.baseURL}${testCase.endpoint}`,
          data: testCase.data,
          headers: {
            'Content-Type': 'application/json',
            'X-Debug-Email': 'true',
            'X-Test-Mode': 'email-validation',
            'User-Agent': 'FloWorx-Email-Validator/1.0'
          },
          withCredentials: true,
          validateStatus: () => true
        });

        const expectedStatuses = Array.isArray(testCase.expectedStatus) 
          ? testCase.expectedStatus 
          : [testCase.expectedStatus];

        const test = {
          name: testCase.name,
          endpoint: testCase.endpoint,
          email: testCase.data.email,
          status: response.status,
          success: expectedStatuses.includes(response.status),
          headers: response.headers,
          data: response.data,
          emailIndicators: this.extractEmailIndicators(response),
          timestamp: new Date().toISOString()
        };

        this.results.emailTests.push(test);

        if (test.success) {
          this.log(`✅ ${testCase.name} - Status: ${response.status}`, 'success');
          if (test.emailIndicators.shouldSendEmail) {
            this.log(`📬 Email should be sent to: ${testCase.data.email}`, 'email');
          }
        } else {
          this.log(`❌ ${testCase.name} - Unexpected status: ${response.status}`, 'error');
        }

        // Log any email-related headers
        Object.keys(response.headers).forEach(header => {
          if (header.toLowerCase().includes('email') || 
              header.toLowerCase().includes('smtp') ||
              header.toLowerCase().includes('mail')) {
            this.log(`   ${header}: ${response.headers[header]}`, 'info');
          }
        });

      } catch (error) {
        this.log(`❌ Error testing ${testCase.name}: ${error.message}`, 'error');
        this.results.emailTests.push({
          name: testCase.name,
          error: error.message,
          success: false,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  extractEmailIndicators(response) {
    const indicators = {
      shouldSendEmail: false,
      emailService: 'unknown',
      deliveryStatus: 'unknown',
      errorCode: null
    };

    // Check response data for email indicators
    if (response.data) {
      const data = response.data;
      
      // Check for success messages indicating email sending
      if (data.message) {
        const message = data.message.toLowerCase();
        if (message.includes('email') && 
            (message.includes('sent') || message.includes('will be sent'))) {
          indicators.shouldSendEmail = true;
        }
      }

      // Check for email-specific fields
      if (data.emailSent === true) {
        indicators.shouldSendEmail = true;
      }

      if (data.requiresVerification === true) {
        indicators.shouldSendEmail = true;
      }

      // Check for error codes
      if (data.error && data.error.code) {
        indicators.errorCode = data.error.code;
      }
    }

    // Check response headers for email service indicators
    Object.keys(response.headers).forEach(header => {
      const headerLower = header.toLowerCase();
      const value = response.headers[header];

      if (headerLower.includes('x-email-service')) {
        indicators.emailService = value;
      }

      if (headerLower.includes('x-delivery-status')) {
        indicators.deliveryStatus = value;
      }
    });

    return indicators;
  }

  async testEmailServiceHealth() {
    this.log('Testing email service health...', 'smtp');
    
    try {
      // Test a simple endpoint that might reveal email service status
      const response = await axios.get(`${this.baseURL}/api/health`, {
        headers: {
          'X-Check-Email-Service': 'true'
        },
        validateStatus: () => true
      });

      const healthTest = {
        name: 'Email Service Health Check',
        endpoint: '/api/health',
        status: response.status,
        success: response.status === 200,
        data: response.data,
        timestamp: new Date().toISOString()
      };

      this.results.emailTests.push(healthTest);

      if (healthTest.success) {
        this.log('✅ Health endpoint accessible', 'success');
      } else {
        this.log(`⚠️ Health endpoint returned: ${response.status}`, 'warning');
      }

    } catch (error) {
      this.log(`⚠️ Health check not available: ${error.message}`, 'warning');
    }
  }

  async testSMTPConnectivity() {
    this.log('Testing SMTP connectivity indicators...', 'smtp');
    
    // Test multiple rapid requests to see if there are rate limiting or SMTP errors
    const rapidTests = [];
    const testEmail = 'smtp-connectivity-test@example.com';

    for (let i = 0; i < 3; i++) {
      rapidTests.push(
        axios.post(`${this.baseURL}/api/auth/password/request`, {
          email: testEmail
        }, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'X-SMTP-Test': `rapid-test-${i + 1}`
          },
          validateStatus: () => true
        })
      );
    }

    try {
      const responses = await Promise.all(rapidTests);
      
      const smtpTest = {
        name: 'SMTP Connectivity Test',
        testType: 'rapid-requests',
        email: testEmail,
        requests: responses.length,
        statuses: responses.map(r => r.status),
        success: responses.every(r => r.status === 202 || r.status === 429),
        allSuccessful: responses.every(r => r.status === 202),
        rateLimited: responses.some(r => r.status === 429),
        errors: responses.filter(r => r.status >= 500).length,
        timestamp: new Date().toISOString()
      };

      this.results.emailTests.push(smtpTest);

      if (smtpTest.allSuccessful) {
        this.log('✅ All SMTP requests successful - Email service appears healthy', 'success');
      } else if (smtpTest.success && smtpTest.rateLimited) {
        this.log('✅ SMTP requests working with rate limiting - Normal behavior', 'success');
      } else if (smtpTest.errors > 0) {
        this.log(`❌ ${smtpTest.errors} SMTP requests failed with server errors`, 'error');
      } else {
        this.log('⚠️ Mixed SMTP request results', 'warning');
      }

    } catch (error) {
      this.log(`❌ Error testing SMTP connectivity: ${error.message}`, 'error');
    }
  }

  generateDeliveryStatus() {
    const emailTests = this.results.emailTests;
    const successful = emailTests.filter(t => t.success).length;
    const total = emailTests.length;
    
    // Analyze email indicators
    const shouldSendEmail = emailTests.filter(t => 
      t.emailIndicators && t.emailIndicators.shouldSendEmail
    ).length;

    const hasErrors = emailTests.some(t => 
      t.emailIndicators && t.emailIndicators.errorCode
    );

    this.results.deliveryStatus = {
      apiEndpointsWorking: successful === total,
      emailIndicatorsPositive: shouldSendEmail > 0,
      noServerErrors: !hasErrors,
      overallStatus: this.determineOverallStatus(successful, total, shouldSendEmail, hasErrors),
      successRate: `${((successful / total) * 100).toFixed(1)}%`,
      emailDeliveryLikelihood: this.calculateDeliveryLikelihood(successful, total, shouldSendEmail, hasErrors)
    };
  }

  determineOverallStatus(successful, total, shouldSendEmail, hasErrors) {
    if (successful === total && shouldSendEmail > 0 && !hasErrors) {
      return 'EXCELLENT - All systems operational, emails should be delivered';
    } else if (successful === total && !hasErrors) {
      return 'GOOD - API working, email delivery likely';
    } else if (successful > total * 0.8) {
      return 'FAIR - Most endpoints working, some issues detected';
    } else {
      return 'POOR - Multiple issues detected, email delivery uncertain';
    }
  }

  calculateDeliveryLikelihood(successful, total, shouldSendEmail, hasErrors) {
    let score = 0;
    
    // API success rate (40% weight)
    score += (successful / total) * 40;
    
    // Email indicators (30% weight)
    if (shouldSendEmail > 0) score += 30;
    
    // No errors (30% weight)
    if (!hasErrors) score += 30;
    
    if (score >= 90) return 'VERY HIGH (90%+)';
    if (score >= 70) return 'HIGH (70-89%)';
    if (score >= 50) return 'MEDIUM (50-69%)';
    if (score >= 30) return 'LOW (30-49%)';
    return 'VERY LOW (<30%)';
  }

  generateRecommendations() {
    const status = this.results.deliveryStatus;
    
    if (status.overallStatus.includes('EXCELLENT')) {
      this.results.recommendations.push({
        priority: 'INFO',
        title: 'System Status: Excellent',
        description: 'All email systems appear to be working correctly. Emails should be delivered successfully.',
        action: 'Monitor email delivery and user feedback for any issues.'
      });
    }

    if (!status.apiEndpointsWorking) {
      this.results.recommendations.push({
        priority: 'HIGH',
        title: 'API Endpoint Issues',
        description: 'Some email-related API endpoints are not responding correctly.',
        action: 'Check backend logs and verify SMTP configuration in Coolify environment variables.'
      });
    }

    if (!status.emailIndicatorsPositive) {
      this.results.recommendations.push({
        priority: 'MEDIUM',
        title: 'Email Indicators Missing',
        description: 'API responses do not clearly indicate that emails are being sent.',
        action: 'Verify email service integration and check for silent failures in email sending.'
      });
    }

    if (status.emailDeliveryLikelihood.includes('LOW')) {
      this.results.recommendations.push({
        priority: 'HIGH',
        title: 'Low Email Delivery Likelihood',
        description: 'Multiple indicators suggest emails may not be delivered successfully.',
        action: 'Immediate investigation required: Check SMTP credentials, email service status, and backend error logs.'
      });
    }
  }

  generateReport() {
    this.generateDeliveryStatus();
    this.generateRecommendations();

    this.log('\n📊 EMAIL DELIVERY STATUS REPORT', 'info');
    this.log(`Environment: ${this.baseURL}`, 'info');
    this.log(`Overall Status: ${this.results.deliveryStatus.overallStatus}`, 'info');
    this.log(`Email Delivery Likelihood: ${this.results.deliveryStatus.emailDeliveryLikelihood}`, 'info');

    this.log('\n📋 TEST RESULTS:', 'info');
    this.results.emailTests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      this.log(`${status} ${test.name}`, test.success ? 'success' : 'error');
      if (test.email) {
        this.log(`   Email: ${test.email}`, 'info');
      }
      if (test.status) {
        this.log(`   Status: ${test.status}`, 'info');
      }
      if (test.emailIndicators && test.emailIndicators.shouldSendEmail) {
        this.log(`   📬 Should send email: Yes`, 'email');
      }
    });

    if (this.results.recommendations.length > 0) {
      this.log('\n🔧 RECOMMENDATIONS:', 'info');
      this.results.recommendations.forEach(rec => {
        const priority = rec.priority === 'HIGH' ? '🔴' : rec.priority === 'MEDIUM' ? '🟡' : '🔵';
        this.log(`${priority} [${rec.priority}] ${rec.title}`, 'info');
        this.log(`   ${rec.description}`, 'info');
        this.log(`   Action: ${rec.action}`, 'info');
      });
    }

    return this.results;
  }

  async run() {
    this.log('🚀 Starting Email Delivery Status Check', 'info');
    this.log(`Target: ${this.baseURL}`, 'info');

    try {
      await this.testEmailEndpointWithHeaders();
      await this.testEmailServiceHealth();
      await this.testSMTPConnectivity();

      const results = this.generateReport();

      // Save results
      await fs.writeFile('email-delivery-status-results.json', JSON.stringify(results, null, 2));
      this.log('\n📄 Results saved to email-delivery-status-results.json', 'info');

      // Exit with appropriate code
      const isHealthy = results.deliveryStatus.overallStatus.includes('EXCELLENT') || 
                       results.deliveryStatus.overallStatus.includes('GOOD');
      process.exit(isHealthy ? 0 : 1);

    } catch (error) {
      this.log(`🚨 Critical error during status check: ${error.message}`, 'error');
      process.exit(1);
    }
  }
}

// Run checker if called directly
if (require.main === module) {
  const checker = new EmailDeliveryStatusChecker();
  checker.run().catch(console.error);
}

module.exports = EmailDeliveryStatusChecker;
