#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs');

const BASE_URL = 'https://app.floworx-iq.com';

const BUSINESS_LOGIC_TESTS = [
  {
    name: 'Complete User Registration Journey',
    category: 'User Journey',
    test: async page => {
      // Step 1: Navigate to registration
      await page.goto(`${BASE_URL}/register`);
      await page.waitForLoadState('networkidle');
      
      // Step 2: Fill registration form
      const email = `test${Date.now()}@example.com`;
      await page.fill('[name="firstName"]', 'Test');
      await page.fill('[name="lastName"]', 'User');
      await page.fill('[name="email"]', email);
      await page.fill('[name="password"]', 'TestPassword123!');
      await page.fill('[name="confirmPassword"]', 'TestPassword123!');
      
      // Step 3: Submit registration
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      
      // Step 4: Check if redirected or shows success
      const currentUrl = page.url();
      const successMessage = await page.locator('[role="alert"], .success, .alert-success').count();
      
      return {
        success: !currentUrl.includes('/register') || successMessage > 0,
        message: !currentUrl.includes('/register') || successMessage > 0
          ? 'Registration completed successfully'
          : 'Registration did not complete - still on register page',
        data: { currentUrl, email, hasSuccessMessage: successMessage > 0 }
      };
    },
  },

  {
    name: 'Business Type Selection Flow',
    category: 'Onboarding',
    test: async page => {
      await page.goto(`${BASE_URL}/onboarding`);
      await page.waitForLoadState('networkidle');
      
      // Look for business type options
      const businessTypes = await page.locator('input[type="radio"], .business-type, select option').count();
      const hotTubOption = await page.locator('text=Hot Tub, text=Spa, [value*="hot"], [value*="spa"]').count();
      
      // Try to select a business type if available
      let selectionMade = false;
      if (hotTubOption > 0) {
        try {
          await page.click('text=Hot Tub, text=Spa');
          selectionMade = true;
        } catch (error) {
          // Try alternative selectors
          try {
            await page.click('[value*="hot"], [value*="spa"]');
            selectionMade = true;
          } catch (e) {
            // Selection failed
          }
        }
      }
      
      return {
        success: businessTypes > 0 && hotTubOption > 0,
        message: businessTypes > 0 && hotTubOption > 0
          ? `Found ${businessTypes} business types including Hot Tub/Spa option`
          : `Found ${businessTypes} business types, Hot Tub option: ${hotTubOption > 0 ? 'Yes' : 'No'}`,
        data: { businessTypes, hotTubOption: hotTubOption > 0, selectionMade }
      };
    },
  },

  {
    name: 'Gmail Integration Setup',
    category: 'Integration',
    test: async page => {
      await page.goto(`${BASE_URL}/onboarding`);
      await page.waitForLoadState('networkidle');
      
      // Look for Gmail/Google integration elements
      const gmailButton = await page.locator('button:has-text("Gmail"), button:has-text("Google"), [data-testid*="gmail"]').count();
      const oauthButton = await page.locator('button:has-text("Connect"), button:has-text("Authorize")').count();
      
      return {
        success: gmailButton > 0 || oauthButton > 0,
        message: gmailButton > 0 || oauthButton > 0
          ? 'Gmail integration setup available'
          : 'Gmail integration setup not found',
        data: { hasGmailButton: gmailButton > 0, hasOAuthButton: oauthButton > 0 }
      };
    },
  },

  {
    name: 'Workflow Template Selection',
    category: 'Workflows',
    test: async page => {
      await page.goto(`${BASE_URL}/workflows`);
      await page.waitForLoadState('networkidle');
      
      // Look for workflow templates
      const templates = await page.locator('.template, .workflow-template, [data-testid*="template"]').count();
      const hotTubTemplate = await page.locator('text=Hot Tub, text=Spa, [data-template*="hot"]').count();
      
      return {
        success: templates > 0,
        message: templates > 0
          ? `Found ${templates} workflow templates, Hot Tub specific: ${hotTubTemplate > 0 ? 'Yes' : 'No'}`
          : 'No workflow templates found',
        data: { templates, hasHotTubTemplate: hotTubTemplate > 0 }
      };
    },
  },

  {
    name: 'Dashboard Analytics Display',
    category: 'Analytics',
    test: async page => {
      await page.goto(`${BASE_URL}/dashboard`);
      await page.waitForLoadState('networkidle');
      
      // Look for analytics/metrics elements
      const metrics = await page.locator('.metric, .stat, .analytics, [data-testid*="metric"]').count();
      const charts = await page.locator('canvas, .chart, svg').count();
      const numbers = await page.locator('.number, .count, .value').count();
      
      return {
        success: metrics > 0 || charts > 0 || numbers > 0,
        message: metrics > 0 || charts > 0 || numbers > 0
          ? `Dashboard shows analytics: ${metrics} metrics, ${charts} charts, ${numbers} values`
          : 'Dashboard missing analytics/metrics display',
        data: { metrics, charts, numbers }
      };
    },
  },

  {
    name: 'Email Campaign Management',
    category: 'Email Management',
    test: async page => {
      await page.goto(`${BASE_URL}/campaigns`);
      await page.waitForLoadState('networkidle');
      
      // Look for campaign management elements
      const campaigns = await page.locator('.campaign, [data-testid*="campaign"]').count();
      const createButton = await page.locator('button:has-text("Create"), button:has-text("New Campaign")').count();
      const templates = await page.locator('.template, .email-template').count();
      
      return {
        success: campaigns > 0 || createButton > 0 || templates > 0,
        message: campaigns > 0 || createButton > 0 || templates > 0
          ? 'Email campaign management accessible'
          : 'Email campaign management not found',
        data: { campaigns, hasCreateButton: createButton > 0, templates }
      };
    },
  },

  {
    name: 'Customer Segmentation',
    category: 'Customer Management',
    test: async page => {
      await page.goto(`${BASE_URL}/customers`);
      await page.waitForLoadState('networkidle');
      
      // Look for customer management and segmentation
      const customers = await page.locator('.customer, [data-testid*="customer"], tr').count();
      const filters = await page.locator('select, .filter, input[type="search"]').count();
      const segments = await page.locator('.segment, .tag, .category').count();
      
      return {
        success: customers > 0 || filters > 0,
        message: customers > 0 || filters > 0
          ? `Customer management available: ${customers} entries, ${filters} filters, ${segments} segments`
          : 'Customer management not accessible',
        data: { customers, filters, segments }
      };
    },
  },

  {
    name: 'Automation Rules Setup',
    category: 'Automation',
    test: async page => {
      await page.goto(`${BASE_URL}/automation`);
      await page.waitForLoadState('networkidle');
      
      // Look for automation rules and triggers
      const rules = await page.locator('.rule, .automation-rule, [data-testid*="rule"]').count();
      const triggers = await page.locator('.trigger, select[name*="trigger"]').count();
      const actions = await page.locator('.action, select[name*="action"]').count();
      
      return {
        success: rules > 0 || triggers > 0 || actions > 0,
        message: rules > 0 || triggers > 0 || actions > 0
          ? `Automation setup available: ${rules} rules, ${triggers} triggers, ${actions} actions`
          : 'Automation rules setup not found',
        data: { rules, triggers, actions }
      };
    },
  },
];

