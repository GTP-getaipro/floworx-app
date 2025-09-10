/**
 * Production Test Suite for FloWorx Application
 * Tests critical functionality and identifies bugs
 */
/* eslint-disable no-console, require-await */

const { test, expect } = require('@playwright/test');

// Configure for production testing
test.use({
  baseURL: 'https://app.floworx-iq.com'
});

test.describe('FloWorx Production Test Suite', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set up console error tracking
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Console Error:', msg.text());
      }
    });
    
    // Track network failures
    page.on('response', response => {
      if (response.status() >= 400) {
        console.warn(`HTTP ${response.status()}: ${response.url()}`);
      }
    });
  });

  test('Login Page - Basic Functionality', async ({ page }) => {
    await page.goto('/login');
    
    // Check page loads
    await expect(page).toHaveTitle(/Floworx/);
    await expect(page.locator('h2')).toContainText('Sign In to Floworx');
    
    // Test form validation
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('This field is required');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('This field is required');
    
    // Test invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'test');
    await page.click('[data-testid="login-button"]');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email address');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Must be at least 8 characters');
    
    // Test valid format but invalid credentials
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    // Check for login failed message (could be in alert or toast)
    await expect(page.locator('[data-testid="toast-error"], [role="alert"]').first()).toContainText('Login failed');
  });

  test('Registration Page - Form Validation', async ({ page }) => {
    await page.goto('/register');
    
    // Check page loads
    await expect(page.locator('h2')).toContainText('Create Your Floworx Account');
    
    // Test empty form submission
    await page.click('button:has-text("Create Account")');
    await expect(page.locator('[data-testid="first-name-error"]')).toContainText('This field is required');
    await expect(page.locator('[data-testid="last-name-error"]')).toContainText('This field is required');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('This field is required');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('This field is required');
    await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText('This field is required');
    
    // Test password strength validation
    await page.fill('[data-testid="first-name-input"]', 'John');
    await page.fill('[data-testid="last-name-input"]', 'Doe');
    await page.fill('[data-testid="email-input"]', 'john@example.com');
    await page.fill('[data-testid="password-input"]', 'weak');
    await page.fill('[data-testid="confirm-password-input"]', 'weak');
    await page.click('button:has-text("Create Account")');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Must be at least 8 characters');
  });

  test('Navigation Links', async ({ page }) => {
    await page.goto('/login');
    
    // Test forgot password link
    await page.click('text=Forgot your password?');
    await expect(page).toHaveURL(/forgot-password/);
    await expect(page.locator('h2')).toContainText('Reset Your Password');
    
    // Test registration link
    await page.click('text=Create one here');
    await expect(page).toHaveURL(/register/);
    await expect(page.locator('h2')).toContainText('Create Your Floworx Account');
    
    // Test back to login
    await page.click('text=Sign in here');
    await expect(page).toHaveURL(/login/);
  });

  test('API Health Check', async ({ page }) => {
    await page.goto('/login');
    
    const healthResponse = await page.evaluate(async () => {
      const response = await fetch('/api/health');
      return {
        status: response.status,
        data: await response.json()
      };
    });
    
    expect(healthResponse.status).toBe(200);
    expect(healthResponse.data).toHaveProperty('status', 'ok');
    expect(healthResponse.data).toHaveProperty('version');
    expect(healthResponse.data).toHaveProperty('environment', 'production');
  });

  test('Mobile Responsiveness', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    
    // Check elements are visible and accessible on mobile
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    
    // Test registration page on mobile
    await page.goto('/register');
    await expect(page.locator('[data-testid="first-name-input"]')).toBeVisible();
    await expect(page.locator('button:has-text("Create Account")')).toBeVisible();
  });

  test('Security Headers and HTTPS', async ({ page }) => {
    const response = await page.goto('/login');
    
    // Check HTTPS is enforced
    expect(page.url()).toMatch(/^https:/);
    
    // Check for security headers (basic check)
    const headers = response.headers();
    console.log('Security Headers Check:', {
      'content-type': headers['content-type'],
      'x-frame-options': headers['x-frame-options'],
      'x-content-type-options': headers['x-content-type-options']
    });
  });

  test('Performance - Page Load Times', async ({ page }) => {
    // Test login page load time with detailed metrics
    const loginStart = Date.now();
    await page.goto('/login');

    // Wait for critical content to be visible (form elements)
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    const criticalContentTime = Date.now() - loginStart;

    // Wait for full page load
    await page.waitForLoadState('networkidle');
    const fullLoadTime = Date.now() - loginStart;

    console.log(`Login page critical content: ${criticalContentTime}ms`);
    console.log(`Login page full load time: ${fullLoadTime}ms`);

    // Test registration page load time
    const regStart = Date.now();
    await page.goto('/register');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    const regCriticalTime = Date.now() - regStart;
    await page.waitForLoadState('networkidle');
    const regFullTime = Date.now() - regStart;

    console.log(`Registration page critical content: ${regCriticalTime}ms`);
    console.log(`Registration page full load time: ${regFullTime}ms`);

    // Performance assertions (reasonable thresholds for production)
    expect(criticalContentTime).toBeLessThan(3000); // Critical content in 3 seconds
    expect(fullLoadTime).toBeLessThan(6000);        // Full load in 6 seconds
    expect(regCriticalTime).toBeLessThan(2000);     // Registration critical in 2 seconds
    expect(regFullTime).toBeLessThan(4000);         // Registration full in 4 seconds
  });

});
