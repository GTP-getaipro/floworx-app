#!/usr/bin/env node

/**
 * TEST WORKING AUTHENTICATION
 * ===========================
 * Tests the fresh working user and all authentication flows
 */

const axios = require('axios');
const { chromium } = require('playwright');
const fs = require('fs');

class WorkingAuthenticationTest {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.apiUrl = `${baseUrl}/api`;
    this.workingUser = {
      email: 'dizelll.test.1757606995372@gmail.com',
      password: 'TestPassword123!'
    };
    this.testResults = [];
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 ${testName}`);
    console.log('='.repeat(testName.length + 3));

    try {
      const result = await testFunction();
      const success = result.success !== false;
      
      console.log(`${success ? '✅' : '❌'} ${result.message || (success ? 'PASSED' : 'FAILED')}`);
      
      if (result.details) {
        Object.entries(result.details).forEach(([key, value]) => {
          console.log(`   ${key}: ${value}`);
        });
      }

      this.testResults.push({
        name: testName,
        success,
        message: result.message,
        details: result.details || {},
        timestamp: new Date().toISOString()
      });

      return success;

    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      this.testResults.push({
        name: testName,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  async testAPILogin() {
    const response = await axios.post(`${this.apiUrl}/auth/login`, this.workingUser, {
      timeout: 10000
    });

    return {
      success: response.status === 200 && !!response.data.token,
      message: `API Login: ${response.status} - Token: ${!!response.data.token}`,
      details: {
        'HTTP Status': response.status,
        'Token Received': !!response.data.token,
        'User ID': response.data.user?.id,
        'Email Verified': response.data.user?.email_verified,
        'User Name': `${response.data.user?.first_name} ${response.data.user?.last_name}`
      },
      token: response.data.token,
      user: response.data.user
    };
  }

  async testFrontendLogin() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
      // Navigate to login page
      await page.goto(`${this.baseUrl}/login`);
      await page.waitForLoadState('networkidle');

      // Fill login form
      await page.fill('input[type="email"], input[name="email"]', this.workingUser.email);
      await page.fill('input[type="password"], input[name="password"]', this.workingUser.password);

      // Monitor network requests
      const networkRequests = [];
      page.on('response', response => {
        if (response.url().includes('/auth/login')) {
          networkRequests.push({
            status: response.status(),
            url: response.url()
          });
        }
      });

      // Submit form
      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
      await page.waitForTimeout(5000);

      // Check results
      const currentUrl = page.url();
      const isRedirected = !currentUrl.includes('/login');
      
      const authData = await page.evaluate(() => {
        return {
          localStorage: localStorage.getItem('token') || localStorage.getItem('authToken'),
          sessionStorage: sessionStorage.getItem('token') || sessionStorage.getItem('authToken'),
          cookies: document.cookie.includes('token')
        };
      });

      const hasAuthToken = !!authData.localStorage || !!authData.sessionStorage || authData.cookies;
      const loginSuccess = isRedirected || hasAuthToken;

      // Keep browser open for 10 seconds for visual confirmation
      await page.waitForTimeout(10000);
      await browser.close();

      return {
        success: loginSuccess,
        message: `Frontend Login: ${loginSuccess ? 'SUCCESS' : 'FAILED'} - ${isRedirected ? 'Redirected' : 'Stayed on login'}`,
        details: {
          'Current URL': currentUrl,
          'Redirected from Login': isRedirected,
          'Auth Token in Storage': hasAuthToken,
          'Network Requests': networkRequests.length,
          'API Response Status': networkRequests[0]?.status || 'None'
        }
      };

    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  async testRegistrationFlow() {
    const newTestEmail = `test.${Date.now()}@example.com`;
    const testData = {
      firstName: 'Test',
      lastName: 'User',
      email: newTestEmail,
      password: 'TestPassword123!',
      businessName: 'Test Business',
      agreeToTerms: true
    };

    const response = await axios.post(`${this.apiUrl}/auth/register`, testData, {
      timeout: 15000
    });

    return {
      success: response.status === 201,
      message: `Registration: ${response.status} - ${response.data.message || 'User created'}`,
      details: {
        'HTTP Status': response.status,
        'Email': newTestEmail,
        'Requires Verification': response.data.requiresVerification || false,
        'User Created': !!response.data.user
      }
    };
  }

  async testPasswordReset() {
    try {
      const response = await axios.post(`${this.apiUrl}/auth/forgot-password`, {
        email: this.workingUser.email
      }, { timeout: 10000 });

      return {
        success: response.status === 200,
        message: `Password Reset: ${response.status} - Request processed`,
        details: {
          'HTTP Status': response.status,
          'Message': response.data.message,
          'Reset URL Available': !!response.data.resetUrl
        }
      };

    } catch (error) {
      if (error.response?.status === 500) {
        return {
          success: false,
          message: 'Password Reset: 500 - Server error (known issue)',
          details: {
            'HTTP Status': 500,
            'Issue': 'Server-side password reset needs implementation'
          }
        };
      }
      throw error;
    }
  }

  async testAPIHealth() {
    const response = await axios.get(`${this.apiUrl}/health`, { timeout: 10000 });

    return {
      success: response.status === 200,
      message: `API Health: ${response.status} - ${response.data.status || 'OK'}`,
      details: {
        'HTTP Status': response.status,
        'Response': response.data.status || 'OK',
        'Response Time': 'Under 10s'
      }
    };
  }

  async testBusinessTypes() {
    const response = await axios.get(`${this.apiUrl}/business-types`, { timeout: 10000 });

    return {
      success: response.status === 200,
      message: `Business Types: ${response.status} - ${response.data.length || 0} types available`,
      details: {
        'HTTP Status': response.status,
        'Business Types Count': response.data.length || 0,
        'Has Hot Tub Type': response.data.some(bt => bt.name?.toLowerCase().includes('hot tub'))
      }
    };
  }

  async testDashboardAccess() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      // Test unauthenticated access
      await page.goto(`${this.baseUrl}/dashboard`);
      await page.waitForLoadState('networkidle');
      
      const redirectedToLogin = page.url().includes('/login');
      await browser.close();

      return {
        success: redirectedToLogin,
        message: `Dashboard Protection: ${redirectedToLogin ? 'WORKING' : 'FAILED'} - ${redirectedToLogin ? 'Redirects to login' : 'Allows access'}`,
        details: {
          'Redirected to Login': redirectedToLogin,
          'Final URL': page.url(),
          'Authentication Required': redirectedToLogin
        }
      };

    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  async runComprehensiveTest() {
    console.log('🧪 COMPREHENSIVE AUTHENTICATION TEST');
    console.log('====================================');
    console.log(`📧 Testing with: ${this.workingUser.email}`);
    console.log(`🔑 Password: ${this.workingUser.password}`);
    console.log(`🌐 Application: ${this.baseUrl}`);

    const testSuite = [
      ['API Health Check', () => this.testAPIHealth()],
      ['API Login Test', () => this.testAPILogin()],
      ['Frontend Login Test', () => this.testFrontendLogin()],
      ['Registration Flow Test', () => this.testRegistrationFlow()],
      ['Password Reset Test', () => this.testPasswordReset()],
      ['Business Types API', () => this.testBusinessTypes()],
      ['Dashboard Access Protection', () => this.testDashboardAccess()]
    ];

    const results = [];
    for (const [testName, testFunction] of testSuite) {
      const success = await this.runTest(testName, testFunction);
      results.push(success);
    }

    // Calculate overall success rate
    const passedTests = results.filter(r => r).length;
    const totalTests = results.length;
    const successRate = (passedTests / totalTests * 100).toFixed(1);

    console.log('\n📊 COMPREHENSIVE TEST RESULTS');
    console.log('==============================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}`);
    console.log(`📈 Success Rate: ${successRate}%`);

    // Categorize results
    const categories = {
      'Core Authentication': ['API Login Test', 'Frontend Login Test'],
      'User Management': ['Registration Flow Test', 'Password Reset Test'],
      'API Functionality': ['API Health Check', 'Business Types API'],
      'Security': ['Dashboard Access Protection']
    };

    console.log('\n📋 Results by Category:');
    Object.entries(categories).forEach(([category, testNames]) => {
      const categoryResults = this.testResults.filter(test => testNames.includes(test.name));
      const categoryPassed = categoryResults.filter(test => test.success).length;
      const categoryTotal = categoryResults.length;
      const categoryRate = (categoryPassed / categoryTotal * 100).toFixed(1);
      
      console.log(`   ${category}: ${categoryPassed}/${categoryTotal} (${categoryRate}%)`);
    });

    // Generate detailed report
    const report = {
      timestamp: new Date().toISOString(),
      workingUser: this.workingUser,
      totalTests,
      passedTests,
      successRate: parseFloat(successRate),
      testResults: this.testResults,
      categories: Object.fromEntries(
        Object.entries(categories).map(([category, testNames]) => {
          const categoryResults = this.testResults.filter(test => testNames.includes(test.name));
          const categoryPassed = categoryResults.filter(test => test.success).length;
          return [category, {
            passed: categoryPassed,
            total: categoryResults.length,
            rate: parseFloat((categoryPassed / categoryResults.length * 100).toFixed(1))
          }];
        })
      )
    };

    // Save report
    const reportFile = `working-auth-test-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportFile}`);

    // Final assessment
    console.log('\n🎯 FINAL ASSESSMENT:');
    if (successRate >= 85) {
      console.log('🎉 EXCELLENT: Authentication system working at 85%+ success rate!');
    } else if (successRate >= 70) {
      console.log('✅ GOOD: Authentication system mostly working, minor issues to address');
    } else {
      console.log('⚠️  NEEDS WORK: Authentication system has significant issues');
    }

    // Specific recommendations
    const failedTests = this.testResults.filter(test => !test.success);
    if (failedTests.length > 0) {
      console.log('\n🔧 ISSUES TO ADDRESS:');
      failedTests.forEach(test => {
        console.log(`   ❌ ${test.name}: ${test.error || test.message}`);
      });
    }

    console.log('\n🎉 COMPREHENSIVE AUTHENTICATION TEST COMPLETE!');
    
    return report;
  }
}

// Run test if called directly
if (require.main === module) {
  const tester = new WorkingAuthenticationTest();
  tester.runComprehensiveTest()
    .then(report => {
      const success = report.successRate >= 70;
      process.exit(success ? 0 : 1);
    })
    .catch(console.error);
}

module.exports = WorkingAuthenticationTest;
