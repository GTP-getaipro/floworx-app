#!/usr/bin/env node

/**
 * FloWorx Local Credentials Test Suite
 * 
 * This script tests all credentials and services configured in your .env file
 */

// Load environment variables manually since dotenv might not be installed
const fs = require('fs');
const path = require('path');

// Load .env file manually
try {
  const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && !key.startsWith('#') && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (error) {
  console.log('Warning: Could not load .env file');
}
const https = require('https');
const http = require('http');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function testSupabaseConnection() {
  log('\n🔍 Testing Supabase Connection...', colors.blue);
  
  try {
    // Test Supabase URL
    const url = `${process.env.SUPABASE_URL}/rest/v1/`;
    const response = await makeRequest(url, {
      headers: {
        'apikey': process.env.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`
      }
    });
    
    if (response.statusCode === 200) {
      log('✅ Supabase REST API connection successful', colors.green);
      log(`   URL: ${process.env.SUPABASE_URL}`, colors.cyan);
      return true;
    } else {
      log(`❌ Supabase REST API failed - Status: ${response.statusCode}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Supabase connection error: ${error.message}`, colors.red);
    return false;
  }
}

async function testDatabaseConnection() {
  log('\n🔍 Testing Database Connection...', colors.blue);
  
  try {
    const { initDb, query, closeDb } = require('./backend/database/unified-connection');
    
    await initDb();
    log('✅ Database initialization successful', colors.green);
    
    const result = await query('SELECT version()');
    log('✅ Database query successful', colors.green);
    log(`   PostgreSQL Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`, colors.cyan);
    
    // Test table existence
    const tables = ['users', 'client_config', 'mailbox_mappings'];
    for (const table of tables) {
      const tableCheck = await query(`SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${table}')`);
      if (tableCheck.rows[0].exists) {
        log(`✅ Table '${table}' exists`, colors.green);
      } else {
        log(`⚠️  Table '${table}' missing`, colors.yellow);
      }
    }
    
    await closeDb();
    return true;
  } catch (error) {
    log(`❌ Database connection error: ${error.message}`, colors.red);
    return false;
  }
}

async function testGoogleOAuth() {
  log('\n🔍 Testing Google OAuth Configuration...', colors.blue);
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  
  if (!clientId || !clientSecret || !redirectUri) {
    log('❌ Google OAuth credentials missing', colors.red);
    return false;
  }
  
  log('✅ Google OAuth credentials present', colors.green);
  log(`   Client ID: ${clientId.substring(0, 20)}...`, colors.cyan);
  log(`   Redirect URI: ${redirectUri}`, colors.cyan);
  
  // Test Google OAuth discovery endpoint
  try {
    const response = await makeRequest('https://accounts.google.com/.well-known/openid_configuration');
    if (response.statusCode === 200) {
      log('✅ Google OAuth discovery endpoint accessible', colors.green);
      return true;
    } else {
      log('❌ Google OAuth discovery endpoint failed', colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Google OAuth test error: ${error.message}`, colors.red);
    return false;
  }
}

async function testSendGridEmail() {
  log('\n🔍 Testing SendGrid Email Configuration...', colors.blue);
  
  const apiKey = process.env.SMTP_PASS;
  const fromEmail = process.env.FROM_EMAIL;
  
  if (!apiKey || !fromEmail) {
    log('❌ SendGrid credentials missing', colors.red);
    return false;
  }
  
  log('✅ SendGrid credentials present', colors.green);
  log(`   API Key: ${apiKey.substring(0, 20)}...`, colors.cyan);
  log(`   From Email: ${fromEmail}`, colors.cyan);
  
  // Test SendGrid API endpoint
  try {
    const https = require('https');
    const options = {
      hostname: 'api.sendgrid.com',
      port: 443,
      path: '/v3/user/profile',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.replace('SG.', '')}`
      }
    };
    
    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      });
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.end();
    });
    
    if (response.statusCode === 200) {
      log('✅ SendGrid API connection successful', colors.green);
      return true;
    } else {
      log(`❌ SendGrid API failed - Status: ${response.statusCode}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ SendGrid test error: ${error.message}`, colors.red);
    return false;
  }
}

