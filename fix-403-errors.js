#!/usr/bin/env node

/**
 * FIX 403 ERRORS - FINAL PUSH TO 100%
 * ====================================
 * Fix the remaining 4 endpoints returning 403 instead of 200/401
 */

const axios = require('axios');

async function investigateAuthenticationIssues() {
  console.log('🔍 INVESTIGATING 403 AUTHENTICATION ISSUES');
  console.log('===========================================');
  
  const baseUrl = 'https://app.floworx-iq.com/api';
  
  // First, get a valid auth token
  console.log('🔑 Getting valid authentication token...');
  
  try {
    const loginResponse = await axios.post(`${baseUrl}/auth/login`, {
      email: 'test@floworx.com',
      password: 'TestPassword123!'
    }, {
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log(`Login status: ${loginResponse.status}`);
    
    if (loginResponse.status !== 200) {
      console.log('❌ Cannot get valid auth token, trying registration first...');
      
      // Try to register a test user
      const registerResponse = await axios.post(`${baseUrl}/auth/register`, {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@floworx.com',
        password: 'TestPassword123!',
        businessName: 'Test Company',
        agreeToTerms: true,
        marketingConsent: false
      }, {
        timeout: 10000,
        validateStatus: () => true
      });
      
      console.log(`Registration status: ${registerResponse.status}`);
      
      if (registerResponse.status === 201) {
        console.log('✅ Test user registered, trying login again...');
        
        const loginRetry = await axios.post(`${baseUrl}/auth/login`, {
          email: 'test@floworx.com',
          password: 'TestPassword123!'
        }, {
          timeout: 10000,
          validateStatus: () => true
        });
        
        console.log(`Login retry status: ${loginRetry.status}`);
        
        if (loginRetry.status === 200 && loginRetry.data.token) {
          return loginRetry.data.token;
        }
      }
    } else if (loginResponse.data.token) {
      console.log('✅ Valid auth token obtained');
      return loginResponse.data.token;
    }
    
    console.log('❌ Could not obtain valid auth token');
    return null;
    
  } catch (error) {
    console.log(`❌ Authentication error: ${error.message}`);
    return null;
  }
}

async function testEndpointsWithValidAuth(token) {
  console.log('\n🧪 TESTING 403 ENDPOINTS WITH VALID AUTH');
  console.log('=========================================');
  
  const baseUrl = 'https://app.floworx-iq.com/api';
  
  const problematicEndpoints = [
    { path: '/user/status', method: 'GET' },
    { path: '/dashboard/status', method: 'GET' },
    { path: '/onboarding/status', method: 'GET' },
    { path: '/onboarding/complete', method: 'POST', data: { workflowId: 'test' } }
  ];
  
  const results = [];
  
  for (const endpoint of problematicEndpoints) {
    console.log(`\n🧪 Testing: ${endpoint.method} ${endpoint.path}`);
    
    try {
      const config = {
        method: endpoint.method.toLowerCase(),
        url: `${baseUrl}${endpoint.path}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        validateStatus: () => true
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Headers: ${JSON.stringify(response.headers['x-ratelimit-remaining'] || 'No rate limit info')}`);
      
      if (response.status === 200) {
        console.log('   ✅ SUCCESS: Working with valid auth');
        results.push({ ...endpoint, status: response.status, success: true });
      } else if (response.status === 401) {
        console.log('   ⚠️  401: Token might be invalid or expired');
        results.push({ ...endpoint, status: response.status, success: false, issue: 'Token invalid' });
      } else if (response.status === 403) {
        console.log('   ❌ 403: Still forbidden even with valid auth');
        console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
        results.push({ ...endpoint, status: response.status, success: false, issue: 'Still 403 with auth' });
      } else {
        console.log(`   ⚠️  Unexpected: ${response.status}`);
        results.push({ ...endpoint, status: response.status, success: false, issue: `Unexpected ${response.status}` });
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      results.push({ ...endpoint, status: 'ERROR', success: false, issue: error.message });
    }
  }
  
  return results;
}

async function analyzeRateLimiting() {
  console.log('\n🔍 ANALYZING RATE LIMITING');
  console.log('==========================');
  
  const baseUrl = 'https://app.floworx-iq.com/api';
  
  // Test a simple endpoint multiple times to check rate limiting
  console.log('🧪 Testing rate limiting with /health endpoint...');
  
  for (let i = 1; i <= 10; i++) {
    try {
      const response = await axios.get(`${baseUrl}/health`, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      const rateLimitRemaining = response.headers['x-ratelimit-remaining'];
      const rateLimitReset = response.headers['x-ratelimit-reset'];
      
      console.log(`   Request ${i}: ${response.status} - Remaining: ${rateLimitRemaining || 'N/A'} - Reset: ${rateLimitReset || 'N/A'}`);
      
      if (response.status === 429) {
        console.log('   🚨 Rate limited detected!');
        break;
      }
      
      if (response.status === 403) {
        console.log('   🚨 403 error on health endpoint - this suggests server-level blocking');
        break;
      }
      
    } catch (error) {
      console.log(`   Request ${i}: Error - ${error.message}`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

async function checkServerConfiguration() {
  console.log('\n🔍 CHECKING SERVER CONFIGURATION');
  console.log('================================');
  
  const baseUrl = 'https://app.floworx-iq.com/api';
  
  // Check if the server is responding correctly
  const testEndpoints = [
    '/health',
    '/business-types',
    '/performance'
  ];
  
  console.log('🧪 Testing known working endpoints...');
  
  for (const endpoint of testEndpoints) {
    try {
      const response = await axios.get(`${baseUrl}${endpoint}`, {
        timeout: 5000,
        validateStatus: () => true
      });
      
      console.log(`${endpoint}: ${response.status}`);
      
      if (response.status >= 500) {
        console.log('   🚨 Server error detected');
      } else if (response.status === 403) {
        console.log('   🚨 403 on working endpoint - server issue');
      }
      
    } catch (error) {
      console.log(`${endpoint}: Error - ${error.message}`);
    }
  }
}

async function main() {
  console.log('🔧 FIX 403 ERRORS - FINAL PUSH TO 100%');
  console.log('======================================');
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  
  // Get valid auth token
  const token = await investigateAuthenticationIssues();
  
  if (token) {
    // Test problematic endpoints with valid auth
    const results = await testEndpointsWithValidAuth(token);
    
    console.log('\n📊 RESULTS WITH VALID AUTH:');
    const successful = results.filter(r => r.success).length;
    console.log(`Working with auth: ${successful}/${results.length}`);
    
    results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.method} ${result.path} - ${result.status} ${result.issue ? `(${result.issue})` : ''}`);
    });
    
    if (successful === results.length) {
      console.log('\n🎉 ALL ENDPOINTS WORKING WITH VALID AUTH!');
      console.log('The issue was authentication token validation.');
      console.log('The comprehensive test needs to use proper auth tokens.');
    } else {
      console.log('\n⚠️  Some endpoints still failing even with valid auth.');
      console.log('This suggests deeper server configuration issues.');
    }
  } else {
    console.log('\n❌ Could not obtain valid auth token');
    console.log('Authentication system may have issues');
  }
  
  // Check rate limiting
  await analyzeRateLimiting();
  
  // Check server configuration
  await checkServerConfiguration();
  
  console.log('\n💡 RECOMMENDATIONS:');
  console.log('1. Fix authentication token handling in comprehensive test');
  console.log('2. Check rate limiting configuration');
  console.log('3. Verify server deployment status');
  console.log('4. Test with proper JWT tokens');
  
  console.log('\n🔧 403 ERROR INVESTIGATION COMPLETE!');
}

main().catch(console.error);
