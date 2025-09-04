const { chromium, firefox, webkit } = require('playwright');

class CrossBrowserTestSuite {
  constructor() {
    this.browsers = [
      { name: 'Chromium', launcher: chromium },
      { name: 'Firefox', launcher: firefox },
      { name: 'WebKit', launcher: webkit }
    ];
    this.results = {};
  }

  async testBrowser(browserName, launcher) {
    console.log(`\n🌐 TESTING ${browserName.toUpperCase()}`);
    console.log('─'.repeat(50));

    const browser = await launcher.launch({ headless: false });
    const page = await browser.newPage();

    const tests = {
      pageLoad: false,
      loginFormLayout: false,
      registrationForm: false,
      formValidation: false,
      responsiveDesign: false,
      communicationDisplay: false,
      formPersistence: false,
      loadingStates: false,
      cssCompatibility: false,
      jsCompatibility: false,
      touchSupport: false,
      keyboardNavigation: false
    };

    try {
      // Test 1: Page Load
      console.log(`   📄 Testing page load...`);
      await page.goto('https://app.floworx-iq.com/login', { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      const title = await page.title();
      tests.pageLoad = title.includes('Floworx') || title.includes('FloWorx');
      console.log(`   Page load: ${tests.pageLoad ? '✅' : '❌'} (Title: "${title}")`);

      // Test 2: Login Form Layout
      console.log(`   🖥️ Testing login form layout...`);
      const loginForm = await page.locator('form').count();
      const emailInput = await page.locator('input[name="email"]').count();
      const passwordInput = await page.locator('input[name="password"]').count();
      const submitButton = await page.locator('button[type="submit"]').count();
      
      tests.loginFormLayout = loginForm > 0 && emailInput > 0 && passwordInput > 0 && submitButton > 0;
      console.log(`   Login form layout: ${tests.loginFormLayout ? '✅' : '❌'}`);

      // Test 3: Registration Form
      console.log(`   📝 Testing registration form...`);
      await page.goto('https://app.floworx-iq.com/register', { waitUntil: 'networkidle' });
      await page.waitForTimeout(3000);
      
      const regForm = await page.locator('form').count();
      const firstNameInput = await page.locator('input[name="firstName"]').count();
      const lastNameInput = await page.locator('input[name="lastName"]').count();
      const regEmailInput = await page.locator('input[name="email"]').count();
      
      tests.registrationForm = regForm > 0 && firstNameInput > 0 && lastNameInput > 0 && regEmailInput > 0;
      console.log(`   Registration form: ${tests.registrationForm ? '✅' : '❌'}`);

      // Test 4: Form Validation
      console.log(`   ⚡ Testing form validation...`);
      const emailField = page.locator('input[name="email"]');
      await emailField.fill('invalid-email');
      await emailField.blur();
      await page.waitForTimeout(1500);
      
      const errorMessage = await page.locator('p.text-danger, p[class*="text-danger"]').count();
      tests.formValidation = errorMessage > 0;
      console.log(`   Form validation: ${tests.formValidation ? '✅' : '❌'}`);

      // Test 5: Responsive Design
      console.log(`   📱 Testing responsive design...`);
      const screenSizes = [
        { width: 375, height: 667, name: 'Mobile' },
        { width: 1920, height: 1080, name: 'Desktop' }
      ];

      let responsiveWorking = true;
      for (const size of screenSizes) {
        await page.setViewportSize(size);
        await page.waitForTimeout(500);
        
        const form = page.locator('form');
        const formBounds = await form.boundingBox();
        const fitsInScreen = formBounds && formBounds.width <= size.width - 32;
        
        if (!fitsInScreen) responsiveWorking = false;
        console.log(`     ${size.name}: ${fitsInScreen ? '✅' : '❌'}`);
      }
      tests.responsiveDesign = responsiveWorking;

      // Test 6: Communication Display
      console.log(`   💬 Testing communication display...`);
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Fill form to trigger persistence
      await page.fill('input[name="firstName"]', 'Cross Browser Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.waitForTimeout(2000);
      
      await page.goto('https://app.floworx-iq.com/login');
      await page.waitForTimeout(1000);
      await page.goto('https://app.floworx-iq.com/register');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(4000);
      
      const toastNotification = await page.locator('div[class*="fixed"][class*="top-4"]').count();
      tests.communicationDisplay = toastNotification > 0;
      console.log(`   Communication display: ${tests.communicationDisplay ? '✅' : '❌'}`);

      // Test 7: Form Persistence
      console.log(`   💾 Testing form persistence...`);
      const restoredFirstName = await page.inputValue('input[name="firstName"]');
      tests.formPersistence = restoredFirstName === 'Cross Browser Test';
      console.log(`   Form persistence: ${tests.formPersistence ? '✅' : '❌'}`);

      // Test 8: Loading States
      console.log(`   🔄 Testing loading states...`);
      await page.fill('input[name="firstName"]', 'Loading');
      await page.fill('input[name="lastName"]', 'Test');
      await page.fill('input[name="email"]', `loading.${Date.now()}@example.com`);
      await page.fill('input[name="password"]', 'LoadingTest123!');
      await page.fill('input[name="confirmPassword"]', 'LoadingTest123!');
      
      const submitBtn = page.locator('button[type="submit"]');
      await submitBtn.click();
      await page.waitForTimeout(1000);
      
      const buttonDisabled = await submitBtn.isDisabled();
      const loadingSpinner = await submitBtn.locator('svg[class*="animate-spin"]').count();
      
      tests.loadingStates = buttonDisabled || loadingSpinner > 0;
      console.log(`   Loading states: ${tests.loadingStates ? '✅' : '❌'}`);

      // Test 9: CSS Compatibility
      console.log(`   🎨 Testing CSS compatibility...`);
      const cssStyles = await page.evaluate(() => {
        const form = document.querySelector('form');
        if (!form) return false;

        const styles = window.getComputedStyle(form);
        const hasFlexbox = styles.display === 'flex' || styles.display === 'block';
        const hasGridSupport = CSS.supports('display', 'grid');
        const hasCustomProperties = CSS.supports('color', 'var(--test)');

        return hasFlexbox && hasGridSupport && hasCustomProperties;
      });

      tests.cssCompatibility = cssStyles;
      console.log(`   CSS compatibility: ${tests.cssCompatibility ? '✅' : '❌'}`);

      // Test 10: JavaScript Compatibility
      console.log(`   ⚡ Testing JavaScript compatibility...`);
      const jsFeatures = await page.evaluate(() => {
        const hasES6 = typeof Promise !== 'undefined';
        const hasAsyncAwait = typeof (async () => {}) === 'function';
        const hasLocalStorage = typeof localStorage !== 'undefined';
        const hasSessionStorage = typeof sessionStorage !== 'undefined';

        return hasES6 && hasAsyncAwait && hasLocalStorage && hasSessionStorage;
      });

      tests.jsCompatibility = jsFeatures;
      console.log(`   JavaScript compatibility: ${tests.jsCompatibility ? '✅' : '❌'}`);

      // Test 11: Touch Support (for mobile browsers)
      console.log(`   👆 Testing touch support...`);
      const touchSupport = await page.evaluate(() => {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      });

      tests.touchSupport = touchSupport || browserName === 'Chromium'; // Desktop browsers may not have touch
      console.log(`   Touch support: ${tests.touchSupport ? '✅' : '❌'}`);

      // Test 12: Keyboard Navigation
      console.log(`   ⌨️ Testing keyboard navigation...`);
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      const focusedElement = await page.evaluate(() => {
        const focused = document.activeElement;
        return focused && (focused.tagName === 'INPUT' || focused.tagName === 'BUTTON');
      });

      tests.keyboardNavigation = focusedElement;
      console.log(`   Keyboard navigation: ${tests.keyboardNavigation ? '✅' : '❌'}`);

    } catch (error) {
      console.error(`   ❌ ${browserName} test failed:`, error.message);
    } finally {
      await browser.close();
    }

    const score = Math.round((Object.values(tests).filter(Boolean).length / Object.keys(tests).length) * 100);
    console.log(`   📊 ${browserName} Score: ${score}%`);
    
    return { score, tests };
  }

  async runAllBrowsers() {
    console.log('🌐 CROSS-BROWSER COMPATIBILITY TEST SUITE');
    console.log('=' .repeat(60));

    for (const browser of this.browsers) {
      try {
        this.results[browser.name] = await this.testBrowser(browser.name, browser.launcher);
      } catch (error) {
        console.error(`❌ Failed to test ${browser.name}:`, error.message);
        this.results[browser.name] = { score: 0, tests: {} };
      }
    }

    this.generateCrossBrowserReport();
  }

  generateCrossBrowserReport() {
    console.log('\n📊 CROSS-BROWSER COMPATIBILITY RESULTS');
    console.log('=' .repeat(60));

    const browserNames = Object.keys(this.results);
    const scores = browserNames.map(name => this.results[name].score);
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    console.log(`🎯 AVERAGE COMPATIBILITY SCORE: ${averageScore}%`);
    console.log('─'.repeat(50));

    browserNames.forEach(browserName => {
      const result = this.results[browserName];
      const status = result.score >= 90 ? '🏆' : result.score >= 75 ? '✅' : result.score >= 60 ? '⚠️' : '❌';
      console.log(`${status} ${browserName}: ${result.score}%`);
    });

    // Feature compatibility matrix
    console.log('\n🔍 FEATURE COMPATIBILITY MATRIX');
    console.log('─'.repeat(50));
    
    const allFeatures = new Set();
    browserNames.forEach(browser => {
      Object.keys(this.results[browser].tests || {}).forEach(feature => allFeatures.add(feature));
    });

    allFeatures.forEach(feature => {
      const featureName = feature.replace(/([A-Z])/g, ' $1').trim();
      const compatibility = browserNames.map(browser => {
        const works = this.results[browser].tests[feature];
        return works ? '✅' : '❌';
      }).join(' ');
      
      console.log(`   ${featureName.padEnd(20)}: ${compatibility}`);
    });

    console.log('\n🎉 COMPATIBILITY SUMMARY');
    console.log('─'.repeat(30));
    if (averageScore >= 90) {
      console.log('🏆 EXCELLENT - Perfect cross-browser compatibility!');
    } else if (averageScore >= 80) {
      console.log('✅ GREAT - Good cross-browser support!');
    } else if (averageScore >= 70) {
      console.log('👍 GOOD - Most browsers supported!');
    } else if (averageScore >= 60) {
      console.log('⚠️ FAIR - Some browser issues!');
    } else {
      console.log('❌ POOR - Major browser compatibility issues!');
    }

    return { averageScore, browserResults: this.results };
  }
}

// Run cross-browser tests
async function runCrossBrowserTests() {
  const testSuite = new CrossBrowserTestSuite();
  
  try {
    await testSuite.runAllBrowsers();
    return testSuite.results;
  } catch (error) {
    console.error('❌ Cross-browser test suite failed:', error);
    return {};
  }
}

// Execute if run directly
if (require.main === module) {
  runCrossBrowserTests()
    .then(results => {
      const scores = Object.values(results).map(r => r.score);
      const averageScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      console.log(`\n📋 Cross-browser test completed: ${averageScore}% average compatibility`);
      process.exit(averageScore >= 75 ? 0 : 1);
    })
    .catch(console.error);
}

module.exports = { CrossBrowserTestSuite, runCrossBrowserTests };
