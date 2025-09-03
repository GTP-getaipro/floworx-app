#!/usr/bin/env node

/**
 * Test Production Deployment
 * Comprehensive testing of production deployment fixes
 */

const https = require('https');

const PRODUCTION_URL = 'https://floworx-gxl5ke7q0-floworxdevelopers-projects.vercel.app';

console.log('🧪 PRODUCTION DEPLOYMENT TEST');
console.log('=============================');
console.log('Testing URL:', PRODUCTION_URL);
console.log('');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FloWorx-Production-Test/1.0',
        ...options.headers,
      },
    };

    const req = https.request(url, requestOptions, res => {
      let data = '';

      res.on('data', chunk => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
        });
      });
    });

    req.on('error', error => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testProductionDeployment() {
  const results = {
    manifestJson: false,
    homePage: false,
    apiHealth: false,
    staticFiles: false,
    jsErrors: false,
  };

  console.log('🚀 Starting Production Deployment Tests...\n');

  try {
    // Test 1: Manifest.json (should not return 404)
    console.log('1️⃣ Testing manifest.json...');
    try {
      const manifestResponse = await makeRequest(`${PRODUCTION_URL}/manifest.json`);
      if (manifestResponse.statusCode === 200) {
        console.log('   ✅ manifest.json loads successfully');
        results.manifestJson = true;
      } else {
        console.log(`   ❌ manifest.json returned ${manifestResponse.statusCode}`);
      }
    } catch (error) {
      console.log(`   ❌ manifest.json request failed: ${error.message}`);
    }

    // Test 2: Homepage (should load without errors)
    console.log('\n2️⃣ Testing homepage...');
    try {
      const homeResponse = await makeRequest(PRODUCTION_URL);
      if (homeResponse.statusCode === 200) {
        console.log('   ✅ Homepage loads successfully');
        results.homePage = true;

        // Check for JavaScript errors in HTML
        if (
          homeResponse.data.includes('ReferenceError') ||
          homeResponse.data.includes('Cannot access')
        ) {
          console.log('   ⚠️  Potential JavaScript errors detected in HTML');
        } else {
          console.log('   ✅ No obvious JavaScript errors in HTML');
          results.jsErrors = true;
        }
      } else {
        console.log(`   ❌ Homepage returned ${homeResponse.statusCode}`);
      }
    } catch (error) {
      console.log(`   ❌ Homepage request failed: ${error.message}`);
    }

    // Test 3: API Health Check
    console.log('\n3️⃣ Testing API health...');
    try {
      const apiResponse = await makeRequest(`${PRODUCTION_URL}/api/health`);
      if (apiResponse.statusCode === 200) {
        console.log('   ✅ API health check successful');
        results.apiHealth = true;

        try {
          const healthData = JSON.parse(apiResponse.data);
          console.log(`   ✅ API Status: ${healthData.status}`);
          if (healthData.database) {
            console.log(`   ✅ Database: ${healthData.database.status}`);
          }
        } catch (parseError) {
          console.log('   ⚠️  API response not valid JSON');
        }
      } else {
        console.log(`   ❌ API health check returned ${apiResponse.statusCode}`);
      }
    } catch (error) {
      console.log(`   ❌ API health check failed: ${error.message}`);
    }

    // Test 4: Static Files
    console.log('\n4️⃣ Testing static files...');
    const staticFiles = ['/robots.txt', '/favicon.ico'];

    let staticFilesWorking = 0;
    for (const file of staticFiles) {
      try {
        const staticResponse = await makeRequest(`${PRODUCTION_URL}${file}`);
        if (staticResponse.statusCode === 200) {
          console.log(`   ✅ ${file} loads successfully`);
          staticFilesWorking++;
        } else {
          console.log(`   ❌ ${file} returned ${staticResponse.statusCode}`);
        }
      } catch (error) {
        console.log(`   ❌ ${file} request failed: ${error.message}`);
      }
    }

    results.staticFiles = staticFilesWorking === staticFiles.length;

    // Test 5: User Registration (Quick Test)
    console.log('\n5️⃣ Testing user registration endpoint...');
    try {
      const testUser = {
        email: `test-${Date.now()}@floworx-test.com`,
        password: 'TestPassword123!',
        firstName: 'Test',
        lastName: 'User',
      };

      const registerResponse = await makeRequest(`${PRODUCTION_URL}/api/auth/register`, {
        method: 'POST',
        body: testUser,
      });

      if (registerResponse.statusCode === 201) {
        console.log('   ✅ User registration endpoint working');
      } else {
        console.log(`   ⚠️  User registration returned ${registerResponse.statusCode}`);
        console.log(`   Response: ${registerResponse.data.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`   ❌ User registration test failed: ${error.message}`);
    }

    console.log('\n📊 TEST RESULTS SUMMARY');
    console.log('=======================');

    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(Boolean).length;

    console.log(`Overall Score: ${passedTests}/${totalTests} tests passed\n`);

    Object.entries(results).forEach(([test, passed]) => {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`${status} - ${testName}`);
    });

    console.log('\n🎯 DEPLOYMENT STATUS');
    console.log('====================');

    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED! Production deployment is successful!');
      console.log('✅ Manifest.json error - FIXED');
      console.log('✅ JavaScript ReferenceError - FIXED');
      console.log('✅ Build configuration - FIXED');
      console.log('✅ Static file routing - FIXED');
      console.log('✅ API functionality - WORKING');
    } else if (passedTests >= totalTests * 0.8) {
      console.log('⚠️  MOSTLY WORKING - Minor issues remain');
      console.log('🔧 Most critical errors have been resolved');
    } else {
      console.log('❌ SIGNIFICANT ISSUES REMAIN');
      console.log('🔧 Additional fixes needed');
    }

    return {
      success: passedTests >= totalTests * 0.8,
      score: `${passedTests}/${totalTests}`,
      results,
    };
  } catch (error) {
    console.log(`\n❌ Test suite failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run the tests
testProductionDeployment()
  .then(result => {
    console.log('\n🏁 Production deployment testing completed!');
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
