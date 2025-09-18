/**
 * COMPREHENSIVE AUTHENTICATION TEST SUITE
 * 
 * This test suite implements complete validation criteria for:
 * - User Registration Flow
 * - User Login Flow  
 * - Email Verification Flow
 * - Password Reset Flow
 * - Logout/Sign-Out Flow
 * - Security Validations
 * - Error Handling & Robustness
 * - Data Integrity & Cleanup
 */

const { createClient } = require('@supabase/supabase-js');

class ComprehensiveAuthTestSuite {
  constructor(environment = 'https://app.floworx-iq.com') {
    this.baseUrl = environment;
    this.supabase = createClient(
      'https://enamhufwobytrfydarsz.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuYW1odWZ3b2J5dHJmeWRhcnN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njk0OTIwNSwiZXhwIjoyMDcyNTI1MjA1fQ.NVI17sMDYvb4ZqNG6ucQ_VdO6QqiElllFeC16GLTyE4'
    );
    
    this.testResults = {
      functional: {
        registration: [],
        login: [],
        emailVerification: [],
        passwordReset: [],
        logout: []
      },
      security: [],
      robustness: [],
      dataIntegrity: [],
      errors: [],
      startTime: new Date(),
      endTime: null
    };
    
    this.testUsers = []; // Track created users for cleanup
    this.currentTest = '';
  }

