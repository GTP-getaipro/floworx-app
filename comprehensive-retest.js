console.log('🧪 COMPREHENSIVE API RETEST STARTING...');
console.log('='.repeat(50));

const https = require('https');
const baseUrl = 'https://app.floworx-iq.com';

const testEndpoints = [
  { name: 'System Health', url: '/api/health', method: 'GET' },
  { name: 'Database Health', url: '/api/health/database', method: 'GET' },
  { name: 'Business Types', url: '/api/business-types', method: 'GET' },
  { name: 'Business Types Test', url: '/api/business-types/test', method: 'GET' },
  { name: 'Password Reset Info', url: '/api/password-reset', method: 'GET' },
  { name: 'Hot Tub Business Type', url: '/api/business-types/hot-tub-spa', method: 'GET' }
];

async function testEndpoint(endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'app.floworx-iq.com',
      port: 443,
      path: endpoint.url,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Floworx-Test-Suite/1.0'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const success = res.statusCode >= 200 && res.statusCode < 300;
        const result = {
          name: endpoint.name,
          url: endpoint.url,
          status: res.statusCode,
          success: success,
          responseTime: Date.now() - startTime,
          dataLength: data.length
        };
        
        if (success) {
          console.log(`✅ ${endpoint.name}: ${res.statusCode} (${result.responseTime}ms)`);
        } else {
          console.log(`❌ ${endpoint.name}: ${res.statusCode} (${result.responseTime}ms)`);
        }
        
        resolve(result);
      });
    });

    req.on('error', (error) => {
      console.log(`❌ ${endpoint.name}: ERROR - ${error.message}`);
      resolve({
        name: endpoint.name,
        url: endpoint.url,
        status: 0,
        success: false,
        error: error.message
      });
    });

    const startTime = Date.now();
    req.end();
  });
}

async function runTests() {
  console.log('🔍 Testing critical endpoints...\n');
  
  const results = [];
  for (const endpoint of testEndpoints) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY:');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success).length;
  const total = results.length;
  const successRate = ((successful / total) * 100).toFixed(1);
  
  console.log(`✅ Successful: ${successful}/${total} (${successRate}%)`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  if (successful === total) {
    console.log('\n🎉 ALL TESTS PASSED! API is fully functional.');
  } else {
    console.log('\n⚠️ Some tests failed. Check individual results above.');
  }
  
  console.log('\n📈 Performance Summary:');
  const avgResponseTime = results
    .filter(r => r.responseTime)
    .reduce((sum, r) => sum + r.responseTime, 0) / results.filter(r => r.responseTime).length;
  console.log(`⏱️ Average Response Time: ${avgResponseTime.toFixed(0)}ms`);
}

runTests().catch(console.error);
