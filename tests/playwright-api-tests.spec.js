const { test, expect } = require('@playwright/test');

const API_BASE = 'https://app.floworx-iq.com';

test.describe('Floworx API Tests', () => {
  test('should have healthy API endpoints', async ({ request }) => {
    // Test health endpoint
    const healthResponse = await request.get(`${API_BASE}/api/health`);
    expect(healthResponse.status()).toBe(200);
    
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('healthy');
    
    // Test database health
    const dbHealthResponse = await request.get(`${API_BASE}/api/health/db`);
    expect(dbHealthResponse.status()).toBe(200);
    
    const dbHealthData = await dbHealthResponse.json();
    expect(dbHealthData.database).toBe('connected');
  });

  test('should handle user registration and authentication', async ({ request }) => {
    const testEmail = `playwright-test-${Date.now()}@example.com`;
    const testPassword = 'PlaywrightTest123!';
    
    // Test user registration
    const registerResponse = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        email: testEmail,
        password: testPassword,
        firstName: 'Playwright',
        lastName: 'Test',
        businessName: 'Playwright Test Company',
        agreeToTerms: true
      }
    });
    
    expect(registerResponse.status()).toBe(201);
    
    const registerData = await registerResponse.json();
    expect(registerData.message).toBe('User registered successfully');
    expect(registerData.token).toBeDefined();
    expect(registerData.user.email).toBe(testEmail);
    
    const token = registerData.token;
    
    // Test token verification
    const verifyResponse = await request.get(`${API_BASE}/api/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    expect(verifyResponse.status()).toBe(200);
    
    const verifyData = await verifyResponse.json();
    expect(verifyData.message).toBe('Token is valid');
  });

  test('should handle all authenticated endpoints', async ({ request }) => {
    // First register a user to get a token
    const testEmail = `playwright-auth-${Date.now()}@example.com`;
    
    const registerResponse = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        email: testEmail,
        password: 'PlaywrightAuth123!',
        firstName: 'Playwright',
        lastName: 'Auth',
        businessName: 'Playwright Auth Company',
        agreeToTerms: true
      }
    });
    
    const registerData = await registerResponse.json();
    const token = registerData.token;
    
    // Test all authenticated endpoints
    const endpoints = [
      { path: '/api/user/status', name: 'User Status' },
      { path: '/api/dashboard', name: 'Dashboard' },
      { path: '/api/user/profile', name: 'User Profile' },
      { path: '/api/workflows', name: 'Workflows' },
      { path: '/api/analytics', name: 'Analytics' }
    ];
    
    for (const endpoint of endpoints) {
      const response = await request.get(`${API_BASE}${endpoint.path}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toBeDefined();
      
      console.log(`✅ ${endpoint.name}: ${response.status()}`);
    }
  });

  test('should handle password reset', async ({ request }) => {
    const resetResponse = await request.post(`${API_BASE}/api/auth/forgot-password`, {
      data: {
        email: 'playwright-reset@example.com'
      }
    });
    
    expect(resetResponse.status()).toBe(200);
    
    const resetData = await resetResponse.json();
    expect(resetData.message).toBeDefined();
  });

  test('should handle error cases properly', async ({ request }) => {
    // Test 404 for invalid endpoint
    const invalidResponse = await request.get(`${API_BASE}/api/invalid-endpoint`);
    expect(invalidResponse.status()).toBe(404);
    
    // Test 401 for unauthorized access
    const unauthorizedResponse = await request.get(`${API_BASE}/api/user/status`);
    expect(unauthorizedResponse.status()).toBe(401);
    
    // Test invalid registration data
    const invalidRegisterResponse = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        email: 'invalid-email',
        password: '123',
        firstName: '',
        lastName: '',
        agreeToTerms: false
      }
    });
    
    expect(invalidRegisterResponse.status()).toBe(400);
  });

  test('should validate API response structures', async ({ request }) => {
    // Register a user for testing
    const testEmail = `playwright-structure-${Date.now()}@example.com`;
    
    const registerResponse = await request.post(`${API_BASE}/api/auth/register`, {
      data: {
        email: testEmail,
        password: 'StructureTest123!',
        firstName: 'Structure',
        lastName: 'Test',
        businessName: 'Structure Test Company',
        agreeToTerms: true
      }
    });
    
    const registerData = await registerResponse.json();
    const token = registerData.token;
    
    // Test user status structure
    const statusResponse = await request.get(`${API_BASE}/api/user/status`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const statusData = await statusResponse.json();
    expect(statusData).toHaveProperty('id');
    expect(statusData).toHaveProperty('email');
    expect(statusData).toHaveProperty('firstName');
    expect(statusData).toHaveProperty('lastName');
    expect(statusData).toHaveProperty('emailVerified');
    
    // Test dashboard structure
    const dashboardResponse = await request.get(`${API_BASE}/api/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const dashboardData = await dashboardResponse.json();
    expect(dashboardData).toHaveProperty('user');
    expect(dashboardData).toHaveProperty('stats');
    expect(dashboardData).toHaveProperty('connections');
    expect(dashboardData).toHaveProperty('quickActions');
    expect(dashboardData).toHaveProperty('systemStatus');
    
    // Test profile structure
    const profileResponse = await request.get(`${API_BASE}/api/user/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const profileData = await profileResponse.json();
    expect(profileData).toHaveProperty('id');
    expect(profileData).toHaveProperty('email');
    expect(profileData).toHaveProperty('firstName');
    expect(profileData).toHaveProperty('lastName');
    expect(profileData).toHaveProperty('emailVerified');
  });
});
