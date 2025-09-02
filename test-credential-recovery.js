#!/usr/bin/env node

/**
 * Floworx Credential Recovery System Test Suite
 * 
 * This script tests all aspects of the credential recovery system
 * Run with: node test-credential-recovery.js
 */

const axios = require('axios');
const crypto = require('crypto');

class CredentialRecoveryTester {
  constructor() {
    this.baseURL = process.env.API_URL || 'http://localhost:3001/api';
    this.testEmail = 'test@floworx-iq.com';
    this.testPassword = 'TestPassword123!';
    this.newPassword = 'NewTestPassword456!';
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 Floworx Credential Recovery System Tests\n');
    
    try {
      await this.testPasswordResetFlow();
      await this.testTokenValidation();
      await this.testRateLimiting();
      await this.testSecurityFeatures();
      await this.testErrorHandling();
      
      this.printResults();
      
    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Test complete password reset flow
   */
  async testPasswordResetFlow() {
    console.log('🔄 Testing Password Reset Flow...');
    
    // Test 1: Request password reset
    await this.test('Request password reset', async () => {
      const response = await axios.post(`${this.baseURL}/auth/forgot-password`, {
        email: this.testEmail
      });
      
      return response.status === 200 && response.data.success;
    });

    // Test 2: Get password requirements
    await this.test('Get password requirements', async () => {
      const response = await axios.get(`${this.baseURL}/auth/password-requirements`);
      
      return response.status === 200 && 
             response.data.requirements &&
             response.data.requirements.minLength >= 8;
    });

    // Test 3: Invalid email format
    await this.test('Reject invalid email format', async () => {
      try {
        await axios.post(`${this.baseURL}/auth/forgot-password`, {
          email: 'invalid-email'
        });
        return false; // Should have thrown an error
      } catch (error) {
        return error.response?.status === 400;
      }
    });

    // Test 4: Missing email
    await this.test('Reject missing email', async () => {
      try {
        await axios.post(`${this.baseURL}/auth/forgot-password`, {});
        return false; // Should have thrown an error
      } catch (error) {
        return error.response?.status === 400;
      }
    });
  }

  /**
   * Test token validation
   */
  async testTokenValidation() {
    console.log('🔑 Testing Token Validation...');
    
    // Test 1: Invalid token format
    await this.test('Reject invalid token format', async () => {
      try {
        await axios.post(`${this.baseURL}/auth/verify-reset-token`, {
          token: 'invalid-token'
        });
        return false;
      } catch (error) {
        return error.response?.status === 400;
      }
    });

    // Test 2: Missing token
    await this.test('Reject missing token', async () => {
      try {
        await axios.post(`${this.baseURL}/auth/verify-reset-token`, {});
        return false;
      } catch (error) {
        return error.response?.status === 400;
      }
    });

    // Test 3: Expired token simulation
    await this.test('Handle expired tokens gracefully', async () => {
      const expiredToken = crypto.randomBytes(32).toString('hex');
      try {
        await axios.post(`${this.baseURL}/auth/verify-reset-token`, {
          token: expiredToken
        });
        return false;
      } catch (error) {
        return error.response?.status === 400;
      }
    });
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting() {
    console.log('⏱️ Testing Rate Limiting...');
    
    // Test 1: Multiple rapid requests
    await this.test('Rate limit password reset requests', async () => {
      const requests = [];
      
      // Send 5 rapid requests
      for (let i = 0; i < 5; i++) {
        requests.push(
          axios.post(`${this.baseURL}/auth/forgot-password`, {
            email: `test${i}@example.com`
          }).catch(error => error.response)
        );
      }
      
      const responses = await Promise.all(requests);
      
      // At least one should be rate limited
      return responses.some(response => 
        response?.status === 429 || 
        response?.data?.rateLimited
      );
    });
  }

  /**
   * Test security features
   */
  async testSecurityFeatures() {
    console.log('🔒 Testing Security Features...');
    
    // Test 1: Password strength validation
    await this.test('Validate password strength', async () => {
      const weakPasswords = ['123', 'password', 'abc123'];
      
      for (const weakPassword of weakPasswords) {
        try {
          await axios.post(`${this.baseURL}/auth/reset-password`, {
            token: crypto.randomBytes(32).toString('hex'),
            newPassword: weakPassword,
            confirmPassword: weakPassword
          });
          return false; // Should have been rejected
        } catch (error) {
          if (error.response?.status !== 400) {
            return false;
          }
        }
      }
      
      return true;
    });

    // Test 2: Password confirmation mismatch
    await this.test('Reject password confirmation mismatch', async () => {
      try {
        await axios.post(`${this.baseURL}/auth/reset-password`, {
          token: crypto.randomBytes(32).toString('hex'),
          newPassword: 'StrongPassword123!',
          confirmPassword: 'DifferentPassword456!'
        });
        return false;
      } catch (error) {
        return error.response?.status === 400;
      }
    });

    // Test 3: SQL injection attempt
    await this.test('Prevent SQL injection', async () => {
      const maliciousEmail = "test@example.com'; DROP TABLE users; --";
      
      try {
        const response = await axios.post(`${this.baseURL}/auth/forgot-password`, {
          email: maliciousEmail
        });
        
        // Should handle gracefully without errors
        return response.status === 200;
      } catch (error) {
        // Should not cause server errors
        return error.response?.status < 500;
      }
    });
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('🚨 Testing Error Handling...');
    
    // Test 1: Malformed JSON
    await this.test('Handle malformed JSON', async () => {
      try {
        await axios.post(`${this.baseURL}/auth/forgot-password`, 'invalid-json', {
          headers: { 'Content-Type': 'application/json' }
        });
        return false;
      } catch (error) {
        return error.response?.status === 400;
      }
    });

    // Test 2: Missing Content-Type
    await this.test('Handle missing Content-Type', async () => {
      try {
        await axios.post(`${this.baseURL}/auth/forgot-password`, {
          email: this.testEmail
        }, {
          headers: { 'Content-Type': 'text/plain' }
        });
        return false;
      } catch (error) {
        return error.response?.status >= 400;
      }
    });

    // Test 3: Very long email
    await this.test('Handle oversized input', async () => {
      const longEmail = 'a'.repeat(1000) + '@example.com';
      
      try {
        await axios.post(`${this.baseURL}/auth/forgot-password`, {
          email: longEmail
        });
        return false;
      } catch (error) {
        return error.response?.status === 400;
      }
    });
  }

  /**
   * Run individual test
   */
  async test(name, testFunction) {
    try {
      const result = await testFunction();
      
      if (result) {
        console.log(`  ✅ ${name}`);
        this.results.passed++;
      } else {
        console.log(`  ❌ ${name}`);
        this.results.failed++;
      }
      
      this.results.tests.push({ name, passed: result });
      
    } catch (error) {
      console.log(`  ❌ ${name} - Error: ${error.message}`);
      this.results.failed++;
      this.results.tests.push({ name, passed: false, error: error.message });
    }
  }

  /**
   * Print test results
   */
  printResults() {
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`📈 Success Rate: ${Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100)}%`);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  - ${test.name}${test.error ? ': ' + test.error : ''}`);
        });
    }
    
    console.log('\n🎯 Recommendations:');
    
    if (this.results.failed === 0) {
      console.log('  ✅ All tests passed! Your credential recovery system is ready for production.');
    } else {
      console.log('  ⚠️  Some tests failed. Please review and fix the issues before deploying.');
    }
    
    console.log('  📝 Monitor security audit logs in production');
    console.log('  🔄 Run tests regularly after updates');
    console.log('  📧 Test email delivery in your production environment');
    console.log('  🔐 Ensure encryption keys are properly secured');
  }

  /**
   * Test frontend components (basic validation)
   */
  async testFrontendComponents() {
    console.log('🎨 Testing Frontend Components...');
    
    const fs = require('fs');
    
    // Test 1: Components exist
    await this.test('Frontend components exist', async () => {
      const components = [
        'frontend/src/components/ForgotPassword.js',
        'frontend/src/components/ResetPassword.js',
        'frontend/src/components/PasswordReset.css'
      ];
      
      return components.every(component => fs.existsSync(component));
    });

    // Test 2: CSS imports
    await this.test('CSS imports are correct', async () => {
      const forgotPasswordContent = fs.readFileSync('frontend/src/components/ForgotPassword.js', 'utf8');
      const resetPasswordContent = fs.readFileSync('frontend/src/components/ResetPassword.js', 'utf8');
      
      return forgotPasswordContent.includes('./PasswordReset.css') &&
             resetPasswordContent.includes('./PasswordReset.css');
    });

    // Test 3: Routes are configured
    await this.test('Routes are configured', async () => {
      const appContent = fs.readFileSync('frontend/src/App.js', 'utf8');
      
      return appContent.includes('/forgot-password') &&
             appContent.includes('/reset-password') &&
             appContent.includes('ForgotPassword') &&
             appContent.includes('ResetPassword');
    });
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  const tester = new CredentialRecoveryTester();
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Floworx Credential Recovery Test Suite');
    console.log('');
    console.log('Usage: node test-credential-recovery.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h       Show this help message');
    console.log('  --frontend-only  Test only frontend components');
    console.log('  --api-only       Test only API endpoints');
    console.log('');
    console.log('Environment Variables:');
    console.log('  API_URL          Base URL for API (default: http://localhost:3001/api)');
    console.log('');
    return;
  }
  
  if (args.includes('--frontend-only')) {
    await tester.testFrontendComponents();
    tester.printResults();
    return;
  }
  
  if (args.includes('--api-only')) {
    await tester.runAllTests();
    return;
  }
  
  // Run all tests
  await tester.runAllTests();
  await tester.testFrontendComponents();
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = CredentialRecoveryTester;