async function testN8NConnection() {
  log('\n🔍 Testing N8N Configuration...', colors.blue);
  
  const baseUrl = process.env.N8N_BASE_URL;
  const apiKey = process.env.N8N_API_KEY;
  
  if (!baseUrl || !apiKey) {
    log('❌ N8N credentials missing', colors.red);
    return false;
  }
  
  log('✅ N8N credentials present', colors.green);
  log(`   Base URL: ${baseUrl}`, colors.cyan);
  log(`   API Key: ${apiKey.substring(0, 20)}...`, colors.cyan);
  
  // Test N8N health endpoint
  try {
    const response = await makeRequest(`${baseUrl}/healthz`);
    if (response.statusCode === 200) {
      log('✅ N8N health check successful', colors.green);
      return true;
    } else {
      log(`❌ N8N health check failed - Status: ${response.statusCode}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ N8N connection error: ${error.message}`, colors.red);
    return false;
  }
}

async function testStripeConfiguration() {
  log('\n🔍 Testing Stripe Configuration...', colors.blue);
  
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!publishableKey || !secretKey || !webhookSecret) {
    log('❌ Stripe credentials missing', colors.red);
    return false;
  }
  
  log('✅ Stripe credentials present', colors.green);
  log(`   Publishable Key: ${publishableKey.substring(0, 20)}...`, colors.cyan);
  log(`   Secret Key: ${secretKey.substring(0, 20)}...`, colors.cyan);
  log(`   Webhook Secret: ${webhookSecret.substring(0, 20)}...`, colors.cyan);
  
  // Test Stripe API
  try {
    const https = require('https');
    const options = {
      hostname: 'api.stripe.com',
      port: 443,
      path: '/v1/account',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`
      }
    };
    
    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, data }));
      });
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.end();
    });
    
    if (response.statusCode === 200) {
      log('✅ Stripe API connection successful', colors.green);
      const account = JSON.parse(response.data);
      log(`   Account ID: ${account.id}`, colors.cyan);
      return true;
    } else {
      log(`❌ Stripe API failed - Status: ${response.statusCode}`, colors.red);
      return false;
    }
  } catch (error) {
    log(`❌ Stripe test error: ${error.message}`, colors.red);
    return false;
  }
}

async function testEnvironmentVariables() {
  log('\n🔍 Testing Environment Variables...', colors.blue);
  
  const required = [
    'NODE_ENV', 'PORT', 'JWT_SECRET', 'ENCRYPTION_KEY',
    'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'FRONTEND_URL'
  ];
  
  let allPresent = true;
  
  for (const variable of required) {
    if (process.env[variable]) {
      log(`✅ ${variable} is set`, colors.green);
    } else {
      log(`❌ ${variable} is missing`, colors.red);
      allPresent = false;
    }
  }
  
  return allPresent;
}

async function runAllTests() {
  log(`${colors.bold}🚀 FloWorx Local Credentials Test Suite${colors.reset}`);
  log(`${colors.bold}=======================================${colors.reset}`);
  log(`Time: ${new Date().toISOString()}`);
  
  const tests = [
    { name: 'Environment Variables', test: testEnvironmentVariables },
    { name: 'Supabase Connection', test: testSupabaseConnection },
    { name: 'Database Connection', test: testDatabaseConnection },
    { name: 'Google OAuth', test: testGoogleOAuth },
    { name: 'SendGrid Email', test: testSendGridEmail },
    { name: 'N8N Connection', test: testN8NConnection },
    { name: 'Stripe Configuration', test: testStripeConfiguration }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      log(`❌ ${name} test crashed: ${error.message}`, colors.red);
      failed++;
    }
  }
  
  // Summary
  log(`\n${colors.bold}📊 TEST SUMMARY${colors.reset}`);
  log(`${colors.bold}===============${colors.reset}`);
  log(`✅ Passed: ${passed}`, passed > 0 ? colors.green : colors.reset);
  log(`❌ Failed: ${failed}`, failed > 0 ? colors.red : colors.reset);
  log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    log(`\n🎉 ${colors.bold}${colors.green}ALL CREDENTIALS VALID!${colors.reset}`);
    log(`${colors.green}✅ Your local environment is properly configured${colors.reset}`);
    log(`${colors.green}✅ Ready to deploy to production with these credentials${colors.reset}`);
  } else {
    log(`\n⚠️  ${colors.bold}${colors.yellow}SOME TESTS FAILED${colors.reset}`);
    log(`${colors.yellow}Fix the failed credentials before deploying to production${colors.reset}`);
  }
  
  log(`\n🕐 Test completed at: ${new Date().toISOString()}`);
  process.exit(failed === 0 ? 0 : 1);
}

// Run all tests
runAllTests().catch(error => {
  log(`\n💥 ${colors.bold}${colors.red}TEST SUITE ERROR:${colors.reset}`, colors.red);
  log(`${error.message}`, colors.red);
  process.exit(1);
});
