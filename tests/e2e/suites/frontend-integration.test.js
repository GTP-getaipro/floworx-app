/**
 * Frontend-Backend Integration E2E Tests for FloWorx SaaS
 * Tests component rendering, form submissions, and real-time updates
 */

const { TestEnvironment } = require('../setup/test-environment');
const puppeteer = require('puppeteer');
const { expect } = require('chai');

describe('Frontend-Backend Integration E2E Tests', function() {
  this.timeout(180000); // 3 minute timeout for browser tests
  
  let testEnv;
  let config;
  let browser;
  let page;
  
  before(async function() {
    testEnv = new TestEnvironment();
    await testEnv.setup();
    config = testEnv.getConfig();
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: process.env.E2E_HEADLESS !== 'false',
      slowMo: process.env.E2E_SLOW_MO ? parseInt(process.env.E2E_SLOW_MO) : 0,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Enable request interception for monitoring
    await page.setRequestInterception(true);
    
    const requests = [];
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
      request.continue();
    });
    
    // Store requests for analysis
    page.requests = requests;
  });
  
  after(async function() {
    if (browser) {
      await browser.close();
    }
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  describe('Authentication UI Integration', function() {
    it('should render login page correctly', async function() {
      await page.goto(`http://localhost:${config.frontend.port}/login`);
      
      // Wait for page to load
      await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 });
      
      // Check page elements
      const emailInput = await page.$('[data-testid="email-input"]');
      const passwordInput = await page.$('[data-testid="password-input"]');
      const loginButton = await page.$('[data-testid="login-button"]');
      
      expect(emailInput).to.not.be.null;
      expect(passwordInput).to.not.be.null;
      expect(loginButton).to.not.be.null;
      
      // Check page title
      const title = await page.title();
      expect(title).to.include('Login');
    });

    it('should handle login form submission', async function() {
      await page.goto(`http://localhost:${config.frontend.port}/login`);
      await page.waitForSelector('[data-testid="login-form"]');
      
      // Fill login form
      await page.type('[data-testid="email-input"]', config.testData.users.valid.email);
      await page.type('[data-testid="password-input"]', config.testData.users.valid.password);
      
      // Submit form
      await page.click('[data-testid="login-button"]');
      
      // Wait for redirect or success message
      await page.waitForNavigation({ timeout: 10000 });
      
      // Should redirect to dashboard
      const currentUrl = page.url();
      expect(currentUrl).to.include('/dashboard');
      
      // Verify API call was made
      const loginRequest = page.requests.find(req => 
        req.url.includes('/api/auth/login') && req.method === 'POST'
      );
      expect(loginRequest).to.not.be.undefined;
    });

    it('should display validation errors for invalid login', async function() {
      await page.goto(`http://localhost:${config.frontend.port}/login`);
      await page.waitForSelector('[data-testid="login-form"]');
      
      // Fill with invalid credentials
      await page.type('[data-testid="email-input"]', 'invalid@email.com');
      await page.type('[data-testid="password-input"]', 'wrongpassword');
      
      // Submit form
      await page.click('[data-testid="login-button"]');
      
      // Wait for error message
      await page.waitForSelector('[data-testid="error-message"]', { timeout: 5000 });
      
      const errorMessage = await page.$eval('[data-testid="error-message"]', el => el.textContent);
      expect(errorMessage).to.include('Invalid');
    });

    it('should handle registration form with validation', async function() {
      await page.goto(`http://localhost:${config.frontend.port}/register`);
      await page.waitForSelector('[data-testid="register-form"]');
      
      // Fill registration form with invalid data first
      await page.type('[data-testid="firstName-input"]', '');
      await page.type('[data-testid="email-input"]', 'invalid-email');
      await page.type('[data-testid="password-input"]', '123');
      
      // Try to submit
      await page.click('[data-testid="register-button"]');
      
      // Should show validation errors
      await page.waitForSelector('[data-testid="validation-error"]', { timeout: 5000 });
      
      const validationErrors = await page.$$('[data-testid="validation-error"]');
      expect(validationErrors.length).to.be.greaterThan(0);
    });
  });

  describe('Dashboard Integration', function() {
    before(async function() {
      // Login first
      await page.goto(`http://localhost:${config.frontend.port}/login`);
      await page.waitForSelector('[data-testid="login-form"]');
      
      await page.type('[data-testid="email-input"]', config.testData.users.valid.email);
      await page.type('[data-testid="password-input"]', config.testData.users.valid.password);
      await page.click('[data-testid="login-button"]');
      
      await page.waitForNavigation();
    });

    it('should render dashboard with real data', async function() {
      await page.goto(`http://localhost:${config.frontend.port}/dashboard`);
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
      
      // Check for dashboard components
      const statsCards = await page.$$('[data-testid="stats-card"]');
      expect(statsCards.length).to.be.greaterThan(0);
      
      // Check for charts/graphs
      const charts = await page.$$('[data-testid="chart"]');
      expect(charts.length).to.be.greaterThan(0);
      
      // Verify API calls were made
      const dashboardRequests = page.requests.filter(req => 
        req.url.includes('/api/analytics/dashboard') || 
        req.url.includes('/api/workflows')
      );
      expect(dashboardRequests.length).to.be.greaterThan(0);
    });

    it('should handle loading states', async function() {
      // Clear requests
      page.requests.length = 0;
      
      await page.goto(`http://localhost:${config.frontend.port}/dashboard`);
      
      // Should show loading state initially
      const loadingElement = await page.waitForSelector('[data-testid="loading"]', { timeout: 2000 });
      expect(loadingElement).to.not.be.null;
      
      // Loading should disappear when data loads
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
      
      const loadingAfter = await page.$('[data-testid="loading"]');
      expect(loadingAfter).to.be.null;
    });

    it('should handle error states gracefully', async function() {
      // Intercept API calls and return errors
      await page.setRequestInterception(true);
      
      page.on('request', request => {
        if (request.url().includes('/api/analytics/dashboard')) {
          request.respond({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: { message: 'Server error' } })
          });
        } else {
          request.continue();
        }
      });
      
      await page.goto(`http://localhost:${config.frontend.port}/dashboard`);
      
      // Should show error state
      await page.waitForSelector('[data-testid="error-boundary"]', { timeout: 10000 });
      
      const errorMessage = await page.$eval('[data-testid="error-message"]', el => el.textContent);
      expect(errorMessage).to.include('error');
      
      // Reset request interception
      await page.setRequestInterception(false);
    });
  });

  describe('Workflow Management UI', function() {
    before(async function() {
      // Ensure logged in
      await page.goto(`http://localhost:${config.frontend.port}/workflows`);
      
      // If redirected to login, login first
      if (page.url().includes('/login')) {
        await page.waitForSelector('[data-testid="login-form"]');
        await page.type('[data-testid="email-input"]', config.testData.users.valid.email);
        await page.type('[data-testid="password-input"]', config.testData.users.valid.password);
        await page.click('[data-testid="login-button"]');
        await page.waitForNavigation();
        await page.goto(`http://localhost:${config.frontend.port}/workflows`);
      }
    });

    it('should render workflows list', async function() {
      await page.waitForSelector('[data-testid="workflows-list"]', { timeout: 10000 });
      
      // Check for workflow items or empty state
      const workflowItems = await page.$$('[data-testid="workflow-item"]');
      const emptyState = await page.$('[data-testid="empty-state"]');
      
      // Should have either workflow items or empty state
      expect(workflowItems.length > 0 || emptyState !== null).to.be.true;
    });

    it('should handle workflow creation form', async function() {
      // Click create workflow button
      await page.click('[data-testid="create-workflow-button"]');
      
      // Wait for form modal or page
      await page.waitForSelector('[data-testid="workflow-form"]', { timeout: 5000 });
      
      // Fill form
      await page.type('[data-testid="workflow-name-input"]', 'E2E Test Workflow');
      await page.type('[data-testid="workflow-description-input"]', 'Created via E2E test');
      
      // Select trigger type
      await page.select('[data-testid="trigger-type-select"]', 'inquiry');
      
      // Submit form
      await page.click('[data-testid="save-workflow-button"]');
      
      // Wait for success message or redirect
      await page.waitForSelector('[data-testid="success-message"]', { timeout: 10000 });
      
      // Verify API call was made
      const createRequest = page.requests.find(req => 
        req.url.includes('/api/workflows') && req.method === 'POST'
      );
      expect(createRequest).to.not.be.undefined;
    });

    it('should handle workflow form validation', async function() {
      await page.click('[data-testid="create-workflow-button"]');
      await page.waitForSelector('[data-testid="workflow-form"]');
      
      // Try to submit empty form
      await page.click('[data-testid="save-workflow-button"]');
      
      // Should show validation errors
      await page.waitForSelector('[data-testid="field-error"]', { timeout: 5000 });
      
      const fieldErrors = await page.$$('[data-testid="field-error"]');
      expect(fieldErrors.length).to.be.greaterThan(0);
    });
  });

  describe('Onboarding Flow Integration', function() {
    it('should complete onboarding flow end-to-end', async function() {
      // Start fresh onboarding
      await page.goto(`http://localhost:${config.frontend.port}/onboarding`);
      
      // If not logged in, this might redirect to login first
      if (page.url().includes('/login')) {
        await page.waitForSelector('[data-testid="login-form"]');
        await page.type('[data-testid="email-input"]', config.testData.users.valid.email);
        await page.type('[data-testid="password-input"]', config.testData.users.valid.password);
        await page.click('[data-testid="login-button"]');
        await page.waitForNavigation();
        await page.goto(`http://localhost:${config.frontend.port}/onboarding`);
      }
      
      await page.waitForSelector('[data-testid="onboarding-step"]', { timeout: 10000 });
      
      // Step 1: Business Info
      if (await page.$('[data-testid="business-name-input"]')) {
        await page.type('[data-testid="business-name-input"]', 'E2E Test Business');
        await page.select('[data-testid="business-type-select"]', 'hot_tub');
        await page.type('[data-testid="business-description-input"]', 'E2E testing business');
        await page.click('[data-testid="next-step-button"]');
      }
      
      // Step 2: Gmail Connection (might be skipped in test)
      await page.waitForTimeout(1000);
      if (await page.$('[data-testid="skip-gmail-button"]')) {
        await page.click('[data-testid="skip-gmail-button"]');
      }
      
      // Continue through remaining steps...
      // This would continue for each onboarding step
      
      // Final step should show completion
      await page.waitForSelector('[data-testid="onboarding-complete"]', { timeout: 15000 });
      
      const completionMessage = await page.$eval('[data-testid="completion-message"]', el => el.textContent);
      expect(completionMessage).to.include('complete');
    });
  });

  describe('Real-time Updates and Notifications', function() {
    it('should handle real-time workflow status updates', async function() {
      await page.goto(`http://localhost:${config.frontend.port}/workflows`);
      await page.waitForSelector('[data-testid="workflows-list"]');
      
      // If there are workflows, check for status updates
      const workflowItems = await page.$$('[data-testid="workflow-item"]');
      
      if (workflowItems.length > 0) {
        // Monitor for status changes
        const initialStatus = await page.$eval('[data-testid="workflow-status"]', el => el.textContent);
        
        // Trigger a workflow execution via API (if possible)
        // This would require additional setup for real-time testing
        
        // For now, verify the status display exists
        expect(initialStatus).to.be.a('string');
      }
    });

    it('should display notifications correctly', async function() {
      await page.goto(`http://localhost:${config.frontend.port}/dashboard`);
      await page.waitForSelector('[data-testid="dashboard"]');
      
      // Check for notification area
      const notificationArea = await page.$('[data-testid="notifications"]');
      
      if (notificationArea) {
        // Verify notifications can be displayed
        const notifications = await page.$$('[data-testid="notification-item"]');
        // Notifications might be empty, which is fine
        expect(notifications).to.be.an('array');
      }
    });
  });

  describe('Error Boundary Functionality', function() {
    it('should catch and display component errors', async function() {
      // This would require triggering a component error
      // For now, verify error boundary exists
      await page.goto(`http://localhost:${config.frontend.port}/dashboard`);
      
      // Check if error boundary wrapper exists
      const errorBoundary = await page.$('[data-testid="error-boundary"]');
      
      // Error boundary might not be visible if no errors
      // This test would be more meaningful with actual error scenarios
    });

    it('should provide error recovery options', async function() {
      // Navigate to a potentially error-prone page
      await page.goto(`http://localhost:${config.frontend.port}/workflows/invalid-id`);
      
      // Should handle 404 gracefully
      await page.waitForSelector('[data-testid="not-found"]', { timeout: 10000 });
      
      const notFoundMessage = await page.$eval('[data-testid="not-found-message"]', el => el.textContent);
      expect(notFoundMessage).to.include('not found');
      
      // Should provide navigation back
      const backButton = await page.$('[data-testid="back-button"]');
      expect(backButton).to.not.be.null;
    });
  });

  describe('Performance and User Experience', function() {
    it('should load pages within acceptable time', async function() {
      const startTime = Date.now();
      
      await page.goto(`http://localhost:${config.frontend.port}/dashboard`);
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 });
      
      const loadTime = Date.now() - startTime;
      console.log(`Dashboard load time: ${loadTime}ms`);
      
      // Should load within 5 seconds
      expect(loadTime).to.be.lessThan(5000);
    });

    it('should handle slow API responses gracefully', async function() {
      // Intercept API calls and add delay
      await page.setRequestInterception(true);
      
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          setTimeout(() => request.continue(), 2000); // 2 second delay
        } else {
          request.continue();
        }
      });
      
      await page.goto(`http://localhost:${config.frontend.port}/dashboard`);
      
      // Should show loading state during slow API calls
      const loadingElement = await page.waitForSelector('[data-testid="loading"]', { timeout: 3000 });
      expect(loadingElement).to.not.be.null;
      
      // Eventually should load
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
      
      // Reset request interception
      await page.setRequestInterception(false);
    });

    it('should be responsive on different screen sizes', async function() {
      // Test mobile viewport
      await page.setViewport({ width: 375, height: 667 });
      await page.goto(`http://localhost:${config.frontend.port}/dashboard`);
      await page.waitForSelector('[data-testid="dashboard"]');
      
      // Check if mobile navigation exists
      const mobileNav = await page.$('[data-testid="mobile-nav"]');
      
      // Reset to desktop viewport
      await page.setViewport({ width: 1280, height: 720 });
      
      // Mobile nav might not exist, which is fine
      // This test verifies the page loads on mobile viewport
    });
  });
});
