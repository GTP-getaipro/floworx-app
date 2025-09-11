#!/usr/bin/env node

/**
 * FIX REMAINING ENDPOINTS - ACHIEVE 100% SUCCESS RATE
 * ==================================================
 * Systematically fix the 6 remaining failed endpoints
 */

const axios = require('axios');

async function analyzeFailedEndpoints() {
  console.log('🔍 ANALYZING FAILED ENDPOINTS');
  console.log('=============================');
  
  const baseUrl = 'https://app.floworx-iq.com/api';
  
  const failedEndpoints = [
    {
      path: '/auth/register',
      method: 'POST',
      currentStatus: 400,
      expectedStatus: [201, 409],
      issue: 'Registration validation failing',
      data: {
        email: 'test@example.com',
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User'
      }
    },
    {
      path: '/user/status',
      method: 'GET',
      currentStatus: 403,
      expectedStatus: [200, 401],
      issue: 'Authentication issue - should return 401, not 403',
      requiresAuth: true
    },
    {
      path: '/dashboard/status',
      method: 'GET',
      currentStatus: 403,
      expectedStatus: [200, 401],
      issue: 'Authentication issue - should return 401, not 403',
      requiresAuth: true
    },
    {
      path: '/onboarding/status',
      method: 'GET',
      currentStatus: 403,
      expectedStatus: [200, 401],
      issue: 'Authentication issue - should return 401, not 403',
      requiresAuth: true
    },
    {
      path: '/onboarding/complete',
      method: 'POST',
      currentStatus: 404,
      expectedStatus: [200, 400, 401],
      issue: 'Endpoint missing or not properly mounted',
      requiresAuth: true,
      data: { workflowId: 'test-workflow' }
    },
    {
      path: '/password-reset/request',
      method: 'POST',
      currentStatus: 404,
      expectedStatus: [200, 400],
      issue: 'Endpoint exists in code but returns 404 - routing issue',
      data: { email: 'test@example.com' }
    }
  ];
  
  console.log('📋 FAILED ENDPOINTS ANALYSIS:');
  console.log('==============================');
  
  for (const endpoint of failedEndpoints) {
    console.log(`\n🔍 ${endpoint.method} ${endpoint.path}`);
    console.log(`   Current Status: ${endpoint.currentStatus}`);
    console.log(`   Expected Status: ${endpoint.expectedStatus.join(', ')}`);
    console.log(`   Issue: ${endpoint.issue}`);
    console.log(`   Requires Auth: ${endpoint.requiresAuth ? 'Yes' : 'No'}`);
    
    // Test the endpoint to confirm current behavior
    try {
      const config = {
        method: endpoint.method.toLowerCase(),
        url: `${baseUrl}${endpoint.path}`,
        timeout: 10000,
        validateStatus: () => true
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
        config.headers = { 'Content-Type': 'application/json' };
      }
      
      const response = await axios(config);
      console.log(`   ✅ Confirmed Status: ${response.status}`);
      
      if (response.status !== endpoint.currentStatus) {
        console.log(`   🔄 Status Changed: ${endpoint.currentStatus} → ${response.status}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Test Error: ${error.message}`);
    }
  }
  
  return failedEndpoints;
}

async function identifyFixStrategies() {
  console.log('\n🔧 FIX STRATEGIES');
  console.log('=================');
  
  const strategies = [
    {
      issue: 'POST /auth/register returning 400',
      strategy: 'Check validation requirements and fix request data format',
      priority: 'HIGH',
      files: ['backend/routes/auth.js', 'api/auth/register.js']
    },
    {
      issue: 'GET endpoints returning 403 instead of 401',
      strategy: 'Fix authentication middleware - likely rate limiting issue',
      priority: 'HIGH',
      files: ['backend/middleware/auth.js', 'backend/middleware/rateLimiter.js']
    },
    {
      issue: 'POST /onboarding/complete returning 404',
      strategy: 'Add missing endpoint or fix route mounting',
      priority: 'MEDIUM',
      files: ['backend/routes/onboarding.js', 'backend/server.js']
    },
    {
      issue: 'POST /password-reset/request returning 404',
      strategy: 'Fix route conflict between backend and Vercel API',
      priority: 'MEDIUM',
      files: ['backend/routes/passwordReset.js', 'backend/server.js']
    }
  ];
  
  strategies.forEach((strategy, index) => {
    console.log(`\n${index + 1}. ${strategy.issue}`);
    console.log(`   Strategy: ${strategy.strategy}`);
    console.log(`   Priority: ${strategy.priority}`);
    console.log(`   Files to check: ${strategy.files.join(', ')}`);
  });
  
  return strategies;
}

async function testWithValidAuth() {
  console.log('\n🔐 TESTING WITH VALID AUTHENTICATION');
  console.log('====================================');
  
  const baseUrl = 'https://app.floworx-iq.com/api';
  
  // First, try to get a valid auth token
  console.log('🔑 Attempting to get valid auth token...');
  
  try {
    const loginResponse = await axios.post(`${baseUrl}/auth/login`, {
      email: 'test@floworx.com',
      password: 'TestPassword123!'
    }, {
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log(`Login attempt: ${loginResponse.status}`);
    
    if (loginResponse.status === 200 && loginResponse.data.token) {
      const token = loginResponse.data.token;
      console.log('✅ Valid auth token obtained');
      
      // Test protected endpoints with valid token
      const protectedEndpoints = [
        '/user/status',
        '/dashboard/status', 
        '/onboarding/status'
      ];
      
      for (const endpoint of protectedEndpoints) {
        try {
          const response = await axios.get(`${baseUrl}${endpoint}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            timeout: 10000,
            validateStatus: () => true
          });
          
          console.log(`${endpoint}: ${response.status}`);
          
          if (response.status === 200) {
            console.log(`   ✅ Working with valid auth`);
          } else if (response.status === 403) {
            console.log(`   ❌ Still 403 even with valid auth - deeper issue`);
          } else {
            console.log(`   ⚠️  Unexpected status: ${response.status}`);
          }
          
        } catch (error) {
          console.log(`${endpoint}: ❌ ${error.message}`);
        }
      }
      
    } else {
      console.log('❌ Could not obtain valid auth token');
      console.log('Will need to fix authentication issues first');
    }
    
  } catch (error) {
    console.log(`❌ Login test failed: ${error.message}`);
  }
}

async function main() {
  console.log('🎯 FIX REMAINING ENDPOINTS - ACHIEVE 100%');
  console.log('=========================================');
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  
  const failedEndpoints = await analyzeFailedEndpoints();
  const strategies = await identifyFixStrategies();
  await testWithValidAuth();
  
  console.log('\n📊 ANALYSIS COMPLETE');
  console.log('===================');
  console.log(`Failed endpoints analyzed: ${failedEndpoints.length}`);
  console.log(`Fix strategies identified: ${strategies.length}`);
  
  console.log('\n💡 NEXT ACTIONS:');
  console.log('1. Fix authentication middleware (403 → 401 issues)');
  console.log('2. Fix registration validation (400 → 201/409)');
  console.log('3. Add missing onboarding/complete endpoint');
  console.log('4. Resolve password-reset/request routing conflict');
  console.log('5. Test all endpoints after fixes');
  console.log('6. Achieve 100% API success rate!');
  
  console.log('\n🎯 READY TO IMPLEMENT FIXES!');
}

main().catch(console.error);
