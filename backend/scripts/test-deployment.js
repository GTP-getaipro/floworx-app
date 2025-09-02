#!/usr/bin/env node

/**
 * Local Deployment Testing Script
 * Tests error handling and validation in local environment
 */

const axios = require('axios');
// const colors = require('colors'); // Unused - removed

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5001';
const TIMEOUT = 10000;

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const results = [];

// Utility functions
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  switch (type) {
  case 'success':
    console.log(`[${timestamp}] ✅ ${message}`.green);
    break;
  case 'error':
    console.log(`[${timestamp}] ❌ ${message}`.red);
    break;
  case 'warning':
    console.log(`[${timestamp}] ⚠️  ${message}`.yellow);
    break;
  case 'info':
  default:
    console.log(`[${timestamp}] ℹ️  ${message}`.blue);
    break;
  }
};

const runTest = async (testName, testFunction) => {
  totalTests++;
  try {
    log(`Running: ${testName}`, 'info');
    await testFunction();
    passedTests++;
    results.push({ name: testName, status: 'PASS', error: null });
    log(`PASSED: ${testName}`, 'success');
  } catch (error) {
    failedTests++;
    results.push({ name: testName, status: 'FAIL', error: error.message });
    log(`FAILED: ${testName} - ${error.message}`, 'error');
  }
};

