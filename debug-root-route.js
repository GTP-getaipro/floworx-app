/**
 * Debug Root Route Response
 * Simple test to see exactly what's being returned by the root route
 */

const axios = require('axios');

async function debugRootRoute() {
  const baseUrl = 'https://app.floworx-iq.com';
  
  console.log('🔍 Debugging Root Route Response');
  console.log('=' * 50);
  
  try {
    console.log('\n1. Testing API Health Endpoint...');
    const apiResponse = await axios.get(`${baseUrl}/api/health`, { 
      timeout: 10000,
      validateStatus: () => true // Accept any status code
    });
    
    console.log('API Health Status:', apiResponse.status);
    console.log('API Health Data:', JSON.stringify(apiResponse.data, null, 2));
    
    console.log('\n2. Testing Root Route (/) with different headers...');
    
    // Test with browser-like headers
    const rootResponse = await axios.get(`${baseUrl}/`, { 
      timeout: 15000,
      validateStatus: () => true,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    console.log('Root Route Status:', rootResponse.status);
    console.log('Root Route Headers:', JSON.stringify(rootResponse.headers, null, 2));
    console.log('Root Route Data Type:', typeof rootResponse.data);
    console.log('Root Route Data Length:', rootResponse.data ? rootResponse.data.length || 'N/A' : 'N/A');
    
    if (typeof rootResponse.data === 'string') {
      console.log('Root Route Data (first 500 chars):', rootResponse.data.substring(0, 500));
      
      if (rootResponse.data.includes('<html') || rootResponse.data.includes('<!DOCTYPE')) {
        console.log('✅ SUCCESS: Root route is serving HTML!');
        
        // Check for React app indicators
        const hasReactRoot = rootResponse.data.includes('id="root"');
        const hasReactScripts = rootResponse.data.includes('.js');
        const hasTitle = rootResponse.data.includes('<title>');
        
        console.log('   Has React root div:', hasReactRoot ? '✅' : '❌');
        console.log('   Has JS scripts:', hasReactScripts ? '✅' : '❌');
        console.log('   Has title tag:', hasTitle ? '✅' : '❌');
        
        if (hasReactRoot && hasReactScripts && hasTitle) {
          console.log('🎉 PERFECT: React frontend is being served correctly!');
        }
      } else {
        console.log('❌ Root route is serving text but not HTML');
      }
    } else if (typeof rootResponse.data === 'object') {
      console.log('❌ Root route is serving JSON:', JSON.stringify(rootResponse.data, null, 2));
      
      // Check if it's the old health check response
      if (rootResponse.data.status && rootResponse.data.service === 'floworx-api') {
        console.log('🚨 PROBLEM: Root route is still serving the old health check JSON!');
        console.log('   This means the deployment hasn\'t updated or there\'s a caching issue.');
      }
    }
    
    console.log('\n3. Testing a React Router route (/dashboard)...');
    const dashboardResponse = await axios.get(`${baseUrl}/dashboard`, { 
      timeout: 10000,
      validateStatus: () => true,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    console.log('Dashboard Route Status:', dashboardResponse.status);
    console.log('Dashboard Route Data Type:', typeof dashboardResponse.data);
    
    if (typeof dashboardResponse.data === 'string' && dashboardResponse.data === rootResponse.data) {
      console.log('✅ Dashboard route returns same HTML as root (React Router working)');
    } else {
      console.log('❌ Dashboard route returns different content than root');
    }
    
    console.log('\n4. Testing static asset serving...');
    try {
      const faviconResponse = await axios.get(`${baseUrl}/favicon.ico`, { 
        timeout: 5000,
        validateStatus: () => true
      });
      console.log('Favicon Status:', faviconResponse.status);
      console.log('Favicon Content-Type:', faviconResponse.headers['content-type']);
      
      if (faviconResponse.status === 200) {
        console.log('✅ Static assets are being served');
      } else {
        console.log('❌ Static assets not being served properly');
      }
    } catch (faviconError) {
      console.log('❌ Favicon test failed:', faviconError.message);
    }
    
    console.log('\n' + '=' * 50);
    console.log('🎯 DIAGNOSIS SUMMARY');
    console.log('=' * 50);
    
    const isServingHTML = typeof rootResponse.data === 'string' && 
                         (rootResponse.data.includes('<html') || rootResponse.data.includes('<!DOCTYPE'));
    const isServingOldJSON = typeof rootResponse.data === 'object' && 
                            rootResponse.data.service === 'floworx-api';
    
    if (isServingHTML) {
      console.log('✅ RESULT: Frontend serving is working!');
      console.log('   The Express backend is successfully serving React static files.');
    } else if (isServingOldJSON) {
      console.log('❌ RESULT: Deployment issue detected');
      console.log('   The root route is still serving the old health check JSON.');
      console.log('   Possible causes:');
      console.log('   - Deployment hasn\'t completed yet');
      console.log('   - Load balancer/proxy caching old response');
      console.log('   - Code changes not properly deployed');
    } else {
      console.log('⚠️ RESULT: Unexpected response');
      console.log('   The root route is returning something unexpected.');
    }
    
  } catch (error) {
    console.error('\n❌ Debug test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('   Server is not accessible');
    } else if (error.code === 'ENOTFOUND') {
      console.error('   DNS resolution failed');
    } else if (error.response) {
      console.error('   HTTP Error:', error.response.status, error.response.statusText);
    }
  }
}

// Run the debug test
if (require.main === module) {
  debugRootRoute()
    .then(() => {
      console.log('\n🔍 Debug test completed');
    })
    .catch(error => {
      console.error('Debug test execution failed:', error);
    });
}

module.exports = debugRootRoute;
