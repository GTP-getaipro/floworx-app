const { test, expect } = require('@playwright/test');

test.describe('Real User Simulation - Registration Flow', () => {
  
  test('should simulate typical business owner registration', async ({ page }) => {
    console.log('👔 Simulating typical business owner registration...');
    
    const userScenario = {
      userType: 'Business Owner',
      urgency: 'High',
      techSavvy: 'Medium',
      device: 'Desktop'
    };
    
    console.log('📋 User Scenario:', userScenario);
    
    // Navigate to registration page
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // Simulate reading the page (business owners take time to read)
    await page.waitForTimeout(2000);
    
    // Start filling form with realistic data
    await page.fill('input[name="firstName"]', 'Sarah');
    await page.waitForTimeout(500); // Thinking time
    
    await page.fill('input[name="lastName"]', 'Johnson');
    await page.waitForTimeout(300);
    
    await page.fill('input[name="companyName"]', 'Johnson Hot Tub Services');
    await page.waitForTimeout(800); // More thinking for company name
    
    await page.fill('input[name="email"]', `sarah.johnson.${Date.now()}@hottubservices.com`);
    await page.waitForTimeout(400);
    
    // Business owners often use strong passwords
    await page.fill('input[name="password"]', 'HotTubBiz2024!');
    await page.waitForTimeout(600);
    
    await page.fill('input[name="confirmPassword"]', 'HotTubBiz2024!');
    await page.waitForTimeout(1000); // Review before submitting
    
    // Submit registration
    await page.click('button[type="submit"]');
    await page.waitForTimeout(8000); // Wait for processing
    
    // Check result
    const currentUrl = page.url();
    const isSuccess = currentUrl.includes('/login') || currentUrl.includes('/dashboard');
    
    console.log(`✅ Business owner registration: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);
    expect(isSuccess).toBe(true);
  });

  test('should simulate mobile user registration', async ({ page }) => {
    console.log('📱 Simulating mobile user registration...');
    
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    const userScenario = {
      userType: 'Mobile User',
      urgency: 'Medium',
      techSavvy: 'High',
      device: 'Mobile'
    };
    
    console.log('📋 User Scenario:', userScenario);
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // Mobile users are typically faster
    await page.fill('input[name="firstName"]', 'Mike');
    await page.waitForTimeout(200);
    
    await page.fill('input[name="lastName"]', 'Chen');
    await page.waitForTimeout(200);
    
    await page.fill('input[name="companyName"]', 'Chen Pool & Spa');
    await page.waitForTimeout(300);
    
    await page.fill('input[name="email"]', `mike.chen.${Date.now()}@poolspa.com`);
    await page.waitForTimeout(200);
    
    await page.fill('input[name="password"]', 'MobileUser123!');
    await page.waitForTimeout(300);
    
    await page.fill('input[name="confirmPassword"]', 'MobileUser123!');
    await page.waitForTimeout(500);
    
    // Mobile users often submit quickly
    await page.click('button[type="submit"]');
    await page.waitForTimeout(6000);
    
    const currentUrl = page.url();
    const isSuccess = currentUrl.includes('/login') || currentUrl.includes('/dashboard');
    
    console.log(`✅ Mobile user registration: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);
    expect(isSuccess).toBe(true);
  });

  test('should simulate cautious user with validation errors', async ({ page }) => {
    console.log('🤔 Simulating cautious user with validation errors...');
    
    const userScenario = {
      userType: 'Cautious User',
      urgency: 'Low',
      techSavvy: 'Low',
      device: 'Desktop'
    };
    
    console.log('📋 User Scenario:', userScenario);
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // Cautious users read everything first
    await page.waitForTimeout(3000);
    
    // Start filling form slowly
    await page.fill('input[name="firstName"]', 'Robert');
    await page.waitForTimeout(1000);
    
    await page.fill('input[name="lastName"]', 'Williams');
    await page.waitForTimeout(800);
    
    // Skip company name initially (cautious about optional fields)
    await page.fill('input[name="email"]', `robert.williams.${Date.now()}@email.com`);
    await page.waitForTimeout(1200);
    
    // Make a password mistake first (common for cautious users)
    await page.fill('input[name="password"]', 'password123');
    await page.waitForTimeout(800);
    
    await page.fill('input[name="confirmPassword"]', 'password124'); // Typo
    await page.waitForTimeout(1500);
    
    // Try to submit (will fail validation)
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    
    // Check for validation errors
    const hasErrors = await page.locator('[class*="error"], .text-red-500, .text-danger').count() > 0;
    console.log(`📝 Validation errors detected: ${hasErrors ? 'YES' : 'NO'}`);
    
    // Correct the password (cautious users fix errors carefully)
    await page.waitForTimeout(2000); // Read error message
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.waitForTimeout(1000);
    
    await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
    await page.waitForTimeout(1500);
    
    // Add company name after thinking about it
    await page.fill('input[name="companyName"]', 'Williams Maintenance');
    await page.waitForTimeout(1000);
    
    // Submit again
    await page.click('button[type="submit"]');
    await page.waitForTimeout(8000);
    
    const currentUrl = page.url();
    const isSuccess = currentUrl.includes('/login') || currentUrl.includes('/dashboard');
    
    console.log(`✅ Cautious user registration: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);
    expect(isSuccess).toBe(true);
  });

  test('should simulate power user registration', async ({ page }) => {
    console.log('⚡ Simulating power user registration...');
    
    const userScenario = {
      userType: 'Power User',
      urgency: 'High',
      techSavvy: 'High',
      device: 'Desktop'
    };
    
    console.log('📋 User Scenario:', userScenario);
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // Power users are very fast and efficient
    await page.fill('input[name="firstName"]', 'Alex');
    await page.fill('input[name="lastName"]', 'Rodriguez');
    await page.fill('input[name="companyName"]', 'Rodriguez Pool Solutions LLC');
    await page.fill('input[name="email"]', `alex.rodriguez.${Date.now()}@poolsolutions.com`);
    await page.fill('input[name="password"]', 'PowerUser2024!@#');
    await page.fill('input[name="confirmPassword"]', 'PowerUser2024!@#');
    
    // Minimal wait time - power users are decisive
    await page.waitForTimeout(500);
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(6000);
    
    const currentUrl = page.url();
    const isSuccess = currentUrl.includes('/login') || currentUrl.includes('/dashboard');
    
    console.log(`✅ Power user registration: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);
    expect(isSuccess).toBe(true);
  });

  test('should simulate international user registration', async ({ page }) => {
    console.log('🌍 Simulating international user registration...');
    
    const userScenario = {
      userType: 'International User',
      urgency: 'Medium',
      techSavvy: 'Medium',
      device: 'Desktop'
    };
    
    console.log('📋 User Scenario:', userScenario);
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    // International users with special characters
    await page.fill('input[name="firstName"]', 'José-María');
    await page.waitForTimeout(600);
    
    await page.fill('input[name="lastName"]', 'García-López');
    await page.waitForTimeout(600);
    
    await page.fill('input[name="companyName"]', 'García Pool & Spa Services');
    await page.waitForTimeout(800);
    
    await page.fill('input[name="email"]', `jose.garcia.${Date.now()}@poolservices.es`);
    await page.waitForTimeout(500);
    
    await page.fill('input[name="password"]', 'InternationalUser123!');
    await page.waitForTimeout(600);
    
    await page.fill('input[name="confirmPassword"]', 'InternationalUser123!');
    await page.waitForTimeout(1000);
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(8000);
    
    const currentUrl = page.url();
    const isSuccess = currentUrl.includes('/login') || currentUrl.includes('/dashboard');
    
    console.log(`✅ International user registration: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);
    expect(isSuccess).toBe(true);
  });

  test('should measure overall user satisfaction metrics', async ({ page }) => {
    console.log('😊 Measuring overall user satisfaction metrics...');
    
    const satisfactionMetrics = {
      loadTime: 0,
      formCompletionTime: 0,
      errorEncountered: false,
      successfulCompletion: false,
      overallExperience: 'Unknown'
    };
    
    const startTime = Date.now();
    
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    
    satisfactionMetrics.loadTime = Date.now() - startTime;
    
    const formStartTime = Date.now();
    
    // Fill form with typical user behavior
    await page.fill('input[name="firstName"]', 'Satisfaction');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="companyName"]', 'Test Company');
    await page.fill('input[name="email"]', `satisfaction.test.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'SatisfactionTest123!');
    await page.fill('input[name="confirmPassword"]', 'SatisfactionTest123!');
    
    satisfactionMetrics.formCompletionTime = Date.now() - formStartTime;
    
    // Check for any errors during form filling
    const errorCount = await page.locator('[class*="error"], .text-red-500, .text-danger').count();
    satisfactionMetrics.errorEncountered = errorCount > 0;
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(8000);
    
    const currentUrl = page.url();
    satisfactionMetrics.successfulCompletion = currentUrl.includes('/login') || currentUrl.includes('/dashboard');
    
    // Calculate overall experience score
    let experienceScore = 100;
    
    if (satisfactionMetrics.loadTime > 3000) experienceScore -= 20;
    if (satisfactionMetrics.formCompletionTime > 30000) experienceScore -= 15;
    if (satisfactionMetrics.errorEncountered) experienceScore -= 25;
    if (!satisfactionMetrics.successfulCompletion) experienceScore -= 40;
    
    if (experienceScore >= 90) satisfactionMetrics.overallExperience = 'Excellent';
    else if (experienceScore >= 75) satisfactionMetrics.overallExperience = 'Good';
    else if (experienceScore >= 60) satisfactionMetrics.overallExperience = 'Fair';
    else satisfactionMetrics.overallExperience = 'Poor';
    
    console.log('😊 User Satisfaction Metrics:', JSON.stringify(satisfactionMetrics, null, 2));
    console.log(`🎯 Experience Score: ${experienceScore}/100 (${satisfactionMetrics.overallExperience})`);
    
    // Satisfaction expectations
    expect(satisfactionMetrics.loadTime).toBeLessThan(5000);
    expect(satisfactionMetrics.successfulCompletion).toBe(true);
    expect(experienceScore).toBeGreaterThan(75); // At least "Good" experience
  });
});
