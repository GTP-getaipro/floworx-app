#!/usr/bin/env node

/**
 * PLAYWRIGHT DEPLOYMENT TESTS
 * ===========================
 * Comprehensive browser-based testing after each deployment
 * Follows deployment rules: Wait 3 minutes after push, then validate
 */

const { chromium } = require('playwright');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

class PlaywrightDeploymentTests {
  constructor(baseUrl = 'https://app.floworx-iq.com') {
    this.baseUrl = baseUrl;
    this.apiUrl = `${baseUrl}/api`;
    this.testResults = [];
    this.screenshots = [];
    
    // Test credentials
    this.workingUser = {
      email: 'dizelll.test.1757606995372@gmail.com',
      password: 'TestPassword123!'
    };
    
    this.newTestUser = {
      firstName: 'Playwright',
      lastName: 'Deploy',
      email: `playwright.deploy.${Date.now()}@test.com`,
      password: 'PlaywrightDeploy123!',
      businessName: 'Playwright Deploy Test LLC'
    };
  }

  async waitForDeployment(minutes = 3) {
    console.log(`⏰ WAITING ${minutes} MINUTES FOR DEPLOYMENT COMPLETION`);
    console.log('='.repeat(50));
    console.log(`🚀 Following deployment rules: Wait ${minutes} minutes after git push`);
    console.log(`⏱️  Duration: ${minutes} minutes`);
    console.log(`🕐 Started: ${new Date().toISOString()}`);
    
    const totalSeconds = minutes * 60;
    const intervalSeconds = 30;
    
    for (let elapsed = 0; elapsed < totalSeconds; elapsed += intervalSeconds) {
      const remaining = totalSeconds - elapsed;
      const remainingMinutes = Math.floor(remaining / 60);
      const remainingSeconds = remaining % 60;
      
      process.stdout.write(`\r⏳ Deployment wait... ${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')} remaining`);
      
      await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
    }
    
    console.log(`\n✅ Deployment wait complete! Starting Playwright tests...`);
    console.log(`🕐 Completed: ${new Date().toISOString()}\n`);
  }

  async takeScreenshot(page, name, description) {
    const timestamp = Date.now();
    const filename = `playwright-${name}-${timestamp}.png`;
    
    await page.screenshot({ 
      path: filename, 
      fullPage: true,
      animations: 'disabled'
    });
    
    this.screenshots.push({
      name,
      description,
      filename,
      timestamp: new Date().toISOString()
    });
    
    console.log(`📸 Screenshot saved: ${filename} - ${description}`);
    return filename;
  }

  async testPageLoad(page, url, testName, expectedElements = []) {
    console.log(`\n🌐 Testing: ${testName}`);
    console.log('-'.repeat(30));
    
    try {
      console.log(`📍 Navigating to: ${url}`);
      const response = await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      const status = response.status();
      console.log(`📊 HTTP Status: ${status}`);
      
      // Take screenshot
      await this.takeScreenshot(page, testName.toLowerCase().replace(/\s+/g, '-'), `${testName} page loaded`);
      
      // Check for expected elements
      const elementResults = [];
      for (const element of expectedElements) {
        try {
          await page.waitForSelector(element.selector, { timeout: 5000 });
          elementResults.push({ element: element.name, found: true });
          console.log(`✅ Found: ${element.name}`);
        } catch (error) {
          elementResults.push({ element: element.name, found: false, error: error.message });
          console.log(`❌ Missing: ${element.name}`);
        }
      }
      
      const allElementsFound = elementResults.every(result => result.found);
      
      return {
        success: status === 200 && allElementsFound,
        status,
        url,
        elementResults,
        screenshot: this.screenshots[this.screenshots.length - 1]?.filename
      };
      
    } catch (error) {
      console.log(`❌ Error loading ${testName}: ${error.message}`);
      
      // Take error screenshot
      await this.takeScreenshot(page, `${testName.toLowerCase().replace(/\s+/g, '-')}-error`, `${testName} error state`);
      
      return {
        success: false,
        error: error.message,
        url,
        screenshot: this.screenshots[this.screenshots.length - 1]?.filename
      };
    }
  }

