#!/usr/bin/env node

/**
 * Test the user status endpoint directly with the verified user
 */

const https = require('https');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testUserStatusEndpoint() {
  console.log('🔍 TESTING USER STATUS ENDPOINT');
  console.log('===============================');
  
  const correctEmail = 'dizelll2007@gmail.com';
  const password = 'Dizell2007!'; // You may need to confirm this
  
  console.log('1️⃣ Step 1: Login to get a fresh token...');
  
  // First, login to get a token
  const loginData = JSON.stringify({
    email: correctEmail,
    password: password
  });
  
  const loginPromise = new Promise((resolve, reject) => {
    const options = {
      hostname: 'app.floworx-iq.com',
      port: 443,
      path: '/api/auth/login',
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
        try {
          const response = JSON.parse(data);
          console.log(`   Login Status: ${res.statusCode}`);
          
          if (res.statusCode === 200 && response.token) {
            console.log('   ✅ Login successful!');
            console.log(`   🎫 Token: ${response.token.substring(0, 50)}...`);
            resolve(response.token);
          } else {
            console.log('   ❌ Login failed');
            console.log(`   📄 Response: ${JSON.stringify(response, null, 2)}`);
            reject(new Error('Login failed'));
          }
        } catch (e) {
          console.log(`   ❌ Invalid JSON: ${data}`);
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(loginData);
    req.end();
  });
  
  try {
    const token = await loginPromise;
    
    console.log('\n2️⃣ Step 2: Test user status endpoint...');
    
    // Test user status endpoint
    const statusPromise = new Promise((resolve) => {
      const options = {
        hostname: 'app.floworx-iq.com',
        port: 443,
        path: '/api/user/status',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log(`   Status Code: ${res.statusCode}`);
          console.log(`   Headers: ${JSON.stringify(res.headers, null, 2)}`);
          
          try {
            const response = JSON.parse(data);
            console.log(`   📄 Response: ${JSON.stringify(response, null, 2)}`);
            
            if (res.statusCode === 200) {
              console.log('   ✅ User status loaded successfully!');
            } else {
              console.log('   ❌ User status failed');
            }
          } catch (e) {
            console.log(`   📄 Raw response: ${data}`);
          }
          resolve();
        });
      });
      
      req.on('error', (err) => {
        console.log(`   ❌ Request failed: ${err.message}`);
        resolve();
      });
      
      req.end();
    });
    
    await statusPromise;
    
    console.log('\n3️⃣ Step 3: Check user in database...');
    
    // Check user in database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', correctEmail)
      .single();
    
    if (error) {
      console.log('   ❌ Database error:', error.message);
    } else {
      console.log('   ✅ User found in database:');
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Name: ${user.first_name} ${user.last_name}`);
      console.log(`   🏢 Company: ${user.company_name}`);
      console.log(`   ✅ Verified: ${user.email_verified}`);
      console.log(`   🆔 ID: ${user.id}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testUserStatusEndpoint();
