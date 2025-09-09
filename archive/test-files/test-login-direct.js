#!/usr/bin/env node

/**
 * Test the login endpoint directly to see what's happening
 */

const https = require('https');

async function testLogin(path, email, password) {
  return new Promise((resolve) => {
    const loginData = JSON.stringify({ email, password });
    
    const options = {
      hostname: 'app.floworx-iq.com',
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          path,
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        path,
        status: 'ERROR',
        error: err.message
      });
    });
    
    req.write(loginData);
    req.end();
  });
}

async function testAllLoginPaths() {
  console.log('🔍 TESTING LOGIN ENDPOINTS');
  console.log('==========================');
  
  const email = 'dizelll2007@gmail.com';
  const password = 'Dizell2007!';
  
  const loginPaths = [
    '/api/auth/login',
    '/auth/login', 
    '/api/login',
    '/login'
  ];
  
  for (const path of loginPaths) {
    console.log(`\nTesting: ${path}`);
    const result = await testLogin(path, email, password);
    console.log(`Status: ${result.status}`);
    
    if (result.body) {
      try {
        const parsed = JSON.parse(result.body);
        if (parsed.token) {
          console.log(`✅ SUCCESS! Token: ${parsed.token.substring(0, 30)}...`);
        } else {
          console.log(`Response: ${JSON.stringify(parsed)}`);
        }
      } catch (e) {
        console.log(`Raw response: ${result.body.substring(0, 200)}`);
      }
    }
  }
}

testAllLoginPaths().catch(console.error);