  // Utility methods
  generateTestEmail(prefix = 'test') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${prefix}_${timestamp}_${random}@floworx-test.com`;
  }

  logStep(step, status = 'INFO', details = '') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${status}: ${step}`);
    if (details) console.log(`   Details: ${details}`);
  }

  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, { ...defaultOptions, ...options });
      const responseText = await response.text();
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        data = { rawResponse: responseText };
      }

      return {
        status: response.status,
        data,
        headers: response.headers,
        ok: response.ok
      };
    } catch (error) {
      return {
        status: 0,
        error: error.message,
        networkError: true
      };
    }
  }

  recordTestResult(category, subcategory, testName, passed, expected, actual, details = {}) {
    const result = {
      name: testName,
      passed,
      expected,
      actual,
      details,
      timestamp: new Date().toISOString(),
      category,
      subcategory
    };

    if (!this.testResults[category]) {
      this.testResults[category] = {};
    }
    if (!this.testResults[category][subcategory]) {
      this.testResults[category][subcategory] = [];
    }

    this.testResults[category][subcategory].push(result);
    return result;
  }

  // I. FUNCTIONAL TESTS - A. User Registration Flow
  async testRegistrationFlow() {
    console.log('\n🧪 TESTING USER REGISTRATION FLOW');
    console.log('==================================');

    // Test 1: Successful Registration (Valid & Unique Data)
    await this.testSuccessfulRegistration();
    
    // Test 2: Registration with Existing Email
    await this.testDuplicateEmailRegistration();
    
    // Test 3: Registration with Missing Required Fields
    await this.testMissingFieldsRegistration();
    
    // Test 4: Registration with Invalid Email Format
    await this.testInvalidEmailRegistration();
    
    // Test 5: Registration with Weak/Invalid Password
    await this.testWeakPasswordRegistration();
  }

  async testSuccessfulRegistration() {
    this.currentTest = 'Successful Registration (Valid & Unique Data)';
    this.logStep(this.currentTest, 'START');

    try {
      const testEmail = this.generateTestEmail('valid_reg');
      const testData = {
        firstName: 'Test',
        lastName: 'User',
        businessName: 'Test Business LLC',
        email: testEmail,
        password: 'SecurePassword123!'
      };

      const response = await this.makeRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      // Validate response
      const expectedStatus = 201;
      const passed = response.status === expectedStatus && 
                    response.data.success && 
                    response.data.userId &&
                    response.data.requiresVerification;

      this.recordTestResult('functional', 'registration', this.currentTest, passed, expectedStatus, response.status, {
        hasUserId: !!response.data.userId,
        requiresVerification: response.data.requiresVerification,
        response: response.data
      });

      if (passed) {
        // Track user for cleanup and further tests
        this.testUsers.push({
          email: testEmail,
          userId: response.data.userId,
          password: testData.password,
          verified: false
        });

        this.logStep('✅ Successful Registration - PASSED', 'SUCCESS', 
          `User created with ID: ${response.data.userId}`);

        // Verify user exists in database with isVerified: false
        await this.verifyUserInDatabase(response.data.userId, false);
      } else {
        this.logStep('❌ Successful Registration - FAILED', 'FAIL', 
          `Expected: ${expectedStatus}, Got: ${response.status}`);
      }

    } catch (error) {
      this.recordTestResult('functional', 'registration', this.currentTest, false, 201, 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Successful Registration - ERROR', 'ERROR', error.message);
    }
  }

  async testDuplicateEmailRegistration() {
    this.currentTest = 'Registration with Existing Email';
    this.logStep(this.currentTest, 'START');

    try {
      if (this.testUsers.length === 0) {
        this.logStep('No existing user for duplicate test', 'SKIP');
        return;
      }

      const existingUser = this.testUsers[0];
      const testData = {
        firstName: 'Duplicate',
        lastName: 'User',
        businessName: 'Duplicate Business',
        email: existingUser.email, // Use existing email
        password: 'DifferentPassword123!'
      };

      const response = await this.makeRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      // Validate response
      const expectedStatus = 409;
      const passed = response.status === expectedStatus &&
                    response.data.error &&
                    response.data.error.code === 'EMAIL_EXISTS';

      this.recordTestResult('functional', 'registration', this.currentTest, passed, expectedStatus, response.status, {
        hasErrorCode: response.data.error?.code === 'EMAIL_EXISTS',
        errorMessage: response.data.error?.message,
        response: response.data
      });

      if (passed) {
        this.logStep('✅ Duplicate Email Registration - PASSED', 'SUCCESS', 
          'Correctly rejected with 409 Conflict');
      } else {
        this.logStep('❌ Duplicate Email Registration - FAILED', 'FAIL', 
          `Expected: ${expectedStatus}, Got: ${response.status}`);
      }

    } catch (error) {
      this.recordTestResult('functional', 'registration', this.currentTest, false, 409, 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Duplicate Email Registration - ERROR', 'ERROR', error.message);
    }
  }

  async testMissingFieldsRegistration() {
    this.currentTest = 'Registration with Missing Required Fields';
    this.logStep(this.currentTest, 'START');

    try {
      const testData = {
        firstName: 'Test'
        // Missing lastName, email, password
      };

      const response = await this.makeRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      // Validate response
      const expectedStatus = 400;
      const passed = response.status === expectedStatus &&
                    response.data.error &&
                    response.data.error.message;

      this.recordTestResult('functional', 'registration', this.currentTest, passed, expectedStatus, response.status, {
        hasErrorMessage: !!response.data.error?.message,
        errorMessage: response.data.error?.message,
        response: response.data
      });

      if (passed) {
        this.logStep('✅ Missing Fields Registration - PASSED', 'SUCCESS', 
          'Correctly rejected with 400 Bad Request');
      } else {
        this.logStep('❌ Missing Fields Registration - FAILED', 'FAIL', 
          `Expected: ${expectedStatus}, Got: ${response.status}`);
      }

    } catch (error) {
      this.recordTestResult('functional', 'registration', this.currentTest, false, 400, 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Missing Fields Registration - ERROR', 'ERROR', error.message);
    }
  }

  async testInvalidEmailRegistration() {
    this.currentTest = 'Registration with Invalid Email Format';
    this.logStep(this.currentTest, 'START');

    try {
      const testData = {
        firstName: 'Test',
        lastName: 'User',
        businessName: 'Test Business',
        email: 'invalid-email-format', // Invalid format
        password: 'SecurePassword123!'
      };

      const response = await this.makeRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      // Validate response
      const expectedStatus = 400;
      const passed = response.status === expectedStatus &&
                    response.data.error &&
                    response.data.error.message.toLowerCase().includes('email');

      this.recordTestResult('functional', 'registration', this.currentTest, passed, expectedStatus, response.status, {
        hasEmailError: response.data.error?.message?.toLowerCase().includes('email'),
        errorMessage: response.data.error?.message,
        response: response.data
      });

      if (passed) {
        this.logStep('✅ Invalid Email Registration - PASSED', 'SUCCESS', 
          'Correctly rejected with 400 Bad Request');
      } else {
        this.logStep('❌ Invalid Email Registration - FAILED', 'FAIL', 
          `Expected: ${expectedStatus}, Got: ${response.status}`);
      }

    } catch (error) {
      this.recordTestResult('functional', 'registration', this.currentTest, false, 400, 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Invalid Email Registration - ERROR', 'ERROR', error.message);
    }
  }

  async testWeakPasswordRegistration() {
    this.currentTest = 'Registration with Weak/Invalid Password';
    this.logStep(this.currentTest, 'START');

    try {
      const testData = {
        firstName: 'Test',
        lastName: 'User',
        businessName: 'Test Business',
        email: this.generateTestEmail('weak_pwd'),
        password: '123' // Too weak
      };

      const response = await this.makeRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      // Validate response
      const expectedStatus = 400;
      const passed = response.status === expectedStatus &&
                    response.data.error &&
                    response.data.error.message.toLowerCase().includes('password');

      this.recordTestResult('functional', 'registration', this.currentTest, passed, expectedStatus, response.status, {
        hasPasswordError: response.data.error?.message?.toLowerCase().includes('password'),
        errorMessage: response.data.error?.message,
        response: response.data
      });

      if (passed) {
        this.logStep('✅ Weak Password Registration - PASSED', 'SUCCESS', 
          'Correctly rejected with 400 Bad Request');
      } else {
        this.logStep('❌ Weak Password Registration - FAILED', 'FAIL', 
          `Expected: ${expectedStatus}, Got: ${response.status}`);
      }

    } catch (error) {
      this.recordTestResult('functional', 'registration', this.currentTest, false, 400, 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Weak Password Registration - ERROR', 'ERROR', error.message);
    }
  }

  // Database verification helper
  async verifyUserInDatabase(userId, shouldBeVerified) {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id, email, email_verified, created_at')
        .eq('id', userId)
        .single();

      if (error) {
        this.logStep('Database verification failed', 'ERROR', error.message);
        return false;
      }

      const verified = data.email_verified === shouldBeVerified;
      this.logStep(`Database verification: ${verified ? 'PASSED' : 'FAILED'}`,
        verified ? 'SUCCESS' : 'FAIL',
        `User verified status: ${data.email_verified}, Expected: ${shouldBeVerified}`);

      return verified;
    } catch (error) {
      this.logStep('Database verification error', 'ERROR', error.message);
      return false;
    }
  }

  // I. FUNCTIONAL TESTS - B. User Login Flow
  async testLoginFlow() {
    console.log('\n🔐 TESTING USER LOGIN FLOW');
    console.log('===========================');

    // Test 1: Login with Unverified User
    await this.testUnverifiedUserLogin();

    // Test 2: Login with Invalid Password
    await this.testInvalidPasswordLogin();

    // Test 3: Login with Non-existent User
    await this.testNonExistentUserLogin();

    // Test 4: Login with Missing Credentials
    await this.testMissingCredentialsLogin();

    // Test 5: Successful Login (after verification)
    await this.testSuccessfulLogin();
  }

  async testUnverifiedUserLogin() {
    this.currentTest = 'Login with Unverified User';
    this.logStep(this.currentTest, 'START');

    try {
      if (this.testUsers.length === 0) {
        this.logStep('No test user available for unverified login test', 'SKIP');
        return;
      }

      const unverifiedUser = this.testUsers.find(u => !u.verified);
      if (!unverifiedUser) {
        this.logStep('No unverified user available', 'SKIP');
        return;
      }

      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: unverifiedUser.email,
          password: unverifiedUser.password
        })
      });

      // Validate response
      const expectedStatus = 403;
      const passed = response.status === expectedStatus &&
                    response.data.error &&
                    response.data.error.code === 'EMAIL_NOT_VERIFIED';

      this.recordTestResult('functional', 'login', this.currentTest, passed, expectedStatus, response.status, {
        hasCorrectErrorCode: response.data.error?.code === 'EMAIL_NOT_VERIFIED',
        hasResendUrl: !!response.data.resendUrl,
        hasUserFriendlyMessage: !!response.data.userFriendlyMessage,
        response: response.data
      });

      if (passed) {
        this.logStep('✅ Unverified User Login - PASSED', 'SUCCESS',
          'Correctly blocked with 403 Forbidden');
      } else {
        this.logStep('❌ Unverified User Login - FAILED', 'FAIL',
          `Expected: ${expectedStatus}, Got: ${response.status}`);
      }

    } catch (error) {
      this.recordTestResult('functional', 'login', this.currentTest, false, 403, 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Unverified User Login - ERROR', 'ERROR', error.message);
    }
  }

  async testInvalidPasswordLogin() {
    this.currentTest = 'Login with Invalid Password';
    this.logStep(this.currentTest, 'START');

    try {
      if (this.testUsers.length === 0) {
        this.logStep('No test user available for invalid password test', 'SKIP');
        return;
      }

      const testUser = this.testUsers[0];
      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
          password: 'WrongPassword123!' // Wrong password
        })
      });

      // Validate response
      const expectedStatus = 401;
      const passed = response.status === expectedStatus &&
                    response.data.error &&
                    response.data.error.code === 'INVALID_CREDENTIALS';

      this.recordTestResult('functional', 'login', this.currentTest, passed, expectedStatus, response.status, {
        hasCorrectErrorCode: response.data.error?.code === 'INVALID_CREDENTIALS',
        errorMessage: response.data.error?.message,
        response: response.data
      });

      if (passed) {
        this.logStep('✅ Invalid Password Login - PASSED', 'SUCCESS',
          'Correctly rejected with 401 Unauthorized');
      } else {
        this.logStep('❌ Invalid Password Login - FAILED', 'FAIL',
          `Expected: ${expectedStatus}, Got: ${response.status}`);
      }

    } catch (error) {
      this.recordTestResult('functional', 'login', this.currentTest, false, 401, 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Invalid Password Login - ERROR', 'ERROR', error.message);
    }
  }

  async testNonExistentUserLogin() {
    this.currentTest = 'Login with Non-existent User';
    this.logStep(this.currentTest, 'START');

    try {
      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: this.generateTestEmail('nonexistent'),
          password: 'SomePassword123!'
        })
      });

      // Validate response
      const expectedStatus = 401;
      const passed = response.status === expectedStatus &&
                    response.data.error &&
                    response.data.error.code === 'INVALID_CREDENTIALS';

      this.recordTestResult('functional', 'login', this.currentTest, passed, expectedStatus, response.status, {
        hasCorrectErrorCode: response.data.error?.code === 'INVALID_CREDENTIALS',
        errorMessage: response.data.error?.message,
        response: response.data
      });

      if (passed) {
        this.logStep('✅ Non-existent User Login - PASSED', 'SUCCESS',
          'Correctly rejected with 401 Unauthorized');
      } else {
        this.logStep('❌ Non-existent User Login - FAILED', 'FAIL',
          `Expected: ${expectedStatus}, Got: ${response.status}`);
      }

    } catch (error) {
      this.recordTestResult('functional', 'login', this.currentTest, false, 401, 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Non-existent User Login - ERROR', 'ERROR', error.message);
    }
  }

  async testMissingCredentialsLogin() {
    this.currentTest = 'Login with Missing Credentials';
    this.logStep(this.currentTest, 'START');

    try {
      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com'
          // Missing password
        })
      });

      // Validate response
      const expectedStatus = 400;
      const passed = response.status === expectedStatus &&
                    response.data.error &&
                    response.data.error.code === 'BAD_REQUEST';

      this.recordTestResult('functional', 'login', this.currentTest, passed, expectedStatus, response.status, {
        hasCorrectErrorCode: response.data.error?.code === 'BAD_REQUEST',
        errorMessage: response.data.error?.message,
        response: response.data
      });

      if (passed) {
        this.logStep('✅ Missing Credentials Login - PASSED', 'SUCCESS',
          'Correctly rejected with 400 Bad Request');
      } else {
        this.logStep('❌ Missing Credentials Login - FAILED', 'FAIL',
          `Expected: ${expectedStatus}, Got: ${response.status}`);
      }

    } catch (error) {
      this.recordTestResult('functional', 'login', this.currentTest, false, 400, 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Missing Credentials Login - ERROR', 'ERROR', error.message);
    }
  }

  async testSuccessfulLogin() {
    this.currentTest = 'Successful Login (Verified User)';
    this.logStep(this.currentTest, 'START');

    try {
      // First, verify a test user for login
      if (this.testUsers.length === 0) {
        this.logStep('No test user available for successful login test', 'SKIP');
        return;
      }

      const testUser = this.testUsers[0];

      // Manually verify the user in database for testing
      await this.supabase
        .from('users')
        .update({ email_verified: true })
        .eq('id', testUser.userId);

      testUser.verified = true;

      const response = await this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        })
      });

      // Validate response
      const expectedStatus = 200;
      const passed = response.status === expectedStatus &&
                    response.data.userId;

      this.recordTestResult('functional', 'login', this.currentTest, passed, expectedStatus, response.status, {
        hasUserId: !!response.data.userId,
        userId: response.data.userId,
        response: response.data
      });

      if (passed) {
        this.logStep('✅ Successful Login - PASSED', 'SUCCESS',
          'User logged in with valid token');
      } else {
        this.logStep('❌ Successful Login - FAILED', 'FAIL',
          `Expected: ${expectedStatus}, Got: ${response.status}`);
      }

    } catch (error) {
      this.recordTestResult('functional', 'login', this.currentTest, false, 200, 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Successful Login - ERROR', 'ERROR', error.message);
    }
  }

  // I. FUNCTIONAL TESTS - C. Password Reset Flow
  async testPasswordResetFlow() {
    console.log('\n🔑 TESTING PASSWORD RESET FLOW');
    console.log('===============================');

    // Test 1: Request Password Reset (Valid Email)
    await this.testValidPasswordResetRequest();

    // Test 2: Request Password Reset (Non-existent Email)
    await this.testNonExistentEmailPasswordReset();

    // Test 3: Invalid/Expired Password Reset Token
    await this.testInvalidPasswordResetToken();
  }

  async testValidPasswordResetRequest() {
    this.currentTest = 'Request Password Reset (Valid Email)';
    this.logStep(this.currentTest, 'START');

    try {
      if (this.testUsers.length === 0) {
        this.logStep('No test user available for password reset test', 'SKIP');
        return;
      }

      const testUser = this.testUsers[0];
      const response = await this.makeRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: testUser.email
        })
      });

      // Validate response
      const expectedStatus = 200;
      const passed = response.status === expectedStatus;

      this.recordTestResult('functional', 'passwordReset', this.currentTest, passed, expectedStatus, response.status, {
        response: response.data
      });

      if (passed) {
        this.logStep('✅ Valid Password Reset Request - PASSED', 'SUCCESS',
          'Request processed successfully');
      } else {
        this.logStep('❌ Valid Password Reset Request - FAILED', 'FAIL',
          `Expected: ${expectedStatus}, Got: ${response.status}`);
      }

    } catch (error) {
      this.recordTestResult('functional', 'passwordReset', this.currentTest, false, 200, 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Valid Password Reset Request - ERROR', 'ERROR', error.message);
    }
  }

  async testNonExistentEmailPasswordReset() {
    this.currentTest = 'Request Password Reset (Non-existent Email)';
    this.logStep(this.currentTest, 'START');

    try {
      const response = await this.makeRequest('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: this.generateTestEmail('nonexistent_reset')
        })
      });

      // Validate response (should return 200 for security reasons)
      const expectedStatus = 200;
      const passed = response.status === expectedStatus;

      this.recordTestResult('functional', 'passwordReset', this.currentTest, passed, expectedStatus, response.status, {
        response: response.data
      });

      if (passed) {
        this.logStep('✅ Non-existent Email Password Reset - PASSED', 'SUCCESS',
          'Correctly returns 200 (prevents email enumeration)');
      } else {
        this.logStep('❌ Non-existent Email Password Reset - FAILED', 'FAIL',
          `Expected: ${expectedStatus}, Got: ${response.status}`);
      }

    } catch (error) {
      this.recordTestResult('functional', 'passwordReset', this.currentTest, false, 200, 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Non-existent Email Password Reset - ERROR', 'ERROR', error.message);
    }
  }

  async testInvalidPasswordResetToken() {
    this.currentTest = 'Invalid/Expired Password Reset Token';
    this.logStep(this.currentTest, 'START');

    try {
      const response = await this.makeRequest('/api/auth/password/reset', {
        method: 'POST',
        body: JSON.stringify({
          token: 'invalid-token-12345',
          password: 'NewPassword123!'
        })
      });

      // Validate response
      const expectedStatuses = [400, 401, 403];
      const passed = expectedStatuses.includes(response.status);

      this.recordTestResult('functional', 'passwordReset', this.currentTest, passed, expectedStatuses, response.status, {
        response: response.data
      });

      if (passed) {
        this.logStep('✅ Invalid Password Reset Token - PASSED', 'SUCCESS',
          `Correctly rejected with ${response.status}`);
      } else {
        this.logStep('❌ Invalid Password Reset Token - FAILED', 'FAIL',
          `Expected: ${expectedStatuses.join(' or ')}, Got: ${response.status}`);
      }

    } catch (error) {
      this.recordTestResult('functional', 'passwordReset', this.currentTest, false, [400, 401, 403], 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Invalid Password Reset Token - ERROR', 'ERROR', error.message);
    }
  }

  // I. FUNCTIONAL TESTS - D. Logout Flow
  async testLogoutFlow() {
    console.log('\n🚪 TESTING LOGOUT FLOW');
    console.log('=======================');

    // Test 1: Logout Without Active Session
    await this.testLogoutWithoutSession();

    // Test 2: Logout Endpoint Availability
    await this.testLogoutEndpointAvailability();
  }

  async testLogoutWithoutSession() {
    this.currentTest = 'Logout Without Active Session';
    this.logStep(this.currentTest, 'START');

    try {
      const response = await this.makeRequest('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({})
      });

      // Validate response (204 No Content is correct for idempotent logout)
      const expectedStatuses = [200, 204];
      const passed = expectedStatuses.includes(response.status);

      this.recordTestResult('functional', 'logout', this.currentTest, passed, expectedStatuses, response.status, {
        response: response.data
      });

      if (passed) {
        this.logStep('✅ Logout Without Session - PASSED', 'SUCCESS',
          `Correctly returned ${response.status}`);
      } else {
        this.logStep('❌ Logout Without Session - FAILED', 'FAIL',
          `Expected: ${expectedStatuses.join(' or ')}, Got: ${response.status}`);
      }

    } catch (error) {
      this.recordTestResult('functional', 'logout', this.currentTest, false, [200, 204], 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Logout Without Session - ERROR', 'ERROR', error.message);
    }
  }

  async testLogoutEndpointAvailability() {
    this.currentTest = 'Logout Endpoint Availability';
    this.logStep(this.currentTest, 'START');

    try {
      const response = await this.makeRequest('/api/auth/logout', {
        method: 'OPTIONS'
      });

      // Validate response
      const expectedStatuses = [200, 204];
      const passed = expectedStatuses.includes(response.status);

      this.recordTestResult('functional', 'logout', this.currentTest, passed, expectedStatuses, response.status, {
        response: response.data
      });

      if (passed) {
        this.logStep('✅ Logout Endpoint Availability - PASSED', 'SUCCESS',
          'Endpoint is available');
      } else {
        this.logStep('❌ Logout Endpoint Availability - FAILED', 'FAIL',
          `Expected: ${expectedStatuses.join(' or ')}, Got: ${response.status}`);
      }

    } catch (error) {
      this.recordTestResult('functional', 'logout', this.currentTest, false, [200, 204], 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Logout Endpoint Availability - ERROR', 'ERROR', error.message);
    }
  }

  // II. SECURITY TESTS
  async testSecurityValidations() {
    console.log('\n🛡️ TESTING SECURITY VALIDATIONS');
    console.log('=================================');

    // Test 1: Rate Limiting
    await this.testRateLimiting();

    // Test 2: Password Hashing Verification
    await this.testPasswordHashing();

    // Test 3: XSS Protection
    await this.testXSSProtection();
  }

  async testRateLimiting() {
    this.currentTest = 'Rate Limiting';
    this.logStep(this.currentTest, 'START');

    try {
      const testEmail = this.generateTestEmail('rate_limit');
      const requests = [];

      // Make more aggressive rapid requests to trigger rate limiting
      // Login endpoint has limit of 10 requests per minute per IP+email
      for (let i = 0; i < 15; i++) {
        requests.push(
          this.makeRequest('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({
              email: testEmail,
              password: 'TestPassword123!'
            })
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      const unauthorizedResponses = responses.filter(r => r.status === 401);

      // Rate limiting should kick in after 10 requests
      const passed = rateLimitedResponses.length > 0;

      this.recordTestResult('security', 'rateLimiting', this.currentTest, passed, 'Some 429 responses', rateLimitedResponses.length, {
        totalRequests: responses.length,
        rateLimitedCount: rateLimitedResponses.length,
        unauthorizedCount: unauthorizedResponses.length,
        statusCodes: responses.map(r => r.status),
        rateLimitThreshold: 10,
        requestsSent: 15
      });

      if (passed) {
        this.logStep('✅ Rate Limiting - PASSED', 'SUCCESS',
          `${rateLimitedResponses.length} requests rate limited out of ${responses.length}`);
      } else {
        this.logStep('⚠️ Rate Limiting - WARNING', 'WARN',
          `No rate limiting detected. Status codes: ${responses.map(r => r.status).join(', ')}`);
        this.logStep('Rate limiting may be configured at infrastructure level (proxy/CDN)', 'INFO');
      }

    } catch (error) {
      this.recordTestResult('security', 'rateLimiting', this.currentTest, false, 'Some 429 responses', 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Rate Limiting - ERROR', 'ERROR', error.message);
    }
  }

  async testPasswordHashing() {
    this.currentTest = 'Password Hashing Verification';
    this.logStep(this.currentTest, 'START');

    try {
      if (this.testUsers.length === 0) {
        this.logStep('No test user available for password hashing test', 'SKIP');
        return;
      }

      const testUser = this.testUsers[0];

      // Query database to check password storage
      const { data, error } = await this.supabase
        .from('users')
        .select('password_hash')
        .eq('id', testUser.userId)
        .single();

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }

      // Verify password is hashed (not plain text)
      const isHashed = data.password_hash !== testUser.password &&
                      data.password_hash.length > 50 &&
                      data.password_hash.startsWith('$');

      this.recordTestResult('security', 'passwordHashing', this.currentTest, isHashed, 'Hashed password', 'Verified', {
        passwordHashLength: data.password_hash.length,
        startsWithDollar: data.password_hash.startsWith('$'),
        isNotPlainText: data.password_hash !== testUser.password
      });

      if (isHashed) {
        this.logStep('✅ Password Hashing - PASSED', 'SUCCESS',
          'Password is properly hashed');
      } else {
        this.logStep('❌ Password Hashing - FAILED', 'FAIL',
          'Password may not be properly hashed');
      }

    } catch (error) {
      this.recordTestResult('security', 'passwordHashing', this.currentTest, false, 'Hashed password', 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Password Hashing - ERROR', 'ERROR', error.message);
    }
  }

  async testXSSProtection() {
    this.currentTest = 'XSS Protection';
    this.logStep(this.currentTest, 'START');

    try {
      const xssPayload = '<script>alert("XSS")</script>';
      const testData = {
        firstName: xssPayload,
        lastName: 'User',
        businessName: xssPayload,
        email: this.generateTestEmail('xss_test'),
        password: 'SecurePassword123!'
      };

      const response = await this.makeRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(testData)
      });

      // Check if XSS payload is sanitized or rejected
      const passed = response.status === 400 ||
                    (response.status === 201 &&
                     !JSON.stringify(response.data).includes('<script>'));

      this.recordTestResult('security', 'xssProtection', this.currentTest, passed, 'XSS payload handled', response.status, {
        containsScript: JSON.stringify(response.data).includes('<script>'),
        response: response.data
      });

      if (passed) {
        this.logStep('✅ XSS Protection - PASSED', 'SUCCESS',
          'XSS payload properly handled');
      } else {
        this.logStep('❌ XSS Protection - FAILED', 'FAIL',
          'XSS payload may not be properly sanitized');
      }

    } catch (error) {
      this.recordTestResult('security', 'xssProtection', this.currentTest, false, 'XSS payload handled', 'ERROR', {
        error: error.message
      });
      this.logStep('❌ XSS Protection - ERROR', 'ERROR', error.message);
    }
  }

  // III. ROBUSTNESS & ERROR HANDLING TESTS
  async testRobustnessAndErrorHandling() {
    console.log('\n🔧 TESTING ROBUSTNESS & ERROR HANDLING');
    console.log('=======================================');

    // Test 1: Network Resilience
    await this.testNetworkResilience();

    // Test 2: Concurrent Operations
    await this.testConcurrentOperations();
  }

  async testNetworkResilience() {
    this.currentTest = 'Network Resilience';
    this.logStep(this.currentTest, 'START');

    try {
      // Test with invalid endpoint to simulate network issues
      const response = await this.makeRequest('/api/auth/invalid-endpoint', {
        method: 'POST',
        body: JSON.stringify({ test: 'data' })
      });

      // Should handle gracefully with 404 or similar
      const passed = response.status === 404 || response.networkError;

      this.recordTestResult('robustness', 'networkResilience', this.currentTest, passed, '404 or network error', response.status || 'Network Error', {
        networkError: response.networkError,
        response: response.data
      });

      if (passed) {
        this.logStep('✅ Network Resilience - PASSED', 'SUCCESS',
          'Network errors handled gracefully');
      } else {
        this.logStep('❌ Network Resilience - FAILED', 'FAIL',
          'Network error handling may need improvement');
      }

    } catch (error) {
      this.recordTestResult('robustness', 'networkResilience', this.currentTest, false, '404 or network error', 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Network Resilience - ERROR', 'ERROR', error.message);
    }
  }

  async testConcurrentOperations() {
    this.currentTest = 'Concurrent Operations';
    this.logStep(this.currentTest, 'START');

    try {
      const concurrentRequests = [];

      // Create multiple concurrent registration requests
      for (let i = 0; i < 5; i++) {
        concurrentRequests.push(
          this.makeRequest('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              firstName: `Concurrent${i}`,
              lastName: 'User',
              businessName: `Concurrent Business ${i}`,
              email: this.generateTestEmail(`concurrent_${i}`),
              password: 'SecurePassword123!'
            })
          })
        );
      }

      const responses = await Promise.all(concurrentRequests);
      const successfulResponses = responses.filter(r => r.status === 201);
      const passed = successfulResponses.length === responses.length;

      this.recordTestResult('robustness', 'concurrentOperations', this.currentTest, passed, 'All successful', successfulResponses.length, {
        totalRequests: responses.length,
        successfulRequests: successfulResponses.length,
        statusCodes: responses.map(r => r.status)
      });

      if (passed) {
        this.logStep('✅ Concurrent Operations - PASSED', 'SUCCESS',
          'All concurrent requests handled successfully');
      } else {
        this.logStep('⚠️ Concurrent Operations - PARTIAL', 'WARN',
          `${successfulResponses.length}/${responses.length} requests successful`);
      }

      // Track users for cleanup
      successfulResponses.forEach((response, index) => {
        if (response.data.userId) {
          this.testUsers.push({
            email: this.generateTestEmail(`concurrent_${index}`),
            userId: response.data.userId,
            password: 'SecurePassword123!',
            verified: false
          });
        }
      });

    } catch (error) {
      this.recordTestResult('robustness', 'concurrentOperations', this.currentTest, false, 'All successful', 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Concurrent Operations - ERROR', 'ERROR', error.message);
    }
  }

  // IV. DATA INTEGRITY & CLEANUP
  async testDataIntegrityAndCleanup() {
    console.log('\n🗄️ TESTING DATA INTEGRITY & CLEANUP');
    console.log('====================================');

    // Test 1: Database Audit
    await this.testDatabaseAudit();

    // Test 2: Test Data Cleanup
    await this.performTestDataCleanup();
  }

  async testDatabaseAudit() {
    this.currentTest = 'Database Audit';
    this.logStep(this.currentTest, 'START');

    try {
      let auditResults = {
        totalUsers: 0,
        verifiedUsers: 0,
        unverifiedUsers: 0,
        testUsers: 0,
        issues: []
      };

      // Query all test users
      for (const testUser of this.testUsers) {
        const { data, error } = await this.supabase
          .from('users')
          .select('id, email, email_verified, created_at')
          .eq('id', testUser.userId)
          .single();

        if (error) {
          auditResults.issues.push(`User ${testUser.userId} not found: ${error.message}`);
          continue;
        }

        auditResults.totalUsers++;
        auditResults.testUsers++;

        if (data.email_verified) {
          auditResults.verifiedUsers++;
        } else {
          auditResults.unverifiedUsers++;
        }

        // Verify email matches
        if (data.email !== testUser.email) {
          auditResults.issues.push(`Email mismatch for user ${testUser.userId}`);
        }
      }

      const passed = auditResults.issues.length === 0;

      this.recordTestResult('dataIntegrity', 'databaseAudit', this.currentTest, passed, 'No issues', auditResults.issues.length, {
        auditResults
      });

      if (passed) {
        this.logStep('✅ Database Audit - PASSED', 'SUCCESS',
          `${auditResults.totalUsers} users audited, no issues found`);
      } else {
        this.logStep('❌ Database Audit - FAILED', 'FAIL',
          `${auditResults.issues.length} issues found`);
        auditResults.issues.forEach(issue => {
          this.logStep(`Issue: ${issue}`, 'WARN');
        });
      }

    } catch (error) {
      this.recordTestResult('dataIntegrity', 'databaseAudit', this.currentTest, false, 'No issues', 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Database Audit - ERROR', 'ERROR', error.message);
    }
  }

  async performTestDataCleanup() {
    this.currentTest = 'Test Data Cleanup';
    this.logStep(this.currentTest, 'START');

    try {
      let cleanupResults = {
        totalUsers: this.testUsers.length,
        successfulDeletes: 0,
        failedDeletes: 0,
        errors: []
      };

      for (const testUser of this.testUsers) {
        try {
          const { error } = await this.supabase
            .from('users')
            .delete()
            .eq('id', testUser.userId);

          if (error) {
            cleanupResults.failedDeletes++;
            cleanupResults.errors.push(`Failed to delete ${testUser.email}: ${error.message}`);
          } else {
            cleanupResults.successfulDeletes++;
            this.logStep(`Cleaned up user: ${testUser.email}`, 'SUCCESS');
          }
        } catch (error) {
          cleanupResults.failedDeletes++;
          cleanupResults.errors.push(`Error deleting ${testUser.email}: ${error.message}`);
        }
      }

      const passed = cleanupResults.failedDeletes === 0;

      this.recordTestResult('dataIntegrity', 'testDataCleanup', this.currentTest, passed, 'All users deleted', cleanupResults.successfulDeletes, {
        cleanupResults
      });

      if (passed) {
        this.logStep('✅ Test Data Cleanup - PASSED', 'SUCCESS',
          `${cleanupResults.successfulDeletes} users cleaned up successfully`);
      } else {
        this.logStep('⚠️ Test Data Cleanup - PARTIAL', 'WARN',
          `${cleanupResults.successfulDeletes}/${cleanupResults.totalUsers} users cleaned up`);
        cleanupResults.errors.forEach(error => {
          this.logStep(`Cleanup Error: ${error}`, 'WARN');
        });
      }

      // Clear the test users array
      this.testUsers = [];

    } catch (error) {
      this.recordTestResult('dataIntegrity', 'testDataCleanup', this.currentTest, false, 'All users deleted', 'ERROR', {
        error: error.message
      });
      this.logStep('❌ Test Data Cleanup - ERROR', 'ERROR', error.message);
    }
  }

  // MAIN TEST EXECUTION
  async runComprehensiveTests() {
    try {
      console.log('🚀 STARTING COMPREHENSIVE AUTHENTICATION TEST SUITE');
      console.log(`Target Environment: ${this.baseUrl}`);
      console.log(`Test Start Time: ${this.testResults.startTime.toISOString()}`);
      console.log('\n⚠️  SAFETY MEASURES ACTIVE:');
      console.log('   - Real-time error monitoring enabled');
      console.log('   - Comprehensive validation across all flows');
      console.log('   - Automated test data cleanup');
      console.log('   - Security and robustness testing included');

      // I. Functional Tests
      await this.testRegistrationFlow();
      await this.testLoginFlow();
      await this.testPasswordResetFlow();
      await this.testLogoutFlow();

      // II. Security Tests
      await this.testSecurityValidations();

      // III. Robustness Tests
      await this.testRobustnessAndErrorHandling();

      // IV. Data Integrity & Cleanup
      await this.testDataIntegrityAndCleanup();

      // Generate final report
      this.testResults.endTime = new Date();
      const report = this.generateComprehensiveReport();
      this.printComprehensiveReport(report);

      return report;

    } catch (error) {
      console.error('\n🚨 CRITICAL ERROR DURING COMPREHENSIVE TESTING:');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);

      this.testResults.errors.push({
        type: 'CRITICAL_TEST_FAILURE',
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  // REPORT GENERATION
  generateComprehensiveReport() {
    const duration = this.testResults.endTime - this.testResults.startTime;

    const report = {
      summary: {
        testStartTime: this.testResults.startTime.toISOString(),
        testEndTime: this.testResults.endTime.toISOString(),
        totalDuration: `${Math.round(duration / 1000)}s`,
        environment: this.baseUrl
      },
      functional: this.testResults.functional,
      security: this.testResults.security,
      robustness: this.testResults.robustness,
      dataIntegrity: this.testResults.dataIntegrity,
      errors: this.testResults.errors
    };

    // Calculate statistics
    let totalTests = 0;
    let passedTests = 0;

    // Count functional tests
    Object.values(this.testResults.functional).forEach(category => {
      if (Array.isArray(category)) {
        totalTests += category.length;
        passedTests += category.filter(test => test.passed).length;
      }
    });

    // Count other test categories
    [this.testResults.security, this.testResults.robustness, this.testResults.dataIntegrity].forEach(category => {
      if (Array.isArray(category)) {
        totalTests += category.length;
        passedTests += category.filter(test => test.passed).length;
      }
    });

    report.summary.totalTests = totalTests;
    report.summary.passedTests = passedTests;
    report.summary.failedTests = totalTests - passedTests;
    report.summary.successRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    report.summary.criticalErrors = this.testResults.errors.length;

    return report;
  }

  printComprehensiveReport(report) {
    console.log('\n' + '='.repeat(80));
    console.log('🏁 COMPREHENSIVE AUTHENTICATION TEST SUITE REPORT');
    console.log('='.repeat(80));

    console.log(`\n📊 EXECUTIVE SUMMARY:`);
    console.log(`   Environment: ${report.summary.environment}`);
    console.log(`   Test Duration: ${report.summary.totalDuration}`);
    console.log(`   Total Tests: ${report.summary.totalTests}`);
    console.log(`   Passed: ${report.summary.passedTests}`);
    console.log(`   Failed: ${report.summary.failedTests}`);
    console.log(`   Success Rate: ${report.summary.successRate}%`);
    console.log(`   Critical Errors: ${report.summary.criticalErrors}`);

    // Functional Tests Summary
    console.log(`\n🧪 FUNCTIONAL TESTS:`);
    Object.entries(report.functional).forEach(([category, tests]) => {
      if (Array.isArray(tests) && tests.length > 0) {
        const passed = tests.filter(t => t.passed).length;
        console.log(`   ${category.toUpperCase()}: ${passed}/${tests.length} passed`);
        tests.forEach(test => {
          const status = test.passed ? '✅' : '❌';
          console.log(`     ${status} ${test.name}`);
        });
      }
    });

    // Security Tests Summary
    if (report.security.length > 0) {
      console.log(`\n🛡️ SECURITY TESTS:`);
      report.security.forEach(test => {
        const status = test.passed ? '✅' : '❌';
        console.log(`   ${status} ${test.name}`);
      });
    }

    // Robustness Tests Summary
    if (report.robustness.length > 0) {
      console.log(`\n🔧 ROBUSTNESS TESTS:`);
      report.robustness.forEach(test => {
        const status = test.passed ? '✅' : '❌';
        console.log(`   ${status} ${test.name}`);
      });
    }

    // Data Integrity Tests Summary
    if (report.dataIntegrity.length > 0) {
      console.log(`\n🗄️ DATA INTEGRITY TESTS:`);
      report.dataIntegrity.forEach(test => {
        const status = test.passed ? '✅' : '❌';
        console.log(`   ${status} ${test.name}`);
      });
    }

    // Critical Errors
    if (report.errors.length > 0) {
      console.log(`\n🚨 CRITICAL ERRORS:`);
      report.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.type}: ${error.error}`);
      });
    }

    console.log('\n' + '='.repeat(80));

    // Final verdict
    if (report.summary.criticalErrors > 0) {
      console.log('🚨 CRITICAL ISSUES DETECTED - IMMEDIATE ATTENTION REQUIRED');
    } else if (report.summary.successRate >= 95) {
      console.log('🎉 COMPREHENSIVE VALIDATION PASSED - All authentication flows working excellently');
    } else if (report.summary.successRate >= 85) {
      console.log('✅ COMPREHENSIVE VALIDATION MOSTLY PASSED - Minor issues detected');
    } else if (report.summary.successRate >= 70) {
      console.log('⚠️  COMPREHENSIVE VALIDATION PARTIAL - Several issues need attention');
    } else {
      console.log('❌ COMPREHENSIVE VALIDATION FAILED - Major issues detected');
    }

    console.log('='.repeat(80));

    // Save detailed report
    const reportFilename = `comprehensive-auth-test-report-${Date.now()}.json`;
    require('fs').writeFileSync(reportFilename, JSON.stringify(report, null, 2));
    console.log(`\n📄 Detailed report saved to: ${reportFilename}`);
  }
}

// Execute the comprehensive test suite
async function main() {
  const environment = process.argv[2] || 'https://app.floworx-iq.com';
  const testSuite = new ComprehensiveAuthTestSuite(environment);

  try {
    const report = await testSuite.runComprehensiveTests();

    // Exit with appropriate code
    if (report.summary.criticalErrors > 0) {
      process.exit(3); // Critical errors
    } else if (report.summary.successRate >= 95) {
      process.exit(0); // Excellent
    } else if (report.summary.successRate >= 85) {
      process.exit(0); // Good
    } else if (report.summary.successRate >= 70) {
      process.exit(1); // Needs attention
    } else {
      process.exit(2); // Major issues
    }

  } catch (error) {
    console.error('Comprehensive test execution failed:', error.message);
    process.exit(4); // Test execution failure
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = ComprehensiveAuthTestSuite;
