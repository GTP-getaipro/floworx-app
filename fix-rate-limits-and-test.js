#!/usr/bin/env node

const https = require('https');

console.log('🚨 FLOWORX RATE LIMIT DIAGNOSIS & RECOVERY');
console.log('==========================================');

const BASE_URL = 'https://app.floworx-iq.com';

async function testSingleEndpoint(endpoint, expectedStatuses = [200]) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'app.floworx-iq.com',
      port: 443,
      path: endpoint,
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'FloWorx-Recovery-Test/1.0',
        'Accept': 'application/json'
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          success: true,
          status: res.statusCode,
          data: data,
          headers: res.headers
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Timeout'
      });
    });
    
    req.end();
  });
}

async function diagnoseRateLimiting() {
  console.log('\n🔍 DIAGNOSING RATE LIMITING ISSUE');
  console.log('=================================');
  
  // Test the most basic endpoint
  console.log('Testing basic health endpoint...');
  const healthResult = await testSingleEndpoint('/api/health');
  
  if (healthResult.success) {
    if (healthResult.status === 200) {
      console.log('✅ SUCCESS: Health endpoint working (200 OK)');
      console.log('   🎉 Rate limits have been cleared!');
      return true;
    } else if (healthResult.status === 429) {
      console.log('❌ RATE LIMITED: Still getting 429 errors');
      console.log('   🔧 Application restart needed');
      
      // Check rate limit headers
      if (healthResult.headers['retry-after']) {
        console.log(`   ⏰ Retry after: ${healthResult.headers['retry-after']} seconds`);
      }
      if (healthResult.headers['x-ratelimit-remaining']) {
        console.log(`   📊 Remaining requests: ${healthResult.headers['x-ratelimit-remaining']}`);
      }
      if (healthResult.headers['x-ratelimit-reset']) {
        const resetTime = new Date(parseInt(healthResult.headers['x-ratelimit-reset']) * 1000);
        console.log(`   🕐 Rate limit resets: ${resetTime.toLocaleString()}`);
      }
      
      return false;
    } else {
      console.log(`⚠️ UNEXPECTED: Got status ${healthResult.status}`);
      console.log(`   Response: ${healthResult.data.substring(0, 200)}...`);
      return false;
    }
  } else {
    console.log(`❌ CONNECTION ERROR: ${healthResult.error}`);
    return false;
  }
}

async function waitForRateLimitReset() {
  console.log('\n⏳ WAITING FOR RATE LIMIT RESET');
  console.log('===============================');
  
  let attempts = 0;
  const maxAttempts = 20; // 10 minutes max
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`\nAttempt ${attempts}/${maxAttempts} - Testing health endpoint...`);
    
    const result = await testSingleEndpoint('/api/health');
    
    if (result.success && result.status === 200) {
      console.log('🎉 SUCCESS: Rate limits cleared!');
      console.log('   ✅ System is now accessible');
      return true;
    } else if (result.success && result.status === 429) {
      console.log('⏳ Still rate limited, waiting 30 seconds...');
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
    } else {
      console.log(`⚠️ Unexpected response: ${result.status || result.error}`);
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    }
  }
  
  console.log('❌ Rate limits did not clear within 10 minutes');
  return false;
}

async function runQuickValidationTests() {
  console.log('\n🧪 RUNNING QUICK VALIDATION TESTS');
  console.log('=================================');
  
  const quickTests = [
    { name: 'Health Check', endpoint: '/api/health', expected: [200] },
    { name: 'Database Health', endpoint: '/api/health/db', expected: [200] },
    { name: 'Business Types', endpoint: '/api/business-types', expected: [200] },
    { name: 'Performance Metrics', endpoint: '/api/performance', expected: [200] },
    { name: 'Auth Requirements', endpoint: '/api/auth/password-requirements', expected: [200] }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of quickTests) {
    process.stdout.write(`Testing ${test.name}... `);
    
    const result = await testSingleEndpoint(test.endpoint);
    
    if (result.success && test.expected.includes(result.status)) {
      console.log(`✅ ${result.status}`);
      passed++;
      
      // Show some data for key endpoints
      if (test.name === 'Business Types' && result.data) {
        try {
          const data = JSON.parse(result.data);
          if (data.data && data.data.length) {
            console.log(`   📋 Found ${data.data.length} business types`);
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }
    } else {
      console.log(`❌ ${result.status || result.error}`);
      failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n📊 Quick Test Results: ${passed}/${quickTests.length} passed`);
  
  if (passed >= 4) {
    console.log('🎉 EXCELLENT: System is fully operational!');
    return true;
  } else if (passed >= 2) {
    console.log('⚠️ PARTIAL: Some endpoints working, others may need attention');
    return false;
  } else {
    console.log('❌ POOR: System still has issues');
    return false;
  }
}

async function main() {
  console.log('🚀 Starting rate limit recovery process...\n');
  console.log(`🎯 Target: ${BASE_URL}`);
  console.log(`📅 Started: ${new Date().toLocaleString()}\n`);
  
  // Step 1: Diagnose current state
  const isWorking = await diagnoseRateLimiting();
  
  if (isWorking) {
    console.log('\n✅ System is already working! Running validation tests...');
    await runQuickValidationTests();
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Run your browser regression tests');
    console.log('2. Test user registration at https://app.floworx-iq.com/register');
    console.log('3. Complete onboarding flow');
    return;
  }
  
  // Step 2: Provide clear instructions
  console.log('\n🔧 REQUIRED ACTION: RESTART APPLICATION');
  console.log('======================================');
  console.log('Your application needs to be restarted in Coolify to clear rate limits.');
  console.log('');
  console.log('📋 STEP-BY-STEP INSTRUCTIONS:');
  console.log('1. Open your Coolify dashboard');
  console.log('2. Navigate to your FloWorx application');
  console.log('3. Click the "Restart" or "Redeploy" button');
  console.log('4. Wait for the restart to complete (2-3 minutes)');
  console.log('5. Run this script again to verify the fix');
  console.log('');
  console.log('⚠️ IMPORTANT: This is the ONLY way to clear the rate limit cache');
  console.log('');
  
  // Step 3: Offer to wait and retest
  console.log('🤔 OPTIONS:');
  console.log('A) Restart your application now, then run: node fix-rate-limits-and-test.js');
  console.log('B) Wait here for rate limits to naturally expire (may take 15+ minutes)');
  console.log('');
  
  // For now, let's wait a bit and test again
  console.log('⏳ Waiting 2 minutes to test again...');
  await new Promise(resolve => setTimeout(resolve, 120000)); // Wait 2 minutes
  
  const isWorkingAfterWait = await diagnoseRateLimiting();
  
  if (isWorkingAfterWait) {
    console.log('\n🎉 Rate limits cleared naturally!');
    await runQuickValidationTests();
  } else {
    console.log('\n🚨 RESTART REQUIRED: Rate limits are still active');
    console.log('Please restart your application in Coolify to resolve this issue.');
  }
}

main().catch(console.error);