  async testAPIEndpoints() {
    console.log('\n🔗 TESTING API ENDPOINTS');
    console.log('========================');
    
    const endpoints = [
      { name: 'Health Check', url: `${this.apiUrl}/health`, method: 'GET', expectedStatus: [200] },
      { name: 'Business Types', url: `${this.apiUrl}/business-types`, method: 'GET', expectedStatus: [200] },
      { name: 'Auth Login (Invalid)', url: `${this.apiUrl}/auth/login`, method: 'POST', 
        data: { email: 'invalid@test.com', password: 'wrong' }, expectedStatus: [401] }
    ];
    
    const apiResults = [];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🧪 Testing: ${endpoint.name}`);
        
        const options = {
          method: endpoint.method,
          url: endpoint.url,
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        };
        
        if (endpoint.data) {
          options.data = endpoint.data;
        }
        
        const response = await axios(options);
        const success = endpoint.expectedStatus.includes(response.status);
        
        apiResults.push({
          name: endpoint.name,
          success,
          status: response.status,
          expected: endpoint.expectedStatus
        });
        
        console.log(`${success ? '✅' : '❌'} ${endpoint.name}: ${response.status} (Expected: ${endpoint.expectedStatus.join('|')})`);
        
      } catch (error) {
        const status = error.response?.status || 'ERROR';
        const success = endpoint.expectedStatus.includes(status);
        
        apiResults.push({
          name: endpoint.name,
          success,
          status,
          expected: endpoint.expectedStatus,
          error: error.message
        });
        
        console.log(`${success ? '✅' : '❌'} ${endpoint.name}: ${status} (Expected: ${endpoint.expectedStatus.join('|')})`);
      }
    }
    
    return apiResults;
  }

  async testAuthenticationFlow(page) {
    console.log('\n🔐 TESTING AUTHENTICATION FLOW');
    console.log('==============================');
    
    const authResults = [];
    
    try {
      // Test 1: Navigate to login page
      console.log('📍 Step 1: Navigate to login page');
      await page.goto(`${this.baseUrl}/login`, { waitUntil: 'networkidle' });
      await this.takeScreenshot(page, 'login-page', 'Login page loaded');
      
      // Check for login form elements
      const loginElements = [
        { selector: 'input[type="email"], input[name="email"]', name: 'Email Input' },
        { selector: 'input[type="password"], input[name="password"]', name: 'Password Input' },
        { selector: 'button[type="submit"], button:has-text("Sign In"), button:has-text("Login")', name: 'Submit Button' }
      ];
      
      let loginFormComplete = true;
      for (const element of loginElements) {
        try {
          await page.waitForSelector(element.selector, { timeout: 5000 });
          console.log(`✅ Found: ${element.name}`);
        } catch (error) {
          console.log(`❌ Missing: ${element.name}`);
          loginFormComplete = false;
        }
      }
      
      authResults.push({
        test: 'Login Page Load',
        success: loginFormComplete,
        details: 'Login form elements validation'
      });
      
      // Test 2: Fill and submit login form (if elements exist)
      if (loginFormComplete) {
        console.log('📍 Step 2: Test login form submission');
        
        const emailInput = page.locator('input[type="email"], input[name="email"]').first();
        const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
        const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")').first();
        
        await emailInput.fill(this.workingUser.email);
        await passwordInput.fill(this.workingUser.password);
        await this.takeScreenshot(page, 'login-filled', 'Login form filled');
        
        // Monitor network requests
        const networkPromise = page.waitForResponse(response => 
          response.url().includes('/auth/login') && response.request().method() === 'POST'
        );
        
        await submitButton.click();
        
        try {
          const response = await networkPromise;
          const status = response.status();
          console.log(`📡 Login API Response: ${status}`);
          
          await page.waitForTimeout(3000); // Wait for any redirects/updates
          await this.takeScreenshot(page, 'login-submitted', 'After login submission');
          
          // Check if we're redirected or if there are tokens
          const currentUrl = page.url();
          const hasRedirected = !currentUrl.includes('/login');
          
          authResults.push({
            test: 'Login Form Submission',
            success: status === 200,
            details: `API returned ${status}, redirected: ${hasRedirected}`
          });
          
        } catch (error) {
          console.log(`❌ Login submission failed: ${error.message}`);
          authResults.push({
            test: 'Login Form Submission',
            success: false,
            details: `Login submission error: ${error.message}`
          });
        }
      }
      
      // Test 3: Navigate to registration page
      console.log('📍 Step 3: Navigate to registration page');
      await page.goto(`${this.baseUrl}/register`, { waitUntil: 'networkidle' });
      await this.takeScreenshot(page, 'register-page', 'Registration page loaded');
      
      // Check for registration form elements
      const registerElements = [
        { selector: 'input[name="firstName"], input[placeholder*="First"]', name: 'First Name Input' },
        { selector: 'input[name="email"], input[type="email"]', name: 'Email Input' },
        { selector: 'input[name="password"], input[type="password"]', name: 'Password Input' },
        { selector: 'button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")', name: 'Submit Button' }
      ];
      
      let registerFormComplete = true;
      for (const element of registerElements) {
        try {
          await page.waitForSelector(element.selector, { timeout: 5000 });
          console.log(`✅ Found: ${element.name}`);
        } catch (error) {
          console.log(`❌ Missing: ${element.name}`);
          registerFormComplete = false;
        }
      }
      
      authResults.push({
        test: 'Registration Page Load',
        success: registerFormComplete,
        details: 'Registration form elements validation'
      });
      
    } catch (error) {
      console.log(`❌ Authentication flow error: ${error.message}`);
      authResults.push({
        test: 'Authentication Flow',
        success: false,
        details: `Error: ${error.message}`
      });
    }
    
    return authResults;
  }

  async testPageAccessibility(page) {
    console.log('\n🌐 TESTING PAGE ACCESSIBILITY');
    console.log('=============================');
    
    const pages = [
      { name: 'Home Page', url: `${this.baseUrl}/`, expectedElements: [] },
      { name: 'Login Page', url: `${this.baseUrl}/login`, expectedElements: [
        { selector: 'input[type="email"], input[name="email"]', name: 'Email Input' }
      ]},
      { name: 'Register Page', url: `${this.baseUrl}/register`, expectedElements: [
        { selector: 'input[name="email"], input[type="email"]', name: 'Email Input' }
      ]}
    ];
    
    const pageResults = [];
    
    for (const pageTest of pages) {
      const result = await this.testPageLoad(page, pageTest.url, pageTest.name, pageTest.expectedElements);
      pageResults.push({
        name: pageTest.name,
        ...result
      });
    }
    
    return pageResults;
  }

  async runPlaywrightDeploymentTests(waitForDeployment = true) {
    console.log('🎭 PLAYWRIGHT DEPLOYMENT TESTS');
    console.log('==============================');
    console.log(`🌐 Application: ${this.baseUrl}`);
    console.log(`📧 Test User: ${this.workingUser.email}`);
    console.log(`⏰ Started: ${new Date().toISOString()}\n`);

    // Wait for deployment if requested
    if (waitForDeployment) {
      await this.waitForDeployment(3);
    }

    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    try {
      // Test 1: API Endpoints
      const apiResults = await this.testAPIEndpoints();
      
      // Test 2: Page Accessibility
      const pageResults = await this.testPageAccessibility(page);
      
      // Test 3: Authentication Flow
      const authResults = await this.testAuthenticationFlow(page);
      
      // Compile results
      const allResults = {
        timestamp: new Date().toISOString(),
        baseUrl: this.baseUrl,
        testUser: this.workingUser.email,
        apiTests: apiResults,
        pageTests: pageResults,
        authTests: authResults,
        screenshots: this.screenshots
      };
      
      // Calculate summary
      const totalTests = apiResults.length + pageResults.length + authResults.length;
      const passedTests = [
        ...apiResults.filter(t => t.success),
        ...pageResults.filter(t => t.success),
        ...authResults.filter(t => t.success)
      ].length;
      
      const successRate = (passedTests / totalTests * 100).toFixed(1);
      
      allResults.summary = {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        successRate: parseFloat(successRate)
      };
      
      // Display results
      console.log('\n📊 PLAYWRIGHT DEPLOYMENT TEST RESULTS');
      console.log('=====================================');
      console.log(`Total Tests: ${totalTests}`);
      console.log(`✅ Passed: ${passedTests}`);
      console.log(`❌ Failed: ${totalTests - passedTests}`);
      console.log(`📈 Success Rate: ${successRate}%`);
      
      // Show detailed results
      console.log('\n📋 Detailed Results:');
      console.log('API Tests:');
      apiResults.forEach(test => {
        console.log(`   ${test.success ? '✅' : '❌'} ${test.name}: ${test.status}`);
      });
      
      console.log('Page Tests:');
      pageResults.forEach(test => {
        console.log(`   ${test.success ? '✅' : '❌'} ${test.name}: ${test.status || 'Error'}`);
      });
      
      console.log('Authentication Tests:');
      authResults.forEach(test => {
        console.log(`   ${test.success ? '✅' : '❌'} ${test.test}: ${test.details}`);
      });
      
      console.log(`\n📸 Screenshots captured: ${this.screenshots.length}`);
      this.screenshots.forEach(screenshot => {
        console.log(`   📷 ${screenshot.filename} - ${screenshot.description}`);
      });
      
      // Save report
      const reportFile = `playwright-deployment-test-${Date.now()}.json`;
      fs.writeFileSync(reportFile, JSON.stringify(allResults, null, 2));
      console.log(`\n📄 Playwright test report saved to: ${reportFile}`);
      
      // Final assessment
      console.log('\n🎯 DEPLOYMENT VALIDATION ASSESSMENT:');
      if (successRate >= 90) {
        console.log('🎉 EXCELLENT: Deployment is working perfectly!');
      } else if (successRate >= 80) {
        console.log('✅ GOOD: Deployment is mostly working, minor issues detected');
      } else if (successRate >= 70) {
        console.log('⚠️  FAIR: Deployment has some issues that need attention');
      } else {
        console.log('❌ POOR: Deployment has significant issues');
      }
      
      console.log('\n🎭 PLAYWRIGHT DEPLOYMENT TESTS COMPLETE!');
      
      return allResults;
      
    } finally {
      await browser.close();
    }
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const skipWait = args.includes('--no-wait') || args.includes('-n');
  
  console.log('🎭 PLAYWRIGHT DEPLOYMENT TESTING SYSTEM');
  console.log('=======================================');
  console.log(`📋 Wait for deployment: ${!skipWait ? 'YES (3 minutes)' : 'NO (immediate)'}`);
  console.log(`📖 Following deployment rules: Wait 3 minutes after git push for build completion`);
  console.log('');

  const tester = new PlaywrightDeploymentTests();
  
  try {
    const results = await tester.runPlaywrightDeploymentTests(!skipWait);
    
    if (results.summary.successRate >= 80) {
      console.log('🎉 Deployment validation successful!');
      process.exit(0);
    } else {
      console.log('❌ Deployment validation failed - check results for details');
      process.exit(1);
    }

  } catch (error) {
    console.error(`\n❌ PLAYWRIGHT TEST ERROR: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = PlaywrightDeploymentTests;
