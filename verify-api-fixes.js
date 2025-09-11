#!/usr/bin/env node

/**
 * VERIFY API FIXES
 * ================
 * Test the newly added API endpoints to ensure they're working
 */

const axios = require('axios');

async function waitForDeployment() {
  console.log('⏳ WAITING FOR DEPLOYMENT');
  console.log('========================');
  console.log('Following deployment rules: Wait 3 minutes after git push');
  
  const waitTime = 3 * 60 * 1000; // 3 minutes
  const startTime = Date.now();
  
  while (Date.now() - startTime < waitTime) {
    const remaining = Math.ceil((waitTime - (Date.now() - startTime)) / 1000);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    process.stdout.write(`\r⏱️  Deployment wait... ${minutes}:${seconds.toString().padStart(2, '0')} remaining`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✅ Deployment wait complete! Testing API fixes...\n');
}

async function testFixedEndpoints() {
  console.log('🧪 TESTING FIXED API ENDPOINTS');
  console.log('==============================');
  
  const baseUrl = 'https://app.floworx-iq.com/api';
  
  const fixedEndpoints = [
    { path: '/dashboard/status', method: 'GET', description: 'Dashboard Status (FIXED)', expectedStatus: [200, 401] },
    { path: '/workflows', method: 'GET', description: 'Workflows Main (FIXED)', expectedStatus: [200, 401] },
    { path: '/analytics', method: 'GET', description: 'Analytics Overview (FIXED)', expectedStatus: [200, 401] },
    { path: '/recovery', method: 'GET', description: 'Recovery Options (FIXED)', expectedStatus: [200] },
    { path: '/recovery/initiate', method: 'POST', description: 'Recovery Initiate (FIXED)', expectedStatus: [200, 400] },
    { path: '/password-reset', method: 'GET', description: 'Password Reset Info (FIXED)', expectedStatus: [200] }
  ];
  
  const results = [];
  
  for (const endpoint of fixedEndpoints) {
    try {
      console.log(`\n🧪 Testing: ${endpoint.method} ${endpoint.path}`);
      console.log(`   Description: ${endpoint.description}`);
      
      const config = {
        method: endpoint.method.toLowerCase(),
        url: `${baseUrl}${endpoint.path}`,
        timeout: 10000,
        validateStatus: () => true
      };
      
      if (endpoint.method === 'POST') {
        config.data = { email: 'test@example.com' };
        config.headers = { 'Content-Type': 'application/json' };
      }
      
      const response = await axios(config);
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers['content-type'] || 'Not specified'}`);
      
      const isExpected = endpoint.expectedStatus.includes(response.status);
      
      if (isExpected) {
        if (response.status === 404) {
          console.log(`   ❌ STILL 404: Endpoint still missing after fix`);
          results.push({ ...endpoint, status: response.status, success: false, issue: 'Still 404' });
        } else if (response.status === 401) {
          console.log(`   ✅ WORKING: Endpoint exists but requires authentication (expected)`);
          results.push({ ...endpoint, status: response.status, success: true, issue: null });
        } else if (response.status === 200) {
          console.log(`   ✅ WORKING: Endpoint working correctly`);
          results.push({ ...endpoint, status: response.status, success: true, issue: null });
        } else {
          console.log(`   ✅ EXPECTED: Status ${response.status} is expected`);
          results.push({ ...endpoint, status: response.status, success: true, issue: null });
        }
      } else {
        console.log(`   ❌ UNEXPECTED: Status ${response.status}, expected: ${endpoint.expectedStatus.join(', ')}`);
        results.push({ ...endpoint, status: response.status, success: false, issue: `Unexpected status: ${response.status}` });
      }
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      results.push({ ...endpoint, status: 'ERROR', success: false, issue: error.message });
    }
  }
  
  return results;
}

async function runComprehensiveTest() {
  console.log('\n🚀 RUNNING COMPREHENSIVE API TEST');
  console.log('=================================');
  
  try {
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const testProcess = spawn('node', ['comprehensive-api-test.js'], {
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      let output = '';
      let errorOutput = '';
      
      testProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      testProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      
      testProcess.on('close', (code) => {
        console.log(output);
        if (errorOutput) {
          console.error('Errors:', errorOutput);
        }
        
        // Extract success rate from output
        const successRateMatch = output.match(/📈 Success Rate: ([\d.]+)%/);
        const successRate = successRateMatch ? parseFloat(successRateMatch[1]) : 0;
        
        resolve({ code, successRate, output });
      });
      
      testProcess.on('error', (error) => {
        reject(error);
      });
    });
    
  } catch (error) {
    console.error('Failed to run comprehensive test:', error.message);
    return { code: 1, successRate: 0, output: '' };
  }
}

async function main() {
  console.log('🔧 VERIFY API FIXES');
  console.log('===================');
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  
  // Wait for deployment
  await waitForDeployment();
  
  // Test the specific endpoints we fixed
  const fixedResults = await testFixedEndpoints();
  
  // Run comprehensive test
  const comprehensiveResults = await runComprehensiveTest();
  
  console.log('\n📊 API FIXES VERIFICATION RESULTS');
  console.log('=================================');
  
  const fixedSuccessful = fixedResults.filter(r => r.success).length;
  const fixedTotal = fixedResults.length;
  
  console.log(`Fixed Endpoints: ${fixedSuccessful}/${fixedTotal} working`);
  console.log(`Comprehensive Test Success Rate: ${comprehensiveResults.successRate}%`);
  
  console.log('\n📋 FIXED ENDPOINTS STATUS:');
  fixedResults.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${index + 1}. ${status} ${result.method} ${result.path} - ${result.status}`);
    if (result.issue) {
      console.log(`   Issue: ${result.issue}`);
    }
  });
  
  if (fixedSuccessful === fixedTotal && comprehensiveResults.successRate > 80) {
    console.log('\n🎉 API FIXES SUCCESSFUL!');
    console.log('All critical endpoints are now working correctly.');
    console.log('Your FloWorx application has comprehensive API coverage.');
  } else if (fixedSuccessful === fixedTotal) {
    console.log('\n✅ FIXED ENDPOINTS WORKING!');
    console.log('The specific endpoints we fixed are working correctly.');
    console.log('Some other endpoints may still need attention.');
  } else {
    console.log('\n⚠️  SOME FIXES NEED MORE TIME');
    console.log('Deployment may still be propagating. Wait 2-3 more minutes and test again.');
  }
  
  console.log('\n🔧 API FIXES VERIFICATION COMPLETE!');
  
  return {
    fixedEndpointsWorking: fixedSuccessful === fixedTotal,
    overallSuccessRate: comprehensiveResults.successRate,
    allWorking: fixedSuccessful === fixedTotal && comprehensiveResults.successRate > 80
  };
}

main().catch(console.error);
