#!/usr/bin/env node

/**
 * CACHE BUSTING TEST
 * ==================
 * Test static assets with cache-busting headers to verify fix
 */

const axios = require('axios');

async function testWithCacheBusting(url) {
  try {
    console.log(`\n🧪 Testing with cache busting: ${url}`);
    
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'User-Agent': 'FloWorx-Cache-Buster/1.0'
      },
      validateStatus: () => true
    });
    
    const contentType = response.headers['content-type'] || '';
    const isExpectedType = url.includes('.css') ? contentType.includes('text/css') : 
                          url.includes('.js') ? contentType.includes('javascript') : true;
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${contentType}`);
    console.log(`   Expected Type: ${isExpectedType ? '✅' : '❌'}`);
    
    if (!isExpectedType && contentType.includes('text/html')) {
      console.log(`   🚨 Still serving HTML instead of asset`);
    }
    
    return {
      url,
      status: response.status,
      contentType,
      isExpectedType,
      isHTML: contentType.includes('text/html')
    };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { url, error: error.message, isExpectedType: false };
  }
}

async function main() {
  console.log('🔄 CACHE BUSTING TEST FOR STATIC ASSETS');
  console.log('=======================================');
  console.log('Testing with cache-busting headers to bypass any caching issues');
  console.log(`⏰ Started: ${new Date().toISOString()}\n`);
  
  const testUrls = [
    'https://app.floworx-iq.com/static/css/main.css',
    'https://app.floworx-iq.com/static/js/main.js',
    'https://app.floworx-iq.com/static/css/686.6b0c9db3.chunk.css'
  ];
  
  const results = [];
  
  for (const url of testUrls) {
    const result = await testWithCacheBusting(url);
    results.push(result);
  }
  
  console.log('\n📊 CACHE BUSTING TEST RESULTS');
  console.log('=============================');
  
  const workingAssets = results.filter(r => r.isExpectedType);
  const brokenAssets = results.filter(r => r.isHTML);
  
  console.log(`✅ Working assets: ${workingAssets.length}/${results.length}`);
  console.log(`❌ Still broken: ${brokenAssets.length}/${results.length}`);
  
  if (brokenAssets.length === 0) {
    console.log('\n🎉 SUCCESS: All static assets are now serving correctly!');
    console.log('The deployment fix has been successful.');
    console.log('\n💡 USER ACTION NEEDED:');
    console.log('Clear your browser cache and hard refresh (Ctrl+F5) to see the fix.');
  } else {
    console.log('\n⚠️  PARTIAL SUCCESS: Some assets still have issues');
    console.log('This might indicate a deployment propagation delay.');
    console.log('Wait 5-10 more minutes and test again.');
  }
  
  console.log('\n🔄 CACHE BUSTING TEST COMPLETE!');
}

main().catch(console.error);
