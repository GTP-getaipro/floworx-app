/**
 * Test Frontend Serving in Production
 * Validates that the backend is properly serving React frontend static files
 */

const axios = require('axios');

async function testFrontendServing() {
  const baseUrl = 'https://app.floworx-iq.com';
  
  console.log('🧪 Testing Frontend Serving in Production');
  console.log('=' * 50);
  
  try {
    // Test 1: API Health Check
    console.log('\n1. Testing API Health Endpoint...');
    const apiResponse = await axios.get(`${baseUrl}/api/health`, { timeout: 10000 });
    console.log('✅ API Health:', apiResponse.data.status);
    console.log('   Version:', apiResponse.data.version);
    
    // Test 2: Frontend Root Route
    console.log('\n2. Testing Frontend Root Route (/)...');
    const frontendResponse = await axios.get(`${baseUrl}/`, { 
      timeout: 15000,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    console.log('✅ Frontend Status:', frontendResponse.status);
    console.log('   Content Type:', frontendResponse.headers['content-type']);

    // Handle both string and object responses
    const responseData = typeof frontendResponse.data === 'string' ? frontendResponse.data : JSON.stringify(frontendResponse.data);
    console.log('   Content Length:', responseData.length, 'characters');
    console.log('   Response Type:', typeof frontendResponse.data);
    console.log('   Response Data:', responseData.substring(0, 200) + (responseData.length > 200 ? '...' : ''));

    // Check if it's HTML content
    const isHTML = responseData.includes('<html') || responseData.includes('<!DOCTYPE html>');
    const hasReactApp = responseData.includes('root') || responseData.includes('React');
    const hasTitle = responseData.includes('<title>');
    
    console.log('   Is HTML:', isHTML ? '✅' : '❌');
    console.log('   Has React App:', hasReactApp ? '✅' : '❌');
    console.log('   Has Title Tag:', hasTitle ? '✅' : '❌');
    
    if (isHTML && hasTitle) {
      console.log('\n🎉 SUCCESS: Frontend is being served correctly!');
      console.log('   The Express backend is now serving React static files.');
    } else {
      console.log('\n⚠️ WARNING: Frontend may not be serving correctly.');
      console.log('   Response received but doesn\'t appear to be React app.');
    }
    
    // Test 3: Static Asset (CSS/JS)
    console.log('\n3. Testing Static Asset Serving...');
    try {
      // Try to find a CSS or JS file reference in the HTML
      const cssMatch = responseData.match(/href="([^"]*\.css[^"]*)"/);
      const jsMatch = responseData.match(/src="([^"]*\.js[^"]*)"/);

      if (cssMatch || jsMatch) {
        const assetUrl = cssMatch ? cssMatch[1] : jsMatch[1];
        const fullAssetUrl = assetUrl.startsWith('http') ? assetUrl : `${baseUrl}${assetUrl}`;

        console.log('   Testing asset:', assetUrl);
        const assetResponse = await axios.get(fullAssetUrl, { timeout: 10000 });
        console.log('✅ Static Asset Status:', assetResponse.status);
        console.log('   Asset Content Type:', assetResponse.headers['content-type']);
        console.log('   Asset Size:', assetResponse.data.length, 'characters');
      } else {
        console.log('   No CSS/JS assets found in HTML to test');
      }
    } catch (assetError) {
      console.log('❌ Static asset test failed:', assetError.message);
    }
    
    // Test 4: React Router Route (should return same HTML)
    console.log('\n4. Testing React Router Route (/dashboard)...');
    try {
      const routerResponse = await axios.get(`${baseUrl}/dashboard`, { 
        timeout: 10000,
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      
      console.log('✅ React Router Status:', routerResponse.status);
      const routerData = typeof routerResponse.data === 'string' ? routerResponse.data : JSON.stringify(routerResponse.data);
      const isSameAsRoot = routerData === responseData;
      console.log('   Same as root HTML:', isSameAsRoot ? '✅' : '❌');
      
      if (isSameAsRoot) {
        console.log('   React Router catch-all is working correctly!');
      }
    } catch (routerError) {
      console.log('❌ React Router test failed:', routerError.message);
    }
    
    // Summary
    console.log('\n' + '=' * 50);
    console.log('📊 FRONTEND SERVING TEST SUMMARY');
    console.log('=' * 50);
    
    const tests = [
      { name: 'API Health', status: '✅ PASSED' },
      { name: 'Frontend HTML', status: isHTML ? '✅ PASSED' : '❌ FAILED' },
      { name: 'React App Detection', status: hasReactApp ? '✅ PASSED' : '⚠️ UNCLEAR' },
      { name: 'HTML Structure', status: hasTitle ? '✅ PASSED' : '❌ FAILED' }
    ];
    
    tests.forEach(test => {
      console.log(`${test.status} ${test.name}`);
    });
    
    const overallSuccess = isHTML && hasTitle;
    console.log('\n🎯 OVERALL RESULT:', overallSuccess ? '✅ SUCCESS' : '❌ NEEDS ATTENTION');
    
    if (overallSuccess) {
      console.log('🚀 The backend is successfully serving the React frontend!');
      console.log('   Users can now access the full FloWorx application at:', baseUrl);
    } else {
      console.log('⚠️ Frontend serving may need additional configuration.');
      console.log('   Check the build directory and static file middleware setup.');
    }
    
    return overallSuccess;
    
  } catch (error) {
    console.error('\n❌ Frontend serving test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Server is not accessible - deployment may still be in progress');
    } else if (error.code === 'ENOTFOUND') {
      console.error('   DNS resolution failed - check domain configuration');
    } else if (error.response) {
      console.error('   HTTP Error:', error.response.status, error.response.statusText);
    }
    
    return false;
  }
}

// Run the test
if (require.main === module) {
  testFrontendServing()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = testFrontendServing;
