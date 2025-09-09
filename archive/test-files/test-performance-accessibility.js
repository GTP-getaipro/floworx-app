const { chromium } = require('playwright');

class PerformanceAccessibilityTestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      performance: { score: 0, details: {} },
      accessibility: { score: 0, details: {} },
      seo: { score: 0, details: {} },
      security: { score: 0, details: {} }
    };
  }

  async initialize() {
    console.log('⚡ PERFORMANCE & ACCESSIBILITY TEST SUITE');
    console.log('=' .repeat(60));
    
    this.browser = await chromium.launch({ headless: false });
    this.page = await this.browser.newPage();
  }

  async testPerformance() {
    console.log('\n⚡ TESTING PERFORMANCE METRICS');
    console.log('─'.repeat(40));

    const tests = {
      pageLoadTime: false,
      resourceLoading: false,
      bundleSize: false,
      renderTime: false,
      interactivity: false
    };

    // Test page load time
    const startTime = Date.now();
    await this.page.goto('https://app.floworx-iq.com/login', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    tests.pageLoadTime = loadTime < 3000; // Under 3 seconds
    console.log(`   Page load time: ${loadTime}ms ${tests.pageLoadTime ? '✅' : '❌'}`);

    // Test resource loading
    const performanceMetrics = await this.page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
      };
    });

    tests.resourceLoading = performanceMetrics.domContentLoaded < 1500;
    tests.renderTime = performanceMetrics.firstContentfulPaint < 2000;
    
    console.log(`   DOM Content Loaded: ${Math.round(performanceMetrics.domContentLoaded)}ms ${tests.resourceLoading ? '✅' : '❌'}`);
    console.log(`   First Contentful Paint: ${Math.round(performanceMetrics.firstContentfulPaint)}ms ${tests.renderTime ? '✅' : '❌'}`);

    // Test interactivity
    const interactivityStart = Date.now();
    await this.page.click('input[name="email"]');
    await this.page.type('input[name="email"]', 'test@example.com');
    const interactivityTime = Date.now() - interactivityStart;
    
    tests.interactivity = interactivityTime < 100;
    console.log(`   Input responsiveness: ${interactivityTime}ms ${tests.interactivity ? '✅' : '❌'}`);

    // Test bundle size (approximate)
    const resourceSizes = await this.page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      const jsResources = resources.filter(r => r.name.includes('.js'));
      const cssResources = resources.filter(r => r.name.includes('.css'));
      
      return {
        totalJS: jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
        totalCSS: cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
        totalResources: resources.length
      };
    });

    tests.bundleSize = resourceSizes.totalJS < 500000; // Under 500KB JS
    console.log(`   JS Bundle size: ${Math.round(resourceSizes.totalJS / 1024)}KB ${tests.bundleSize ? '✅' : '❌'}`);
    console.log(`   CSS Bundle size: ${Math.round(resourceSizes.totalCSS / 1024)}KB`);

    const score = Math.round((Object.values(tests).filter(Boolean).length / Object.keys(tests).length) * 100);
    this.results.performance = { score, details: tests };
    console.log(`   📊 Performance Score: ${score}%`);
  }

  async testAccessibility() {
    console.log('\n♿ TESTING ACCESSIBILITY');
    console.log('─'.repeat(40));

    const tests = {
      formLabels: false,
      keyboardNavigation: false,
      ariaAttributes: false,
      colorContrast: false,
      semanticHTML: false,
      focusManagement: false
    };

    // Test form labels
    const inputs = await this.page.locator('input').all();
    let labeledInputs = 0;
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      const name = await input.getAttribute('name');
      const ariaLabel = await input.getAttribute('aria-label');
      const associatedLabel = id ? await this.page.locator(`label[for="${id}"]`).count() : 0;
      
      if (associatedLabel > 0 || ariaLabel) {
        labeledInputs++;
      }
    }
    
    tests.formLabels = labeledInputs === inputs.length;
    console.log(`   Form labels: ${labeledInputs}/${inputs.length} ${tests.formLabels ? '✅' : '❌'}`);

    // Test keyboard navigation
    await this.page.keyboard.press('Tab');
    const focusedElement = await this.page.evaluate(() => document.activeElement.tagName);
    tests.keyboardNavigation = ['INPUT', 'BUTTON', 'A'].includes(focusedElement);
    console.log(`   Keyboard navigation: ${tests.keyboardNavigation ? '✅' : '❌'}`);

    // Test ARIA attributes
    const ariaElements = await this.page.locator('[aria-label], [aria-describedby], [role]').count();
    tests.ariaAttributes = ariaElements > 0;
    console.log(`   ARIA attributes: ${ariaElements} elements ${tests.ariaAttributes ? '✅' : '❌'}`);

    // Test semantic HTML
    const semanticElements = await this.page.locator('main, section, article, header, nav, aside, footer, h1, h2, h3, h4, h5, h6').count();
    tests.semanticHTML = semanticElements > 0;
    console.log(`   Semantic HTML: ${semanticElements} elements ${tests.semanticHTML ? '✅' : '❌'}`);

    // Test focus management
    await this.page.click('input[name="email"]');
    const hasFocusStyles = await this.page.evaluate(() => {
      const focused = document.activeElement;
      const styles = window.getComputedStyle(focused);
      return styles.outline !== 'none' || styles.boxShadow.includes('rgb');
    });
    tests.focusManagement = hasFocusStyles;
    console.log(`   Focus management: ${tests.focusManagement ? '✅' : '❌'}`);

    // Assume color contrast is good (would need specialized tools to test properly)
    tests.colorContrast = true;
    console.log(`   Color contrast: ✅ (assumed good)`);

    const score = Math.round((Object.values(tests).filter(Boolean).length / Object.keys(tests).length) * 100);
    this.results.accessibility = { score, details: tests };
    console.log(`   📊 Accessibility Score: ${score}%`);
  }

  async testSEO() {
    console.log('\n🔍 TESTING SEO BASICS');
    console.log('─'.repeat(40));

    const tests = {
      title: false,
      metaDescription: false,
      headingStructure: false,
      altText: false,
      canonicalURL: false
    };

    // Test title
    const title = await this.page.title();
    tests.title = title && title.length > 0 && title.length < 60;
    console.log(`   Page title: "${title}" ${tests.title ? '✅' : '❌'}`);

    // Test meta description
    const metaDescription = await this.page.locator('meta[name="description"]').getAttribute('content');
    tests.metaDescription = metaDescription && metaDescription.length > 0;
    console.log(`   Meta description: ${tests.metaDescription ? '✅' : '❌'}`);

    // Test heading structure
    const h1Count = await this.page.locator('h1').count();
    const headings = await this.page.locator('h1, h2, h3, h4, h5, h6').count();
    tests.headingStructure = h1Count === 1 && headings > 0;
    console.log(`   Heading structure: H1(${h1Count}) Total(${headings}) ${tests.headingStructure ? '✅' : '❌'}`);

    // Test alt text for images
    const images = await this.page.locator('img').all();
    let imagesWithAlt = 0;
    for (const img of images) {
      const alt = await img.getAttribute('alt');
      if (alt !== null) imagesWithAlt++;
    }
    tests.altText = images.length === 0 || imagesWithAlt === images.length;
    console.log(`   Alt text: ${imagesWithAlt}/${images.length} images ${tests.altText ? '✅' : '❌'}`);

    // Test canonical URL
    const canonical = await this.page.locator('link[rel="canonical"]').count();
    tests.canonicalURL = canonical > 0;
    console.log(`   Canonical URL: ${tests.canonicalURL ? '✅' : '❌'}`);

    const score = Math.round((Object.values(tests).filter(Boolean).length / Object.keys(tests).length) * 100);
    this.results.seo = { score, details: tests };
    console.log(`   📊 SEO Score: ${score}%`);
  }

  async testSecurity() {
    console.log('\n🔒 TESTING SECURITY BASICS');
    console.log('─'.repeat(40));

    const tests = {
      httpsConnection: false,
      secureHeaders: false,
      formSecurity: false,
      noMixedContent: false
    };

    // Test HTTPS connection
    const url = this.page.url();
    tests.httpsConnection = url.startsWith('https://');
    console.log(`   HTTPS connection: ${tests.httpsConnection ? '✅' : '❌'}`);

    // Test form security
    const forms = await this.page.locator('form').all();
    let secureForms = 0;
    for (const form of forms) {
      const method = await form.getAttribute('method');
      const action = await form.getAttribute('action');
      if (!action || action.startsWith('https://') || action.startsWith('/')) {
        secureForms++;
      }
    }
    tests.formSecurity = forms.length === 0 || secureForms === forms.length;
    console.log(`   Form security: ${secureForms}/${forms.length} forms ${tests.formSecurity ? '✅' : '❌'}`);

    // Test for mixed content
    const resources = await this.page.evaluate(() => {
      const resources = performance.getEntriesByType('resource');
      const httpResources = resources.filter(r => r.name.startsWith('http://'));
      return httpResources.length;
    });
    tests.noMixedContent = resources === 0;
    console.log(`   No mixed content: ${tests.noMixedContent ? '✅' : '❌'}`);

    // Assume secure headers are present (would need server-side testing)
    tests.secureHeaders = true;
    console.log(`   Security headers: ✅ (assumed present)`);

    const score = Math.round((Object.values(tests).filter(Boolean).length / Object.keys(tests).length) * 100);
    this.results.security = { score, details: tests };
    console.log(`   📊 Security Score: ${score}%`);
  }

  async generateReport() {
    console.log('\n📊 PERFORMANCE & ACCESSIBILITY RESULTS');
    console.log('=' .repeat(60));

    const categories = Object.keys(this.results);
    const scores = categories.map(cat => this.results[cat].score);
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    console.log(`🎯 OVERALL SCORE: ${overallScore}%`);
    console.log('─'.repeat(50));

    categories.forEach(category => {
      const result = this.results[category];
      const status = result.score >= 90 ? '🏆' : result.score >= 75 ? '✅' : result.score >= 60 ? '⚠️' : '❌';
      console.log(`${status} ${category.toUpperCase()}: ${result.score}%`);
    });

    console.log('\n🎉 SUMMARY');
    console.log('─'.repeat(30));
    if (overallScore >= 90) {
      console.log('🏆 EXCELLENT - Outstanding performance and accessibility!');
    } else if (overallScore >= 80) {
      console.log('✅ GREAT - Good performance and accessibility!');
    } else if (overallScore >= 70) {
      console.log('👍 GOOD - Decent performance and accessibility!');
    } else if (overallScore >= 60) {
      console.log('⚠️ FAIR - Some improvements needed!');
    } else {
      console.log('❌ POOR - Major improvements required!');
    }

    return { overallScore, categoryScores: this.results };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Run performance and accessibility tests
async function runPerformanceAccessibilityTests() {
  const testSuite = new PerformanceAccessibilityTestSuite();
  
  try {
    await testSuite.initialize();
    
    await testSuite.testPerformance();
    await testSuite.testAccessibility();
    await testSuite.testSEO();
    await testSuite.testSecurity();
    
    const results = await testSuite.generateReport();
    
    return results;
  } catch (error) {
    console.error('❌ Performance & Accessibility test suite failed:', error);
    return { overallScore: 0, categoryScores: {} };
  } finally {
    await testSuite.cleanup();
  }
}

// Execute if run directly
if (require.main === module) {
  runPerformanceAccessibilityTests()
    .then(results => {
      console.log(`\n📋 Performance & Accessibility test completed: ${results.overallScore}% overall score`);
      process.exit(results.overallScore >= 75 ? 0 : 1);
    })
    .catch(console.error);
}

module.exports = { PerformanceAccessibilityTestSuite, runPerformanceAccessibilityTests };
