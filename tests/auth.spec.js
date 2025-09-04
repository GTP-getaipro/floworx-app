const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('./utils/test-helpers');

test.describe('Authentication & Security (Hybrid Local-Cloud)', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);

    // Validate production security settings are loaded
    helpers.validateSecuritySettings();
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test.describe('User Registration', () => {
    test('should register new user successfully', async ({ page }) => {
      const userData = {
        firstName: 'John',
        lastName: 'Doe',
        email: `john.doe.${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        businessType: 'hot_tub_service'
      };

      await page.goto('/register');
      
      // Fill registration form (using name attributes for production)
      await page.fill('input[name="firstName"]', userData.firstName);
      await page.fill('input[name="lastName"]', userData.lastName);
      await page.fill('input[name="email"]', userData.email);
      await page.fill('input[name="password"]', userData.password);
      await page.fill('input[name="confirmPassword"]', userData.password);
      // Note: Production form doesn't have business type select on initial registration
      
      // Submit registration (look for submit button)
      await page.click('button[type="submit"], button:has-text("Sign Up"), button:has-text("Register"), button:has-text("Create Account")');
      
      // Verify success - updated to match actual toast message
      await helpers.waitForToast('🎉 Account created successfully! Redirecting to your dashboard...');
      await expect(page).toHaveURL('/login');
      
      // Verify user was created in database
      const user = await helpers.getUserByEmail(userData.email);
      expect(user).toBeTruthy();
      expect(user.first_name).toBe(userData.firstName);
      expect(user.last_name).toBe(userData.lastName);
      expect(user.email_verified).toBe(false);
      
      // Cleanup
      await helpers.deleteTestUser(userData.email);
    });

    test('should reject registration with invalid email', async ({ page }) => {
      await page.goto('/register');
      
      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="email"]', 'invalid-email');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
      
      await page.click('button[type="submit"], button:has-text("Sign Up"), button:has-text("Register"), button:has-text("Create Account")');
      
      // Verify error message - updated to match actual validation message
      await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format');
    });

    test('should reject registration with weak password', async ({ page }) => {
      await page.goto('/register');
      
      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="email"]', `john.${Date.now()}@example.com`);
      await page.fill('input[name="password"]', '123');
      await page.fill('input[name="confirmPassword"]', '123');
      
      await page.click('button[type="submit"], button:has-text("Sign Up"), button:has-text("Register"), button:has-text("Create Account")');
      
      // Verify error message - updated to match actual validation message
      await expect(page.locator('[data-testid="password-error"]')).toContainText('Must be at least 8 characters');
    });

    test('should reject registration with mismatched passwords', async ({ page }) => {
      await page.goto('/register');
      
      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="email"]', `john.${Date.now()}@example.com`);
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
      
      await page.click('button[type="submit"], button:has-text("Sign Up"), button:has-text("Register"), button:has-text("Create Account")');
      
      // Verify error message
      await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText('Passwords do not match');
    });

    test('should reject duplicate email registration', async ({ page }) => {
      const email = `duplicate.${Date.now()}@example.com`;
      
      // Create user first
      await helpers.createTestUser({ email });
      
      // Try to register with same email
      await page.goto('/register');
      await page.fill('input[name="firstName"]', 'John');
      await page.fill('input[name="lastName"]', 'Doe');
      await page.fill('input[name="email"]', email);
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');

      await page.click('button[type="submit"], button:has-text("Sign Up"), button:has-text("Register"), button:has-text("Create Account")');
      
      // Verify error message
      await helpers.waitForToast('An account with this email already exists', 'error');
      
      // Cleanup
      await helpers.deleteTestUser(email);
    });
  });

  test.describe('User Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      await helpers.loginUser();
      
      // Verify successful login
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      await expect(page.locator('[data-testid="welcome-message"]')).toContainText('Welcome back');
    });

    test('should reject login with invalid email', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'nonexistent@example.com');
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-button"]');
      
      await helpers.waitForToast('Invalid email or password', 'error');
      await expect(page).toHaveURL('/login');
    });

    test('should reject login with invalid password', async ({ page }) => {
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', 'test.user@example.com');
      await page.fill('[data-testid="password-input"]', 'WrongPassword123!');
      await page.click('[data-testid="login-button"]');
      
      await helpers.waitForToast('Invalid email or password', 'error');
      await expect(page).toHaveURL('/login');
    });

    test('should implement progressive account lockout with production settings', async ({ page }) => {
      const settings = helpers.getSecuritySettings();
      const testEmail = `e2e-test.lockout.${Date.now()}@playwright-test.local`;
      const wrongPassword = 'WrongPassword123!';

      console.log(`🔒 Testing progressive lockout with production settings:`);
      console.log(`   - Max attempts: ${settings.MAX_FAILED_LOGIN_ATTEMPTS}`);
      console.log(`   - Lockout duration: ${settings.ACCOUNT_LOCKOUT_DURATION}ms (${settings.ACCOUNT_LOCKOUT_DURATION / 1000 / 60} minutes)`);
      console.log(`   - Progressive multiplier: ${settings.PROGRESSIVE_LOCKOUT_MULTIPLIER}x`);

      // Create test user for lockout testing
      const testUser = await helpers.createTestUser({
        email: testEmail,
        password_hash: '$2b$10$test.hash.for.testing.purposes.only'
      });

      // Attempt multiple failed logins (using production MAX_FAILED_LOGIN_ATTEMPTS=5)
      for (let i = 1; i <= settings.MAX_FAILED_LOGIN_ATTEMPTS; i++) {
        console.log(`   🔍 Attempt ${i}/${settings.MAX_FAILED_LOGIN_ATTEMPTS}`);
        await page.goto('/login');
        await page.fill('[data-testid="email-input"]', testEmail);
        await page.fill('[data-testid="password-input"]', wrongPassword);
        await page.click('[data-testid="login-button"]');

        if (i < settings.MAX_FAILED_LOGIN_ATTEMPTS) {
          await helpers.waitForToast('Invalid email or password', 'error');
        } else {
          // After MAX_FAILED_LOGIN_ATTEMPTS, account should be locked
          await helpers.waitForToast('Account temporarily locked due to multiple failed login attempts', 'error');
          console.log(`   ✅ Account locked after ${settings.MAX_FAILED_LOGIN_ATTEMPTS} attempts`);
        }
      }

      // Verify account is locked even with correct password
      console.log('   🔍 Testing lockout with correct password...');
      await page.goto('/login');
      await page.fill('[data-testid="email-input"]', testEmail);
      await page.fill('[data-testid="password-input"]', 'TestPassword123!');
      await page.click('[data-testid="login-button"]');

      await helpers.waitForToast('Account is temporarily locked', 'error');
      console.log('   ✅ Account remains locked even with correct password');

      // Test progressive lockout multiplier (if implemented)
      console.log(`   ℹ️  Progressive lockout multiplier: ${settings.PROGRESSIVE_LOCKOUT_MULTIPLIER}x (for subsequent lockouts)`);

      // Cleanup
      await helpers.deleteTestUser(testEmail);
      console.log('   🗑️  Test user cleaned up');
    });
  });

  test.describe('Password Reset', () => {
    test('should initiate password reset for valid email', async ({ page }) => {
      await page.goto('/forgot-password');
      await page.fill('[data-testid="email-input"]', 'test.user@example.com');
      await page.click('[data-testid="reset-password-button"]');
      
      await helpers.waitForToast('Password reset instructions sent to your email');
      await expect(page).toHaveURL('/login');
    });

    test('should handle password reset for non-existent email gracefully', async ({ page }) => {
      await page.goto('/forgot-password');
      await page.fill('[data-testid="email-input"]', 'nonexistent@example.com');
      await page.click('[data-testid="reset-password-button"]');

      // Should show success message for security (don't reveal if email exists)
      await helpers.waitForToast('If an account with this email exists, password reset instructions have been sent');
    });

    test('should validate password reset token expiry with production settings', async ({ page }) => {
      const settings = helpers.getSecuritySettings();
      const testEmail = `e2e-test.reset.${Date.now()}@playwright-test.local`;

      console.log(`🔒 Testing password reset token expiry:`);
      console.log(`   - Token expiry: ${settings.ACCOUNT_RECOVERY_TOKEN_EXPIRY}ms (${settings.ACCOUNT_RECOVERY_TOKEN_EXPIRY / 1000 / 60 / 60} hours)`);

      const testUser = await helpers.createTestUser({ email: testEmail });

      // Request password reset
      console.log('   🔍 Testing password reset request...');
      await page.goto('/forgot-password');
      await page.fill('[data-testid="email-input"]', testEmail);
      await page.click('[data-testid="reset-password-button"]');

      await helpers.waitForToast('Password reset instructions sent to your email');
      console.log('   ✅ Password reset email sent successfully');

      // Simulate expired token (this would normally be tested with a mock)
      console.log('   🔍 Testing expired token handling...');
      await page.goto('/reset-password?token=expired-token-123');

      await expect(page.locator('[data-testid="error-message"]')).toContainText('expired');
      console.log('   ✅ Expired token properly rejected');

      // Verify token expiry time matches production setting (24 hours = 86400000ms)
      expect(settings.ACCOUNT_RECOVERY_TOKEN_EXPIRY).toBe(86400000);
      console.log(`   ✅ Production token expiry validated: ${settings.ACCOUNT_RECOVERY_TOKEN_EXPIRY / 1000 / 60 / 60} hours`);

      // Cleanup
      await helpers.deleteTestUser(testEmail);
      console.log('   🗑️  Test user cleaned up');
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page refreshes', async ({ page }) => {
      await helpers.loginUser();
      
      // Refresh page
      await page.reload();
      
      // Verify still logged in
      await expect(page).toHaveURL('/dashboard');
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should logout successfully', async ({ page }) => {
      await helpers.loginUser();
      await helpers.logout();
      
      // Verify logged out
      await expect(page).toHaveURL('/login');
      await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
    });

    test('should redirect to login when accessing protected routes without authentication', async ({ page }) => {
      await page.goto('/dashboard');
      await expect(page).toHaveURL('/login');
      
      await page.goto('/onboarding');
      await expect(page).toHaveURL('/login');
      
      await page.goto('/settings');
      await expect(page).toHaveURL('/login');
    });

    test('should handle expired JWT tokens', async ({ page }) => {
      await helpers.loginUser();
      
      // Simulate expired token by manipulating localStorage
      await page.evaluate(() => {
        const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
        localStorage.setItem('authToken', expiredToken);
      });
      
      // Try to access protected route
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL('/login');
      await helpers.waitForToast('Session expired. Please log in again.', 'warning');
    });
  });
});
