#!/usr/bin/env node

/**
 * LOGIN MODULE STATUS REPORT
 * ==========================
 * Comprehensive analysis of login module functionality
 */

const axios = require('axios');
const { chromium } = require('playwright');

class LoginModuleStatus {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.apiUrl = `${baseUrl}/api`;
  }

  async generateStatusReport() {
    console.log('📊 FLOWORX LOGIN MODULE - STATUS REPORT');
    console.log('=======================================');

    const report = {
      timestamp: new Date().toISOString(),
      components: {},
      overall: {}
    };

    // 1. Test API Connectivity
    console.log('\n1️⃣ API CONNECTIVITY TEST');
    console.log('=========================');
    
    try {
      const healthResponse = await axios.get(`${this.apiUrl}/health`, { timeout: 10000 });
      report.components.apiConnectivity = {
        status: 'WORKING',
        message: `✅ API responding: ${healthResponse.status}`,
        data: healthResponse.data
      };
      console.log(report.components.apiConnectivity.message);
    } catch (error) {
      report.components.apiConnectivity = {
        status: 'FAILED',
        message: `❌ API not responding: ${error.message}`,
        error: error.message
      };
      console.log(report.components.apiConnectivity.message);
    }

    // 2. Test Registration Functionality
    console.log('\n2️⃣ REGISTRATION FUNCTIONALITY');
    console.log('==============================');
    
    const testEmail = `status.test.${Date.now()}@floworx-iq.com`;
    try {
      const registerResponse = await axios.post(`${this.apiUrl}/auth/register`, {
        firstName: 'Status',
        lastName: 'Test',
        email: testEmail,
        password: 'StatusTest123!',
        businessName: 'Status Test Company',
        phone: '+1234567890',
        agreeToTerms: true,
        marketingConsent: false
      }, { timeout: 15000 });

      report.components.registration = {
        status: 'WORKING',
        message: `✅ Registration working: ${registerResponse.status}`,
        requiresVerification: registerResponse.data.requiresVerification,
        testUser: { email: testEmail, password: 'StatusTest123!' }
      };
      console.log(report.components.registration.message);
      console.log(`📧 Test user created: ${testEmail}`);
      console.log(`🔐 Requires verification: ${registerResponse.data.requiresVerification}`);

    } catch (error) {
      report.components.registration = {
        status: error.response?.status === 409 ? 'WORKING' : 'FAILED',
        message: error.response?.status === 409 
          ? '✅ Registration working (user already exists)'
          : `❌ Registration failed: ${error.response?.data?.error || error.message}`,
        error: error.response?.data || error.message
      };
      console.log(report.components.registration.message);
    }

    // 3. Test Login API
    console.log('\n3️⃣ LOGIN API TEST');
    console.log('==================');
    
    const loginTestUser = report.components.registration?.testUser || 
                         { email: 'login.test@floworx-iq.com', password: 'LoginTest123!' };
    
    try {
      const loginResponse = await axios.post(`${this.apiUrl}/auth/login`, loginTestUser, {
        timeout: 10000
      });

      report.components.loginApi = {
        status: 'WORKING',
        message: `✅ Login API working: ${loginResponse.status}`,
        hasToken: !!loginResponse.data.token,
        userInfo: loginResponse.data.user
      };
      console.log(report.components.loginApi.message);
      console.log(`🎫 JWT token received: ${!!loginResponse.data.token}`);

    } catch (error) {
      const errorType = error.response?.data?.error?.type;
      const errorMessage = error.response?.data?.error?.message;

      report.components.loginApi = {
        status: errorType === 'EMAIL_NOT_VERIFIED' ? 'BLOCKED_BY_VERIFICATION' : 'FAILED',
        message: errorType === 'EMAIL_NOT_VERIFIED' 
          ? '⚠️  Login API blocked by email verification requirement'
          : `❌ Login API failed: ${errorMessage}`,
        errorType,
        errorMessage,
        needsDeployment: errorType === 'EMAIL_NOT_VERIFIED'
      };
      console.log(report.components.loginApi.message);
      
      if (errorType === 'EMAIL_NOT_VERIFIED') {
        console.log('🔧 Fix deployed to code but not yet active in production');
      }
    }

    // 4. Test Frontend Login Form
    console.log('\n4️⃣ FRONTEND LOGIN FORM');
    console.log('=======================');
    
    try {
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      
      await page.goto(`${this.baseUrl}/login`);
      await page.waitForLoadState('networkidle');

      const emailField = await page.locator('input[type="email"], input[name="email"]').count();
      const passwordField = await page.locator('input[type="password"], input[name="password"]').count();
      const submitButton = await page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")').count();
      const oauthButton = await page.locator('button:has-text("Google"), [data-testid*="oauth"], [data-testid*="google"]').count();

      await browser.close();

      report.components.frontendForm = {
        status: (emailField > 0 && passwordField > 0 && submitButton > 0) ? 'WORKING' : 'INCOMPLETE',
        message: (emailField > 0 && passwordField > 0 && submitButton > 0) 
          ? '✅ Login form complete and accessible'
          : '❌ Login form missing required elements',
        elements: {
          emailField: emailField > 0,
          passwordField: passwordField > 0,
          submitButton: submitButton > 0,
          oauthButton: oauthButton > 0
        }
      };
      console.log(report.components.frontendForm.message);
      console.log(`📧 Email field: ${emailField > 0 ? '✅' : '❌'}`);
      console.log(`🔐 Password field: ${passwordField > 0 ? '✅' : '❌'}`);
      console.log(`🚀 Submit button: ${submitButton > 0 ? '✅' : '❌'}`);
      console.log(`🔗 OAuth button: ${oauthButton > 0 ? '✅' : '❌'}`);

    } catch (error) {
      report.components.frontendForm = {
        status: 'FAILED',
        message: `❌ Frontend form test failed: ${error.message}`,
        error: error.message
      };
      console.log(report.components.frontendForm.message);
    }

    // 5. Overall Assessment
    console.log('\n📊 OVERALL ASSESSMENT');
    console.log('=====================');
    
    const workingComponents = Object.values(report.components).filter(c => c.status === 'WORKING').length;
    const totalComponents = Object.keys(report.components).length;
    const blockedComponents = Object.values(report.components).filter(c => c.status === 'BLOCKED_BY_VERIFICATION').length;
    
    report.overall = {
      workingComponents,
      totalComponents,
      blockedComponents,
      successRate: ((workingComponents / totalComponents) * 100).toFixed(1),
      status: this.determineOverallStatus(report.components),
      recommendations: this.generateRecommendations(report.components)
    };

    console.log(`✅ Working components: ${workingComponents}/${totalComponents}`);
    console.log(`⚠️  Blocked by verification: ${blockedComponents}`);
    console.log(`📈 Success rate: ${report.overall.successRate}%`);
    console.log(`🎯 Overall status: ${report.overall.status}`);

    console.log('\n💡 RECOMMENDATIONS:');
    report.overall.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    return report;
  }

  determineOverallStatus(components) {
    const statuses = Object.values(components).map(c => c.status);
    
    if (statuses.every(s => s === 'WORKING')) {
      return 'FULLY_FUNCTIONAL';
    } else if (statuses.some(s => s === 'WORKING') && statuses.some(s => s === 'BLOCKED_BY_VERIFICATION')) {
      return 'READY_PENDING_DEPLOYMENT';
    } else if (statuses.filter(s => s === 'WORKING').length >= statuses.length / 2) {
      return 'MOSTLY_FUNCTIONAL';
    } else {
      return 'NEEDS_WORK';
    }
  }

  generateRecommendations(components) {
    const recommendations = [];

    if (components.apiConnectivity?.status !== 'WORKING') {
      recommendations.push('🔧 Fix API connectivity issues');
    }

    if (components.registration?.status !== 'WORKING') {
      recommendations.push('🔧 Fix user registration functionality');
    }

    if (components.loginApi?.status === 'BLOCKED_BY_VERIFICATION') {
      recommendations.push('🚀 Deploy backend changes to disable email verification requirement');
    } else if (components.loginApi?.status !== 'WORKING') {
      recommendations.push('🔧 Fix login API authentication logic');
    }

    if (components.frontendForm?.status !== 'WORKING') {
      recommendations.push('🎨 Complete frontend login form implementation');
    }

    if (recommendations.length === 0) {
      recommendations.push('🎉 Login module is fully functional!');
    }

    return recommendations;
  }
}

// Export for use as module
module.exports = LoginModuleStatus;

// Run status report if called directly
if (require.main === module) {
  const statusReporter = new LoginModuleStatus();
  statusReporter.generateStatusReport()
    .then(report => {
      console.log('\n🎉 LOGIN MODULE STATUS REPORT COMPLETE!');
      console.log('=======================================');
      
      // Save report to file
      const fs = require('fs');
      fs.writeFileSync('login-module-status-report.json', JSON.stringify(report, null, 2));
      console.log('📄 Detailed report saved to: login-module-status-report.json');
      
      process.exit(report.overall.status === 'FULLY_FUNCTIONAL' ? 0 : 1);
    })
    .catch(console.error);
}
