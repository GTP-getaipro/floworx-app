#!/usr/bin/env node

const { chromium } = require('playwright');
const axios = require('axios');

const BASE_URL = 'https://app.floworx-iq.com';
const API_URL = `${BASE_URL}/api`;

async function validateFrontendDatabaseCommunication() {
  console.log('🔍 COMPREHENSIVE BUG FIX AND DATABASE VALIDATION');
  console.log('=================================================');
  
  const issues = [];
  const fixes = [];
  let browser;

  try {
    browser = await chromium.launch({ headless: false, slowMo: 1000 });
    const page = await browser.newPage();

    // 1. Test API Health and Database Connection
    console.log('\n1️⃣ TESTING API AND DATABASE CONNECTION');
    console.log('=====================================');
    
    try {
      const healthResponse = await axios.get(`${API_URL}/health`, { timeout: 10000 });
      console.log(`✅ API Health: ${healthResponse.status} - ${JSON.stringify(healthResponse.data)}`);
      
      if (healthResponse.data.database === 'connected') {
        console.log('✅ Database connection confirmed');
      } else {
        issues.push('Database connection issue detected');
      }
    } catch (error) {
      console.log(`❌ API Health Check Failed: ${error.message}`);
      issues.push(`API Health Check Failed: ${error.message}`);
    }

    // 2. Test Authentication Endpoints
    console.log('\n2️⃣ TESTING AUTHENTICATION ENDPOINTS');
    console.log('===================================');
    
    // Test registration endpoint
    try {
      const testEmail = `test${Date.now()}@example.com`;
      const registrationData = {
        firstName: 'Test',
        lastName: 'User',
        email: testEmail,
        password: 'TestPassword123!',
        businessName: 'Test Company',
        phone: '+1234567890',
        agreeToTerms: true,
        marketingConsent: false
      };

      console.log(`📧 Testing registration with: ${testEmail}`);
      const regResponse = await axios.post(`${API_URL}/auth/register`, registrationData, {
        timeout: 15000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log(`✅ Registration API: ${regResponse.status} - ${JSON.stringify(regResponse.data)}`);
      
      if (regResponse.data.success) {
        console.log('✅ Registration endpoint working correctly');
      } else {
        issues.push(`Registration failed: ${regResponse.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ Registration API Failed: ${error.response?.data?.error || error.message}`);
      issues.push(`Registration API Failed: ${error.response?.data?.error || error.message}`);
    }

    // 3. Test Frontend Registration Flow
    console.log('\n3️⃣ TESTING FRONTEND REGISTRATION FLOW');
    console.log('=====================================');
    
    await page.goto(`${BASE_URL}/register`);
    await page.waitForLoadState('networkidle');
    
    // Fill registration form
    const uniqueEmail = `frontend${Date.now()}@example.com`;
    console.log(`📧 Testing frontend registration with: ${uniqueEmail}`);
    
    await page.fill('[name="firstName"]', 'Frontend');
    await page.fill('[name="lastName"]', 'Test');
    await page.fill('[name="email"]', uniqueEmail);
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.fill('[name="confirmPassword"]', 'TestPassword123!');
    
    // Check if company field exists
    const companyField = await page.locator('[name="companyName"]').count();
    if (companyField > 0) {
      await page.fill('[name="companyName"]', 'Frontend Test Company');
    }

    // Monitor network requests
    const networkRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        networkRequests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers()
        });
      }
    });

    page.on('response', response => {
      if (response.url().includes('/api/')) {
        console.log(`🌐 API Response: ${response.status()} ${response.url()}`);
      }
    });

    // Submit form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(10000); // Wait longer for response

    // Check current state
    const currentUrl = page.url();
    const pageContent = await page.textContent('body');
    const hasError = await page.locator('[role="alert"], .error, .alert-danger').count();
    const hasSuccess = await page.locator('.success, .alert-success, [data-testid*="success"]').count();

    console.log(`📍 Current URL: ${currentUrl}`);
    console.log(`❌ Error elements: ${hasError}`);
    console.log(`✅ Success elements: ${hasSuccess}`);
    console.log(`🌐 Network requests made: ${networkRequests.length}`);

    if (networkRequests.length === 0) {
      issues.push('No API requests made during registration - frontend not communicating with backend');
      fixes.push('Fix frontend API integration - check axios configuration and endpoints');
    }

    // 4. Test Database Data Retrieval
    console.log('\n4️⃣ TESTING DATABASE DATA RETRIEVAL');
    console.log('==================================');
    
    try {
      // Test business types endpoint
      const businessTypesResponse = await axios.get(`${API_URL}/business-types`, { timeout: 10000 });
      console.log(`✅ Business Types API: ${businessTypesResponse.status}`);
      console.log(`📊 Business Types Data: ${JSON.stringify(businessTypesResponse.data)}`);
      
      if (businessTypesResponse.data && businessTypesResponse.data.length > 0) {
        console.log('✅ Business types data retrieved from database');
      } else {
        issues.push('No business types data found in database');
        fixes.push('Populate business_types table with Hot Tub and other business categories');
      }
    } catch (error) {
      console.log(`❌ Business Types API Failed: ${error.message}`);
      issues.push(`Business Types API Failed: ${error.message}`);
      fixes.push('Create /api/business-types endpoint and populate database');
    }

    // 5. Test Dashboard Navigation Issue
    console.log('\n5️⃣ TESTING DASHBOARD NAVIGATION');
    console.log('===============================');
    
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // Check for navigation elements
    const navElements = await page.locator('nav, [role="navigation"]').count();
    const navButtons = await page.locator('[data-testid*="nav-"]').count();
    const quickActions = await page.locator('text="Quick Actions"').count();
    
    console.log(`🧭 Navigation elements: ${navElements}`);
    console.log(`🔘 Navigation buttons: ${navButtons}`);
    console.log(`⚡ Quick Actions section: ${quickActions}`);
    
    if (navElements === 0 && navButtons === 0) {
      issues.push('Dashboard navigation not rendering - component may not be updated in production');
      fixes.push('Verify Dashboard component deployment and navigation rendering');
    }

    // 6. Test Onboarding Business Types
    console.log('\n6️⃣ TESTING ONBOARDING BUSINESS TYPES');
    console.log('====================================');
    
    await page.goto(`${BASE_URL}/onboarding`);
    await page.waitForLoadState('networkidle');
    
    const businessTypeElements = await page.locator('input[type="radio"], button[data-value], .business-type').count();
    const hotTubText = await page.textContent('body');
    const hasHotTub = hotTubText.toLowerCase().includes('hot tub') || hotTubText.toLowerCase().includes('spa');
    
    console.log(`🏢 Business type elements: ${businessTypeElements}`);
    console.log(`🛁 Has Hot Tub content: ${hasHotTub}`);
    
    if (!hasHotTub && businessTypeElements === 0) {
      issues.push('Onboarding not loading business types from database');
      fixes.push('Fix onboarding component to fetch and display business types from API');
    }

    // 7. Test Authentication State
    console.log('\n7️⃣ TESTING AUTHENTICATION STATE');
    console.log('===============================');
    
    // Check if user can access protected routes
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(3000);
    
    const isOnLogin = page.url().includes('/login');
    const isOnDashboard = page.url().includes('/dashboard');
    
    console.log(`🔐 Redirected to login: ${isOnLogin}`);
    console.log(`📊 On dashboard: ${isOnDashboard}`);
    
    if (isOnLogin) {
      console.log('✅ Authentication protection working - redirected to login');
    } else if (isOnDashboard) {
      console.log('⚠️ Dashboard accessible without authentication - check auth state');
    }

  } catch (error) {
    console.error(`❌ Validation error: ${error.message}`);
    issues.push(`Validation error: ${error.message}`);
  } finally {
    if (browser) {
      console.log('\n🔍 Keeping browser open for 10 seconds for inspection...');
      const pages = await browser.pages();
      if (pages.length > 0) {
        await pages[0].waitForTimeout(10000);
      }
      await browser.close();
    }
  }

  // Generate comprehensive report
  console.log('\n📊 COMPREHENSIVE VALIDATION REPORT');
  console.log('===================================');
  console.log(`Issues Found: ${issues.length}`);
  console.log(`Fixes Identified: ${fixes.length}`);

  if (issues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES:');
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  }

  if (fixes.length > 0) {
    console.log('\n🔧 RECOMMENDED FIXES:');
    fixes.forEach((fix, index) => {
      console.log(`${index + 1}. ${fix}`);
    });
  }

  console.log('\n🎯 NEXT STEPS:');
  if (issues.length === 0) {
    console.log('✅ All systems operational - frontend and database communication working');
  } else {
    console.log('1. Address critical issues identified above');
    console.log('2. Implement recommended fixes');
    console.log('3. Re-run validation to confirm fixes');
    console.log('4. Deploy updated code to production');
  }

  return { issues, fixes };
}

// Run the comprehensive validation
if (require.main === module) {
  validateFrontendDatabaseCommunication().catch(console.error);
}

module.exports = { validateFrontendDatabaseCommunication };
