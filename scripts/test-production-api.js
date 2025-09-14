#!/usr/bin/env node

/**
 * Production API Endpoint Testing
 * Tests critical API endpoints against the deployed Vercel app
 */

const https = require('https');
const http = require('http');

const PRODUCTION_URL = 'https://floworx-gxl5ke7q0-floworxdevelopers-projects.vercel.app';

console.log('🌐 PRODUCTION API ENDPOINT TESTING');
);

  results.forEach(result => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${result.name}: ${status} (${result.status})`);
  });

  const passCount = results.filter(r => r.success).length;
  const totalCount = results.length;

  console.log(`\nOverall: ${passCount}/${totalCount} tests passed`);

  if (passCount < totalCount) {
    console.log('\n🔧 ISSUES DETECTED:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`- ${result.name}: ${result.error || `HTTP ${result.status}`}`);
    });
  }

  return results;
}

// Run the tests
runAPITests().catch(console.error);