async function runBusinessLogicTests() {
  let browser;
  const results = {
    passed: 0,
    failed: 0,
    total: BUSINESS_LOGIC_TESTS.length,
    tests: [],
    categories: {},
  };

  try {
    console.log('🏢 FLOWORX BUSINESS LOGIC TEST SUITE');
    console.log('====================================');
    console.log(`🚀 Starting ${BUSINESS_LOGIC_TESTS.length} business logic tests...\n`);

    browser = await chromium.launch({
      headless: false,
      slowMo: 1000,
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();

    // Create screenshots directory
    if (!fs.existsSync('business-logic-screenshots')) {
      fs.mkdirSync('business-logic-screenshots');
    }

    let testIndex = 0;

    for (const testCase of BUSINESS_LOGIC_TESTS) {
      testIndex++;
      console.log(
        `${testIndex}/${BUSINESS_LOGIC_TESTS.length}. Testing: ${testCase.name} (${testCase.category})`
      );

      try {
        const result = await testCase.test(page);

        const testResult = {
          name: testCase.name,
          category: testCase.category,
          success: result.success,
          message: result.message,
          data: result.data,
          timestamp: new Date().toISOString(),
        };

        results.tests.push(testResult);

        // Update category stats
        if (!results.categories[testCase.category]) {
          results.categories[testCase.category] = { passed: 0, failed: 0, total: 0 };
        }
        results.categories[testCase.category].total++;

        if (result.success) {
          results.passed++;
          results.categories[testCase.category].passed++;
          console.log(`   ✅ ${result.message}`);
        } else {
          results.failed++;
          results.categories[testCase.category].failed++;
          console.log(`   ❌ ${result.message}`);
        }

        // Take screenshot for each test
        await page.screenshot({
          path: `business-logic-screenshots/${testIndex.toString().padStart(2, '0')}-${testCase.name.replace(/[^a-zA-Z0-9]/g, '-')}.png`,
        });

        // Delay between tests
        await page.waitForTimeout(2000);
      } catch (error) {
        console.log(`   ❌ Test failed: ${error.message}`);
        results.failed++;
        results.tests.push({
          name: testCase.name,
          category: testCase.category,
          success: false,
          message: `Test error: ${error.message}`,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Generate comprehensive report
    console.log('\n📊 BUSINESS LOGIC TEST RESULTS');
    console.log('===============================');
    console.log(`Total Tests: ${results.total}`);
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);

    console.log('\n📋 Results by Category:');
    for (const [category, stats] of Object.entries(results.categories)) {
      const successRate = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`   ${category}: ${stats.passed}/${stats.total} (${successRate}%)`);
    }

    // Save detailed results
    const reportFile = `business-logic-results-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed results saved to: ${reportFile}`);

    // Keep browser open for review
    console.log('\n🔍 Browser will stay open for 15 seconds for review...');
    await page.waitForTimeout(15000);
  } catch (error) {
    console.error(`❌ Business logic test suite failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return results;
}

// Run the business logic test suite
if (require.main === module) {
  runBusinessLogicTests().catch(console.error);
}

module.exports = { runBusinessLogicTests, BUSINESS_LOGIC_TESTS };
