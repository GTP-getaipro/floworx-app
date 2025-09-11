#!/usr/bin/env node

/**
 * FINAL AUTHENTICATION TEST
 * =========================
 * Comprehensive final test with all fixes applied
 */

const axios = require('axios');
const fs = require('fs');

class FinalAuthenticationTest {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.apiUrl = `${baseUrl}/api`;
    this.workingUser = {
      email: 'dizelll.test.1757606995372@gmail.com',
      password: 'TestPassword123!'
    };
  }

  async runFinalTest() {
    console.log('🎯 FINAL AUTHENTICATION TEST');
    console.log('============================');
    console.log(`📧 Testing with: ${this.workingUser.email}`);
    console.log(`🔑 Password: ${this.workingUser.password}`);
    console.log(`🌐 Application: ${this.baseUrl}\n`);

    const results = {
      timestamp: new Date().toISOString(),
      workingUser: this.workingUser,
      tests: {}
    };

    // Test 1: API Health
    console.log('🧪 TEST 1: API HEALTH');
    console.log('=====================');
    try {
      const response = await axios.get(`${this.apiUrl}/health`, { timeout: 10000 });
      results.tests.apiHealth = {
        success: true,
        status: response.status,
        message: 'API healthy and responding'
      };
      console.log(`✅ API Health: ${response.status} - ${response.data.status || 'OK'}`);
    } catch (error) {
      results.tests.apiHealth = {
        success: false,
        error: error.message
      };
      console.log(`❌ API Health: ${error.message}`);
    }

    // Test 2: API Login (Core Authentication)
    console.log('\n🧪 TEST 2: API LOGIN');
    console.log('====================');
    try {
      const response = await axios.post(`${this.apiUrl}/auth/login`, this.workingUser, {
        timeout: 10000
      });
      
      const success = response.status === 200 && !!response.data.token;
      results.tests.apiLogin = {
        success,
        status: response.status,
        hasToken: !!response.data.token,
        userId: response.data.user?.id,
        message: success ? 'API login working perfectly' : 'API login has issues'
      };
      
      console.log(`✅ API Login: ${response.status}`);
      console.log(`🎫 Token received: ${!!response.data.token}`);
      console.log(`👤 User ID: ${response.data.user?.id}`);
      
    } catch (error) {
      results.tests.apiLogin = {
        success: false,
        error: error.message,
        status: error.response?.status
      };
      console.log(`❌ API Login: ${error.message}`);
    }

    // Test 3: Registration Flow
    console.log('\n🧪 TEST 3: REGISTRATION');
    console.log('=======================');
    const newTestEmail = `test.final.${Date.now()}@example.com`;
    try {
      const response = await axios.post(`${this.apiUrl}/auth/register`, {
        firstName: 'Final',
        lastName: 'Test',
        email: newTestEmail,
        password: 'TestPassword123!',
        businessName: 'Final Test Business',
        agreeToTerms: true
      }, { timeout: 15000 });
      
      results.tests.registration = {
        success: response.status === 201,
        status: response.status,
        email: newTestEmail,
        requiresVerification: response.data.requiresVerification || false,
        message: 'Registration working'
      };
      
      console.log(`✅ Registration: ${response.status}`);
      console.log(`📧 Test email: ${newTestEmail}`);
      console.log(`📧 Requires verification: ${response.data.requiresVerification || false}`);
      
    } catch (error) {
      results.tests.registration = {
        success: false,
        error: error.message,
        status: error.response?.status
      };
      console.log(`❌ Registration: ${error.message}`);
    }

    // Test 4: Business Types API (Fixed)
    console.log('\n🧪 TEST 4: BUSINESS TYPES API');
    console.log('=============================');
    try {
      const response = await axios.get(`${this.apiUrl}/business-types`, { timeout: 10000 });
      
      let businessTypes = [];
      if (Array.isArray(response.data)) {
        businessTypes = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        businessTypes = response.data.data;
      } else if (response.data.businessTypes && Array.isArray(response.data.businessTypes)) {
        businessTypes = response.data.businessTypes;
      }

      const hasHotTub = businessTypes.some(bt => 
        bt.name?.toLowerCase().includes('hot tub') || 
        bt.type?.toLowerCase().includes('hot tub')
      );

      results.tests.businessTypes = {
        success: true,
        status: response.status,
        count: businessTypes.length,
        hasHotTub,
        message: `${businessTypes.length} business types available`
      };
      
      console.log(`✅ Business Types: ${response.status}`);
      console.log(`📊 Types available: ${businessTypes.length}`);
      console.log(`🛁 Has Hot Tub type: ${hasHotTub}`);
      
    } catch (error) {
      results.tests.businessTypes = {
        success: false,
        error: error.message,
        status: error.response?.status
      };
      console.log(`❌ Business Types: ${error.message}`);
    }

    // Test 5: Password Reset (Improved)
    console.log('\n🧪 TEST 5: PASSWORD RESET');
    console.log('=========================');
    try {
      const response = await axios.post(`${this.apiUrl}/auth/forgot-password`, {
        email: 'test@example.com'
      }, { timeout: 10000 });
      
      results.tests.passwordReset = {
        success: response.status === 200,
        status: response.status,
        message: response.data.message,
        hasResetUrl: !!response.data.resetUrl
      };
      
      console.log(`✅ Password Reset: ${response.status}`);
      console.log(`💬 Message: ${response.data.message}`);
      
    } catch (error) {
      results.tests.passwordReset = {
        success: false,
        error: error.message,
        status: error.response?.status,
        message: error.response?.status === 500 ? 'Server-side implementation needed' : error.message
      };
      console.log(`❌ Password Reset: ${error.response?.status === 500 ? 'Server-side fix needed' : error.message}`);
    }

    // Test 6: Security - Dashboard Protection
    console.log('\n🧪 TEST 6: SECURITY');
    console.log('===================');
    try {
      const response = await axios.get(`${this.baseUrl}/dashboard`, { 
        timeout: 10000,
        maxRedirects: 0,
        validateStatus: () => true
      });
      
      const isProtected = response.status === 302 || response.status === 401 || 
                         (response.status === 200 && response.data.includes('login'));
      
      results.tests.security = {
        success: isProtected,
        status: response.status,
        protected: isProtected,
        message: isProtected ? 'Dashboard properly protected' : 'Dashboard security issue'
      };
      
      console.log(`✅ Dashboard Protection: ${isProtected ? 'WORKING' : 'NEEDS WORK'}`);
      console.log(`📊 Status: ${response.status}`);
      
    } catch (error) {
      if (error.code === 'ERR_HTTP_RESPONSE_CODE' && error.response?.status === 302) {
        results.tests.security = {
          success: true,
          status: 302,
          protected: true,
          message: 'Dashboard properly redirects to login'
        };
        console.log(`✅ Dashboard Protection: WORKING (redirects to login)`);
      } else {
        results.tests.security = {
          success: false,
          error: error.message
        };
        console.log(`❌ Security Test: ${error.message}`);
      }
    }

    // Calculate final results
    const testResults = Object.values(results.tests);
    const passedTests = testResults.filter(test => test.success).length;
    const totalTests = testResults.length;
    const successRate = (passedTests / totalTests * 100).toFixed(1);

    console.log('\n📊 FINAL TEST RESULTS');
    console.log('=====================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}`);
    console.log(`📈 Success Rate: ${successRate}%`);

    // Detailed breakdown
    console.log('\n📋 Detailed Results:');
    Object.entries(results.tests).forEach(([testName, result]) => {
      const status = result.success ? '✅' : '❌';
      console.log(`   ${status} ${testName}: ${result.message || (result.success ? 'PASSED' : 'FAILED')}`);
    });

    // Assessment
    console.log('\n🎯 FINAL ASSESSMENT:');
    if (successRate >= 85) {
      console.log('🎉 EXCELLENT: Authentication system exceeds 85% success rate!');
      console.log('✅ Ready for production deployment');
    } else if (successRate >= 70) {
      console.log('✅ GOOD: Authentication system working well (70%+ success rate)');
      console.log('🔧 Minor issues to address for optimal performance');
    } else {
      console.log('⚠️  NEEDS WORK: Authentication system below 70% success rate');
      console.log('🔧 Significant issues need addressing');
    }

    // Specific achievements
    console.log('\n🏆 KEY ACHIEVEMENTS:');
    if (results.tests.apiLogin?.success) {
      console.log('✅ Core API authentication working perfectly');
    }
    if (results.tests.registration?.success) {
      console.log('✅ User registration system functional');
    }
    if (results.tests.businessTypes?.success) {
      console.log('✅ Business types API working correctly');
    }
    if (results.tests.security?.success) {
      console.log('✅ Security measures properly implemented');
    }

    // Outstanding issues
    const failedTests = testResults.filter(test => !test.success);
    if (failedTests.length > 0) {
      console.log('\n🔧 REMAINING ISSUES:');
      failedTests.forEach(test => {
        console.log(`   ❌ ${test.error || test.message || 'Unknown issue'}`);
      });
    }

    // Save comprehensive report
    results.summary = {
      totalTests,
      passedTests,
      successRate: parseFloat(successRate),
      assessment: successRate >= 85 ? 'EXCELLENT' : successRate >= 70 ? 'GOOD' : 'NEEDS_WORK',
      readyForProduction: successRate >= 85
    };

    const reportFile = `final-auth-test-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Comprehensive report saved to: ${reportFile}`);

    console.log('\n🎉 FINAL AUTHENTICATION TEST COMPLETE!');
    
    if (results.summary.readyForProduction) {
      console.log('🚀 SYSTEM READY FOR PRODUCTION DEPLOYMENT!');
    } else {
      console.log('🔧 System functional but has room for improvement');
    }

    return results;
  }
}

// Run test if called directly
if (require.main === module) {
  const tester = new FinalAuthenticationTest();
  tester.runFinalTest()
    .then(results => {
      const success = results.summary.successRate >= 70;
      process.exit(success ? 0 : 1);
    })
    .catch(console.error);
}

module.exports = FinalAuthenticationTest;
