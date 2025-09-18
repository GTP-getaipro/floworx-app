/**
 * CRITICAL PRODUCTION VALIDATION: Full Regression Testing of Authentication Flows
 * 
 * This script performs comprehensive testing of all authentication flows on the
 * production environment https://app.floworx-iq.com/
 * 
 * SAFETY MEASURES:
 * - Uses unique test data that can be easily identified and cleaned up
 * - Monitors for errors in real-time during testing
 * - Stops immediately if critical issues are detected
 * - NO AUTONOMOUS FIXES - only reports issues
 */

// Load environment variables if dotenv is available
try {
  require('dotenv').config({ path: '.env' });
} catch (e) {
  console.log('Note: dotenv not available, using system environment variables');
}

class ProductionAuthTester {
  constructor() {
    this.baseUrl = 'https://app.floworx-iq.com';
    this.testResults = {
      registration: [],
      login: [],
      passwordReset: [],
      logout: [],
      errors: [],
      startTime: new Date(),
      endTime: null
    };
    this.testUsers = []; // Track created test users for cleanup
    this.currentTestStep = '';
  }

  // Generate unique test email for each test
  generateTestEmail(prefix = 'test') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${prefix}_${timestamp}_${random}@example.com`;
  }

  // Log test step with timestamp
  logStep(step, status = 'INFO', details = '') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      step,
      status,
      details
    };
    
    console.log(`[${timestamp}] ${status}: ${step}`);
    if (details) console.log(`   Details: ${details}`);
    
    return logEntry;
  }

  // Monitor for critical errors
  checkForCriticalErrors(response, responseText) {
    const criticalIndicators = [
      'TypeError',
      'Uncaught',
      'Internal Server Error',
      'Database connection',
      'ECONNREFUSED',
      'timeout'
    ];

    if (response.status >= 500) {
      this.testResults.errors.push({
        type: 'HTTP_5XX_ERROR',
        status: response.status,
        response: responseText,
        timestamp: new Date().toISOString(),
        step: this.currentTestStep
      });
      return true;
    }

    for (const indicator of criticalIndicators) {
      if (responseText.toLowerCase().includes(indicator.toLowerCase())) {
        this.testResults.errors.push({
          type: 'CRITICAL_ERROR_DETECTED',
          indicator,
          response: responseText,
          timestamp: new Date().toISOString(),
          step: this.currentTestStep
        });
        return true;
      }
    }

    return false;
  }

  // Test user registration flow
  async testRegistrationFlow() {
    console.log('\n🧪 TESTING USER REGISTRATION FLOW');
    console.log('=====================================');

    const tests = [
      {
        name: 'Valid Registration',
        data: {
          firstName: 'Test',
          lastName: 'User',
          businessName: 'Test Business',
          email: this.generateTestEmail('reg_valid'),
          password: 'SecureTestPassword123!'
        },
        expectedStatus: 201
      },
      {
        name: 'Missing Required Fields',
        data: {
          firstName: 'Test'
          // Missing other required fields
        },
        expectedStatus: 400
      },
      {
        name: 'Invalid Email Format',
        data: {
          firstName: 'Test',
          lastName: 'User',
          email: 'invalid-email-format',
          password: 'SecureTestPassword123!'
        },
        expectedStatus: 400
      },
      {
        name: 'Weak Password',
        data: {
          firstName: 'Test',
          lastName: 'User',
          email: this.generateTestEmail('reg_weak_pwd'),
          password: '123'
        },
        expectedStatus: 400
      }
    ];

    for (const test of tests) {
      this.currentTestStep = `Registration: ${test.name}`;
      this.logStep(this.currentTestStep, 'START');

      try {
        const response = await fetch(`${this.baseUrl}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(test.data)
        });

        const responseText = await response.text();
        
        // Check for critical errors
        if (this.checkForCriticalErrors(response, responseText)) {
          this.logStep(`CRITICAL ERROR DETECTED in ${test.name}`, 'ERROR', responseText);
          throw new Error(`Critical error detected during ${test.name}`);
        }

        const testResult = {
          name: test.name,
          expected: test.expectedStatus,
          actual: response.status,
          passed: response.status === test.expectedStatus,
          response: responseText,
          timestamp: new Date().toISOString()
        };

        this.testResults.registration.push(testResult);

        if (testResult.passed) {
          this.logStep(`${test.name} - PASSED`, 'SUCCESS', `Status: ${response.status}`);
          
          // If successful registration, track user for cleanup
          if (response.status === 201 && test.data.email) {
            const responseData = JSON.parse(responseText);
            this.testUsers.push({
              email: test.data.email,
              userId: responseData.userId,
              password: test.data.password
            });
          }
        } else {
          this.logStep(`${test.name} - FAILED`, 'FAIL', 
            `Expected: ${test.expectedStatus}, Got: ${response.status}`);
        }

      } catch (error) {
        this.logStep(`${test.name} - ERROR`, 'ERROR', error.message);
        this.testResults.registration.push({
          name: test.name,
          expected: test.expectedStatus,
          actual: 'ERROR',
          passed: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        // If critical error, stop testing
        if (error.message.includes('Critical error')) {
          throw error;
        }
      }
    }

    // Test duplicate email registration
    if (this.testUsers.length > 0) {
      await this.testDuplicateRegistration();
    }
  }

  // Test duplicate email registration
  async testDuplicateRegistration() {
    this.currentTestStep = 'Registration: Duplicate Email';
    this.logStep(this.currentTestStep, 'START');

    const existingUser = this.testUsers[0];
    const duplicateData = {
      firstName: 'Duplicate',
      lastName: 'Test',
      businessName: 'Duplicate Business',
      email: existingUser.email,
      password: 'AnotherPassword123!'
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicateData)
      });

      const responseText = await response.text();
      
      if (this.checkForCriticalErrors(response, responseText)) {
        throw new Error('Critical error detected during duplicate email test');
      }

      const testResult = {
        name: 'Duplicate Email Registration',
        expected: 409,
        actual: response.status,
        passed: response.status === 409,
        response: responseText,
        timestamp: new Date().toISOString()
      };

      this.testResults.registration.push(testResult);

      if (testResult.passed) {
        this.logStep('Duplicate Email Registration - PASSED', 'SUCCESS', 'Correctly rejected with 409');
      } else {
        this.logStep('Duplicate Email Registration - FAILED', 'FAIL', 
          `Expected: 409, Got: ${response.status}`);
      }

    } catch (error) {
      this.logStep('Duplicate Email Registration - ERROR', 'ERROR', error.message);
      this.testResults.registration.push({
        name: 'Duplicate Email Registration',
        expected: 409,
        actual: 'ERROR',
        passed: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      if (error.message.includes('Critical error')) {
        throw error;
      }
    }
  }

  // Test login flow
  async testLoginFlow() {
    console.log('\n🔐 TESTING USER LOGIN FLOW');
    console.log('============================');

    if (this.testUsers.length === 0) {
      this.logStep('No test users available for login testing', 'SKIP');
      return;
    }

    const validUser = this.testUsers[0];

    const loginTests = [
      {
        name: 'Valid Login (Unverified User)',
        data: {
          email: validUser.email,
          password: validUser.password
        },
        expectedStatus: 403, // 403 Forbidden for unverified users
        description: 'Login with valid credentials but unverified email'
      },
      {
        name: 'Invalid Password',
        data: {
          email: validUser.email,
          password: 'WrongPassword123!'
        },
        expectedStatus: [400, 401, 403],
        description: 'Login with correct email but wrong password'
      },
      {
        name: 'Non-existent User',
        data: {
          email: this.generateTestEmail('nonexistent'),
          password: 'SomePassword123!'
        },
        expectedStatus: [400, 401, 404],
        description: 'Login with non-existent email'
      },
      {
        name: 'Missing Credentials',
        data: {
          email: validUser.email
          // Missing password
        },
        expectedStatus: 400,
        description: 'Login with missing password field'
      }
    ];

    for (const test of loginTests) {
      this.currentTestStep = `Login: ${test.name}`;
      this.logStep(this.currentTestStep, 'START', test.description);

      try {
        const response = await fetch(`${this.baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(test.data)
        });

        const responseText = await response.text();

        if (this.checkForCriticalErrors(response, responseText)) {
          throw new Error(`Critical error detected during ${test.name}`);
        }

        const expectedStatuses = Array.isArray(test.expectedStatus) ?
          test.expectedStatus : [test.expectedStatus];
        const passed = expectedStatuses.includes(response.status);

        const testResult = {
          name: test.name,
          expected: test.expectedStatus,
          actual: response.status,
          passed,
          response: responseText,
          timestamp: new Date().toISOString()
        };

        this.testResults.login.push(testResult);

        if (passed) {
          this.logStep(`${test.name} - PASSED`, 'SUCCESS', `Status: ${response.status}`);
        } else {
          this.logStep(`${test.name} - FAILED`, 'FAIL',
            `Expected: ${test.expectedStatus}, Got: ${response.status}`);
        }

      } catch (error) {
        this.logStep(`${test.name} - ERROR`, 'ERROR', error.message);
        this.testResults.login.push({
          name: test.name,
          expected: test.expectedStatus,
          actual: 'ERROR',
          passed: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        if (error.message.includes('Critical error')) {
          throw error;
        }
      }
    }
  }

  // Test password reset flow
  async testPasswordResetFlow() {
    console.log('\n🔑 TESTING PASSWORD RESET FLOW');
    console.log('===============================');

    if (this.testUsers.length === 0) {
      this.logStep('No test users available for password reset testing', 'SKIP');
      return;
    }

    const validUser = this.testUsers[0];

    const resetTests = [
      {
        name: 'Valid Password Reset Request',
        data: {
          email: validUser.email
        },
        expectedStatus: [200, 202],
        description: 'Request password reset for valid email'
      },
      {
        name: 'Non-existent Email Reset Request',
        data: {
          email: this.generateTestEmail('nonexistent_reset')
        },
        expectedStatus: [200, 202, 404], // Often returns 200 for security
        description: 'Request password reset for non-existent email'
      },
      {
        name: 'Invalid Email Format Reset',
        data: {
          email: 'invalid-email-format'
        },
        expectedStatus: 400,
        description: 'Request password reset with invalid email format'
      },
      {
        name: 'Missing Email Reset',
        data: {
          // Missing email field
        },
        expectedStatus: 400,
        description: 'Request password reset without email'
      }
    ];

    for (const test of resetTests) {
      this.currentTestStep = `Password Reset: ${test.name}`;
      this.logStep(this.currentTestStep, 'START', test.description);

      try {
        const response = await fetch(`${this.baseUrl}/api/auth/forgot-password`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(test.data)
        });

        const responseText = await response.text();

        if (this.checkForCriticalErrors(response, responseText)) {
          throw new Error(`Critical error detected during ${test.name}`);
        }

        const expectedStatuses = Array.isArray(test.expectedStatus) ?
          test.expectedStatus : [test.expectedStatus];
        const passed = expectedStatuses.includes(response.status);

        const testResult = {
          name: test.name,
          expected: test.expectedStatus,
          actual: response.status,
          passed,
          response: responseText,
          timestamp: new Date().toISOString()
        };

        this.testResults.passwordReset.push(testResult);

        if (passed) {
          this.logStep(`${test.name} - PASSED`, 'SUCCESS', `Status: ${response.status}`);
        } else {
          this.logStep(`${test.name} - FAILED`, 'FAIL',
            `Expected: ${test.expectedStatus}, Got: ${response.status}`);
        }

      } catch (error) {
        this.logStep(`${test.name} - ERROR`, 'ERROR', error.message);
        this.testResults.passwordReset.push({
          name: test.name,
          expected: test.expectedStatus,
          actual: 'ERROR',
          passed: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        if (error.message.includes('Critical error')) {
          throw error;
        }
      }
    }
  }

  // Test logout flow (basic endpoint test)
  async testLogoutFlow() {
    console.log('\n🚪 TESTING LOGOUT FLOW');
    console.log('=======================');

    const logoutTests = [
      {
        name: 'Logout Without Session',
        method: 'POST',
        endpoint: '/api/auth/logout',
        data: {},
        expectedStatus: [200, 204], // 204 No Content is correct for idempotent logout
        description: 'Attempt logout without active session'
      },
      {
        name: 'Logout Endpoint Availability',
        method: 'OPTIONS',
        endpoint: '/api/auth/logout',
        data: {},
        expectedStatus: [200, 204],
        description: 'Check if logout endpoint is available'
      }
    ];

    for (const test of logoutTests) {
      this.currentTestStep = `Logout: ${test.name}`;
      this.logStep(this.currentTestStep, 'START', test.description);

      try {
        const response = await fetch(`${this.baseUrl}${test.endpoint}`, {
          method: test.method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: test.method !== 'OPTIONS' ? JSON.stringify(test.data) : undefined
        });

        const responseText = await response.text();

        if (this.checkForCriticalErrors(response, responseText)) {
          throw new Error(`Critical error detected during ${test.name}`);
        }

        const expectedStatuses = Array.isArray(test.expectedStatus) ?
          test.expectedStatus : [test.expectedStatus];
        const passed = expectedStatuses.includes(response.status);

        const testResult = {
          name: test.name,
          expected: test.expectedStatus,
          actual: response.status,
          passed,
          response: responseText,
          timestamp: new Date().toISOString()
        };

        this.testResults.logout.push(testResult);

        if (passed) {
          this.logStep(`${test.name} - PASSED`, 'SUCCESS', `Status: ${response.status}`);
        } else {
          this.logStep(`${test.name} - FAILED`, 'FAIL',
            `Expected: ${test.expectedStatus}, Got: ${response.status}`);
        }

      } catch (error) {
        this.logStep(`${test.name} - ERROR`, 'ERROR', error.message);
        this.testResults.logout.push({
          name: test.name,
          expected: test.expectedStatus,
          actual: 'ERROR',
          passed: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });

        if (error.message.includes('Critical error')) {
          throw error;
        }
      }
    }
  }

  // Generate comprehensive test report
  generateReport() {
    this.testResults.endTime = new Date();
    const duration = this.testResults.endTime - this.testResults.startTime;

    const report = {
      summary: {
        testStartTime: this.testResults.startTime.toISOString(),
        testEndTime: this.testResults.endTime.toISOString(),
        totalDuration: `${Math.round(duration / 1000)}s`,
        environment: this.baseUrl,
        criticalErrors: this.testResults.errors.length
      },
      results: {
        registration: {
          total: this.testResults.registration.length,
          passed: this.testResults.registration.filter(t => t.passed).length,
          failed: this.testResults.registration.filter(t => !t.passed).length,
          tests: this.testResults.registration
        },
        login: {
          total: this.testResults.login.length,
          passed: this.testResults.login.filter(t => t.passed).length,
          failed: this.testResults.login.filter(t => !t.passed).length,
          tests: this.testResults.login
        },
        passwordReset: {
          total: this.testResults.passwordReset.length,
          passed: this.testResults.passwordReset.filter(t => t.passed).length,
          failed: this.testResults.passwordReset.filter(t => !t.passed).length,
          tests: this.testResults.passwordReset
        },
        logout: {
          total: this.testResults.logout.length,
          passed: this.testResults.logout.filter(t => t.passed).length,
          failed: this.testResults.logout.filter(t => !t.passed).length,
          tests: this.testResults.logout
        }
      },
      criticalErrors: this.testResults.errors,
      testUsers: this.testUsers.map(u => ({ email: u.email, userId: u.userId }))
    };

    // Calculate overall statistics
    const totalTests = report.results.registration.total +
                      report.results.login.total +
                      report.results.passwordReset.total +
                      report.results.logout.total;

    const totalPassed = report.results.registration.passed +
                       report.results.login.passed +
                       report.results.passwordReset.passed +
                       report.results.logout.passed;

    report.summary.totalTests = totalTests;
    report.summary.totalPassed = totalPassed;
    report.summary.totalFailed = totalTests - totalPassed;
    report.summary.successRate = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 0;

    return report;
  }

  // Print formatted test report
  printReport(report) {
    console.log('\n' + '='.repeat(80));
    console.log('🏁 PRODUCTION AUTHENTICATION REGRESSION TEST REPORT');
    console.log('='.repeat(80));

    console.log(`\n📊 SUMMARY:`);
    console.log(`   Environment: ${report.summary.environment}`);
    console.log(`   Test Duration: ${report.summary.totalDuration}`);
    console.log(`   Total Tests: ${report.summary.totalTests}`);
    console.log(`   Passed: ${report.summary.totalPassed}`);
    console.log(`   Failed: ${report.summary.totalFailed}`);
    console.log(`   Success Rate: ${report.summary.successRate}%`);
    console.log(`   Critical Errors: ${report.summary.criticalErrors}`);

    // Registration Results
    console.log(`\n🧪 REGISTRATION TESTS (${report.results.registration.passed}/${report.results.registration.total} passed):`);
    report.results.registration.tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      console.log(`   ${status} ${test.name} - Status: ${test.actual}`);
    });

    // Login Results
    console.log(`\n🔐 LOGIN TESTS (${report.results.login.passed}/${report.results.login.total} passed):`);
    report.results.login.tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      console.log(`   ${status} ${test.name} - Status: ${test.actual}`);
    });

    // Password Reset Results
    console.log(`\n🔑 PASSWORD RESET TESTS (${report.results.passwordReset.passed}/${report.results.passwordReset.total} passed):`);
    report.results.passwordReset.tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      console.log(`   ${status} ${test.name} - Status: ${test.actual}`);
    });

    // Logout Results
    console.log(`\n🚪 LOGOUT TESTS (${report.results.logout.passed}/${report.results.logout.total} passed):`);
    report.results.logout.tests.forEach(test => {
      const status = test.passed ? '✅' : '❌';
      console.log(`   ${status} ${test.name} - Status: ${test.actual}`);
    });

    // Critical Errors
    if (report.criticalErrors.length > 0) {
      console.log(`\n🚨 CRITICAL ERRORS DETECTED:`);
      report.criticalErrors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.type} at ${error.timestamp}`);
        console.log(`      Step: ${error.step}`);
        console.log(`      Details: ${error.response || error.indicator}`);
      });
    }

    // Test Users Created
    if (report.testUsers.length > 0) {
      console.log(`\n👥 TEST USERS CREATED (${report.testUsers.length}):`);
      report.testUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (ID: ${user.userId})`);
      });
      console.log(`\n⚠️  CLEANUP REQUIRED: Please remove these test users from production database`);
    }

    console.log('\n' + '='.repeat(80));

    // Final verdict
    if (report.summary.criticalErrors > 0) {
      console.log('🚨 CRITICAL ISSUES DETECTED - IMMEDIATE ATTENTION REQUIRED');
    } else if (report.summary.successRate >= 90) {
      console.log('✅ PRODUCTION VALIDATION PASSED - All critical flows working');
    } else if (report.summary.successRate >= 75) {
      console.log('⚠️  PRODUCTION VALIDATION PARTIAL - Some issues detected');
    } else {
      console.log('❌ PRODUCTION VALIDATION FAILED - Multiple issues detected');
    }

    console.log('='.repeat(80));
  }

  // Main test execution
  async runAllTests() {
    try {
      console.log('🚀 STARTING PRODUCTION AUTHENTICATION REGRESSION TESTS');
      console.log(`Target Environment: ${this.baseUrl}`);
      console.log(`Test Start Time: ${this.testResults.startTime.toISOString()}`);
      console.log('\n⚠️  SAFETY MEASURES ACTIVE:');
      console.log('   - Real-time error monitoring enabled');
      console.log('   - Test will halt on critical errors');
      console.log('   - Using unique test data for easy cleanup');
      console.log('   - NO AUTONOMOUS FIXES will be attempted');

      // Pre-test environment check
      this.logStep('Pre-test Environment Check', 'START');
      const healthResponse = await fetch(`${this.baseUrl}/api/health`);
      if (healthResponse.status !== 200) {
        throw new Error(`Environment health check failed: ${healthResponse.status}`);
      }
      this.logStep('Environment health check passed', 'SUCCESS');

      // Run all test suites
      await this.testRegistrationFlow();
      await this.testLoginFlow();
      await this.testPasswordResetFlow();
      await this.testLogoutFlow();

      // Generate and display report
      const report = this.generateReport();
      this.printReport(report);

      // Save detailed report to file
      const reportFilename = `production-auth-test-report-${Date.now()}.json`;
      require('fs').writeFileSync(reportFilename, JSON.stringify(report, null, 2));
      console.log(`\n📄 Detailed report saved to: ${reportFilename}`);

      return report;

    } catch (error) {
      console.error('\n🚨 CRITICAL ERROR DURING TESTING:');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);

      this.testResults.errors.push({
        type: 'CRITICAL_TEST_FAILURE',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        step: this.currentTestStep
      });

      const report = this.generateReport();
      this.printReport(report);

      console.log('\n🛑 TESTING HALTED DUE TO CRITICAL ERROR');
      console.log('🚨 IMMEDIATE HUMAN INTERVENTION REQUIRED');

      throw error;
    }
  }
}

// Execute the tests
async function main() {
  const tester = new ProductionAuthTester();

  try {
    const report = await tester.runAllTests();

    // Exit with appropriate code
    if (report.summary.criticalErrors > 0) {
      process.exit(2); // Critical errors
    } else if (report.summary.successRate < 75) {
      process.exit(1); // Too many failures
    } else {
      process.exit(0); // Success
    }

  } catch (error) {
    console.error('Test execution failed:', error.message);
    process.exit(3); // Test execution failure
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = ProductionAuthTester;
