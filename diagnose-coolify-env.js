#!/usr/bin/env node

/**
 * Coolify Environment Diagnostic Tool
 * Helps identify missing environment variables in production
 */

console.log('🔍 COOLIFY ENVIRONMENT DIAGNOSTIC');
console.log('=================================\n');

// Required environment variables for Floworx
const requiredVars = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_REDIRECT_URI',
  'REDIS_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'FROM_EMAIL',
  'FROM_NAME',
  'N8N_API_KEY',
  'N8N_BASE_URL'
];

console.log('📋 ENVIRONMENT VARIABLES STATUS:');
console.log('================================');

let missingVars = [];
let setVars = [];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    setVars.push(varName);
    // Show first 20 characters for security
    const displayValue = value.length > 20 ? `${value.substring(0, 20)}...` : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  } else {
    missingVars.push(varName);
    console.log(`❌ ${varName}: NOT SET`);
  }
});

console.log('\n📊 SUMMARY:');
console.log('===========');
console.log(`✅ Set: ${setVars.length}/${requiredVars.length}`);
console.log(`❌ Missing: ${missingVars.length}/${requiredVars.length}`);

if (missingVars.length > 0) {
  console.log('\n🚨 MISSING ENVIRONMENT VARIABLES:');
  console.log('=================================');
  missingVars.forEach(varName => {
    console.log(`❌ ${varName}`);
  });
  
  console.log('\n🔧 COOLIFY CONFIGURATION NEEDED:');
  console.log('================================');
  console.log('Add these environment variables in Coolify:');
  console.log('');
  
  missingVars.forEach(varName => {
    switch(varName) {
      case 'SUPABASE_URL':
        console.log(`${varName}=https://enamhufwobytrfydarsz.supabase.co`);
        break;
      case 'SUPABASE_ANON_KEY':
        console.log(`${varName}=[your-supabase-anon-key]`);
        break;
      case 'SUPABASE_SERVICE_ROLE_KEY':
        console.log(`${varName}=[your-supabase-service-role-key]`);
        break;
      case 'JWT_SECRET':
        console.log(`${varName}=[your-jwt-secret-128-chars]`);
        break;
      case 'ENCRYPTION_KEY':
        console.log(`${varName}=[your-encryption-key-32-chars]`);
        break;
      case 'GOOGLE_CLIENT_ID':
        console.log(`${varName}=[your-google-client-id]`);
        break;
      case 'GOOGLE_CLIENT_SECRET':
        console.log(`${varName}=[your-google-client-secret]`);
        break;
      case 'GOOGLE_REDIRECT_URI':
        console.log(`${varName}=https://app.floworx-iq.com/api/oauth/google/callback`);
        break;
      case 'SMTP_HOST':
        console.log(`${varName}=smtp.sendgrid.net`);
        break;
      case 'SMTP_PORT':
        console.log(`${varName}=587`);
        break;
      case 'FROM_EMAIL':
        console.log(`${varName}=noreply@app.floworx-iq.com`);
        break;
      case 'FROM_NAME':
        console.log(`${varName}=Floworx Team`);
        break;
      case 'N8N_BASE_URL':
        console.log(`${varName}=https://n8n.app.floworx-iq.com`);
        break;
      default:
        console.log(`${varName}=[value-needed]`);
    }
  });
}

console.log('\n🔍 DATABASE CONNECTION TEST:');
console.log('============================');

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log('✅ DATABASE_URL is valid');
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Port: ${url.port}`);
    console.log(`   Database: ${url.pathname.substring(1)}`);
    console.log(`   Username: ${url.username}`);
  } catch (error) {
    console.log('❌ DATABASE_URL is invalid:', error.message);
  }
} else {
  console.log('❌ DATABASE_URL is not set');
}

console.log('\n🌐 NETWORK CONNECTIVITY TEST:');
console.log('=============================');

// Test DNS resolution for Supabase
const dns = require('dns');
const util = require('util');
const lookup = util.promisify(dns.lookup);

async function testConnectivity() {
  const hosts = [
    'aws-1-ca-central-1.pooler.supabase.com',
    'enamhufwobytrfydarsz.supabase.co'
  ];
  
  for (const host of hosts) {
    try {
      const result = await lookup(host);
      console.log(`✅ ${host} resolves to ${result.address}`);
    } catch (error) {
      console.log(`❌ ${host} DNS resolution failed: ${error.message}`);
    }
  }
}

testConnectivity().then(() => {
  console.log('\n🎯 RECOMMENDATIONS:');
  console.log('===================');
  
  if (missingVars.length > 0) {
    console.log('1. Add missing environment variables to Coolify');
    console.log('2. Redeploy the application');
    console.log('3. Check logs for successful startup');
  } else {
    console.log('1. All environment variables are set');
    console.log('2. Check network connectivity to Supabase');
    console.log('3. Verify Supabase credentials are correct');
  }
  
  console.log('\n✅ Diagnostic complete!');
}).catch(console.error);
