/**
 * Comprehensive API Endpoint Testing Script
 * Tests all backend endpoints from the frontend perspective
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class APITester {
  constructor() {
    this.results = [];
    this.authToken = null;
    this.testUser = {
      email: `test.api.${Date.now()}@example.com`,
      password: 'TestPass123!',
      firstName: 'API',
      lastName: 'Tester',
      businessName: 'Test Company',
      phone: '+1234567890'
    };
  }

  async log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type };
    this.results.push(logEntry);
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (this.authToken) {
      config.headers.Authorization = `Bearer ${this.authToken}`;
    }

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      const responseData = await response.json().catch(() => ({}));
      
      return {
        success: response.ok,
        status: response.status,
        data: responseData,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        error: error.message,
        data: null
      };
    }
  }

  async testEndpoint(name, method, endpoint, data = null, expectedStatus = 200) {
    await this.log(`Testing ${name}: ${method} ${endpoint}`);
    
    const result = await this.makeRequest(method, endpoint, data);
    
    if (result.success && result.status === expectedStatus) {
      await this.log(`✅ ${name} - SUCCESS (${result.status})`, 'success');
      return { success: true, data: result.data };
    } else {
      await this.log(`❌ ${name} - FAILED (${result.status}) - ${result.error || JSON.stringify(result.data)}`, 'error');
      return { success: false, data: result.data, status: result.status };
    }
  }

  // Authentication Tests
  async testAuthenticationFlow() {
    await this.log('=== TESTING AUTHENTICATION FLOW ===', 'info');

    // 1. Test Registration
    const registerResult = await this.testEndpoint(
      'User Registration',
      'POST',
      '/auth/register',
      {
        ...this.testUser,
        agreeToTerms: true,
        marketingConsent: false
      },
      201
    );

    if (!registerResult.success) {
      await this.log('Registration failed, cannot continue with auth tests', 'error');
      return false;
    }

    // 2. Test Login (should fail - email not verified)
    await this.testEndpoint(
      'Login (Unverified)',
      'POST',
      '/auth/login',
      {
        email: this.testUser.email,
        password: this.testUser.password
      },
      403
    );

    // 3. Test Email Verification (we'll need to get token from database)
    await this.log('Email verification requires manual token retrieval', 'info');

    // 4. Test Forgot Password
    await this.testEndpoint(
      'Forgot Password',
      'POST',
      '/auth/forgot-password',
      {
        email: this.testUser.email
      },
      200
    );

    return true;
  }

  // User Management Tests
  async testUserManagement() {
    await this.log('=== TESTING USER MANAGEMENT ===', 'info');

    if (!this.authToken) {
      await this.log('No auth token available, skipping user management tests', 'error');
      return false;
    }

    // Test user status
    await this.testEndpoint('User Status', 'GET', '/user/status');
    
    // Test user profile
    await this.testEndpoint('User Profile', 'GET', '/user/profile');

    return true;
  }

  // Dashboard Tests
  async testDashboard() {
    await this.log('=== TESTING DASHBOARD ===', 'info');

    if (!this.authToken) {
      await this.log('No auth token available, skipping dashboard tests', 'error');
      return false;
    }

    await this.testEndpoint('Dashboard Data', 'GET', '/dashboard');
    
    return true;
  }

  // OAuth Tests
  async testOAuth() {
    await this.log('=== TESTING OAUTH ===', 'info');

    if (!this.authToken) {
      await this.log('No auth token available, skipping OAuth tests', 'error');
      return false;
    }

    // Test Google OAuth initiation (this will redirect, so we expect a redirect response)
    await this.log('Testing Google OAuth initiation (expect redirect)', 'info');
    const oauthResult = await this.makeRequest('GET', `/oauth/google?token=${this.authToken}`);
    await this.log(`OAuth initiation result: ${oauthResult.status}`, 'info');

    return true;
  }

  // Onboarding Tests
  async testOnboarding() {
    await this.log('=== TESTING ONBOARDING ===', 'info');

    if (!this.authToken) {
      await this.log('No auth token available, skipping onboarding tests', 'error');
      return false;
    }

    // Test onboarding status
    await this.testEndpoint('Onboarding Status', 'GET', '/onboarding');

    // Test business types
    await this.testEndpoint('Business Types', 'GET', '/business-types');

    return true;
  }

  // Analytics Tests
  async testAnalytics() {
    await this.log('=== TESTING ANALYTICS ===', 'info');

    if (!this.authToken) {
      await this.log('No auth token available, skipping analytics tests', 'error');
      return false;
    }

    await this.testEndpoint('Analytics Dashboard', 'GET', '/analytics/dashboard');
    
    return true;
  }

  // Health and System Tests
  async testSystemEndpoints() {
    await this.log('=== TESTING SYSTEM ENDPOINTS ===', 'info');

    await this.testEndpoint('Health Check', 'GET', '/health');
    await this.testEndpoint('Performance Metrics', 'GET', '/performance');

    // Test auth welcome endpoint (no auth required)
    await this.testEndpoint('Auth Welcome', 'GET', '/auth/welcome');

    return true;
  }

  // Enhanced Authentication Tests
  async testAuthenticationFlowComplete() {
    await this.log('=== COMPREHENSIVE AUTHENTICATION TESTING ===', 'info');

    // Test all auth endpoints
    const endpoints = [
      { name: 'Register', method: 'POST', path: '/auth/register', data: { ...this.testUser, agreeToTerms: true, marketingConsent: false }, expectedStatus: 201 },
      { name: 'Login (Unverified)', method: 'POST', path: '/auth/login', data: { email: this.testUser.email, password: this.testUser.password }, expectedStatus: 403 },
      { name: 'Forgot Password', method: 'POST', path: '/auth/forgot-password', data: { email: this.testUser.email }, expectedStatus: 200 },
      { name: 'Resend Verification', method: 'POST', path: '/auth/resend-verification', data: { email: this.testUser.email }, expectedStatus: 200 }
    ];

    for (const endpoint of endpoints) {
      await this.testEndpoint(endpoint.name, endpoint.method, endpoint.path, endpoint.data, endpoint.expectedStatus);
    }

    return true;
  }

  // Test with existing authenticated user
  async testWithExistingAuth() {
    await this.log('🔑 Attempting to use existing authentication', 'info');

    // Try to get token from localStorage
    const token = localStorage.getItem('token');
    if (token) {
      this.authToken = token;
      await this.log('Found existing auth token', 'success');

      // Test if token is valid
      const statusResult = await this.testEndpoint('Token Validation', 'GET', '/user/status');
      if (statusResult.success) {
        await this.log('✅ Existing token is valid', 'success');
        return true;
      } else {
        await this.log('❌ Existing token is invalid', 'error');
        this.authToken = null;
        localStorage.removeItem('token');
      }
    }

    return false;
  }

  // Manual login for testing
  async loginForTesting(email, password) {
    await this.log(`🔐 Attempting login for testing: ${email}`, 'info');

    const loginResult = await this.testEndpoint(
      'Login for Testing',
      'POST',
      '/auth/login',
      { email, password },
      200
    );

    if (loginResult.success && loginResult.data.token) {
      this.authToken = loginResult.data.token;
      localStorage.setItem('token', this.authToken);
      await this.log('✅ Login successful, token stored', 'success');
      return true;
    }

    await this.log('❌ Login failed for testing', 'error');
    return false;
  }

  // Run all tests
  async runAllTests() {
    await this.log('🚀 Starting Comprehensive API Testing', 'info');

    try {
      // System tests (no auth required)
      await this.testSystemEndpoints();

      // Authentication flow
      await this.testAuthenticationFlow();

      // Try to use existing authentication or prompt for login
      const hasAuth = await this.testWithExistingAuth();

      if (hasAuth) {
        await this.log('🔓 Running authenticated tests', 'info');
        await this.testUserManagement();
        await this.testDashboard();
        await this.testOnboarding();
        await this.testOAuth();
        await this.testAnalytics();
      } else {
        await this.log('⚠️ No valid authentication - skipping protected endpoint tests', 'info');
        await this.log('💡 To test protected endpoints: Login first, then run tests', 'info');
      }

      await this.log('📊 Testing Summary:', 'info');
      const successCount = this.results.filter(r => r.type === 'success').length;
      const errorCount = this.results.filter(r => r.type === 'error').length;

      await this.log(`✅ Successful tests: ${successCount}`, 'success');
      await this.log(`❌ Failed tests: ${errorCount}`, 'error');

      return {
        success: errorCount === 0,
        results: this.results,
        summary: { successCount, errorCount }
      };

    } catch (error) {
      await this.log(`Fatal error during testing: ${error.message}`, 'error');
      return { success: false, error: error.message, results: this.results };
    }
  }
}

// Export for use in React components or standalone testing
export default APITester;

// For standalone testing (if run directly)
if (typeof window === 'undefined') {
  const tester = new APITester();
  tester.runAllTests().then(results => {
    console.log('Testing completed:', results);
  });
}
