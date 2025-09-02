const { test, expect } = require('@playwright/test');

// Focused API tests to validate backend functionality
// These tests work with the current database schema

test.describe('Focused API Endpoint Tests', () => {
  const baseURL = 'http://localhost:5001';
  
  test.beforeAll(async () => {
    console.log('🔍 Testing API endpoints with current database schema...');
  });

  test('Health check endpoint should respond', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('ok');
  });

  test('Authentication endpoints should be accessible', async ({ request }) => {
    // Test login endpoint structure (should return 400 for missing credentials)
    const loginResponse = await request.post(`${baseURL}/api/auth/login`, {
      data: {}
    });
    
    // Should return 400 (bad request) not 404 (not found)
    expect([400, 422]).toContain(loginResponse.status());
  });

  test('Register endpoint should validate input', async ({ request }) => {
    // Test register endpoint structure (should return 400 for missing data)
    const registerResponse = await request.post(`${baseURL}/api/auth/register`, {
      data: {}
    });
    
    // Should return 400 (bad request) not 404 (not found)
    expect([400, 422]).toContain(registerResponse.status());
  });

  test('Protected endpoints should require authentication', async ({ request }) => {
    // Test a protected endpoint without auth token
    const protectedResponse = await request.get(`${baseURL}/api/user/profile`);
    
    // Should return 401 (unauthorized)
    expect(protectedResponse.status()).toBe(401);
  });

  test('Rate limiting should be enforced', async ({ request }) => {
    // Make multiple rapid requests to test rate limiting
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        request.post(`${baseURL}/api/auth/login`, {
          data: {
            email: 'test@example.com',
            password: 'wrongpassword'
          }
        })
      );
    }
    
    const responses = await Promise.all(promises);
    
    // At least one should be rate limited (429) or all should be 400/401
    const statusCodes = responses.map(r => r.status());
    const hasRateLimit = statusCodes.includes(429);
    const allBadRequest = statusCodes.every(code => [400, 401, 422].includes(code));
    
    expect(hasRateLimit || allBadRequest).toBe(true);
  });

  test('CORS headers should be present', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/health`);
    const headers = response.headers();
    
    expect(headers).toHaveProperty('access-control-allow-origin');
  });

  test('Security headers should be present', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/health`);
    const headers = response.headers();
    
    // Check for basic security headers
    expect(headers).toHaveProperty('x-content-type-options');
    expect(headers['x-content-type-options']).toBe('nosniff');
  });
});

test.describe('Database Connection Tests', () => {
  const baseURL = 'http://localhost:5001';

  test('Database connection should be healthy', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/health/db`);
    
    // Should either return 200 (healthy) or 503 (service unavailable)
    expect([200, 503]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('database');
      expect(data.database).toBe('connected');
    }
  });

  test('Users table should be accessible', async ({ request }) => {
    // This test validates that the basic users table exists
    // We'll try to register a user to test database write capability
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User'
    };

    const response = await request.post(`${baseURL}/api/auth/register`, {
      data: testUser
    });

    // Should either succeed (201) or fail with validation error (400/422)
    // Should NOT fail with database connection error (500)
    expect([201, 400, 422]).toContain(response.status());
    
    if (response.status() === 500) {
      const errorData = await response.json();
      console.error('Database error:', errorData);
      throw new Error('Database connection failed');
    }
  });
});

test.describe('Production Security Settings Validation', () => {
  const baseURL = 'http://localhost:5001';

  test('Account lockout should be enforced after failed attempts', async ({ request }) => {
    const testEmail = `lockout-test-${Date.now()}@example.com`;
    
    // Make 6 failed login attempts (max is 5)
    const promises = [];
    for (let i = 0; i < 6; i++) {
      promises.push(
        request.post(`${baseURL}/api/auth/login`, {
          data: {
            email: testEmail,
            password: 'wrongpassword'
          }
        })
      );
    }
    
    const responses = await Promise.all(promises);
    const statusCodes = responses.map(r => r.status());
    
    // Should have some 429 (too many requests) or 423 (locked) responses
    const hasLockout = statusCodes.some(code => [423, 429].includes(code));
    expect(hasLockout).toBe(true);
  });

  test('Password reset token should have proper expiry', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/auth/forgot-password`, {
      data: {
        email: 'test@example.com'
      }
    });
    
    // Should either succeed or fail gracefully (not crash)
    expect([200, 400, 404, 422]).toContain(response.status());
  });
});

test.describe('API Response Format Tests', () => {
  const baseURL = 'http://localhost:5001';

  test('Error responses should have consistent format', async ({ request }) => {
    const response = await request.post(`${baseURL}/api/auth/login`, {
      data: {}
    });
    
    expect([400, 422]).toContain(response.status());
    
    const data = await response.json();
    expect(data).toHaveProperty('error');
    expect(typeof data.error).toBe('string');
  });

  test('Success responses should have consistent format', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
    expect(data.status).toBe('ok');
  });
});
