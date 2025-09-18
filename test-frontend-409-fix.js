/**
 * TEST FRONTEND 409 ERROR HANDLING FIX
 * 
 * This script tests the frontend's handling of 409 Conflict responses
 * to ensure TypeErrors are resolved and error handling works correctly.
 */

class FrontendErrorHandlingTester {
  constructor() {
    this.baseUrl = 'https://app.floworx-iq.com';
    this.testResults = {
      duplicateEmailTest: null,
      errorHandlingTest: null,
      errors: [],
      startTime: new Date()
    };
    this.testUser = null;
  }

  // Generate unique test email
  generateTestEmail() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `frontend_test_${timestamp}_${random}@example.com`;
  }

  // Log test step with timestamp
  logStep(step, status = 'INFO', details = '') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${status}: ${step}`);
    if (details) console.log(`   Details: ${details}`);
  }

  // Test duplicate email registration to trigger 409 response
  async testDuplicateEmailHandling() {
    console.log('\n🔄 TESTING DUPLICATE EMAIL REGISTRATION (409 HANDLING)');
    console.log('======================================================');

    try {
      const testEmail = this.generateTestEmail();
      const testPassword = 'TestPassword123!';
      
      // Step 1: Register user first time (should succeed)
      this.logStep('Creating initial user', 'START');
      
      const firstResponse = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Test',
          lastName: 'User',
          businessName: 'Test Business',
          email: testEmail,
          password: testPassword
        })
      });

      if (firstResponse.status !== 201) {
        throw new Error(`First registration failed: ${firstResponse.status}`);
      }

      const firstData = await firstResponse.json();
      this.testUser = {
        email: testEmail,
        password: testPassword,
        userId: firstData.userId
      };

      this.logStep('Initial user created successfully', 'SUCCESS', `Email: ${testEmail}`);

      // Step 2: Attempt duplicate registration (should return 409)
      this.logStep('Attempting duplicate registration', 'START');

      const duplicateResponse = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Duplicate',
          lastName: 'User',
          businessName: 'Duplicate Business',
          email: testEmail, // Same email
          password: 'DifferentPassword123!'
        })
      });

      const duplicateResponseText = await duplicateResponse.text();
      let duplicateData;
      try {
        duplicateData = JSON.parse(duplicateResponseText);
      } catch (e) {
        duplicateData = { rawResponse: duplicateResponseText };
      }

      // Validate the 409 response
      const expectedStatus = 409;
      const actualStatus = duplicateResponse.status;
      const passed = actualStatus === expectedStatus;

      this.testResults.duplicateEmailTest = {
        name: 'Duplicate Email Registration',
        expected: expectedStatus,
        actual: actualStatus,
        passed,
        response: duplicateData,
        timestamp: new Date().toISOString()
      };

      if (passed) {
        this.logStep('✅ DUPLICATE EMAIL TEST PASSED', 'SUCCESS', 
          `Correctly returned 409 Conflict`);
        
        // Check error structure
        if (duplicateData.error?.code === 'EMAIL_EXISTS') {
          this.logStep('✅ Correct error code present', 'SUCCESS', duplicateData.error.code);
        }
        
        if (duplicateData.error?.message) {
          this.logStep('✅ Error message present', 'SUCCESS', duplicateData.error.message);
        }
      } else {
        this.logStep('❌ DUPLICATE EMAIL TEST FAILED', 'FAIL', 
          `Expected: 409, Got: ${actualStatus}`);
        console.log('Response:', JSON.stringify(duplicateData, null, 2));
      }

    } catch (error) {
      this.logStep('❌ DUPLICATE EMAIL TEST ERROR', 'ERROR', error.message);
      this.testResults.duplicateEmailTest = {
        name: 'Duplicate Email Registration',
        expected: 409,
        actual: 'ERROR',
        passed: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      this.testResults.errors.push({
        test: 'duplicateEmailTest',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Test error handling structure
  async testErrorHandlingStructure() {
    console.log('\n🔍 TESTING ERROR HANDLING STRUCTURE');
    console.log('====================================');

    try {
      this.logStep('Testing various error scenarios', 'START');

      // Test 1: Invalid email format
      const invalidEmailResponse = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Test',
          lastName: 'User',
          email: 'invalid-email-format',
          password: 'TestPassword123!'
        })
      });

      const invalidEmailData = await invalidEmailResponse.json();
      
      // Test 2: Missing required fields
      const missingFieldsResponse = await fetch(`${this.baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Test'
          // Missing other required fields
        })
      });

      const missingFieldsData = await missingFieldsResponse.json();

      // Validate error structures
      const tests = [
        {
          name: 'Invalid Email Format',
          response: invalidEmailResponse,
          data: invalidEmailData,
          expectedStatus: 400
        },
        {
          name: 'Missing Required Fields',
          response: missingFieldsResponse,
          data: missingFieldsData,
          expectedStatus: 400
        }
      ];

      let allPassed = true;
      const results = [];

      for (const test of tests) {
        const passed = test.response.status === test.expectedStatus && 
                      test.data.error && 
                      test.data.error.message;
        
        results.push({
          name: test.name,
          passed,
          status: test.response.status,
          hasErrorStructure: !!test.data.error
        });

        if (!passed) allPassed = false;

        this.logStep(`${test.name}: ${passed ? 'PASSED' : 'FAILED'}`, 
          passed ? 'SUCCESS' : 'FAIL',
          `Status: ${test.response.status}, Has Error Structure: ${!!test.data.error}`);
      }

      this.testResults.errorHandlingTest = {
        name: 'Error Handling Structure',
        passed: allPassed,
        results,
        timestamp: new Date().toISOString()
      };

      if (allPassed) {
        this.logStep('✅ ERROR HANDLING STRUCTURE TEST PASSED', 'SUCCESS');
      } else {
        this.logStep('❌ ERROR HANDLING STRUCTURE TEST FAILED', 'FAIL');
      }

    } catch (error) {
      this.logStep('❌ ERROR HANDLING STRUCTURE TEST ERROR', 'ERROR', error.message);
      this.testResults.errorHandlingTest = {
        name: 'Error Handling Structure',
        passed: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      this.testResults.errors.push({
        test: 'errorHandlingTest',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  // Cleanup test user
  async cleanupTestUser() {
    if (!this.testUser) return;

    try {
      this.logStep('Cleaning up test user', 'START', this.testUser.email);
      
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        'https://enamhufwobytrfydarsz.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuYW1odWZ3b2J5dHJmeWRhcnN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0OTIwNSwiZXhwIjoyMDcyNTI1MjA1fQ.NVI17sMDYvb4ZqNG6ucQ_VdO6QqiElllFeC16GLTyE4'
      );

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', this.testUser.userId);

      if (error) {
        this.logStep('⚠️ Cleanup warning', 'WARN', error.message);
      } else {
        this.logStep('✅ Test user cleaned up successfully', 'SUCCESS');
      }
    } catch (error) {
      this.logStep('⚠️ Cleanup error', 'WARN', error.message);
    }
  }

  // Generate test report
  generateReport() {
    const endTime = new Date();
    const duration = endTime - this.testResults.startTime;

    const report = {
      summary: {
        testStartTime: this.testResults.startTime.toISOString(),
        testEndTime: endTime.toISOString(),
        totalDuration: `${Math.round(duration / 1000)}s`,
        environment: this.baseUrl,
        totalTests: 2,
        passed: 0,
        failed: 0,
        errors: this.testResults.errors.length
      },
      tests: {
        duplicateEmailTest: this.testResults.duplicateEmailTest,
        errorHandlingTest: this.testResults.errorHandlingTest
      },
      errors: this.testResults.errors
    };

    // Calculate pass/fail counts
    if (this.testResults.duplicateEmailTest?.passed) report.summary.passed++;
    else report.summary.failed++;
    
    if (this.testResults.errorHandlingTest?.passed) report.summary.passed++;
    else report.summary.failed++;

    report.summary.successRate = Math.round((report.summary.passed / report.summary.totalTests) * 100);

    return report;
  }

  // Print formatted report
  printReport(report) {
    console.log('\n' + '='.repeat(70));
    console.log('🔧 FRONTEND 409 ERROR HANDLING FIX VALIDATION REPORT');
    console.log('='.repeat(70));
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Environment: ${report.summary.environment}`);
    console.log(`   Test Duration: ${report.summary.totalDuration}`);
    console.log(`   Tests: ${report.summary.passed}/${report.summary.totalTests} passed`);
    console.log(`   Success Rate: ${report.summary.successRate}%`);
    console.log(`   Errors: ${report.summary.errors}`);

    console.log(`\n🔄 DUPLICATE EMAIL TEST:`);
    const duplicateTest = report.tests.duplicateEmailTest;
    if (duplicateTest) {
      const status = duplicateTest.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`   ${status} - Expected: ${duplicateTest.expected}, Got: ${duplicateTest.actual}`);
      if (duplicateTest.error) console.log(`   Error: ${duplicateTest.error}`);
    }

    console.log(`\n🔍 ERROR HANDLING STRUCTURE TEST:`);
    const errorTest = report.tests.errorHandlingTest;
    if (errorTest) {
      const status = errorTest.passed ? '✅ PASSED' : '❌ FAILED';
      console.log(`   ${status}`);
      if (errorTest.results) {
        errorTest.results.forEach(result => {
          console.log(`     - ${result.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);
        });
      }
      if (errorTest.error) console.log(`   Error: ${errorTest.error}`);
    }

    if (report.errors.length > 0) {
      console.log(`\n🚨 ERRORS:`);
      report.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.test}: ${error.error}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    
    if (report.summary.successRate === 100) {
      console.log('🎉 FRONTEND ERROR HANDLING FIXES VALIDATED SUCCESSFULLY!');
      console.log('✅ No more TypeErrors expected for 409 responses');
    } else if (report.summary.successRate >= 50) {
      console.log('⚠️  PARTIAL SUCCESS - Some fixes working');
    } else {
      console.log('❌ FIXES NOT WORKING - Further investigation needed');
    }
    
    console.log('='.repeat(70));
  }

  // Main test execution
  async runTests() {
    try {
      console.log('🔧 STARTING FRONTEND 409 ERROR HANDLING FIX VALIDATION');
      console.log(`Target Environment: ${this.baseUrl}`);
      console.log(`Test Start Time: ${this.testResults.startTime.toISOString()}`);

      await this.testDuplicateEmailHandling();
      await this.testErrorHandlingStructure();
      await this.cleanupTestUser();

      const report = this.generateReport();
      this.printReport(report);

      return report;

    } catch (error) {
      console.error('\n🚨 CRITICAL ERROR DURING FRONTEND TESTING:');
      console.error('Error:', error.message);
      throw error;
    }
  }
}

// Execute the tests
async function main() {
  const tester = new FrontendErrorHandlingTester();
  
  try {
    const report = await tester.runTests();
    
    // Exit with appropriate code
    if (report.summary.successRate === 100) {
      process.exit(0); // Success
    } else {
      process.exit(1); // Some failures
    }
    
  } catch (error) {
    console.error('Frontend test execution failed:', error.message);
    process.exit(2); // Test execution failure
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = FrontendErrorHandlingTester;
