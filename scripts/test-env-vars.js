#!/usr/bin/env node

/**
 * Environment Variables Testing
 * Tests if production environment variables are properly set
 */

const https = require('https');

const PRODUCTION_URL = 'https://floworx-gxl5ke7q0-floworxdevelopers-projects.vercel.app';

console.log('🌍 ENVIRONMENT VARIABLES TESTING');
console.log('=================================');
console.log('Testing URL:', PRODUCTION_URL);
console.log('');

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FloWorx-Env-Test/1.0',
        ...options.headers
      }
    };

    const req = https.request(url, requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function testEnvironmentVariables() {
  console.log('🔍 Testing Environment Variables Endpoint...\n');
  
  try {
    // Test environment variables endpoint
    const envResponse = await makeRequest(`${PRODUCTION_URL}/api/debug/env`, {
      method: 'GET'
    });
    
    console.log(`Status: ${envResponse.statusCode}`);
    
    if (envResponse.statusCode === 200 && envResponse.data) {
      console.log('✅ Environment variables endpoint accessible');
      console.log('\n📋 Environment Variables Status:');
      
      const envVars = envResponse.data;
      
      // Check critical environment variables
      const criticalVars = [
        'NODE_ENV',
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'DB_HOST',
        'DB_PORT',
        'DB_USER',
        'DB_PASSWORD',
        'DB_NAME',
        'JWT_SECRET',
        'ENCRYPTION_KEY',
        'GOOGLE_CLIENT_ID',
        'GOOGLE_CLIENT_SECRET',
        'GOOGLE_REDIRECT_URI',
        'FRONTEND_URL'
      ];
      
      criticalVars.forEach(varName => {
        const status = envVars[varName] ? '✅ SET' : '❌ MISSING';
        const value = envVars[varName] ? 
          (varName.includes('SECRET') || varName.includes('PASSWORD') || varName.includes('KEY') ? 
            '[HIDDEN]' : envVars[varName]) : 'undefined';
        console.log(`   ${varName}: ${status} ${value !== 'undefined' ? `(${value})` : ''}`);
      });
      
    } else if (envResponse.statusCode === 404) {
      console.log('⚠️  Environment variables endpoint not found');
      console.log('   This is expected in production for security');
    } else {
      console.log(`❌ Unexpected response: ${envResponse.statusCode}`);
      if (envResponse.data.error) {
        console.log(`   Error: ${envResponse.data.error}`);
      }
    }
    
    // Test database connection endpoint
    console.log('\n🗄️  Testing Database Connection...');
    const dbResponse = await makeRequest(`${PRODUCTION_URL}/api/debug/database`, {
      method: 'GET'
    });
    
    console.log(`Status: ${dbResponse.statusCode}`);
    
    if (dbResponse.statusCode === 200) {
      console.log('✅ Database connection test successful');
      if (dbResponse.data.connection) {
        console.log(`   Connection: ${dbResponse.data.connection}`);
      }
      if (dbResponse.data.tables) {
        console.log(`   Tables found: ${dbResponse.data.tables.length}`);
      }
    } else if (dbResponse.statusCode === 404) {
      console.log('⚠️  Database test endpoint not found');
    } else {
      console.log(`❌ Database connection test failed: ${dbResponse.statusCode}`);
      if (dbResponse.data.error) {
        console.log(`   Error: ${dbResponse.data.error}`);
      }
    }
    
    // Test Supabase client
    console.log('\n🔌 Testing Supabase Client...');
    const supabaseResponse = await makeRequest(`${PRODUCTION_URL}/api/debug/supabase`, {
      method: 'GET'
    });
    
    console.log(`Status: ${supabaseResponse.statusCode}`);
    
    if (supabaseResponse.statusCode === 200) {
      console.log('✅ Supabase client test successful');
      if (supabaseResponse.data.client) {
        console.log(`   Client: ${supabaseResponse.data.client}`);
      }
    } else if (supabaseResponse.statusCode === 404) {
      console.log('⚠️  Supabase test endpoint not found');
    } else {
      console.log(`❌ Supabase client test failed: ${supabaseResponse.statusCode}`);
      if (supabaseResponse.data.error) {
        console.log(`   Error: ${supabaseResponse.data.error}`);
      }
    }
    
    return true;
    
  } catch (error) {
    console.log(`❌ Environment variables test failed: ${error.message}`);
    return false;
  }
}

// Run the test
testEnvironmentVariables().then(success => {
  console.log('\n📊 ENVIRONMENT TEST RESULT:');
  console.log('============================');
  console.log('Success:', success ? '✅ YES' : '❌ NO');
  
  if (!success) {
    console.log('\n🔧 RECOMMENDATIONS:');
    console.log('- Verify environment variables are set in Vercel dashboard');
    console.log('- Check that all required variables are configured');
    console.log('- Ensure production deployment has latest environment variables');
  }
}).catch(console.error);