// Test functions
const testServerHealth = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/health`, { timeout: TIMEOUT });
    if (response.status !== 200) {
      throw new Error(`Server health check failed: ${response.status}`);
    }
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('Server is not running. Please start the server first.');
    }
    throw error;
  }
};

const testValidRegistration = async () => {
  const testData = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
    firstName: 'John',
    lastName: 'Doe',
    companyName: 'Test Company Inc.'
  };

  const response = await axios.post(`${BASE_URL}/api/auth/register`, testData, { timeout: TIMEOUT });

  if (![201, 409].includes(response.status)) {
    throw new Error(`Unexpected status: ${response.status}`);
  }

  if (response.status === 409) {
    // User already exists - check error format
    const { data } = response;
    if (!data.success || !data.error || !data.error.type) {
      throw new Error('Error response format is incorrect');
    }
  }
};

const testInvalidEmail = async () => {
  const testData = {
    email: 'invalid-email',
    password: 'TestPass123!',
    firstName: 'John',
    lastName: 'Doe',
    companyName: 'Test Company'
  };

  try {
    const response = await axios.post(`${BASE_URL}/api/auth/register`, testData, { timeout: TIMEOUT });
    if (response.status !== 400) {
      throw new Error(`Expected 400, got ${response.status}`);
    }
  } catch (error) {
    if (error.response && error.response.status === 400) {
      const { data } = error.response;
      if (data.error?.type !== 'VALIDATION_ERROR') {
        throw new Error('Validation error type incorrect');
      }
      if (!Array.isArray(data.error.details)) {
        throw new Error('Validation details should be an array');
      }
      return; // Test passed
    }
    throw error;
  }
};

const testWeakPassword = async () => {
  const testData = {
    email: 'test@example.com',
    password: '123',
    firstName: 'John',
    lastName: 'Doe',
    companyName: 'Test Company'
  };

  try {
    await axios.post(`${BASE_URL}/api/auth/register`, testData, { timeout: TIMEOUT });
    throw new Error('Weak password should be rejected');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      const { data } = error.response;
      const hasPasswordError = data.error?.details?.some(
        d => d.field === 'password' && d.message.includes('Password must be between 8 and 128 characters')
      );
      if (!hasPasswordError) {
        throw new Error('Password validation error not found');
      }
      return; // Test passed
    }
    throw error;
  }
};

const testDisposableEmail = async () => {
  const testData = {
    email: 'test@tempmail.org',
    password: 'TestPass123!',
    firstName: 'John',
    lastName: 'Doe',
    companyName: 'Test Company'
  };

  try {
    await axios.post(`${BASE_URL}/api/auth/register`, testData, { timeout: TIMEOUT });
    throw new Error('Disposable email should be rejected');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      const { data } = error.response;
      const hasDisposableError = data.error?.details?.some(d =>
        d.message.includes('Disposable email addresses are not allowed')
      );
      if (!hasDisposableError) {
        throw new Error('Disposable email validation error not found');
      }
      return; // Test passed
    }
    throw error;
  }
};

const testXSSProtection = async () => {
  const testData = {
    email: 'test@example.com',
    password: 'TestPass123!',
    firstName: '<script>alert("xss")</script>John',
    lastName: 'Doe<img src=x onerror=alert(1)>',
    companyName: 'Test Company'
  };

  const response = await axios.post(`${BASE_URL}/api/auth/register`, testData, {
    timeout: TIMEOUT,
    validateStatus: () => true // Accept any status
  });

  if (response.status === 201) {
    // Check if XSS was sanitized
    if (response.data.user.firstName.includes('<script>') || response.data.user.lastName.includes('<img')) {
      throw new Error('XSS content not sanitized');
    }
  } else if (response.status === 400) {
    // XSS rejected by validation - also acceptable
    if (response.data.error?.type !== 'VALIDATION_ERROR') {
      throw new Error('Expected validation error for XSS content');
    }
  } else {
    throw new Error(`Unexpected status for XSS test: ${response.status}`);
  }
};

const testSQLInjection = async () => {
  const testData = {
    email: "admin@example.com'; DROP TABLE users; --",
    password: "' OR '1'='1",
    firstName: 'John',
    lastName: 'Doe',
    companyName: 'Test Company'
  };

  try {
    await axios.post(`${BASE_URL}/api/auth/register`, testData, { timeout: TIMEOUT });
    throw new Error('SQL injection should be rejected');
  } catch (error) {
    if (error.response && error.response.status === 400) {
      const { data } = error.response;
      if (data.error?.type !== 'VALIDATION_ERROR') {
        throw new Error('Expected validation error for SQL injection');
      }
      return; // Test passed
    }
    throw error;
  }
};

const test404Handling = async () => {
  try {
    await axios.get(`${BASE_URL}/api/auth/non-existent-route`, { timeout: TIMEOUT });
    throw new Error('404 route should not exist');
  } catch (error) {
    if (error.response && error.response.status === 404) {
      const { data } = error.response;
      if (data.error?.type !== 'NOT_FOUND_ERROR') {
        throw new Error('404 error type incorrect');
      }
      if (data.error?.code !== 404) {
        throw new Error('404 error code incorrect');
      }
      return; // Test passed
    }
    throw error;
  }
};

const testMalformedJSON = async () => {
  try {
    await axios.post(`${BASE_URL}/api/auth/register`, '{"invalid": json}', {
      headers: { 'Content-Type': 'application/json' },
      timeout: TIMEOUT
    });
    throw new Error('Malformed JSON should be rejected');
  } catch (error) {
    if (error.response && [400, 500].includes(error.response.status)) {
      const { data } = error.response;
      if (!data.success && data.error?.type) {
        return; // Test passed - error handled gracefully
      }
    }
    throw error;
  }
};

const testSecurityHeaders = async () => {
  const response = await axios.get(`${BASE_URL}/api/auth/test`, {
    timeout: TIMEOUT,
    validateStatus: () => true // Accept 404 for this test
  });

  const headers = response.headers;

  if (!headers['x-content-type-options']) {
    throw new Error('Missing x-content-type-options header');
  }

  if (!headers['x-frame-options']) {
    throw new Error('Missing x-frame-options header');
  }

  if (headers['x-content-type-options'] !== 'nosniff') {
    throw new Error('Incorrect x-content-type-options value');
  }
};

// Main test runner
const runAllTests = async () => {
  console.log('🚀 Starting FloWorx API Security & Validation Tests'.cyan.bold);
  console.log(`📍 Testing against: ${BASE_URL}`.cyan);
  console.log('='.repeat(60).cyan);

  // Health check first
  await runTest('Server Health Check', testServerHealth);

  // Authentication tests
  await runTest('Valid Registration', testValidRegistration);
  await runTest('Invalid Email Validation', testInvalidEmail);
  await runTest('Weak Password Rejection', testWeakPassword);
  await runTest('Disposable Email Rejection', testDisposableEmail);
  await runTest('XSS Protection', testXSSProtection);
  await runTest('SQL Injection Protection', testSQLInjection);

  // Error handling tests
  await runTest('404 Error Handling', test404Handling);
  await runTest('Malformed JSON Handling', testMalformedJSON);
  await runTest('Security Headers', testSecurityHeaders);

  // Results summary
  console.log('\n' + '='.repeat(60).cyan);
  console.log('📊 TEST RESULTS SUMMARY'.cyan.bold);
  console.log('='.repeat(60).cyan);

  console.log(`Total Tests: ${totalTests}`.white);
  console.log(`Passed: ${passedTests}`.green);
  console.log(`Failed: ${failedTests}`.red);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`.yellow);

  if (failedTests > 0) {
    console.log('\n❌ FAILED TESTS:'.red.bold);
    results
      .filter(r => r.status === 'FAIL')
      .forEach(result => {
        console.log(`  • ${result.name}: ${result.error}`.red);
      });
  }

  console.log('\n✅ PASSED TESTS:'.green.bold);
  results
    .filter(r => r.status === 'PASS')
    .forEach(result => {
      console.log(`  • ${result.name}`.green);
    });

  process.exit(failedTests > 0 ? 1 : 0);
};

// Run tests
runAllTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});
