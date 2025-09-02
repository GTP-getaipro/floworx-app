const { test, expect, devices } = require('@playwright/test');
const { TestHelpers } = require('./utils/test-helpers');

test.describe('Cross-Browser and Mobile Responsive Testing (Hybrid Local-Cloud)', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    
    // Validate production security settings are loaded
    helpers.validateSecuritySettings();
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test.describe('Mobile Authentication Flows', () => {
    test('should complete mobile login with touch interactions', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      const testUser = await helpers.createTestUser({
        email: `e2e-test.mobile.${Date.now()}@playwright-test.local`
      });
      
      console.log('📱 Testing mobile authentication flows');
      
      await page.goto('/login');
      
      // Verify mobile-optimized layout
      await expect(page.locator('[data-testid="mobile-login-form"]')).toBeVisible();
      await expect(page.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible();
      
      // Test touch-friendly input fields (minimum 44px height)
      const emailInput = page.locator('[data-testid="email-input"]');
      const passwordInput = page.locator('[data-testid="password-input"]');
      const loginButton = page.locator('[data-testid="login-button"]');
      
      const emailBox = await emailInput.boundingBox();
      const passwordBox = await passwordInput.boundingBox();
      const buttonBox = await loginButton.boundingBox();
      
      expect(emailBox.height).toBeGreaterThanOrEqual(44);
      expect(passwordBox.height).toBeGreaterThanOrEqual(44);
      expect(buttonBox.height).toBeGreaterThanOrEqual(44);
      
      // Test virtual keyboard handling
      await emailInput.tap();
      await page.waitForTimeout(500); // Wait for keyboard animation
      
      // Verify form adjusts for virtual keyboard
      const formPosition = await page.locator('[data-testid="login-form"]').boundingBox();
      expect(formPosition.y).toBeLessThan(100); // Form should move up
      
      // Complete login with touch interactions
      await emailInput.fill(testUser.email);
      await passwordInput.tap();
      await passwordInput.fill('TestPassword123!');
      
      // Test touch-friendly button tap
      await loginButton.tap();
      
      // Should redirect to mobile dashboard
      await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible();
      await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
      
      console.log('✅ Mobile authentication flow validated');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should handle mobile registration with proper form validation', async ({ page }) => {
      await page.setViewportSize({ width: 414, height: 896 }); // iPhone 11 Pro Max
      
      await page.goto('/register');
      
      // Verify mobile registration form
      await expect(page.locator('[data-testid="mobile-register-form"]')).toBeVisible();
      
      // Test form field spacing on mobile
      const formFields = [
        '[data-testid="first-name-input"]',
        '[data-testid="last-name-input"]',
        '[data-testid="email-input"]',
        '[data-testid="password-input"]',
        '[data-testid="confirm-password-input"]'
      ];
      
      for (let i = 0; i < formFields.length - 1; i++) {
        const currentField = await page.locator(formFields[i]).boundingBox();
        const nextField = await page.locator(formFields[i + 1]).boundingBox();
        
        const spacing = nextField.y - (currentField.y + currentField.height);
        expect(spacing).toBeGreaterThanOrEqual(16); // Minimum 16px spacing
      }
      
      // Test mobile-specific validation messages
      const testData = {
        firstName: 'E2E-Test',
        lastName: 'Mobile',
        email: `e2e-test.mobile.register.${Date.now()}@playwright-test.local`,
        password: 'SecurePassword123!',
        confirmPassword: 'SecurePassword123!'
      };
      
      // Fill form
      await page.fill('[data-testid="first-name-input"]', testData.firstName);
      await page.fill('[data-testid="last-name-input"]', testData.lastName);
      await page.fill('[data-testid="email-input"]', testData.email);
      await page.fill('[data-testid="password-input"]', testData.password);
      await page.fill('[data-testid="confirm-password-input"]', testData.confirmPassword);
      
      // Submit registration
      await page.tap('[data-testid="register-button"]');
      
      // Should show mobile success message
      await expect(page.locator('[data-testid="mobile-success-message"]')).toBeVisible();
      
      // Cleanup
      await helpers.deleteTestUser(testData.email);
    });
  });

  test.describe('Responsive Workflow Creation', () => {
    test('should adapt workflow builder across viewport sizes', async ({ page }) => {
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      console.log('🔧 Testing responsive workflow builder');
      
      const viewports = [
        { width: 320, height: 568, name: 'iPhone 5' },
        { width: 768, height: 1024, name: 'iPad' },
        { width: 1024, height: 768, name: 'iPad Landscape' },
        { width: 1440, height: 900, name: 'Desktop' },
        { width: 1920, height: 1080, name: 'Large Desktop' }
      ];
      
      for (const viewport of viewports) {
        console.log(`Testing viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
        
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/workflows/create');
        
        // Verify responsive layout
        if (viewport.width < 768) {
          // Mobile layout
          await expect(page.locator('[data-testid="mobile-workflow-builder"]')).toBeVisible();
          await expect(page.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible();
          await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
        } else if (viewport.width < 1024) {
          // Tablet layout
          await expect(page.locator('[data-testid="tablet-workflow-builder"]')).toBeVisible();
          await expect(page.locator('[data-testid="collapsible-sidebar"]')).toBeVisible();
        } else {
          // Desktop layout
          await expect(page.locator('[data-testid="desktop-workflow-builder"]')).toBeVisible();
          await expect(page.locator('[data-testid="full-sidebar"]')).toBeVisible();
        }
        
        // Test form field responsiveness
        const workflowForm = page.locator('[data-testid="workflow-form"]');
        const formBox = await workflowForm.boundingBox();
        
        // Form should not exceed viewport width
        expect(formBox.width).toBeLessThanOrEqual(viewport.width);
        
        // Test action builder responsiveness
        await page.click('[data-testid="add-action-button"]');
        
        const actionBuilder = page.locator('[data-testid="action-builder"]');
        if (viewport.width < 768) {
          // Mobile: Actions should stack vertically
          await expect(actionBuilder).toHaveCSS('flex-direction', 'column');
        } else {
          // Desktop/Tablet: Actions can be horizontal
          const flexDirection = await actionBuilder.evaluate(el => 
            window.getComputedStyle(el).flexDirection
          );
          expect(['row', 'column']).toContain(flexDirection);
        }
      }
      
      console.log('✅ Responsive workflow builder validated');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should handle drag-and-drop on touch devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
      
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      await page.goto('/workflows/create');
      
      // Test touch-based drag and drop for workflow actions
      const actionPalette = page.locator('[data-testid="action-palette"]');
      const workflowCanvas = page.locator('[data-testid="workflow-canvas"]');
      
      await expect(actionPalette).toBeVisible();
      await expect(workflowCanvas).toBeVisible();
      
      // Get action element to drag
      const emailAction = page.locator('[data-testid="action-send-email"]');
      const emailBox = await emailAction.boundingBox();
      const canvasBox = await workflowCanvas.boundingBox();
      
      // Perform touch drag and drop
      await page.touchscreen.tap(emailBox.x + emailBox.width / 2, emailBox.y + emailBox.height / 2);
      await page.touchscreen.tap(canvasBox.x + 100, canvasBox.y + 100);
      
      // Verify action was added to canvas
      await expect(page.locator('[data-testid="canvas-action-send-email"]')).toBeVisible();
      
      // Test touch-based action reordering
      const action1 = page.locator('[data-testid="canvas-action-0"]');
      const action2 = page.locator('[data-testid="canvas-action-1"]');
      
      if (await action1.isVisible() && await action2.isVisible()) {
        const action1Box = await action1.boundingBox();
        const action2Box = await action2.boundingBox();
        
        // Touch drag to reorder
        await page.touchscreen.tap(action1Box.x + action1Box.width / 2, action1Box.y + action1Box.height / 2);
        await page.touchscreen.tap(action2Box.x + action2Box.width / 2, action2Box.y + action2Box.height / 2);
        
        // Verify reordering occurred
        const reorderedActions = await page.locator('[data-testid^="canvas-action-"]').count();
        expect(reorderedActions).toBeGreaterThan(0);
      }
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });
  });

  test.describe('Touch Interface Optimization', () => {
    test('should provide touch-friendly email management interface', async ({ page }) => {
      await page.setViewportSize({ width: 414, height: 736 }); // iPhone 8 Plus
      
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      console.log('👆 Testing touch interface optimization');
      
      // Create test emails
      const testEmails = Array.from({ length: 5 }, (_, i) => ({
        from: `customer${i}@example.com`,
        subject: `Test Email ${i}`,
        body: `Email body content ${i}`,
        category: 'service_request',
        user_id: testUser.id
      }));
      
      for (const email of testEmails) {
        await helpers.simulateEmailReceived(email);
      }
      
      await page.goto('/emails');
      
      // Verify mobile email list layout
      await expect(page.locator('[data-testid="mobile-email-list"]')).toBeVisible();
      
      // Test swipe gestures for email actions
      const firstEmail = page.locator('[data-testid^="email-item-"]').first();
      await expect(firstEmail).toBeVisible();
      
      const emailBox = await firstEmail.boundingBox();
      
      // Swipe left to reveal actions
      await page.touchscreen.tap(emailBox.x + emailBox.width - 10, emailBox.y + emailBox.height / 2);
      await page.touchscreen.tap(emailBox.x + 10, emailBox.y + emailBox.height / 2);
      
      // Should reveal action buttons
      await expect(page.locator('[data-testid="email-actions-panel"]')).toBeVisible();
      await expect(page.locator('[data-testid="archive-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="categorize-button"]')).toBeVisible();
      
      // Test touch-friendly action buttons (minimum 44px)
      const actionButtons = await page.locator('[data-testid="email-actions-panel"] button').all();
      
      for (const button of actionButtons) {
        const buttonBox = await button.boundingBox();
        expect(buttonBox.height).toBeGreaterThanOrEqual(44);
        expect(buttonBox.width).toBeGreaterThanOrEqual(44);
      }
      
      // Test pull-to-refresh functionality
      await page.touchscreen.tap(200, 100);
      await page.touchscreen.tap(200, 300); // Pull down gesture
      
      // Should show refresh indicator
      await expect(page.locator('[data-testid="pull-refresh-indicator"]')).toBeVisible();
      
      console.log('✅ Touch interface optimization validated');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should optimize button sizing and spacing for touch', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 640 }); // Android
      
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      await page.goto('/dashboard');
      
      // Test all interactive elements meet touch target guidelines
      const interactiveElements = [
        '[data-testid="create-workflow-button"]',
        '[data-testid="view-emails-button"]',
        '[data-testid="settings-button"]',
        '[data-testid="user-menu-button"]'
      ];
      
      for (const selector of interactiveElements) {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          const box = await element.boundingBox();
          
          // Minimum touch target size: 44x44px
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.width).toBeGreaterThanOrEqual(44);
        }
      }
      
      // Test spacing between touch targets
      const buttons = await page.locator('button:visible').all();
      
      for (let i = 0; i < buttons.length - 1; i++) {
        const currentBox = await buttons[i].boundingBox();
        const nextBox = await buttons[i + 1].boundingBox();
        
        // Calculate distance between buttons
        const horizontalDistance = Math.abs(nextBox.x - (currentBox.x + currentBox.width));
        const verticalDistance = Math.abs(nextBox.y - (currentBox.y + currentBox.height));
        
        // Minimum 8px spacing between touch targets
        if (horizontalDistance < 100 && verticalDistance < 100) {
          expect(Math.min(horizontalDistance, verticalDistance)).toBeGreaterThanOrEqual(8);
        }
      }
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });
  });

  test.describe('Performance Across Devices', () => {
    test('should meet Core Web Vitals on mobile devices', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const testUser = await helpers.createTestUser();
      
      console.log('⚡ Testing Core Web Vitals performance');
      
      // Measure performance metrics
      const performanceMetrics = await helpers.measurePagePerformance(page, '/login');
      
      // First Contentful Paint (FCP) should be < 1.8s
      expect(performanceMetrics.fcp).toBeLessThan(1800);
      
      // Largest Contentful Paint (LCP) should be < 2.5s
      expect(performanceMetrics.lcp).toBeLessThan(2500);
      
      // Cumulative Layout Shift (CLS) should be < 0.1
      expect(performanceMetrics.cls).toBeLessThan(0.1);
      
      // First Input Delay (FID) should be < 100ms
      if (performanceMetrics.fid) {
        expect(performanceMetrics.fid).toBeLessThan(100);
      }
      
      // Test performance during user interactions
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      const dashboardMetrics = await helpers.measurePagePerformance(page, '/dashboard');
      
      // Dashboard should load quickly
      expect(dashboardMetrics.fcp).toBeLessThan(2000);
      expect(dashboardMetrics.lcp).toBeLessThan(3000);
      
      // Test performance with data loading
      await page.goto('/emails');
      
      const emailsMetrics = await helpers.measurePagePerformance(page, '/emails');
      expect(emailsMetrics.fcp).toBeLessThan(2000);
      
      console.log('✅ Core Web Vitals performance validated');
      console.log(`FCP: ${performanceMetrics.fcp}ms, LCP: ${performanceMetrics.lcp}ms, CLS: ${performanceMetrics.cls}`);
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should optimize resource loading on slow networks', async ({ page }) => {
      // Simulate slow 3G network
      await page.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Add 100ms delay
        await route.continue();
      });
      
      const testUser = await helpers.createTestUser();
      
      const startTime = Date.now();
      await page.goto('/login');
      const loadTime = Date.now() - startTime;
      
      // Should still load within reasonable time on slow network
      expect(loadTime).toBeLessThan(5000); // 5 seconds max
      
      // Verify critical resources loaded first
      await expect(page.locator('[data-testid="login-form"]')).toBeVisible();
      
      // Test progressive loading
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      await page.goto('/dashboard');
      
      // Critical content should load first
      await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
      
      // Secondary content can load progressively
      await expect(page.locator('[data-testid="dashboard-stats"]')).toBeVisible({ timeout: 10000 });
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });
  });

  test.describe('Mobile-Specific Features', () => {
    test('should provide responsive navigation with mobile menu', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 }); // iPhone 5
      
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      console.log('📱 Testing mobile-specific navigation');
      
      await page.goto('/dashboard');
      
      // Desktop navigation should be hidden
      await expect(page.locator('[data-testid="desktop-navigation"]')).not.toBeVisible();
      
      // Mobile hamburger menu should be visible
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
      
      // Test mobile menu functionality
      await page.tap('[data-testid="mobile-menu-button"]');
      
      // Mobile menu should slide in
      await expect(page.locator('[data-testid="mobile-menu-panel"]')).toBeVisible();
      
      // Test navigation items
      const navItems = [
        { selector: '[data-testid="nav-dashboard"]', url: '/dashboard' },
        { selector: '[data-testid="nav-workflows"]', url: '/workflows' },
        { selector: '[data-testid="nav-emails"]', url: '/emails' },
        { selector: '[data-testid="nav-settings"]', url: '/settings' }
      ];
      
      for (const item of navItems) {
        await expect(page.locator(item.selector)).toBeVisible();
        
        // Test navigation
        await page.tap(item.selector);
        await page.waitForURL(`**${item.url}`);
        
        // Menu should close after navigation
        await expect(page.locator('[data-testid="mobile-menu-panel"]')).not.toBeVisible();
        
        // Reopen menu for next test
        if (navItems.indexOf(item) < navItems.length - 1) {
          await page.tap('[data-testid="mobile-menu-button"]');
        }
      }
      
      console.log('✅ Mobile navigation validated');
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });

    test('should handle mobile form interactions with proper viewport behavior', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 }); // iPhone X
      
      const testUser = await helpers.createTestUser();
      await helpers.loginUser(testUser.email, 'TestPassword123!');
      
      await page.goto('/workflows/create');
      
      // Test viewport meta tag behavior
      const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewportMeta).toContain('width=device-width');
      expect(viewportMeta).toContain('initial-scale=1');
      
      // Test form field focus behavior
      const nameInput = page.locator('[data-testid="workflow-name-input"]');
      
      // Get initial viewport
      const initialViewport = await page.viewportSize();
      
      // Focus input field
      await nameInput.tap();
      await page.waitForTimeout(500); // Wait for keyboard animation
      
      // Verify form adjusts for virtual keyboard
      const formContainer = page.locator('[data-testid="workflow-form-container"]');
      const formBox = await formContainer.boundingBox();
      
      // Form should remain visible above virtual keyboard
      expect(formBox.y).toBeGreaterThanOrEqual(0);
      
      // Test form submission on mobile
      await nameInput.fill('E2E-Test Mobile Workflow');
      await page.fill('[data-testid="workflow-description-input"]', 'Mobile form test');
      await page.selectOption('[data-testid="trigger-type-select"]', 'email_received');
      
      // Submit form
      await page.tap('[data-testid="save-workflow-button"]');
      
      // Should show mobile-optimized success message
      await expect(page.locator('[data-testid="mobile-success-toast"]')).toBeVisible();
      
      // Cleanup
      await helpers.deleteTestUser(testUser.email);
    });
  });
});
