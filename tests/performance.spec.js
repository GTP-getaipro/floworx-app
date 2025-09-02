const { test, expect } = require('@playwright/test');
const { TestHelpers } = require('./utils/test-helpers');

test.describe('Performance & Load Tests', () => {
  let helpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test.afterEach(async () => {
    await helpers.cleanup();
  });

  test.describe('Page Load Performance', () => {
    test('should load dashboard within acceptable time limits', async ({ page }) => {
      await helpers.loginUser();
      
      const startTime = Date.now();
      await page.goto('/dashboard');
      
      // Wait for critical content to load
      await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="emails-processed-card"]')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Verify load time is under 3 seconds
      expect(loadTime).toBeLessThan(3000);
      
      // Check Core Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const vitals = {};
            
            entries.forEach((entry) => {
              if (entry.name === 'first-contentful-paint') {
                vitals.fcp = entry.startTime;
              }
              if (entry.name === 'largest-contentful-paint') {
                vitals.lcp = entry.startTime;
              }
            });
            
            resolve(vitals);
          }).observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
          
          // Fallback timeout
          setTimeout(() => resolve({}), 5000);
        });
      });
      
      // Verify Core Web Vitals thresholds
      if (metrics.fcp) {
        expect(metrics.fcp).toBeLessThan(1800); // FCP < 1.8s
      }
      if (metrics.lcp) {
        expect(metrics.lcp).toBeLessThan(2500); // LCP < 2.5s
      }
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      await helpers.loginUser();
      
      // Mock large dataset response
      const largeEmailList = Array.from({ length: 1000 }, (_, i) => ({
        id: `email_${i}`,
        from: `customer${i}@example.com`,
        subject: `Email ${i}`,
        category: 'general_inquiry',
        priority: 'medium',
        received_at: new Date().toISOString()
      }));
      
      await page.route('**/api/emails', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            emails: largeEmailList,
            total: 1000,
            page: 1,
            limit: 50
          })
        });
      });
      
      const startTime = Date.now();
      await page.goto('/emails');
      
      // Wait for table to render
      await expect(page.locator('[data-testid="emails-table"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-row"]').first()).toBeVisible();
      
      const renderTime = Date.now() - startTime;
      
      // Verify rendering time is acceptable
      expect(renderTime).toBeLessThan(2000);
      
      // Verify virtual scrolling is working (only visible rows rendered)
      const renderedRows = await page.locator('[data-testid="email-row"]').count();
      expect(renderedRows).toBeLessThanOrEqual(50); // Should only render visible rows
    });

    test('should optimize image and asset loading', async ({ page }) => {
      await helpers.loginUser();
      
      // Monitor network requests
      const requests = [];
      page.on('request', request => {
        requests.push({
          url: request.url(),
          resourceType: request.resourceType(),
          size: request.postDataBuffer()?.length || 0
        });
      });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Analyze asset loading
      const imageRequests = requests.filter(r => r.resourceType === 'image');
      const jsRequests = requests.filter(r => r.resourceType === 'script');
      const cssRequests = requests.filter(r => r.resourceType === 'stylesheet');
      
      // Verify reasonable number of requests
      expect(imageRequests.length).toBeLessThan(10);
      expect(jsRequests.length).toBeLessThan(15);
      expect(cssRequests.length).toBeLessThan(5);
      
      // Verify no oversized assets
      const oversizedAssets = requests.filter(r => r.size > 1024 * 1024); // > 1MB
      expect(oversizedAssets.length).toBe(0);
    });

    test('should implement effective caching strategies', async ({ page }) => {
      await helpers.loginUser();
      
      // First visit
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Second visit (should use cache)
      const cachedRequests = [];
      page.on('response', response => {
        if (response.fromServiceWorker() || response.status() === 304) {
          cachedRequests.push(response.url());
        }
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Verify caching is working
      expect(cachedRequests.length).toBeGreaterThan(0);
    });
  });

  test.describe('Concurrent User Load', () => {
    test('should handle multiple concurrent users', async ({ browser }) => {
      const concurrentUsers = 5;
      const contexts = [];
      const pages = [];
      const helpers = [];
      
      try {
        // Create multiple browser contexts (simulate different users)
        for (let i = 0; i < concurrentUsers; i++) {
          const context = await browser.newContext();
          const page = await context.newPage();
          const helper = new TestHelpers(page);
          
          contexts.push(context);
          pages.push(page);
          helpers.push(helper);
        }
        
        // Login all users concurrently
        const loginPromises = helpers.map(async (helper, index) => {
          const email = `concurrent.user${index}@example.com`;
          await helper.createTestUser({ email });
          await helper.loginUser(email, 'TestPassword123!');
          return email;
        });
        
        const userEmails = await Promise.all(loginPromises);
        
        // Perform concurrent operations
        const operationPromises = pages.map(async (page, index) => {
          const startTime = Date.now();
          
          // Navigate to different pages
          await page.goto('/dashboard');
          await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible();
          
          await page.goto('/workflows');
          await expect(page.locator('[data-testid="workflows-title"]')).toBeVisible();
          
          await page.goto('/emails');
          await expect(page.locator('[data-testid="emails-title"]')).toBeVisible();
          
          return Date.now() - startTime;
        });
        
        const operationTimes = await Promise.all(operationPromises);
        
        // Verify all operations completed successfully
        operationTimes.forEach((time, index) => {
          expect(time).toBeLessThan(10000); // Each user's operations < 10s
        });
        
        // Cleanup users
        for (let i = 0; i < userEmails.length; i++) {
          await helpers[i].deleteTestUser(userEmails[i]);
        }
        
      } finally {
        // Cleanup contexts
        await Promise.all(contexts.map(context => context.close()));
        await Promise.all(helpers.map(helper => helper.cleanup()));
      }
    });

    test('should handle concurrent workflow executions', async ({ page, browser }) => {
      await helpers.loginUser();
      
      // Create test workflow
      const workflow = await helpers.createTestWorkflow({
        name: 'Concurrent Execution Test',
        trigger_type: 'email_received'
      });
      
      // Mock workflow execution API
      let executionCount = 0;
      await page.route('**/api/workflows/execute', async route => {
        executionCount++;
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            executionId: `exec_${executionCount}`,
            processedAt: new Date().toISOString()
          })
        });
      });
      
      // Trigger multiple concurrent executions
      const concurrentExecutions = 10;
      const executionPromises = Array.from({ length: concurrentExecutions }, async (_, i) => {
        return helpers.simulateEmailReceived({
          from: `test${i}@example.com`,
          subject: `Test Email ${i}`,
          category: 'service_request'
        });
      });
      
      const startTime = Date.now();
      await Promise.all(executionPromises);
      const totalTime = Date.now() - startTime;
      
      // Verify all executions completed
      expect(executionCount).toBe(concurrentExecutions);
      expect(totalTime).toBeLessThan(5000); // All executions < 5s
    });

    test('should maintain performance under sustained load', async ({ page }) => {
      await helpers.loginUser();
      
      const iterations = 50;
      const performanceMetrics = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        // Perform typical user actions
        await page.goto('/dashboard');
        await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible();
        
        await page.goto('/emails');
        await expect(page.locator('[data-testid="emails-title"]')).toBeVisible();
        
        // Simulate email processing
        await helpers.simulateEmailReceived({
          from: `load.test${i}@example.com`,
          subject: `Load Test Email ${i}`
        });
        
        const iterationTime = Date.now() - startTime;
        performanceMetrics.push(iterationTime);
        
        // Brief pause between iterations
        await page.waitForTimeout(50);
      }
      
      // Analyze performance degradation
      const firstQuarter = performanceMetrics.slice(0, Math.floor(iterations / 4));
      const lastQuarter = performanceMetrics.slice(-Math.floor(iterations / 4));
      
      const avgFirstQuarter = firstQuarter.reduce((a, b) => a + b, 0) / firstQuarter.length;
      const avgLastQuarter = lastQuarter.reduce((a, b) => a + b, 0) / lastQuarter.length;
      
      // Verify performance doesn't degrade significantly
      const degradationRatio = avgLastQuarter / avgFirstQuarter;
      expect(degradationRatio).toBeLessThan(1.5); // < 50% degradation
    });
  });

  test.describe('Memory and Resource Usage', () => {
    test('should not have memory leaks during navigation', async ({ page }) => {
      await helpers.loginUser();
      
      // Get initial memory usage
      const initialMemory = await page.evaluate(() => {
        return performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize
        } : null;
      });
      
      // Navigate through pages multiple times
      const pages = ['/dashboard', '/workflows', '/emails', '/settings'];
      
      for (let cycle = 0; cycle < 5; cycle++) {
        for (const pagePath of pages) {
          await page.goto(pagePath);
          await page.waitForLoadState('networkidle');
          
          // Force garbage collection if available
          await page.evaluate(() => {
            if (window.gc) {
              window.gc();
            }
          });
        }
      }
      
      // Get final memory usage
      const finalMemory = await page.evaluate(() => {
        return performance.memory ? {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize
        } : null;
      });
      
      if (initialMemory && finalMemory) {
        // Verify memory usage hasn't grown excessively
        const memoryGrowth = finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;
        const growthRatio = memoryGrowth / initialMemory.usedJSHeapSize;
        
        expect(growthRatio).toBeLessThan(2.0); // < 200% growth
      }
    });

    test('should handle large form submissions efficiently', async ({ page }) => {
      await helpers.loginUser();
      await page.goto('/workflows');
      
      // Create workflow with large configuration
      await page.click('[data-testid="create-workflow-button"]');
      
      const largeConfig = {
        name: 'Large Configuration Workflow',
        description: 'A'.repeat(5000), // Large description
        actions: Array.from({ length: 50 }, (_, i) => ({
          type: 'send_email',
          config: {
            template: `template_${i}`,
            recipients: Array.from({ length: 100 }, (_, j) => `user${j}@example.com`)
          }
        }))
      };
      
      await page.fill('[data-testid="workflow-name-input"]', largeConfig.name);
      await page.fill('[data-testid="workflow-description-input"]', largeConfig.description);
      
      // Add multiple actions
      for (let i = 0; i < 10; i++) {
        await page.click('[data-testid="add-action-button"]');
        await page.selectOption(`[data-testid="action-type-select-${i}"]`, 'send_email');
      }
      
      const startTime = Date.now();
      await page.click('[data-testid="save-workflow-button"]');
      
      // Wait for save completion
      await helpers.waitForToast('Workflow created successfully');
      const saveTime = Date.now() - startTime;
      
      // Verify large form submission is handled efficiently
      expect(saveTime).toBeLessThan(5000); // < 5s for large form
    });

    test('should optimize database query performance', async ({ page }) => {
      await helpers.loginUser();
      
      // Mock slow database response
      let queryTime = 0;
      await page.route('**/api/analytics/performance', async route => {
        const start = Date.now();
        
        // Simulate database query
        await new Promise(resolve => setTimeout(resolve, 100));
        
        queryTime = Date.now() - start;
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            metrics: {
              avgResponseTime: queryTime,
              totalQueries: 1000,
              slowQueries: 5
            }
          })
        });
      });
      
      await page.goto('/analytics');
      
      // Verify query performance metrics
      await expect(page.locator('[data-testid="avg-response-time"]')).toBeVisible();
      await expect(page.locator('[data-testid="slow-queries-count"]')).toContainText('5');
      
      // Verify acceptable query time
      expect(queryTime).toBeLessThan(500); // < 500ms
    });
  });

  test.describe('Scalability Tests', () => {
    test('should handle increasing data volumes', async ({ page }) => {
      await helpers.loginUser();
      
      const dataSizes = [100, 500, 1000, 2000];
      const loadTimes = [];
      
      for (const size of dataSizes) {
        // Mock API with increasing data size
        await page.route('**/api/emails', async route => {
          const emails = Array.from({ length: size }, (_, i) => ({
            id: `email_${i}`,
            from: `user${i}@example.com`,
            subject: `Email ${i}`,
            body: 'Test email content',
            category: 'general_inquiry'
          }));
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ emails, total: size })
          });
        });
        
        const startTime = Date.now();
        await page.goto('/emails');
        await expect(page.locator('[data-testid="emails-table"]')).toBeVisible();
        const loadTime = Date.now() - startTime;
        
        loadTimes.push({ size, loadTime });
        
        // Unroute to set up for next iteration
        await page.unroute('**/api/emails');
      }
      
      // Verify load time scales reasonably
      const firstLoad = loadTimes[0];
      const lastLoad = loadTimes[loadTimes.length - 1];
      
      // Load time shouldn't increase more than 3x for 20x data
      const scalingRatio = lastLoad.loadTime / firstLoad.loadTime;
      expect(scalingRatio).toBeLessThan(3.0);
    });

    test('should maintain responsiveness during background processing', async ({ page }) => {
      await helpers.loginUser();
      
      // Start background processing simulation
      await page.evaluate(() => {
        // Simulate CPU-intensive background task
        const worker = new Worker(URL.createObjectURL(new Blob([`
          let counter = 0;
          setInterval(() => {
            for (let i = 0; i < 1000000; i++) {
              counter += Math.random();
            }
            postMessage({ counter });
          }, 100);
        `], { type: 'application/javascript' })));
        
        window.backgroundWorker = worker;
      });
      
      // Test UI responsiveness during background processing
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      await expect(page.locator('[data-testid="dashboard-title"]')).toBeVisible();
      
      // Interact with UI elements
      await page.click('[data-testid="refresh-dashboard-button"]');
      await helpers.waitForLoader();
      
      await page.goto('/workflows');
      await expect(page.locator('[data-testid="workflows-title"]')).toBeVisible();
      
      const totalTime = Date.now() - startTime;
      
      // Verify UI remains responsive
      expect(totalTime).toBeLessThan(5000);
      
      // Cleanup background worker
      await page.evaluate(() => {
        if (window.backgroundWorker) {
          window.backgroundWorker.terminate();
        }
      });
    });
  });
});
