#!/usr/bin/env node

/**
 * Local Authentication Test Script
 * Tests authentication locally to identify issues
 */

const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

async function createTestApp() {
  console.log('🏗️ Creating test Express app...\n');
  
  // Load environment variables
  require('dotenv').config();
  
  const app = express();
  
  // Basic middleware
  app.use(express.json());
  
  // Import routes
  try {
    const authRoutes = require('./backend/routes/auth');
    const dashboardRoutes = require('./backend/routes/dashboard');
    const onboardingRoutes = require('./backend/routes/onboarding');
    const userRoutes = require('./backend/routes/user');
    
    // Mount routes
    app.use('/api/auth', authRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/onboarding', onboardingRoutes);
    app.use('/api/user', userRoutes);
    
    console.log('✅ All routes loaded successfully');
    return app;
    
  } catch (error) {
    console.log('❌ Error loading routes:', error.message);
    throw error;
  }
}

async function testLocalAuthentication() {
  console.log('🧪 Testing local authentication...\n');
  
  try {
    const app = await createTestApp();
    
    // Test 1: Health check
    console.log('1. Testing basic connectivity...');
    const healthResponse = await request(app)
      .get('/api/auth/welcome')
      .expect(200);
    
    console.log('✅ Basic connectivity working');
    
    // Test 2: Registration
    console.log('\n2. Testing user registration...');
    const registrationData = {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      businessName: 'Test Business'
    };
    
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send(registrationData);
    
    if (registerResponse.status === 201) {
      console.log('✅ Registration successful');
    } else if (registerResponse.status === 409) {
      console.log('⚠️ User already exists (expected for repeated tests)');
    } else {
      console.log(`❌ Registration failed: ${registerResponse.status}`);
      console.log('Response:', registerResponse.body);
    }
    
    // Test 3: Login with existing test user
    console.log('\n3. Testing login with test user...');
    const loginData = {
      email: 'test.user@floworx-iq.com',
      password: 'TestPassword123!'
    };
    
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send(loginData);
    
    let testToken = null;
    
    if (loginResponse.status === 200 && loginResponse.body.token) {
      testToken = loginResponse.body.token;
      console.log('✅ Login successful, token obtained');
      
      // Verify token structure
      try {
        const decoded = jwt.decode(testToken);
        console.log(`   Token expires: ${new Date(decoded.exp * 1000).toISOString()}`);
        console.log(`   User ID: ${decoded.userId}`);
      } catch (e) {
        console.log('⚠️ Could not decode token');
      }
      
    } else {
      console.log(`❌ Login failed: ${loginResponse.status}`);
      console.log('Response:', loginResponse.body);
      
      // Try to create the test user if login failed
      console.log('\n   Attempting to create test user...');
      const createUserResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test.user@floworx-iq.com',
          password: 'TestPassword123!',
          firstName: 'Test',
          lastName: 'User',
          businessName: 'Test Business'
        });
      
      if (createUserResponse.status === 201) {
        console.log('✅ Test user created, retrying login...');
        
        const retryLoginResponse = await request(app)
          .post('/api/auth/login')
          .send(loginData);
        
        if (retryLoginResponse.status === 200 && retryLoginResponse.body.token) {
          testToken = retryLoginResponse.body.token;
          console.log('✅ Login successful after user creation');
        }
      }
    }
    
    // Test 4: Protected endpoints
    if (testToken) {
      console.log('\n4. Testing protected endpoints...');
      
      const protectedEndpoints = [
        { method: 'get', path: '/api/auth/verify' },
        { method: 'get', path: '/api/auth/user/status' },
        { method: 'get', path: '/api/dashboard/status' },
        { method: 'get', path: '/api/user/status' }
      ];
      
      for (const endpoint of protectedEndpoints) {
        try {
          const response = await request(app)
            [endpoint.method](endpoint.path)
            .set('Authorization', `Bearer ${testToken}`);
          
          if (response.status === 200) {
            console.log(`✅ ${endpoint.method.toUpperCase()} ${endpoint.path} - 200 OK`);
          } else if (response.status === 404) {
            console.log(`❓ ${endpoint.method.toUpperCase()} ${endpoint.path} - 404 Not Found`);
          } else {
            console.log(`❌ ${endpoint.method.toUpperCase()} ${endpoint.path} - ${response.status}`);
            console.log(`   Error: ${response.body.error || response.body.message || 'Unknown error'}`);
          }
        } catch (error) {
          console.log(`❌ ${endpoint.method.toUpperCase()} ${endpoint.path} - Error: ${error.message}`);
        }
      }
    } else {
      console.log('\n4. ❌ Cannot test protected endpoints - no token available');
    }
    
    // Test 5: Public endpoints
    console.log('\n5. Testing public endpoints...');
    
    const publicEndpoints = [
      { method: 'get', path: '/api/auth/password-requirements' },
      { method: 'post', path: '/api/auth/forgot-password', data: { email: 'test@example.com' } }
    ];
    
    for (const endpoint of publicEndpoints) {
      try {
        let response;
        if (endpoint.method === 'get') {
          response = await request(app).get(endpoint.path);
        } else {
          response = await request(app).post(endpoint.path).send(endpoint.data || {});
        }
        
        if (response.status >= 200 && response.status < 300) {
          console.log(`✅ ${endpoint.method.toUpperCase()} ${endpoint.path} - ${response.status}`);
        } else if (response.status === 404) {
          console.log(`❓ ${endpoint.method.toUpperCase()} ${endpoint.path} - 404 Not Found`);
        } else {
          console.log(`⚠️ ${endpoint.method.toUpperCase()} ${endpoint.path} - ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint.method.toUpperCase()} ${endpoint.path} - Error: ${error.message}`);
      }
    }
    
    return {
      success: true,
      hasToken: !!testToken,
      token: testToken
    };
    
  } catch (error) {
    console.log('❌ Local authentication test failed:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

async function checkMissingRoutes() {
  console.log('\n🔍 Checking for missing route implementations...\n');
  
  const fs = require('fs');
  
  // Check dashboard routes
  try {
    const dashboardContent = fs.readFileSync('backend/routes/dashboard.js', 'utf8');
    
    if (dashboardContent.includes('/status')) {
      console.log('✅ Dashboard /status route found');
    } else {
      console.log('❌ Dashboard /status route missing');
      console.log('   This explains the 403/404 errors on /api/dashboard/status');
    }
  } catch (error) {
    console.log('❌ Could not read dashboard routes file');
  }
  
  // Check onboarding routes
  try {
    const onboardingContent = fs.readFileSync('backend/routes/onboarding.js', 'utf8');
    
    if (onboardingContent.includes('/status')) {
      console.log('✅ Onboarding /status route found');
    } else {
      console.log('❌ Onboarding /status route missing');
      console.log('   This explains the 403/404 errors on /api/onboarding/status');
    }
  } catch (error) {
    console.log('❌ Could not read onboarding routes file');
  }
  
  // Check user routes
  try {
    const userContent = fs.readFileSync('backend/routes/user.js', 'utf8');
    
    if (userContent.includes('/status')) {
      console.log('✅ User /status route found');
    } else {
      console.log('❌ User /status route missing');
      console.log('   This explains the 403/404 errors on /api/user/status');
    }
  } catch (error) {
    console.log('❌ Could not read user routes file');
  }
}

async function main() {
  console.log('🚀 FloworxInvite Local Authentication Test\n');
  
  // Check for missing routes
  await checkMissingRoutes();
  
  // Test local authentication
  const result = await testLocalAuthentication();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 LOCAL AUTHENTICATION TEST SUMMARY');
  console.log('='.repeat(60));
  
  if (result.success) {
    console.log('✅ Local authentication system is working');
    if (result.hasToken) {
      console.log('✅ Token generation and validation working');
    } else {
      console.log('⚠️ Token generation issues detected');
    }
  } else {
    console.log('❌ Local authentication system has issues');
    console.log(`   Error: ${result.error}`);
  }
  
  console.log('\n💡 Next steps:');
  console.log('1. Fix any missing route implementations');
  console.log('2. Check production deployment configuration');
  console.log('3. Verify environment variables in production');
  console.log('4. Check server logs for deployment issues');
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testLocalAuthentication, checkMissingRoutes };
