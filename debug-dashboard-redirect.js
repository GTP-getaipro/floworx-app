const { chromium } = require('playwright');

async function debugDashboardRedirect() {
  console.log('🔍 DEBUGGING DASHBOARD REDIRECT ISSUE');
  console.log('=' .repeat(60));
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('\n🧪 STEP 1: CREATE A TEST USER FOR LOGIN');
    console.log('─'.repeat(50));
    
    // First, create a user we can login with
    await page.goto('https://app.floworx-iq.com/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    const testUser = {
      firstName: 'Dashboard',
      lastName: 'Test',
      companyName: 'Dashboard Test Co',
      email: `dashtest.${Date.now()}@example.com`,
      password: 'DashboardTest123!'
    };

    console.log(`👤 Creating test user: ${testUser.email}`);

    await page.fill('input[name="firstName"]', testUser.firstName);
    await page.fill('input[name="lastName"]', testUser.lastName);
    await page.fill('input[name="companyName"]', testUser.companyName);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[name="password"]', testUser.password);
    await page.fill('input[name="confirmPassword"]', testUser.password);

    await page.click('button[type="submit"]');
    await page.waitForTimeout(8000);

    // Check if registration was successful
    const currentUrl = page.url();
    console.log(`Current URL after registration: ${currentUrl}`);

    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Registration redirected to dashboard - testing login redirect');
      
      // Logout first (if there's a logout button)
      const logoutButton = await page.locator('button:has-text("Logout"), a:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Sign Out")').first();
      const logoutExists = await logoutButton.count();
      
      if (logoutExists > 0) {
        console.log('🚪 Logging out...');
        await logoutButton.click();
        await page.waitForTimeout(3000);
      } else {
        console.log('🚪 No logout button found, clearing session manually...');
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
        await page.goto('https://app.floworx-iq.com/login');
        await page.waitForTimeout(3000);
      }
    } else if (currentUrl.includes('/login')) {
      console.log('✅ Registration redirected to login - user created successfully');
    } else {
      console.log('⚠️ Registration did not redirect as expected');
    }

    console.log('\n🧪 STEP 2: TEST LOGIN REDIRECT TO DASHBOARD');
    console.log('─'.repeat(50));

    // Navigate to login page
    await page.goto('https://app.floworx-iq.com/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('📧 Filling login form...');
    await page.fill('input[name="email"], input[type="email"]', testUser.email);
    await page.fill('input[name="password"], input[type="password"]', testUser.password);

    console.log('🚀 Submitting login form...');
    const loginUrl = page.url();
    console.log(`Login URL before submit: ${loginUrl}`);

    // Monitor network requests
    const networkRequests = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        networkRequests.push({
          method: request.method(),
          url: request.url(),
          postData: request.postData()
        });
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/')) {
        try {
          const responseData = await response.text();
          console.log(`📡 API Response: ${response.status()} ${response.url()}`);
          console.log(`📄 Response: ${responseData.substring(0, 200)}...`);
        } catch (e) {
          console.log(`📡 API Response: ${response.status()} ${response.url()} (could not read body)`);
        }
      }
    });

    await page.click('button[type="submit"]');

    // Wait and monitor URL changes
    console.log('⏳ Monitoring URL changes...');
    const urlChanges = [];
    
    for (let i = 0; i < 10; i++) {
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      if (urlChanges.length === 0 || urlChanges[urlChanges.length - 1] !== currentUrl) {
        urlChanges.push(currentUrl);
        console.log(`   ${i + 1}s: ${currentUrl}`);
      }
    }

    console.log('\n📊 LOGIN ATTEMPT ANALYSIS');
    console.log('─'.repeat(50));

    const finalUrl = page.url();
    console.log(`Final URL: ${finalUrl}`);
    console.log(`URL changes: ${urlChanges.length}`);
    console.log(`Network requests: ${networkRequests.length}`);

    // Check for success indicators
    const successIndicators = await page.evaluate(() => {
      const body = document.body.textContent.toLowerCase();
      return {
        hasWelcome: body.includes('welcome') || body.includes('dashboard'),
        hasError: body.includes('error') || body.includes('invalid') || body.includes('failed'),
        hasLoginForm: !!document.querySelector('input[type="email"], input[name="email"]'),
        currentPath: window.location.pathname,
        hasAuthToken: !!localStorage.getItem('token') || !!localStorage.getItem('authToken') || !!sessionStorage.getItem('token')
      };
    });

    console.log('Success indicators:');
    Object.entries(successIndicators).forEach(([key, value]) => {
      const icon = value === true ? '✅' : value === false ? '❌' : '📄';
      console.log(`   ${key}: ${value} ${icon}`);
    });

    // Check for toast messages
    const toastMessages = await page.evaluate(() => {
      const toastContainer = document.querySelector('.fixed.top-4.right-4.z-50');
      if (!toastContainer) return [];

      const toasts = Array.from(toastContainer.children);
      return toasts.map(toast => ({
        text: toast.textContent,
        variant: toast.querySelector('[data-testid*="toast"]')?.getAttribute('data-testid')?.replace('toast-', '') || 'unknown'
      }));
    });

    console.log(`Toast messages: ${toastMessages.length}`);
    toastMessages.forEach((toast, index) => {
      console.log(`   ${index + 1}. [${toast.variant}] ${toast.text}`);
    });

    console.log('\n🔍 DASHBOARD ROUTE ANALYSIS');
    console.log('─'.repeat(50));

    // Test if dashboard route exists
    console.log('🧪 Testing direct dashboard access...');
    await page.goto('https://app.floworx-iq.com/dashboard');
    await page.waitForTimeout(3000);

    const dashboardUrl = page.url();
    const dashboardContent = await page.evaluate(() => {
      return {
        title: document.title,
        hasContent: document.body.textContent.length > 100,
        bodyText: document.body.textContent.substring(0, 200),
        currentPath: window.location.pathname
      };
    });

    console.log(`Dashboard URL: ${dashboardUrl}`);
    console.log('Dashboard content:');
    Object.entries(dashboardContent).forEach(([key, value]) => {
      console.log(`   ${key}: ${value}`);
    });

    // Check if we're redirected back to login
    if (dashboardUrl.includes('/login')) {
      console.log('❌ Dashboard redirects to login - authentication required');
    } else if (dashboardUrl.includes('/dashboard')) {
      console.log('✅ Dashboard accessible directly');
    } else {
      console.log('⚠️ Dashboard redirects to unexpected location');
    }

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await browser.close();
  }
}

// Run debug
debugDashboardRedirect()
  .then(() => {
    console.log('\n📋 Dashboard redirect debug completed');
  })
  .catch(console.error);
