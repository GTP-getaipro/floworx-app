const { test, expect } = require('@playwright/test');

test.describe('Enhanced UX Features Testing', () => {
  
  test('should test real-time form validation', async ({ page }) => {
    console.log('📝 Testing real-time form validation...');
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // Test email validation on blur
    await page.fill('input[name="email"]', 'invalid-email');
    await page.locator('input[name="email"]').blur();
    await page.waitForTimeout(500);
    
    // Check for real-time validation error
    const emailError = await page.locator('[class*="error"]:has-text("email")').count();
    console.log(`✅ Email validation on blur: ${emailError > 0 ? 'Working' : 'Not detected'}`);
    
    // Test password validation on blur
    await page.fill('input[name="password"]', '123');
    await page.locator('input[name="password"]').blur();
    await page.waitForTimeout(500);
    
    const passwordError = await page.locator('[class*="error"]:has-text("password")').count();
    console.log(`✅ Password validation on blur: ${passwordError > 0 ? 'Working' : 'Not detected'}`);
    
    // Test password mismatch validation
    await page.fill('input[name="password"]', 'ValidPassword123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    await page.locator('input[name="confirmPassword"]').blur();
    await page.waitForTimeout(500);
    
    const mismatchError = await page.locator('[class*="error"]:has-text("match")').count();
    console.log(`✅ Password mismatch validation: ${mismatchError > 0 ? 'Working' : 'Not detected'}`);
    
    // Test validation success indicators
    await page.fill('input[name="firstName"]', 'John');
    await page.locator('input[name="firstName"]').blur();
    await page.waitForTimeout(500);
    
    const successIndicator = await page.locator('svg[class*="text-green-500"]').count();
    console.log(`✅ Success indicators: ${successIndicator > 0 ? 'Working' : 'Not detected'}`);
    
    console.log('✅ Real-time form validation testing completed');
  });

  test('should test double-click protection', async ({ page }) => {
    console.log('🛡️ Testing double-click protection...');
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // Fill form with valid data
    await page.fill('input[name="firstName"]', 'DoubleClick');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', `doubleclick.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'DoubleClickTest123!');
    await page.fill('input[name="confirmPassword"]', 'DoubleClickTest123!');
    
    // Monitor network requests
    const requests = [];
    page.on('request', request => {
      if (request.url().includes('/api/auth/register')) {
        requests.push({
          timestamp: Date.now(),
          method: request.method()
        });
      }
    });
    
    // Rapid clicks on submit button
    const submitButton = page.locator('button[type="submit"]');
    
    for (let i = 0; i < 5; i++) {
      await submitButton.click();
      await page.waitForTimeout(100);
    }
    
    await page.waitForTimeout(3000);
    
    console.log(`🔍 Registration requests made: ${requests.length}`);
    console.log(`✅ Double-click protection: ${requests.length <= 1 ? 'Working' : 'Needs improvement'}`);
    
    // Check if button shows loading state
    const isLoading = await submitButton.locator('svg[class*="animate-spin"]').count() > 0;
    console.log(`✅ Loading state indicator: ${isLoading ? 'Working' : 'Not detected'}`);
    
    console.log('✅ Double-click protection testing completed');
  });

  test('should test enhanced toast notifications', async ({ page }) => {
    console.log('🍞 Testing enhanced toast notifications...');
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // Test error toast with invalid data
    await page.fill('input[name="firstName"]', 'Toast');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', 'invalid-email');
    await page.fill('input[name="password"]', 'ToastTest123!');
    await page.fill('input[name="confirmPassword"]', 'ToastTest123!');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Check for enhanced toast notification
    const toastContainer = await page.locator('[class*="fixed"][class*="top-4"][class*="right-4"]').count();
    console.log(`✅ Toast container: ${toastContainer > 0 ? 'Present' : 'Not found'}`);
    
    const toastIcon = await page.locator('svg[class*="text-red-400"], svg[class*="text-green-400"]').count();
    console.log(`✅ Toast icons: ${toastIcon > 0 ? 'Present' : 'Not found'}`);
    
    const closeButton = await page.locator('button:has(svg[fill="currentColor"])').count();
    console.log(`✅ Toast close button: ${closeButton > 0 ? 'Present' : 'Not found'}`);
    
    // Test toast auto-dismiss
    if (toastContainer > 0) {
      await page.waitForTimeout(5000);
      const toastAfterWait = await page.locator('[class*="fixed"][class*="top-4"][class*="right-4"]').count();
      console.log(`✅ Toast auto-dismiss: ${toastAfterWait === 0 ? 'Working' : 'Still visible'}`);
    }
    
    console.log('✅ Enhanced toast notifications testing completed');
  });

  test('should test form persistence', async ({ page }) => {
    console.log('💾 Testing form persistence...');
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // Fill partial form data
    const testData = {
      firstName: 'Persistence',
      lastName: 'Test',
      companyName: 'Persistence Testing Co',
      email: `persistence.${Date.now()}@example.com`
    };
    
    await page.fill('input[name="firstName"]', testData.firstName);
    await page.fill('input[name="lastName"]', testData.lastName);
    await page.fill('input[name="companyName"]', testData.companyName);
    await page.fill('input[name="email"]', testData.email);
    
    // Wait for persistence to save
    await page.waitForTimeout(1000);
    
    // Navigate away and back
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForTimeout(500);
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // Check if data was restored
    const restoredFirstName = await page.inputValue('input[name="firstName"]');
    const restoredLastName = await page.inputValue('input[name="lastName"]');
    const restoredCompanyName = await page.inputValue('input[name="companyName"]');
    const restoredEmail = await page.inputValue('input[name="email"]');
    
    console.log(`✅ First name restored: ${restoredFirstName === testData.firstName ? 'Yes' : 'No'}`);
    console.log(`✅ Last name restored: ${restoredLastName === testData.lastName ? 'Yes' : 'No'}`);
    console.log(`✅ Company name restored: ${restoredCompanyName === testData.companyName ? 'Yes' : 'No'}`);
    console.log(`✅ Email restored: ${restoredEmail === testData.email ? 'Yes' : 'No'}`);
    
    // Check for persistence notification
    const persistenceNotification = await page.locator('[class*="bg-blue-50"]:has-text("Previous data restored")').count();
    console.log(`✅ Persistence notification: ${persistenceNotification > 0 ? 'Present' : 'Not found'}`);
    
    // Test clear functionality
    if (persistenceNotification > 0) {
      await page.click('button:has-text("Clear & Start Fresh")');
      await page.waitForTimeout(500);
      
      const clearedFirstName = await page.inputValue('input[name="firstName"]');
      console.log(`✅ Clear functionality: ${clearedFirstName === '' ? 'Working' : 'Not working'}`);
    }
    
    console.log('✅ Form persistence testing completed');
  });

  test('should test progress indicator', async ({ page }) => {
    console.log('📊 Testing progress indicator...');
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // Check for progress indicator presence
    const progressIndicator = await page.locator('[class*="flex"][class*="items-center"]:has(div[class*="rounded-full"])').count();
    console.log(`✅ Progress indicator present: ${progressIndicator > 0 ? 'Yes' : 'No'}`);
    
    // Test progress steps
    const progressSteps = await page.locator('div[class*="rounded-full"][class*="border-2"]').count();
    console.log(`✅ Progress steps count: ${progressSteps}`);
    
    // Fill personal info and check progress
    await page.fill('input[name="firstName"]', 'Progress');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="companyName"]', 'Progress Testing Co');
    await page.waitForTimeout(500);
    
    // Check if progress updated
    const completedSteps = await page.locator('div[class*="bg-green-500"]').count();
    console.log(`✅ Completed steps after personal info: ${completedSteps}`);
    
    // Fill account details
    await page.fill('input[name="email"]', `progress.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'ProgressTest123!');
    await page.fill('input[name="confirmPassword"]', 'ProgressTest123!');
    await page.waitForTimeout(500);
    
    const completedStepsAfterAccount = await page.locator('div[class*="bg-green-500"]').count();
    console.log(`✅ Completed steps after account details: ${completedStepsAfterAccount}`);
    
    // Check current step indicator
    const currentStep = await page.locator('div[class*="bg-blue-500"][class*="ring-4"]').count();
    console.log(`✅ Current step indicator: ${currentStep > 0 ? 'Present' : 'Not found'}`);
    
    console.log('✅ Progress indicator testing completed');
  });

  test('should test overall user satisfaction improvements', async ({ page }) => {
    console.log('😊 Testing overall user satisfaction improvements...');
    
    const satisfactionMetrics = {
      realTimeValidation: false,
      doubleClickProtection: false,
      enhancedToasts: false,
      formPersistence: false,
      progressIndicator: false,
      loadingStates: false,
      successIndicators: false
    };
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // Test real-time validation
    await page.fill('input[name="email"]', 'invalid');
    await page.locator('input[name="email"]').blur();
    await page.waitForTimeout(300);
    const hasValidation = await page.locator('[class*="error"]').count() > 0;
    satisfactionMetrics.realTimeValidation = hasValidation;
    
    // Test progress indicator
    const hasProgress = await page.locator('div[class*="rounded-full"][class*="border-2"]').count() > 0;
    satisfactionMetrics.progressIndicator = hasProgress;
    
    // Test success indicators
    await page.fill('input[name="firstName"]', 'Satisfaction');
    await page.locator('input[name="firstName"]').blur();
    await page.waitForTimeout(300);
    const hasSuccess = await page.locator('svg[class*="text-green-500"]').count() > 0;
    satisfactionMetrics.successIndicators = hasSuccess;
    
    // Test loading states
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', `satisfaction.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'SatisfactionTest123!');
    await page.fill('input[name="confirmPassword"]', 'SatisfactionTest123!');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    
    const hasLoading = await page.locator('svg[class*="animate-spin"]').count() > 0;
    satisfactionMetrics.loadingStates = hasLoading;
    
    await page.waitForTimeout(3000);
    
    // Test enhanced toasts
    const hasToast = await page.locator('[class*="fixed"][class*="top-4"]').count() > 0;
    satisfactionMetrics.enhancedToasts = hasToast;
    
    // Calculate satisfaction score
    const implementedFeatures = Object.values(satisfactionMetrics).filter(Boolean).length;
    const totalFeatures = Object.keys(satisfactionMetrics).length;
    const satisfactionScore = Math.round((implementedFeatures / totalFeatures) * 100);
    
    console.log('📊 UX Enhancement Results:');
    Object.entries(satisfactionMetrics).forEach(([feature, implemented]) => {
      console.log(`   ${implemented ? '✅' : '❌'} ${feature}: ${implemented ? 'Implemented' : 'Not detected'}`);
    });
    
    console.log(`\n🎯 Overall UX Satisfaction Score: ${satisfactionScore}%`);
    
    if (satisfactionScore >= 85) {
      console.log('🏆 Excellent UX - User satisfaction significantly improved!');
    } else if (satisfactionScore >= 70) {
      console.log('👍 Good UX - Notable improvements implemented');
    } else {
      console.log('⚠️ UX needs more work - Some improvements detected');
    }
    
    // Expect significant improvement
    expect(satisfactionScore).toBeGreaterThan(70);
    
    console.log('✅ Overall user satisfaction testing completed');
  });
});
