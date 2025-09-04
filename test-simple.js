const https = require('https');

const API_BASE = 'https://app.floworx-iq.com';

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}${path}`;
    
    const req = https.request(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testSimple() {
  console.log('🔍 TESTING SIMPLE ENDPOINTS');
  console.log('🌐 Target:', API_BASE);
  console.log('');

  const endpoints = [
    '/api/test',
    '/api/health',
    '/api/health/db',
    '/api/auth/password-requirements'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint);
      console.log(`${endpoint}: ${response.status}`);
      if (response.status === 200) {
        console.log('  Response:', JSON.stringify(response.data, null, 2));
      } else {
        console.log('  Error:', response.data);
      }
      console.log('');
    } catch (error) {
      console.log(`${endpoint}: ERROR - ${error.message}`);
      console.log('');
    }
  }
}

testSimple();
