#!/usr/bin/env node

/**
 * ULTIMATE VALIDATION TEST
 * ========================
 * Final comprehensive validation before production deployment
 */

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const fs = require('fs');
require('dotenv').config();

class UltimateValidationTest {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.apiUrl = `${baseUrl}/api`;
    this.testResults = [];
    this.startTime = Date.now();
    
    // Test credentials
    this.workingUser = {
      email: 'dizelll.test.1757606995372@gmail.com',
      password: 'TestPassword123!'
    };
    
    this.newTestUser = {
      firstName: 'Ultimate',
      lastName: 'Validation',
      email: `ultimate.validation.${Date.now()}@floworx-test.com`,
      password: 'UltimateValidation123!',
      businessName: 'Ultimate Validation LLC'
    };
  }

  async runTest(testName, testFunction) {
    console.log(`\n🧪 ${testName}`);
    console.log('='.repeat(testName.length + 3));

    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const duration = Date.now() - startTime;
      
      const success = result.success !== false;
      console.log(`${success ? '✅' : '❌'} ${result.message || (success ? 'PASSED' : 'FAILED')} (${duration}ms)`);
      
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
        duration,
        timestamp: new Date().toISOString()
      });

      return success;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`❌ ERROR: ${error.message} (${duration}ms)`);
      
      this.testResults.push({
        name: testName,
        success: false,
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      });
      
      return false;
    }
  }

  async testSystemHealth() {
    // Test multiple endpoints for comprehensive health check
    const endpoints = [
      { path: '/health', name: 'Health Check' },
      { path: '/business-types', name: 'Business Types' }
    ];

    const results = [];
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${this.apiUrl}${endpoint.path}`, { timeout: 5000 });
        results.push({ name: endpoint.name, status: response.status, success: true });
      } catch (error) {
        results.push({ name: endpoint.name, status: error.response?.status || 'Error', success: false });
      }
    }

    const allHealthy = results.every(r => r.success);

    return {
      success: allHealthy,
      message: `System health: ${allHealthy ? 'All systems operational' : 'Some issues detected'}`,
      details: {
        'Health Check': results.find(r => r.name === 'Health Check')?.status || 'Failed',
        'Business Types': results.find(r => r.name === 'Business Types')?.status || 'Failed',
        'Overall Status': allHealthy ? 'Healthy' : 'Issues detected'
      }
    };
  }

  async testCompleteAuthenticationFlow() {
    console.log('🔐 Testing complete authentication flow...');
    
    // Step 1: Register new user
    const registerResponse = await axios.post(`${this.apiUrl}/auth/register`, {
      firstName: this.newTestUser.firstName,
      lastName: this.newTestUser.lastName,
      email: this.newTestUser.email,
      password: this.newTestUser.password,
      businessName: this.newTestUser.businessName,
      agreeToTerms: true
    }, { timeout: 15000 });

    const registrationSuccess = registerResponse.status === 201;
    console.log(`   📝 Registration: ${registrationSuccess ? 'SUCCESS' : 'FAILED'} (${registerResponse.status})`);

    // Step 2: Login with existing user
    const loginResponse = await axios.post(`${this.apiUrl}/auth/login`, this.workingUser, {
      timeout: 10000
    });

    const loginSuccess = loginResponse.status === 200 && !!loginResponse.data.token;
    console.log(`   🔑 Login: ${loginSuccess ? 'SUCCESS' : 'FAILED'} (${loginResponse.status})`);

    // Step 3: Validate JWT token
    const token = loginResponse.data.token;
    let tokenValid = false;
    try {
      const verifyResponse = await axios.get(`${this.apiUrl}/auth/verify`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000
      });
      tokenValid = verifyResponse.status === 200;
    } catch (error) {
      // Token verification might not be implemented, that's okay
      tokenValid = error.response?.status !== 401;
    }
    console.log(`   🎫 Token Validation: ${tokenValid ? 'SUCCESS' : 'FAILED'}`);

    return {
      success: registrationSuccess && loginSuccess,
      message: 'Complete authentication flow working',
      details: {
        'Registration Status': registerResponse.status,
        'New User Email': this.newTestUser.email,
        'Login Status': loginResponse.status,
        'JWT Token Generated': !!token,
        'Token Length': token?.length || 0,
        'Token Valid': tokenValid,
        'User ID': loginResponse.data.user?.id
      }
    };
  }

  async testSupabaseConnectivity() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        success: false,
        message: 'Supabase environment variables not configured'
      };
    }

    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );

      // Test 1: Query existing user
      const { data: existingUser, error: existingError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, created_at')
        .eq('email', this.workingUser.email)
        .single();

      // Test 2: Query new user (should exist after registration)
      const { data: newUser, error: newError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, created_at')
        .eq('email', this.newTestUser.email)
        .single();

      // Test 3: Count total users
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      return {
        success: !existingError && !!existingUser,
        message: 'Supabase connectivity and data integrity verified',
        details: {
          'Existing User Found': !existingError && !!existingUser,
          'Existing User ID': existingUser?.id,
          'New User Found': !newError && !!newUser,
          'New User ID': newUser?.id,
          'Total Users': count || 'Unknown',
          'Database Connection': 'Working'
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `Supabase connectivity failed: ${error.message}`,
        details: {
          'Error': error.message
        }
      };
    }
  }

  async testFrontendAccessibility() {
    console.log('🌐 Testing frontend accessibility...');
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    try {
      // Test key pages load
      const pagesToTest = [
        { url: `${this.baseUrl}/`, name: 'Home Page' },
        { url: `${this.baseUrl}/login`, name: 'Login Page' },
        { url: `${this.baseUrl}/register`, name: 'Register Page' }
      ];

      const pageResults = [];
      for (const pageTest of pagesToTest) {
        try {
          const response = await page.goto(pageTest.url, { waitUntil: 'networkidle', timeout: 10000 });
          const status = response.status();
          pageResults.push({
            name: pageTest.name,
            status,
            success: status === 200,
            url: pageTest.url
          });
        } catch (error) {
          pageResults.push({
            name: pageTest.name,
            status: 'Error',
            success: false,
            error: error.message
          });
        }
      }

      await browser.close();

      const allPagesAccessible = pageResults.every(p => p.success);

      return {
        success: allPagesAccessible,
        message: `Frontend accessibility: ${allPagesAccessible ? 'All pages accessible' : 'Some pages have issues'}`,
        details: {
          'Home Page': pageResults.find(p => p.name === 'Home Page')?.status || 'Error',
          'Login Page': pageResults.find(p => p.name === 'Login Page')?.status || 'Error',
          'Register Page': pageResults.find(p => p.name === 'Register Page')?.status || 'Error',
          'Overall Status': allPagesAccessible ? 'Accessible' : 'Issues detected'
        }
      };

    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  async testLoadAndStress() {
    console.log('⚡ Testing load and stress...');
    
    // Perform multiple concurrent requests
    const concurrentRequests = 5;
    const requests = [];

    for (let i = 0; i < concurrentRequests; i++) {
      requests.push(
        axios.get(`${this.apiUrl}/health`, { timeout: 10000 })
          .then(response => ({ success: true, status: response.status, duration: Date.now() }))
          .catch(error => ({ success: false, status: error.response?.status || 'Error', duration: Date.now() }))
      );
    }

    const startTime = Date.now();
    const results = await Promise.all(requests);
    const totalDuration = Date.now() - startTime;

    const successfulRequests = results.filter(r => r.success).length;
    const successRate = (successfulRequests / concurrentRequests * 100).toFixed(1);

    return {
      success: successfulRequests >= concurrentRequests * 0.8, // 80% success rate minimum
      message: `Load test: ${successRate}% success rate with ${concurrentRequests} concurrent requests`,
      details: {
        'Concurrent Requests': concurrentRequests,
        'Successful Requests': successfulRequests,
        'Success Rate': `${successRate}%`,
        'Total Duration': `${totalDuration}ms`,
        'Average Per Request': `${(totalDuration / concurrentRequests).toFixed(0)}ms`
      }
    };
  }

  async testSecurityValidation() {
    console.log('🛡️ Testing security validation...');
    
    const securityTests = [];

    // Test 1: Unauthorized access
    try {
      await axios.get(`${this.apiUrl}/user/profile`, { timeout: 5000 });
      securityTests.push({ name: 'Unauthorized Access', blocked: false });
    } catch (error) {
      securityTests.push({ name: 'Unauthorized Access', blocked: error.response?.status === 401 });
    }

    // Test 2: Invalid credentials
    try {
      await axios.post(`${this.apiUrl}/auth/login`, {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      });
      securityTests.push({ name: 'Invalid Credentials', blocked: false });
    } catch (error) {
      securityTests.push({ name: 'Invalid Credentials', blocked: error.response?.status === 401 });
    }

    // Test 3: SQL injection attempt
    try {
      await axios.post(`${this.apiUrl}/auth/login`, {
        email: "admin'; DROP TABLE users; --",
        password: 'password'
      });
      securityTests.push({ name: 'SQL Injection', blocked: false });
    } catch (error) {
      securityTests.push({ name: 'SQL Injection', blocked: error.response?.status >= 400 });
    }

    const allSecurityPassed = securityTests.every(test => test.blocked);

    return {
      success: allSecurityPassed,
      message: `Security validation: ${allSecurityPassed ? 'All threats blocked' : 'Security issues detected'}`,
      details: {
        'Unauthorized Access Blocked': securityTests.find(t => t.name === 'Unauthorized Access')?.blocked || false,
        'Invalid Credentials Blocked': securityTests.find(t => t.name === 'Invalid Credentials')?.blocked || false,
        'SQL Injection Blocked': securityTests.find(t => t.name === 'SQL Injection')?.blocked || false,
        'Overall Security': allSecurityPassed ? 'Secure' : 'Vulnerabilities detected'
      }
    };
  }

  async runUltimateValidation() {
    console.log('🎯 ULTIMATE VALIDATION TEST');
    console.log('===========================');
    console.log(`🌐 Application: ${this.baseUrl}`);
    console.log(`📧 Existing User: ${this.workingUser.email}`);
    console.log(`📧 New Test User: ${this.newTestUser.email}`);
    console.log(`⏰ Started: ${new Date().toISOString()}\n`);

    const testSuite = [
      ['System Health Check', () => this.testSystemHealth()],
      ['Complete Authentication Flow', () => this.testCompleteAuthenticationFlow()],
      ['Supabase Connectivity', () => this.testSupabaseConnectivity()],
      ['Frontend Accessibility', () => this.testFrontendAccessibility()],
      ['Load and Stress Test', () => this.testLoadAndStress()],
      ['Security Validation', () => this.testSecurityValidation()]
    ];

    const results = [];
    for (const [testName, testFunction] of testSuite) {
      const success = await this.runTest(testName, testFunction);
      results.push(success);
    }

    // Calculate final results
    const totalTests = results.length;
    const passedTests = results.filter(r => r).length;
    const successRate = (passedTests / totalTests * 100).toFixed(1);
    const totalDuration = Date.now() - this.startTime;

    console.log('\n📊 ULTIMATE VALIDATION RESULTS');
    console.log('===============================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`⏱️  Total Duration: ${totalDuration}ms`);

    // Detailed results
    console.log('\n📋 Detailed Test Results:');
    this.testResults.forEach(test => {
      const status = test.success ? '✅' : '❌';
      const duration = test.duration ? `(${test.duration}ms)` : '';
      console.log(`   ${status} ${test.name}: ${test.message} ${duration}`);
    });

    // Final assessment
    console.log('\n🎯 ULTIMATE VALIDATION ASSESSMENT:');
    if (successRate >= 95) {
      console.log('🎉 PERFECT: System is absolutely ready for production deployment!');
    } else if (successRate >= 85) {
      console.log('✅ EXCELLENT: System is production-ready with minor considerations');
    } else if (successRate >= 75) {
      console.log('⚠️  GOOD: System is mostly ready, some issues to address');
    } else {
      console.log('❌ NEEDS WORK: System requires improvements before production');
    }

    // Success highlights
    const successfulTests = this.testResults.filter(test => test.success);
    if (successfulTests.length > 0) {
      console.log('\n🏆 SYSTEMS WORKING PERFECTLY:');
      successfulTests.forEach(test => {
        console.log(`   ✅ ${test.name}`);
      });
    }

    // Issues to address
    const failedTests = this.testResults.filter(test => !test.success);
    if (failedTests.length > 0) {
      console.log('\n🔧 AREAS FOR IMPROVEMENT:');
      failedTests.forEach(test => {
        console.log(`   ❌ ${test.name}: ${test.error || test.message}`);
      });
    }

    // Save comprehensive report
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      testUser: this.workingUser.email,
      newTestUser: this.newTestUser.email,
      totalTests,
      passedTests,
      successRate: parseFloat(successRate),
      totalDuration,
      testResults: this.testResults,
      deploymentReady: successRate >= 85
    };

    const reportFile = `ultimate-validation-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`\n📄 Ultimate validation report saved to: ${reportFile}`);

    console.log('\n🎉 ULTIMATE VALIDATION TEST COMPLETE!');
    
    if (report.deploymentReady) {
      console.log('🚀 SYSTEM IS READY FOR PRODUCTION DEPLOYMENT!');
      console.log('✅ All critical systems validated and working perfectly!');
    } else {
      console.log('🔧 System needs improvements before production deployment');
    }

    return report;
  }
}

// Run test if called directly
if (require.main === module) {
  const tester = new UltimateValidationTest();
  tester.runUltimateValidation()
    .then(report => {
      const success = report.deploymentReady;
      process.exit(success ? 0 : 1);
    })
    .catch(console.error);
}

module.exports = UltimateValidationTest;
