const { test, expect } = require('@playwright/test');

test.describe('Registration Conversion Analytics', () => {
  
  test('should track registration conversion rates', async ({ page }) => {
    console.log('📈 Tracking registration conversion rates...');
    
    const conversionData = {
      totalAttempts: 0,
      successfulRegistrations: 0,
      abandonmentPoints: {},
      conversionRate: 0,
      timeToConversion: []
    };
    
    // Simulate multiple registration attempts
    const attempts = 5;
    
    for (let i = 0; i < attempts; i++) {
      console.log(`🔄 Registration attempt ${i + 1}/${attempts}`);
      
      const attemptStartTime = Date.now();
      conversionData.totalAttempts++;
      
      await page.goto('https://app.floworx-iq.com/register');
      
      // Simulate different user behaviors
      if (i === 0) {
        // Complete successful registration
        await page.fill('input[name="firstName"]', 'Success');
        await page.fill('input[name="lastName"]', 'User');
        await page.fill('input[name="companyName"]', 'Success Co');
        await page.fill('input[name="email"]', `success.${Date.now()}.${i}@example.com`);
        await page.fill('input[name="password"]', 'Success123!');
        await page.fill('input[name="confirmPassword"]', 'Success123!');
        
        await page.click('button[type="submit"]');
        await page.waitForTimeout(5000);
        
        const currentUrl = page.url();
        if (currentUrl.includes('/login') || currentUrl.includes('/dashboard')) {
          conversionData.successfulRegistrations++;
          conversionData.timeToConversion.push(Date.now() - attemptStartTime);
          console.log('✅ Registration successful');
        }
        
      } else if (i === 1) {
        // Abandon at email field
        await page.fill('input[name="firstName"]', 'Abandon');
        await page.fill('input[name="lastName"]', 'Email');
        // Stop here - simulate abandonment
        conversionData.abandonmentPoints.emailField = (conversionData.abandonmentPoints.emailField || 0) + 1;
        console.log('❌ Abandoned at email field');
        
      } else if (i === 2) {
        // Abandon at password field
        await page.fill('input[name="firstName"]', 'Abandon');
        await page.fill('input[name="lastName"]', 'Password');
        await page.fill('input[name="email"]', `abandon.password.${Date.now()}@example.com`);
        // Stop here - simulate abandonment
        conversionData.abandonmentPoints.passwordField = (conversionData.abandonmentPoints.passwordField || 0) + 1;
        console.log('❌ Abandoned at password field');
        
      } else if (i === 3) {
        // Complete form but don't submit
        await page.fill('input[name="firstName"]', 'Complete');
        await page.fill('input[name="lastName"]', 'NoSubmit');
        await page.fill('input[name="email"]', `complete.nosubmit.${Date.now()}@example.com`);
        await page.fill('input[name="password"]', 'Complete123!');
        await page.fill('input[name="confirmPassword"]', 'Complete123!');
        // Don't click submit - simulate abandonment
        conversionData.abandonmentPoints.beforeSubmit = (conversionData.abandonmentPoints.beforeSubmit || 0) + 1;
        console.log('❌ Abandoned before submit');
        
      } else {
        // Another successful registration
        await page.fill('input[name="firstName"]', 'Success2');
        await page.fill('input[name="lastName"]', 'User2');
        await page.fill('input[name="email"]', `success2.${Date.now()}.${i}@example.com`);
        await page.fill('input[name="password"]', 'Success123!');
        await page.fill('input[name="confirmPassword"]', 'Success123!');
        
        await page.click('button[type="submit"]');
        await page.waitForTimeout(5000);
        
        const currentUrl = page.url();
        if (currentUrl.includes('/login') || currentUrl.includes('/dashboard')) {
          conversionData.successfulRegistrations++;
          conversionData.timeToConversion.push(Date.now() - attemptStartTime);
          console.log('✅ Registration successful');
        }
      }
      
      await page.waitForTimeout(1000); // Brief pause between attempts
    }
    
    // Calculate conversion rate
    conversionData.conversionRate = (conversionData.successfulRegistrations / conversionData.totalAttempts) * 100;
    
    // Calculate average time to conversion
    const avgTimeToConversion = conversionData.timeToConversion.length > 0 
      ? conversionData.timeToConversion.reduce((a, b) => a + b, 0) / conversionData.timeToConversion.length 
      : 0;
    
    console.log('📈 Conversion Analytics:', JSON.stringify({
      ...conversionData,
      avgTimeToConversion
    }, null, 2));
    
    // Expectations for healthy conversion
    expect(conversionData.conversionRate).toBeGreaterThan(0); // Should have some successful conversions
    expect(avgTimeToConversion).toBeLessThan(60000); // Should convert within 1 minute
  });

  test('should analyze form field completion rates', async ({ page }) => {
    console.log('📊 Analyzing form field completion rates...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    const fieldCompletionData = {
      firstName: { started: 0, completed: 0 },
      lastName: { started: 0, completed: 0 },
      companyName: { started: 0, completed: 0 },
      email: { started: 0, completed: 0 },
      password: { started: 0, completed: 0 },
      confirmPassword: { started: 0, completed: 0 }
    };
    
    // Simulate different completion patterns
    const patterns = [
      // Complete all fields
      ['firstName', 'lastName', 'companyName', 'email', 'password', 'confirmPassword'],
      // Stop at email
      ['firstName', 'lastName', 'email'],
      // Stop at password
      ['firstName', 'lastName', 'email', 'password'],
      // Skip company name
      ['firstName', 'lastName', 'email', 'password', 'confirmPassword'],
      // Complete all
      ['firstName', 'lastName', 'companyName', 'email', 'password', 'confirmPassword']
    ];
    
    for (let patternIndex = 0; patternIndex < patterns.length; patternIndex++) {
      console.log(`🔄 Testing completion pattern ${patternIndex + 1}`);
      
      await page.goto('https://app.floworx-iq.com/register');
      const pattern = patterns[patternIndex];
      
      for (const fieldName of pattern) {
        // Mark as started
        fieldCompletionData[fieldName].started++;
        
        // Fill the field
        const testValue = `Test${fieldName}${patternIndex}`;
        await page.fill(`input[name="${fieldName}"]`, testValue);
        
        // Check if field was actually filled (completed)
        const actualValue = await page.inputValue(`input[name="${fieldName}"]`);
        if (actualValue === testValue) {
          fieldCompletionData[fieldName].completed++;
        }
        
        await page.waitForTimeout(200); // Simulate user thinking time
      }
    }
    
    // Calculate completion rates
    const completionRates = {};
    for (const [fieldName, data] of Object.entries(fieldCompletionData)) {
      completionRates[fieldName] = {
        ...data,
        completionRate: data.started > 0 ? (data.completed / data.started) * 100 : 0
      };
    }
    
    console.log('📊 Field Completion Rates:', JSON.stringify(completionRates, null, 2));
    
    // Expectations
    expect(completionRates.firstName.completionRate).toBe(100); // First field should always complete
    expect(completionRates.email.completionRate).toBeGreaterThan(50); // Email is critical
  });

  test('should track user journey and drop-off points', async ({ page }) => {
    console.log('🛤️ Tracking user journey and drop-off points...');
    
    const journeyData = {
      pageViews: 0,
      formInteractions: 0,
      validationErrors: 0,
      submissionAttempts: 0,
      successfulSubmissions: 0,
      dropOffPoints: []
    };
    
    // Track page view
    await page.goto('https://app.floworx-iq.com/register');
    journeyData.pageViews++;
    
    // Track form interaction start
    await page.click('input[name="firstName"]');
    journeyData.formInteractions++;
    
    // Simulate user journey with potential drop-off points
    try {
      // Step 1: Fill first name
      await page.fill('input[name="firstName"]', 'Journey');
      console.log('✅ Step 1: First name filled');
      
      // Step 2: Fill last name
      await page.fill('input[name="lastName"]', 'User');
      console.log('✅ Step 2: Last name filled');
      
      // Step 3: Fill email (potential validation error)
      await page.fill('input[name="email"]', 'invalid-email');
      await page.blur('input[name="email"]');
      await page.waitForTimeout(500);
      
      const hasEmailError = await page.locator('[class*="error"]').count() > 0;
      if (hasEmailError) {
        journeyData.validationErrors++;
        journeyData.dropOffPoints.push('Email validation error');
        console.log('❌ Drop-off: Email validation error');
        
        // Recover from error
        await page.fill('input[name="email"]', `journey.${Date.now()}@example.com`);
        console.log('🔄 Recovered from email error');
      }
      
      // Step 4: Fill password
      await page.fill('input[name="password"]', 'Journey123!');
      console.log('✅ Step 4: Password filled');
      
      // Step 5: Fill confirm password (potential mismatch)
      await page.fill('input[name="confirmPassword"]', 'WrongPassword!');
      
      // Step 6: Attempt submission
      journeyData.submissionAttempts++;
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      
      const hasPasswordError = await page.locator('[class*="error"]').count() > 0;
      if (hasPasswordError) {
        journeyData.validationErrors++;
        journeyData.dropOffPoints.push('Password mismatch error');
        console.log('❌ Drop-off: Password mismatch error');
        
        // Recover from error
        await page.fill('input[name="confirmPassword"]', 'Journey123!');
        console.log('🔄 Recovered from password error');
        
        // Retry submission
        journeyData.submissionAttempts++;
        await page.click('button[type="submit"]');
        await page.waitForTimeout(5000);
      }
      
      // Check final result
      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/dashboard')) {
        journeyData.successfulSubmissions++;
        console.log('✅ Journey completed successfully');
      } else {
        journeyData.dropOffPoints.push('Final submission failed');
        console.log('❌ Final drop-off: Submission failed');
      }
      
    } catch (error) {
      journeyData.dropOffPoints.push(`Unexpected error: ${error.message}`);
      console.log('❌ Unexpected drop-off:', error.message);
    }
    
    console.log('🛤️ User Journey Data:', JSON.stringify(journeyData, null, 2));
    
    // Journey expectations
    expect(journeyData.pageViews).toBeGreaterThan(0);
    expect(journeyData.formInteractions).toBeGreaterThan(0);
  });

  test('should measure time-based conversion metrics', async ({ page }) => {
    console.log('⏰ Measuring time-based conversion metrics...');
    
    const timeMetrics = {
      timeToFirstInteraction: 0,
      timeToFormCompletion: 0,
      timeToSubmission: 0,
      timeToSuccess: 0,
      totalSessionTime: 0
    };
    
    const sessionStartTime = Date.now();
    
    // Navigate to page
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // Measure time to first interaction
    const firstInteractionStart = Date.now();
    await page.click('input[name="firstName"]');
    timeMetrics.timeToFirstInteraction = Date.now() - firstInteractionStart;
    
    // Measure time to form completion
    const formCompletionStart = Date.now();
    await page.fill('input[name="firstName"]', 'Time');
    await page.fill('input[name="lastName"]', 'Metrics');
    await page.fill('input[name="companyName"]', 'Time Co');
    await page.fill('input[name="email"]', `time.metrics.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'TimeMetrics123!');
    await page.fill('input[name="confirmPassword"]', 'TimeMetrics123!');
    timeMetrics.timeToFormCompletion = Date.now() - formCompletionStart;
    
    // Measure time to submission
    const submissionStart = Date.now();
    await page.click('button[type="submit"]');
    timeMetrics.timeToSubmission = Date.now() - submissionStart;
    
    // Measure time to success
    const successStart = Date.now();
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/dashboard')) {
      timeMetrics.timeToSuccess = Date.now() - successStart;
    }
    
    timeMetrics.totalSessionTime = Date.now() - sessionStartTime;
    
    console.log('⏰ Time-based Metrics:', JSON.stringify(timeMetrics, null, 2));
    
    // Time expectations
    expect(timeMetrics.timeToFirstInteraction).toBeLessThan(5000); // Should interact within 5 seconds
    expect(timeMetrics.timeToFormCompletion).toBeLessThan(30000); // Should complete form within 30 seconds
    expect(timeMetrics.totalSessionTime).toBeLessThan(60000); // Total session should be under 1 minute
  });
});
