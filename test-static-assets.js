#!/usr/bin/env node

/**
 * TEST STATIC ASSET SERVING
 * =========================
 * Check what content is actually being served for static assets
 */

const axios = require('axios');

async function testStaticAsset(url) {
  try {
    console.log(`\n🧪 Testing: ${url}`);
    console.log('-'.repeat(50));
    
    const response = await axios.get(url, {
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers['content-type']}`);
    console.log(`Content-Length: ${response.headers['content-length'] || 'Not specified'}`);
    
    // Check first 200 characters of content
    const content = response.data.toString().substring(0, 200);
    console.log(`Content Preview: ${content}...`);
    
    // Determine if this is the expected content type
    const isCSS = url.includes('.css');
    const isJS = url.includes('.js');
    const contentType = response.headers['content-type'] || '';
    
    let expectedContent = false;
    if (isCSS && contentType.includes('text/css')) {
      expectedContent = true;
    } else if (isJS && contentType.includes('javascript')) {
      expectedContent = true;
    } else if (contentType.includes('text/html')) {
      console.log('⚠️  WARNING: Getting HTML instead of expected asset type');
      console.log('   This suggests the server is serving the React app for all routes');
    }
    
    return {
      url,
      status: response.status,
      contentType: response.headers['content-type'],
      expectedContent,
      isHTML: contentType.includes('text/html'),
      contentPreview: content
    };
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return {
      url,
      error: error.message,
      expectedContent: false
    };
  }
}

async function main() {
  console.log('🔍 STATIC ASSET SERVING TEST');
  console.log('============================');
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  
  const testUrls = [
    'https://app.floworx-iq.com/static/css/main.css',
    'https://app.floworx-iq.com/static/js/main.js',
    'https://app.floworx-iq.com/static/css/686.6b0c9db3.chunk.css',
    'https://app.floworx-iq.com/manifest.json',
    'https://app.floworx-iq.com/favicon.ico',
    'https://app.floworx-iq.com/' // For comparison
  ];
  
  const results = [];
  
  for (const url of testUrls) {
    const result = await testStaticAsset(url);
    results.push(result);
  }
  
  console.log('\n📊 SUMMARY');
  console.log('==========');
  
  const htmlResponses = results.filter(r => r.isHTML);
  const properAssets = results.filter(r => r.expectedContent);
  
  console.log(`Total URLs tested: ${results.length}`);
  console.log(`Returning HTML: ${htmlResponses.length}`);
  console.log(`Proper asset serving: ${properAssets.length}`);
  
  if (htmlResponses.length > 1) { // More than just the index page
    console.log('\n🚨 ISSUE DETECTED:');
    console.log('Static assets are returning HTML instead of actual files');
    console.log('This indicates a server configuration problem');
    
    console.log('\n🔧 LIKELY CAUSES:');
    console.log('1. Frontend build not properly deployed to server');
    console.log('2. Express static middleware not working correctly');
    console.log('3. Server catch-all route serving React app for static assets');
    console.log('4. Docker container not including built frontend assets');
    
    console.log('\n💡 SOLUTIONS:');
    console.log('1. Verify frontend/build directory exists in deployed container');
    console.log('2. Check Docker COPY commands in Dockerfile');
    console.log('3. Verify Express static middleware configuration');
    console.log('4. Check deployment logs for build errors');
  } else {
    console.log('\n✅ Static asset serving appears to be working correctly');
  }
  
  console.log('\n🔍 STATIC ASSET TEST COMPLETE!');
}

main().catch(console.error);
