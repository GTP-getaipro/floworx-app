const { chromium } = require('playwright');

class UserJourneyTestSuite {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      newUserJourney: { score: 0, details: {} },
      returningUserJourney: { score: 0, details: {} },
      errorRecoveryJourney: { score: 0, details: {} },
      mobileUserJourney: { score: 0, details: {} }
    };
  }

  async initialize() {
    console.log('👥 USER JOURNEY TEST SUITE');
    console.log('=' .repeat(50));
    
    this.browser = await chromium.launch({ headless: false });
    this.page = await this.browser.newPage();
  }

  async testNewUserJourney() {
    console.log('\n🆕 TESTING NEW USER JOURNEY');
    console.log('─'.repeat(40));

    const tests = {
      landingPageAccess: false,
      formDiscovery: false,
      progressIndicatorVisible: false,
      stepByStepCompletion: false,
      validationGuidance: false,
      successfulRegistration: false,
      persistenceWorking: false
    };

    // Step 1: Landing on registration page
    console.log('   🌐 Step 1: Landing on registration page...');
    await this.page.goto('https://app.floworx-iq.com/register');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(3000);

    const pageTitle = await this.page.title();
    const formVisible = await this.page.locator('form').isVisible();
    
    tests.landingPageAccess = pageTitle.includes('Floworx') || pageTitle.includes('FloWorx');
    tests.formDiscovery = formVisible;
    console.log(`   Landing page access: ${tests.landingPageAccess ? '✅' : '❌'}`);
    console.log(`   Form discovery: ${tests.formDiscovery ? '✅' : '❌'}`);

    // Step 2: Progress indicator visibility
    console.log('   📊 Step 2: Checking progress indicator...');
    const progressSteps = await this.page.locator('div[class*="rounded-full"][class*="border-2"]').count();
    tests.progressIndicatorVisible = progressSteps >= 3;
    console.log(`   Progress indicator (${progressSteps} steps): ${tests.progressIndicatorVisible ? '✅' : '❌'}`);

    // Step 3: Step-by-step form completion
    console.log('   📝 Step 3: Step-by-step form completion...');
    const userData = {
      firstName: 'New',
      lastName: 'User',
      companyName: 'Test Company',
      email: `newuser.${Date.now()}@example.com`,
      password: 'NewUser123!',
      confirmPassword: 'NewUser123!'
    };

    // Fill form step by step
    await this.page.fill('input[name="firstName"]', userData.firstName);
    await this.page.waitForTimeout(500);
    await this.page.fill('input[name="lastName"]', userData.lastName);
    await this.page.waitForTimeout(500);
    await this.page.fill('input[name="companyName"]', userData.companyName);
    await this.page.waitForTimeout(500);

    const firstStepComplete = await this.page.inputValue('input[name="firstName"]') === userData.firstName;
    tests.stepByStepCompletion = firstStepComplete;
    console.log(`   Step-by-step completion: ${tests.stepByStepCompletion ? '✅' : '❌'}`);

    // Step 4: Validation guidance
    console.log('   ⚡ Step 4: Testing validation guidance...');
    await this.page.fill('input[name="email"]', 'invalid-email');
    await this.page.locator('input[name="email"]').blur();
    await this.page.waitForTimeout(1500);

    const validationError = await this.page.locator('p.text-danger').isVisible();
    
    await this.page.fill('input[name="email"]', userData.email);
    await this.page.locator('input[name="email"]').blur();
    await this.page.waitForTimeout(1000);

    const validationCleared = !(await this.page.locator('p.text-danger').isVisible());
    tests.validationGuidance = validationError && validationCleared;
    console.log(`   Validation guidance: ${tests.validationGuidance ? '✅' : '❌'}`);

    // Step 5: Test persistence during journey
    console.log('   💾 Step 5: Testing persistence during journey...');
    await this.page.fill('input[name="password"]', userData.password);
    await this.page.fill('input[name="confirmPassword"]', userData.confirmPassword);
    await this.page.waitForTimeout(2000);

    // Simulate interruption
    await this.page.goto('https://app.floworx-iq.com/login');
    await this.page.waitForTimeout(1000);
    await this.page.goto('https://app.floworx-iq.com/register');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(4000);

    const persistedData = await this.page.inputValue('input[name="firstName"]');
    tests.persistenceWorking = persistedData === userData.firstName;
    console.log(`   Persistence working: ${tests.persistenceWorking ? '✅' : '❌'}`);

    // Step 6: Attempt registration (will fail due to validation, but that's expected)
    console.log('   🚀 Step 6: Testing registration attempt...');
    const submitButton = this.page.locator('button[type="submit"]');
    const buttonExists = await submitButton.count() > 0;
    
    if (buttonExists) {
      await submitButton.click();
      await this.page.waitForTimeout(2000);
      
      const buttonDisabled = await submitButton.isDisabled();
      const loadingSpinner = await submitButton.locator('svg[class*="animate-spin"]').count();
      
      tests.successfulRegistration = buttonDisabled || loadingSpinner > 0;
    } else {
      tests.successfulRegistration = false;
    }
    console.log(`   Registration attempt: ${tests.successfulRegistration ? '✅' : '❌'}`);

    const score = Math.round((Object.values(tests).filter(Boolean).length / Object.keys(tests).length) * 100);
    this.results.newUserJourney = { score, details: tests };
    console.log(`   📊 New User Journey Score: ${score}%`);
  }

  async testReturningUserJourney() {
    console.log('\n🔄 TESTING RETURNING USER JOURNEY');
    console.log('─'.repeat(40));

    const tests = {
      dataRestoration: false,
      notificationShown: false,
      continueFromWhereLeft: false,
      clearDataOption: false,
      improvedExperience: false
    };

    // Step 1: Set up returning user scenario
    console.log('   💾 Step 1: Setting up returning user scenario...');
    await this.page.goto('https://app.floworx-iq.com/register');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(3000);

    const returningUserData = {
      firstName: 'Returning',
      lastName: 'User',
      companyName: 'Returning Company',
      email: `returning.${Date.now()}@example.com`
    };

    await this.page.fill('input[name="firstName"]', returningUserData.firstName);
    await this.page.fill('input[name="lastName"]', returningUserData.lastName);
    await this.page.fill('input[name="companyName"]', returningUserData.companyName);
    await this.page.fill('input[name="email"]', returningUserData.email);
    await this.page.waitForTimeout(2000);

    // Step 2: Simulate leaving and returning
    console.log('   🔄 Step 2: Simulating leave and return...');
    await this.page.goto('https://app.floworx-iq.com/login');
    await this.page.waitForTimeout(1000);
    await this.page.goto('https://app.floworx-iq.com/register');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(4000);

    // Step 3: Check data restoration
    console.log('   📥 Step 3: Checking data restoration...');
    const restoredFirstName = await this.page.inputValue('input[name="firstName"]');
    const restoredLastName = await this.page.inputValue('input[name="lastName"]');
    const restoredCompany = await this.page.inputValue('input[name="companyName"]');

    tests.dataRestoration = restoredFirstName === returningUserData.firstName &&
                           restoredLastName === returningUserData.lastName &&
                           restoredCompany === returningUserData.companyName;
    console.log(`   Data restoration: ${tests.dataRestoration ? '✅' : '❌'}`);

    // Step 4: Check notification shown
    console.log('   🔔 Step 4: Checking restoration notification...');
    const toastNotification = await this.page.locator('div[class*="fixed"][class*="top-4"]').count();
    const notificationText = toastNotification > 0 ? 
      await this.page.locator('div[class*="fixed"][class*="top-4"]').textContent() : '';
    
    tests.notificationShown = toastNotification > 0 && notificationText.includes('restored');
    console.log(`   Notification shown: ${tests.notificationShown ? '✅' : '❌'}`);

    // Step 5: Test continue from where left off
    console.log('   ▶️ Step 5: Testing continue functionality...');
    const allFieldsFilled = restoredFirstName && restoredLastName && restoredCompany;
    tests.continueFromWhereLeft = allFieldsFilled;
    console.log(`   Continue from where left: ${tests.continueFromWhereLeft ? '✅' : '❌'}`);

    // Step 6: Check for clear data option (in notification)
    console.log('   🗑️ Step 6: Checking clear data option...');
    const clearOption = notificationText.includes('clear') || notificationText.includes('start fresh');
    tests.clearDataOption = clearOption;
    console.log(`   Clear data option: ${tests.clearDataOption ? '✅' : '❌'}`);

    // Step 7: Overall improved experience
    tests.improvedExperience = tests.dataRestoration && tests.notificationShown;
    console.log(`   Improved experience: ${tests.improvedExperience ? '✅' : '❌'}`);

    const score = Math.round((Object.values(tests).filter(Boolean).length / Object.keys(tests).length) * 100);
    this.results.returningUserJourney = { score, details: tests };
    console.log(`   📊 Returning User Journey Score: ${score}%`);
  }

  async testMobileUserJourney() {
    console.log('\n📱 TESTING MOBILE USER JOURNEY');
    console.log('─'.repeat(40));

    const tests = {
      mobileFormLayout: false,
      touchInteractions: false,
      mobileValidation: false,
      mobileNotifications: false,
      portraitLandscape: false
    };

    // Set mobile viewport
    await this.page.setViewportSize({ width: 375, height: 667 });
    await this.page.goto('https://app.floworx-iq.com/register');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(3000);

    // Test 1: Mobile form layout
    console.log('   📱 Testing mobile form layout...');
    const form = this.page.locator('form');
    const formBounds = await form.boundingBox();
    const fitsInMobile = formBounds && formBounds.width <= 375 - 32; // Account for margins

    tests.mobileFormLayout = fitsInMobile;
    console.log(`   Mobile form layout: ${tests.mobileFormLayout ? '✅' : '❌'}`);

    // Test 2: Touch interactions
    console.log('   👆 Testing touch interactions...');
    await this.page.tap('input[name="firstName"]');
    await this.page.type('input[name="firstName"]', 'Mobile User');
    await this.page.waitForTimeout(500);

    const touchValue = await this.page.inputValue('input[name="firstName"]');
    tests.touchInteractions = touchValue === 'Mobile User';
    console.log(`   Touch interactions: ${tests.touchInteractions ? '✅' : '❌'}`);

    // Test 3: Mobile validation
    console.log('   ⚡ Testing mobile validation...');
    await this.page.tap('input[name="email"]');
    await this.page.type('input[name="email"]', 'invalid-mobile-email');
    await this.page.tap('input[name="firstName"]'); // Blur email field
    await this.page.waitForTimeout(1500);

    const mobileError = await this.page.locator('p.text-danger').isVisible();
    const errorBounds = await this.page.locator('p.text-danger').first().boundingBox();
    const errorFitsInMobile = errorBounds && errorBounds.width <= 375 - 32;

    tests.mobileValidation = mobileError && errorFitsInMobile;
    console.log(`   Mobile validation: ${tests.mobileValidation ? '✅' : '❌'}`);

    // Test 4: Mobile notifications
    console.log('   🔔 Testing mobile notifications...');
    await this.page.fill('input[name="lastName"]', 'Mobile Test');
    await this.page.waitForTimeout(2000);

    await this.page.goto('https://app.floworx-iq.com/login');
    await this.page.waitForTimeout(1000);
    await this.page.goto('https://app.floworx-iq.com/register');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(4000);

    const mobileToast = await this.page.locator('div[class*="fixed"][class*="top-4"]').count();
    const toastBounds = mobileToast > 0 ? 
      await this.page.locator('div[class*="fixed"][class*="top-4"]').boundingBox() : null;
    const toastFitsInMobile = toastBounds && toastBounds.width <= 375 - 32;

    tests.mobileNotifications = mobileToast > 0 && toastFitsInMobile;
    console.log(`   Mobile notifications: ${tests.mobileNotifications ? '✅' : '❌'}`);

    // Test 5: Portrait/Landscape orientation
    console.log('   🔄 Testing orientation changes...');
    await this.page.setViewportSize({ width: 667, height: 375 }); // Landscape
    await this.page.waitForTimeout(1000);

    const landscapeForm = this.page.locator('form');
    const landscapeBounds = await landscapeForm.boundingBox();
    const landscapeWorks = landscapeBounds && landscapeBounds.width <= 667 - 32;

    await this.page.setViewportSize({ width: 375, height: 667 }); // Back to portrait
    await this.page.waitForTimeout(1000);

    tests.portraitLandscape = landscapeWorks;
    console.log(`   Portrait/Landscape: ${tests.portraitLandscape ? '✅' : '❌'}`);

    const score = Math.round((Object.values(tests).filter(Boolean).length / Object.keys(tests).length) * 100);
    this.results.mobileUserJourney = { score, details: tests };
    console.log(`   📊 Mobile User Journey Score: ${score}%`);
  }

  async generateReport() {
    console.log('\n📊 USER JOURNEY TEST RESULTS');
    console.log('=' .repeat(50));

    const categories = Object.keys(this.results);
    const scores = categories.map(cat => this.results[cat].score);
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);

    console.log(`🎯 OVERALL SCORE: ${overallScore}%`);
    console.log('─'.repeat(40));

    categories.forEach(category => {
      const result = this.results[category];
      const status = result.score >= 90 ? '🏆' : result.score >= 75 ? '✅' : result.score >= 60 ? '⚠️' : '❌';
      const categoryName = category.replace(/([A-Z])/g, ' $1').trim();
      console.log(`${status} ${categoryName}: ${result.score}%`);
    });

    return { overallScore, categoryScores: this.results };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Run user journey tests
async function runUserJourneyTests() {
  const testSuite = new UserJourneyTestSuite();
  
  try {
    await testSuite.initialize();
    
    await testSuite.testNewUserJourney();
    await testSuite.testReturningUserJourney();
    await testSuite.testMobileUserJourney();
    
    const results = await testSuite.generateReport();
    
    return results;
  } catch (error) {
    console.error('❌ User journey test suite failed:', error);
    return { overallScore: 0, categoryScores: {} };
  } finally {
    await testSuite.cleanup();
  }
}

// Execute if run directly
if (require.main === module) {
  runUserJourneyTests()
    .then(results => {
      console.log(`\n📋 User journey tests completed: ${results.overallScore}% overall score`);
      process.exit(results.overallScore >= 75 ? 0 : 1);
    })
    .catch(console.error);
}

module.exports = { UserJourneyTestSuite, runUserJourneyTests };
